import type { AppRole } from "../../domain/enums/AppRole.js";
import type { Delivery } from "../../domain/entities/Delivery.js";
import type { Profile } from "../../domain/entities/Profile.js";
import type { DeliveryFilters } from "../dto/DeliveryDto.js";

export interface AuthSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  profile: Profile;
}

export interface IDeliveryRepository {
  list(filters: DeliveryFilters): Promise<Delivery[]>;
  findById(id: string): Promise<Delivery | null>;
  create(delivery: Delivery): Promise<Delivery>;
  update(delivery: Delivery): Promise<Delivery>;
  getDashboardMetrics(filters: DeliveryFilters): Promise<{
    total: number;
    byStatus: Record<string, number>;
  }>;
}

export interface IUserRepository {
  findById(id: string): Promise<Profile | null>;
  findByIdentifier(identifier: string): Promise<{ id: string; email: string } | null>;
  listUsers(): Promise<
    Array<{
      id: string;
      username: string;
      fullName: string;
      email: string;
      roles: AppRole[];
      createdAt: string;
      deliveryCount: number;
    }>
  >;
  listRunners(): Promise<Array<{ id: string; label: string }>>;
  deleteUser(id: string): Promise<void>;
}

export interface IAuthRepository {
  signIn(identifier: string, password: string): Promise<AuthSession>;
  getProfileFromAccessToken(accessToken: string): Promise<Profile>;
}

