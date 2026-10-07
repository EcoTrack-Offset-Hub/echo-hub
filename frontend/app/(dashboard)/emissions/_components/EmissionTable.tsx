"use client";

import React, { useState, useMemo } from "react";
import { EmissionRecord } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils/cn";
import {
  AlertCircle,
  RefreshCw,
  Inbox,
  Loader2,
  Search,
  Eye,
  Pencil,
  Trash2,
  Filter,
  AlertTriangle,
} from "lucide-react";

interface EmissionTableProps {
  records: EmissionRecord[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isAdmin?: boolean;
  onViewRecord: (record: EmissionRecord) => void;
  onEditRecord?: (record: EmissionRecord) => void;
  onDeleteRecord?: (record: EmissionRecord) => Promise<void>;
}

function formatDateTime(dateStr?: string): { date: string; time?: string } {
  if (!dateStr) return { date: "—" };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: dateStr };
    const date = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return { date, time };
  } catch {
    return { date: dateStr };
  }
}

export const EmissionTable: React.FC<EmissionTableProps> = ({
  records,
  isLoading = false,
  error = null,
  onRetry,
  isAdmin = false,
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
}) => {
  // Local Table Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("All Scopes");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");

  // Delete Confirmation State
  const [recordToDelete, setRecordToDelete] = useState<EmissionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  // Filter records locally
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (scopeFilter !== "All Scopes" && r.scope !== scopeFilter) return false;
      if (categoryFilter !== "All Categories" && r.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchAct = r.activity.toLowerCase().includes(q);
        const matchFac = (r.facility || "").toLowerCase().includes(q);
        const matchCat = r.category.toLowerCase().includes(q);
        if (!matchAct && !matchFac && !matchCat) return false;
      }
      return true;
    });
  }, [records, scopeFilter, categoryFilter, searchQuery]);

  const handleConfirmDelete = async () => {
    if (!recordToDelete || !onDeleteRecord) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteRecord(recordToDelete);
      setRecordToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to delete emissions record.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8E3] shadow-xs overflow-hidden flex flex-col w-full">
      {/* Table Header Row */}
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F3F4F6]">
        <div>
          <h3 className="text-sm font-bold text-[#111827]">Recent Emissions Records</h3>
          <p className="text-xs text-[#5F6B61]">Logged activities awaiting and completing verification</p>
        </div>

        <div className="text-xs text-[#6B7280]">
          Showing <strong>{filteredRecords.length}</strong> of {records.length} records
        </div>
      </div>

      {/* Search and Table Filters Bar */}
      <div className="p-3.5 sm:px-5 border-b border-[#E2E8E3] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activity or facility..."
              aria-label="Search emissions activities"
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E2E8E3] bg-white focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] outline-hidden placeholder:text-[#9CA3AF] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search query"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF] hover:text-[#4B5563] p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Scope Filter */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8E3] bg-white text-xs">
            <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
            <select
              aria-label="Filter by scope in table"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="bg-transparent font-medium text-[#111827] outline-hidden cursor-pointer"
            >
              <option>All Scopes</option>
              <option>Scope 1</option>
              <option>Scope 2</option>
              <option>Scope 3</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8E3] bg-white text-xs">
            <select
              aria-label="Filter by category in table"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-medium text-[#111827] outline-hidden cursor-pointer"
            >
              <option>All Categories</option>
              <option>Purchased Electricity</option>
              <option>Fleet & Fuel</option>
              <option>Facilities</option>
              <option>Business Travel</option>
              <option>Purchased Goods</option>
              <option>Logistics & Freight</option>
            </select>
          </div>

          {(searchQuery || scopeFilter !== "All Scopes" || categoryFilter !== "All Categories") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setScopeFilter("All Scopes");
                setCategoryFilter("All Categories");
              }}
              className="text-xs text-[#2E7D32] hover:text-[#1B5E20] font-medium cursor-pointer"
            >
              Reset table filters
            </button>
          )}
        </div>
      </div>

      {/* Table Content or State Views */}
      <div className="overflow-x-auto min-w-full">
        {isLoading ? (
          <div className="py-14 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="w-7 h-7 text-[#2E7D32] animate-spin" />
            <p className="text-xs font-medium text-[#5F6B61]">Loading emissions records...</p>
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
            <p className="text-xs font-semibold text-[#374151]">No emissions records yet.</p>
            <p className="text-[11px] text-[#6B7280]">
              Add a new emission activity to populate the authoritative carbon ledger.
            </p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 px-6 flex flex-col items-center justify-center space-y-2 text-center">
            <p className="text-xs font-semibold text-[#374151]">No matching records found.</p>
            <p className="text-[11px] text-[#6B7280]">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs min-w-[850px]" aria-label="Recent emissions records">
            <thead>
              <tr className="bg-[#F9FAFB] text-[#6B7280] font-semibold uppercase tracking-wider border-b border-[#E5E7EB]">
                <th scope="col" className="py-3.5 px-4">Date</th>
                <th scope="col" className="py-3.5 px-4">Activity</th>
                <th scope="col" className="py-3.5 px-4">Scope</th>
                <th scope="col" className="py-3.5 px-4">Category</th>
                <th scope="col" className="py-3.5 px-4">Quantity / Input</th>
                <th scope="col" className="py-3.5 px-4">Facility</th>
                <th scope="col" className="py-3.5 px-4">Emissions</th>
                <th scope="col" className="py-3.5 px-4">Status</th>
                <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredRecords.map((rec) => {
                const dt = formatDateTime(rec.date);
                return (
                  <tr
                    key={rec.id}
                    className={cn(
                      "hover:bg-[#F9FAFB] transition-colors",
                      rec.isNew ? "bg-[#F0FDF4] font-medium animate-in fade-in" : ""
                    )}
                  >
                    {/* Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-[#111827]">{dt.date}</div>
                      {dt.time && <div className="text-[10px] text-[#6B7280]">{dt.time}</div>}
                    </td>

                    {/* Activity */}
                    <td className="py-3.5 px-4 font-semibold text-[#111827] max-w-[220px] truncate" title={rec.activity}>
                      {rec.activity}
                    </td>

                    {/* Scope */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={getScopeVariant(rec.scope)}>
                        {rec.scope}
                      </Badge>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-[#4B5563] whitespace-nowrap">
                      {rec.category}
                    </td>

                    {/* Quantity / Input */}
                    <td className="py-3.5 px-4 text-[#4B5563] whitespace-nowrap font-mono">
                      {rec.quantity}
                    </td>

                    {/* Facility */}
                    <td className="py-3.5 px-4 text-[#4B5563] max-w-[160px] truncate" title={rec.facility || "—"}>
                      {rec.facility || "—"}
                    </td>

                    {/* Emissions */}
                    <td className="py-3.5 px-4 font-bold text-[#111827] whitespace-nowrap">
                      {rec.emissions}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={getStatusVariant(rec.status)}>
                        {rec.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details — Accessible to both Company User and Admin */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewRecord(rec)}
                          leftIcon={<Eye className="w-3.5 h-3.5 text-[#2E7D32]" />}
                          title="View Calculation Details"
                        >
                          View
                        </Button>

                        {/* Edit & Delete — COMPANY USER only */}
                        {!isAdmin && (
                          <>
                            {onEditRecord && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEditRecord(rec)}
                                leftIcon={<Pencil className="w-3.5 h-3.5 text-[#4B5563]" />}
                                title="Edit Emissions Record"
                              >
                                Edit
                              </Button>
                            )}
                            {onDeleteRecord && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRecordToDelete(rec)}
                                className="text-[#DC2626] hover:bg-[#FEE2E2] hover:text-[#B91C1C]"
                                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                title="Delete Emissions Record"
                              >
                                Delete
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <Modal
          isOpen={!!recordToDelete}
          onClose={() => {
            if (!isDeleting) setRecordToDelete(null);
          }}
          title="Delete Emissions Record?"
          subtitle="This action will permanently remove this emissions record. This may affect dashboard and report totals."
          maxWidth="md"
        >
          <div className="space-y-4 pt-1">
            {deleteError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-xs text-[#991B1B] font-semibold"
              >
                {deleteError}
              </div>
            )}

            <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#991B1B]">
                <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
                <span>Confirm Permanent Deletion</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[#374151]">
                <div>
                  <span className="text-[#6B7280]">Activity:</span>{" "}
                  <strong className="text-[#111827]">{recordToDelete.activity}</strong>
                </div>
                <div>
                  <span className="text-[#6B7280]">Emissions:</span>{" "}
                  <strong className="text-[#111827]">{recordToDelete.emissions}</strong>
                </div>
                <div>
                  <span className="text-[#6B7280]">Scope:</span> {recordToDelete.scope}
                </div>
                <div>
                  <span className="text-[#6B7280]">Facility:</span> {recordToDelete.facility || "—"}
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2E8E3]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={isDeleting}
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                leftIcon={!isDeleting ? <Trash2 className="w-4 h-4" /> : undefined}
              >
                {isDeleting ? "Deleting..." : "Delete Record"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

