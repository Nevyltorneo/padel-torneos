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
  openGraph: {
    title: "MiTorneo - Sistema Profesional de Torneos de Pádel",
    description:
      "Organiza torneos de pádel de manera profesional con nuestro sistema completo de gestión. Grupos automáticos, brackets, calendarios y seguimiento en vivo.",
    url: "https://padel-torneos.vercel.app",
    siteName: "MiTorneo",
    images: [
      {
        url: "https://padel-torneos.vercel.app/og-image.svg",
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
    images: ["https://padel-torneos.vercel.app/og-image.svg"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
  other: {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
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
