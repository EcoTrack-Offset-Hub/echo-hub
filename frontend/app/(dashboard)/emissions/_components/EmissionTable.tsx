"use client";

import React from "react";
import { EmissionRecord } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { AlertCircle, RefreshCw, Inbox, Loader2 } from "lucide-react";

interface EmissionTableProps {
  records: EmissionRecord[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewAll?: () => void;
}

export const EmissionTable: React.FC<EmissionTableProps> = ({
  records,
  isLoading = false,
  error = null,
  onRetry,
  onViewAll,
}) => {
  const getStatusVariant = (status: EmissionRecord["status"]) => {
    switch (status) {
      case "Verified":
        return "success";
      case "Pending":
        return "warning";
      case "Needs Review":
        return "danger";
      default:
        return "neutral";
    }
  };

  const getScopeVariant = (scope: EmissionRecord["scope"]) => {
    switch (scope) {
      case "Scope 1":
        return "scope1";
      case "Scope 2":
        return "scope2";
      case "Scope 3":
        return "scope3";
      default:
        return "neutral";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8E3] shadow-xs overflow-hidden flex flex-col h-full">
      {/* Table Header Row */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-[#F3F4F6]">
        <div>
          <h3 className="text-sm font-bold text-[#111827]">Recent Emissions Records</h3>
          <p className="text-xs text-[#5F6B61]">Logged activities awaiting and completing verification</p>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-[#2E7D32] hover:text-[#1B5E20] hover:underline cursor-pointer"
          >
            View all →
          </button>
        )}
      </div>

      {/* Table Content or State Views */}
      <div className="overflow-x-auto flex-1">
        {isLoading ? (
          <div className="py-14 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="w-7 h-7 text-[#2E7D32] animate-spin" />
            <p className="text-xs font-medium text-[#5F6B61]">Loading emissions...</p>
          </div>
        ) : error ? (
          <div className="py-12 px-6 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-10 h-10 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#B91C1C]">
                {error || "Unable to load emissions data. Please try again."}
              </p>
              <p className="text-[11px] text-[#78716C]">
                Unable to load emissions data. Please try again.
              </p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E2E8E3] text-xs font-semibold text-[#111827] hover:bg-[#F9FAFB] shadow-xs cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
          </div>
        ) : records.length === 0 ? (
          <div className="py-14 px-6 flex flex-col items-center justify-center space-y-2 text-center">
            <div className="w-10 h-10 rounded-full bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#374151]">No emissions records found.</p>
            <p className="text-[11px] text-[#6B7280]">
              Adjust your filters or add a new emission activity to get started.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs" aria-label="Recent emissions records">
            <thead>
              <tr className="bg-[#F9FAFB] text-[#6B7280] font-semibold uppercase tracking-wider border-b border-[#E5E7EB]">
                <th scope="col" className="py-3 px-4">Date</th>
                <th scope="col" className="py-3 px-4">Activity</th>
                <th scope="col" className="py-3 px-4">Scope</th>
                <th scope="col" className="py-3 px-4">Category</th>
                <th scope="col" className="py-3 px-4">Quantity</th>
                <th scope="col" className="py-3 px-4">Emissions</th>
                <th scope="col" className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {records.map((rec) => (
                <tr
                  key={rec.id}
                  className={cn(
                    "hover:bg-[#F9FAFB] transition-colors",
                    rec.isNew ? "bg-[#F0FDF4] font-medium animate-in fade-in" : ""
                  )}
                >
                  <td className="py-3.5 px-4 text-[#6B7280] whitespace-nowrap">
                    {rec.date}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#111827]">
                    {rec.activity}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <Badge variant={getScopeVariant(rec.scope)}>
                      {rec.scope}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-[#4B5563]">
                    {rec.category}
                  </td>
                  <td className="py-3.5 px-4 text-[#4B5563] whitespace-nowrap">
                    {rec.quantity}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#111827] whitespace-nowrap">
                    {rec.emissions}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <Badge variant={getStatusVariant(rec.status)}>
                      {rec.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
