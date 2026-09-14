"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AuthenticatedUser } from "@/types";
import { getAuthenticatedUser, getAuthToken, logout as clearSession } from "./session";

const COMPANY_IDS = ["company-a", "company-b"] as const;
type CompanyId = (typeof COMPANY_IDS)[number];
interface AuthContextValue { user: AuthenticatedUser; selectedCompanyId: CompanyId; setSelectedCompanyId: (id: CompanyId) => void; logout: () => void; }
const AuthContext = createContext<AuthContextValue | null>(null);
const companyKey = "ecotrack_selected_company_id";

function isCompanyId(value: string | null): value is CompanyId { return value === "company-a" || value === "company-b"; }

export function AuthSessionProvider({ children, onInvalidSession }: { children: React.ReactNode; onInvalidSession: () => void }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [selectedCompanyId, setSelectedCompany] = useState<CompanyId>("company-a");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const authenticatedUser = getAuthenticatedUser();
      if (!getAuthToken() || !authenticatedUser) { onInvalidSession(); return; }
      setUser(authenticatedUser);
      const saved = window.localStorage.getItem(companyKey);
      setSelectedCompany(authenticatedUser.role === "COMPANY_USER" ? authenticatedUser.companyId as CompanyId : isCompanyId(saved) ? saved : "company-a");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [onInvalidSession]);
  const value = useMemo<AuthContextValue | null>(() => user ? {
    user, selectedCompanyId,
    setSelectedCompanyId: (id) => { if (user.role === "ADMIN" && isCompanyId(id)) { window.localStorage.setItem(companyKey, id); setSelectedCompany(id); } },
    logout: clearSession,
  } : null, [user, selectedCompanyId]);
  return value ? <AuthContext.Provider value={value}>{children}</AuthContext.Provider> : null;
}
export function useAuthSession(): AuthContextValue { const value = useContext(AuthContext); if (!value) throw new Error("Auth session is unavailable."); return value; }
