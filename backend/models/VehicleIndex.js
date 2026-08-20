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
});

const VehicleIndex = mongoose.model("VehicleIndex", vehicleIndexSchema);

export default VehicleIndex;
