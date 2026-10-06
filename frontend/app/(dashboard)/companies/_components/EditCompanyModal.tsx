"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Company } from "@/types";
import { companiesApi } from "@/lib/api/companies";
import { Building2, Mail, Lock, AlertCircle } from "lucide-react";

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onSuccess: (updated: Company, message: string) => void;
}

interface EditCompanyFormProps {
  company: Company;
  onClose: () => void;
  onSuccess: (updated: Company, message: string) => void;
}

const EditCompanyForm: React.FC<EditCompanyFormProps> = ({
  company,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(company.name || "");
  const [email, setEmail] = useState(company.userEmail || "");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      errors.name = "Company name must be at least 2 characters.";
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "A valid corporate email is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setServerError(null);

    try {
      const updated = await companiesApi.updateCompany(company.id, {
        name: name.trim(),
        email: email.trim(),
      });
      onSuccess(updated, "Company account updated successfully.");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to update company account.";
      if (msg.includes("already registered")) {
        setFieldErrors({ email: "This email is already registered." });
      } else if (msg.includes("already exists")) {
        setFieldErrors({ name: "A company with this name already exists." });
      } else {
        setServerError(msg);
      }
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

      <Input
        label="Company Name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
        }}
        placeholder="e.g. Davao Green Logistics"
        leftIcon={<Building2 className="w-4 h-4 text-[#9CA3AF]" />}
        errorMessage={fieldErrors.name}
        disabled={submitting}
      />

      <Input
        label="Login Email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
        }}
        placeholder="sustainability@davaogreen.com"
        leftIcon={<Mail className="w-4 h-4 text-[#9CA3AF]" />}
        errorMessage={fieldErrors.email}
        disabled={submitting}
        helperText="This email will be required for the company user to log in."
      />

      {/* Read-Only Tenant ID */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[#374151] flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#6B7280]" />
          Tenant ID
        </label>
        <div className="py-2.5 px-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] font-mono text-xs text-[#4B5563]">
          {company.id}
        </div>
        <p className="text-[11px] text-[#879188]">
          Tenant ID cannot be changed. All emissions, transactions, and reports remain tied to this ID.
        </p>
      </div>

      <div className="pt-3 border-t border-[#E2E8E3] flex items-center justify-end gap-2.5">
        <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isLoading={submitting}>
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  isOpen,
  onClose,
  company,
  onSuccess,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Company Account"
      subtitle="Update company organization name and primary login credentials"
      maxWidth="md"
    >
      {isOpen && company && (
        <EditCompanyForm
          key={`${company.id}-${company.name}-${company.userEmail}`}
          company={company}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Modal>
  );
};

