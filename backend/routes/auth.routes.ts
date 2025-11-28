import express from "express";
import {
    signUpWithEmail,
    signUpWithGoogle,
    signInWithEmail,
    signInWithGoogle,
    signInWithToken
} from "../controllers/auth.controller";

const router = express.Router();

// Sign up routes
router.post("/sign-up/email", signUpWithEmail);
router.post("/sign-up/google", signUpWithGoogle);

// Sign in routes
router.post("/sign-in/email", signInWithEmail);
router.post("/sign-in/google", signInWithGoogle);
router.post("/sign-in/token", signInWithToken); // Alternative secure approach

export default router;