import RecordIndex from "../models/RecordIndex.js";

/**
 * GET /api/vehicles/:vin/records
 * Record list for a VIN from Mongo (fast index)
 */
export async function getVehicleRecords(req, res, next) {
  try {
    const { vin } = req.params;
    const records = await RecordIndex.find({ vin }).sort({ timestamp: 1 });
    res.json(records);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/records/recent
 * Most recent N records across all vehicles (query param limit, default 20)
 */
export async function getRecentRecords(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const records = await RecordIndex.find().sort({ timestamp: -1 }).limit(limit);
    res.json(records);
  } catch (err) {
    next(err);
  }
}
