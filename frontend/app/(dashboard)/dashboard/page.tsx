"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { EmissionsTrendChart } from "@/components/charts/EmissionsTrendChart";
import { dashboardApi, CompanyDashboardData } from "@/lib/api/dashboard";
import { useAuthSession } from "@/lib/auth/AuthSessionProvider";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  FileText,
  BarChart2,
  Flame,
  Zap,
  Truck,
  Check,
  PieChart,
  Calculator,
  Leaf,
  Coins,
  Clock,
  ArrowRight,
  PlusCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  X,
  Info,
} from "lucide-react";

export default function DashboardPage() {
  const { user, selectedCompanyId, companies } = useAuthSession();
  const activeCompanyName =
    companies.find((c) => c.id === selectedCompanyId)?.name ||
    (selectedCompanyId === "company-b" ? "Company B" : "Company A");

  const [selectedPeriod, setSelectedPeriod] = useState("Current Period");
  const [selectedRange, setSelectedRange] = useState<"3M" | "6M" | "12M">("6M");
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [data, setData] = useState<CompanyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardApi.getDashboard(
        selectedPeriod,
        selectedRange,
        user?.role === "ADMIN" ? selectedCompanyId : undefined
      );
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Dashboard data could not be loaded. Try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedRange, selectedCompanyId, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  // Available periods from backend or default standard options
  const periodOptions = data?.availablePeriods?.length
    ? data.availablePeriods
    : [
        { key: "Current Period", label: "Current Period", displayRange: "Oct 1–31, 2026" },
        { key: "September 2026", label: "September 2026", displayRange: "Sep 1–30, 2026" },
        { key: "August 2026", label: "August 2026", displayRange: "Aug 1–31, 2026" },
        { key: "Q2 2026", label: "Q2 2026", displayRange: "Apr 1–Jun 30, 2026" },
        { key: "Q1 2026", label: "Q1 2026", displayRange: "Jan 1–Mar 31, 2026" },
        { key: "Full Year 2025", label: "Full Year 2025", displayRange: "Jan 1–Dec 31, 2025" },
      ];

  const emissions = data?.emissions;
  const scopes = data?.scopes;
  const completeness = data?.dataCompleteness;
  const topSources = data?.topSources || [];
  const calcSummary = data?.calculationSummary;
  const offsets = data?.offsets;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F9FAF9]">
      <Header title="Dashboard" subtitle="Sustainability overview" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto w-full">

        {/* Welcome Section & Period Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
              <span>{user?.role === "ADMIN" ? "Welcome back, Admin" : "Welcome back"}</span>
              {loading && <Loader2 className="w-5 h-5 text-[#2E7D32] animate-spin" />}
            </h2>
            <p className="text-xs sm:text-sm text-[#5F6B61] mt-0.5">
              Here&apos;s {data?.company?.name || activeCompanyName}&apos;s sustainability performance overview.
            </p>
          </div>

          {/* Period Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8E3] text-xs font-semibold text-[#111827] shadow-2xs hover:bg-[#F9FAFB] transition-colors cursor-pointer"
              aria-expanded={periodDropdownOpen}
            >
              <Calendar className="w-4 h-4 text-[#6B7280]" />
              <span>{selectedPeriod}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>

            {periodDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white border border-[#E2E8E3] shadow-lg py-1 z-30">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setSelectedPeriod(opt.key);
                      setPeriodDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer flex flex-col ${
                      selectedPeriod === opt.key
                        ? "bg-[#E8F5E9] text-[#2E7D32] font-bold"
                        : "text-[#111827] hover:bg-[#F3F4F6] font-medium"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="text-[10px] text-[#6B7280] font-normal">{opt.displayRange}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Good News / Notice Banner matching Figma reference */}
        {emissions?.bannerNotice && !bannerDismissed && (
          <div className="p-3.5 px-4 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9] flex items-center justify-between text-xs sm:text-sm text-[#1B5E20] font-medium shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#2E7D32] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Leaf className="w-4 h-4" />
              </div>
              <p className="leading-snug">{emissions.bannerNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="text-[#2E7D32] hover:text-[#1B5E20] p-1 rounded-md transition-colors cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error State */}
        {error && !data && (
          <div className="p-8 rounded-2xl bg-white border border-[#E2E8E3] shadow-xs text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#111827]">Dashboard data could not be loaded</h3>
              <p className="text-xs text-[#5F6B61] max-w-md mx-auto">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2E7D32] text-white text-xs font-semibold hover:bg-[#1B5E20] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !data && !error && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-2xl bg-[#F3F4F6] animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 h-72 rounded-2xl bg-[#F3F4F6] animate-pulse" />
              <div className="lg:col-span-4 h-72 rounded-2xl bg-[#F3F4F6] animate-pulse" />
            </div>
          </div>
        )}

        {/* Main Content Render */}
        {data && (
          <>
            {/* ROW 1: 3 Top Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Current Period Emissions */}
              <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between hover:border-[#CBD5E1] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#374151]">Current Period Emissions</span>
                  <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>

                <div className="my-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-[#111827] tracking-tight">
                      {emissions?.current !== undefined ? emissions.current.toLocaleString() : "0"}
                    </span>
                    <span className="text-xs font-semibold text-[#5F6B61]">tCO₂e</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    {data.period.displayRange || "Current period"}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#F3F4F6] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 font-semibold">
                    {emissions?.percentageChange !== null && emissions?.percentageChange !== undefined ? (
                      emissions.percentageChange <= 0 ? (
                        <span className="text-[#2E7D32] flex items-center gap-0.5">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>{Math.abs(emissions.percentageChange).toFixed(1)}% vs previous period</span>
                        </span>
                      ) : (
                        <span className="text-[#D97706] flex items-center gap-0.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>{emissions.percentageChange.toFixed(1)}% vs previous period</span>
                        </span>
                      )
                    ) : (
                      <span className="text-[#6B7280] font-normal">No previous period available</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[#6B7280] text-[11px]">
                    <FileText className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    <span>Based on {emissions?.recordCount || 0} activity records</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Scope Breakdown */}
              <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between hover:border-[#CBD5E1] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#374151]">Scope Breakdown</span>
                  <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                </div>

                {/* 3 Scope Columns */}
                <div className="grid grid-cols-3 gap-2 my-2 text-center">
                  {/* Scope 1 */}
                  <div className="p-2 rounded-xl bg-[#F8FAF8] border border-[#E8ECE8]">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#5F6B61] mb-1">
                      <Flame className="w-3 h-3 text-[#16A34A]" />
                      <span>Scope 1</span>
                    </div>
                    <p className="text-base font-extrabold text-[#111827]">
                      {scopes?.scope1?.emissions ?? 0}
                    </p>
                    <p className="text-[10px] text-[#6B7280]">tCO₂e</p>
                    <p className="text-[11px] font-semibold text-[#5F6B61] mt-0.5">
                      {scopes?.scope1?.percentage ?? 0}%
                    </p>
                  </div>

                  {/* Scope 2 */}
                  <div className="p-2 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7]">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#166534] mb-1">
                      <Zap className="w-3 h-3 text-[#0284C7]" />
                      <span>Scope 2</span>
                    </div>
                    <p className="text-base font-extrabold text-[#111827]">
                      {scopes?.scope2?.emissions ?? 0}
                    </p>
                    <p className="text-[10px] text-[#6B7280]">tCO₂e</p>
                    <p className="text-[11px] font-bold text-[#2E7D32] mt-0.5">
                      {scopes?.scope2?.percentage ?? 0}%
                    </p>
                  </div>

                  {/* Scope 3 */}
                  <div className="p-2 rounded-xl bg-[#F8FAF8] border border-[#E8ECE8]">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#5F6B61] mb-1">
                      <Truck className="w-3 h-3 text-[#16A34A]" />
                      <span>Scope 3</span>
                    </div>
                    <p className="text-base font-extrabold text-[#111827]">
                      {scopes?.scope3?.emissions ?? 0}
                    </p>
                    <p className="text-[10px] text-[#6B7280]">tCO₂e</p>
                    <p className="text-[11px] font-semibold text-[#5F6B61] mt-0.5">
                      {scopes?.scope3?.percentage ?? 0}%
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F3F4F6] flex items-center gap-1 text-[11px] text-[#5F6B61]">
                  <Info className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>
                    {scopes?.dominantScope
                      ? `${
                          scopes.dominantScope === "Scope 1"
                            ? scopes.scope1.percentage
                            : scopes.dominantScope === "Scope 3"
                            ? scopes.scope3.percentage
                            : scopes.scope2.percentage
                        }% from ${scopes.dominantScope}`
                      : "Aggregated across GHG protocol scopes"}
                  </span>
                </div>
              </div>

              {/* Card 3: Data Completeness */}
              <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between hover:border-[#CBD5E1] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#374151]">Data Completeness</span>
                  <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>

                <div className="my-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-[#111827] tracking-tight">
                      {completeness ? `${completeness.completeRecords}/${completeness.totalRecords}` : "0/0"}
                    </span>
                    <span className="text-xs font-semibold text-[#5F6B61]">records complete</span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
                      <div
                        className="h-full bg-[#2E7D32] rounded-full transition-all duration-500"
                        style={{ width: `${completeness?.completenessPercentage ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[#111827]">
                      {completeness?.completenessPercentage ?? 0}%
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F3F4F6] flex items-center gap-1.5 text-[11px]">
                  {completeness && completeness.isComplete ? (
                    <span className="text-[#2E7D32] font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>{completeness.message}</span>
                    </span>
                  ) : (
                    <span className="text-[#6B7280]">
                      {completeness?.message || "No activity data recorded for this period"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ROW 2: Emissions Trend (8 cols) + Top Sources & Calculation Summary (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Emissions Trend Line Chart (8 cols) */}
              <div className="lg:col-span-8">
                <EmissionsTrendChart
                  className="h-full"
                  data={data.trend}
                  range={selectedRange}
                  onRangeChange={(r) => setSelectedRange(r)}
                  hasEnoughData={data.trendMeta?.hasEnoughData}
                  emptyMessage={data.trendMeta?.emptyMessage}
                />
              </div>

              {/* Right Column (4 cols): Top Sources & How was this calculated */}
              <div className="lg:col-span-4 space-y-5 flex flex-col justify-between">
                {/* Top Emission Sources Card */}
                <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between flex-1">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                    <div>
                      <h3 className="text-sm font-bold text-[#111827]">Top Emission Sources</h3>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
                      <PieChart className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* List of top sources */}
                  <div className="py-3 space-y-3 flex-1 flex flex-col justify-center">
                    {topSources.length > 0 ? (
                      topSources.map((source) => (
                        <div key={source.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-[#374151] truncate max-w-[130px]">
                              {source.rank}. {source.category}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[#111827] font-bold">
                                {source.emissions.toLocaleString()} tCO₂e
                              </span>
                              <span className="text-[#6B7280] text-[11px] w-8 text-right">
                                {source.percentage}%
                              </span>
                            </div>
                          </div>
                          {/* Horizontal progress bar */}
                          <div className="h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                source.percentage > 0 ? "bg-[#2E7D32]" : "bg-[#E5E7EB]"
                              }`}
                              style={{ width: `${Math.max(source.percentage, 2)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#6B7280] text-center py-4">
                        No emission sources recorded for this period.
                      </p>
                    )}
                  </div>
                </div>

                {/* "How was this calculated?" Card */}
                <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F3F4F6]">
                    <h3 className="text-sm font-bold text-[#111827]">How was this calculated?</h3>
                    <div className="w-7 h-7 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
                      <Calculator className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Calculation pill callout matching Figma */}
                  <div className="my-3 p-2.5 rounded-lg bg-[#F8FAF8] border-l-4 border-l-[#2E7D32] border border-[#E2E8E3] text-xs font-mono text-[#111827]">
                    {calcSummary?.primaryCalculation?.formula ? (
                      <p className="leading-relaxed break-words font-medium">
                        {calcSummary.primaryCalculation.formula}
                      </p>
                    ) : (
                      <p className="text-[#6B7280] text-xs font-sans">
                        {calcSummary?.summaryText || "No activity data recorded for this period"}
                      </p>
                    )}
                  </div>

                  <Link
                    href="/emissions"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2E7D32] hover:text-[#1B5E20] hover:underline"
                  >
                    <span>View calculation details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* ROW 3: Carbon Offsets Portfolio (8 cols) + Quick Actions (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Offsets Overview Card (8 cols) */}
              <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                    <div>
                      <h3 className="text-base font-bold text-[#111827]">Carbon Offsets Portfolio</h3>
                      <p className="text-xs text-[#5F6B61]">Track your offset purchases and net emissions</p>
                    </div>
                  </div>

                  {/* 4 Metric Pills horizontally */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4">
                    {/* Gross Emissions */}
                    <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E3]">
                      <div className="flex items-center gap-1.5 text-xs text-[#5F6B61] font-medium mb-1">
                        <div className="w-5 h-5 rounded-md bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
                          <Leaf className="w-3 h-3" />
                        </div>
                        <span>Gross Emissions</span>
                      </div>
                      <p className="text-lg font-extrabold text-[#111827]">
                        {offsets?.grossEmissions !== undefined ? offsets.grossEmissions.toLocaleString() : "0"} tCO₂e
                      </p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">Current period</p>
                    </div>

                    {/* Credits Purchased */}
                    <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E3]">
                      <div className="flex items-center gap-1.5 text-xs text-[#5F6B61] font-medium mb-1">
                        <div className="w-5 h-5 rounded-md bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
                          <Coins className="w-3 h-3" />
                        </div>
                        <span>Credits Purchased</span>
                      </div>
                      <p className="text-lg font-extrabold text-[#111827]">
                        {offsets?.creditsPurchased !== undefined ? offsets.creditsPurchased.toLocaleString() : "0"} tCO₂e
                      </p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">
                        {offsets?.purchasedSubtext || "No purchases yet"}
                      </p>
                    </div>

                    {/* Credits Retired */}
                    <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E3]">
                      <div className="flex items-center gap-1.5 text-xs text-[#5F6B61] font-medium mb-1">
                        <div className="w-5 h-5 rounded-md bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
                          <Clock className="w-3 h-3" />
                        </div>
                        <span>Credits Retired</span>
                      </div>
                      <p className="text-lg font-extrabold text-[#111827]">
                        {offsets?.creditsRetired !== undefined ? offsets.creditsRetired.toLocaleString() : "0"} tCO₂e
                      </p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">
                        {offsets?.retiredSubtext || "No retirements yet"}
                      </p>
                    </div>

                    {/* Net Emissions */}
                    <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E3]">
                      <div className="flex items-center gap-1.5 text-xs text-[#5F6B61] font-medium mb-1">
                        <div className="w-5 h-5 rounded-md bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                          <Leaf className="w-3 h-3" />
                        </div>
                        <span>Net Emissions</span>
                      </div>
                      <p className="text-lg font-extrabold text-[#111827]">
                        {offsets?.netEmissions !== undefined ? offsets.netEmissions.toLocaleString() : "0"} tCO₂e
                      </p>
                      <p className="text-[10px] text-[#16A34A] font-semibold mt-0.5">
                        {offsets?.netSubtext || "Same as gross (no offsets)"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Callout Banner & Action Button matching Figma */}
                <div className="pt-4 mt-4 border-t border-[#F3F4F6] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-[#5F6B61]">
                    <Info className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
                    <span>{offsets?.footerNotice || "Explore verified carbon credits to neutralize your emissions."}</span>
                  </div>
                  <Link
                    href="/marketplace"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Leaf className="w-3.5 h-3.5" />
                    <span>Explore Offset Projects</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Quick Actions (4 cols) matching Figma */}
              <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
                <h3 className="text-sm font-bold text-[#111827] pb-3 border-b border-[#F3F4F6]">
                  Quick Actions
                </h3>

                <div className="space-y-2.5 py-3 flex-1 flex flex-col justify-center">
                  {/* Action 1: Log Activity Data */}
                  <Link
                    href="/emissions"
                    className="p-3 rounded-xl border border-[#E2E8E3] hover:border-[#2E7D32] hover:bg-[#F8FAF8] transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center group-hover:bg-[#2E7D32] group-hover:text-white transition-colors">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111827]">Log Activity Data</p>
                        <p className="text-[11px] text-[#5F6B61]">Add electricity, fuel or travel data</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#2E7D32] transition-colors" />
                  </Link>

                  {/* Action 2: View Calculation Details */}
                  <Link
                    href="/emissions"
                    className="p-3 rounded-xl border border-[#E2E8E3] hover:border-[#0284C7] hover:bg-[#F0F9FF] transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center group-hover:bg-[#0284C7] group-hover:text-white transition-colors">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111827]">View Calculation Details</p>
                        <p className="text-[11px] text-[#5F6B61]">See how your emissions are calculated</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#0284C7] transition-colors" />
                  </Link>

                  {/* Action 3: Explore Offset Projects */}
                  <Link
                    href="/marketplace"
                    className="p-3 rounded-xl border border-[#E2E8E3] hover:border-[#7E22CE] hover:bg-[#FAF5FF] transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F3E8FF] text-[#7E22CE] flex items-center justify-center group-hover:bg-[#7E22CE] group-hover:text-white transition-colors">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111827]">Explore Offset Projects</p>
                        <p className="text-[11px] text-[#5F6B61]">Browse verified carbon credit projects</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#7E22CE] transition-colors" />
                  </Link>

                  {/* Action 4: Generate Report */}
                  <Link
                    href="/reports"
                    className="p-3 rounded-xl border border-[#E2E8E3] hover:border-[#D97706] hover:bg-[#FFFBEB] transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center group-hover:bg-[#D97706] group-hover:text-white transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111827]">Generate Report</p>
                        <p className="text-[11px] text-[#5F6B61]">Export your sustainability data</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#D97706] transition-colors" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
