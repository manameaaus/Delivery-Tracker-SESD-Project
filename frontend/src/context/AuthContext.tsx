import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";

type Role = "delivery_creator" | "runner" | "approver" | "admin";

type Profile = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  roles: Role[];
};

type AuthContextValue = {
  token: string | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => void;
  hasRole: (role: Role) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("delivery_token"));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest<{ profile: Profile }>("/auth/me", {
          token
        });
        setProfile(response.profile);
      } catch {
        localStorage.removeItem("delivery_token");
        setToken(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      profile,
      loading,
      async signIn(identifier: string, password: string) {
        const response = await apiRequest<{
          accessToken: string;
          profile: Profile;
        }>("/auth/sign-in", {
          method: "POST",
          body: JSON.stringify({ identifier, password })
        });

        localStorage.setItem("delivery_token", response.accessToken);
        setToken(response.accessToken);
        setProfile(response.profile);
      },
      signOut() {
        localStorage.removeItem("delivery_token");
        setToken(null);
        setProfile(null);
      },
      hasRole(role: Role) {
        return profile?.roles.includes(role) ?? false;
      }
    }),
    [loading, profile, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("AuthContext is not available");
  }
  return context;
}

