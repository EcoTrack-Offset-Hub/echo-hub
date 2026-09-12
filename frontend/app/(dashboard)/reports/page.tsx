"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ReportLibraryTable } from "./_components/ReportLibraryTable";
import { GenerateReportModal } from "./_components/GenerateReportModal";
import { reportsApi } from "@/lib/api/reports";
import { ReportRecord, ReportType } from "@/types";
import {
  FileText,
  Download,
  Plus,
  Clock,
  Calendar,
  ShieldCheck,
  Search,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTab, setSelectedTab] = useState<ReportType>("All Reports");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [previewReport, setPreviewReport] = useState<ReportRecord | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getReports({
        type: selectedTab,
        status: selectedStatus,
        search: searchQuery,
      });
      setReports(data);
      if (data.length > 0 && !previewReport) {
        setPreviewReport(data[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load reports from server.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedTab, selectedStatus, searchQuery, previewReport]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleReportCreated = (newRep: ReportRecord) => {
    setReports((prev) => [newRep, ...prev]);
    setPreviewReport(newRep);
  };

  const handleReset = () => {
    setSelectedTab("All Reports");
    setSearchQuery("");
    setSelectedStatus("All Statuses");
  };

  const tabs: ReportType[] = ["All Reports", "Emissions", "Sustainability", "Offsets", "Compliance"];
  const isExternalBackendConfigured = !!process.env.NEXT_PUBLIC_API_BASE_URL;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Reports"
        subtitle="Sustainability reporting and compliance"
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
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span>
              {isExternalBackendConfigured ? (
                <>
                  <strong>LIVE BACKEND:</strong> Reports generator connected to{" "}
                  <code className="font-mono bg-white/70 px-1 py-0.5 rounded">
                    {process.env.NEXT_PUBLIC_API_BASE_URL}
                  </code>
                </>
              ) : (
                <>
                  <strong>DEMO / SEED DATA MODE:</strong> Sample reports library. Not connected to
                  PostgreSQL.
                </>
              )}
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              Reports
            </h2>
            <p className="text-sm text-[#5F6B61] mt-0.5">
              Create, review, and export sustainability reports for your organization.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Download className="w-4 h-4 text-[#2E7D32]" />}
              onClick={() => alert("Packaging all verified reports into a secure audit bundle (ZIP)...")}
              className="shadow-xs"
            >
              Export All Reports
            </Button>

            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsGenerateModalOpen(true)}
              className="shadow-xs"
            >
              Generate Report
            </Button>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Total */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F6B61]">Total Reports</span>
              <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#111827]">{reports.length}</span>
              <span className="text-xs font-semibold text-[#5F6B61]">generated</span>
            </div>
            <p className="text-xs text-[#2E7D32] font-semibold">Ready for ESG stakeholders</p>
          </div>

          {/* Ready */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F6B61]">Audit Verified</span>
              <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#111827]">
                {reports.filter((r) => r.status === "Ready").length}
              </span>
              <span className="text-xs font-semibold text-[#5F6B61]">reports</span>
            </div>
            <p className="text-xs text-[#2E7D32] font-semibold">100% GHG Protocol certified</p>
          </div>

          {/* Processing */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F6B61]">In Queue</span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#111827]">
                {reports.filter((r) => r.status === "Processing").length}
              </span>
              <span className="text-xs font-semibold text-[#5F6B61]">processing</span>
            </div>
            <p className="text-xs text-[#6B7280]">Calculating supply chain emissions</p>
          </div>

          {/* Scheduled */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F6B61]">Scheduled</span>
              <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#111827]">
                {reports.filter((r) => r.status === "Scheduled").length}
              </span>
              <span className="text-xs font-semibold text-[#5F6B61]">recurring</span>
            </div>
            <p className="text-xs text-[#2E7D32] font-semibold">Next dispatch: Oct 01, 2026</p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E2E8E3] overflow-x-auto scrollbar-none pb-px text-xs font-semibold">
          {tabs.map((tab) => {
            const isActive = selectedTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`py-2.5 px-4 border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                  isActive
                    ? "border-[#2E7D32] text-[#2E7D32] font-bold"
                    : "border-transparent text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports by title or period..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-[#E2E8E3] focus:border-[#2E7D32] outline-hidden placeholder:text-[#9CA3AF]"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8E3] bg-[#F9FAFB] text-xs">
              <select
                aria-label="Status filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent font-medium text-[#111827] outline-hidden cursor-pointer"
              >
                <option>All Statuses</option>
                <option>Ready</option>
                <option>Processing</option>
                <option>Scheduled</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs font-semibold text-[#5F6B61] hover:text-[#111827] cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset filters</span>
          </button>
        </div>

        {/* Reports Content: 2-column layout with preview panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Table (8 cols) */}
          <div className="lg:col-span-8">
            <ReportLibraryTable
              reports={reports}
              isLoading={loading}
              error={error}
              onRetry={loadReports}
              onSelectReport={(r) => setPreviewReport(r)}
            />
          </div>

          {/* Quick Preview & Compliance Inspector (4 cols) */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between space-y-4">
            {previewReport ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2E7D32]">
                    Report Summary
                  </span>
                  <Badge variant={previewReport.status === "Ready" ? "success" : "warning"}>
                    {previewReport.status}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-base font-bold text-[#111827]">{previewReport.name}</h4>
                  <p className="text-xs text-[#6B7280] mt-0.5">Period: {previewReport.period}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E3] text-xs text-[#4B5563] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Framework:</span>
                    <span className="font-semibold text-[#111827]">GHG Protocol Standard</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Generated by:</span>
                    <span className="font-semibold text-[#111827]">{previewReport.owner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">File Size:</span>
                    <span className="font-semibold text-[#111827]">{previewReport.fileSize || "7.4 MB"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Date:</span>
                    <span className="font-semibold text-[#111827]">{previewReport.created}</span>
                  </div>
                </div>

                <p className="text-xs text-[#5F6B61] leading-relaxed">
                  {previewReport.summary}
                </p>

                <div className="p-3 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9] flex items-center gap-2.5 text-xs text-[#166534]">
                  <Sparkles className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
                  <span>Audit signature digitally sealed & timestamped.</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#6B7280]">
                Select a report from the library to inspect details
              </div>
            )}

            <div className="pt-3 border-t border-[#F3F4F6] space-y-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={() =>
                  previewReport &&
                  alert(`Exporting ${previewReport.name} in PDF and Excel formats...`)
                }
                disabled={!previewReport || previewReport.status !== "Ready"}
              >
                Download Full PDF
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Generate Report Dialog */}
      <GenerateReportModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onCreated={handleReportCreated}
      />
    </div>
  );
}
