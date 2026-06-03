<<<<<<< HEAD
import Link from "next/link";
=======
"use client";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createPasswordResetRequest } from "@/lib/api";
>>>>>>> 494bacd (Save workspace snapshot)
import { VermegAnimatedLogo } from "@/components/VermegAnimatedLogo";
import { LoginBackground } from "@/components/LoginBackground";

export default function ForgotPasswordPage() {
<<<<<<< HEAD
  return <div className="login-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4"><LoginBackground /><div className="glass-card relative z-10 w-full max-w-md rounded-2xl p-8"><div className="mb-6 flex flex-col items-center gap-4"><VermegAnimatedLogo size="md" /><h1 className="text-xl font-semibold">Forgot Password</h1></div><p className="text-sm text-muted-foreground">Contact your administrator to reset access in this demo build.</p><Link href="/login" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Back to login</Link></div></div>;
=======
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setMsg("Veuillez renseigner votre email.");
      return;
    }
    if (!cleanEmail.toLowerCase().endsWith("@vermeg.com")) {
      setMsg("Accès restreint : l'adresse email doit appartenir au domaine @vermeg.com");
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 8) {
      setMsg("Veuillez saisir un nouveau mot de passe (min 8 caracteres).");
      return;
    }

    const r = await createPasswordResetRequest(
      cleanEmail,
      reason.trim() || undefined,
      newPassword.trim()
    );
    if (r.error === "invalid_payload") {
      setMsg("Email invalide. Veuillez verifier le format.");
      return;
    }
    if (r.usingFallback) {
      setMsg("Serveur indisponible pour le moment. Veuillez reessayer dans quelques instants.");
      return;
    }
    if (r.error) {
      setMsg("La demande n'a pas pu etre envoyee. Veuillez reessayer.");
      return;
    }
    setMsg("Votre demande de reinitialisation a ete envoyee a l'administrateur.");
  }

  return (
    <div className="login-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <LoginBackground />
      <div className="glass-card relative z-10 w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex flex-col items-center gap-4">
          <VermegAnimatedLogo size="md" />
          <h1 className="text-xl font-semibold">Mot de passe oublie</h1>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm"
          />
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison (optionnel)"
            className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe (min 8 caracteres)"
              className="w-full rounded border border-border bg-secondary pl-3 pr-10 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all ${showPassword ? "text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]" : "text-muted-foreground hover:text-foreground"}`}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all">
            Envoyer
          </button>
        </form>

        {msg && <p className="mt-3 text-xs text-amber-200">{msg}</p>}

        <Link href="/login" className="mt-6 inline-flex rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors">
          Back to login
        </Link>
      </div>
    </div>
  );
>>>>>>> 494bacd (Save workspace snapshot)
}
