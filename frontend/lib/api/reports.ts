import { EmissionsReport } from "@/types";
import { apiClient } from "./client";

export const reportsApi = {
  async getEmissionsReport(filters: { companyId?: string; month?: string; year?: string }): Promise<EmissionsReport> {
    const params = new URLSearchParams();
    if (filters.companyId) params.set("companyId", filters.companyId);
    if (filters.month) params.set("month", filters.month);
    if (filters.year) params.set("year", filters.year);
    const query = params.toString();
    return apiClient<EmissionsReport>(`/api/reports${query ? `?${query}` : ""}`);
  },
};
export const reportsService = reportsApi;
