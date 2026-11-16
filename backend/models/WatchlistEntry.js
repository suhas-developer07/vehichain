import mongoose from "mongoose";

/**
 * Internal watchlist used by the buyer due-diligence report.
 *
 * Entries are written by the contract admin only (admin wallet signature is
 * verified server-side). A VIN entry flags a specific vehicle; an owner entry
 * flags a wallet that should not appear in a clean sale.
 */
const watchlistEntrySchema = new mongoose.Schema({
  vin: { type: String, index: true }, // uppercase, optional
  owner: { type: String, index: true }, // lowercase wallet, optional
  reason: { type: String, required: true },
  severity: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium",
  },
  active: { type: Boolean, default: true, index: true },
  addedBy: String,
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date,
  resolvedBy: String,
});

watchlistEntrySchema.pre("validate", function normalizeWatchlist(next) {
  if (!this.vin && !this.owner) {
    next(new Error("A watchlist entry needs a VIN or an owner address"));
    return;
  }
  if (this.vin) this.vin = String(this.vin).trim().toUpperCase();
  if (this.owner) this.owner = String(this.owner).trim().toLowerCase();
  next();
});

const WatchlistEntry = mongoose.model("WatchlistEntry", watchlistEntrySchema);

export default WatchlistEntry;
