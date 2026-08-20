import "./config/env.js";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import vehicleRoutes from "./routes/vehicles.js";
import recordRoutes from "./routes/records.js";
import { healthCheck } from "./controllers/vehicleController.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { startEventListener } from "./listeners/eventListener.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/api/health", healthCheck);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/records", recordRoutes);

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
