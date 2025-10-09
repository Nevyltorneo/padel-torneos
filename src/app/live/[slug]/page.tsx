"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Users,
  Play,
  Clock,
  Crown,
  Medal,
  RefreshCw,
  Eye,
  Star,
  Target,
} from "lucide-react";
import { Category, Match, Pair } from "@/types";
import { toast } from "sonner";
import {
  getAllCategories,
  getPairs,
  getGroups,
  getAllMatchesByCategory,
  getAllGroupStandings,
  getCourts,
} from "@/lib/supabase-queries";

export default function LiveCategoryViewBySlug() {
  const params = useParams();
  const categorySlug = params.slug as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupMatches, setGroupMatches] = useState<Match[]>([]);
  const [groupStandings, setGroupStandings] = useState<{
    [groupId: string]: { groupName: string; standings: any[] };
  }>({});
  const [courts, setCourts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadCategoryData = async () => {
    try {
      console.log("🔄 Loading category data for slug:", categorySlug);
      setLoading(true);

      // Cargar todas las categorías y buscar por slug
      console.log("📋 Fetching categories...");
      const categories = await getAllCategories();
      console.log("✅ Categories loaded:", categories.length);

      // Buscar por slug primero, luego por ID como fallback
      let currentCategory = categories.find((c) => c.slug === categorySlug);

      // Si no se encuentra por slug, buscar por ID (para compatibilidad con UUIDs)
      if (!currentCategory) {
        currentCategory = categories.find((c) => c.id === categorySlug);

        // Si se encuentra por ID y tiene slug, redirigir automáticamente
        if (currentCategory && currentCategory.slug) {
          console.log(
            "🔄 Redirecting from UUID to slug:",
            currentCategory.slug
          );
          window.location.replace(`/live/${currentCategory.slug}`);
          return;
        }
      }

      console.log("🎯 Current category found:", !!currentCategory);
      setCategory(currentCategory || null);

      if (!currentCategory) {
        console.error("❌ Category not found for slug:", categorySlug);
        toast.error("Categoría no encontrada");
        return;
      }

      // Cargar datos en paralelo
      console.log("🔄 Loading parallel data...");

      try {
        const [pairsData, groupsData, matchesData, standingsData, courtsData] =
          await Promise.all([
            getPairs(currentCategory.id),
            getGroups(currentCategory.id),
            getAllMatchesByCategory(currentCategory.id),
            getAllGroupStandings(currentCategory.id),
            getCourts(currentCategory.tournamentId),
          ]);

        // Establecer todos los datos de una vez
        setCourts(courtsData || []);

        console.log("✅ Data loaded:", {
          pairs: pairsData.length,
          groups: groupsData.length,
          matches: matchesData.length,
          standings: Object.keys(standingsData).length,
          courts: (courtsData || []).length,
        });

        setPairs(pairsData);
        setGroups(groupsData);

        // Separar partidos por etapa
        const groupMatchesData = matchesData.filter((m) => m.stage === "groups");

        setGroupMatches(groupMatchesData);
        setGroupStandings(standingsData);

        console.log("📊 Matches de grupos cargados:", groupMatchesData.length);

        // 🏆 CARGAR CLASIFICADOS SOLO SI HAY ELIMINATORIAS O GRUPOS COMPLETOS
        console.log("✅ Datos de grupos cargados correctamente");

        setLastUpdated(new Date());
        console.log("🎉 Data loading completed successfully");
      } catch (parallelError) {
        console.error("❌ Error in parallel data loading:", parallelError);
        toast.error("Error cargando datos del torneo");
      }
    } catch (error) {
      console.error("❌ Error in loadCategoryData:", error);
      toast.error("Error cargando categoría");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategoryData();
  }, [categorySlug]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadCategoryData();
    }, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, [categorySlug]);

  const getPairName = (pairId: string) => {
    const pair = pairs.find((p) => p.id === pairId);
    return pair
      ? `${pair.player1.name} / ${pair.player2.name}`
      : "Pareja no encontrada";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-700">
            Cargando datos del torneo...
          </h2>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center space-y-4">
          <Trophy className="h-16 w-16 text-red-400 mx-auto" />
          <h2 className="text-2xl font-bold text-red-600">
            Categoría no encontrada
          </h2>
          <p className="text-red-500">
            La categoría solicitada no existe o no está disponible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 lg:mb-12">
          <div className="flex items-center justify-center gap-2 sm:gap-3 lg:gap-4 mb-4">
            <Eye className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              Vista en Tiempo Real
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 lg:gap-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
              <span className="font-medium">{category.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span>{pairs.length} parejas</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span>Actualizado: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>

          <Button
            onClick={loadCategoryData}
            className="mt-4 flex items-center gap-2"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>

        <div className="space-y-6 sm:space-y-8 lg:space-y-12">
          {/* Fase de Grupos - Vista Rápida */}
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 px-2">
              <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-600" />
              Fase de Grupos
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {Object.entries(groupStandings).map(([groupId, groupData]) => (
                <Card
                  key={groupId}
                  className="shadow-lg border-2 border-blue-100"
                >
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Play className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      {groupData.groupName}
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      {groupData.standings.length} parejas •{" "}
                      {groupMatches.filter((m) => m.groupId === groupId).length}{" "}
                      partidos jugados
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 lg:p-6">
                    <div className="space-y-3 sm:space-y-4">
                      <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                        <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                        Tabla de Posiciones
                      </h3>

                      <div className="space-y-2">
                        {groupData.standings.map((standing, index) => (
                          <div
                            key={standing.pairId}
                            className={`p-2 sm:p-3 lg:p-4 rounded-lg border-2 transition-all ${
                              index === 0
                                ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200"
                                : index === 1
                                ? "bg-gradient-to-r from-gray-50 to-blue-50 border-blue-200"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 sm:gap-2">
                                {index === 0 && (
                                  <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
                                )}
                                {index === 1 && (
                                  <Medal className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                )}
                                {index === 2 && (
                                  <Medal className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 flex-shrink-0" />
                                )}
                                <span className="font-medium text-xs sm:text-sm truncate">
                                  {standing.pairName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Badge
                                  variant={
                                    index === 0 ? "default" : "secondary"
                                  }
                                  className="text-xs sm:text-sm"
                                >
                                  {standing.points} pts
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Resumen General de la Categoría */}
          {Object.keys(groupStandings).length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 px-2">
                <Star className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-amber-600" />
                Clasificación General del Torneo
              </h2>

              <Card className="shadow-lg border-2 border-amber-100">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="h-6 w-6 text-amber-600" />
                    Tabla General por Rendimiento
                  </CardTitle>
                  <CardDescription className="text-base">
                    Posiciones finales de todas las parejas ordenadas por rendimiento general
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {(() => {
                      // Combinar todas las parejas de todos los grupos
                      const allStandings: any[] = [];
                      Object.entries(groupStandings).forEach(([groupId, groupData]) => {
                        groupData.standings.forEach((standing) => {
                          allStandings.push({
                            ...standing,
                            groupName: groupData.groupName
                          });
                        });
                      });

                      // Ordenar por criterios CORRECTOS de desempate
                      allStandings.sort((a, b) => {
                        // 1º Puntos (mayor es mejor)
                        if (b.points !== a.points) return b.points - a.points;
                        
                        // 1er criterio de desempate: Diferencia de sets (mayor es mejor)
                        if (b.setsDifference !== a.setsDifference) return b.setsDifference - a.setsDifference;
                        
                        // 2do criterio de desempate: Diferencia de games (mayor es mejor)
                        if (b.gamesDifference !== a.gamesDifference) return b.gamesDifference - a.gamesDifference;
                        
                        // 3er criterio de desempate: Encuentro directo (si son del mismo grupo)
                        // Por ahora mantenemos orden alfabético como último criterio
                        if (a.pairName < b.pairName) return -1;
                        if (a.pairName > b.pairName) return 1;
                        
                        return 0;
                      });

                      return allStandings.map((standing, index) => (
                        <div
                          key={standing.pairId}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            index === 0
                              ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300"
                              : index === 1
                              ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300"
                              : index === 2
                              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                                  index === 0
                                    ? "bg-yellow-500 text-white"
                                    : index === 1
                                    ? "bg-blue-500 text-white"
                                    : index === 2
                                    ? "bg-green-500 text-white"
                                    : "bg-gray-500 text-white"
                                }`}
                              >
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-semibold text-lg">
                                  {standing.pairName}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {standing.groupName} • {standing.matchesPlayed} partidos • {standing.matchesWon} victorias
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant="outline"
                                className="text-lg font-bold"
                              >
                                {standing.points} pts
                              </Badge>
                              <div className="text-sm text-gray-600 mt-1">
                                Sets: {standing.setsWon}-{standing.setsLost}
                              </div>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>

        {/* 🏆 FOOTER PROFESIONAL */}
        <footer className="mt-16 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-2xl overflow-hidden">
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Información del Torneo */}
              <div className="text-center md:text-left">
                <h4 className="text-xl font-bold mb-3 flex items-center gap-2 justify-center md:justify-start">
                  <Trophy className="h-6 w-6 text-yellow-400" />
                  {category?.name || "Torneo Profesional"}
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Sistema profesional de gestión de torneos con tecnología
                  avanzada para una experiencia única.
                </p>
                <p className="text-gray-400 text-xs mt-3">
                  Actualización en tiempo real cada 60 segundos
                </p>
              </div>

              {/* Redes Sociales */}
              <div className="text-center md:text-right">
                <h4 className="text-lg font-semibold mb-3 text-gray-200">
                  Síguenos
                </h4>
                <div className="flex justify-center md:justify-end gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                    <span className="text-white text-sm font-bold">f</span>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:from-pink-600 hover:to-purple-700 transition-colors">
                    <span className="text-white text-sm font-bold">📷</span>
                  </div>
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors">
                    <span className="text-white text-sm font-bold">🎵</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Facebook • Instagram • TikTok</p>
                  <p>¡Síguenos para más torneos!</p>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-gray-700 mt-8 pt-6 text-center">
              <p className="text-gray-400 text-sm">
                © 2025 Sistema de Torneos Profesional •
                <span className="text-blue-400 ml-1">by NevylDev</span> • Todos
                los derechos reservados
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
