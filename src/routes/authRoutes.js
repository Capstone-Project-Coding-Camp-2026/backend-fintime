import { Router } from "express";
import {
  login,
  profile,
  updateProfile,
  register,
  forgotPassword,
  resetPassword,
  checkAvailability,
  verifyOtp,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const r = Router();
r.post("/register", register);
r.post("/login", login);
r.post("/verify-otp", verifyOtp);
r.post("/forgot-password", forgotPassword);
r.post("/reset-password", resetPassword);
r.post("/check-availability", checkAvailability);
r.get("/profile", authMiddleware, profile);
r.put("/profile", authMiddleware, updateProfile);

export default r;
