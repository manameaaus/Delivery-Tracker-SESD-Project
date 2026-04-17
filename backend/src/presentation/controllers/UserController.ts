import type { NextFunction, Request, Response } from "express";
import type { UserService } from "../../application/services/UserService.js";

export class UserController {
  constructor(private readonly userService: UserService) {}

  listUsers = async (request: Request, response: Response, next: NextFunction) => {
    try {
      response.json(await this.userService.listUsers(request.actor!));
    } catch (error) {
      next(error);
    }
  };

  listRunners = async (request: Request, response: Response, next: NextFunction) => {
    try {
      response.json(await this.userService.listRunners(request.actor!));
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (request: Request, response: Response, next: NextFunction) => {
    try {
      await this.userService.deleteUser(request.actor!, Array.isArray(request.params.id) ? request.params.id[0] : request.params.id);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
