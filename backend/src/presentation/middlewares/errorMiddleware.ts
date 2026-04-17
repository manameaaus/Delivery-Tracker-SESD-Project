import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../../domain/errors/AppError.js";

export function errorMiddleware(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return response.status(400).json({
      message: "Validation failed",
      issues: error.flatten()
    });
  }

  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      message: error.message
    });
  }

  return response.status(500).json({
    message: "Internal server error"
  });
}

