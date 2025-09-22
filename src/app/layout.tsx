import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MiTorneo - Gestión de Torneos de Pádel",
  description:
    "Sistema completo para organizar y gestionar torneos de pádel. Genera grupos automáticamente, administra calendarios, asigna canchas y haz seguimiento en tiempo real de todos tus torneos.",
  keywords:
    "torneos pádel, gestión deportiva, bracket, eliminatorias, grupos, calendario deportivo, canchas",
  authors: [{ name: "MiTorneo" }],
  creator: "MiTorneo",
  publisher: "MiTorneo",
  metadataBase: new URL("https://padel-torneos.vercel.app"),
  openGraph: {
    title: "MiTorneo - Gestión de Torneos de Pádel",
    description:
      "Sistema completo para organizar y gestionar torneos de pádel. Genera grupos automáticamente, administra calendarios, asigna canchas y haz seguimiento en tiempo real de todos tus torneos.",
    url: "https://padel-torneos.vercel.app",
    siteName: "MiTorneo",
    images: [
      {
        url: "/mito.png",
        width: 1200,
        height: 630,
        alt: "MiTorneo - Sistema de Gestión de Torneos de Pádel",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MiTorneo - Gestión de Torneos de Pádel",
    description:
      "Sistema profesional para organizar torneos de pádel con grupos automáticos y seguimiento en vivo.",
    images: ["/mito.png"],
    creator: "@MiTorneo",
    site: "@MiTorneo",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
  other: {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    // WhatsApp specific meta tags
    "format-detection": "telephone=no",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "MiTorneo",
    "application-name": "MiTorneo",
    "msapplication-TileColor": "#1a73e8",
    "msapplication-config": "/browserconfig.xml",
    "theme-color": "#1a73e8",
    // OpenGraph additional tags for WhatsApp
    "og:image:secure_url": "/mito.png",
    "og:image:width": "1200",
    "og:image:height": "630",
    "og:image:type": "image/png",
    "og:image:alt": "MiTorneo - Sistema de Gestión de Torneos de Pádel",
    // Twitter additional tags
    "twitter:image:src": "/mito.png",
    "twitter:image:width": "1200",
    "twitter:image:height": "630",
    "twitter:image:alt": "MiTorneo - Sistema de Gestión de Torneos de Pádel",
    // Favicon specific tags
    "msapplication-TileImage": "/favicon.ico",
    "msapplication-square70x70logo": "/favicon.ico",
    "msapplication-square150x150logo": "/favicon.ico",
    "msapplication-wide310x150logo": "/favicon.ico",
    "msapplication-square310x310logo": "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        className={cn(
          inter.className,
          "layout-root min-h-screen bg-background font-sans antialiased"
        )}
      >
        <AuthProvider>
          <div className="layout-container relative flex min-h-screen flex-col">
            <main className="layout-main flex-1">{children}</main>
          </div>
        </AuthProvider>
        <Toaster
          position="top-right"
          className="toaster-container"
          toastOptions={{
            className: "toaster-item",
          }}
        />
      </body>
    </html>
  );
}
