import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("MONGODB_URI is not set in environment variables");
      process.exit(1);
    }

    const dbName = process.env.MONGODB_DB_NAME || "vehicle_registry";

    await mongoose.connect(uri, { dbName });
    console.log(`MongoDB connected to database: ${dbName}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
