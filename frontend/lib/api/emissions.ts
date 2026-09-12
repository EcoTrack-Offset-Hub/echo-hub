import { CalculationResult, EmissionCalculationInput, EmissionRecord } from "@/types";
import { apiClient } from "./client";

export interface EmissionsResponseData {
  records: EmissionRecord[];
  total: number;
  summary: {
    totalEmissions: string;
    totalUnit: string;
    trend: string;
    scopes: {
      scope1: { value: string; pct: number };
      scope2: { value: string; pct: number };
      scope3: { value: string; pct: number };
    };
  };
}

export interface EmissionCreateResult {
  record: EmissionRecord;
  calculation: CalculationResult;
  totalRecords: number;
}

export const emissionsApi = {
  /**
   * GET /api/emissions
   * Retrieves emissions records and summary KPIs
   */
  async getEmissions(filters?: {
    scope?: string;
    category?: string;
    search?: string;
  }): Promise<EmissionsResponseData> {
    const params = new URLSearchParams();
    if (filters?.scope && filters.scope !== "All Scopes") params.set("scope", filters.scope);
    if (filters?.category && filters.category !== "All Categories") params.set("category", filters.category);
    if (filters?.search) params.set("search", filters.search);

    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient<EmissionsResponseData>(`/api/emissions${query}`);
  },

  /**
   * Alias for backward compatibility
   */
  async getRecords(): Promise<EmissionRecord[]> {
    const data = await this.getEmissions();
    return data.records;
  },

  /**
   * POST /api/emissions/calculate
   * Server calculates transparent GHG Protocol carbon conversion
   * Note: The backend is the single source of truth for carbon calculations.
   */
  async calculate(input: EmissionCalculationInput): Promise<CalculationResult> {
    return apiClient<CalculationResult>("/api/emissions/calculate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /**
   * POST /api/emissions
   * Saves emission activity into the backend database ledger
   */
  async createRecord(
    inputOrCalculation: EmissionCalculationInput | CalculationResult
  ): Promise<EmissionCreateResult> {
    return apiClient<EmissionCreateResult>("/api/emissions", {
      method: "POST",
      body: JSON.stringify(inputOrCalculation),
    });
  },

  /**
   * Backward-compatible addRecord helper
   */
  async addRecord(calc: CalculationResult): Promise<EmissionRecord> {
    const result = await this.createRecord(calc);
    return result.record;
  },
};

// Also export as emissionsService for compatibility
export const emissionsService = emissionsApi;
