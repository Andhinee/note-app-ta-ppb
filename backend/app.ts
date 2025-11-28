  import express from "express";
  import cors from "cors";

  import userRoutes from "./routes/user.routes";
  import noteRoutes from "./routes/note.routes";
  import authRoutes from "./routes/auth.routes";

  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/user", userRoutes);
  app.use("/notes", noteRoutes);
  app.use("/auth", authRoutes);

  // Root endpoint
  app.get("/", (req, res) => {
    res.send("Welcome to the Memento API!");
  });

  export default app;