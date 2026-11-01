"use client";
import {useRouter} from "next/navigation";
import React, { useState } from "react";
import { Bell, HelpCircle, ChevronDown, Menu, Building2 } from "lucide-react";
import { useAuthSession } from "@/lib/auth/AuthSessionProvider";

interface HeaderProps {
  title: string;
  subtitle: string;
  onOpenMobileMenu?: () => void;
  companyFilter?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onOpenMobileMenu, companyFilter }) => {
  const router=useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const { user, selectedCompanyId, setSelectedCompanyId, companies } = useAuthSession();

  const getCompanyName = (id: string) => {
    if (!id) return "Admin Dashboard";
    const match = companies.find((c) => c.id === id);
    if (match) return match.name;
    if (id === "company-a") return "Company A";
    if (id === "company-b") return "Company B";
    return id;
  };

  const initial = user.role === "ADMIN" ? "AD" : user.email.slice(0, 2).toUpperCase();
  const label = user.role === "ADMIN" ? "Admin" : getCompanyName(selectedCompanyId);

  // List of companies for Admin switcher (use dynamic list or fallback)
  const displayCompanies = companies;

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-8">
      <div className="flex items-center gap-3">
        {(
          <button
            onClick={onOpenMobileMenu || (()=>window.dispatchEvent(new Event("eco-open-sidebar")))}
            className="lg:hidden p-2 text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#111827] leading-tight">{title}</h1>
          <p className="text-xs text-[#5F6B61] hidden sm:block">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        {user.role === "ADMIN" && <div className="relative">
          {companyFilter || (
            <>
              <button
                onClick={() => setOrgMenuOpen(!orgMenuOpen)}
                aria-expanded={orgMenuOpen}
                aria-label="Select dashboard or company workspace"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E8E3] bg-[#F9FAFB] hover:bg-[#F3F4F6] text-xs font-semibold text-[#111827] transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span className="hidden md:inline text-[#6B7280]">Org:</span>
                <span>{getCompanyName(selectedCompanyId)}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
              </button>
              {orgMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-white border border-[#E2E8E3] shadow-lg py-1.5 z-40 max-h-72 overflow-y-auto">
                  <div className="px-3 py-1.5 border-b border-[#F3F4F6]">
                    <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                      Select Workspace
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCompanyId("");
                      setOrgMenuOpen(false);
                      router.push("/dashboard");
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-[#E8F5E9] text-[#111827] font-semibold border-b border-[#F3F4F6]"
                  >
                    Admin Dashboard (All Companies)
                  </button>
                  {displayCompanies.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCompanyId(c.id);
                        setOrgMenuOpen(false);
                        router.push("/dashboard");
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs hover:bg-[#E8F5E9] flex items-center justify-between text-[#111827] font-medium"
                    >
                      <span>{c.name}</span>
                      {c.id === selectedCompanyId && (
                        <span className="text-[10px] bg-[#DCFCE7] text-[#16A34A] px-1.5 py-0.5 rounded-full font-bold">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>}
        <button
          onClick={() => router.push("/notifications")}
          aria-label="View notifications"
          className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
        >
          <Bell className="w-4.5 h-4.5" />
        </button>
        {user.role === "ADMIN" && <button
          onClick={() => router.push("/help")}
          aria-label="Help and documentation"
          title="Administrator guide"
          className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer flex"
        >
          <HelpCircle className="w-4.5 h-4.5" />
        </button>}
        <div
          className="flex items-center gap-2 pl-2 border-l border-[#E5E7EB]"
          title={`${user.email} — ${label}`}
        >
          <button aria-label="Admin profile menu" onClick={()=>setProfileOpen(!profileOpen)} className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center text-xs font-bold text-[#2E7D32] border border-[#C8E6C9]">
            {initial}
          </button>
          {profileOpen && <div className="absolute right-4 top-14 bg-white p-4 rounded-xl border shadow-lg text-xs"><p>{user.email}</p><a href="/settings" className="block mt-3 text-green-700">Account settings</a></div>}
        </div>
      </div>
    </header>
  );
};
