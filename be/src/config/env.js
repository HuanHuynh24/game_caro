import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 4000,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  BOARD_SIZE: Number(process.env.BOARD_SIZE || 15),
  WIN_LENGTH: Number(process.env.WIN_LENGTH || 5),
};
