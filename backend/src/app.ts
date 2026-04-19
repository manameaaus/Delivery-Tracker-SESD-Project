import cors from "cors";
import express from "express";
import { createRouter } from "./presentation/routes/index.js";
import { errorMiddleware } from "./presentation/middlewares/errorMiddleware.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN?.split(",").map((origin) => origin.trim()) ?? true,
      credentials: true
    })
  );
  app.use(express.json());
  app.use("/api", createRouter());
  app.use(errorMiddleware);

  return app;
}

