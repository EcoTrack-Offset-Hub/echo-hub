import { apiClient } from "./client";
export interface Activity {
  id: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: string;
}
export interface Attention {
  unknownMonthCount?: number;
  id: string;
  name: string;
  kind: string;
  count: number;
  total: number;
}
export interface AdminData {
  thresholdAlerts?: { id: string; name: string; limit: string; emissions: string; percent: string; status: string }[];
  window: { month: string; months: string[] };
  errors: Record<string, string>;
  summary?: { registered: number; active: number; issues?: number };
  emissions?: {
    records: number;
    total: number;
    weekly: number;
    validated: number;
    review: number;
    incomplete: number;
  };
  trend?: { id: string; name: string; values: number[] }[];
  marketplace?: {
    available: number;
    reserved: number;
    sold: number;
    retired: number;
    total: number;
    active: number;
    standards: string;
    unconfigured: number;
  };
  lowInventory?: {
    id: string;
    name: string;
    available: number;
    threshold: number;
  }[];
  factors?: {
    total: number;
    active: number;
    inactive: number;
    outdated: number;
    undated: number;
  };
  attention?: Attention[];
  activity?: Activity[];
}
export const adminApi = {
  dashboard: (
    month: string,
    range: string,
    companyId: string,
    signal?: AbortSignal,
  ) =>
    apiClient<AdminData>(
      `/api/admin/dashboard?${new URLSearchParams({ month, range, ...(companyId ? { companyId } : {}) })}`,
      { signal },
    ),
};
export function activityHref(a: Activity) {
  return a.entityType === "emission_reviews" ? "/emissions?all=1" : a.entityType === "inventory_adjustments" ? "/admin/projects" : a.entityType === "emission_factor_versions"
    ? "/admin/factors"
    : a.entityType === "offset_projects"
      ? "/admin/projects"
      : a.entityType === "transactions" || a.entityType === "credit_retirements"
        ? "/admin/transactions"
        : a.entityType === "companies" || a.entityType === "users"
          ? "/companies"
          : `/emissions?record=${encodeURIComponent(a.entityId)}`;
}
export function relativeTime(timestamp: string) {
  const seconds = Math.max(
    0,
    (Date.now() - new Date(timestamp).getTime()) / 1000,
  );
  const r = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return seconds < 60
    ? r.format(-Math.floor(seconds), "second")
    : seconds < 3600
      ? r.format(-Math.floor(seconds / 60), "minute")
      : seconds < 86400
        ? r.format(-Math.floor(seconds / 3600), "hour")
        : r.format(-Math.floor(seconds / 86400), "day");
}
