"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { TransactionTable } from "./_components/TransactionTable";
import { CertificateModal } from "./_components/CertificateModal";
import { ScopeDonutChart } from "@/components/charts/ScopeDonutChart";
import { transactionsApi } from "@/lib/api/transactions";
import { TransactionRecord } from "@/types";
import {
  Download,
  Plus,
  ShieldCheck,
  Search,
  Calendar,
  Layers,
  Filter,
  RotateCcw,
  Leaf,
  Coins,
  DollarSign,
  Award,
  ChevronRight,
  TrendingUp,
  FileCheck,
  CreditCard,
} from "lucide-react";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [selectedProject, setSelectedProject] = useState("All Projects");
  const [selectedCertificateTxn, setSelectedCertificateTxn] = useState<TransactionRecord | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await transactionsApi.getTransactions({
        status: selectedStatus,
        project: selectedProject,
        search: searchQuery,
      });
      setTransactions(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load audit transaction records.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedProject, searchQuery]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleOpenCertificate = (txn: TransactionRecord) => {
    setSelectedCertificateTxn(txn);
    setIsCertModalOpen(true);
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedStatus("All Statuses");
    setSelectedProject("All Projects");
  };

  // Compute live summary statistics based on current records
  const totalSpend = transactions.reduce((acc, t) => acc + t.totalAmount, 0);
  const totalCreditsRetired = transactions.reduce((acc, t) => acc + t.creditsTCO2e, 0);

  const isExternalBackendConfigured = !!process.env.NEXT_PUBLIC_API_BASE_URL;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Transactions"
        subtitle="Carbon credit transactions & records"
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
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>
              {isExternalBackendConfigured ? (
                <>
                  <strong>LIVE BACKEND:</strong> Transactions ledger connected to{" "}
                  <code className="font-mono bg-white/70 px-1 py-0.5 rounded">
                    {process.env.NEXT_PUBLIC_API_BASE_URL}
                  </code>
                </>
              ) : (
                <>
                  <strong>DEMO / SEED DATA MODE:</strong> Reconciled using local prototype ledger.
                  Not connected to PostgreSQL.
                </>
              )}
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              Transactions
            </h2>
            <p className="text-sm text-[#5F6B61] mt-0.5">
              Track your offset purchases, certificates, payments and audit history.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Download className="w-4 h-4 text-[#2E7D32]" />}
              onClick={() => alert("Exporting transactions ledger to CSV / XLSX...")}
              className="shadow-xs"
            >
              Export
            </Button>

            <Link href="/marketplace">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                className="shadow-xs"
              >
                + New Transaction
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Total Spend */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F6B61]">Total Spend</span>
              <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-[#111827]">
                ${(totalSpend / 1000).toFixed(0)}k
              </span>
              <span className="text-xs font-semibold text-[#5F6B61]">USD total</span>
            </div>
            <p className="text-xs text-[#2E7D32] font-semibold">Across all verified registries</p>
          </div>

          {/* Credits Retired */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F6B61]">Credits Retired</span>
              <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#111827]">
                {totalCreditsRetired.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-[#5F6B61]">tCO₂e</span>
            </div>
            <p className="text-xs text-[#2E7D32] font-semibold">100% Permanently serialized</p>
          </div>

          {/* Active Orders */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F6B61]">Active Ledger Count</span>
              <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#111827]">{transactions.length}</span>
              <span className="text-xs font-semibold text-[#5F6B61]">transactions</span>
            </div>
            <p className="text-xs text-[#6B7280]">Fully reconciled in ledger</p>
          </div>

          {/* Certificates Issued */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F6B61]">Retirement Proofs</span>
              <div className="w-8 h-8 rounded-lg bg-[#F3E8FF] text-[#7E22CE] flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#111827]">
                {transactions.filter((t) => t.certificateId).length}
              </span>
              <span className="text-xs font-semibold text-[#5F6B61]">certificates</span>
            </div>
            <p className="text-xs text-[#2E7D32] font-semibold">Verra & Gold Standard certified</p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transaction ID, project..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-[#E2E8E3] focus:border-[#2E7D32] outline-hidden placeholder:text-[#9CA3AF]"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8E3] bg-[#F9FAFB] text-xs">
              <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
              <select
                aria-label="Status filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent font-medium text-[#111827] outline-hidden cursor-pointer"
              >
                <option>All Statuses</option>
                <option>Completed</option>
                <option>Processing</option>
                <option>Needs Review</option>
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

        {/* Transaction Table */}
        <TransactionTable
          transactions={transactions}
          isLoading={loading}
          error={error}
          onRetry={loadTransactions}
          onViewCertificate={handleOpenCertificate}
        />
      </main>

      {/* Certificate of Retirement Dialog */}
      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        transaction={selectedCertificateTxn}
      />
    </div>
  );
}
