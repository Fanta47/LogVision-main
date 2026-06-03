type KcLike = {
  init: (opts: any) => Promise<boolean>;
  login: (opts?: any) => Promise<void>;
  logout: (opts?: any) => Promise<void>;
  token?: string;
  authenticated?: boolean;
  tokenParsed?: any;
};

let keycloakInstance: KcLike | null = null;
let keycloakInitPromise: Promise<boolean> | null = null;
let keycloakWasInitialized = false;
const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "logvision-frontend";
const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || "http://localhost:8081";
const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "logvision";

async function getOrCreateKeycloak() {
  if (typeof window === "undefined") return null;
  if (keycloakInstance) return keycloakInstance;

  const mod: any = await import("keycloak-js");
  const KcCtor: any = mod?.default ?? mod;
  if (!KcCtor) throw new Error("Keycloak constructor unavailable");

  const instance: any = new KcCtor({ url: keycloakUrl, realm, clientId });
  if (!instance || typeof instance.login !== "function" || typeof instance.init !== "function") {
    throw new Error("Invalid Keycloak client instance");
  }
  keycloakInstance = instance as KcLike;
  return keycloakInstance;
}

export async function initKeycloak() {
  const keycloak = await getOrCreateKeycloak();
  if (!keycloak) return false;
  if (typeof keycloak.init !== "function") throw new Error("Invalid Keycloak client init");
  if (keycloak.authenticated) return true;
  if (keycloakWasInitialized) return !!keycloak.authenticated;
  if (keycloakInitPromise) return keycloakInitPromise;

  keycloakInitPromise = keycloak
    .init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      checkLoginIframe: false,
      redirectUri: window.location.origin + "/login",
    })
    .then((ok) => {
      keycloakWasInitialized = true;
      return ok;
    })
    .catch((err) => {
      keycloakInitPromise = null;
      throw err;
    });

  return keycloakInitPromise;
}

export async function loginWithKeycloak() {
  const keycloak = await getOrCreateKeycloak();
  if (!keycloak) throw new Error("Keycloak unavailable");
  if (typeof keycloak.login !== "function") throw new Error("Invalid Keycloak client login");
  await initKeycloak();
  await keycloak.login({
    redirectUri: window.location.origin + "/login",
    prompt: "login",
    maxAge: 0,
  });
}

export async function logoutFromKeycloak() {
  const keycloak = await getOrCreateKeycloak();
  if (!keycloak || typeof keycloak.logout !== "function") return;
  await keycloak.logout({ redirectUri: window.location.origin + "/login" });
}

export function getKeycloakToken() { return keycloakInstance?.token || null; }
export function isKeycloakAuthenticated() { return !!keycloakInstance?.authenticated; }

export function getKeycloakUserRole(): "admin" | "manager" | "user" {
  const tokenParsed: any = keycloakInstance?.tokenParsed;
  const realmRoles: string[] = tokenParsed?.realm_access?.roles || [];
  const clientRoles: string[] = tokenParsed?.resource_access?.[clientId]?.roles || [];
  const roles = [...realmRoles, ...clientRoles];
  if (roles.includes("admin")) return "admin";
  if (roles.includes("manager")) return "manager";
  return "user";
}

export function getKeycloakUserProfile() {
  const tokenParsed: any = keycloakInstance?.tokenParsed;
  return {
    email: tokenParsed?.email || "",
    name: tokenParsed?.name || tokenParsed?.preferred_username || tokenParsed?.email || "User",
    username: tokenParsed?.preferred_username || "",
    role: getKeycloakUserRole(),
  };
}
