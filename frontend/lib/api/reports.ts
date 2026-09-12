import { ReportRecord } from "@/types";
import { apiClient } from "./client";

export interface ReportsResponseData {
  reports: ReportRecord[];
  total: number;
}

export const reportsApi = {
  /**
   * GET /api/reports
   */
  async getReports(filters?: {
    type?: string;
    status?: string;
    search?: string;
  }): Promise<ReportRecord[]> {
    const params = new URLSearchParams();
    if (filters?.type && filters.type !== "All Reports") params.set("type", filters.type);
    if (filters?.status && filters.status !== "All Statuses") params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await apiClient<ReportsResponseData>(`/api/reports${query}`);
    return res.reports;
  },

  /**
   * POST /api/reports
   */
  async generateReport(params: {
    name: string;
    type: ReportRecord["type"];
    period: string;
    summary?: string;
  }): Promise<ReportRecord> {
    return apiClient<ReportRecord>("/api/reports", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
};

export const reportsService = reportsApi;
