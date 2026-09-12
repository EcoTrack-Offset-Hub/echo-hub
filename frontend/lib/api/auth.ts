import { apiClient } from "./client";

export interface AuthLoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    organization: string;
  };
  token: string;
}

export const authApi = {
  /**
   * POST /api/auth/login
   */
  async login(email: string, password: string): Promise<{ success: boolean; user?: AuthLoginResponse["user"]; error?: string }> {
    try {
      const res = await apiClient<AuthLoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      return { success: true, user: res.user };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      return { success: false, error: msg };
    }
  },

  async logout(): Promise<void> {
    // Clear session
  },
};

export const authService = authApi;
