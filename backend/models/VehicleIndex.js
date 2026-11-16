import mongoose from "mongoose";

const vehicleIndexSchema = new mongoose.Schema({
  vin: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  make: String,
  model: String,
  year: Number,
  currentOwner: String, // wallet address
  registeredAt: Date,
  lastUpdatedAt: Date,
  recordCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["NORMAL", "SUSPICIOUS", "VERIFIED"],
    default: "NORMAL",
  },
  photoUrl: String,
  photoPath: String,
  photoHash: String,
  photoMimeType: String,
  photoSize: Number,
  photoUploadedAt: Date,
  photoUploadedBy: String,
  trustScore: { type: Number, min: 0, max: 100 },
  trustGrade: String,
  riskLevel: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  },
  trustUpdatedAt: Date,
});

// Never expose the server-side file path in API responses.
vehicleIndexSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.photoPath;
    return ret;
  },
});

const VehicleIndex = mongoose.model("VehicleIndex", vehicleIndexSchema);

export default VehicleIndex;
