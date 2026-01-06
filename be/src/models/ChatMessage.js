import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: { type: String, required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export default mongoose.model("ChatMessage", chatMessageSchema);
