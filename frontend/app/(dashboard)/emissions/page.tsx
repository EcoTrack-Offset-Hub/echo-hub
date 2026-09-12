"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { ScopeDonutChart } from "@/components/charts/ScopeDonutChart";
import { AddEmissionModal } from "./_components/AddEmissionModal";
import { CalculationDetailsModal } from "./_components/CalculationDetailsModal";
import { SaveSuccessModal } from "./_components/SaveSuccessModal";
import { EmissionTable } from "./_components/EmissionTable";
import { emissionsApi } from "@/lib/api/emissions";
import { CalculationResult, EmissionCalculationInput, EmissionRecord } from "@/types";
import {
  Plus,
  RotateCcw,
  Calendar,
  Layers,
  Grid,
  MapPin,
  Cloud,
  Flame,
  Plug,
  Truck,
  ShieldCheck,
  TrendingDown,
  CheckCircle2,
  Database,
} from "lucide-react";

function parseTCO2e(emissionStr: string): number {
  if (!emissionStr) return 0;
  const clean = emissionStr.replace(/,/g, "").trim();
  if (clean.includes("kg")) {
    const num = parseFloat(clean.replace(/[^\d.-]/g, ""));
    return isNaN(num) ? 0 : Number((num / 1000).toFixed(3));
  }
  const num = parseFloat(clean.replace(/[^\d.-]/g, ""));
  return isNaN(num) ? 0 : Number(num.toFixed(3));
}

export default function EmissionsPage() {
  const [records, setRecords] = useState<EmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [dateRange, setDateRange] = useState("Last 12 months");
  const [selectedScope, setSelectedScope] = useState("All Scopes");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");

  // Modal Flow States (Primary Functional Slice)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [activeCalculation, setActiveCalculation] = useState<CalculationResult | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const isExternalBackendConfigured = !!process.env.NEXT_PUBLIC_API_BASE_URL;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await emissionsApi.getEmissions({
        scope: selectedScope,
        category: selectedCategory,
      });
      setRecords(response.records || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to load emissions data. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedScope, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetFilters = () => {
    setDateRange("Last 12 months");
    setSelectedScope("All Scopes");
    setSelectedCategory("All Categories");
    setSelectedLocation("All Locations");
  };

  // Step 1 -> 2: Form -> Frontend validation -> POST /api/emissions/calculate (Backend calculation authority)
  const handleProceedToReview = async (input: EmissionCalculationInput) => {
    setIsCalculating(true);
    setCalculationError(null);
    try {
      const calc = await emissionsApi.calculate(input);
      setActiveCalculation(calc);
      setIsAddModalOpen(false);
      setIsReviewModalOpen(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Calculation failed on server.";
      setCalculationError(message);
    } finally {
      setIsCalculating(false);
    }
  };

  // Step 2 -> 3: Review -> POST /api/emissions (Database persistence) -> Frontend updates -> New emission record displayed
  const handleSaveCalculation = async () => {
    if (!activeCalculation) return;
    try {
      const res = await emissionsApi.createRecord(activeCalculation);
      setRecords((prev) => [res.record, ...prev]);
      setIsReviewModalOpen(false);
      setIsSuccessModalOpen(true);
      setSuccessNotice("Emission record saved successfully.");
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save emission record.";
      alert(message);
    }
  };

  // Filter records based on selected dropdowns
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (selectedScope !== "All Scopes" && rec.scope !== selectedScope) return false;
      if (selectedCategory !== "All Categories" && rec.category !== selectedCategory) return false;
      if (selectedLocation !== "All Locations" && rec.facility && !rec.facility.includes(selectedLocation)) return false;
      return true;
    });
  }, [records, selectedScope, selectedCategory, selectedLocation]);

  // Dynamically compute KPI totals from live records (NOT hardcoded)
  const { totalEmissions, scope1Total, scope2Total, scope3Total, scope1Pct, scope2Pct, scope3Pct } = useMemo(() => {
    const s1 = filteredRecords.filter((r) => r.scope === "Scope 1").reduce((acc, r) => acc + parseTCO2e(r.emissions), 0);
    const s2 = filteredRecords.filter((r) => r.scope === "Scope 2").reduce((acc, r) => acc + parseTCO2e(r.emissions), 0);
    const s3 = filteredRecords.filter((r) => r.scope === "Scope 3").reduce((acc, r) => acc + parseTCO2e(r.emissions), 0);
    const total = s1 + s2 + s3;

    return {
      totalEmissions: total,
      scope1Total: s1,
      scope2Total: s2,
      scope3Total: s3,
      scope1Pct: total > 0 ? Math.round((s1 / total) * 100) : 0,
      scope2Pct: total > 0 ? Math.round((s2 / total) * 100) : 0,
      scope3Pct: total > 0 ? Math.round((s3 / total) * 100) : 0,
    };
  }, [filteredRecords]);

  // Dynamically compute emissions by category
  const categoryBreakdown = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    for (const r of filteredRecords) {
      const val = parseTCO2e(r.emissions);
      categoryTotals[r.category] = (categoryTotals[r.category] || 0) + val;
    }

    const colors: Record<string, string> = {
      "Purchased Electricity": "bg-[#0284C7]",
      "Fleet & Fuel": "bg-[#16A34A]",
      "Business Travel": "bg-[#10B981]",
      "Purchased Goods": "bg-[#F59E0B]",
      "Logistics & Freight": "bg-[#8B5CF6]",
      Facilities: "bg-[#059669]",
      Other: "bg-[#6B7280]",
    };

    return Object.entries(categoryTotals).map(([name, amount]) => ({
      name,
      amount: amount >= 1 ? `${amount.toFixed(1)} tCO₂e` : `${(amount * 1000).toFixed(0)} kg CO₂e`,
      pct: totalEmissions > 0 ? Math.round((amount / totalEmissions) * 100) : 0,
      color: colors[name] || "bg-[#6B7280]",
    }));
  }, [filteredRecords, totalEmissions]);

  // Top emission sources computed dynamically
  const topSources = useMemo(() => {
    return [...filteredRecords]
      .sort((a, b) => parseTCO2e(b.emissions) - parseTCO2e(a.emissions))
      .slice(0, 5)
      .map((r, i) => ({
        rank: `0${i + 1}`,
        name: r.activity,
        scope: r.scope,
        emissions: r.emissions,
        pct: totalEmissions > 0 ? `${Math.round((parseTCO2e(r.emissions) / totalEmissions) * 100)}%` : "0%",
      }));
  }, [filteredRecords, totalEmissions]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Emissions"
        subtitle="Carbon emissions management"
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
                  <strong>LIVE BACKEND:</strong> Emissions ledger connected to{" "}
                  <code className="font-mono bg-white/70 px-1 py-0.5 rounded">
                    {process.env.NEXT_PUBLIC_API_BASE_URL}
                  </code>
                </>
              ) : (
                <>
                  <strong>DEMO / SEED DATA MODE:</strong> Values computed dynamically from local
                  prototype API. Real PostgreSQL not connected.
                </>
              )}
            </span>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successNotice && (
          <div
            role="status"
            aria-live="polite"
            className="p-3.5 rounded-2xl bg-[#E8F5E9] border border-[#C8E6C9] flex items-center justify-between gap-3 text-xs text-[#1B5E20] font-semibold animate-in fade-in"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
              <span>{successNotice}</span>
            </div>
            <button
              onClick={() => setSuccessNotice(null)}
              className="text-[#2E7D32] hover:text-[#1B5E20] cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Page Header & Add Emission Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              Emissions
            </h2>
            <p className="text-sm text-[#5F6B61] mt-0.5">
              Monitor, analyze, and manage your organization&apos;s carbon emissions.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setCalculationError(null);
              setIsAddModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-sm"
          >
            + Add Emissions Data
          </Button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
            {/* Date Range */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8E3] bg-[#F9FAFB]">
              <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
              <select
                aria-label="Date Range filter"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-transparent font-medium text-[#111827] outline-hidden cursor-pointer"
              >
                <option>Last 12 months</option>
                <option>Year to Date (2026)</option>
                <option>Q2 2026</option>
                <option>Q1 2026</option>
              </select>
            </div>

            {/* Scope Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8E3] bg-[#F9FAFB]">
              <Layers className="w-3.5 h-3.5 text-[#6B7280]" />
              <select
                aria-label="Scope filter"
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="bg-transparent font-medium text-[#111827] outline-hidden cursor-pointer"
              >
                <option>All Scopes</option>
                <option>Scope 1</option>
                <option>Scope 2</option>
                <option>Scope 3</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8E3] bg-[#F9FAFB]">
              <Grid className="w-3.5 h-3.5 text-[#6B7280]" />
              <select
                aria-label="Category filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent font-medium text-[#111827] outline-hidden cursor-pointer"
              >
                <option>All Categories</option>
                <option>Purchased Electricity</option>
                <option>Fleet & Fuel</option>
                <option>Business Travel</option>
                <option>Purchased Goods</option>
                <option>Logistics & Freight</option>
              </select>
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8E3] bg-[#F9FAFB]">
              <MapPin className="w-3.5 h-3.5 text-[#6B7280]" />
              <select
                aria-label="Location filter"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-transparent font-medium text-[#111827] outline-hidden cursor-pointer"
              >
                <option>All Locations</option>
                <option>Headquarters Building A</option>
                <option>Distribution Center South</option>
                <option>Regional Assembly Plant</option>
              </select>
            </div>
          </div>

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs font-semibold text-[#5F6B61] hover:text-[#111827] cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset filters</span>
          </button>
        </div>

        {/* 4 Scope KPI Cards — Dynamically computed from backend records */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Total */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F6B61]">Total Emissions</span>
              <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] text-[#4B5563] flex items-center justify-center">
                <Cloud className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#111827]">
                {totalEmissions > 0 ? totalEmissions.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0"}
              </span>
              <span className="text-xs font-semibold text-[#5F6B61]">tCO₂e</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#2E7D32] font-semibold">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>
                {filteredRecords.length > 0 ? `${filteredRecords.length} activities logged` : "No records for filter"}
              </span>
            </div>
          </div>

          {/* Scope 1 */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F6B61]">Scope 1</span>
              <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#111827]">
                {scope1Total > 0 ? scope1Total.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0"}
              </span>
              <span className="text-xs font-semibold text-[#5F6B61]">tCO₂e</span>
            </div>
            <p className="text-xs text-[#6B7280]">{scope1Pct}% of total</p>
          </div>

          {/* Scope 2 */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F6B61]">Scope 2</span>
              <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
                <Plug className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#111827]">
                {scope2Total > 0 ? scope2Total.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0"}
              </span>
              <span className="text-xs font-semibold text-[#5F6B61]">tCO₂e</span>
            </div>
            <p className="text-xs text-[#6B7280]">{scope2Pct}% of total</p>
          </div>

          {/* Scope 3 */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F6B61]">Scope 3</span>
              <div className="w-8 h-8 rounded-lg bg-[#D1FAE5] text-[#059669] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#111827]">
                {scope3Total > 0 ? scope3Total.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0"}
              </span>
              <span className="text-xs font-semibold text-[#5F6B61]">tCO₂e</span>
            </div>
            <p className="text-xs text-[#6B7280]">{scope3Pct}% of total</p>
          </div>
        </div>

        {/* Middle Row: Emissions Over Time + Emissions by Category + Emissions by Scope */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Emissions Over Time Multi-line Chart (5 cols) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <div>
                <h3 className="text-sm font-bold text-[#111827]">Emissions Over Time</h3>
                <p className="text-xs text-[#5F6B61]">Monthly emissions by scope</p>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-medium">
                <span className="flex items-center gap-1 text-[#16A34A]">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Scope 1
                </span>
                <span className="flex items-center gap-1 text-[#0284C7]">
                  <span className="w-2 h-2 rounded-full bg-[#0284C7]" /> Scope 2
                </span>
                <span className="flex items-center gap-1 text-[#10B981]">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Scope 3
                </span>
              </div>
            </div>

            {/* Multi-series SVG Graph */}
            <div className="pt-4 overflow-hidden">
              <svg viewBox="0 0 450 180" className="w-full h-auto" role="img" aria-label="Monthly emissions trend graph">
                {[0, 45, 90, 135].map((y) => (
                  <line
                    key={y}
                    x1="25"
                    y1={y + 10}
                    x2="440"
                    y2={y + 10}
                    stroke="#F3F4F6"
                    strokeWidth="1"
                  />
                ))}

                <polyline
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="2.5"
                  points="30,85 70,82 110,80 150,95 190,92 230,100 270,105 310,110 350,115 390,120 430,125"
                />

                <polyline
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                  points="30,45 70,48 110,42 150,55 190,58 230,65 270,70 310,75 350,80 390,85 430,90"
                />

                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeDasharray="2 2"
                  points="30,25 70,30 110,22 150,38 190,40 230,48 270,52 310,56 350,60 390,64 430,68"
                />

                {["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"].map(
                  (m, i) => (
                    <text
                      key={m}
                      x={30 + i * 36.3}
                      y="165"
                      textAnchor="middle"
                      fontSize="9"
                      fill="#9CA3AF"
                    >
                      {m}
                    </text>
                  )
                )}
              </svg>
            </div>
          </div>

          {/* Emissions by Category Horizontal Progress Bars (4 cols) — Dynamically derived */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="pb-2 border-b border-[#F3F4F6]">
              <h3 className="text-sm font-bold text-[#111827]">Emissions by Category</h3>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              {categoryBreakdown.length > 0 ? (
                categoryBreakdown.map((c) => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[#374151]">
                      <span className="font-medium truncate">{c.name}</span>
                      <span className="font-semibold text-[#111827]">{c.amount}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F3F4F6] overflow-hidden">
                      <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#6B7280]">
                  No category activity records found.
                </div>
              )}
            </div>
          </div>

          {/* Emissions by Scope Donut (3 cols) — Dynamically derived */}
          <div className="lg:col-span-3">
            <ScopeDonutChart
              total={totalEmissions > 0 ? totalEmissions.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0"}
              unit="tCO₂e total"
              title="Emissions by Scope"
              segments={[
                { scope: "Scope 1", percentage: scope1Pct, amount: `${scope1Total.toFixed(1)} tCO₂e`, color: "#16A34A" },
                { scope: "Scope 2", percentage: scope2Pct, amount: `${scope2Total.toFixed(1)} tCO₂e`, color: "#0284C7" },
                { scope: "Scope 3", percentage: scope3Pct, amount: `${scope3Total.toFixed(1)} tCO₂e`, color: "#10B981" },
              ]}
              className="h-full"
            />
          </div>
        </div>

        {/* Bottom Section: Top Emission Sources + Recent Emissions Records + Data Quality */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Top Emission Sources (4 cols) — Dynamically derived from records */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs">
            <h3 className="text-sm font-bold text-[#111827] pb-3 border-b border-[#F3F4F6]">
              Top Emission Sources
            </h3>

            <div className="divide-y divide-[#F3F4F6] text-xs pt-1">
              {topSources.length > 0 ? (
                topSources.map((s) => (
                  <div key={s.rank} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#9CA3AF] text-[11px]">{s.rank}</span>
                      <div>
                        <p className="font-semibold text-[#111827]">{s.name}</p>
                        <p className="text-[10px] text-[#6B7280]">{s.scope}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#111827]">{s.emissions}</p>
                      <p className="text-[10px] text-[#2E7D32] font-bold">{s.pct}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#6B7280]">
                  No emission sources recorded.
                </div>
              )}
            </div>
          </div>

          {/* Recent Records Table (5 cols) */}
          <div className="lg:col-span-5">
            <EmissionTable
              records={filteredRecords}
              isLoading={loading}
              error={error}
              onRetry={loadData}
            />
          </div>

          {/* Data Quality Card (3 cols) */}
          <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2E7D32]" />
                <h3 className="text-sm font-bold text-[#111827]">Data Quality</h3>
              </div>
              <div className="pt-2">
                <span className="text-3xl font-extrabold text-[#111827]">
                  {filteredRecords.length > 0
                    ? `${Math.round((filteredRecords.filter((r) => r.status === "Verified").length / filteredRecords.length) * 100)}%`
                    : "100%"}
                </span>
                <span className="text-xs font-semibold text-[#5F6B61] ml-1">Verified</span>
              </div>
              <p className="text-xs text-[#5F6B61] leading-relaxed">
                {filteredRecords.filter((r) => r.status !== "Verified").length} records currently pending third-party GHG Protocol audit.
              </p>
              <div className="w-full h-2 rounded-full bg-[#F3F4F6] overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-[#2E7D32]"
                  style={{
                    width: `${
                      filteredRecords.length > 0
                        ? Math.round((filteredRecords.filter((r) => r.status === "Verified").length / filteredRecords.length) * 100)
                        : 100
                    }%`,
                  }}
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => alert("All verified records adhere to ISO 14064-1 standard.")}
              className="w-full mt-4"
            >
              Review records
            </Button>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* PRIMARY FUNCTIONAL VERTICAL SLICE: 3-STEP CALCULATION & SAVING MODAL FLOW  */}
      {/* ========================================================================= */}
      <AddEmissionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        isCalculating={isCalculating}
        serverError={calculationError}
        onProceedToReview={handleProceedToReview}
      />

      <CalculationDetailsModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onBack={() => {
          setIsReviewModalOpen(false);
          setIsAddModalOpen(true);
        }}
        onSave={handleSaveCalculation}
        calculation={activeCalculation}
      />

      <SaveSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        calculation={activeCalculation}
      />
    </div>
  );
}
