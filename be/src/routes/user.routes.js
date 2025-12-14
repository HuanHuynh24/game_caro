import { Router } from "express";
import { authHttp } from "../middleware/authHttp.js";
import { me } from "../controllers/user.controller.js";

const router = Router();

router.get("/me", authHttp, me);

export default router;
