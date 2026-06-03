export default function SettingsPage() {
<<<<<<< HEAD
  return <div className="space-y-6"><div><h1 className="text-xl font-bold">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Admin configuration placeholder for Keycloak, API URL, model thresholds and Kibana dashboard links.</p></div><div className="glass-card animate-slide-up rounded-lg p-5 text-sm text-muted-foreground">Production settings should remain environment-driven where possible.</div></div>;
=======
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Runtime configuration is read from backend and container environment variables.
        </p>
      </div>
      <div className="glass-card animate-slide-up rounded-lg p-5 text-sm text-muted-foreground">
        No editable settings are exposed here yet. Use the admin configuration API when real configuration rows are available.
      </div>
    </div>
  );
>>>>>>> 494bacd (Save workspace snapshot)
}
