"use client";

import React, { useState } from "react";
import { Bell, HelpCircle, ChevronDown, Menu, Building2 } from "lucide-react";
import { OrgModal } from "./OrgModal";

interface HeaderProps {
  title: string;
  subtitle: string;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenMobileMenu,
}) => {
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [currentOrg, setCurrentOrg] = useState("Company A");
  const [showOrgRestrictedModal, setShowOrgRestrictedModal] = useState(false);
  const [attemptedOrg, setAttemptedOrg] = useState("");

  const handleOrgSelect = (org: string) => {
    setOrgMenuOpen(false);
    if (org === "Company B") {
      setAttemptedOrg("Company B (Logistics Sub-Tenant)");
      setShowOrgRestrictedModal(true);
    } else {
      setCurrentOrg(org);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-20 h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-8">
        {/* Left: Mobile menu toggle + Page title */}
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#111827] leading-tight">
              {title}
            </h1>
            <p className="text-xs text-[#5F6B61] hidden sm:block">{subtitle}</p>
          </div>
        </div>

        {/* Right: Tenant selector + Notification + User */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Organization Switcher */}
          <div className="relative">
            <button
              onClick={() => setOrgMenuOpen(!orgMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E8E3] bg-[#F9FAFB] hover:bg-[#F3F4F6] text-xs font-semibold text-[#111827] transition-colors cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span className="hidden md:inline text-[#6B7280]">Org:</span>
              <span>{currentOrg}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>

            {orgMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white border border-[#E2E8E3] shadow-lg py-1.5 z-40 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 border-b border-[#F3F4F6]">
                  <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                    Select Tenant Workspace
                  </p>
                </div>
                <button
                  onClick={() => handleOrgSelect("Company A")}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-[#E8F5E9] flex items-center justify-between text-[#111827] font-medium"
                >
                  <span>Company A (Primary)</span>
                  <span className="text-[10px] bg-[#DCFCE7] text-[#16A34A] px-1.5 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                </button>
                <button
                  onClick={() => handleOrgSelect("Company B")}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-[#FEE2E2] flex items-center justify-between text-[#6B7280] hover:text-[#DC2626]"
                >
                  <span>Company B (Restricted)</span>
                  <span className="text-[10px] bg-[#FEE2E2] text-[#DC2626] px-1.5 py-0.5 rounded-full font-semibold">
                    No Access
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Notifications bell */}
          <div className="relative">
            <button
              aria-label="View notifications"
              className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
            >
              <Bell className="w-4.5 h-4.5" />
            </button>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2E7D32] ring-2 ring-white" />
          </div>

          {/* Help icon */}
          <button
            aria-label="Help and documentation"
            className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer hidden sm:flex"
          >
            <HelpCircle className="w-4.5 h-4.5" />
          </button>

          {/* Profile pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E5E7EB]">
            <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center text-xs font-bold text-[#2E7D32] border border-[#C8E6C9]">
              JD
            </div>
          </div>
        </div>
      </header>

      {/* Multi-Tenant Security Modal */}
      <OrgModal
        isOpen={showOrgRestrictedModal}
        onClose={() => setShowOrgRestrictedModal(false)}
        targetOrg={attemptedOrg}
      />
    </>
  );
};
