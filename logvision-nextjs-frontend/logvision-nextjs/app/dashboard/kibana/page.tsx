<<<<<<< HEAD
﻿"use client";

const KIBANA_DASHBOARD_URL =
  "http://localhost:5601/app/dashboards#/view/24205f0b-dac8-441d-9782-bf146ab2b5d8?embed=true&_g=(refreshInterval%3A(pause%3A!t%2Cvalue%3A60000)%2Ctime%3A(from%3Anow-1y%2Fd%2Cto%3Anow))";

export default function KibanaPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">
          Kibana Analytics
        </p>

        <h1 className="mt-2 text-2xl font-bold text-white">
          LogVision ML Anomaly Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Tableau de bord Kibana basé sur les scores ML LogBERT-like V4 exportés
          vers Elasticsearch. Les visualisations permettent d’analyser la
          distribution des labels, les anomalies par application, les composants
          critiques et l’évolution temporelle des séquences suspectes et
          anormales.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={KIBANA_DASHBOARD_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
        >
          Open in Kibana
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b111b]">
        <iframe
          src={KIBANA_DASHBOARD_URL}
          className="h-[900px] w-full border-0"
          title="LogVision ML Anomaly Dashboard"
        />
      </div>
    </div>
  );
}
=======
﻿export default function KibanaPage() {
  const kibanaUrl = process.env.NEXT_PUBLIC_KIBANA_DASHBOARD_URL || "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Kibana Observability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dashboards Kibana pour l'analyse des anomalies ML exportées vers Elasticsearch.
        </p>
      </div>

      {!kibanaUrl ? (
        <div className="glass-card rounded-lg p-5">
          <p className="text-sm text-muted-foreground">
            Aucun dashboard Kibana configuré. Ajoutez NEXT_PUBLIC_KIBANA_DASHBOARD_URL dans .env.local.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <a
            href={kibanaUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Open Kibana Dashboard
          </a>

          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <iframe
              src={kibanaUrl}
              title="Kibana ML Anomaly Dashboard"
              className="h-[900px] w-full"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
>>>>>>> 494bacd (Save workspace snapshot)
