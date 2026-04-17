import type { IAuthRepository } from "../interfaces/IRepositories.js";
import { signInSchema } from "../dto/AuthDto.js";

export class AuthService {
  constructor(private readonly authRepository: IAuthRepository) {}

  async signIn(payload: unknown) {
    const input = signInSchema.parse(payload);
    return this.authRepository.signIn(input.identifier, input.password);
  }

  async getProfileFromToken(accessToken: string) {
    return this.authRepository.getProfileFromAccessToken(accessToken);
  }
}

