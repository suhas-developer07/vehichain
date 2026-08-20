import { contract } from "../config/contract.js";
import VehicleIndex from "../models/VehicleIndex.js";
import RecordIndex from "../models/RecordIndex.js";

const RECORD_TYPES = ["SERVICE", "ACCIDENT", "INSURANCE", "OWNERSHIP_TRANSFER", "INSPECTION"];

/**
 * GET /api/vehicles/:vin
 * Full vehicle detail + live history from chain (source of truth)
 */
export async function getVehicleDetail(req, res, next) {
  try {
    const { vin } = req.params;

    // Read from chain (source of truth)
    let vehicle;
    try {
      vehicle = await contract.getVehicle(vin);
    } catch (err) {
      return res.status(404).json({ error: "Vehicle not found", details: err.message });
    }

    // Read history from chain
    const history = await contract.getHistory(vin);
    const formattedHistory = history.map((record, index) => ({
      index,
      recordType: RECORD_TYPES[Number(record.recordType)],
      dataHash: record.dataHash,
      description: record.description,
      recordedBy: record.recordedBy,
      timestamp: new Date(Number(record.timestamp) * 1000).toISOString(),
    }));

    res.json({
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: Number(vehicle.year),
      currentOwner: vehicle.currentOwner,
      exists: vehicle.exists,
      history: formattedHistory,
      recordCount: formattedHistory.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/vehicles
 * List/search vehicles (query params: make, model, owner, status) from Mongo
 */
export async function listVehicles(req, res, next) {
  try {
    const { make, model, owner, status } = req.query;
    const filter = {};

    if (make) filter.make = { $regex: make, $options: "i" };
    if (model) filter.model = { $regex: model, $options: "i" };
    if (owner) filter.currentOwner = owner;
    if (status) filter.status = status;

    const vehicles = await VehicleIndex.find(filter).sort({ registeredAt: -1 });
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/health
 */
export async function healthCheck(req, res, next) {
  try {
    let chainConnected = false;
    try {
      await contract.admin();
      chainConnected = true;
    } catch {
      chainConnected = false;
    }

    const mongoose = await import("mongoose");
    const dbConnected = mongoose.default.connection.readyState === 1;

    res.json({ status: "ok", chainConnected, dbConnected });
  } catch (err) {
    next(err);
  }
}
