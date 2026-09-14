import { apiClient } from "./client";
import { AuthenticatedUser } from "@/types";

export interface AuthLoginResponse {
  user: AuthenticatedUser;
  token: string;
}

export const authApi = {
  /**
   * POST /api/auth/login
   */
  async login(email: string, password: string): Promise<{ success: boolean; user?: AuthenticatedUser; error?: string }> {
    try {
      const res = await apiClient<AuthLoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ecotrack_auth_token", res.token);
        window.localStorage.setItem("ecotrack_auth_user", JSON.stringify(res.user));
      }
      return { success: true, user: res.user };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      return { success: false, error: msg };
    }
  },

  async logout(): Promise<void> {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ecotrack_auth_token");
      window.localStorage.removeItem("ecotrack_auth_user");
    }
  },
};

export const authService = authApi;
