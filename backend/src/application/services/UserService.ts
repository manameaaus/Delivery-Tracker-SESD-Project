import type { IUserRepository } from "../interfaces/IRepositories.js";
import type { Profile } from "../../domain/entities/Profile.js";
import { AppError } from "../../domain/errors/AppError.js";

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async listUsers(actor: Profile) {
    this.ensureAdmin(actor);
    return this.userRepository.listUsers();
  }

  async listRunners(actor: Profile) {
    if (!actor.hasAnyRole(["delivery_creator", "approver", "admin"])) {
      throw new AppError("You do not have permission for this action", 403);
    }
    return this.userRepository.listRunners();
  }

  async deleteUser(actor: Profile, userId: string) {
    this.ensureAdmin(actor);
    if (actor.id === userId) {
      throw new AppError("Admins cannot delete their own account", 409);
    }
    await this.userRepository.deleteUser(userId);
  }

  private ensureAdmin(actor: Profile) {
    if (!actor.hasRole("admin")) {
      throw new AppError("Admin access required", 403);
    }
  }
}

