import { apiClient } from "./client";

export interface AvailablePeriod {
  key: string;
  label: string;
  displayRange: string;
}

export interface EmissionsData {
  current: number;
  previous: number | null;
  percentageChange: number | null;
  recordCount: number;
  periodStart: string | null;
  periodEnd: string | null;
  periodLabel: string;
  displayRange: string;
  bannerNotice: string | null;
}

export interface ScopeItem {
  emissions: number;
  percentage: number;
}

export interface ScopesData {
  scope1: ScopeItem;
  scope2: ScopeItem;
  scope3: ScopeItem;
  dominantScope: string;
}

export interface IncompleteReason {
  id: string;
  missing: string[];
}

export interface DataCompletenessData {
  totalRecords: number;
  completeRecords: number;
  incompleteRecords: number;
  completenessPercentage: number;
  isComplete: boolean;
  message: string;
  reasons: IncompleteReason[];
}

export interface TrendPoint {
  period: string;
  month: string;
  shortMonth: string;
  emissions: number;
}

export interface TrendMetaData {
  range: string;
  hasEnoughData: boolean;
  emptyMessage: string;
  series: TrendPoint[];
}

export interface TopSourceItem {
  rank: number;
  category: string;
  emissions: number;
  percentage: number;
}

export interface PrimaryCalculation {
  category: string;
  input: string;
  unit: string;
  factor: number;
  factorUnit: string;
  formula: string;
  resultKg: number;
  resultTonnes: number;
  methodology: string;
  standard: string;
}

export interface CalculationSummaryData {
  recordCount: number;
  totalEmissions: number;
  summaryText: string;
  primaryCalculation: PrimaryCalculation | null;
}

export interface OffsetsData {
  grossEmissions: number;
  creditsPurchased: number;
  creditsRetired: number;
  netEmissions: number;
  hasPurchases: boolean;
  purchasedLabel: string;
  purchasedSubtext: string;
  retiredLabel: string;
  retiredSubtext: string;
  netLabel: string;
  netSubtext: string;
  footerNotice: string;
}

export interface CompanyDashboardData {
  company: {
    id: string;
    name: string;
  };
  period: {
    key: string;
    label: string;
    displayRange: string;
    year: number;
    month: number | null;
    start: string | null;
    end: string | null;
  };
  availablePeriods: AvailablePeriod[];
  emissions: EmissionsData;
  scopes: ScopesData;
  dataCompleteness: DataCompletenessData;
  trend: TrendPoint[];
  trendMeta?: TrendMetaData;
  topSources: TopSourceItem[];
  calculationSummary: CalculationSummaryData;
  offsets: OffsetsData;
  // Backward compatibility fields
  summary?: {
    totalEmissionsTonnes: number;
    previousPeriodEmissionsTonnes: number | null;
    changePercent: number | null;
    recordCount: number;
  };
}

export const dashboardApi = {
  async getDashboard(
    period: string = "Current Period",
    range: string = "6M",
    companyId?: string
  ): Promise<CompanyDashboardData> {
    const params = new URLSearchParams();
    if (period) params.set("period", period);
    if (range) params.set("range", range);
    if (companyId) params.set("companyId", companyId);

    return apiClient<CompanyDashboardData>(`/api/dashboard?${params.toString()}`);
  },

  // Backward compatibility method
  async getSummary(period: string = "Current Period", companyId?: string): Promise<CompanyDashboardData> {
    return this.getDashboard(period, "6M", companyId);
  },
};
