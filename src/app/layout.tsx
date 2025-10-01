import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MiTorneo - Gestión de Torneos de Pádel",
  description: "Sistema de gestión de torneos de pádel profesional",
  openGraph: {
    title: "MiTorneo - Gestión de Torneos de Pádel",
    description: "Sistema de gestión de torneos de pádel profesional",
    url: "https://padel-torneos.vercel.app",
    siteName: "MiTorneo",
    images: [
      {
        url: "/mito.png",
        width: 1200,
        height: 630,
        alt: "MiTorneo - Gestión de Torneos de Pádel",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MiTorneo - Gestión de Torneos de Pádel",
    description: "Sistema de gestión de torneos de pádel profesional",
    images: ["/mito.png"],
  },
  icons: {
    icon: "/mito-favicon.ico",
    apple: "/apple-touch-icon.png",
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
        <link rel="icon" href="/mito-favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/mito-favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#ffffff" />
        <meta property="og:image" content="/mito.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta name="twitter:image" content="/mito.png" />
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
