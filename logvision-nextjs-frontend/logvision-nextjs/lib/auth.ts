<<<<<<< HEAD
export type Role = "user" | "manager" | "admin";
export type SessionUser = { name: string; email: string; role: Role; initials: string; };
const KEY = "logvision_session";
export function roleFromEmail(email: string): Role {
  if (email.includes("admin")) return "admin";
  if (email.includes("manager")) return "manager";
  return "user";
}
export function login(email: string, _password: string): SessionUser {
  const role = roleFromEmail(email);
  const user: SessionUser = { email, role, name: role === "admin" ? "Admin User" : role === "manager" ? "Manager User" : "Analyst User", initials: role === "admin" ? "AD" : role === "manager" ? "MG" : "AN" };
  localStorage.setItem(KEY, JSON.stringify(user));
  localStorage.setItem("logvision_token", "dev-token");
  return user;
}
=======
﻿import {
  getKeycloakUserProfile, getKeycloakUserRole, getKeycloakToken,
  initKeycloak, isKeycloakAuthenticated, loginWithKeycloak, logoutFromKeycloak,
} from "./keycloak";

export type UserRole = "admin" | "manager" | "user";
export type AuthUser = { email: string; name: string; role: UserRole; initials?: string; username?: string };
export type SessionUser = { name: string; email: string; role: UserRole; initials: string };

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE || "demo";
const KEY = "logvision_user";
const IS_KEYCLOAK_MODE = AUTH_MODE === "keycloak" || AUTH_MODE === "hybrid";
const IS_POSTGRES_MODE = AUTH_MODE === "postgres" || AUTH_MODE === "hybrid";

function resolveApiBase() {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!raw) return "http://localhost:8000";
  try {
    const parsed = new URL(raw);
    if (!parsed.protocol.startsWith("http")) return "http://localhost:8000";
    return parsed.origin;
  } catch {
    return "http://localhost:8000";
  }
}
const API_BASE = resolveApiBase();

function toInitials(name: string) {
  return name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
}

export function getRedirectPathByRole(role: UserRole) {
  const r = String(role || "").toLowerCase();
  if (r === "admin") return "/dashboard/admin/system";
  if (r === "manager") return "/dashboard/manager";
  return "/dashboard";
}
export const dashboardPathForRole = getRedirectPathByRole;

export function roleLabel(role: UserRole) {
  return role === "admin" ? "Administrator" : role === "manager" ? "Manager" : "Analyst";
}

function getDemoRole(email: string): UserRole {
  const lower = email.toLowerCase();
  if (lower.includes("admin")) return "admin";
  if (lower.includes("manager")) return "manager";
  return "user";
}
export const roleFromEmail = getDemoRole;

function saveDemoUser(email: string): AuthUser {
  const role = getDemoRole(email);
  const name = role === "admin" ? "Admin User" : role === "manager" ? "Manager User" : "Analyst User";
  const user: AuthUser = { email, role, name, initials: toInitials(name) };
  localStorage.setItem(KEY, JSON.stringify(user));
  localStorage.setItem("logvision_token", "demo-token");
  return user;
}

export async function loginWithPostgres(email: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Connexion échouée");

  // Validation stricte du rôle
  const role = (data.role || "").toLowerCase();
  if (!["admin", "manager", "user"].includes(role)) {
    throw new Error("Erreur système : Rôle utilisateur non reconnu");
  }

  const user: AuthUser = { email: data.email, name: data.name, role: role as UserRole, initials: data.initials || toInitials(data.name) };
  localStorage.setItem(KEY, JSON.stringify(user));
  localStorage.setItem("logvision_token", "postgres-token");
  return user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  if (IS_POSTGRES_MODE) return loginWithPostgres(email, password);
  return saveDemoUser(email);
}

export async function loginKeycloak() { return loginWithKeycloak(); }

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (typeof window === "undefined") return null;
  if (IS_KEYCLOAK_MODE && isKeycloakAuthenticated()) {
    const p = getKeycloakUserProfile() as AuthUser;
    return { ...p, initials: toInitials(p.name || p.email || "U") };
  }
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

>>>>>>> 494bacd (Save workspace snapshot)
export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
<<<<<<< HEAD
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.email || !parsed?.role) return null;
    return parsed;
  } catch {
    localStorage.removeItem(KEY);
    localStorage.removeItem("logvision_token");
    return null;
  }
}
export function logout() { localStorage.removeItem(KEY); localStorage.removeItem("logvision_token"); }
export function roleLabel(role: Role) { return role === "admin" ? "Administrator" : role === "manager" ? "Manager" : "Analyst"; }
=======
    const u = JSON.parse(raw) as AuthUser;
    return { name: u.name, email: u.email, role: u.role, initials: u.initials || toInitials(u.name) };
  } catch { return null; }
}

export function getCurrentRoleSync(): UserRole {
  if (IS_KEYCLOAK_MODE && isKeycloakAuthenticated()) return getKeycloakUserRole();
  return getSession()?.role || "user";
}
export const getCurrentRole = getCurrentRoleSync;

export function getAuthToken() {
  return IS_KEYCLOAK_MODE && isKeycloakAuthenticated() ? getKeycloakToken() : localStorage.getItem("logvision_token");
}
export function isAuthenticated() {
  return IS_KEYCLOAK_MODE ? isKeycloakAuthenticated() || !!getSession() : !!getSession();
}
export async function logout() {
  localStorage.removeItem(KEY);
  localStorage.removeItem("logvision_token");
  if (IS_KEYCLOAK_MODE) {
    try {
      await logoutFromKeycloak();
      return;
    } catch {
      // Fallback local redirect if Keycloak is unavailable.
    }
  }
  window.location.href = "/login";
}
>>>>>>> 494bacd (Save workspace snapshot)
