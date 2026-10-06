"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Company } from "@/types";
import { companiesApi } from "@/lib/api/companies";
import { Lock, KeyRound, AlertCircle, Building2, Mail } from "lucide-react";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onSuccess: (message: string) => void;
}

interface ResetPasswordFormProps {
  company: Company;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  company,
  onClose,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!newPassword || newPassword.length < 6) {
      errors.newPassword = "New password must be at least 6 characters.";
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setServerError(null);

    try {
      await companiesApi.resetPassword(company.id, {
        newPassword,
        confirmPassword,
      });
      onSuccess("Password reset successfully.");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to reset company user password.";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      {serverError && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-xs text-[#991B1B] font-semibold flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Company Account Context Box */}
      <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-[#111827] font-semibold">
          <Building2 className="w-4 h-4 text-[#2E7D32]" />
          <span>Company: {company.name}</span>
        </div>
        <div className="flex items-center gap-2 text-[#5F6B61]">
          <Mail className="w-4 h-4 text-[#6B7280]" />
          <span>Login: {company.userEmail || "Primary Company User"}</span>
        </div>
      </div>

      <Input
        label="New Password"
        type="password"
        value={newPassword}
        onChange={(e) => {
          setNewPassword(e.target.value);
          if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: "" }));
        }}
        placeholder="Enter new secure password (min. 6 chars)"
        leftIcon={<Lock className="w-4 h-4 text-[#9CA3AF]" />}
        errorMessage={fieldErrors.newPassword}
        disabled={submitting}
      />

      <Input
        label="Confirm New Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
        }}
        placeholder="Re-enter new password"
        leftIcon={<KeyRound className="w-4 h-4 text-[#9CA3AF]" />}
        errorMessage={fieldErrors.confirmPassword}
        disabled={submitting}
      />

      <div className="pt-3 border-t border-[#E2E8E3] flex items-center justify-end gap-2.5">
        <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isLoading={submitting}>
          Reset Password
        </Button>
      </div>
    </form>
  );
};

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  company,
  onSuccess,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Company User Password"
      subtitle="Update login credentials for primary company administrator"
      maxWidth="md"
    >
      {isOpen && company && (
        <ResetPasswordForm
          key={company.id}
          company={company}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Modal>
  );
};

