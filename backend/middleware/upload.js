import crypto from "crypto";
import multer from "multer";
import { VEHICLE_PHOTOS_DIR } from "../config/paths.js";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function sanitizeVin(vin = "") {
  return vin.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "vehicle";
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VEHICLE_PHOTOS_DIR),
  filename: (req, file, cb) => {
    const vin = sanitizeVin(req.params.vin);
    const ext = EXT_BY_MIME[file.mimetype] || ".jpg";
    const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    cb(null, `${vin}-${unique}${ext}`);
  },
});

export const vehiclePhotoUpload = multer({
  storage,
  limits: { fileSize: MAX_PHOTO_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!EXT_BY_MIME[file.mimetype]) {
      const err = new Error(
        "Unsupported image type. Allowed formats: JPEG, PNG, WebP, GIF"
      );
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});
