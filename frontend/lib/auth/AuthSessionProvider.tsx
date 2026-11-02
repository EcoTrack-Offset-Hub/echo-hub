"use client";

// Client-side session context for authenticated dashboard pages.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { AuthenticatedUser, Company } from "@/types";
import { getAuthenticatedUser, getAuthToken, logout as clearSession } from "./session";
import { companiesApi } from "@/lib/api/companies";

interface AuthContextValue {
  user: AuthenticatedUser;
  selectedCompanyId: string;
  isAdminWorkspace: boolean;
  setSelectedCompanyId: (id: string) => void;
  companies: Company[];
  refreshCompanies: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const companyKey = "ecotrack_selected_company_id";

// Loads the saved browser session and makes it available to dashboard components.
export function AuthSessionProvider({
  children,
  onInvalidSession,
}: {
  children: React.ReactNode;
  onInvalidSession: () => void;
}) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [selectedCompanyId, setSelectedCompany] = useState<string>("");
  const [companies, setCompanies] = useState<Company[]>([]);

  const refreshCompanies = useCallback(async () => {
    try {
      const data = await companiesApi.getCompanies();
      if (Array.isArray(data)) {
        setCompanies(data);
      }
    } catch {
      // Keep the last successfully loaded company list; never fabricate tenants.
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const authenticatedUser = getAuthenticatedUser();
      if (!getAuthToken() || !authenticatedUser) {
        onInvalidSession();
        return;
      }

      setUser(authenticatedUser);
      const savedCompanyId = window.sessionStorage.getItem(companyKey);
      const companyId =
        authenticatedUser.role === "COMPANY_USER"
          ? (authenticatedUser.companyId || "company-a")
          : savedCompanyId || "";
      setSelectedCompany(companyId);

      if (authenticatedUser.role === "ADMIN") {
        void refreshCompanies();
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [onInvalidSession, refreshCompanies]);

  // Admins can switch company context; company users stay locked to their own company.
  const value = useMemo<AuthContextValue | null>(() => {
    if (!user) return null;

    return {
      user,
      selectedCompanyId,
      isAdminWorkspace: user.role === "ADMIN" && !selectedCompanyId,
      setSelectedCompanyId: (id: string) => {
        if (user.role === "ADMIN" && typeof id === "string") {
          window.sessionStorage.setItem(companyKey, id);
          setSelectedCompany(id);
        }
      },
      companies,
      refreshCompanies,
      logout: clearSession,
    };
  }, [user, selectedCompanyId, companies, refreshCompanies]);

  return value ? <AuthContext.Provider value={value}>{children}</AuthContext.Provider> : (
    <main id="page-content" tabIndex={-1} className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAF8]">
      <div className="max-w-sm w-full rounded-2xl border border-[#E2E8E3] bg-white p-6 shadow-sm">
        <p role="status" className="font-semibold text-[#111827]">Loading your workspace...</p>
        <p className="mt-2 text-sm text-[#5F6B61]">Checking your session. Please wait.</p>
      </div>
    </main>
  );
}

// Convenience hook so pages can read the current user and company context.
export function useAuthSession(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Auth session is unavailable.");
  return value;
}
