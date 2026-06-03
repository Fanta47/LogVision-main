import { NextRequest, NextResponse } from "next/server";

// Store temporaire en mémoire pour le rate limiting
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const key = `${ip}:${email.toLowerCase()}`;
    const now = Date.now();
    const record = loginAttempts.get(key);

    // Vérification du blocage
    if (record && record.count >= MAX_ATTEMPTS && now - record.lastAttempt < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (now - record.lastAttempt)) / 1000);
      return NextResponse.json({ error: `Sécurité : Trop de tentatives de connexion. Veuillez patienter ${waitSec}s.` }, { status: 429 });
    }

    const { getPool } = await import("@/lib/db");
    const bcrypt = await import("bcryptjs");
    const pool = getPool();
    const result = await pool.query(
      "SELECT id, email, name, role, password_hash FROM users WHERE email = $1 AND active = true",
      [email.toLowerCase()]
    );
    if (result.rows.length === 0) {
      const current = loginAttempts.get(key) || { count: 0, lastAttempt: now };
      loginAttempts.set(key, { count: current.count + 1, lastAttempt: now });
      return NextResponse.json({ error: "E-mail ou mot de passe incorrect" }, { status: 401 });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const current = loginAttempts.get(key) || { count: 0, lastAttempt: now };
      loginAttempts.set(key, { count: current.count + 1, lastAttempt: now });
      return NextResponse.json({ error: "E-mail ou mot de passe incorrect" }, { status: 401 });
    }

    // Succès : réinitialisation des tentatives
    loginAttempts.delete(key);

    return NextResponse.json({
      email: user.email,
      name: user.name || user.email,
      role: user.role as "admin" | "manager" | "user",
      initials: (user.name || user.email)
        .split(" ")
        .map((x: string) => x[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
