"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";
import { CalculationResult } from "@/types";

interface SaveSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: CalculationResult | null;
}

export const SaveSuccessModal: React.FC<SaveSuccessModalProps> = ({
  isOpen,
  onClose,
  calculation,
}) => {
  if (!calculation) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="text-center py-3 space-y-4">
        {/* Success Icon */}
        <div className="w-14 h-14 mx-auto rounded-full bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] flex items-center justify-center shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-[#111827]">
            Emissions Data Saved
          </h3>
          <p className="text-xs text-[#5F6B61] max-w-sm mx-auto">
            Your activity record has been verified and registered into the corporate emissions ledger.
          </p>
        </div>

        {/* Record Chip */}
        <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534] font-medium space-y-1 text-left">
          <p className="font-bold text-[#111827]">{calculation.activity}</p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#2E7D32]">
            <span>{calculation.input} {calculation.unit}</span>
            <span>•</span>
            <span>{calculation.resultKg.toLocaleString("en-US", { minimumFractionDigits: 2 })} kg CO₂e</span>
            <span>•</span>
            <span>{calculation.reportingPeriod}</span>
            <span>•</span>
            <span className="font-bold bg-[#DCFCE7] px-1.5 py-0.5 rounded text-[#166534]">
              ✓ Verified
            </span>
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2 flex justify-center">
          <Button variant="primary" onClick={onClose} className="w-full sm:w-auto px-8">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
