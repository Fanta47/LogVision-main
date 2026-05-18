export default function KibanaPage() {
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
