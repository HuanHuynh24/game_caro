import Match from "../models/Match.js";

export async function myHistory(req, res) {
  try {
    const matches = await Match.find({ "players.userId": req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ success: true, matches });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to load history" });
  }
}
