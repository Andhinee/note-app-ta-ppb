import express from "express";

import { createUser, deleteUser, getUser, updateUser } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

router.post("/", authenticate, createUser);
router.get("/", authenticate, getUser);
router.patch("/", authenticate, updateUser);
router.delete("/", authenticate, deleteUser);

export default router;