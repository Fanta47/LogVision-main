// lib/db.ts
// Connexion PostgreSQL côté serveur uniquement (API Routes)
import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      database: process.env.POSTGRES_DB || "logvision",
      user: process.env.POSTGRES_USER || "logvision_user",
      password: process.env.POSTGRES_PASSWORD || "",
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}