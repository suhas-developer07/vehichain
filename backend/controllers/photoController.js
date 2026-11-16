import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { contract } from "../config/contract.js";
import { toPublicUploadUrl, VEHICLE_PHOTOS_DIR } from "../config/paths.js";
import { buildVehiclePhotoMessage } from "../utils/photoMessage.js";
import VehicleIndex from "../models/VehicleIndex.js";

const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000; // signature is valid for 10 minutes

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // Best-effort cleanup only.
  }
}

/**
 * Verify the file content actually looks like one of the supported images,
 * rather than trusting the browser-supplied MIME type alone.
 */
function hasValidImageSignature(buffer) {
  if (!buffer || buffer.length < 12) return false;

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isGif =
    buffer.slice(0, 4).toString("ascii") === "GIF8";
  const isWebp =
    buffer.slice(0, 4).toString("ascii") === "RIFF" &&
    buffer.slice(8, 12).toString("ascii") === "WEBP";

  return isJpeg || isPng || isGif || isWebp;
}

/**
 * POST /api/vehicles/:vin/photo
 *
 * The photo itself lives off-chain (uploads/vehicles), while the SHA-256 hash
 * and metadata are stored in MongoDB. Upload authorization is proven with a
 * wallet signature from the vehicle's current on-chain owner, which keeps the
 * blockchain as the source of truth for ownership.
 */
export async function uploadVehiclePhoto(req, res, next) {
  const file = req.file;

  try {
    if (!file) {
      throw fail(400, "Vehicle photo is required");
    }

    const { vin } = req.params;
    const { signature, timestamp, fileHash } = req.body || {};

    if (!signature || !timestamp || !fileHash) {
      throw fail(
        400,
        "Wallet signature, timestamp, and file hash are required"
      );
    }

    const signedAt = Number(timestamp);
    if (!Number.isFinite(signedAt) || Math.abs(Date.now() - signedAt) > MAX_CLOCK_SKEW_MS) {
      throw fail(401, "Upload authorization has expired. Please try again.");
    }

    // Read ownership directly from the chain (source of truth).
    let vehicle;
    try {
      vehicle = await contract.getVehicle(vin);
    } catch {
      throw fail(404, "Vehicle not found on-chain");
    }

    const fileBuffer = await fs.promises.readFile(file.path);
    if (!hasValidImageSignature(fileBuffer)) {
      throw fail(400, "The uploaded file is not a valid image");
    }

    const photoHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const signedFileHash = String(fileHash).toLowerCase();

    // The signature covers the exact file bytes, so a swapped file fails here
    // even if an attacker reuses a valid signature payload.
    if (photoHash !== signedFileHash) {
      throw fail(400, "Uploaded file does not match the signed file hash");
    }

    // Prove the uploader controls the current owner wallet.
    let signer;
    try {
      signer = ethers.verifyMessage(
        buildVehiclePhotoMessage(vin, signedFileHash, timestamp),
        signature
      );
    } catch {
      throw fail(401, "Invalid wallet signature");
    }

    if (signer.toLowerCase() !== vehicle.currentOwner.toLowerCase()) {
      throw fail(403, "Only the current vehicle owner can upload a photo");
    }

    const photoUrl = toPublicUploadUrl(file.filename);

    const previous = await VehicleIndex.findOne({ vin }).lean();

    const updated = await VehicleIndex.findOneAndUpdate(
      { vin },
      {
        $set: {
          vin,
          photoUrl,
          photoPath: file.path,
          photoHash,
          photoMimeType: file.mimetype,
          photoSize: file.size,
          photoUploadedAt: new Date(),
          photoUploadedBy: signer,
          lastUpdatedAt: new Date(),
        },
        $setOnInsert: { recordCount: 0 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    // Remove the superseded photo after the DB update succeeds.
    if (previous?.photoPath && previous.photoPath !== file.path) {
      const resolvedPrevious = path.resolve(previous.photoPath);
      if (resolvedPrevious.startsWith(VEHICLE_PHOTOS_DIR + path.sep)) {
        await safeUnlink(resolvedPrevious);
      }
    }

    res.status(201).json({
      vin,
      photoUrl,
      photoHash,
      photoMimeType: updated.photoMimeType,
      photoSize: updated.photoSize,
      photoUploadedAt: updated.photoUploadedAt,
      uploadedBy: signer,
    });
  } catch (err) {
    // Never leave orphaned files when validation or persistence fails.
    if (file?.path) await safeUnlink(file.path);
    next(err.status ? err : fail(500, err.message));
  }
}
