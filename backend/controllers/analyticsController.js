import VehicleIndex from "../models/VehicleIndex.js";
import RecordIndex from "../models/RecordIndex.js";
import { RECORD_TYPES } from "../utils/recordTypes.js";

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNRATED"];
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function toCountMap(rows) {
  const map = {};
  for (const row of rows) {
    map[row._id ?? "UNKNOWN"] = row.count;
  }
  return map;
}

/**
 * GET /api/analytics/summary
 * Aggregated registry health for the dashboard. Uses the MongoDB index so the
 * endpoint stays fast; the chain remains the source of truth for any vehicle.
 */
export async function getAnalyticsSummary(req, res, next) {
  try {
    const now = new Date();
    const activityStart = startOfUtcDay(new Date(now.getTime() - 13 * DAY_MS));

    const [
      vehicleTotal,
      recordTotal,
      photoTotal,
      statusRows,
      trustRows,
      averageTrustRows,
      recordsByTypeRows,
      dailyRows,
      topMakeRows,
      owners,
      latestVehicles,
    ] = await Promise.all([
      VehicleIndex.countDocuments({}),
      RecordIndex.countDocuments({}),
      VehicleIndex.countDocuments({ photoHash: { $exists: true, $ne: null } }),
      VehicleIndex.aggregate([
        { $group: { _id: { $ifNull: ["$status", "NORMAL"] }, count: { $sum: 1 } } },
      ]),
      VehicleIndex.aggregate([
        { $match: { trustScore: { $ne: null } } },
        { $group: { _id: { $ifNull: ["$riskLevel", "UNRATED"] }, count: { $sum: 1 } } },
      ]),
      VehicleIndex.aggregate([
        { $match: { trustScore: { $ne: null } } },
        { $group: { _id: null, average: { $avg: "$trustScore" } } },
      ]),
      RecordIndex.aggregate([
        { $group: { _id: "$recordType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      RecordIndex.aggregate([
        { $match: { timestamp: { $gte: activityStart } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "UTC" },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      VehicleIndex.aggregate([
        { $match: { make: { $type: "string", $ne: "" } } },
        { $group: { _id: "$make", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 5 },
      ]),
      VehicleIndex.distinct("currentOwner"),
      VehicleIndex.find({}, { vin: 1, make: 1, model: 1, year: 1, riskLevel: 1, trustScore: 1, photoUrl: 1, registeredAt: 1 })
        .sort({ registeredAt: -1 })
        .limit(6)
        .lean(),
    ]);

    const statusMap = toCountMap(statusRows);
    const trustMap = toCountMap(trustRows);
    const typeMap = toCountMap(recordsByTypeRows);
    const dailyMap = toCountMap(dailyRows);
    const ratedCount = trustRows.reduce((total, row) => total + row.count, 0);
    const ownersCount = owners.filter(Boolean).length;

    // Always return the full canonical type list so the chart layout is stable.
    const recordsByType = RECORD_TYPES.map((type) => ({
      type,
      count: typeMap[type] || 0,
    }));
    for (const [type, count] of Object.entries(typeMap)) {
      if (!RECORD_TYPES.includes(type)) recordsByType.push({ type, count });
    }

    const activity = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const day = new Date(activityStart.getTime() + offset * DAY_MS);
      const key = utcDayKey(day);
      activity.push({ date: key, count: dailyMap[key] || 0 });
    }

    const trustDistribution = RISK_LEVELS.map((level) => ({
      level,
      count: level === "UNRATED" ? Math.max(0, vehicleTotal - ratedCount) : trustMap[level] || 0,
    }));

    res.json({
      generatedAt: now.toISOString(),
      totals: {
        vehicles: vehicleTotal,
        records: recordTotal,
        photos: photoTotal,
        owners: ownersCount,
        suspicious: statusMap.SUSPICIOUS || 0,
        verified: statusMap.VERIFIED || 0,
        normal: statusMap.NORMAL || 0,
        unrated: Math.max(0, vehicleTotal - ratedCount),
      },
      averageTrustScore:
        averageTrustRows.length && averageTrustRows[0].average != null
          ? Math.round(averageTrustRows[0].average)
          : null,
      recordsByType,
      activity,
      trustDistribution,
      topMakes: topMakeRows.map((row) => ({ make: row._id, count: row.count })),
      recentVehicles: latestVehicles,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/activity?limit=20
 * Live feed that merges registrations, record writes, and photo updates.
 */
export async function getActivityFeed(req, res, next) {
  try {
    const requested = Number.parseInt(req.query.limit, 10);
    const limit = Math.min(50, Math.max(1, Number.isFinite(requested) ? requested : 20));

    const [records, recentVehicles] = await Promise.all([
      RecordIndex.find().sort({ timestamp: -1 }).limit(limit).lean(),
      VehicleIndex.find().sort({ registeredAt: -1 }).limit(limit).lean(),
    ]);

    const recordVins = [...new Set(records.map((record) => record.vin).filter(Boolean))];
    const recordVehicles = recordVins.length
      ? await VehicleIndex.find({ vin: { $in: recordVins } }).lean()
      : [];

    const vehicleMap = new Map();
    for (const vehicle of [...recordVehicles, ...recentVehicles]) {
      vehicleMap.set(vehicle.vin, vehicle);
    }

    const items = [];

    for (const record of records) {
      const vehicle = vehicleMap.get(record.vin);
      items.push({
        id: `record-${record._id}`,
        kind: "RECORD",
        vin: record.vin,
        make: vehicle?.make || null,
        model: vehicle?.model || null,
        recordType: record.recordType,
        description: record.description || "History record added",
        actor: record.recordedBy,
        timestamp: record.timestamp,
        txHash: record.txHash || null,
        riskLevel: vehicle?.riskLevel || null,
      });
    }

    for (const vehicle of recentVehicles) {
      if (vehicle.registeredAt) {
        items.push({
          id: `registration-${vehicle._id}`,
          kind: "REGISTRATION",
          vin: vehicle.vin,
          make: vehicle.make || null,
          model: vehicle.model || null,
          recordType: null,
          description: "Vehicle registered on-chain",
          actor: vehicle.currentOwner,
          timestamp: vehicle.registeredAt,
          txHash: null,
          riskLevel: vehicle.riskLevel || null,
        });
      }
      if (vehicle.photoUploadedAt) {
        items.push({
          id: `photo-${vehicle._id}-${new Date(vehicle.photoUploadedAt).getTime()}`,
          kind: "PHOTO",
          vin: vehicle.vin,
          make: vehicle.make || null,
          model: vehicle.model || null,
          recordType: null,
          description: "Vehicle photo fingerprint updated",
          actor: vehicle.photoUploadedBy || vehicle.currentOwner,
          timestamp: vehicle.photoUploadedAt,
          txHash: null,
          riskLevel: vehicle.riskLevel || null,
        });
      }
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      generatedAt: new Date().toISOString(),
      items: items.slice(0, limit),
    });
  } catch (err) {
    next(err);
  }
}
