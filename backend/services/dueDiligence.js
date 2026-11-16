import crypto from "crypto";

/**
 * Buyer due-diligence report.
 *
 * Turns the live on-chain history, the explainable trust score, the ownership
 * event trail, and the internal watchlist into a single verdict a buyer can act
 * on. Every check explains itself; nothing is hidden behind a black-box score.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const VERDICT_META = {
  BUY: {
    label: "Cleared to buy",
    short: "Low risk",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    headline: "No blocking issues found",
    summary:
      "On-chain history and off-chain metadata are consistent. Ask for the original service invoices and complete the transfer through the registry.",
  },
  CAUTION: {
    label: "Proceed with caution",
    short: "Needs review",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    headline: "Review the flagged items before paying",
    summary:
      "This vehicle is not blocked outright, but several gaps should be resolved in writing before money changes hands.",
  },
  AVOID: {
    label: "Do not buy",
    short: "High risk",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    headline: "Serious risk indicators were found",
    summary:
      "At least one blocking issue was detected. Do not transfer funds until the seller resolves it or an independent inspection clears the vehicle.",
  },
};

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageDays(value) {
  const date = toDate(value);
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / DAY_MS));
}

function check(id, label, status, detail, severity = "medium") {
  return { id, label, status, severity, detail };
}

function latestRecord(records, type) {
  return [...records].reverse().find((record) => record.recordType === type) || null;
}

function buildChecks({ history, index, trust, watchlist, ownership }) {
  const stats = trust.stats || {};
  const counts = stats.counts || {};
  const flags = trust.flags || [];
  const hasFlag = (code) => flags.some((flag) => flag.code === code);
  const checks = [];

  checks.push(
    check(
      "REGISTRATION",
      "On-chain registration",
      "pass",
      "Vehicle identity and existence were read directly from the registry contract.",
      "low"
    )
  );

  // Ownership trail -------------------------------------------------------
  if (!ownership.currentOwner) {
    checks.push(
      check(
        "OWNERSHIP",
        "Ownership trail",
        "fail",
        "The contract reports no current owner for this VIN.",
        "high"
      )
    );
  } else if (ownership.transferCount >= 5) {
    checks.push(
      check(
        "OWNERSHIP",
        "Ownership trail",
        "fail",
        `${ownership.transferCount} ownership transfers on record. Excessive churn hides damage and title problems.`,
        "high"
      )
    );
  } else if (ownership.transferCount >= 3) {
    checks.push(
      check(
        "OWNERSHIP",
        "Ownership trail",
        "warn",
        `${ownership.transferCount} ownership transfers on record. Ask why the vehicle keeps changing hands.`,
        "medium"
      )
    );
  } else {
    checks.push(
      check(
        "OWNERSHIP",
        "Ownership trail",
        "pass",
        ownership.transferCount === 0
          ? "Original owner still holds the vehicle."
          : `${ownership.transferCount} ownership transfer${ownership.transferCount === 1 ? "" : "s"} with a complete event trail.`,
        "low"
      )
    );
  }

  // Accidents -------------------------------------------------------------
  if (!(counts.ACCIDENT > 0)) {
    checks.push(
      check(
        "ACCIDENTS",
        "Accident record",
        "pass",
        "No accidents recorded on-chain.",
        "low"
      )
    );
  } else if (hasFlag("ACCIDENT_NO_INSPECTION")) {
    checks.push(
      check(
        "ACCIDENTS",
        "Accident record",
        "fail",
        `${counts.ACCIDENT} accident record${counts.ACCIDENT === 1 ? "" : "s"} with no follow-up inspection. Repair quality is unverified.`,
        "high"
      )
    );
  } else {
    checks.push(
      check(
        "ACCIDENTS",
        "Accident record",
        "pass",
        `${counts.ACCIDENT} disclosed accident${counts.ACCIDENT === 1 ? "" : "s"}, followed by an inspection.`,
        "low"
      )
    );
  }

  // Service ---------------------------------------------------------------
  const services = counts.SERVICE || 0;
  if (services >= 2) {
    checks.push(
      check(
        "SERVICE",
        "Service history",
        "pass",
        `${services} service records on-chain.`,
        "low"
      )
    );
  } else if (services === 1) {
    checks.push(
      check(
        "SERVICE",
        "Service history",
        "warn",
        "Only one service record. Ask for the rest of the maintenance invoices.",
        "medium"
      )
    );
  } else {
    checks.push(
      check(
        "SERVICE",
        "Service history",
        "warn",
        "No service records. Maintenance may have been done entirely off-registry.",
        "medium"
      )
    );
  }

  // Inspection ------------------------------------------------------------
  const inspection = latestRecord(history, "INSPECTION");
  if (!inspection) {
    checks.push(
      check(
        "INSPECTION",
        "Independent inspection",
        "warn",
        "No inspection record. Arrange a pre-purchase inspection before paying.",
        "medium"
      )
    );
  } else {
    const days = ageDays(inspection.timestamp);
    if (days != null && days <= 2 * 365) {
      checks.push(
        check(
          "INSPECTION",
          "Independent inspection",
          "pass",
          `Last inspection was logged ${days} day${days === 1 ? "" : "s"} ago.`,
          "low"
        )
      );
    } else {
      checks.push(
        check(
          "INSPECTION",
          "Independent inspection",
          "warn",
          "The latest inspection is more than two years old. Ask for a fresh one.",
          "medium"
        )
      );
    }
  }

  // Insurance -------------------------------------------------------------
  const insurance = latestRecord(history, "INSURANCE");
  if (!insurance) {
    checks.push(
      check(
        "INSURANCE",
        "Insurance trail",
        "warn",
        "No insurance records. Confirm the vehicle is insurable before purchase.",
        "medium"
      )
    );
  } else {
    const days = ageDays(insurance.timestamp);
    checks.push(
      check(
        "INSURANCE",
        "Insurance trail",
        days != null && days <= 2 * 365 ? "pass" : "warn",
        days != null && days <= 2 * 365
          ? `Latest insurance record is ${days} day${days === 1 ? "" : "s"} old.`
          : "The latest insurance record is more than two years old.",
        days != null && days <= 2 * 365 ? "low" : "medium"
      )
    );
  }

  // Evidence anchoring ----------------------------------------------------
  if (!(stats.totalRecords > 0)) {
    checks.push(
      check(
        "EVIDENCE",
        "Evidence anchoring",
        "warn",
        "There are no records to anchor, so no supporting documents can be verified.",
        "medium"
      )
    );
  } else if (stats.evidenceCoverage >= 80) {
    checks.push(
      check(
        "EVIDENCE",
        "Evidence anchoring",
        "pass",
        `${stats.evidenceCoverage}% of records carry a data hash.`,
        "low"
      )
    );
  } else if (stats.evidenceCoverage >= 40) {
    checks.push(
      check(
        "EVIDENCE",
        "Evidence anchoring",
        "warn",
        `Only ${stats.evidenceCoverage}% of records carry a data hash. Some documents cannot be verified.`,
        "medium"
      )
    );
  } else {
    checks.push(
      check(
        "EVIDENCE",
        "Evidence anchoring",
        "fail",
        `Only ${stats.evidenceCoverage}% of records carry a data hash. Supporting documents are mostly unverifiable.`,
        "medium"
      )
    );
  }

  // Photo -----------------------------------------------------------------
  if (stats.photoVerified) {
    checks.push(
      check(
        "PHOTO",
        "Photo integrity",
        "pass",
        "Vehicle photo is stored with a SHA-256 fingerprint.",
        "low"
      )
    );
  } else if (index?.photoUrl) {
    checks.push(
      check(
        "PHOTO",
        "Photo integrity",
        "warn",
        "A photo exists but has no fingerprint, so tampering cannot be detected.",
        "medium"
      )
    );
  } else {
    checks.push(
      check(
        "PHOTO",
        "Photo integrity",
        "warn",
        "No verified vehicle photo. Compare the physical VIN plate with the registry.",
        "medium"
      )
    );
  }

  // Freshness -------------------------------------------------------------
  const lastRecordAt = stats.lastRecordAt;
  const lastAge = ageDays(lastRecordAt);
  if (!lastRecordAt) {
    checks.push(
      check(
        "FRESHNESS",
        "Record freshness",
        "warn",
        "No history records yet. A brand-new registry entry has nothing to audit.",
        "medium"
      )
    );
  } else if (lastAge <= 365) {
    checks.push(
      check(
        "FRESHNESS",
        "Record freshness",
        "pass",
        `Latest record was added ${lastAge} day${lastAge === 1 ? "" : "s"} ago.`,
        "low"
      )
    );
  } else if (lastAge <= 2 * 365) {
    checks.push(
      check(
        "FRESHNESS",
        "Record freshness",
        "warn",
        "No records in over a year. Confirm the vehicle has been active since.",
        "medium"
      )
    );
  } else {
    checks.push(
      check(
        "FRESHNESS",
        "Record freshness",
        "fail",
        "No records in over two years. The history is dormant.",
        "high"
      )
    );
  }

  // Duplicates ------------------------------------------------------------
  if ((stats.duplicateRecords || 0) > 0) {
    checks.push(
      check(
        "DUPLICATES",
        "Duplicate records",
        "fail",
        `${stats.duplicateRecords} duplicate record${stats.duplicateRecords === 1 ? "" : "s"} detected. This can indicate spam or a faulty integration.`,
        "high"
      )
    );
  } else {
    checks.push(
      check(
        "DUPLICATES",
        "Duplicate records",
        "pass",
        "No duplicate records detected.",
        "low"
      )
    );
  }

  // Registry status -------------------------------------------------------
  const status = index?.status || "NORMAL";
  if (status === "SUSPICIOUS") {
    checks.push(
      check(
        "STATUS",
        "Registry status",
        "fail",
        "The vehicle is marked SUSPICIOUS in the registry index.",
        "critical"
      )
    );
  } else {
    checks.push(
      check(
        "STATUS",
        "Registry status",
        "pass",
        status === "VERIFIED"
          ? "Registry status is VERIFIED."
          : "Registry status is NORMAL.",
        "low"
      )
    );
  }

  // Watchlist -------------------------------------------------------------
  const watchMatches = watchlist?.matches || [];
  const worstWatch = watchMatches
    .map((match) => match.severity)
    .sort((a, b) => (SEVERITY_RANK[a] ?? 99) - (SEVERITY_RANK[b] ?? 99))[0];

  if (!watchMatches.length) {
    checks.push(
      check(
        "WATCHLIST",
        "Watchlist check",
        "pass",
        "No VIN or owner watchlist matches.",
        "low"
      )
    );
  } else if (worstWatch === "critical" || worstWatch === "high") {
    checks.push(
      check(
        "WATCHLIST",
        "Watchlist check",
        "fail",
        `${watchMatches.length} active watchlist match${watchMatches.length === 1 ? "" : "es"} (${worstWatch} severity).`,
        "critical"
      )
    );
  } else {
    checks.push(
      check(
        "WATCHLIST",
        "Watchlist check",
        "warn",
        `${watchMatches.length} active watchlist match${watchMatches.length === 1 ? "" : "es"} (${worstWatch} severity).`,
        "medium"
      )
    );
  }

  return checks;
}

function buildVerdict({ trust, checks, watchlist, index }) {
  const failures = checks.filter((entry) => entry.status === "fail");
  const warnings = checks.filter((entry) => entry.status === "warn");
  const criticalFailures = failures.filter(
    (entry) => entry.severity === "critical"
  );

  const watchMatches = watchlist?.matches || [];
  const blockedWatch = watchMatches.some(
    (match) => match.severity === "critical" || match.severity === "high"
  );
  const suspicious = (index?.status || "NORMAL") === "SUSPICIOUS";
  const hardBlock =
    blockedWatch || suspicious || trust.riskLevel === "CRITICAL" || criticalFailures.length > 0;

  let status;
  if (hardBlock || failures.length >= 3) {
    status = "AVOID";
  } else if (
    failures.length >= 1 ||
    warnings.length >= 3 ||
    trust.riskLevel !== "LOW" ||
    trust.score < 70
  ) {
    status = "CAUTION";
  } else {
    status = "BUY";
  }

  const meta = VERDICT_META[status];

  const reasons = [];
  for (const match of watchMatches) {
    reasons.push(
      `Watchlist (${match.severity}): ${match.reason}`
    );
  }
  for (const failure of failures) {
    reasons.push(failure.detail);
  }
  for (const flag of (trust.flags || []).filter(
    (entry) => entry.severity === "high" || entry.severity === "critical"
  )) {
    if (reasons.length >= 4) break;
    reasons.push(`${flag.title}: ${flag.detail}`);
  }
  for (const warning of warnings) {
    if (reasons.length >= 4) break;
    reasons.push(warning.detail);
  }

  return {
    status,
    label: meta.label,
    short: meta.short,
    color: meta.color,
    bg: meta.bg,
    border: meta.border,
    headline: meta.headline,
    summary: meta.summary,
    confidence: trust.score,
    reasons: [...new Set(reasons)].slice(0, 4),
  };
}

function buildOwnershipTimeline({ vehicle, history, index, ownershipEvents }) {
  const events = [...(ownershipEvents || [])].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
  const entries = [];

  const registrations = events.filter((event) => event.kind === "REGISTRATION");
  if (registrations.length) {
    for (const event of registrations) {
      entries.push({
        kind: "REGISTRATION",
        at: event.at,
        from: null,
        to: event.to,
        txHash: event.txHash || null,
        note: "Vehicle registered on-chain",
      });
    }
  } else {
    const registeredAt =
      index?.registeredAt || (history.length ? history[0].timestamp : null);
    if (registeredAt) {
      entries.push({
        kind: "REGISTRATION",
        at: registeredAt,
        from: null,
        to: null,
        txHash: null,
        note: "Registration indexed from chain history",
      });
    }
  }

  const transferEvents = events.filter((event) => event.kind === "TRANSFER");
  if (transferEvents.length) {
    for (const event of transferEvents) {
      entries.push({
        kind: "TRANSFER",
        at: event.at,
        from: event.from,
        to: event.to,
        txHash: event.txHash || null,
        note: "Ownership transferred on-chain",
      });
    }
  } else {
    // Fall back to transfer history records when events are unavailable.
    for (const record of history.filter(
      (entry) => entry.recordType === "OWNERSHIP_TRANSFER"
    )) {
      entries.push({
        kind: "TRANSFER_RECORD",
        at: record.timestamp,
        from: null,
        to: null,
        txHash: null,
        note: record.description || "Ownership transfer record",
      });
    }
  }

  entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const transferCount = transferEvents.length
    ? transferEvents.length
    : history.filter((entry) => entry.recordType === "OWNERSHIP_TRANSFER").length;

  return {
    currentOwner: vehicle.currentOwner,
    transferCount,
    firstSeenAt: entries.length ? entries[0].at : null,
    entries,
  };
}

function buildAlerts({ trust, watchlist }) {
  const alerts = [];

  for (const match of watchlist?.matches || []) {
    alerts.push({
      type: "WATCHLIST",
      severity: match.severity,
      title:
        match.matchedOn === "OWNER"
          ? "Current owner is on the watchlist"
          : "Vehicle is on the watchlist",
      detail: match.reason,
    });
  }

  for (const flag of trust.flags || []) {
    if (flag.severity !== "high" && flag.severity !== "critical") continue;
    alerts.push({
      type: "HISTORY",
      severity: flag.severity,
      title: flag.title,
      detail: flag.detail,
    });
  }

  alerts.sort(
    (a, b) =>
      (SEVERITY_RANK[a.severity] ?? 99) - (SEVERITY_RANK[b.severity] ?? 99)
  );

  return alerts;
}

function hashReport(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/**
 * @param {object} input
 * @param {object} input.vehicle  On-chain vehicle struct
 * @param {Array}  input.history  Formatted on-chain history
 * @param {object|null} input.index  Mongo index row (status, photo, registeredAt)
 * @param {object} input.trust  Output of calculateTrustScore
 * @param {Array}  input.ownershipEvents  Chain events for this VIN
 * @param {object} input.watchlist  { matches: [...] }
 */
export function buildDueDiligence({
  vehicle,
  history = [],
  index = null,
  trust,
  ownershipEvents = [],
  watchlist = { matches: [] },
}) {
  const ownership = buildOwnershipTimeline({
    vehicle,
    history,
    index,
    ownershipEvents,
  });

  const checks = buildChecks({ history, index, trust, watchlist, ownership });
  const verdict = buildVerdict({ trust, checks, watchlist, index });
  const alerts = buildAlerts({ trust, watchlist });

  const scorecard = {
    total: checks.length,
    passed: checks.filter((entry) => entry.status === "pass").length,
    warnings: checks.filter((entry) => entry.status === "warn").length,
    failed: checks.filter((entry) => entry.status === "fail").length,
  };

  const canonical = {
    vin: vehicle.vin,
    verdict: verdict.status,
    checks: checks.map((entry) => [entry.id, entry.status]),
    watchlist: (watchlist?.matches || []).map((match) => match.id),
    trustScore: trust.score,
    ownership: ownership.entries.map((entry) => [
      entry.kind,
      entry.at,
      entry.from,
      entry.to,
    ]),
  };

  return {
    vin: vehicle.vin,
    make: vehicle.make,
    model: vehicle.model,
    year: Number(vehicle.year),
    currentOwner: vehicle.currentOwner,
    registeredAt: index?.registeredAt || null,
    status: index?.status || "NORMAL",
    photoUrl: index?.photoUrl || null,
    photoHash: index?.photoHash || null,
    verdict,
    trust,
    checks,
    scorecard,
    ownership,
    watchlist: {
      matches: watchlist?.matches || [],
      checked: true,
    },
    alerts,
    reportHash: hashReport(canonical),
    generatedAt: new Date().toISOString(),
  };
}

/** Compact shape used by the side-by-side comparison endpoint. */
export function summarizeForComparison(report) {
  return {
    vin: report.vin,
    make: report.make,
    model: report.model,
    year: report.year,
    currentOwner: report.currentOwner,
    photoUrl: report.photoUrl,
    trustScore: report.trust.score,
    trustGrade: report.trust.grade,
    riskLevel: report.trust.riskLevel,
    riskLabel: report.trust.riskLabel,
    riskColor: report.trust.riskColor,
    verdict: report.verdict,
    scorecard: report.scorecard,
    watchlistMatches: report.watchlist.matches.length,
    evidenceCoverage: report.trust.stats.evidenceCoverage,
    photoVerified: report.trust.stats.photoVerified,
    transfers: report.ownership.transferCount,
    accidents: report.trust.stats.accidents,
    records: report.trust.stats.totalRecords,
    reportHash: report.reportHash,
  };
}

const VERDICT_RANK = { BUY: 2, CAUTION: 1, AVOID: 0 };

/** Decide which of two summarized vehicles is the safer purchase. */
export function compareReports(first, second) {
  const firstRank = VERDICT_RANK[first.verdict.status] ?? 0;
  const secondRank = VERDICT_RANK[second.verdict.status] ?? 0;

  let winner = null;
  if (firstRank !== secondRank) {
    winner = firstRank > secondRank ? first.vin : second.vin;
  } else if (first.trustScore !== second.trustScore) {
    winner = first.trustScore > second.trustScore ? first.vin : second.vin;
  } else if (first.scorecard.failed !== second.scorecard.failed) {
    winner = first.scorecard.failed < second.scorecard.failed ? first.vin : second.vin;
  }

  return {
    winner,
    tie: winner === null,
    verdictRank: { [first.vin]: firstRank, [second.vin]: secondRank },
    trustDelta: first.trustScore - second.trustScore,
    failedDelta: first.scorecard.failed - second.scorecard.failed,
  };
}
