"use client";

// Client-side session context for authenticated dashboard pages.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { AuthenticatedUser, Company } from "@/types";
import { getAuthenticatedUser, getAuthToken, logout as clearSession } from "./session";
import { companiesApi } from "@/lib/api/companies";

const DEFAULT_COMPANIES: Company[] = [
  { id: "company-a", name: "Company A" },
  { id: "company-b", name: "Company B" },
];

interface AuthContextValue {
  user: AuthenticatedUser;
  selectedCompanyId: string;
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
  const [selectedCompanyId, setSelectedCompany] = useState<string>("company-a");
  const [companies, setCompanies] = useState<Company[]>(DEFAULT_COMPANIES);

  const refreshCompanies = useCallback(async () => {
    try {
      const data = await companiesApi.getCompanies();
      if (Array.isArray(data) && data.length > 0) {
        setCompanies(data);
      }
    } catch {
      // Fallback to default companies if unable to fetch
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
      const savedCompanyId = window.localStorage.getItem(companyKey);
      const companyId =
        authenticatedUser.role === "COMPANY_USER"
          ? (authenticatedUser.companyId || "company-a")
          : savedCompanyId || "company-a";
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
      setSelectedCompanyId: (id: string) => {
        if (user.role === "ADMIN" && id && typeof id === "string") {
          window.localStorage.setItem(companyKey, id);
          setSelectedCompany(id);
        }
      },
      companies,
      refreshCompanies,
      logout: clearSession,
    };
  }, [user, selectedCompanyId, companies, refreshCompanies]);

  return value ? <AuthContext.Provider value={value}>{children}</AuthContext.Provider> : null;
}

// Convenience hook so pages can read the current user and company context.
export function useAuthSession(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Auth session is unavailable.");
  return value;
}
