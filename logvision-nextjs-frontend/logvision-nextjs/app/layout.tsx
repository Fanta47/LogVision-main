<<<<<<< HEAD
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "LogVision",
  description: "Vermeg log analysis and anomaly detection platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors theme="dark" position="top-right" />
      </body>
    </html>
  );
}
=======
import './globals.css'; // Assurez-vous que ce chemin est correct pour vos styles globaux

export const metadata = {
  title: 'LogVision',
  description: 'Plateforme d\'analyse de logs en temps réel avec intelligence prédictive',
  icons: {
    icon: '/assets/vermeg-slash.png', // Utilise l'image existante du slash rouge comme favicon
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
>>>>>>> 494bacd (Save workspace snapshot)
