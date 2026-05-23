import { Router } from "express";
import {
  login,
  profile,
  updateProfile,
  register,
  forgotPassword,
  resetPassword,
  checkAvailability,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const r = Router();
r.post("/register", register);
r.post("/login", login);
r.post("/forgot-password", forgotPassword);
r.post("/reset-password", resetPassword);
r.post("/check-availability", checkAvailability);
r.get("/profile", authMiddleware, profile);
r.put("/profile", authMiddleware, updateProfile);

export default r;
