import User from "../models/User.js";

export async function me(req, res) {
  try {
    const user = await User.findById(req.userId).select("_id username").lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json({
      success: true,
      user: { id: user._id, username: user.username },
    });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to load profile" });
  }
}
