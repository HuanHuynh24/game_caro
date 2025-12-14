import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ENV } from "../config/env.js";

function signToken(userId) {
  return jwt.sign({ userId }, ENV.JWT_SECRET, { expiresIn: "7d" });
}

export const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu username/password" });
    }

    const existed = await User.findOne({ username });
    if (existed) {
      return res
        .status(409)
        .json({ success: false, message: "Username đã tồn tại" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({ username, passwordHash });

    const token = signToken(user._id.toString());

    return res.json({
      success: true,
      token,
      user: { id: user._id.toString(), username: user.username },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Register failed" });
  }
};

export async function login(req, res) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing username/password" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user._id.toString());

    return res.json({
      success: true,
      token,
      user: { id: user._id, username: user.username },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Login failed" });
  }
}
