"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MarketplaceProject, PurchaseOrder } from "@/types";
import { marketplaceApi } from "@/lib/api/marketplace";
import { ShieldCheck, Plus, Minus, Coins, AlertCircle } from "lucide-react";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: MarketplaceProject | null;
  onPurchaseSuccess: (order: PurchaseOrder) => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  onClose,
  project,
  onPurchaseSuccess,
}) => {
  const [quantity, setQuantity] = useState<number>(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!project) return null;

  const subtotal = Number((quantity * project.pricePerTonne).toFixed(2));
  const serviceFee = Number((subtotal * 0.02).toFixed(2));
  const total = Number((subtotal + serviceFee).toFixed(2));

  const handleIncrement = () => {
    setErrorMessage(null);
    setQuantity((q) => q + 10);
  };

  const handleDecrement = () => {
    setErrorMessage(null);
    setQuantity((q) => Math.max(1, q - 10));
  };

  const handleConfirmPurchase = async () => {
    setErrorMessage(null);
    if (quantity > project.availableTCO2e) {
      setErrorMessage(
        `Requested ${quantity.toLocaleString()} tCO₂e exceeds currently available inventory of ${project.availableTCO2e.toLocaleString()} tCO₂e.`
      );
      return;
    }

    setIsProcessing(true);
    try {
      const order = await marketplaceApi.purchaseCredits(project.id, quantity);
      onPurchaseSuccess(order);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Inventory validation failed on server.";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Purchase Carbon Credits"
      subtitle="Retire verified carbon offsets directly into your corporate registry"
      maxWidth="md"
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] flex items-center gap-2.5 text-xs text-[#991B1B]">
            <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Project Header */}
        <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E3] flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#111827]">{project.name}</h4>
            <p className="text-xs text-[#5F6B61]">
              {project.location} • {project.standard}
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-[#2E7D32]">
              ${project.pricePerTonne.toFixed(2)}
            </span>
            <span className="text-[10px] text-[#6B7280] block">/ tCO₂e</span>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="space-y-2">
          <label htmlFor="purchase-qty-input" className="block text-xs font-semibold text-[#374151]">
            Select Quantity (tCO₂e to retire)
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDecrement}
              aria-label="Decrease quantity"
              className="w-10 h-10 rounded-xl border border-[#E2E8E3] bg-white hover:bg-[#F3F4F6] flex items-center justify-center text-[#4B5563] cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              id="purchase-qty-input"
              type="number"
              min="1"
              max={project.availableTCO2e}
              value={quantity}
              onChange={(e) => {
                setErrorMessage(null);
                setQuantity(Math.max(1, parseInt(e.target.value) || 1));
              }}
              className="flex-1 py-2 px-3 rounded-xl border border-[#E2E8E3] text-center font-extrabold text-base text-[#111827]"
            />

            <button
              type="button"
              onClick={handleIncrement}
              aria-label="Increase quantity"
              className="w-10 h-10 rounded-xl border border-[#E2E8E3] bg-white hover:bg-[#F3F4F6] flex items-center justify-center text-[#4B5563] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Available in registry pool: {project.availableTCO2e.toLocaleString()} tCO₂e
          </p>
        </div>

        {/* Calculation breakdown */}
        <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-2 text-xs">
          <div className="flex justify-between text-[#4B5563]">
            <span>Carbon credits ({quantity} tCO₂e × ${project.pricePerTonne.toFixed(2)})</span>
            <span className="font-semibold text-[#111827]">${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[#4B5563]">
            <span>Registry verification & transfer fee (2%)</span>
            <span className="font-semibold text-[#111827]">${serviceFee.toFixed(2)}</span>
          </div>
          <div className="pt-2 border-t border-[#E5E7EB] flex justify-between text-sm font-bold text-[#111827]">
            <span>Total Amount</span>
            <span className="text-[#2E7D32]">${total.toLocaleString()}</span>
          </div>
        </div>

        {/* Audit note */}
        <div className="p-2.5 rounded-lg bg-[#E8F5E9] border border-[#C8E6C9] flex items-center gap-2 text-[11px] text-[#166534]">
          <ShieldCheck className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
          <span>Credits are permanently serialized and retired with an auditable certificate.</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8E3]">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={isProcessing}
            disabled={isProcessing}
            onClick={handleConfirmPurchase}
            leftIcon={<Coins className="w-4 h-4" />}
          >
            Confirm Purchase (${total.toLocaleString()})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
