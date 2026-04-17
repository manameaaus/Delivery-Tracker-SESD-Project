import type { NextFunction, Request, Response } from "express";
import { AuthService } from "../../application/services/AuthService.js";
import { SupabaseAuthRepository } from "../../infrastructure/repositories/SupabaseAuthRepository.js";
import { AppError } from "../../domain/errors/AppError.js";

declare module "express-serve-static-core" {
  interface Request {
    actor?: Awaited<ReturnType<AuthService["getProfileFromToken"]>>;
  }
}

const authService = new AuthService(new SupabaseAuthRepository());

export async function authMiddleware(request: Request, _response: Response, next: NextFunction) {
  try {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError("Unauthorized", 401);
    }

    const token = authorization.slice("Bearer ".length);
    request.actor = await authService.getProfileFromToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

