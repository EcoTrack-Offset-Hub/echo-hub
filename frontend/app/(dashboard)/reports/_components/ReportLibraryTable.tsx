"use client";

import React from "react";
import { ReportRecord } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { FileText, Download, ShieldCheck, Loader2, AlertCircle, Inbox, RefreshCw } from "lucide-react";

interface ReportLibraryTableProps {
  reports: ReportRecord[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectReport: (report: ReportRecord) => void;
}

export const ReportLibraryTable: React.FC<ReportLibraryTableProps> = ({
  reports,
  isLoading = false,
  error = null,
  onRetry,
  onSelectReport,
}) => {
  const getStatusVariant = (status: ReportRecord["status"]) => {
    switch (status) {
      case "Ready":
        return "success";
      case "Processing":
        return "warning";
      case "Scheduled":
        return "info";
      default:
        return "neutral";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8E3] shadow-xs overflow-hidden flex flex-col justify-between">
      <div>
        {/* Table Title Row */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#F3F4F6]">
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Report Library</h3>
            <p className="text-xs text-[#5F6B61]">Generated and scheduled sustainability reports</p>
          </div>

          <button
            onClick={() => alert("Displaying all reports.")}
            className="text-xs font-semibold text-[#2E7D32] hover:underline cursor-pointer"
          >
            View all ({reports.length}) →
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-14 flex flex-col items-center justify-center space-y-3 text-center">
              <Loader2 className="w-7 h-7 text-[#2E7D32] animate-spin" />
              <p className="text-xs font-medium text-[#5F6B61]">Loading reports library...</p>
            </div>
          ) : error ? (
            <div className="py-12 px-6 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="w-10 h-10 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-[#B91C1C]">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E2E8E3] text-xs font-semibold text-[#111827] hover:bg-[#F9FAFB] shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              )}
            </div>
          ) : reports.length === 0 ? (
            <div className="py-14 px-6 flex flex-col items-center justify-center space-y-2 text-center">
              <div className="w-10 h-10 rounded-full bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center">
                <Inbox className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-[#374151]">No reports match your filters.</p>
              <p className="text-[11px] text-[#6B7280]">
                Click Generate Report to create a custom compliance or emissions export.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs" aria-label="Reports library table">
              <thead>
                <tr className="bg-[#F9FAFB] text-[#6B7280] font-semibold uppercase tracking-wider border-b border-[#E5E7EB]">
                  <th scope="col" className="py-3 px-4">Report Name</th>
                  <th scope="col" className="py-3 px-4">Type</th>
                  <th scope="col" className="py-3 px-4">Period</th>
                  <th scope="col" className="py-3 px-4">Created</th>
                  <th scope="col" className="py-3 px-4">Owner</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onSelectReport(r)}
                    className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-semibold text-[#111827] min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
                        <span className="truncate">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#4B5563] whitespace-nowrap">{r.type}</td>
                    <td className="py-3 px-4 text-[#6B7280] whitespace-nowrap">{r.period}</td>
                    <td className="py-3 px-4 text-[#6B7280] whitespace-nowrap">{r.created}</td>
                    <td className="py-3 px-4 text-[#4B5563] whitespace-nowrap">{r.owner}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant={getStatusVariant(r.status)}>
                        {r.status === "Ready" ? `✓ ${r.status}` : r.status === "Processing" ? `◷ ${r.status}` : `◌ ${r.status}`}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold text-[#2E7D32] hover:underline">
                          {r.status === "Ready" ? "View Report" : r.status === "Processing" ? "View Status" : "View Schedule"}
                        </span>
                        {r.hasDownload && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(`Downloading ${r.name} (${r.fileSize || "PDF"})...`);
                            }}
                            aria-label={`Download ${r.name}`}
                            className="p-1 text-[#6B7280] hover:text-[#2E7D32] cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Audit verification footer banner */}
      <div className="p-3.5 bg-[#F8FAF8] border-t border-[#E2E8E3] flex items-center justify-between text-xs text-[#5F6B61]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
          <span>All reports are generated in accordance with GHG Protocol standards.</span>
        </div>
        <span className="font-semibold text-[#111827]">Audit Ready</span>
      </div>
    </div>
  );
};
