import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Project root is two levels above backend/config
export const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
export const UPLOADS_ROOT = path.join(PROJECT_ROOT, "uploads");
export const VEHICLE_PHOTOS_DIR = path.join(UPLOADS_ROOT, "vehicles");

// Ensure the upload directories exist before multer tries to write to them.
fs.mkdirSync(VEHICLE_PHOTOS_DIR, { recursive: true });

export function toPublicUploadUrl(filename) {
  return `/uploads/vehicles/${filename}`;
}
