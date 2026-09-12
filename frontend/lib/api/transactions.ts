import { TransactionRecord } from "@/types";
import { apiClient } from "./client";

export interface TransactionsResponseData {
  transactions: TransactionRecord[];
  total: number;
}

export const transactionsApi = {
  /**
   * GET /api/transactions
   * Retrieves transaction ledger
   */
  async getTransactions(filters?: {
    status?: string;
    project?: string;
    search?: string;
  }): Promise<TransactionRecord[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== "All Statuses") params.set("status", filters.status);
    if (filters?.project && filters.project !== "All Projects") params.set("project", filters.project);
    if (filters?.search) params.set("search", filters.search);

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await apiClient<TransactionsResponseData>(`/api/transactions${query}`);
    return res.transactions;
  },
};

export const transactionsService = transactionsApi;
