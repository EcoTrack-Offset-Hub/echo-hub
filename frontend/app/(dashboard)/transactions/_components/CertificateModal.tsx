"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TransactionRecord } from "@/types";
import { Award, Download, CheckCircle2, ShieldCheck, ExternalLink } from "lucide-react";

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionRecord | null;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  if (!transaction) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Certificate of Retirement"
      subtitle="Public registry serialization and verification certificate"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Certificate Frame */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#F8FAF8] to-[#E8F5E9]/50 border-2 border-[#C8E6C9] relative shadow-inner space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#C8E6C9] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#2E7D32] text-white flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#111827]">
                  EcoTrack Carbon Retirement Certificate
                </h4>
                <p className="text-[11px] text-[#2E7D32] font-semibold">
                  Registry Standard: {transaction.verificationStandard}
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-white border border-[#C8E6C9] text-[#166534]">
              {transaction.certificateId}
            </span>
          </div>

          {/* Statement */}
          <div className="text-center py-2 space-y-1">
            <p className="text-xs text-[#5F6B61]">This document certifies that</p>
            <h3 className="text-lg font-extrabold text-[#111827]">Company A</h3>
            <p className="text-xs text-[#5F6B61]">has permanently retired</p>
            <p className="text-2xl font-black text-[#2E7D32]">
              {transaction.creditsTCO2e.toLocaleString()} tCO₂e
            </p>
            <p className="text-xs font-semibold text-[#111827]">
              from project: {transaction.project}
            </p>
          </div>

          {/* Verification Details Table */}
          <div className="bg-white/80 backdrop-blur-xs rounded-xl border border-[#C8E6C9] p-3 text-xs grid grid-cols-2 gap-2 text-left">
            <div>
              <span className="text-[10px] text-[#6B7280] block">Transaction ID</span>
              <span className="font-mono font-semibold text-[#111827]">
                {transaction.transactionId}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#6B7280] block">Date of Retirement</span>
              <span className="font-medium text-[#111827]">{transaction.date}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#6B7280] block">Total Consideration</span>
              <span className="font-medium text-[#111827]">
                ${transaction.totalAmount.toLocaleString()} USD
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#6B7280] block">Audit Integrity</span>
              <span className="text-[#2E7D32] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Immutable
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          {transaction.registryUrl ? (
            <a
              href={transaction.registryUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-[#2E7D32] hover:underline flex items-center gap-1"
            >
              <span>View on Public Registry</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-xs text-[#6B7280] flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
              Cryptographically verified
            </span>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => alert(`Certificate ${transaction.certificateId} downloaded.`)}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
