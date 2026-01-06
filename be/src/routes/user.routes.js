import { Router } from "express";
import { authHttp } from "../middleware/authHttp.js";
import { leaderboard, me } from "../controllers/user.controller.js";

const router = Router();

router.get("/me", authHttp, me);
router.get("/leaderboard", leaderboard);
export default router;
