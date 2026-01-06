import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true },
    email: String,
    passwordHash: String,
    elo: {
      type: Number,
      default: 1000,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
