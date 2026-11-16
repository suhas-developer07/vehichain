/**
 * Message signed by the vehicle owner before uploading/replacing a photo.
 * Must match backend/utils/photoMessage.js exactly.
 */
export function buildVehiclePhotoMessage(vin, fileHash, timestamp) {
  return `Vehicle photo upload\nVIN: ${vin}\nFile SHA-256: ${fileHash}\nTimestamp: ${timestamp}`;
}

/** SHA-256 of a File/Blob as lowercase hex. */
export async function sha256File(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
