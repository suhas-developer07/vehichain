import { contract } from "../config/contract.js";
import VehicleIndex from "../models/VehicleIndex.js";
import RecordIndex from "../models/RecordIndex.js";
import { RECORD_TYPES } from "../utils/recordTypes.js";
import { calculateTrustScore } from "../services/trustScore.js";
import {
  buildPassportDocument,
  buildPassportJson,
  buildPassportPdf,
  buildPassportUrl,
} from "../services/passport.js";

export function formatHistory(history) {
  return history.map((record, index) => ({
    index,
    recordType: RECORD_TYPES[Number(record.recordType)] || "UNKNOWN",
    dataHash: record.dataHash,
    description: record.description,
    recordedBy: record.recordedBy,
    timestamp: new Date(Number(record.timestamp) * 1000).toISOString(),
  }));
}

export async function loadVehicleBundle(vin) {
  let vehicle;
  try {
    vehicle = await contract.getVehicle(vin);
  } catch {
    const err = new Error("Vehicle not found on-chain");
    err.status = 404;
    throw err;
  }

  const rawHistory = await contract.getHistory(vin);
  const history = formatHistory(rawHistory);

  let index = null;
  try {
    index = await VehicleIndex.findOne({ vin }).lean();
  } catch (err) {
    console.warn(`Could not read vehicle index for ${vin}:`, err.message);
  }

  const trust = calculateTrustScore({ vehicle, history, index });

  return { vehicle, history, index, trust };
}

export async function cacheTrust(vin, trust, vehicle) {
  if (!trust) return;
  try {
    await VehicleIndex.updateOne(
      { vin },
      {
        $set: {
          vin,
          ...(vehicle && {
            make: vehicle.make,
            model: vehicle.model,
            year: Number(vehicle.year),
            currentOwner: vehicle.currentOwner,
          }),
          trustScore: trust.score,
          trustGrade: trust.grade,
          riskLevel: trust.riskLevel,
          trustUpdatedAt: new Date(),
        },
        $setOnInsert: { status: "NORMAL", recordCount: 0 },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    // Analytics cache is best-effort; never fail a lookup because of it.
    console.warn(`Could not cache trust score for ${vin}:`, err.message);
  }
}

/**
 * GET /api/vehicles/:vin
 * Full vehicle detail + live history from chain (source of truth)
 */
export async function getVehicleDetail(req, res, next) {
  try {
    const { vin } = req.params;
    const { vehicle, history, index, trust } = await loadVehicleBundle(vin);

    await cacheTrust(vin, trust, vehicle);

    // The DB is only a cache for off-chain metadata; ownership still comes
    // from the chain.
    res.json({
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: Number(vehicle.year),
      currentOwner: vehicle.currentOwner,
      exists: vehicle.exists,
      history,
      recordCount: history.length,
      registeredAt: index?.registeredAt || null,
      status: index?.status || "NORMAL",
      photoUrl: index?.photoUrl || null,
      photoHash: index?.photoHash || null,
      photoUploadedAt: index?.photoUploadedAt || null,
      photoUploadedBy: index?.photoUploadedBy || null,
      trust,
      passportUrl: buildPassportUrl(req, vin),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/vehicles/:vin/trust
 * Explainable Trust Score + Fraud Radar for a single vehicle.
 */
export async function getVehicleTrust(req, res, next) {
  try {
    const { vin } = req.params;
    const { vehicle, trust } = await loadVehicleBundle(vin);
    await cacheTrust(vin, trust, vehicle);

    res.json({
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: Number(vehicle.year),
      currentOwner: vehicle.currentOwner,
      trust,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/vehicles/:vin/passport
 * Public, shareable passport JSON including a QR code for the public page.
 */
export async function getVehiclePassport(req, res, next) {
  try {
    const { vin } = req.params;
    const { vehicle, history, index, trust } = await loadVehicleBundle(vin);
    await cacheTrust(vin, trust, vehicle);

    const passport = buildPassportDocument({ vehicle, history, index, trust });
    const payload = await buildPassportJson(req, passport);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/vehicles/:vin/passport.pdf
 * Printable/downloadable vehicle passport with photo, trust score and QR.
 */
export async function getVehiclePassportPdf(req, res, next) {
  try {
    const { vin } = req.params;
    const { vehicle, history, index, trust } = await loadVehicleBundle(vin);
    await cacheTrust(vin, trust, vehicle);

    const passport = buildPassportDocument({ vehicle, history, index, trust });
    passport.passportUrl = buildPassportUrl(req, vin);

    const pdf = await buildPassportPdf(passport, index);
    const safeVin = String(vin).replace(/[^A-Za-z0-9_-]/g, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="vehicle-passport-${safeVin}.pdf"`
    );
    res.setHeader("Content-Length", pdf.length);
    res.send(pdf);
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
