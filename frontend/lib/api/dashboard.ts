import { apiClient } from "./client";

export interface DashboardKPI {
  label: string;
  value: string;
  unit: string;
  trend: string;
  trendDirection: "up" | "down";
  comparison: string;
  icon: string;
  color: string;
}

export interface DashboardSummaryData {
  period: string;
  bannerNotice: string;
  kpis: DashboardKPI[];
  trendSeries: Array<{ month: string; emissions: number }>;
  scopeBreakdown: Array<{ scope: string; percentage: number; amount: number; color: string }>;
  reductionProgress: {
    percentage: number;
    target: string;
    currentProgress: string;
  };
  sustainabilityImpact?: {
    savedKg: string;
    equivalentTrees: number;
    headline: string;
  };
  quickActions?: Array<{ title: string; href: string }>;
  offsetStatus?: {
    totalCreditsPurchased: string;
    totalRetired: string;
    portfolioDiversityScore: string;
    netEmissions: string;
  };
  selectedPeriod?: string;
}

export const dashboardApi = {
  /**
   * GET /api/dashboard
   * Retrieves aggregated dashboard KPI metrics and trends
   */
  async getSummary(period?: string): Promise<DashboardSummaryData> {
    const query = period ? `?period=${encodeURIComponent(period)}` : "";
    return apiClient<DashboardSummaryData>(`/api/dashboard${query}`);
  },
};
