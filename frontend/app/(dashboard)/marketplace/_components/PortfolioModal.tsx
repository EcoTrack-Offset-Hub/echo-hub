"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { marketplaceApi, PortfolioData } from "@/lib/api/marketplace";
import {
  Briefcase,
  Coins,
  ShieldCheck,
  FileCheck,
  Loader2,
  AlertCircle,
  Inbox,
  TrendingUp,
} from "lucide-react";

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
}

interface PortfolioContentProps {
  companyId?: string;
  onClose: () => void;
}

const PortfolioContent: React.FC<PortfolioContentProps> = ({ companyId, onClose }) => {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    marketplaceApi
      .getPortfolio(companyId)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Unable to load company portfolio.";
          setError(msg);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [companyId]);

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 text-center">
          <Loader2 className="w-8 h-8 text-[#2E7D32] animate-spin" />
          <p className="text-xs font-medium text-[#5F6B61]">
            Aggregating verified offset portfolio from database...
          </p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] flex items-center gap-3 text-xs text-[#991B1B]">
          <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : !data || data.transactionCount === 0 ? (
        <div className="py-12 px-6 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#111827]">No Offsets Retired Yet</h4>
          <p className="text-xs text-[#5F6B61] max-w-sm mx-auto">
            Retire carbon credits from the verified marketplace to build your organization&apos;s verified offset portfolio.
          </p>
        </div>
      ) : (
        <>
          {/* 4 Portfolio KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9]">
              <span className="text-[11px] font-semibold text-[#1B5E20] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
                Total Retired
              </span>
              <p className="text-lg font-black text-[#1B5E20] mt-1">
                {data.totalCreditsRetired.toLocaleString()}
                <span className="text-xs font-normal ml-0.5">tCO₂e</span>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
              <span className="text-[11px] font-semibold text-[#166534] flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-[#16A34A]" />
                Total Invested
              </span>
              <p className="text-lg font-black text-[#111827] mt-1">
                ${data.totalInvested.toLocaleString()}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
              <span className="text-[11px] font-semibold text-[#4B5563] flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
                Retirements
              </span>
              <p className="text-lg font-black text-[#111827] mt-1">
                {data.transactionCount}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
              <span className="text-[11px] font-semibold text-[#4B5563] flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-[#2E7D32]" />
                Projects
              </span>
              <p className="text-lg font-black text-[#111827] mt-1">
                {data.projectsSupportedCount}
              </p>
            </div>
          </div>

          {/* Project Category Breakdown */}
          <div className="p-4 rounded-xl bg-white border border-[#E2E8E3] space-y-3">
            <h4 className="text-xs font-bold text-[#374151] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#2E7D32]" />
              Portfolio Allocation by Category
            </h4>

            <div className="space-y-2.5">
              {data.breakdown.map((item) => {
                const pct = data.totalCreditsRetired > 0
                  ? ((item.credits / data.totalCreditsRetired) * 100).toFixed(1)
                  : "0.0";
                return (
                  <div key={item.projectType} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#111827]">{item.projectType}</span>
                      <div className="text-right text-[#5F6B61]">
                        <span className="font-bold text-[#111827]">{item.credits.toLocaleString()} tCO₂e</span>
                        <span className="text-[11px] ml-1.5 font-medium">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#2E7D32] h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end pt-3 border-t border-[#E2E8E3]">
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

export const PortfolioModal: React.FC<PortfolioModalProps> = ({
  isOpen,
  onClose,
  companyId,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="My Offset Portfolio"
      subtitle="Corporate carbon retirement portfolio & impact summary"
      maxWidth="lg"
    >
      {isOpen && (
        <PortfolioContent key={companyId || "default"} companyId={companyId} onClose={onClose} />
      )}
    </Modal>
  );
};

