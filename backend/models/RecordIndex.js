import mongoose from "mongoose";

const recordIndexSchema = new mongoose.Schema({
  vin: { type: String, index: true },
  recordType: String, // "SERVICE" | "ACCIDENT" | "INSURANCE" | "OWNERSHIP_TRANSFER" | "INSPECTION"
  dataHash: String,
  description: String,
  recordedBy: String, // wallet address
  timestamp: Date,
  txHash: String, // on-chain transaction hash
  blockNumber: Number,
});

const RecordIndex = mongoose.model("RecordIndex", recordIndexSchema);

export default RecordIndex;
