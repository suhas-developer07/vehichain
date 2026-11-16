import "./config/env.js";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import { UPLOADS_ROOT } from "./config/paths.js";
import vehicleRoutes from "./routes/vehicles.js";
import recordRoutes from "./routes/records.js";
import analyticsRoutes from "./routes/analytics.js";
import dueDiligenceRoutes from "./routes/dueDiligence.js";
import watchlistRoutes from "./routes/watchlist.js";
import { healthCheck } from "./controllers/vehicleController.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { startEventListener } from "./listeners/eventListener.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Uploaded vehicle photos are served straight from the project root uploads/
app.use("/uploads", express.static(UPLOADS_ROOT));

// Routes
app.get("/api/health", healthCheck);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/due-diligence", dueDiligenceRoutes);
app.use("/api/watchlist", watchlistRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
async function start() {
  try {
    await connectDB();
    startEventListener();
    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
