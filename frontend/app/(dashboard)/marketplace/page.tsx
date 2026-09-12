"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { ProjectCard } from "./_components/ProjectCard";
import { PurchaseModal } from "./_components/PurchaseModal";
import { PurchaseSuccessModal } from "./_components/PurchaseSuccessModal";
import { marketplaceApi } from "@/lib/api/marketplace";
import { MarketplaceProject, PurchaseOrder } from "@/types";
import {
  Search,
  Briefcase,
  Leaf,
  ShieldCheck,
  Coins,
  RotateCcw,
  TreePine,
  Sun,
  Flame,
  Waves,
  Trees,
  Loader2,
  AlertCircle,
  Inbox,
  RefreshCw,
  Database,
} from "lucide-react";

export default function MarketplacePage() {
  const [projects, setProjects] = useState<MarketplaceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryPill, setSelectedCategoryPill] = useState<string>("All");
  const [selectedStandard, setSelectedStandard] = useState<string>("All Standards");

  // Purchase Modal States
  const [selectedProject, setSelectedProject] = useState<MarketplaceProject | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<PurchaseOrder | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const isExternalBackendConfigured = !!process.env.NEXT_PUBLIC_API_BASE_URL;

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await marketplaceApi.getProjects({
        category: selectedCategoryPill,
        standard: selectedStandard,
        search: searchQuery,
      });
      setProjects(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load verified offset projects.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryPill, selectedStandard, searchQuery]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleOpenPurchase = (proj: MarketplaceProject) => {
    setSelectedProject(proj);
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseSuccess = (order: PurchaseOrder) => {
    setIsPurchaseModalOpen(false);
    setCompletedOrder(order);
    setIsSuccessModalOpen(true);
    // Refresh catalog from backend to reflect decremented inventory
    loadProjects();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategoryPill("All");
    setSelectedStandard("All Standards");
  };

  // Dynamic statistics computed from live project data (not hardcoded)
  const { totalAvailableCredits, averagePrice, verifiedProjectsCount } = useMemo(() => {
    const totalAvail = projects.reduce((acc, p) => acc + (p.availableTCO2e || 0), 0);
    const avgPrice = projects.length > 0
      ? (projects.reduce((acc, p) => acc + (p.pricePerTonne || 0), 0) / projects.length).toFixed(2)
      : "0.00";
    return {
      totalAvailableCredits: totalAvail,
      averagePrice: avgPrice,
      verifiedProjectsCount: projects.length,
    };
  }, [projects]);

  const categoryPills: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: "All Projects", value: "All", icon: <Leaf className="w-3.5 h-3.5" /> },
    { label: "Reforestation", value: "Reforestation", icon: <TreePine className="w-3.5 h-3.5" /> },
    { label: "Renewable Energy", value: "Renewable Energy", icon: <Sun className="w-3.5 h-3.5" /> },
    { label: "Forest Conservation", value: "Forest Conservation", icon: <Trees className="w-3.5 h-3.5" /> },
    { label: "Methane Capture", value: "Methane Capture", icon: <Flame className="w-3.5 h-3.5" /> },
    { label: "Clean Cookstoves", value: "Clean Cookstoves", icon: <Flame className="w-3.5 h-3.5" /> },
    { label: "Blue Carbon", value: "Blue Carbon", icon: <Waves className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Offset Marketplace"
        subtitle="Verified carbon projects"
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
                  <strong>LIVE BACKEND:</strong> Marketplace inventory connected to{" "}
                  <code className="font-mono bg-white/70 px-1 py-0.5 rounded">
                    {process.env.NEXT_PUBLIC_API_BASE_URL}
                  </code>
                </>
              ) : (
                <>
                  <strong>DEMO / SEED DATA MODE:</strong> Project catalog served from local prototype
                  store. Not connected to PostgreSQL.
                </>
              )}
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              Offset Marketplace
            </h2>
            <p className="text-sm text-[#5F6B61] mt-0.5">
              Discover verified carbon projects and take meaningful action toward your sustainability goals.
            </p>
          </div>

          <Button
            variant="outline"
            size="md"
            leftIcon={<Briefcase className="w-4 h-4 text-[#2E7D32]" />}
            onClick={() => alert(`Portfolio view: ${totalAvailableCredits.toLocaleString()} tCO₂e currently in active project catalog.`)}
            className="shadow-xs"
          >
            My Offset Portfolio
          </Button>
        </div>

        {/* Reduction Target Notice Banner */}
        <div className="p-4 rounded-2xl bg-[#E8F5E9] border border-[#C8E6C9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-[#1B5E20] font-medium shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#2E7D32] text-white flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4.5 h-4.5" />
            </div>
            <p className="leading-snug">
              Your current reduction target is on track. Explore verified projects to address remaining emissions.
            </p>
          </div>

          <Link
            href="/emissions"
            className="text-xs font-bold text-[#2E7D32] hover:text-[#1B5E20] hover:underline flex items-center gap-1 flex-shrink-0"
          >
            View your emissions →
          </Link>
        </div>

        {/* 3 Summary KPI Cards — Computed dynamically from active project inventory */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {/* Total Available Inventory */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center flex-shrink-0">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#5F6B61] font-medium">Available Registry Inventory</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-extrabold text-[#111827]">
                  {totalAvailableCredits > 0 ? totalAvailableCredits.toLocaleString() : "0"}
                </span>
                <span className="text-xs font-semibold text-[#5F6B61]">tCO₂e</span>
              </div>
              <p className="text-[10px] text-[#879188] mt-0.5">Across verified project pools</p>
            </div>
          </div>

          {/* Active Projects Count */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#5F6B61] font-medium">Active Verified Projects</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-extrabold text-[#111827]">
                  {verifiedProjectsCount}
                </span>
                <span className="text-xs font-semibold text-[#5F6B61]">projects</span>
              </div>
              <p className="text-[10px] text-[#2E7D32] font-semibold mt-0.5">Verra & Gold Standard certified</p>
            </div>
          </div>

          {/* Average Price */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center flex-shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#5F6B61] font-medium">Average Credit Price</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-extrabold text-[#111827]">${averagePrice}</span>
                <span className="text-xs font-semibold text-[#5F6B61]">/ tCO₂e</span>
              </div>
              <p className="text-[10px] text-[#879188] mt-0.5">Transparent market rate</p>
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8E3] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects by name, location..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#E2E8E3] focus:border-[#2E7D32] outline-hidden placeholder:text-[#9CA3AF]"
              />
            </div>

            {/* Standard Dropdown & Reset */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <select
                aria-label="Verification standard filter"
                value={selectedStandard}
                onChange={(e) => setSelectedStandard(e.target.value)}
                className="text-xs font-medium text-[#111827] bg-[#F9FAFB] border border-[#E2E8E3] rounded-xl px-3 py-2 outline-hidden cursor-pointer"
              >
                <option>All Standards</option>
                <option>Verra VCS</option>
                <option>Gold Standard</option>
                <option>American Carbon Registry</option>
              </select>

              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-xs font-semibold text-[#5F6B61] hover:text-[#111827] cursor-pointer transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
            {categoryPills.map((pill) => {
              const isActive = selectedCategoryPill === pill.value;
              return (
                <button
                  key={pill.value}
                  onClick={() => setSelectedCategoryPill(pill.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#2E7D32] text-white shadow-xs"
                      : "bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]"
                  }`}
                >
                  {pill.icon}
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Project Cards Grid / States */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="w-8 h-8 text-[#2E7D32] animate-spin" />
            <p className="text-xs font-medium text-[#5F6B61]">Loading verified carbon projects...</p>
          </div>
        ) : error ? (
          <div className="py-16 px-6 bg-white rounded-2xl border border-[#E2E8E3] text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[#111827]">{error}</p>
            <button
              onClick={loadProjects}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2E7D32] text-white text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 px-6 bg-white rounded-2xl border border-[#E2E8E3] text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#111827]">No projects match your filter criteria.</p>
            <p className="text-xs text-[#5F6B61]">Try adjusting your search query or selected project categories.</p>
            <button
              onClick={handleResetFilters}
              className="mt-2 text-xs font-semibold text-[#2E7D32] hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((proj) => (
              <ProjectCard
                key={proj.id}
                project={proj}
                onPurchase={handleOpenPurchase}
              />
            ))}
          </div>
        )}
      </main>

      {/* Purchase Modal (Inventory Checked on Backend) */}
      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        project={selectedProject}
        onPurchaseSuccess={handlePurchaseSuccess}
      />

      {/* Success Modal */}
      <PurchaseSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        order={completedOrder}
      />
    </div>
  );
}
