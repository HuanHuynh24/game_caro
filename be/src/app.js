import express from "express";
import cors from "cors";
import { ENV } from "./config/env.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import matchRoutes from "./routes/match.routes.js";

const app = express();

app.use(cors({ origin: ENV.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// ✅ health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "caro-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/matches", matchRoutes);

export default app;
