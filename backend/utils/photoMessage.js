export function buildVehiclePhotoMessage(vin, fileHash, timestamp) {
  return `Vehicle photo upload\nVIN: ${vin}\nFile SHA-256: ${fileHash}\nTimestamp: ${timestamp}`;
}
