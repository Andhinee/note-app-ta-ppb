import { Request, Response } from "express";

import { prisma } from "../config/prisma";
import { auth } from "../config/firebase/firebase";

export const createUser = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).userId; // Get UID from Firebase
    const email = (req as any).email; // Get email from Firebase

    const { fullName, profilePicture }: CreateUserParams = req.body; // Optional fields

    if (!userId || !email) {
        res.status(400).json({ error: "Missing userId or email from authentication" });
        return;
    }

    try {
        const user = await prisma.user.upsert({
            where: { id: userId },
            update: { fullName, profilePicture }, // Only update if they exist
            create: { id: userId, email, fullName, profilePicture },
        });

        res.status(201).json(user);
        return;
    } catch (error) {
        res.status(500).json({ error: "Failed to create user" });
        return;
    }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).userId;

    if (!userId) {
        res.status(400).json({ error: "Missing userId from request" });
        return;
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(400).json({ error: "User not found" });
            return;
        }

        res.status(200).json(user);
        return;
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch user" });
        return;
    }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req as any;
        const { fullName, profilePicture, birthDate, gender } = req.body;

        if (!userId) {
            res.status(400).json({ error: "Missing userId from request" });
            return;
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!existingUser) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        if (!fullName && !profilePicture && !gender && !birthDate) {
            res.status(400).json({ error: "Provide at least one field to update" });
            return;
        }

        // Update user
        const updateData: { fullName?: string; profilePicture?: string; gender?: string; birthDate?: Date } = {};
        if (fullName !== undefined) updateData.fullName = fullName;
        if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
        if (gender !== undefined) updateData.gender = gender;
        if (birthDate !== undefined) updateData.birthDate = new Date(birthDate);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, fullName: true, profilePicture: true, gender: true, birthDate: true },
        });

        res.status(200).json({ message: "User updated successfully", user: updatedUser });
        return;
    } catch (error) {
        res.status(500).json({ error: "Failed to update user", details: error });
        return;
    }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req as any;

        if (!userId) {
            res.status(400).json({ error: "Missing userId from request" });
            return;
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!existingUser) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        // Delete all notes belonging to the user
        await prisma.note.deleteMany({
            where: { userId },
        });

        // Delete user from Prisma database
        await prisma.user.delete({
            where: { id: userId },
        });

        // Delete user from Firebase Authentication
        await auth.deleteUser(userId);

        res.status(200).json({ message: "User and all notes deleted successfully" });
        return;
    } catch (error) {
        res.status(500).json({ error: "Failed to delete user", details: error });
        return;
    }
};

interface CreateUserParams {
    fullName?: string;
    profilePicture?: string;
}