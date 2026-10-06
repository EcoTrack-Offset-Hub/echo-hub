import { apiClient } from "./client";
import { Company, RegisterCompanyInput, AuthenticatedUser } from "@/types";

export interface RegisterCompanyResponse {
  company: Company;
  user: AuthenticatedUser;
}

export const companiesApi = {
  /**
   * GET /api/companies
   * Retrieves all registered companies (Admin-only)
   */
  async getCompanies(): Promise<Company[]> {
    return apiClient<Company[]>("/api/companies");
  },

  /**
   * POST /api/companies
   * Registers a new company with an initial company user (Admin-only)
   */
  async registerCompany(data: RegisterCompanyInput): Promise<RegisterCompanyResponse> {
    return apiClient<RegisterCompanyResponse>("/api/companies", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * PUT /api/companies/:id
   * Updates company name and/or login email (Admin-only)
   */
  async updateCompany(id: string, data: { name?: string; email?: string }): Promise<Company> {
    return apiClient<Company>(`/api/companies/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * POST /api/companies/:id/reset-password
   * Resets the primary company user's password (Admin-only)
   */
  async resetPassword(
    id: string,
    data: { newPassword: string; confirmPassword: string }
  ): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/api/companies/${encodeURIComponent(id)}/reset-password`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * POST /api/companies/:id/status
   * Activates or deactivates a company account (Admin-only)
   */
  async setStatus(id: string, status: "Active" | "Inactive"): Promise<Company> {
    return apiClient<Company>(`/api/companies/${encodeURIComponent(id)}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },
};

