import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, index: true },
    players: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        symbol: { type: String, enum: ["X", "O"], required: true },
      },
    ],
    winner: { type: String, enum: ["X", "O", "draw"], required: true },
    endedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Match", matchSchema);
