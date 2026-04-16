import type { User } from "@supabase/supabase-js";
import type { IUserRepository } from "../../application/interfaces/IRepositories.js";
import { Profile } from "../../domain/entities/Profile.js";
import type { AppRole } from "../../domain/enums/AppRole.js";
import { AppError } from "../../domain/errors/AppError.js";
import { supabaseAdminClient } from "../supabase/client.js";

type ProfileRow = {
  id: string;
  username: string;
  full_name: string;
  created_at: string;
  updated_at: string;
  user_roles: Array<{ role: AppRole }> | null;
};

export class SupabaseUserRepository implements IUserRepository {
  async findById(id: string): Promise<Profile | null> {
    const [profileResult, authUser] = await Promise.all([
      supabaseAdminClient
        .from("profiles")
        .select("id, username, full_name, created_at, updated_at, user_roles:user_roles!user_roles_user_id_fkey(role)")
        .eq("id", id)
        .maybeSingle(),
      supabaseAdminClient.auth.admin.getUserById(id)
    ]);

    if (profileResult.error) {
      throw new AppError(profileResult.error.message, 500);
    }
    if (authUser.error) {
      throw new AppError(authUser.error.message, 500);
    }
    if (!profileResult.data || !authUser.data.user) {
      return null;
    }

    return this.mapProfile(profileResult.data as ProfileRow, authUser.data.user);
  }

  async findByIdentifier(identifier: string): Promise<{ id: string; email: string } | null> {
    if (identifier.includes("@")) {
      const users = await supabaseAdminClient.auth.admin.listUsers();
      if (users.error) {
        throw new AppError(users.error.message, 500);
      }
      const match = users.data.users.find((user) => user.email?.toLowerCase() === identifier.toLowerCase());
      return match?.email ? { id: match.id, email: match.email } : null;
    }

    const profileResult = await supabaseAdminClient
      .from("profiles")
      .select("id, username")
      .eq("username", identifier)
      .maybeSingle();

    if (profileResult.error) {
      throw new AppError(profileResult.error.message, 500);
    }
    if (!profileResult.data) {
      return null;
    }

    const profile = profileResult.data as { id: string; username: string };
    const authUser = await supabaseAdminClient.auth.admin.getUserById(profile.id);
    if (authUser.error) {
      throw new AppError(authUser.error.message, 500);
    }
    if (!authUser.data.user?.email) {
      return null;
    }

    return {
      id: profile.id,
      email: authUser.data.user.email
    };
  }

  async listUsers() {
    const [profilesResult, usersResult, deliveriesResult] = await Promise.all([
      supabaseAdminClient
        .from("profiles")
        .select("id, username, full_name, created_at, user_roles:user_roles!user_roles_user_id_fkey(role)")
        .order("created_at", { ascending: false }),
      supabaseAdminClient.auth.admin.listUsers(),
      supabaseAdminClient.from("deliveries").select("id, runner_id")
    ]);

    if (profilesResult.error) {
      throw new AppError(profilesResult.error.message, 500);
    }
    if (usersResult.error) {
      throw new AppError(usersResult.error.message, 500);
    }
    if (deliveriesResult.error) {
      throw new AppError(deliveriesResult.error.message, 500);
    }

    const deliveryCountByUser = deliveriesResult.data.reduce<Record<string, number>>((acc, row) => {
      if (row.runner_id) {
        acc[row.runner_id] = (acc[row.runner_id] ?? 0) + 1;
      }
      return acc;
    }, {});

    return profilesResult.data.map((profile) => {
      const authUser = usersResult.data.users.find((user) => user.id === profile.id);
      return {
        id: profile.id,
        username: profile.username,
        fullName: profile.full_name,
        email: authUser?.email ?? "",
        roles: (profile.user_roles ?? []).map((role) => role.role),
        createdAt: profile.created_at,
        deliveryCount: deliveryCountByUser[profile.id] ?? 0
      };
    });
  }

  async listRunners() {
    const result = await supabaseAdminClient
      .from("profiles")
      .select("id, full_name, username, user_roles:user_roles!user_roles_user_id_fkey!inner(role)")
      .eq("user_roles.role", "runner")
      .order("full_name", { ascending: true });

    if (result.error) {
      throw new AppError(result.error.message, 500);
    }

    return result.data.map((row) => ({
      id: row.id,
      label: row.full_name || row.username
    }));
  }

  async deleteUser(id: string) {
    const result = await supabaseAdminClient.auth.admin.deleteUser(id);
    if (result.error) {
      throw new AppError(result.error.message, 500);
    }
  }

  private mapProfile(profile: ProfileRow, authUser: User) {
    return new Profile({
      id: profile.id,
      username: profile.username,
      fullName: profile.full_name,
      email: authUser.email ?? "",
      roles: (profile.user_roles ?? []).map((role) => role.role),
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    });
  }
}
