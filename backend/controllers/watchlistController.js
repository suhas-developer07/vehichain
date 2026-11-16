import { ethers } from "ethers";
import { contract } from "../config/contract.js";
import WatchlistEntry from "../models/WatchlistEntry.js";
import {
  buildWatchlistMessage,
  buildWatchlistResolveMessage,
} from "../utils/watchlistMessage.js";

const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;
const SEVERITIES = ["low", "medium", "high", "critical"];

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseTimestamp(timestamp) {
  const signedAt = Number(timestamp);
  if (
    !Number.isFinite(signedAt) ||
    Math.abs(Date.now() - signedAt) > MAX_CLOCK_SKEW_MS
  ) {
    throw fail(401, "Watchlist authorization has expired. Please try again.");
  }
}

async function verifyAdminMessage(message, signature) {
  if (!signature) throw fail(400, "Admin wallet signature is required");

  let signer;
  try {
    signer = ethers.verifyMessage(message, signature);
  } catch {
    throw fail(401, "Invalid wallet signature");
  }

  let admin;
  try {
    admin = await contract.admin();
  } catch {
    throw fail(503, "Could not read the contract admin from the chain");
  }

  if (signer.toLowerCase() !== admin.toLowerCase()) {
    throw fail(403, "Only the contract admin can manage the watchlist");
  }
  return signer;
}

/**
 * GET /api/watchlist?includeResolved=true&vin=...&owner=...
 * Read the internal watchlist. Surfaced in due-diligence reports.
 */
export async function listWatchlist(req, res, next) {
  try {
    const { includeResolved, vin, owner } = req.query;
    const filter = {};

    if (includeResolved !== "true") filter.active = true;
    if (vin) filter.vin = String(vin).trim().toUpperCase();
    if (owner) filter.owner = String(owner).trim().toLowerCase();

    const entries = await WatchlistEntry.find(filter)
      .sort({ active: -1, createdAt: -1 })
      .limit(200)
      .lean();

    res.json(entries);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/watchlist
 * Admin-signed watchlist entry. Body: { vin?, owner?, reason, severity,
 * signature, timestamp }.
 */
export async function addWatchlistEntry(req, res, next) {
  try {
    const body = req.body || {};
    const vin = body.vin ? String(body.vin).trim() : "";
    const owner = body.owner ? String(body.owner).trim() : "";
    const reason = body.reason ? String(body.reason).trim() : "";
    const severity = SEVERITIES.includes(body.severity) ? body.severity : "medium";
    const { signature, timestamp } = body;

    if (!vin && !owner) {
      throw fail(400, "Provide a VIN, an owner address, or both");
    }
    if (vin.length > 32) {
      throw fail(400, "VIN must be 32 characters or fewer");
    }
    if (owner && !/^0x[a-fA-F0-9]{40}$/.test(owner)) {
      throw fail(400, "Owner must be a valid 0x wallet address");
    }
    if (reason.length < 3 || reason.length > 500) {
      throw fail(400, "Reason must be between 3 and 500 characters");
    }

    parseTimestamp(timestamp);

    // Verify exactly what the admin signed (raw values as submitted).
    const message = buildWatchlistMessage({
      vin,
      owner,
      reason,
      severity,
      timestamp,
    });
    const signer = await verifyAdminMessage(message, signature);

    const entry = await WatchlistEntry.create({
      vin: vin ? vin.toUpperCase() : undefined,
      owner: owner ? owner.toLowerCase() : undefined,
      reason,
      severity,
      addedBy: signer,
    });

    res.status(201).json(entry);
  } catch (err) {
    if (err?.name === "ValidationError") {
      return next(fail(400, err.message));
    }
    next(err);
  }
}

/**
 * POST /api/watchlist/:id/resolve
 * Admin-signed deactivation of a watchlist entry.
 */
export async function resolveWatchlistEntry(req, res, next) {
  try {
    const { id } = req.params;
    const { signature, timestamp } = req.body || {};

    const entry = await WatchlistEntry.findById(id);
    if (!entry) throw fail(404, "Watchlist entry not found");

    parseTimestamp(timestamp);

    const message = buildWatchlistResolveMessage(id, timestamp);
    const signer = await verifyAdminMessage(message, signature);

    entry.active = false;
    entry.resolvedAt = new Date();
    entry.resolvedBy = signer;
    await entry.save();

    res.json(entry);
  } catch (err) {
    next(err);
  }
}
