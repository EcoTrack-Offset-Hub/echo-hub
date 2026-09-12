"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ReportRecord } from "@/types";
import { reportsApi } from "@/lib/api/reports";
import { FileText, Download } from "lucide-react";

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (report: ReportRecord) => void;
  onReportGenerated?: (report: ReportRecord) => void;
}

export const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  onReportGenerated,
}) => {
  const [name, setName] = useState("Corporate Sustainability Audit Report");
  const [type, setType] = useState<"Sustainability" | "Emissions" | "Offsets" | "Compliance">("Sustainability");
  const [period, setPeriod] = useState("Q3 2026");
  const [format, setFormat] = useState<"PDF" | "CSV" | "Excel">("PDF");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const newRep = await reportsApi.generateReport({
        name,
        type,
        period,
        summary: `Exported ${type} report for ${period} in ${format} format.`,
      });
      if (onCreated) onCreated(newRep);
      if (onReportGenerated) onReportGenerated(newRep);
      onClose();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Sustainability Report"
      subtitle="Compile and export auditable reports across emissions, offsets, and compliance"
      maxWidth="md"
    >
      <form onSubmit={handleGenerate} className="space-y-4">
        <Input
          label="Report Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Q3 Carbon Emissions Audit"
          required
        />

        <div className="grid grid-cols-2 gap-3.5">
          <Select
            label="Report Category"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            options={[
              { value: "Sustainability", label: "Sustainability Deck" },
              { value: "Emissions", label: "Scope 1–3 Emissions" },
              { value: "Offsets", label: "Offset & Credits Activity" },
              { value: "Compliance", label: "GHG Protocol Inventory" },
            ]}
          />

          <Select
            label="Reporting Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: "Q3 2026", label: "Q3 2026 (Jul–Sep)" },
              { value: "Q2 2026", label: "Q2 2026 (Apr–Jun)" },
              { value: "2026 YTD", label: "2026 Year-to-Date" },
              { value: "2025 Full Year", label: "2025 Full Year" },
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#374151]">
            Export File Format
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {(["PDF", "CSV", "Excel"] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  format === fmt
                    ? "bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]"
                    : "bg-white text-[#4B5563] border-[#E2E8E3] hover:bg-[#F9FAFB]"
                }`}
              >
                {fmt} Document
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E2E8E3] text-xs text-[#5F6B61] space-y-1">
          <p className="font-semibold text-[#111827]">Audit Trail Included</p>
          <p>
            Generated report includes cryptographic ledger timestamps and verified GHG Protocol conversion factors.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8E3]">
          <Button type="button" variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isGenerating}
            disabled={isGenerating}
            leftIcon={<FileText className="w-4 h-4" />}
          >
            Generate & Download
          </Button>
        </div>
      </form>
    </Modal>
  );
};
