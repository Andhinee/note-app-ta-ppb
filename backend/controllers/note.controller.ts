import { Request, Response } from "express";

import { prisma } from "../config/prisma";

export const getNotes = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).userId;

    if (!userId) {
        res.status(400).json({ error: "Missing userId from request" });
        return;
    }

    try {
        const notes = await prisma.note.findMany({ where: { userId } });
        res.status(200).json(notes);
        return;
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch notes" });
        return;
    }
};

export const getNoteById = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).userId;

    if (!userId) {
        res.status(400).json({ error: "Missing userId from request" });
        return;
    }

    const { id } = req.params;

    if (!id) {
        res.status(400).json({ error: "Missing note ID from parameters" });
        return;
    }

    try {
        const note = await prisma.note.findUnique({ where: { id } });
        if (!note) {
            res.status(404).json({ error: "Note not found" });
            return;
        }

        res.status(200).json(note);
        return;
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch note" });
        return;
    }
};

export const createNote = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).userId;

    if (!userId) {
        res.status(400).json({ error: "Missing userId from request" });
        return;
    }

    const { title, content, color, mood, isLocked, isTimeCapsule, unlockDate } = req.body;

    try {
        if (!title || !content) {
            res.status(400).json({ error: "Title and content are required" });
            return;
        }

        if (!!isTimeCapsule && !unlockDate) {
            res.status(400).json({ error: "Missing unlock date for time capsule note" });
            return;
        }

        const noteData: Note = {
            userId,
            title,
            content,
            color,
            mood,
            isLocked: Boolean(isLocked),
            isTimeCapsule: Boolean(isTimeCapsule),
        };

        if (unlockDate) {
            noteData.unlockDate = new Date(unlockDate); // Converts to Date object
        }

        const note = await prisma.note.create({
            data: noteData,
        });
        res.status(201).json(note);
        return;
    } catch (error) {
        res.status(500).json({ error: "Failed to create note" });
        return;
    }
};

export const updateNote = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).userId;

    if (!userId) {
        res.status(400).json({ error: "Missing userId from request" });
        return;
    }

    const { id } = req.params;
    const { title, content, color, mood, isLocked, isTimeCapsule, unlockDate } = req.body;

    try {
        if (!!isTimeCapsule && !unlockDate) {
            res.status(400).json({ error: "Missing unlock date for time capsule note" });
            return;
        }

        // Remove undefined values to prevent overwriting existing fields
        const updateData = Object.fromEntries(
            Object.entries({ title, content, color, mood, isLocked, isTimeCapsule, unlockDate }).filter(([_, v]) => v !== undefined)
        );

        const note = await prisma.note.update({
            where: { id },
            data: updateData,
        });

        res.status(200).json(note);
        return;
    } catch (error) {
        res.status(500).json({ error: "Failed to update note" });
        return;
    }
}

export const deleteNote = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req as any;
        const { id } = req.params;

        if (!userId) {
            res.status(400).json({ error: "Missing userId from request" });
            return;
        }

        const existingNote = await prisma.note.findUnique({
            where: { id },
        });

        if (!existingNote) {
            res.status(404).json({ error: "Note not found" });
            return;
        }

        if (existingNote.userId !== userId) {
            res.status(403).json({ error: "Unauthorized to delete this note" });
            return;
        }

        // Perform the deletion
        await prisma.note.delete({
            where: { id },
        });

        res.status(200).json({ message: "Note deleted successfully" });
        return;
    } catch (error) {
        res.status(500).json({ error: "Failed to delete note", details: error });
        return;
    }
}

interface Note {
    userId: string;
    title: string;
    content: string;
    color?: string;
    mood?: string;
    isLocked?: boolean;
    isTimeCapsule?: boolean;
    unlockDate?: Date;
}