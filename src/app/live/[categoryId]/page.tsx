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
  getEliminationMatches,
  getAllGroupStandings,
  getAdvancingPairsWithStats,
  getCourts,
} from "@/lib/supabase-queries";

export default function LiveCategoryView() {
  const params = useParams();
  const categoryId = params.categoryId as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupMatches, setGroupMatches] = useState<Match[]>([]);
  const [eliminationMatches, setEliminationMatches] = useState<Match[]>([]);
  const [groupStandings, setGroupStandings] = useState<{
    [groupId: string]: { groupName: string; standings: any[] };
  }>({});
  const [qualifiedPairs, setQualifiedPairs] = useState<any[]>([]);
  const [bracketInfo, setBracketInfo] = useState<any>(null);
  const [courts, setCourts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadCategoryData = async () => {
    try {
      console.log("🔄 Loading category data for:", categoryId);
      setLoading(true);

      // Cargar categoría
      console.log("📋 Fetching categories...");
      const categories = await getAllCategories();
      console.log("✅ Categories loaded:", categories.length);

      const currentCategory = categories.find((c) => c.id === categoryId);
      console.log("🎯 Current category found:", !!currentCategory);
      setCategory(currentCategory || null);

      if (!currentCategory) {
        console.error("❌ Category not found:", categoryId);
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
        const groupMatchesData = matchesData.filter((m) => m.stage === "group");
        const eliminationMatchesData = matchesData.filter(
          (m) =>
            m.stage === "quarterfinals" ||
            m.stage === "semifinals" ||
            m.stage === "final" ||
            m.stage === "third_place"
        );

        setGroupMatches(groupMatchesData);
        setGroupStandings(standingsData);

        // 🔍 LÓGICA INTELIGENTE: Solo mostrar eliminatorias si existen Y son relevantes
        console.log("🔍 DEBUG ELIMINATORIAS:");
        console.log("  - Total matches loaded:", matchesData.length);
        console.log("  - Group matches:", groupMatchesData.length);
        console.log(
          "  - Elimination matches found:",
          eliminationMatchesData.length
        );
        console.log("  - Elimination matches details:", eliminationMatchesData);

        if (eliminationMatchesData.length > 0) {
          console.log(
            "🏆 Elimination matches found:",
            eliminationMatchesData.length
          );
          setEliminationMatches(eliminationMatchesData);
        } else {
          console.log("📋 No elimination matches yet - staying in group phase");
          setEliminationMatches([]);
        }

        // 🏆 CARGAR CLASIFICADOS SOLO SI HAY ELIMINATORIAS O GRUPOS COMPLETOS
        if (eliminationMatchesData.length > 0) {
          console.log("🎯 Loading qualified pairs for elimination phase...");
          try {
            const qualifiedData = await getAdvancingPairsWithStats(categoryId);
            setQualifiedPairs(qualifiedData.advancingPairs);
            setBracketInfo(qualifiedData.bracketInfo);
            console.log(
              "✅ Qualified pairs loaded:",
              qualifiedData.advancingPairs.length
            );
          } catch (qualifiedError) {
            console.warn("⚠️ Could not load qualified pairs:", qualifiedError);
            setQualifiedPairs([]);
            setBracketInfo(null);
          }
        } else {
          // Si no hay eliminatorias, verificar si los grupos están completos
          const allGroupMatchesCompleted = groupMatchesData.every(
            (m) => m.status === "completed"
          );
          if (allGroupMatchesCompleted && groupMatchesData.length > 0) {
            console.log(
              "🎯 Groups completed - loading potential qualifiers..."
            );
            try {
              const qualifiedData = await getAdvancingPairsWithStats(
                categoryId
              );
              setQualifiedPairs(qualifiedData.advancingPairs);
              setBracketInfo(qualifiedData.bracketInfo);
              console.log(
                "✅ Potential qualifiers loaded:",
                qualifiedData.advancingPairs.length
              );
            } catch (qualifiedError) {
              console.warn(
                "⚠️ Could not load potential qualifiers:",
                qualifiedError
              );
              setQualifiedPairs([]);
              setBracketInfo(null);
            }
          } else {
            console.log(
              "📋 Groups still in progress - no qualifiers to show yet"
            );
            setQualifiedPairs([]);
            setBracketInfo(null);
          }
        }

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
  }, [categoryId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadCategoryData();
    }, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, [categoryId]);

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
          {/* Resultados Detallados por Grupo */}
          {groupMatches.filter((m) => m.status === "completed").length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 px-2">
                <Target className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-green-600" />
                Resultados Detallados por Grupo
              </h2>

              <div className="space-y-6">
                {Object.entries(groupStandings).map(([groupId, groupData]) => (
                  <Card
                    key={groupId}
                    className="shadow-lg border-2 border-green-100"
                  >
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Play className="h-6 w-6 text-green-600" />
                        {groupData.groupName} - Tabla Detallada
                      </CardTitle>
                      <CardDescription className="text-base">
                        {groupData.standings.length} parejas • Resultados
                        completos con criterios de clasificación
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="text-left p-3 font-semibold text-gray-700">
                                Pos
                              </th>
                              <th className="text-left p-3 font-semibold text-gray-700">
                                Pareja
                              </th>
                              <th className="text-center p-3 font-semibold text-gray-700">
                                PJ
                              </th>
                              <th className="text-center p-3 font-semibold text-gray-700">
                                PG
                              </th>
                              <th className="text-center p-3 font-semibold text-gray-700">
                                PP
                              </th>
                              <th className="text-center p-3 font-semibold text-gray-700 hidden sm:table-cell">
                                Sets
                              </th>
                              <th className="text-center p-3 font-semibold text-gray-700 hidden lg:table-cell">
                                Games
                              </th>
                              <th className="text-center p-3 font-semibold text-gray-700">
                                Pts
                              </th>
                              <th className="text-center p-3 font-semibold text-gray-700">
                                Estado
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {groupData.standings.map((standing, index) => (
                              <tr
                                key={standing.pairId}
                                className="hover:bg-gray-50"
                              >
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center">
                                    {index === 0 && (
                                      <Crown className="h-5 w-5 text-yellow-500" />
                                    )}
                                    {index === 1 && (
                                      <Medal className="h-5 w-5 text-gray-400" />
                                    )}
                                    {index === 2 && (
                                      <Medal className="h-5 w-5 text-amber-600" />
                                    )}
                                    <span className="ml-1 font-bold text-lg">
                                      {index + 1}°
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="font-medium text-sm sm:text-base">
                                    {standing.pairName}
                                  </div>
                                </td>
                                <td className="text-center p-3 font-medium">
                                  {standing.matchesPlayed}
                                </td>
                                <td className="text-center p-3 font-semibold text-green-600">
                                  {standing.matchesWon}
                                </td>
                                <td className="text-center p-3 font-semibold text-red-600">
                                  {standing.matchesLost}
                                </td>
                                <td className="text-center p-3 hidden sm:table-cell">
                                  <div className="flex flex-col items-center">
                                    <span className="font-medium">
                                      {standing.setsWon}-{standing.setsLost}
                                    </span>
                                    {standing.setsDifference !== 0 && (
                                      <span
                                        className={`text-xs ${
                                          standing.setsDifference > 0
                                            ? "text-green-600"
                                            : "text-red-600"
                                        }`}
                                      >
                                        (
                                        {standing.setsDifference > 0 ? "+" : ""}
                                        {standing.setsDifference})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center p-3 hidden lg:table-cell">
                                  <div className="flex flex-col items-center">
                                    <span className="font-medium">
                                      {standing.gamesWon}-{standing.gamesLost}
                                    </span>
                                    {standing.gamesDifference !== 0 && (
                                      <span
                                        className={`text-xs ${
                                          standing.gamesDifference > 0
                                            ? "text-green-600"
                                            : "text-red-600"
                                        }`}
                                      >
                                        (
                                        {standing.gamesDifference > 0
                                          ? "+"
                                          : ""}
                                        {standing.gamesDifference})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center p-3">
                                  <Badge
                                    variant={
                                      index === 0 ? "default" : "secondary"
                                    }
                                    className="font-bold"
                                  >
                                    {standing.points}
                                  </Badge>
                                </td>
                                <td className="text-center p-3">
                                  {index === 0 ? (
                                    <Badge className="bg-green-600 text-white">
                                      🏆 Clasificado
                                    </Badge>
                                  ) : index === 1 &&
                                    qualifiedPairs.some(
                                      (q) => q.pair.id === standing.pairId
                                    ) ? (
                                    <Badge className="bg-blue-600 text-white">
                                      ⭐ Mejor 2°
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-gray-600"
                                    >
                                      Eliminado
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Partidos detallados del grupo */}
                      <div className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <Users className="h-5 w-5 text-green-600" />
                          Partidos Jugados en {groupData.groupName}
                        </h3>

                        <div className="space-y-3">
                          {groupMatches
                            .filter(
                              (m) =>
                                m.groupId === groupId &&
                                m.status === "completed"
                            )
                            .map((match) => (
                              <div
                                key={match.id}
                                className="bg-white border border-gray-200 rounded-lg p-4"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm sm:text-base mb-2">
                                      {getPairName(match.pairAId)} vs{" "}
                                      {getPairName(match.pairBId)}
                                    </div>

                                    {/* Mostrar resultado detallado */}
                                    {match.score && (
                                      <div className="text-xs sm:text-sm text-gray-600">
                                        <span className="font-medium">
                                          Resultado:{" "}
                                        </span>
                                        {match.score.pairA?.set1 !==
                                          undefined &&
                                          match.score.pairB?.set1 !==
                                            undefined && (
                                            <>
                                              {match.score.pairA.set1}-
                                              {match.score.pairB.set1}
                                              {match.score.pairA?.set2 !==
                                                undefined &&
                                                match.score.pairB?.set2 !==
                                                  undefined && (
                                                  <>
                                                    , {match.score.pairA.set2}-
                                                    {match.score.pairB.set2}
                                                  </>
                                                )}
                                              {match.score.pairA?.set3 !==
                                                undefined &&
                                                match.score.pairB?.set3 !==
                                                  undefined && (
                                                  <>
                                                    , {match.score.pairA.set3}-
                                                    {match.score.pairB.set3}
                                                    {(match.score.pairA.set3 ||
                                                      0) >= 10 ||
                                                    (match.score.pairB.set3 ||
                                                      0) >= 10
                                                      ? "SD"
                                                      : ""}
                                                  </>
                                                )}
                                            </>
                                          )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-green-50 text-green-700"
                                    >
                                      Finalizado
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
          )}

          {/* Clasificados a Eliminatorias */}
          {qualifiedPairs.length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 px-2">
                <Star className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-amber-600" />
                Clasificación Final por Rendimiento
              </h2>

              <Card className="shadow-lg border-2 border-amber-100">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="h-6 w-6 text-amber-600" />
                    Parejas Clasificadas a Eliminatorias
                  </CardTitle>
                  <CardDescription className="text-base">
                    {bracketInfo && (
                      <>
                        Bracket de {bracketInfo.bracketSize} parejas •{" "}
                        {bracketInfo.totalAdvancing} clasificados
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {qualifiedPairs.map((qualified, index) => (
                      <div
                        key={qualified.pair.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          index < 2
                            ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300"
                            : index < 4
                            ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                index < 2
                                  ? "bg-yellow-500 text-white"
                                  : index < 4
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-500 text-white"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-lg">
                                {qualified.pair.player1.name} /{" "}
                                {qualified.pair.player2.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {qualified.groupStanding.groupName} •{" "}
                                {qualified.groupStanding.groupPosition}° lugar
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant="outline"
                              className="text-lg font-bold"
                            >
                              {qualified.groupStanding.points} pts
                            </Badge>
                            <div className="text-sm text-gray-600 mt-1">
                              Sets: {qualified.groupStanding.setsWon}-
                              {qualified.groupStanding.setsLost}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Eliminatorias - Solo mostrar si existen partidos */}
          {eliminationMatches.length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 px-2">
                <Trophy className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-yellow-600" />
                Fase Eliminatoria
              </h2>

              <Card className="shadow-lg border-2 border-yellow-100">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                    Partidos de Eliminatorias
                  </CardTitle>
                  <CardDescription>
                    Resultados de la fase eliminatoria
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {eliminationMatches.map((match) => {
                      // Función para formatear resultado detallado
                      const getDetailedScore = (match: Match) => {
                        if (match.status !== "completed" || !match.score) {
                          return { scoreA: "0", scoreB: "0", winner: null };
                        }

                        const scoreA = match.score.pairA;
                        const scoreB = match.score.pairB;

                        if (!scoreA || !scoreB) {
                          return { scoreA: "0", scoreB: "0", winner: null };
                        }

                        let resultA = "";
                        let resultB = "";
                        let setsWonA = 0;
                        let setsWonB = 0;

                        // Set 1
                        if (
                          scoreA.set1 !== undefined &&
                          scoreB.set1 !== undefined
                        ) {
                          resultA = `${scoreA.set1}`;
                          resultB = `${scoreB.set1}`;
                          if (scoreA.set1 > scoreB.set1) setsWonA++;
                          else setsWonB++;
                        }

                        // Set 2
                        if (
                          scoreA.set2 !== undefined &&
                          scoreB.set2 !== undefined
                        ) {
                          resultA += `-${scoreA.set2}`;
                          resultB += `-${scoreB.set2}`;
                          if (scoreA.set2 > scoreB.set2) setsWonA++;
                          else setsWonB++;
                        }

                        // Set 3 o Super Death
                        if (
                          scoreA.set3 !== undefined &&
                          scoreB.set3 !== undefined
                        ) {
                          const isSD = scoreA.set3 >= 10 || scoreB.set3 >= 10;
                          resultA += `-${scoreA.set3}${isSD ? "SD" : ""}`;
                          resultB += `-${scoreB.set3}${isSD ? "SD" : ""}`;
                          if (scoreA.set3 > scoreB.set3) setsWonA++;
                          else setsWonB++;
                        }

                        const winner = setsWonA > setsWonB ? "A" : "B";
                        return {
                          scoreA: resultA || "0",
                          scoreB: resultB || "0",
                          winner,
                        };
                      };

                      const { scoreA, scoreB, winner } =
                        getDetailedScore(match);
                      const pairAName = getPairName(match.pairAId);
                      const pairBName = getPairName(match.pairBId);

                      return (
                        <div
                          key={match.id}
                          className={`rounded-lg p-4 border-2 transition-all ${
                            match.status === "completed"
                              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300"
                              : "bg-white border-gray-200 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Badge
                                variant="outline"
                                className="text-sm font-semibold"
                              >
                                {match.stage === "quarterfinals" && "Cuartos"}
                                {match.stage === "semifinals" && "Semifinal"}
                                {match.stage === "final" && "Final"}
                                {match.stage === "third_place" && "3er Lugar"}
                              </Badge>
                            </div>
                            <div className="text-right">
                              {match.status === "completed" ? (
                                <Badge
                                  variant="default"
                                  className="bg-green-600 text-white"
                                >
                                  ✅ Finalizado
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  {match.status === "pending"
                                    ? "Pendiente"
                                    : "En Juego"}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            {/* Pareja A */}
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                              <div className="flex items-center gap-3">
                                {match.status === "completed" &&
                                  winner === "A" && (
                                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">
                                        👑
                                      </span>
                                    </div>
                                  )}
                                <div>
                                  <p
                                    className={`text-lg font-semibold ${
                                      match.status === "completed" &&
                                      winner === "A"
                                        ? "text-green-700 font-bold"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {pairAName}
                                  </p>
                                  {match.status === "completed" &&
                                    scoreA !== "0" && (
                                      <p className="text-lg font-bold text-blue-700 mt-2 bg-blue-50 px-3 py-1 rounded-lg">
                                        📊 {scoreA}
                                      </p>
                                    )}
                                </div>
                              </div>
                            </div>

                            {/* VS */}
                            <div className="text-center">
                              <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full">
                                <span className="text-sm font-bold text-gray-600">
                                  VS
                                </span>
                              </div>
                            </div>

                            {/* Pareja B */}
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                              <div className="flex items-center gap-3">
                                {match.status === "completed" &&
                                  winner === "B" && (
                                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">
                                        👑
                                      </span>
                                    </div>
                                  )}
                                <div>
                                  <p
                                    className={`text-lg font-semibold ${
                                      match.status === "completed" &&
                                      winner === "B"
                                        ? "text-green-700 font-bold"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {pairBName}
                                  </p>
                                  {match.status === "completed" &&
                                    scoreB !== "0" && (
                                      <p className="text-lg font-bold text-blue-700 mt-2 bg-blue-50 px-3 py-1 rounded-lg">
                                        📊 {scoreB}
                                      </p>
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 🏆 FELICITACIONES A LOS GANADORES */}
          {eliminationMatches.length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              <Card className="shadow-2xl border-4 border-yellow-200 bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50">
                <CardHeader className="text-center bg-gradient-to-r from-yellow-100 to-orange-100 rounded-t-lg p-6 sm:p-8">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-600" />
                    <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800">
                      ¡Felicitaciones a los Campeones! 🏆
                    </CardTitle>
                    <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-600" />
                  </div>
                  <CardDescription className="text-base sm:text-lg text-gray-600 font-medium">
                    Resultados finales del torneo - ¡Gracias por su
                    participación!
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 sm:p-8">
                  {/* Encontrar el ganador de la final */}
                  {(() => {
                    const finalMatch = eliminationMatches.find(
                      (m) => m.stage === "final" && m.status === "completed"
                    );
                    const thirdPlaceMatch = eliminationMatches.find(
                      (m) =>
                        m.stage === "third_place" && m.status === "completed"
                    );
                    const semi1 = eliminationMatches.find(
                      (m) =>
                        m.stage === "semifinals" && m.status === "completed"
                    );
                    const semi2 = eliminationMatches.find(
                      (m) =>
                        m.stage === "semifinals" && m.status === "completed"
                    );

                    if (!finalMatch) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-gray-600 text-lg">
                            ⏳ La final aún no se ha jugado
                          </p>
                        </div>
                      );
                    }

                    const winnerPairId =
                      finalMatch.score?.winner ||
                      (finalMatch.score?.pairA && finalMatch.score?.pairB
                        ? finalMatch.score.pairA.set1 +
                            (finalMatch.score.pairA.set2 || 0) +
                            (finalMatch.score.pairA.set3 || 0) >
                          finalMatch.score.pairB.set1 +
                            (finalMatch.score.pairB.set2 || 0) +
                            (finalMatch.score.pairB.set3 || 0)
                          ? finalMatch.pairAId
                          : finalMatch.pairBId
                        : null);

                    const winnerPairName = winnerPairId
                      ? getPairName(winnerPairId)
                      : "Pendiente";
                    const loserPairId =
                      winnerPairId === finalMatch.pairAId
                        ? finalMatch.pairBId
                        : finalMatch.pairAId;
                    const loserPairName = getPairName(loserPairId);

                    // Encontrar perdedores de semifinales para tercer lugar
                    const semiLosers = [];
                    if (semi1) {
                      const semi1Loser =
                        semi1.score?.winner === semi1.pairAId
                          ? semi1.pairBId
                          : semi1.pairAId;
                      semiLosers.push(getPairName(semi1Loser));
                    }
                    if (semi2) {
                      const semi2Loser =
                        semi2.score?.winner === semi2.pairAId
                          ? semi2.pairBId
                          : semi2.pairAId;
                      semiLosers.push(getPairName(semi2Loser));
                    }

                    return (
                      <div className="space-y-6">
                        {/* PODIUM - DINÁMICO */}
                        <div
                          className={`grid gap-4 sm:gap-6 ${
                            thirdPlaceMatch
                              ? "grid-cols-1 md:grid-cols-3"
                              : "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto"
                          }`}
                        >
                          {/* 2do LUGAR - SUBCAMPEÓN */}
                          <div
                            className={`text-center ${
                              thirdPlaceMatch ? "md:order-2" : "md:order-2"
                            }`}
                          >
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 sm:p-6 border-2 border-gray-300 shadow-lg">
                              <div className="flex items-center justify-center mb-3">
                                <Medal className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                                <span className="ml-2 text-lg sm:text-xl font-bold text-gray-700">
                                  2°
                                </span>
                              </div>
                              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
                                Subcampeones
                              </h3>
                              <p className="text-gray-700 font-medium text-sm sm:text-base">
                                {loserPairName}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                                ¡Excelente participación!
                              </p>
                            </div>
                          </div>

                          {/* 1er LUGAR - CAMPEONES */}
                          <div
                            className={`text-center ${
                              thirdPlaceMatch ? "md:order-1" : "md:order-1"
                            }`}
                          >
                            <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-2xl p-4 sm:p-6 border-4 border-yellow-400 shadow-2xl relative">
                              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <div className="bg-yellow-500 text-white px-4 py-1 rounded-full">
                                  <Crown className="h-4 w-4 inline mr-1" />
                                  <span className="text-sm font-bold">
                                    CAMPEONES
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-center mb-3 mt-2">
                                <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-600" />
                              </div>
                              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                                🏆 CAMPEONES 🏆
                              </h3>
                              <p className="text-gray-800 font-bold text-base sm:text-lg">
                                {winnerPairName}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600 mt-2">
                                ¡Felicitaciones por el excelente torneo!
                              </p>
                            </div>
                          </div>

                          {/* 3er LUGAR - SOLO SI EXISTE PARTIDO POR TERCER LUGAR */}
                          {thirdPlaceMatch && (
                            <div className="text-center md:order-3">
                              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-6 border-2 border-amber-400 shadow-lg">
                                <div className="flex items-center justify-center mb-3">
                                  <Medal className="h-8 w-8 sm:h-10 sm:w-10 text-amber-600" />
                                  <span className="ml-2 text-lg sm:text-xl font-bold text-amber-700">
                                    3°
                                  </span>
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
                                  Tercer Lugar
                                </h3>
                                <p className="text-gray-700 font-medium text-sm sm:text-base">
                                  {semiLosers.length > 0
                                    ? semiLosers[0]
                                    : "Por definir"}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-500 mt-2">
                                  ¡Gran desempeño!
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* MENSAJES MOTIVACIONALES */}
                        <div className="text-center space-y-4 py-6">
                          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <h4 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 flex items-center justify-center gap-2">
                              <Star className="h-5 w-5 text-yellow-500" />
                              Mensaje para Todos los Participantes
                              <Star className="h-5 w-5 text-yellow-500" />
                            </h4>
                            <div className="space-y-2 text-sm sm:text-base text-gray-700">
                              <p className="font-medium">
                                🎉 ¡Gracias a todos por participar en este
                                torneo!
                              </p>
                              <p className="text-gray-600">
                                Cada partido fue una demostración de talento,
                                deportividad y pasión por el pádel.
                              </p>
                              <p className="text-gray-600">
                                Los invitamos a seguir participando en futuros
                                torneos y continuar mejorando.
                              </p>
                            </div>
                          </div>

                          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <p className="text-blue-800 font-medium text-sm sm:text-base">
                              💪 "El verdadero campeonato no se mide solo en
                              victorias, sino en el espíritu deportivo y la
                              mejora personal"
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* 🎨 SECCIÓN DE PATROCINADORES ELEGANTE */}
        <div className="mt-12 mb-8">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200 shadow-sm">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                🤝 Gracias a Nuestros Patrocinadores
              </h3>
              <p className="text-sm text-gray-600">
                Hacen posible este torneo profesional
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
              {/* Patrocinador 1 */}
              <div className="text-center group cursor-pointer transition-all duration-300 hover:scale-105">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-2">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">🏢</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-700">
                  Club Deportivo
                </p>
                <p className="text-xs text-gray-500">Patrocinador Principal</p>
              </div>

              {/* Patrocinador 2 */}
              <div className="text-center group cursor-pointer transition-all duration-300 hover:scale-105">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-2">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">🥤</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-700">
                  Bebidas Sport
                </p>
                <p className="text-xs text-gray-500">Hidratación Oficial</p>
              </div>

              {/* Patrocinador 3 */}
              <div className="text-center group cursor-pointer transition-all duration-300 hover:scale-105">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-2">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">🎾</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-700">
                  Raquetas Pro
                </p>
                <p className="text-xs text-gray-500">Equipamiento</p>
              </div>

              {/* Patrocinador 4 */}
              <div className="text-center group cursor-pointer transition-all duration-300 hover:scale-105">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-2">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">👕</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-700">
                  Ropa Deportiva
                </p>
                <p className="text-xs text-gray-500">Vestimenta Oficial</p>
              </div>
            </div>

            {/* Mensaje de agradecimiento */}
            <div className="text-center mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 italic">
                "Un torneo de calidad profesional gracias a nuestros aliados"
              </p>
            </div>
          </div>
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
                © 2024 Sistema de Torneos Profesional •
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
