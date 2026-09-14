"use client";

// Client-side session context for authenticated dashboard pages.
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AuthenticatedUser } from "@/types";
import { getAuthenticatedUser, getAuthToken, logout as clearSession } from "./session";

type CompanyId = "company-a" | "company-b";

interface AuthContextValue {
  user: AuthenticatedUser;
  selectedCompanyId: CompanyId;
  setSelectedCompanyId: (id: CompanyId) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const companyKey = "ecotrack_selected_company_id";

// Only these two demo companies can be selected in the current interface.
function isCompanyId(value: string | null): value is CompanyId {
  return value === "company-a" || value === "company-b";
}

// Loads the saved browser session and makes it available to dashboard components.
export function AuthSessionProvider({
  children,
  onInvalidSession,
}: {
  children: React.ReactNode;
  onInvalidSession: () => void;
}) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [selectedCompanyId, setSelectedCompany] = useState<CompanyId>("company-a");

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
          ? (authenticatedUser.companyId as CompanyId)
          : isCompanyId(savedCompanyId)
            ? savedCompanyId
            : "company-a";
      setSelectedCompany(companyId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [onInvalidSession]);

  // Admins can switch company context; company users stay locked to their own company.
  const value = useMemo<AuthContextValue | null>(() => {
    if (!user) return null;

    return {
      user,
      selectedCompanyId,
      setSelectedCompanyId: (id) => {
        if (user.role === "ADMIN" && isCompanyId(id)) {
          window.localStorage.setItem(companyKey, id);
          setSelectedCompany(id);
        }
      },
      logout: clearSession,
    };
  }, [user, selectedCompanyId]);

  return value ? <AuthContext.Provider value={value}>{children}</AuthContext.Provider> : null;
}

// Convenience hook so pages can read the current user and company context.
export function useAuthSession(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Auth session is unavailable.");
  return value;
}
