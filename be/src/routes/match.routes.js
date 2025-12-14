import { Router } from "express";
import { authHttp } from "../middleware/authHttp.js";
import { myHistory } from "../controllers/match.controller.js";

const router = Router();

router.get("/history", authHttp, myHistory);

export default router;
