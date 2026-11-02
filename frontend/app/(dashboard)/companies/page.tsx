"use client";
import dynamic from "next/dynamic";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useAuthSession } from "@/lib/auth/AuthSessionProvider";
import { companiesApi } from "@/lib/api/companies";
const EditCompanyModal = dynamic(() => import("./_components/EditCompanyModal").then(module => module.EditCompanyModal));
const ResetPasswordModal = dynamic(() => import("./_components/ResetPasswordModal").then(module => module.ResetPasswordModal));
import {
  Building2,
  Plus,
  ShieldAlert,
  CheckCircle2,
  Mail,
  Lock,
  MoreVertical,
  Pencil,
  KeyRound,
  Power,
  Trash2,
} from "lucide-react";
import { Company } from "@/types";

export default function CompaniesPage() {
  const router = useRouter();
  const { selectedCompanyId, setSelectedCompanyId, companies, refreshCompanies, isAdminWorkspace } = useAuthSession();

  // Registration Modal & Form States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [openActionsCompanyId, setOpenActionsCompanyId] = useState<string | null>(null);
  const [actionsPosition, setActionsPosition] = useState({ top: 0, right: 0, above: false });
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const actionsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState<Company | null>(null);
  const [statusCompany, setStatusCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!openActionsCompanyId) return;
    const close = () => setOpenActionsCompanyId(null);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!actionsMenuRef.current?.contains(target) && !actionsTriggerRef.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        actionsTriggerRef.current?.focus();
      }
    };
    const onScroll = (event: Event) => {
      if (!(event.target instanceof Node) || !actionsMenuRef.current?.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [openActionsCompanyId]);

  useEffect(()=>{const timer=setTimeout(()=>{if(new URLSearchParams(window.location.search).get('register')==='1')setIsRegisterModalOpen(true);},0);return()=>clearTimeout(timer);},[]);
  // If user is not ADMIN, show access restricted view (tenant boundary defense)
  if (!isAdminWorkspace) {
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Companies" subtitle="Tenant administration" />
        <main id="page-content" tabIndex={-1} className="flex-1 p-6 sm:p-12 flex items-center justify-center">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-[#E2E8E3] shadow-sm text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#DC2626]">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-[#111827]">
                Access Restricted: Administrator Clearance Required
              </h3>
              <p className="text-xs text-[#5F6B61] leading-relaxed">
                Company registration and enterprise tenant management are privileged operations reserved exclusively for System Administrators.
              </p>
            </div>
            <div className="pt-2">
              <Button variant="primary" onClick={() => router.push("/dashboard")}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const handleOpenRegister = () => {
    setName("");
    setEmail("");
    setPassword("");
    setFieldErrors({});
    setServerError(null);
    setIsRegisterModalOpen(true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      errors.name = "Company name must be at least 2 characters.";
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "A valid corporate email address is required.";
    }
    if (!password || password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setServerError(null);

    try {
      const response = await companiesApi.registerCompany({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      await refreshCompanies();
      setIsRegisterModalOpen(false);
      setSuccessMessage(
        `Company "${response.company.name}" registered successfully. User account created for ${response.user.email}.`
      );
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to register company. Please try again.";
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!deletingCompany || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await companiesApi.deleteCompany(deletingCompany.id);
      if (selectedCompanyId === deletingCompany.id) {
        setSelectedCompanyId(companies.find((company) => company.id !== deletingCompany.id)?.id || "");
      }
      await refreshCompanies();
      setSuccessMessage(`Company "${deletingCompany.name}" deleted successfully.`);
      setDeletingCompany(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Unable to delete company. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusCompany) return;

    const nextStatus = statusCompany.status === "Inactive" ? "Active" : "Inactive";
    setUpdatingStatus(true);
    try {
      await companiesApi.setStatus(statusCompany.id, nextStatus);
      await refreshCompanies();
      setSuccessMessage(
        nextStatus === "Active"
          ? `Company \"${statusCompany.name}\" reactivated successfully.`
          : `Company \"${statusCompany.name}\" deactivated successfully.`
      );
      setStatusCompany(null);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Unable to update company status.");
      setStatusCompany(null);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Companies" subtitle="Company & Tenant Management" />

      <main id="page-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">

        {/* Success Alert Banner */}
        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="p-3.5 rounded-2xl bg-[#E8F5E9] border border-[#C8E6C9] flex items-center justify-between gap-3 text-xs text-[#1B5E20] font-semibold animate-in fade-in"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-[#2E7D32] hover:text-[#1B5E20] cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Page Header & Register Company Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              Registered Companies
            </h2>
            <p className="text-sm text-[#5F6B61] mt-0.5">
              Admin oversight across tenant workspaces, accounts, and emissions ledgers.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenRegister}
            className="shadow-sm"
          >
            Register Company
          </Button>
        </div>

        {/* Companies Table Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8E3] shadow-xs overflow-hidden">
          <div className="px-6 py-4.5 border-b border-[#F3F4F6] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-[#2E7D32]" />
              <h3 className="text-sm font-bold text-[#111827]">
                Tenant Accounts ({companies.length})
              </h3>
            </div>
            <span className="text-xs text-[#6B7280]">
              Workspace: <strong className="text-[#2E7D32]">{companies.find((c) => c.id === selectedCompanyId)?.name || "Admin"}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Company Name</th>
                  <th className="px-6 py-3.5">Tenant Code</th>
                  <th className="px-6 py-3.5">Primary User Account</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {companies.map((comp) => {
                  const isActive = comp.id === selectedCompanyId;
                  const companyStatus = comp.status || "Active";
                  return (
                    <tr
                      key={comp.id}
                      className={`hover:bg-[#F9FAFB] transition-colors ${
                        isActive ? "bg-[#F0FDF4]/50" : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-semibold text-[#111827]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center font-bold">
                            {comp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-[#111827]">{comp.name}</span>
                            <p className="text-[11px] font-normal text-[#6B7280] mt-1">
                              Monthly limit: {comp.monthlyEmissionsLimit ? `${Number(comp.monthlyEmissionsLimit).toLocaleString(undefined, { maximumFractionDigits: 11 })} tCO₂e` : "Not configured"}
                            </p>
                            {isActive && (
                              <span className="ml-2 text-[10px] bg-[#DCFCE7] text-[#15803D] px-1.5 py-0.5 rounded-full font-bold">
                                Current Active Org
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-[#6B7280]">
                        {comp.tenantCode || "?"}
                      </td>
                      <td className="px-6 py-4 text-[#374151]">
                        {comp.userEmail ? (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-[#6B7280]" />
                            <span>{comp.userEmail}</span>
                          </div>
                        ) : (
                          <span className="text-[#6B7280] italic">Default Tenant User</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={companyStatus === "Active" ? "success" : "warning"}>
                          {companyStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            aria-label={`Actions for ${comp.name}`}
                            aria-expanded={openActionsCompanyId === comp.id}
                            onClick={(event) => {
                              const rect = event.currentTarget.getBoundingClientRect();
                              const above = window.innerHeight - rect.bottom < 184 && rect.top >= 184;
                              actionsTriggerRef.current = event.currentTarget;
                              setActionsPosition({
                                top: above ? rect.top - 4 : rect.bottom + 4,
                                right: Math.max(8, Math.min(window.innerWidth - rect.right, window.innerWidth - 184)),
                                above,
                              });
                              setOpenActionsCompanyId((current) => current === comp.id ? null : comp.id);
                            }}
                            className="p-2 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openActionsCompanyId === comp.id && createPortal(
                            <div
                              ref={actionsMenuRef}
                              style={{ top: actionsPosition.top, right: actionsPosition.right, transform: actionsPosition.above ? "translateY(-100%)" : undefined, maxHeight: actionsPosition.above ? actionsPosition.top - 8 : `calc(100dvh - ${actionsPosition.top + 8}px)` }}
                              className="fixed z-50 w-44 overflow-y-auto rounded-xl border border-[#E2E8E3] bg-white p-1.5 text-left shadow-lg"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCompany(comp);
                                  setOpenActionsCompanyId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#374151] hover:bg-[#F3F4F6] cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit Company
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setResettingPasswordFor(comp);
                                  setOpenActionsCompanyId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#374151] hover:bg-[#F3F4F6] cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                Reset Password
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setStatusCompany(comp);
                                  setOpenActionsCompanyId(null);
                                }}
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer ${
                                  companyStatus === "Active"
                                    ? "text-[#B91C1C] hover:bg-[#FEF2F2]"
                                    : "text-[#166534] hover:bg-[#F0FDF4]"
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                                {companyStatus === "Active" ? "Deactivate Company" : "Reactivate Company"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingCompany(comp);
                                  setDeleteError(null);
                                  setOpenActionsCompanyId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Company
                              </button>
                            </div>,
                            document.body
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {Boolean(editingCompany) && (<EditCompanyModal
        isOpen={Boolean(editingCompany)}
        onClose={() => setEditingCompany(null)}
        company={editingCompany}
        onSuccess={async (_updated, message) => {
          await refreshCompanies();
          setSuccessMessage(message);
        }}
      />)}

      {Boolean(resettingPasswordFor) && (<ResetPasswordModal
        isOpen={Boolean(resettingPasswordFor)}
        onClose={() => setResettingPasswordFor(null)}
        company={resettingPasswordFor}
        onSuccess={(message) => setSuccessMessage(message)}
      />)}

      <Modal
        isOpen={Boolean(statusCompany)}
        onClose={() => !updatingStatus && setStatusCompany(null)}
        title={statusCompany?.status === "Inactive" ? "Reactivate Company" : "Deactivate Company"}
        subtitle={statusCompany?.status === "Inactive" ? "Restore this company account's access." : "Suspend this company account's access."}
        maxWidth="sm"
      >
        <div className="space-y-5 pt-1">
          <p className="text-sm text-[#4B5563]">
            {statusCompany?.status === "Inactive"
              ? `Reactivate ${statusCompany?.name}? Its users will be able to sign in again.`
              : `Deactivate ${statusCompany?.name}? Its users will no longer be able to sign in.`}
          </p>
          <div className="flex justify-end gap-2.5 border-t border-[#E2E8E3] pt-4">
            <Button variant="outline" onClick={() => setStatusCompany(null)} disabled={updatingStatus}>
              Cancel
            </Button>
            <Button
              variant={statusCompany?.status === "Inactive" ? "primary" : "danger"}
              onClick={handleStatusChange}
              isLoading={updatingStatus}
            >
              {statusCompany?.status === "Inactive" ? "Reactivate Company" : "Deactivate Company"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deletingCompany)}
        onClose={() => !deleting && setDeletingCompany(null)}
        title="Delete Company"
        subtitle="Permanently remove this company account."
        maxWidth="sm"
      >
        <div className="space-y-5 pt-1">
          <p className="text-sm text-[#4B5563]">
            Delete <strong>{deletingCompany?.name}</strong>? This permanently removes its user accounts,
            and emissions. Companies with financial or review history must be deactivated instead so their records are retained. This action cannot be undone.
          </p>
          {deleteError && <p role="alert" className="text-sm text-[#B91C1C]">{deleteError}</p>}
          <div className="flex justify-end gap-2.5 border-t border-[#E2E8E3] pt-4">
            <Button variant="outline" onClick={() => setDeletingCompany(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteCompany} isLoading={deleting} disabled={deleting}>
              Delete Company
            </Button>
          </div>
        </div>
      </Modal>

      {/* Register Company Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register New Company"
        subtitle="Create an enterprise tenant organization and its initial company login account"
        maxWidth="md"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-1">
          {serverError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-xs text-[#991B1B] font-semibold"
            >
              {serverError}
            </div>
          )}

          <Input
            label="Company Name"
            placeholder="e.g. Acme EcoCorp Inc."
            value={name}
            onChange={(e) => setName(e.target.value)}
            errorMessage={fieldErrors.name}
            leftIcon={<Building2 className="w-4 h-4" />}
            required
            autoFocus
          />

          <Input
            label="Company User Email"
            type="email"
            placeholder="e.g. manager@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            errorMessage={fieldErrors.email}
            leftIcon={<Mail className="w-4 h-4" />}
            helperText="This email will be used by company staff to log into EcoTrack."
            required
          />

          <Input
            label="Password / Temporary Password"
            type="password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            errorMessage={fieldErrors.password}
            leftIcon={<Lock className="w-4 h-4" />}
            helperText="Securely hashed with scrypt before database persistence."
            required
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E2E8E3]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRegisterModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={submitting}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Register Company
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
