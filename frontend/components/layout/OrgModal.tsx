"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ShieldAlert } from "lucide-react";

interface OrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetOrg: string;
}

export const OrgModal: React.FC<OrgModalProps> = ({
  isOpen,
  onClose,
  targetOrg,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="text-center py-4 space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#DC2626]">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-[#111827]">
            Access Restricted: Multi-Tenant Boundary
          </h3>
          <p className="text-sm text-[#5F6B61] max-w-sm mx-auto">
            Your credentials authorize data access for <strong className="text-[#111827]">Company A</strong> only. You do not possess clearance for <strong className="text-[#DC2626]">{targetOrg}</strong>.
          </p>
        </div>
        <div className="bg-[#F8FAF8] p-3.5 rounded-xl border border-[#E2E8E3] text-left text-xs text-[#5F6B61] space-y-1">
          <p className="font-semibold text-[#111827]">Defense Architecture Note:</p>
          <p>
            Frontend navigation is gated by enterprise tenant context. Actual data segregation and query boundaries are enforced at the backend service and database RLS layer.
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <Button variant="primary" onClick={onClose}>
            Acknowledge & Return
          </Button>
        </div>
      </div>
    </Modal>
  );
};
