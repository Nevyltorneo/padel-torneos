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
    title: "MiTorneo – Sistema Profesional de Torneos de Pádel",
    description:
      "Organiza torneos de pádel de manera profesional con nuestro sistema completo de gestión. Grupos automáticos, brackets, estadísticas y más.",
    url: "https://padel-torneos.vercel.app/",
    siteName: "MiTorneo",
    images: [
      {
        url: "https://padel-torneos.vercel.app/mito.png",
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
    title: "MiTorneo – Sistema Profesional de Torneos de Pádel",
    description:
      "Organiza torneos de pádel de manera profesional con nuestro sistema completo de gestión. Grupos automáticos, brackets, estadísticas y más.",
    images: ["https://padel-torneos.vercel.app/mito.png"],
    creator: "@MiTorneo",
    site: "@MiTorneo",
  },
  icons: {
    icon: "/mito.png",
    apple: "/mito.png",
    shortcut: "/mito.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Force favicon reload - Multiple strategies */}
        <meta name="theme-color" content="#1a73e8" />
        <meta name="msapplication-TileColor" content="#1a73e8" />
        <meta name="msapplication-navbutton-color" content="#1a73e8" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-capable" content="yes" />

        {/* Simple favicon */}
        <link rel="icon" href="/mito.png" />

        {/* Open Graph for WhatsApp */}
        <meta
          property="og:title"
          content="MiTorneo – Sistema Profesional de Torneos de Pádel"
        />
        <meta
          property="og:description"
          content="Organiza torneos de pádel de manera profesional con nuestro sistema completo de gestión. Grupos automáticos, brackets, estadísticas y más."
        />
        <meta
          property="og:image"
          content="https://padel-torneos.vercel.app/mito.png"
        />
        <meta property="og:url" content="https://padel-torneos.vercel.app/" />
        <meta property="og:type" content="website" />

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="MiTorneo – Sistema Profesional de Torneos de Pádel"
        />
        <meta
          name="twitter:description"
          content="Organiza torneos de pádel de manera profesional con nuestro sistema completo de gestión. Grupos automáticos, brackets, estadísticas y más."
        />
        <meta
          name="twitter:image"
          content="https://padel-torneos.vercel.app/mito.png"
        />

        {/* Theme color */}
        <meta name="theme-color" content="#1a73e8" />
      </head>
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
