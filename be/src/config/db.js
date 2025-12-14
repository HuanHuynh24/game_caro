import mongoose from "mongoose";
import { ENV } from "./env.js";

export async function connectDB() {
  await mongoose.connect(ENV.MONGODB_URI);
  console.log("✅ MongoDB connected");
}
