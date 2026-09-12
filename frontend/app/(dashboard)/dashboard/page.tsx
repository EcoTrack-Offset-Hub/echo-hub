"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { EmissionsTrendChart } from "@/components/charts/EmissionsTrendChart";
import { ScopeDonutChart } from "@/components/charts/ScopeDonutChart";
import { ProgressGauge } from "@/components/charts/ProgressGauge";
import { dashboardApi, DashboardSummaryData } from "@/lib/api/dashboard";
import {
  Leaf,
  CloudSun,
  Zap,
  Truck,
  TrendingDown,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronRight,
  Trees,
  FileText,
  Coins,
  PlusCircle,
  Wallet,
  Loader2,
  AlertCircle,
  RefreshCw,
  Info,
  Database,
} from "lucide-react";

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("Current Period");
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isExternalBackendConfigured = !!process.env.NEXT_PUBLIC_API_BASE_URL;

  const kpiIcons = {
    leaf: Leaf,
    cloud: CloudSun,
    bolt: Zap,
    truck: Truck,
  };

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getSummary(selectedPeriod);
      setSummary(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Backend connection unavailable.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Sustainability overview"
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Environment Transparency Banner */}
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            isExternalBackendConfigured
              ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
              : "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 flex-shrink-0" />
            <span>
              {isExternalBackendConfigured ? (
                <>
                  <strong>LIVE BACKEND:</strong> Connected to{" "}
                  <code className="font-mono bg-white/70 px-1 py-0.5 rounded">
                    {process.env.NEXT_PUBLIC_API_BASE_URL}
                  </code>
                </>
              ) : (
                <>
                  <strong>DEMO / SEED DATA MODE:</strong> Local development prototype. Real
                  PostgreSQL backend not connected. Set{" "}
                  <code className="font-mono bg-white/70 px-1 py-0.5 rounded">
                    NEXT_PUBLIC_API_BASE_URL
                  </code>{" "}
                  to connect production PostgreSQL service.
                </>
              )}
            </span>
          </div>
        </div>

        {/* Page Title & Period Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
              <span>Good morning, Jordan</span>
              {loading && <Loader2 className="w-5 h-5 text-[#2E7D32] animate-spin" />}
            </h2>
            <p className="text-sm text-[#5F6B61] mt-0.5">
              Here&apos;s your sustainability performance overview.
            </p>
          </div>

          {/* Period Dropdown */}
          <div className="relative">
            <button
              onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8E3] text-xs font-semibold text-[#111827] shadow-xs hover:bg-[#F9FAFB] transition-colors cursor-pointer"
              aria-expanded={periodDropdownOpen}
            >
              <Calendar className="w-4 h-4 text-[#6B7280]" />
              <span>{selectedPeriod}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>

            {periodDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white border border-[#E2E8E3] shadow-lg py-1 z-20">
                {["Current Period", "Q2 2026", "Q1 2026", "Full Year 2025"].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedPeriod(p);
                      setPeriodDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-[#111827] hover:bg-[#E8F5E9] hover:text-[#2E7D32] font-medium"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error State — Real backend failure without silent fake replacement */}
        {error && !summary && (
          <div className="p-8 rounded-2xl bg-white border border-[#E2E8E3] shadow-xs text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#111827]">
                Unable to load dashboard data
              </h3>
              <p className="text-xs text-[#5F6B61] max-w-md mx-auto">
                Backend connection unavailable. The server at the requested endpoint could not be
                reached or returned an error.
              </p>
            </div>
            <button
              onClick={loadSummary}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2E7D32] text-white text-xs font-semibold hover:bg-[#1B5E20] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Connection
            </button>
          </div>
        )}

        {/* Loading State Skeleton */}
        {loading && !summary && !error && (
          <div className="space-y-6">
            <div className="h-16 rounded-2xl bg-[#F3F4F6] animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 rounded-2xl bg-[#F3F4F6] animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-6 h-72 rounded-2xl bg-[#F3F4F6] animate-pulse" />
              <div className="lg:col-span-3 h-72 rounded-2xl bg-[#F3F4F6] animate-pulse" />
              <div className="lg:col-span-3 h-72 rounded-2xl bg-[#F3F4F6] animate-pulse" />
            </div>
          </div>
        )}

        {/* Real Data Render (When loaded from API) */}
        {summary && (
          <>
            {/* Good News / Status Banner */}
            {summary.bannerNotice && (
              <div className="p-4 rounded-2xl bg-[#E8F5E9] border border-[#C8E6C9] flex items-center gap-3 text-sm text-[#1B5E20] font-medium shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-[#2E7D32] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Leaf className="w-4.5 h-4.5" />
                </div>
                <p className="leading-snug">{summary.bannerNotice}</p>
              </div>
            )}

            {/* 4 Summary KPI Cards */}
            {summary.kpis && summary.kpis.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {summary.kpis.map((kpi) => {
                  const Icon = kpiIcons[kpi.icon as keyof typeof kpiIcons] || Leaf;

                  return (
                    <div
                      key={kpi.label}
                      className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between hover:border-[#CBD5E1] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#5F6B61]">{kpi.label}</span>
                        <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="my-3">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-extrabold text-[#111827] tracking-tight">
                            {kpi.value}
                          </span>
                          <span className="text-xs font-semibold text-[#5F6B61]">{kpi.unit}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-semibold">
                        {kpi.trendDirection === "down" ? (
                          <TrendingDown className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingUp className="w-3.5 h-3.5" />
                        )}
                        <span>{kpi.trend}</span>
                        <span className="text-[#879188] font-normal">{kpi.comparison}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-white border border-[#E2E8E3] text-center">
                <p className="text-sm font-semibold text-[#374151]">
                  No emissions data available for this period.
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  Log activity data to start tracking corporate emissions.
                </p>
              </div>
            )}

            {/* Middle Analytics Section: 3-column layout matching Figma */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Emissions Trend Line Chart (6 cols) */}
              <div className="lg:col-span-6">
                <EmissionsTrendChart className="h-full" />
              </div>

              {/* Scope Donut Chart (3 cols) */}
              <div className="lg:col-span-3">
                <ScopeDonutChart
                  total={summary.kpis?.[0]?.value || "0"}
                  unit="tCO₂e"
                  title="Emissions by Scope"
                  segments={summary.scopeBreakdown || []}
                  className="h-full"
                />
              </div>

              {/* Reduction Target Gauge (3 cols) */}
              <div className="lg:col-span-3">
                <ProgressGauge
                  percentage={summary.reductionProgress?.percentage ?? 0}
                  targetText={summary.reductionProgress?.target || "Target: In setup"}
                  progressText={summary.reductionProgress?.currentProgress || "Awaiting verification"}
                  className="h-full"
                />
              </div>
            </div>

            {/* Bottom Section: Offsets & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Offsets Overview Card (8 cols) */}
              <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6]">
                    <div>
                      <h3 className="text-base font-bold text-[#111827]">
                        Carbon Offsets Portfolio
                      </h3>
                      <p className="text-xs text-[#5F6B61]">
                        Retired credits across verified registries
                      </p>
                    </div>
                    <Link
                      href="/marketplace"
                      className="text-xs font-semibold text-[#2E7D32] hover:text-[#1B5E20] hover:underline flex items-center gap-1"
                    >
                      Explore marketplace <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* 3 Metric Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                    <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E2E8E3]">
                      <p className="text-xs text-[#5F6B61] font-medium">Credits Purchased</p>
                      <p className="text-xl font-extrabold text-[#111827] mt-1">
                        {summary.offsetStatus?.totalCreditsPurchased || "0 tCO₂e"}
                      </p>
                      <span className="text-[11px] text-[#2E7D32] font-semibold">100% Verified</span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E2E8E3]">
                      <p className="text-xs text-[#5F6B61] font-medium">Total Retired</p>
                      <p className="text-xl font-extrabold text-[#2E7D32] mt-1">
                        {summary.offsetStatus?.totalRetired || "0 tCO₂e"}
                      </p>
                      <span className="text-[11px] text-[#5F6B61]">Permanent retirement</span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E2E8E3]">
                      <p className="text-xs text-[#5F6B61] font-medium">Net Emissions</p>
                      <p className="text-xl font-extrabold text-[#111827] mt-1">
                        {summary.offsetStatus?.netEmissions || "--"}
                      </p>
                      <span className="text-[11px] text-[#16A34A] font-semibold">
                        Reconciled in ledger
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick offset banner button */}
                <div className="pt-5 mt-4 border-t border-[#F3F4F6] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-[#4B5563]">
                    <Trees className="w-4 h-4 text-[#2E7D32]" />
                    <span>Support certified reforestation & renewable energy projects</span>
                  </div>
                  <Link
                    href="/marketplace"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    Purchase Offsets
                  </Link>
                </div>
              </div>

              {/* Quick Action Shortcuts (4 cols) */}
              <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
                <h3 className="text-base font-bold text-[#111827] pb-3 border-b border-[#F3F4F6]">
                  Quick Actions
                </h3>

                <div className="space-y-3 py-4 flex-1 flex flex-col justify-center">
                  <Link
                    href="/emissions"
                    className="p-3 rounded-xl border border-[#E2E8E3] hover:border-[#2E7D32] hover:bg-[#F8FAF8] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center group-hover:bg-[#2E7D32] group-hover:text-white transition-colors">
                        <PlusCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111827]">Log Activity Data</p>
                        <p className="text-[11px] text-[#5F6B61]">Add electricity, fuel or travel</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#2E7D32] transition-colors" />
                  </Link>

                  <Link
                    href="/reports"
                    className="p-3 rounded-xl border border-[#E2E8E3] hover:border-[#2E7D32] hover:bg-[#F8FAF8] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center group-hover:bg-[#0284C7] group-hover:text-white transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111827]">Generate ESG Report</p>
                        <p className="text-[11px] text-[#5F6B61]">Export compliance reports</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#0284C7] transition-colors" />
                  </Link>

                  <Link
                    href="/transactions"
                    className="p-3 rounded-xl border border-[#E2E8E3] hover:border-[#2E7D32] hover:bg-[#F8FAF8] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#F3E8FF] text-[#7E22CE] flex items-center justify-center group-hover:bg-[#7E22CE] group-hover:text-white transition-colors">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111827]">View Certificates</p>
                        <p className="text-[11px] text-[#5F6B61]">Official audit registry proofs</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#7E22CE] transition-colors" />
                  </Link>
                </div>

                <p className="text-[11px] text-[#879188] pt-2 border-t border-[#F3F4F6] text-center">
                  All data synchronized with corporate ledger
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
