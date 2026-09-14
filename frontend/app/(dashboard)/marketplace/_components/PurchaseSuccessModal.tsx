"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { PurchaseOrder } from "@/types";
import { CheckCircle, Award, ArrowRight } from "lucide-react";

interface PurchaseSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
}

export const PurchaseSuccessModal: React.FC<PurchaseSuccessModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  const router = useRouter();

  if (!order) return null;

  const handleNavigateToTransactions = () => {
    onClose();
    router.push("/transactions");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="text-center py-3 space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] flex items-center justify-center shadow-xs">
          <CheckCircle className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[#111827]">
            Carbon Credits Retired
          </h3>
          <p className="text-xs text-[#5F6B61]">
            Your offset purchase has been confirmed and verified on the registry.
          </p>
        </div>

        {/* Certificate Card Preview */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] border border-[#BBF7D0] text-left space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#166534] uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              Retirement Certificate
            </span>
            <span className="text-[10px] font-mono text-[#15803D] bg-white/80 px-2 py-0.5 rounded-md font-semibold">
              {order.certificateId}
            </span>
          </div>

          <div>
            <p className="text-sm font-extrabold text-[#111827]">{order.projectName}</p>
            <p className="text-xs text-[#166534] font-medium">
              Volume: {order.quantityTCO2e.toLocaleString()} tCO₂e • Amount: ${order.total.toLocaleString()}
            </p>
          </div>

          <div className="pt-2 border-t border-[#BBF7D0]/60 flex items-center justify-between text-[11px] text-[#15803D]">
            <span>Date: {order.date}</span>
            <span className="font-bold">Status: Verified & Retired</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleNavigateToTransactions}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            View in Transactions
          </Button>
        </div>
      </div>
    </Modal>
  );
};
