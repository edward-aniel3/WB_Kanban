import { Router } from "express";
import { login, logout, me, register } from "./authController.js";
import authMiddleware from "../../middlewares/authMiddleware.js";
import authorize from "../../middlewares/roleMiddleware.js";

const router = Router();

router.post("/register", authMiddleware, authorize("Supervisor"), register);
router.post("/login", login);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, me);

export default router;
