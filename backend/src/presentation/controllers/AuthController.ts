import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../../application/services/AuthService.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  signIn = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const session = await this.authService.signIn(request.body);
      response.json({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        profile: session.profile
      });
    } catch (error) {
      next(error);
    }
  };

  me = async (request: Request, response: Response, next: NextFunction) => {
    try {
      response.json({ profile: request.actor });
    } catch (error) {
      next(error);
    }
  };
}

