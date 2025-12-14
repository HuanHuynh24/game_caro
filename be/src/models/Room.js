import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symbol: {
      type: String,
      enum: ["X", "O"],
      required: true,
    },
    isReady: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    // mã phòng để join
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // host (Player X)
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // trạng thái phòng / trận
    status: {
      type: String,
      enum: ["waiting", "ready", "playing", "finished"],
      default: "waiting",
      index: true,
    },

    // danh sách người chơi (tối đa 2)
    players: {
      type: [playerSchema],
      default: [],
      validate: {
        validator: function (arr) {
          return arr.length <= 2;
        },
        message: "Room chỉ cho phép tối đa 2 người chơi",
      },
    },

    // game config (linh hoạt cho sau này)
    boardSize: {
      type: Number,
      default: 15,
    },
    winLength: {
      type: Number,
      default: 5,
    },

    // game state
    xIsNext: {
      type: Boolean,
      default: true,
    },

    // kết quả ván
    winner: {
      type: String,
      enum: ["X", "O", "draw", null],
      default: null,
    },

    // thời điểm bắt đầu lượt hiện tại (để xử timeout)
    turnStartedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
  }
);

export default mongoose.model("Room", roomSchema);
