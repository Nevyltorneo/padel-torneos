"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  Calendar,
  Target,
  Plus,
  Settings,
  BarChart3,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useCurrentTournament } from "@/stores/tournament-store";
import { useUserRole } from "@/hooks/useUserRole";
import { ConditionalRender } from "@/components/auth/PermissionGuard";
import { Category, Pair, Match, Court } from "@/types";
import {
  getCategories,
  getPairs,
  getAllMatchesByCategory,
  getCourts,
} from "@/lib/supabase-queries";
import { toast } from "sonner";

export default function AdminDashboard() {
  const currentTournament = useCurrentTournament();
  const { userContext, hasPermission } = useUserRole();
  const [categories, setCategories] = useState<Category[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load tournament data
  useEffect(() => {
    if (!currentTournament) return;

    const loadTournamentData = async () => {
      try {
        setIsLoading(true);

        // Cargar datos en paralelo
        const [categoriesData, courtsData] = await Promise.all([
          getCategories(currentTournament.id),
          getCourts(currentTournament.id),
        ]);

        setCategories(categoriesData);
        setCourts(courtsData);

        // Cargar parejas de todas las categorías
        if (categoriesData.length > 0) {
          const allPairsPromises = categoriesData.map((category) =>
            getPairs(category.id)
          );
          const allPairsArrays = await Promise.all(allPairsPromises);
          const flatPairs = allPairsArrays.flat();
          setPairs(flatPairs);

          // Cargar partidos de todas las categorías
          const allMatchesPromises = categoriesData.map((category) =>
            getAllMatchesByCategory(category.id)
          );
          const allMatchesArrays = await Promise.all(allMatchesPromises);
          const flatMatches = allMatchesArrays.flat();
          setMatches(flatMatches);
        }
      } catch (error) {
        console.error("Error loading tournament data:", error);
        toast.error("Error al cargar datos del torneo");
      } finally {
        setIsLoading(false);
      }
    };

    loadTournamentData();
  }, [currentTournament]);

  // Stats calculations
  const totalCategories = categories.length;
  const totalPairs = pairs.length;
  const totalMatches = matches.length;
  const totalCourts = courts.length;
  const finishedMatches = matches.filter(
    (m) => m.status === "completed"
  ).length;
  const pendingMatches = totalMatches - finishedMatches;

  if (!currentTournament) {
    return <NoTournamentView />;
  }

  if (isLoading) {
    return (
      <div className="admin-dashboard p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">Cargando datos del torneo...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="admin-dashboard-header mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="admin-dashboard-title text-3xl font-bold text-gray-900">
              Dashboard
            </h1>
            <p className="admin-dashboard-subtitle text-gray-600 mt-1">
              Gestión del torneo: {currentTournament.name}
            </p>
          </div>

          <div className="admin-dashboard-actions flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/settings">
                <Settings className="h-4 w-4 mr-2" />
                Configuración
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="admin-dashboard-stats grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Categorías"
          value={totalCategories}
          icon={<Target className="h-5 w-5" />}
          description="Categorías registradas"
          href="/admin/categories"
        />

        <StatCard
          title="Parejas"
          value={totalPairs}
          icon={<Users className="h-5 w-5" />}
          description="Parejas inscritas"
          href="/admin/pairs"
        />

        <StatCard
          title="Canchas"
          value={courts.length}
          icon={<Trophy className="h-5 w-5" />}
          description="Disponibles"
          href="/admin/schedule"
        />

        <StatCard
          title="Progreso"
          value={
            totalMatches > 0
              ? `${Math.round((finishedMatches / totalMatches) * 100)}%`
              : "0%"
          }
          icon={<BarChart3 className="h-5 w-5" />}
          description="Del torneo"
          href="/admin/live"
        />
      </div>

      {/* Quick Actions */}
      <div className="admin-dashboard-actions-grid grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ConditionalRender requiredPermission="canManageCategories">
          <Card className="admin-quick-actions">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Gestión de Categorías
              </CardTitle>
              <CardDescription>
                Crear categorías y gestionar parejas inscritas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" asChild>
                <Link href="/admin/categories">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Categoría
                </Link>
              </Button>
              <ConditionalRender requiredPermission="canManagePairs">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/admin/pairs">Gestionar Parejas</Link>
                </Button>
              </ConditionalRender>
            </CardContent>
          </Card>
        </ConditionalRender>

        <ConditionalRender requiredPermission="canGenerateGroups">
          <Card className="admin-tournament-flow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Flujo del Torneo
              </CardTitle>
              <CardDescription>
                Configurar grupos, calendario y eliminatorias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" asChild>
                <Link href="/admin/groups">Generar Grupos</Link>
              </Button>
              <ConditionalRender requiredPermission="canManageSchedule">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/admin/schedule">Programar Partidos</Link>
                </Button>
              </ConditionalRender>
            </CardContent>
          </Card>
        </ConditionalRender>
      </div>

      {/* User Info */}
      {userContext && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Tu Sesión</span>
              <Badge
                variant={userContext.role === "owner" ? "default" : "secondary"}
              >
                {userContext.role === "owner" && "👑 "}
                {userContext.role === "admin" && "⚙️ "}
                {userContext.role === "referee" && "⚖️ "}
                {userContext.role === "viewer" && "👀 "}
                {userContext.role
                  ? userContext.role.charAt(0).toUpperCase() +
                    userContext.role.slice(1)
                  : "Sin rol"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <p className="font-medium">
                  {userContext.user.profile?.fullName || userContext.user.email}
                </p>
                <p className="text-sm text-gray-500">
                  {userContext.user.email}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity & Status */}
      <div className="admin-dashboard-bottom grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="admin-recent-activity">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimos cambios en el torneo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="admin-activity-list space-y-3">
              {pendingMatches > 0 && (
                <div className="admin-activity-item flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">
                      {pendingMatches} partidos pendientes
                    </span>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/admin/live">Ver</Link>
                  </Button>
                </div>
              )}

              {totalCategories === 0 && (
                <div className="admin-activity-item flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Crear primera categoría</span>
                  </div>
                  <Button size="sm" asChild>
                    <Link href="/admin/categories">Crear</Link>
                  </Button>
                </div>
              )}

              {totalPairs === 0 && totalCategories > 0 && (
                <div className="admin-activity-item flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Registrar parejas</span>
                  </div>
                  <Button size="sm" asChild>
                    <Link href="/admin/pairs">Registrar</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="admin-tournament-status">
          <CardHeader>
            <CardTitle>Estado del Torneo</CardTitle>
            <CardDescription>
              Información general y próximos pasos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="admin-status-info space-y-4">
              <div className="admin-status-item flex items-center justify-between">
                <span className="text-sm text-gray-600">Estado</span>
                <Badge variant="outline">
                  {/* Este valor vendría del estado del torneo */}
                  En Desarrollo
                </Badge>
              </div>

              <div className="admin-status-item flex items-center justify-between">
                <span className="text-sm text-gray-600">Días del torneo</span>
                <span className="text-sm font-medium">
                  {currentTournament.config.days?.length || 0} días
                </span>
              </div>

              <div className="admin-status-item flex items-center justify-between">
                <span className="text-sm text-gray-600">Canchas</span>
                <span className="text-sm font-medium">
                  {isLoading ? "..." : `${totalCourts} canchas`}
                </span>
              </div>

              <div className="admin-status-item flex items-center justify-between">
                <span className="text-sm text-gray-600">Parejas inscritas</span>
                <span className="text-sm font-medium">
                  {isLoading ? "..." : `${totalPairs} parejas`}
                </span>
              </div>

              <div className="admin-status-progress pt-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/admin/settings">Configurar Torneo</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NoTournamentView() {
  return (
    <div className="admin-no-tournament p-6 max-w-4xl mx-auto">
      <div className="text-center space-y-6">
        <div className="admin-no-tournament-icon">
          <Trophy className="h-16 w-16 text-gray-400 mx-auto" />
        </div>

        <div className="admin-no-tournament-content">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenido a MiTorneo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Para comenzar, crea tu primer torneo o selecciona uno existente.
            Podrás configurar categorías, registrar parejas y gestionar todo el
            proceso automáticamente.
          </p>
        </div>

        <div className="admin-no-tournament-actions flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/admin/tournaments">
              <Plus className="h-5 w-5 mr-2" />
              Crear Nuevo Torneo
            </Link>
          </Button>

          <Button variant="outline" size="lg" asChild>
            <Link href="/admin/tournaments">Ver Torneos Existentes</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  href: string;
}

function StatCard({ title, value, icon, description, href }: StatCardProps) {
  return (
    <Card className="admin-stat-card hover:shadow-md transition-shadow cursor-pointer">
      <Link href={href}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
            <div className="text-blue-600">{icon}</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        </CardContent>
      </Link>
    </Card>
  );
}
