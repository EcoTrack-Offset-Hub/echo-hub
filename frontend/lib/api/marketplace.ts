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

export const marketplaceApi = {
  /**
   * GET /api/marketplace
   * Retrieves offset projects catalog
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
   * Retires credits and validates inventory on the server
   */
  async purchaseCredits(projectId: string, quantityTCO2e: number): Promise<PurchaseOrder> {
    const res = await apiClient<PurchaseResult>("/api/marketplace/purchase", {
      method: "POST",
      body: JSON.stringify({ projectId, quantityTCO2e }),
    });
    return res.order;
  },

  async toggleSave(projectId: string): Promise<boolean> {
    // Client-side visual toggle helper
    return true;
  },
};

export const marketplaceService = marketplaceApi;
