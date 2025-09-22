import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MiTorneo - Gestión de Torneos de Pádel",
  icons: {
    icon: "/mito.png",
    shortcut: "/favicon.ico",
    apple: "/mito.png",
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
        <title>MiTorneo - Gestión de Torneos de Pádel</title>
        <link rel="icon" href="/mito.png" type="image/png" />
        <link rel="shortcut icon" href="/mito.png" type="image/png" />
        <link rel="apple-touch-icon" href="/mito.png" />
        <meta name="msapplication-TileImage" content="/mito.png" />
        <meta name="msapplication-TileColor" content="#1a73e8" />
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
