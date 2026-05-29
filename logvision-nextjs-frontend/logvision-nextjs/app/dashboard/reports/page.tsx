import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">
          Reports
        </p>

        <h1 className="mt-2 text-2xl font-bold text-white">
          LogVision Reports
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Synthèse opérationnelle des résultats ML LogVision. Cette page sert de
          point d’accès aux vues principales : le dashboard applicatif ML basé
          sur FastAPI/PostgreSQL et le dashboard analytique Kibana basé sur
          Elasticsearch.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/models"
          className="rounded-2xl border border-white/10 bg-[#0b111b] p-5 transition hover:border-red-500/40 hover:bg-white/[0.03]"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
            FastAPI / PostgreSQL
          </p>

          <h2 className="mt-2 text-lg font-bold text-white">
            ML Models Dashboard
          </h2>

          <p className="mt-3 text-sm text-slate-400">
            Consulte les statistiques globales du modèle LogBERT-like V4, les
            filtres par application, composant et label, ainsi que la table des
            séquences scorées.
          </p>

          <p className="mt-4 text-sm font-semibold text-red-300">
            Open ML Models →
          </p>
        </Link>

        <Link
          href="/dashboard/kibana"
          className="rounded-2xl border border-white/10 bg-[#0b111b] p-5 transition hover:border-red-500/40 hover:bg-white/[0.03]"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Elasticsearch / Kibana
          </p>

          <h2 className="mt-2 text-lg font-bold text-white">
            Kibana Analytics Dashboard
          </h2>

          <p className="mt-3 text-sm text-slate-400">
            Explore les visualisations Kibana : distribution des labels,
            anomalies par application, composants critiques, timeline et tableau
            des composants anormaux.
          </p>

          <p className="mt-4 text-sm font-semibold text-red-300">
            Open Kibana Analytics →
          </p>
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0b111b] p-5">
        <h2 className="text-lg font-bold text-white">
          Architecture de visualisation
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">
              PostgreSQL
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Source principale des scores ML pour le backend FastAPI et le
              dashboard applicatif.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">
              FastAPI / Next.js
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Expose et affiche les statistiques globales, les filtres et les
              séquences scorées.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">
              Elasticsearch / Kibana
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Copie analytique des scores ML pour construire des dashboards
              exploratoires.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}