import type { IAuthRepository } from "../../application/interfaces/IRepositories.js";
import { AppError } from "../../domain/errors/AppError.js";
import { supabaseAdminClient, supabasePublicClient } from "../supabase/client.js";
import { SupabaseUserRepository } from "./SupabaseUserRepository.js";

export class SupabaseAuthRepository implements IAuthRepository {
  private readonly users = new SupabaseUserRepository();

  async signIn(identifier: string, password: string) {
    const account = await this.users.findByIdentifier(identifier);
    if (!account) {
      throw new AppError("Invalid credentials", 401);
    }

    const result = await supabasePublicClient.auth.signInWithPassword({
      email: account.email,
      password
    });

    if (result.error || !result.data.session) {
      throw new AppError("Invalid credentials", 401);
    }

    const profile = await this.users.findById(account.id);
    if (!profile) {
      throw new AppError("User profile not found", 404);
    }

    return {
      accessToken: result.data.session.access_token,
      refreshToken: result.data.session.refresh_token,
      expiresAt: result.data.session.expires_at ?? null,
      profile
    };
  }

  async getProfileFromAccessToken(accessToken: string) {
    const userResult = await supabaseAdminClient.auth.getUser(accessToken);
    if (userResult.error || !userResult.data.user) {
      throw new AppError("Unauthorized", 401);
    }

    const profile = await this.users.findById(userResult.data.user.id);
    if (!profile) {
      throw new AppError("User profile not found", 404);
    }
    return profile;
  }
}

