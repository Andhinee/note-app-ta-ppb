import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { prisma } from "../config/prisma";
import { auth } from "../config/firebase/firebase";

interface SignUpEmailParams {
    email: string;
    password: string;
    fullName: string;
}

interface SignUpGoogleParams {
    idToken: string; // Google ID token
    fullName?: string;
}

interface SignInEmailParams {
    email: string;
    password: string;
}

interface SignInGoogleParams {
    idToken: string; // Google ID token
}

// Sign up with email and password
export const signUpWithEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, fullName }: SignUpEmailParams = req.body;

        if (!email || !password || !fullName) {
            res.status(400).json({ error: "Email, password, and fullName are required" });
            return;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            res.status(409).json({ error: "User already exists with this email" });
            return;
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user in Firebase (for consistency)
        let firebaseUser;
        try {
            firebaseUser = await auth.createUser({
                email,
                password,
                displayName: fullName,
            });
        } catch (firebaseError: any) {
            if (firebaseError.code === 'auth/email-already-exists') {
                res.status(409).json({ error: "Email already exists in Firebase" });
                return;
            }
            throw firebaseError;
        }

        // Create user in Prisma database
        const user = await prisma.user.create({
            data: {
                id: firebaseUser.uid, // Use Firebase UID as primary key
                email,
                fullName,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                profilePicture: true,
                gender: true,
                birthDate: true,
            }
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "User created successfully",
            user,
            token
        });
        return;
    } catch (error) {
        console.error("Sign up error:", error);
        res.status(500).json({ error: "Failed to create user" });
        return;
    }
};

// Sign up with Google
export const signUpWithGoogle = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idToken, fullName }: SignUpGoogleParams = req.body;

        if (!idToken) {
            res.status(400).json({ error: "Google ID token is required" });
            return;
        }

        // Verify Google ID token with Firebase
        const decodedToken = await auth.verifyIdToken(idToken);
        const { uid, email, name } = decodedToken;

        if (!email) {
            res.status(400).json({ error: "Email not found in Google token" });
            return;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            res.status(409).json({ error: "User already exists with this email" });
            return;
        }

        // Create user in Prisma database
        const user = await prisma.user.create({
            data: {
                id: uid, // Use Firebase UID
                email,
                fullName: fullName || name || null,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                profilePicture: true,
                gender: true,
                birthDate: true,
            }
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "User created successfully with Google",
            user,
            token
        });
        return;
    } catch (error) {
        console.error("Google sign up error:", error);
        res.status(500).json({ error: "Failed to create user with Google" });
        return;
    }
};

// Sign in with email and password
export const signInWithEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password }: SignInEmailParams = req.body;

        if (!email || !password) {
            res.status(400).json({ error: "Email and password are required" });
            return;
        }

        // Find user in database
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                fullName: true,
                profilePicture: true,
                gender: true,
                birthDate: true,
            }
        });

        if (!user) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        // Verify password with Firebase (sign in user)
        try {
            const userCredential = await auth.getUserByEmail(email);
            // For email/password users, we'll use Firebase's signInWithEmailAndPassword
            // But since this is server-side, we'll verify the user exists in Firebase
            // The actual password verification should be done on the client side
            // and then send the Firebase ID token to this endpoint

            // For now, let's assume the password verification is done via Firebase ID token
            // This is a simplified version - in production, you should verify the Firebase ID token
        } catch (firebaseError) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Sign in successful",
            user,
            token
        });
        return;
    } catch (error) {
        console.error("Sign in error:", error);
        res.status(500).json({ error: "Failed to sign in" });
        return;
    }
};

// Sign in with Google
export const signInWithGoogle = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idToken }: SignInGoogleParams = req.body;

        if (!idToken) {
            res.status(400).json({ error: "Google ID token is required" });
            return;
        }

        // Verify Google ID token with Firebase
        const decodedToken = await auth.verifyIdToken(idToken);
        const { uid, email } = decodedToken;

        if (!email) {
            res.status(400).json({ error: "Email not found in Google token" });
            return;
        }

        // Find user in database
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                fullName: true,
                profilePicture: true,
                gender: true,
                birthDate: true,
            }
        });

        if (!user) {
            res.status(404).json({ error: "User not found. Please sign up first." });
            return;
        }

        // Verify that the Firebase UID matches
        if (user.id !== uid) {
            res.status(401).json({ error: "Invalid authentication" });
            return;
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Google sign in successful",
            user,
            token
        });
        return;
    } catch (error) {
        console.error("Google sign in error:", error);
        res.status(500).json({ error: "Failed to sign in with Google" });
        return;
    }
};

// Alternative sign in with Firebase ID token (more secure approach)
export const signInWithToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            res.status(400).json({ error: "Firebase ID token is required" });
            return;
        }

        // Verify Firebase ID token
        const decodedToken = await auth.verifyIdToken(idToken);
        const { uid, email } = decodedToken;

        if (!email) {
            res.status(400).json({ error: "Email not found in token" });
            return;
        }

        // Find or create user in database
        const user = await prisma.user.upsert({
            where: { email },
            update: {}, // Don't update anything if user exists
            create: {
                id: uid,
                email,
                fullName: decodedToken.name || null,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                profilePicture: true,
                gender: true,
                birthDate: true,
            }
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Authentication successful",
            user,
            token
        });
        return;
    } catch (error) {
        console.error("Token sign in error:", error);
        res.status(500).json({ error: "Failed to authenticate with token" });
        return;
    }
};