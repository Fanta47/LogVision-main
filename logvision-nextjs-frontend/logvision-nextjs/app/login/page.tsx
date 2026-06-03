<<<<<<< HEAD
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Globe, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { login } from "@/lib/auth";
import { Button } from "@/components/Button";
import { VermegAnimatedLogo } from "@/components/VermegAnimatedLogo";
import { LoginBackground } from "@/components/LoginBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("user@vermeg.com");
  const [password, setPassword] = useState("demo1234");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      login(email, password);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in");
=======
﻿﻿"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Globe, Lock, Mail, Database, KeyRound, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { dashboardPathForRole, getCurrentUser, getSession, login, loginKeycloak } from "@/lib/auth";
import { initKeycloak, isKeycloakAuthenticated } from "@/lib/keycloak";
import { LoginBackground } from "@/components/LoginBackground";
import { VermegAnimatedLogo } from "@/components/VermegAnimatedLogo";

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE || "demo";

type Method = "postgres" | "keycloak";

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>(
    AUTH_MODE === "keycloak" ? "keycloak" : "postgres"
  );
  const [email, setEmail] = useState(
    ""
  );
  const [password, setPassword] = useState(
    ""
  );
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    let active = true;
    const hasKeycloakCallbackParams =
      typeof window !== "undefined" &&
      (window.location.search.includes("code=") ||
        window.location.search.includes("state=") ||
        window.location.search.includes("session_state="));

    async function checkAuthAndRedirect() {
      if (hasKeycloakCallbackParams) {
        try {
          await initKeycloak();
          if (active && isKeycloakAuthenticated()) {
            const u = await getCurrentUser();
            if (u) {
              router.replace(dashboardPathForRole(u.role));
              return;
            }
          }
        } catch {
          // fallback to standard local auth check below
        }
      }
    }

    checkAuthAndRedirect();
    return () => { active = false; };
  }, [router]);

  const emailInvalid = email.trim() !== "" && !email.toLowerCase().endsWith("@vermeg.com");

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (!email.toLowerCase().endsWith("@vermeg.com")) {
      toast.error("Accès restreint : utilisez votre adresse @vermeg.com");
      return;
    }
    setLoading(true);
    try {
      console.log("[Auth] Attempting login for:", email);
      const user = await login(email, password);

      if (user) {
        const userRole = (user.role || "user").toLowerCase();
        const targetPath = dashboardPathForRole(userRole as any);
        toast.success(`Bienvenue, ${user.name}`);
        router.push(targetPath);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Identifiants incorrects ou utilisateur inexistant");
>>>>>>> 494bacd (Save workspace snapshot)
    } finally {
      setLoading(false);
    }
  }
<<<<<<< HEAD
  return <div className="relative flex min-h-screen overflow-hidden">
    <LoginBackground />
    <div className="relative z-10 hidden flex-1 flex-col justify-between p-12 lg:flex">
      <div className="flex items-center"><VermegAnimatedLogo size="lg" /></div>
      <div>
        <h1 className="text-5xl font-bold leading-tight text-foreground">Analyse de logs en temps réel.<br /><span className="text-primary">Intelligence prédictive.</span></h1>
        <p className="mt-6 max-w-xl text-3 leading-relaxed text-muted-foreground">Surveillez, détectez les anomalies et anticipez les pannes. Une observabilité de niveau entreprise pour vos systèmes critiques.</p>
      </div>
      <p className="text-2 text-muted-foreground">© 2026 logVision par Vermeg. Tous droits réservés.</p>
    </div>
    <div className="absolute right-4 top-4 z-20 rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-sm font-semibold text-foreground backdrop-blur"><span className="inline-flex items-center gap-2"><Globe className="h-4 w-4" />FR</span></div>
    <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-white/12 bg-background/58 p-10 shadow-2xl shadow-black/45 backdrop-blur-xl">
      <div className="mb-8 flex items-center justify-center"><VermegAnimatedLogo size="md" /></div>
      <h2 className="text-5 font-bold text-foreground">Bon retour</h2>
      <p className="mt-2 text-muted-foreground">Connectez-vous à votre compte</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-muted-foreground">E-mail</label>
        <div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-md border border-border bg-secondary pl-10 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary" /></div>
        <label className="block text-sm font-medium text-muted-foreground">Mot de passe</label>
        <div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 w-full rounded-md border border-border bg-secondary pl-10 pr-10 text-sm outline-none focus:ring-1 focus:ring-primary" /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{show ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" className="rounded border-border" defaultChecked />Se souvenir de moi</label>
          <a href="/forgot-password" className="text-sm text-primary hover:underline">Mot de passe oublié ?</a>
        </div>
        <Button type="submit" disabled={loading} className="mt-6 h-12 w-full rounded-lg text-lg">{loading ? "Connexion..." : "Se connecter"}</Button>
      </form>
      <div className="my-6 flex items-center gap-4 text-sm text-muted-foreground"><div className="h-px flex-1 bg-border" /><span>ou</span><div className="h-px flex-1 bg-border" /></div>
      <button type="button" className="h-12 w-full rounded-lg border border-border bg-secondary font-semibold text-foreground">Se connecter avec Keycloak SSO</button>
    </div>
    </div>
  </div>;
=======

  async function handleKeycloak() {
    setLoading(true);
    try {
      await loginKeycloak();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible de joindre Keycloak. Vérifiez URL/realm/client."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      <LoginBackground />

      {/* Branding gauche */}
      <div className="relative z-10 hidden flex-1 flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-5">
          <div 
            className={`h-24 w-7 -skew-x-12 rounded-sm bg-red-700/80 transition-all duration-1000 ease-out ${
              mounted ? "translate-y-0 opacity-100 shadow-[0_0_25px_rgba(185,28,28,0.5)] animate-pulse" : "-translate-y-20 opacity-0 shadow-none"
            }`} 
          />
          <span 
            className={`text-6xl font-extrabold tracking-[0.18em] text-foreground/60 transition-all duration-700 delay-300 ease-out ${
              mounted ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
            }`}
          >
            Vermeg
          </span>
        </div>
        <div className="max-w-2xl pb-28">
          <h1 className="text-4xl font-extrabold leading-tight text-foreground/70">
            Analyse de logs en temps réel.
            <br />
            <span className="text-red-700/80">Intelligence prédictive.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground/80">
            Surveillez, détectez les anomalies et anticipez les pannes. Une
            observabilité de niveau entreprise pour vos systèmes critiques.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 LogVision par Vermeg. Tous droits réservés.
        </p>
      </div>

      {/* Language Selector */}
      <div className="absolute right-4 top-4 z-20 rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-sm font-semibold text-foreground backdrop-blur">
        <span className="inline-flex items-center gap-2">
          <Globe className="h-4 w-4" />
          FR
        </span>
      </div>

      {/* Formulaire principal */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg space-y-6">

            {/* Card logo */}
          <div className="rounded-3xl border border-white/12 bg-background/58 p-10 shadow-2xl shadow-black/45 backdrop-blur-xl">
            <div className="mb-8 flex items-center justify-center">
              <VermegAnimatedLogo size="md" />
            </div>

            {/* Method Selector */}
            {AUTH_MODE !== "keycloak" && (
              <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/50 p-1">
                <button
                  onClick={() => setMethod("postgres")}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                    method === "postgres"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Database className="h-4 w-4" />
                  PostgreSQL
                </button>
                <button
                  onClick={() => setMethod("keycloak")}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                    method === "keycloak"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <KeyRound className="h-4 w-4" />
                  Keycloak
                </button>
              </div>
            )}

            {/* Formulaire credentials */}
            {AUTH_MODE !== "keycloak" && method === "postgres" && (
              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`h-11 w-full rounded-md border bg-secondary pl-10 pr-3 text-sm outline-none transition-all ${
                        emailInvalid 
                          ? "border-amber-500/50 focus:ring-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]" 
                          : "border-border focus:ring-red-600 hover:border-red-600/50 hover:shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                      }`}
                      placeholder="exemple@vermeg.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                  {emailInvalid && (
                    <p className="mt-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-tight animate-in fade-in slide-in-from-top-1">
                      Accès réservé au domaine @vermeg.com
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 w-full rounded-md border border-border bg-secondary pl-10 pr-10 text-sm outline-none focus:ring-1 focus:ring-red-600 hover:border-red-600/50 hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all"
                      placeholder="*************"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow((p) => !p)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all ${show ? "text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 accent-red-600"
                    />
                    Se souvenir de moi
                  </label>
                  <a href="/forgot-password" className="text-sm text-primary hover:underline">
                    Mot de passe oublié ?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 h-12 w-full rounded-lg bg-red-600 text-base font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Connexion en cours..." : "Se connecter"}
                </button>
              </form>
            )}

            {/* SSO Keycloak */}
            {(AUTH_MODE === "keycloak" || method === "keycloak") && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                  <p className="mb-2 font-medium text-foreground">Connexion SSO via Keycloak</p>
                  <p>Vous serez redirigé vers le portail d'authentification Keycloak de votre organisation.</p>
                </div>
                <button
                  onClick={handleKeycloak}
                  disabled={loading}
                  className="h-12 w-full rounded-lg border border-primary/50 bg-primary/10 text-base font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Redirection..." : "Continuer avec Keycloak"}
                </button>
                {AUTH_MODE !== "keycloak" && (
                  <button
                    type="button"
                    onClick={() => setMethod("postgres")}
                    className="h-11 w-full rounded-lg border border-border bg-secondary text-sm font-semibold text-foreground transition hover:bg-secondary/80"
                  >
                    Retour vers Email/password
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
>>>>>>> 494bacd (Save workspace snapshot)
}
