import { AuthenticatedUser, UserRole } from "@/types";

const TOKEN_KEY = "ecotrack_auth_token";
const USER_KEY = "ecotrack_auth_user";

function isUserRole(value: unknown): value is UserRole {
  return value === "ADMIN" || value === "COMPANY_USER";
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === "string" && typeof user.email === "string" && isUserRole(user.role)
    && (typeof user.companyId === "string" || user.companyId === null)
    && ((user.role === "ADMIN" && user.companyId === null) || (user.role === "COMPANY_USER" && typeof user.companyId === "string"));
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  return token && token.trim() ? token : null;
}

export function getAuthenticatedUser(): AuthenticatedUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isAuthenticatedUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getCurrentRole(): UserRole | null { return getAuthenticatedUser()?.role ?? null; }
export function getCurrentCompanyId(): string | null { return getAuthenticatedUser()?.companyId ?? null; }
export function isAdmin(): boolean { return getCurrentRole() === "ADMIN"; }
export function isCompanyUser(): boolean { return getCurrentRole() === "COMPANY_USER"; }

export function logout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem("ecotrack_selected_company_id");
}
