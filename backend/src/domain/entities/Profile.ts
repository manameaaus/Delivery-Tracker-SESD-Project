import type { AppRole } from "../enums/AppRole.js";

export class Profile {
  readonly id: string;
  readonly username: string;
  readonly fullName: string;
  readonly email: string;
  readonly roles: AppRole[];
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(params: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    roles: AppRole[];
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = params.id;
    this.username = params.username;
    this.fullName = params.fullName;
    this.email = params.email;
    this.roles = params.roles;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }

  hasRole(role: AppRole): boolean {
    return this.roles.includes(role);
  }

  hasAnyRole(roles: AppRole[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }
}

