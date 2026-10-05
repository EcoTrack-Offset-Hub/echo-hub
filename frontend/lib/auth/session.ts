// Browser-only helpers for the signed-in user and token stored after login.
import { AuthenticatedUser, UserRole } from "@/types";

const TOKEN_KEY = "ecotrack_auth_token";
const USER_KEY = "ecotrack_auth_user";

// Validate stored JSON before treating it as an authenticated session.
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

// Read the Bearer token safely; server rendering has no browser storage.
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  return token && token.trim() ? token : null;
}

// Read and validate the stored user so malformed local storage cannot crash the UI.
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

export function getCurrentRole(): UserRole | null {
  return getAuthenticatedUser()?.role ?? null;
}

export function getCurrentCompanyId(): string | null {
  return getAuthenticatedUser()?.companyId ?? null;
}

export function isAdmin(): boolean {
  return getCurrentRole() === "ADMIN";
}

export function isCompanyUser(): boolean {
  return getCurrentRole() === "COMPANY_USER";
}

// Remove all session-related browser data during logout.
export function logout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem("ecotrack_selected_company_id");
}
