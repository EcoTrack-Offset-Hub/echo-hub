"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CalculationResult } from "@/types";
import { ArrowLeft, Check, ShieldCheck, HelpCircle } from "lucide-react";

interface CalculationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onSave: () => Promise<void>;
  calculation: CalculationResult | null;
}

export const CalculationDetailsModal: React.FC<CalculationDetailsModalProps> = ({
  isOpen,
  onClose,
  onBack,
  onSave,
  calculation,
}) => {
  const [isSaving, setIsSaving] = useState(false);

  if (!calculation) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Calculation Review & Transparency"
      subtitle="Auditable conversion breakdown following GHG Protocol Corporate Standards"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Activity Summary Badge */}
        <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E3] flex items-center justify-between">
          <div>
            <p className="text-xs text-[#5F6B61]">Target Activity</p>
            <p className="text-sm font-bold text-[#111827]">{calculation.activity}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
              {calculation.scope}
            </span>
          </div>
        </div>

        {/* Step-by-Step Transparent Pipeline */}
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8E3] p-4.5 space-y-3.5 shadow-2xs">
          <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
            Calculation Logic & Formula
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
              <p className="text-[10px] text-[#6B7280] uppercase">Input</p>
              <p className="text-sm font-bold text-[#111827]">{calculation.input}</p>
              <p className="text-[10px] text-[#5F6B61]">{calculation.unit}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
              <p className="text-[10px] text-[#6B7280] uppercase">Conversion Factor</p>
              <p className="text-sm font-bold text-[#2E7D32]">{calculation.conversionFactor}</p>
              <p className="text-[10px] text-[#5F6B61]">kg CO₂e/{calculation.unit}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
              <p className="text-[10px] text-[#6B7280] uppercase">Calculated Output</p>
              <p className="text-sm font-bold text-[#111827]">
                {calculation.resultKg.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-[#5F6B61]">kg CO₂e</p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#E8F5E9] border border-[#C8E6C9]">
              <p className="text-[10px] text-[#2E7D32] uppercase font-semibold">Tonnage (Metric)</p>
              <p className="text-sm font-bold text-[#2E7D32]">{calculation.resultTonnes}</p>
              <p className="text-[10px] text-[#2E7D32] font-semibold">tCO₂e</p>
            </div>
          </div>

          {/* Mathematical formula line */}
          <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-center font-mono text-xs text-[#166534] font-semibold">
            {calculation.formula}
          </div>
        </div>

        {/* Audit Assumptions & Method */}
        <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs space-y-1 text-[#4B5563]">
          <div className="flex items-center gap-1.5 font-semibold text-[#111827]">
            <HelpCircle className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>Methodology & Audit Assumptions</span>
          </div>
          <p className="leading-relaxed pl-5 text-[#5F6B61]">{calculation.methodology}</p>
          <div className="pl-5 pt-1 text-[11px] text-[#879188] flex items-center justify-between">
            <span>Period: {calculation.reportingPeriod}</span>
            <span>Facility: {calculation.facility}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E2E8E3]">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Edit
          </Button>

          <Button
            type="button"
            variant="primary"
            isLoading={isSaving}
            onClick={handleSave}
            leftIcon={<Check className="w-4 h-4" />}
          >
            Save Data
          </Button>
        </div>
      </div>
    </Modal>
  );
};
