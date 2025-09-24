"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  Eye,
  Play,
  Crown,
  Medal,
  ArrowRight,
  BarChart3,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { Category, Tournament, Match } from "@/types";
import { toast } from "sonner";
import {
  getAllCategories,
  getTournaments,
  getAllMatchesByCategory,
} from "@/lib/supabase-queries";

export default function ProgresoGeneral() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMatches: 0,
    completedMatches: 0,
    activeCategories: 0,
    activeTournaments: 0,
    todayMatches: 0,
    pendingEliminations: 0,
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log("🔄 PROGRESO: Cargando datos del dashboard...");

      const [categoriesData, tournamentsData] = await Promise.all([
        getAllCategories(),
        getTournaments(),
      ]);

      console.log("📊 PROGRESO: Datos cargados:", {
        categorias: categoriesData.length,
        torneos: tournamentsData.length,
      });

      // Obtener todos los partidos de todas las categorías
      let allMatches: Match[] = [];
      for (const category of categoriesData) {
        try {
          const categoryMatches = await getAllMatchesByCategory(category.id);
          allMatches = [...allMatches, ...categoryMatches];
          console.log(
            `  📊 Categoría ${category.name}: ${categoryMatches.length} partidos`
          );
        } catch (error) {
          console.warn(
            `Error loading matches for category ${category.id}:`,
            error
          );
        }
      }

      const matchesData = allMatches;
      console.log("🎾 PROGRESO: Total partidos cargados:", matchesData.length);

      setCategories(categoriesData);
      setTournaments(tournamentsData);
      setMatches(matchesData);

      // Calcular estadísticas
      const today = new Date().toISOString().split("T")[0];
      const todayMatches = matchesData.filter(
        (m: Match) => m.day === today
      ).length;

      const completedMatches = matchesData.filter(
        (m: Match) => m.status === "completed"
      ).length;

      const pendingEliminations = matchesData.filter(
        (m: Match) => m.stage !== "group" && m.status === "pending"
      ).length;

      const newStats = {
        totalMatches: matchesData.length,
        completedMatches,
        activeCategories: categoriesData.length,
        activeTournaments: tournamentsData.length,
        todayMatches,
        pendingEliminations,
      };

      console.log("📈 PROGRESO: Estadísticas calculadas:", newStats);
      setStats(newStats);
      setLastUpdate(new Date());
      console.log("✅ PROGRESO: Dashboard actualizado exitosamente");
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Error cargando datos del dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh cada 5 minutos
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleViewCategory = (categoryId: string) => {
    // Buscar la categoría para obtener su slug
    const category = categories.find((c) => c.id === categoryId);
    const slug = category?.slug || categoryId;
    router.push(`/live/${slug}`);
  };

  const getProgressPercentage = (tournament: Tournament) => {
    const tournamentMatches = matches.filter(
      (m: Match) => m.tournamentId === tournament.id
    );
    const completed = tournamentMatches.filter(
      (m: Match) => m.status === "completed"
    ).length;
    return tournamentMatches.length > 0
      ? Math.round((completed / tournamentMatches.length) * 100)
      : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-gray-600">Cargando datos del sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Profesional */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-1">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                Progreso del Sistema
              </h1>
              <p className="text-gray-600 text-sm">
                Monitoreo y control de torneos en tiempo real
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Actualización automática</span>
                </div>
                <p className="text-xs text-gray-400">
                  Última actualización: {lastUpdate.toLocaleTimeString()}
                </p>
              </div>
              <Button
                onClick={loadDashboardData}
                variant="outline"
                size="sm"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Activity
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Actualizando..." : "Actualizar"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Métricas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Torneos Activos
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.activeTournaments}
                  </p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Trophy className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Partidos Completados
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.completedMatches}
                  </p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Partidos Hoy
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.todayMatches}
                  </p>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Categorías Activas
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.activeCategories}
                  </p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Torneos en Progreso */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-100 bg-gray-50">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Trophy className="h-5 w-5 text-blue-600" />
                  Torneos en Progreso
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Estado actual de todos los torneos activos
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {tournaments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No hay torneos activos</p>
                    </div>
                  ) : (
                    tournaments.slice(0, 5).map((tournament) => {
                      const progress = getProgressPercentage(tournament);
                      const categoryCount = categories.filter(
                        (c) => c.tournamentId === tournament.id
                      ).length;
                      return (
                        <div
                          key={tournament.id}
                          className="p-4 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {tournament.name}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {tournament.slug} • {categoryCount} categorías
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs font-medium"
                            >
                              {progress}% completado
                            </Badge>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel de Control */}
          <div className="space-y-6">
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-100 bg-gray-50">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Accesos Rápidos
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Vistas en tiempo real
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {categories.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <Eye className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs">No hay categorías</p>
                  </div>
                ) : (
                  categories.slice(0, 4).map((category) => (
                    <Button
                      key={category.id}
                      variant="outline"
                      className="w-full justify-start text-left hover:bg-blue-50 hover:border-blue-200"
                      onClick={() => handleViewCategory(category.id)}
                    >
                      <Eye className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="flex-1">{category.name}</span>
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                    </Button>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Alertas del Sistema */}
            {stats.pendingEliminations > 0 && (
              <Card className="border-orange-200 bg-orange-50 shadow-sm">
                <CardHeader className="border-b border-orange-100">
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <AlertCircle className="h-5 w-5" />
                    Alertas del Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium text-orange-800">
                          {stats.pendingEliminations} eliminatorias pendientes
                        </p>
                        <p className="text-xs text-orange-600">
                          Listas para programar en el calendario
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Resumen de Actividad */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Resumen de Actividad del Sistema
            </CardTitle>
            <CardDescription className="text-gray-600">
              Métricas generales de rendimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="p-3 bg-gray-50 rounded-lg mb-3 mx-auto w-fit">
                  <Play className="h-6 w-6 text-gray-700" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalMatches}
                </p>
                <p className="text-sm text-gray-600">Total de Partidos</p>
              </div>
              <div className="text-center">
                <div className="p-3 bg-green-50 rounded-lg mb-3 mx-auto w-fit">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completedMatches}
                </p>
                <p className="text-sm text-gray-600">Finalizados</p>
              </div>
              <div className="text-center">
                <div className="p-3 bg-orange-50 rounded-lg mb-3 mx-auto w-fit">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.totalMatches - stats.completedMatches}
                </p>
                <p className="text-sm text-gray-600">Pendientes</p>
              </div>
              <div className="text-center">
                <div className="p-3 bg-blue-50 rounded-lg mb-3 mx-auto w-fit">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalMatches > 0
                    ? Math.round(
                        (stats.completedMatches / stats.totalMatches) * 100
                      )
                    : 0}
                  %
                </p>
                <p className="text-sm text-gray-600">Progreso Global</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
