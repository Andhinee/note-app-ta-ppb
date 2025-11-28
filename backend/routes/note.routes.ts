import express from "express";

import { getNotes, getNoteById, createNote, updateNote, deleteNote } from "../controllers/note.controller";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

router.get("/", authenticate, getNotes);
router.get("/:id", authenticate, getNoteById);
router.post("/", authenticate, createNote);
router.patch("/:id", authenticate, updateNote);
router.delete("/:id", authenticate, deleteNote);

export default router;