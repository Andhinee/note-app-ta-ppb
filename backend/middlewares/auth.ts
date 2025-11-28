import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JWTPayload {
    userId: string;
    email: string;
    iat: number;
    exp: number;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    try {
        // Verify JWT token instead of Firebase ID token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "your-secret-key"
        ) as JWTPayload;

        (req as any).userId = decoded.userId;
        (req as any).email = decoded.email;

        next();
        return;
    } catch (error) {
        res.status(403).json({ error: "Invalid token" });
        return;
    }
};