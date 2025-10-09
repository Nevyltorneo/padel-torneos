"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Home,
  Trophy,
  Users,
  Calendar,
  Settings,
  Menu,
  X,
  Target,
  BarChart3,
  Clock,
  Bell,
  Shield,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentTournament } from "@/stores/tournament-store";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { NotificationCenter } from "@/components/NotificationCenter";
import { UserInfo } from "@/components/admin/UserInfo";

const navigation = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: Home,
    exact: true,
  },
  {
    name: "Torneos",
    href: "/admin/tournaments",
    icon: Trophy,
  },
  {
    name: "Categorías",
    href: "/admin/categories",
    icon: Target,
  },
  {
    name: "Parejas",
    href: "/admin/pairs",
    icon: Users,
  },
  {
    name: "Grupos",
    href: "/admin/groups",
    icon: Target,
  },
  {
    name: "Calendario",
    href: "/admin/schedule",
    icon: Calendar,
  },
  {
    name: "Eliminatorias",
    href: "/admin/eliminations",
    icon: BarChart3,
  },
  {
    name: "Progreso",
    href: "/admin/live",
    icon: Activity,
  },
  {
    name: "Configuración",
    href: "/admin/settings",
    icon: Settings,
  },
  {
    name: "Notificaciones",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    name: "Usuarios",
    href: "/admin/users",
    icon: Users,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const currentTournament = useCurrentTournament();
  const { signOut } = useAuth();

  const isActive = (href: string, exact: boolean = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <ProtectedRoute>
      <div className="admin-layout min-h-screen bg-gray-50">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="admin-sidebar-backdrop fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            "admin-sidebar fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Sidebar header */}
          <div className="admin-sidebar-header flex items-center justify-between p-4 border-b">
            <Link href="/admin" className="admin-logo flex items-center gap-2">
              <Trophy className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-lg">MiTorneo</span>
            </Link>
            <NotificationCenter
              tournamentId={currentTournament?.id}
              className="hidden lg:block"
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="admin-sidebar-close lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Current tournament info */}
          {currentTournament && (
            <div className="admin-current-tournament p-4 bg-blue-50 border-b">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Torneo Actual
                </p>
                <p className="font-medium text-sm truncate">
                  {currentTournament.name}
                </p>
                <Badge variant="outline" className="text-xs">
                  {currentTournament.slug}
                </Badge>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="admin-nav flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "admin-nav-item flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="admin-sidebar-footer p-4 border-t">
            <div className="space-y-3">
              <UserInfo />
              <Button
                variant="ghost"
                size="sm"
                className="admin-home w-full"
                asChild
              >
                <Link href="/">Volver al Inicio</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => signOut()}
              >
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="admin-main lg:pl-64">
          {/* Mobile header */}
          <div className="admin-mobile-header sticky top-0 z-30 bg-white border-b px-4 py-2 lg:hidden">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="admin-mobile-menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div className="admin-mobile-title">
                <Link href="/admin" className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold">MiTorneo</span>
                </Link>
              </div>
              <NotificationCenter
                tournamentId={currentTournament?.id}
                className="flex-shrink-0"
              />
            </div>
          </div>

          {/* Page content */}
          <div className="admin-content relative z-0">{children} </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
