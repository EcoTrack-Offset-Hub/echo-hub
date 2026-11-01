import { apiClient } from "./client";
import { logout as clearSession } from "@/lib/auth/session";
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
        window.sessionStorage.removeItem("ecotrack_selected_company_id");
        window.sessionStorage.setItem("ecotrack_auth_token", res.token);
        window.sessionStorage.setItem("ecotrack_auth_user", JSON.stringify(res.user));
      }
      return { success: true, user: res.user };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      return { success: false, error: msg };
    }
  },

  async logout(): Promise<void> {
    clearSession();
  },
};

export const authService = authApi;
