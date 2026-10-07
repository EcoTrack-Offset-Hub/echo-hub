import { MarketplaceProject, PurchaseOrder } from "@/types";
import { apiClient } from "./client";

export interface MarketplaceResponseData {
  projects: MarketplaceProject[];
  total: number;
  stats: {
    verifiedProjectsCount: number;
    totalCreditsRetired: string;
    averagePricePerTonne: string;
    activeRegistries: number;
  };
}

export interface PurchaseResult {
  order: PurchaseOrder;
  transaction: unknown;
  updatedProject: MarketplaceProject;
}

export interface PortfolioBreakdownItem {
  projectType: string;
  credits: number;
  amount: number;
}

export interface PortfolioData {
  totalCreditsRetired: number;
  totalInvested: number;
  transactionCount: number;
  projectsSupportedCount: number;
  breakdown: PortfolioBreakdownItem[];
}

export const marketplaceApi = {
  /**
   * GET /api/marketplace
   * Retrieves offset projects catalog from Express + PostgreSQL backend
   */
  async getProjects(filters?: {
    category?: string;
    standard?: string;
    search?: string;
  }): Promise<MarketplaceProject[]> {
    const params = new URLSearchParams();
    if (filters?.category && filters.category !== "All") params.set("category", filters.category);
    if (filters?.standard && filters.standard !== "All Standards") params.set("standard", filters.standard);
    if (filters?.search) params.set("search", filters.search);

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await apiClient<MarketplaceResponseData>(`/api/marketplace${query}`);
    return res.projects;
  },

  /**
   * POST /api/marketplace/purchase
   * Retires credits and validates inventory on Express + PostgreSQL backend
   */
  async purchaseCredits(projectId: string, quantityTCO2e: number): Promise<PurchaseOrder> {
    const res = await apiClient<PurchaseResult>("/api/marketplace/purchase", {
      method: "POST",
      body: JSON.stringify({ projectId, quantityTCO2e }),
    });
    return res.order;
  },

  /**
   * GET /api/marketplace/portfolio
   * Aggregates total offsets, spent capital, and allocations from Express backend
   */
  async getPortfolio(companyId?: string): Promise<PortfolioData> {
    const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
    const res = await apiClient<PortfolioData>(`/api/marketplace/portfolio${query}`);
    return res;
  },

  async toggleSave(projectId: string): Promise<boolean> {
    // Client-side visual toggle helper
    return Boolean(projectId);
  },
};

export const marketplaceService = marketplaceApi;
