/**
 * Trust Score + Fraud Radar
 *
 * Produces a transparent, explainable 0-100 score for a vehicle using only
 * on-chain history (the source of truth) plus a few off-chain metadata signals
 * such as the verified photo fingerprint.
 *
 * The score is intentionally rule-based rather than opaque: every point added
 * or removed is returned as a factor so the UI can explain the result.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;

const RISK_META = {
  LOW: { label: "Low risk", color: "#16a34a", tone: "positive" },
  MEDIUM: { label: "Medium risk", color: "#d97706", tone: "warning" },
  HIGH: { label: "High risk", color: "#dc2626", tone: "danger" },
  CRITICAL: { label: "Critical risk", color: "#991b1b", tone: "danger" },
};

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function gradeFor(score) {
  if (score >= 90) return { grade: "A+", rating: "Excellent", color: "#16a34a" };
  if (score >= 80) return { grade: "A", rating: "Very good", color: "#22c55e" };
  if (score >= 70) return { grade: "B", rating: "Good", color: "#65a30d" };
  if (score >= 60) return { grade: "C", rating: "Fair", color: "#d97706" };
  if (score >= 45) return { grade: "D", rating: "Weak", color: "#ea580c" };
  return { grade: "E", rating: "Poor", color: "#dc2626" };
}

function countByType(history) {
  const counts = {};
  for (const record of history) {
    const type = record.recordType || "UNKNOWN";
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

function makeFlag(code, severity, title, detail) {
  return { code, severity, title, detail };
}

function makeFactor(label, impact, detail) {
  return {
    label,
    impact,
    detail,
    tone: impact > 0 ? "positive" : impact < 0 ? "negative" : "neutral",
  };
}

/**
 * @param {object} input
 * @param {object} input.vehicle  On-chain vehicle struct
 * @param {Array}  input.history  Formatted on-chain history
 * @param {object|null} input.index Mongo vehicle index (photo metadata, status)
 */
export function calculateTrustScore({ vehicle, history = [], index = null }) {
  const now = Date.now();
  const sortedRecords = [...history]
    .map((record) => ({
      ...record,
      _date: toDate(record.timestamp),
    }))
    .filter((record) => record._date)
    .sort((a, b) => a._date - b._date);

  // Duplicate records are a fraud signal and must not earn score credit twice.
  const recordKey = (record) =>
    `${record.recordType}|${record.description}|${record.timestamp}`;
  const seenKeys = new Set();
  const records = [];
  let duplicateCount = 0;
  for (const record of sortedRecords) {
    const key = recordKey(record);
    if (seenKeys.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seenKeys.add(key);
    records.push(record);
  }

  const counts = countByType(records);
  const transfers = counts.OWNERSHIP_TRANSFER || 0;
  const transferRecords = records.filter(
    (record) => record.recordType === "OWNERSHIP_TRANSFER"
  );
  const accidentRecords = records.filter(
    (record) => record.recordType === "ACCIDENT"
  );
  const inspectionRecords = records.filter(
    (record) => record.recordType === "INSPECTION"
  );

  const factors = [];
  const flags = [];

  const scoreParts = [];
  const add = (label, impact, detail) => {
    if (!impact) return;
    scoreParts.push(impact);
    factors.push(makeFactor(label, impact, detail));
  };
  const baseScore = 60;

  // 1. History depth -------------------------------------------------------
  const depthImpact = Math.min(18, records.length * 2);
  add(
    "History depth",
    depthImpact,
    `${records.length} on-chain record${records.length === 1 ? "" : "s"}`
  );

  // 2. Evidence anchoring --------------------------------------------------
  const hashedRecords = records.filter(
    (record) => typeof record.dataHash === "string" && record.dataHash.trim()
  );
  const evidenceCoverage = records.length
    ? Math.round((hashedRecords.length / records.length) * 100)
    : 0;
  if (records.length) {
    add(
      "Evidence anchoring",
      Math.round((evidenceCoverage / 100) * 10),
      `${evidenceCoverage}% of records include a data hash`
    );
    if (records.length >= 3 && evidenceCoverage < 50) {
      flags.push(
        makeFlag(
          "WEAK_EVIDENCE",
          "medium",
          "Weak evidence anchoring",
          "Most records do not carry a data hash, so supporting documents cannot be verified against the chain."
        )
      );
    }
  }

  // 3. Maintenance, inspections, insurance --------------------------------
  const servicePoints = Math.min(10, (counts.SERVICE || 0) * 3);
  if (servicePoints) {
    add(
      "Service history",
      servicePoints,
      `${counts.SERVICE} service record${counts.SERVICE === 1 ? "" : "s"}`
    );
  }

  const inspectionPoints = Math.min(8, (counts.INSPECTION || 0) * 4);
  if (inspectionPoints) {
    add(
      "Inspection trail",
      inspectionPoints,
      `${counts.INSPECTION} inspection record${counts.INSPECTION === 1 ? "" : "s"}`
    );
  }

  const insurancePoints = Math.min(6, (counts.INSURANCE || 0) * 2);
  if (insurancePoints) {
    add(
      "Insurance trail",
      insurancePoints,
      `${counts.INSURANCE} insurance record${counts.INSURANCE === 1 ? "" : "s"}`
    );
  }

  // 4. Verified photo ------------------------------------------------------
  const hasPhoto = Boolean(index?.photoUrl);
  const hasPhotoHash = Boolean(index?.photoHash);
  if (hasPhoto && hasPhotoHash) {
    add("Verified photo", 8, "Vehicle photo stored with a SHA-256 fingerprint");
  } else if (hasPhoto) {
    add("Unverified photo", 2, "Photo present but no fingerprint is stored");
    flags.push(
      makeFlag(
        "PHOTO_UNVERIFIED",
        "medium",
        "Photo is not fingerprinted",
        "A vehicle photo exists but has no SHA-256 hash, so tampering cannot be detected."
      )
    );
  } else {
    add("Photo missing", -4, "No verified vehicle photo on file");
    flags.push(
      makeFlag(
        "NO_PHOTO",
        "low",
        "No vehicle photo",
        "The vehicle has no stored photo, which makes visual identification harder."
      )
    );
  }

  // 5. Accident disclosures ------------------------------------------------
  if (accidentRecords.length) {
    const accidentPenalty = Math.min(24, accidentRecords.length * 8);
    add(
      "Accident disclosures",
      -accidentPenalty,
      `${accidentRecords.length} accident record${accidentRecords.length === 1 ? "" : "s"}`
    );

    const latestAccident = accidentRecords[accidentRecords.length - 1]._date;
    const inspectedAfterAccident = inspectionRecords.some(
      (record) => record._date > latestAccident
    );
    if (inspectedAfterAccident) {
      add(
        "Post-accident inspection",
        5,
        "Vehicle was inspected after its latest accident"
      );
    } else {
      flags.push(
        makeFlag(
          "ACCIDENT_NO_INSPECTION",
          "high",
          "Accident without a follow-up inspection",
          "An accident is recorded, but no inspection was logged afterwards. Repair quality is unverified."
        )
      );
    }
  }

  // 6. Ownership stability -------------------------------------------------
  if (transfers > 1) {
    add(
      "Ownership churn",
      -Math.min(12, (transfers - 1) * 3),
      `${transfers} ownership transfers on record`
    );
  }
  if (transfers >= 3) {
    flags.push(
      makeFlag(
        "OWNERSHIP_CHURN",
        "medium",
        "Multiple ownership transfers",
        "This vehicle has changed hands several times, which can hide damage or title issues."
      )
    );
  }

  const recentTransfers = transferRecords.filter(
    (record) => now - record._date.getTime() <= 90 * DAY_MS
  );
  if (recentTransfers.length >= 3) {
    flags.push(
      makeFlag(
        "RAPID_TRANSFER",
        "high",
        "Rapid ownership flipping",
        `${recentTransfers.length} ownership transfers happened within 90 days, a common fraud pattern.`
      )
    );
  }

  // 7. Activity freshness --------------------------------------------------
  const latestRecord = records[records.length - 1];
  if (latestRecord) {
    const age = now - latestRecord._date.getTime();
    if (age <= YEAR_MS) {
      add("Recent activity", 4, "Last record was added within the past year");
    } else if (age > 2 * YEAR_MS) {
      add("Stale history", -4, "No records added in over two years");
      flags.push(
        makeFlag(
          "STALE_HISTORY",
          "low",
          "Dormant history",
          "The latest on-chain record is more than two years old."
        )
      );
    }
  }

  // 8. Registration age ----------------------------------------------------
  const registeredAt =
    toDate(index?.registeredAt) ||
    (records.length ? records[0]._date : null);
  if (registeredAt) {
    const age = now - registeredAt.getTime();
    if (age >= YEAR_MS) {
      const years = Math.max(1, Math.floor(age / YEAR_MS));
      add("Established history", 4, `Registered ${years} year${years === 1 ? "" : "s"} ago`);
    } else if (age < 30 * DAY_MS) {
      add("New registration", -2, "Registered less than 30 days ago");
    }
  }

  // 9. Empty and suspicious histories -------------------------------------
  if (!records.length) {
    add("No on-chain history", -5, "No records have been written for this vehicle");
    flags.push(
      makeFlag(
        "NO_HISTORY",
        "low",
        "No history records",
        "The vehicle is registered but has no service, inspection, insurance, or accident history."
      )
    );
  }

  if (duplicateCount > 0) {
    add(
      "Duplicate records",
      -Math.min(18, duplicateCount * 6),
      `${duplicateCount} duplicate record${duplicateCount === 1 ? "" : "s"} detected`
    );
    flags.push(
      makeFlag(
        "DUPLICATE_RECORDS",
        "medium",
        "Duplicate records detected",
        "Identical records appear more than once, which may indicate spam or a faulty integration."
      )
    );
  }

  if (index?.status === "SUSPICIOUS") {
    add("Flagged status", -15, "Vehicle is marked SUSPICIOUS in the index");
    flags.push(
      makeFlag(
        "SUSPICIOUS_STATUS",
        "critical",
        "Vehicle is marked suspicious",
        "An administrator or reconciliation process has flagged this vehicle for review."
      )
    );
  }

  // 10. Final score --------------------------------------------------------
  const rawScore = baseScore + scoreParts.reduce((total, value) => total + value, 0);
  const score = clamp(Math.round(rawScore), 0, 100);
  const grade = gradeFor(score);

  let riskLevel =
    score >= 80 ? "LOW" : score >= 60 ? "MEDIUM" : score >= 40 ? "HIGH" : "CRITICAL";

  const criticalFlags = flags.filter((flag) => flag.severity === "critical").length;
  const highFlags = flags.filter((flag) => flag.severity === "high").length;
  const mediumFlags = flags.filter((flag) => flag.severity === "medium").length;

  // A single high/critical indicator must never leave a vehicle rated LOW.
  if (criticalFlags >= 1) {
    riskLevel = score < 65 ? "CRITICAL" : "HIGH";
  } else if (highFlags >= 1) {
    if (riskLevel === "LOW") riskLevel = "MEDIUM";
    if (highFlags >= 2 && score < 65) riskLevel = "HIGH";
    if (highFlags >= 2 && score < 50) riskLevel = "CRITICAL";
  } else if (mediumFlags >= 3 && riskLevel === "LOW") {
    riskLevel = "MEDIUM";
  }

  const risk = RISK_META[riskLevel];
  const summary =
    riskLevel === "LOW"
      ? "Strong, well-documented history with no major fraud indicators."
      : riskLevel === "MEDIUM"
        ? "Mostly consistent history, but some gaps should be reviewed before a transaction."
        : riskLevel === "HIGH"
          ? "Several risk indicators were found. Verify original documents and arrange an independent inspection."
          : "High fraud risk. Do not rely on this record without independent verification.";

  flags.sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99)
  );

  return {
    score,
    grade: grade.grade,
    rating: grade.rating,
    color: grade.color,
    riskLevel,
    riskLabel: risk.label,
    riskColor: risk.color,
    summary,
    factors,
    flags,
    stats: {
      totalRecords: sortedRecords.length,
      uniqueRecords: records.length,
      duplicateRecords: duplicateCount,
      counts,
      hashedRecords: hashedRecords.length,
      evidenceCoverage,
      ownershipTransfers: transfers,
      accidents: accidentRecords.length,
      inspections: inspectionRecords.length,
      services: counts.SERVICE || 0,
      insuranceRecords: counts.INSURANCE || 0,
      photoVerified: hasPhoto && hasPhotoHash,
      firstRecordAt: records.length ? records[0]._date.toISOString() : null,
      lastRecordAt: latestRecord ? latestRecord._date.toISOString() : null,
      registeredAt: registeredAt ? registeredAt.toISOString() : null,
    },
    generatedAt: new Date().toISOString(),
  };
}
