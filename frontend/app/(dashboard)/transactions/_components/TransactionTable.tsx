"use client";

import React from "react";
import { TransactionRecord } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { MoreVertical, Loader2, AlertCircle, Inbox, RefreshCw } from "lucide-react";

interface TransactionTableProps {
  transactions: TransactionRecord[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewCertificate: (txn: TransactionRecord) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  isLoading = false,
  error = null,
  onRetry,
  onViewCertificate,
}) => {
  const getStatusVariant = (status: TransactionRecord["status"]) => {
    switch (status) {
      case "Completed":
        return "success";
      case "Processing":
        return "warning";
      case "Needs Review":
        return "danger";
      default:
        return "neutral";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8E3] shadow-xs overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-[#F3F4F6]">
        <div>
          <h3 className="text-sm font-bold text-[#111827]">Recent Transactions</h3>
          <p className="text-xs text-[#5F6B61]">Logged carbon credit purchases and retirements</p>
        </div>

        <span className="text-xs text-[#6B7280]">
          Sort by: <strong className="text-[#111827]">Newest first</strong>
        </span>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="w-7 h-7 text-[#2E7D32] animate-spin" />
            <p className="text-xs font-medium text-[#5F6B61]">Loading transaction ledger...</p>
          </div>
        ) : error ? (
          <div className="py-14 px-6 flex flex-col items-center justify-center space-y-3 text-center">
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
        ) : transactions.length === 0 ? (
          <div className="py-14 px-6 flex flex-col items-center justify-center space-y-2 text-center">
            <div className="w-10 h-10 rounded-full bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#374151]">No transactions recorded yet.</p>
            <p className="text-[11px] text-[#6B7280]">
              Purchased offset retirements from the marketplace will appear here.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs" aria-label="Transaction ledger">
            <thead>
              <tr className="bg-[#F9FAFB] text-[#6B7280] font-semibold uppercase tracking-wider border-b border-[#E5E7EB]">
                <th scope="col" className="py-3 px-4">Date</th>
                <th scope="col" className="py-3 px-4">Transaction ID</th>
                <th scope="col" className="py-3 px-4">Project</th>
                <th scope="col" className="py-3 px-4">Credits (tCO₂e)</th>
                <th scope="col" className="py-3 px-4">Price / tCO₂e</th>
                <th scope="col" className="py-3 px-4">Total Amount</th>
                <th scope="col" className="py-3 px-4">Status</th>
                <th scope="col" className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="py-3.5 px-4 text-[#6B7280] whitespace-nowrap">
                    {txn.date}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-[#111827] whitespace-nowrap">
                    {txn.transactionId}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#111827] min-w-[200px]">
                    <div className="flex items-center gap-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={txn.projectImage}
                        alt={txn.project}
                        className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                      />
                      <span className="truncate">{txn.project}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#111827] whitespace-nowrap">
                    {txn.creditsTCO2e.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-[#4B5563] whitespace-nowrap">
                    ${txn.pricePerTonne.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#111827] whitespace-nowrap">
                    ${txn.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <Badge variant={getStatusVariant(txn.status)}>
                      {txn.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewCertificate(txn)}
                        className="text-xs font-semibold text-[#2E7D32] hover:text-[#1B5E20] hover:underline cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        aria-label="More options"
                        className="p-1 rounded-md text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] cursor-pointer"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
