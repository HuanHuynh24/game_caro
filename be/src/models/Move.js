import mongoose from "mongoose";

const moveSchema = new mongoose.Schema({
  roomId: mongoose.Schema.Types.ObjectId,
  x: Number,
  y: Number,
  symbol: String,
  by: mongoose.Schema.Types.ObjectId,
});

export default mongoose.model("Move", moveSchema);
