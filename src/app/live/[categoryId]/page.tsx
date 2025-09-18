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
        const [
          pairsData,
          groupsData,
          matchesData,
          eliminationData,
          standingsData,
        ] = await Promise.all([
          getPairs(currentCategory.id),
          getGroups(currentCategory.id),
          getAllMatchesByCategory(currentCategory.id),
          getEliminationMatches(currentCategory.id),
          getAllGroupStandings(currentCategory.id),
        ]);

        console.log("✅ Data loaded:", {
          pairs: pairsData.length,
          groups: groupsData.length,
          matches: matchesData.length,
          eliminations: eliminationData.length,
          standings: Object.keys(standingsData).length,
        });

        setPairs(pairsData);
        setGroups(groupsData);
        setGroupMatches(matchesData.filter((m) => m.stage === "group"));
        setEliminationMatches(eliminationData);
        setGroupStandings(standingsData);

        // Cargar información de clasificados para eliminatorias
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
          // No fallar si no hay clasificados aún
          setQualifiedPairs([]);
          setBracketInfo(null);
        }

        setLastUpdated(new Date());
        console.log("🎉 Data loading completed successfully");
      } catch (parallelError) {
        console.error("❌ Error in parallel data loading:", parallelError);
        throw parallelError; // Re-lanzar para que sea capturado por el catch principal
      }
    } catch (error) {
      console.error("❌ Error loading category data:", error);
      toast.error("Error cargando datos de la categoría");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategoryData();

    // Actualizar cada 30 segundos
    const interval = setInterval(loadCategoryData, 30000);
    return () => clearInterval(interval);
  }, [categoryId]);

  const getPairName = (pairId: string) => {
    const pair = pairs.find((p) => p.id === pairId);
    return pair
      ? `${pair.player1.name} & ${pair.player2.name}`
      : "Pareja no encontrada";
  };

  const getGroupStandings = (groupId: string) => {
    const groupPairs = pairs.filter((p) => {
      // Buscar en qué grupo está la pareja
      const group = groups.find((g) => g.id === groupId);
      return group && group.pairIds.includes(p.id);
    });
    const groupMatchesData = groupMatches.filter((m) => m.groupId === groupId);

    return groupPairs
      .map((pair) => {
        let wins = 0;
        let losses = 0;
        let setsWon = 0;
        let setsLost = 0;

        groupMatchesData.forEach((match) => {
          if (
            match.status === "completed" &&
            match.scorePairA &&
            match.scorePairB
          ) {
            // Calcular sets ganados por cada pareja
            let pairASets = 0;
            let pairBSets = 0;

            // Comparar cada set
            if (match.scorePairA.set1 > match.scorePairB.set1) pairASets++;
            else pairBSets++;

            if (match.scorePairA.set2 > match.scorePairB.set2) pairASets++;
            else pairBSets++;

            // Si hay set3, compararlo también
            if (match.scorePairA.set3 && match.scorePairB.set3) {
              if (match.scorePairA.set3 > match.scorePairB.set3) pairASets++;
              else pairBSets++;
            }

            if (match.pairAId === pair.id) {
              setsWon += pairASets;
              setsLost += pairBSets;
              if (pairASets > pairBSets) wins++;
              else losses++;
            } else if (match.pairBId === pair.id) {
              setsWon += pairBSets;
              setsLost += pairASets;
              if (pairBSets > pairASets) wins++;
              else losses++;
            }
          }
        });

        const points = wins * 3 + (losses === 0 && wins > 0 ? 1 : 0); // 3 puntos por victoria, 1 por empate

        return {
          pair,
          wins,
          losses,
          setsWon,
          setsLost,
          points,
        };
      })
      .sort((a, b) => {
        // Ordenar por puntos, luego por diferencia de sets
        if (b.points !== a.points) return b.points - a.points;
        return b.setsWon - b.setsLost - (a.setsWon - a.setsLost);
      });
  };

  const getEliminationProgress = () => {
    const semifinals = eliminationMatches.filter(
      (m) => m.stage === "semifinals"
    );
    const finals = eliminationMatches.filter((m) => m.stage === "final");
    const thirdPlace = eliminationMatches.filter(
      (m) => m.stage === "third_place"
    );

    return {
      semifinals: {
        total: semifinals.length,
        completed: semifinals.filter((m) => m.status === "completed").length,
      },
      finals: {
        total: finals.length,
        completed: finals.filter((m) => m.status === "completed").length,
      },
      thirdPlace: {
        total: thirdPlace.length,
        completed: thirdPlace.filter((m) => m.status === "completed").length,
      },
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-16 w-16 mx-auto mb-4 text-blue-600 animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Cargando datos en tiempo real...
          </h1>
          <p className="text-gray-600">
            Obteniendo información actualizada del torneo
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Category ID: {categoryId}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Estado:{" "}
            {category ? "Categoría encontrada" : "Buscando categoría..."}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Pairs: {pairs.length} | Groups: {groups.length} | Matches:{" "}
            {groupMatches.length + eliminationMatches.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Debug:{" "}
            {JSON.stringify({ categoryId, loading, category: !!category })}
          </p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Categoría no encontrada
          </h1>
          <p className="text-gray-600">
            La categoría que buscas no existe o ha sido eliminada.
          </p>
        </div>
      </div>
    );
  }

  const progress = getEliminationProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Eye className="h-10 w-10 text-blue-600" />
                Vista en Tiempo Real
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                {category.name} • {pairs.length} parejas • Actualizado:{" "}
                {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
            <Button
              onClick={loadCategoryData}
              variant="outline"
              className="flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Grupos */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              Fase de Grupos
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(groupStandings).map(([groupId, groupData]) => {
                const group = groups.find((g) => g.id === groupId);
                if (!group) return null;

                const standings = groupData.standings;
                const groupMatchesData = groupMatches.filter(
                  (m) => m.groupId === groupId
                );
                const completedMatches = groupMatchesData.filter(
                  (m) => m.status === "completed"
                );

                return (
                  <Card
                    key={group.id}
                    className="shadow-lg border-2 border-blue-100"
                  >
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Play className="h-6 w-6 text-blue-600" />
                        {groupData.groupName}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {standings.length} parejas • {completedMatches.length}/
                        {groupMatchesData.length} partidos jugados
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      {/* Tabla de Posiciones */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-yellow-500" />
                          Tabla de Posiciones
                        </h3>
                        <div className="space-y-2">
                          {standings.map((standing, index) => (
                            <div
                              key={standing.pairId}
                              className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                                index === 0
                                  ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 shadow-md"
                                  : index === 1
                                  ? "bg-gradient-to-r from-gray-50 to-blue-50 border-gray-300"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                                    index === 0
                                      ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-lg"
                                      : index === 1
                                      ? "bg-gradient-to-r from-gray-400 to-blue-400 text-white"
                                      : "bg-gray-300 text-gray-700"
                                  }`}
                                >
                                  {index === 0
                                    ? "🥇"
                                    : index === 1
                                    ? "🥈"
                                    : index + 1}
                                </div>
                                <div>
                                  <p className="font-semibold text-lg">
                                    {standing.pairName}
                                  </p>
                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                      {standing.matchesWon} victorias
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                      {standing.matchesLost} derrotas
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                      {standing.setsWon}-{standing.setsLost}{" "}
                                      sets
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Badge
                                variant={index === 0 ? "default" : "secondary"}
                                className="text-lg px-4 py-2"
                              >
                                {standing.points} pts
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tabla Detallada de Resultados */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-blue-500" />
                          Resultados Detallados
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm bg-white border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
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
                                <th className="text-center p-3 font-semibold text-gray-700">
                                  Sets
                                </th>
                                <th className="text-center p-3 font-semibold text-gray-700">
                                  Games
                                </th>
                                <th className="text-center p-3 font-semibold text-gray-700">
                                  Pts
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {standings.map((standing, index) => (
                                <tr
                                  key={standing.pairId}
                                  className={`border-b hover:bg-gray-50 ${
                                    index === 0
                                      ? "bg-gradient-to-r from-yellow-50 to-orange-50"
                                      : ""
                                  }`}
                                >
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      {index === 0 && (
                                        <Crown className="h-4 w-4 text-yellow-500" />
                                      )}
                                      {index === 1 && (
                                        <Medal className="h-4 w-4 text-gray-400" />
                                      )}
                                      {index === 2 && (
                                        <Medal className="h-4 w-4 text-amber-600" />
                                      )}
                                      <span className="font-medium">
                                        {standing.pairName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    {standing.matchesPlayed}
                                  </td>
                                  <td className="p-3 text-center font-semibold text-green-600">
                                    {standing.matchesWon}
                                  </td>
                                  <td className="p-3 text-center font-semibold text-red-600">
                                    {standing.matchesLost}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="font-medium">
                                      {standing.setsWon}-{standing.setsLost}
                                    </span>
                                    {standing.setsDifference > 0 && (
                                      <span className="text-green-600 ml-1 text-xs">
                                        (+{standing.setsDifference})
                                      </span>
                                    )}
                                    {standing.setsDifference < 0 && (
                                      <span className="text-red-600 ml-1 text-xs">
                                        ({standing.setsDifference})
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="font-medium">
                                      {standing.gamesWon}-{standing.gamesLost}
                                    </span>
                                    {standing.gamesDifference > 0 && (
                                      <span className="text-green-600 ml-1 text-xs">
                                        (+{standing.gamesDifference})
                                      </span>
                                    )}
                                    {standing.gamesDifference < 0 && (
                                      <span className="text-red-600 ml-1 text-xs">
                                        ({standing.gamesDifference})
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    <Badge
                                      variant={
                                        index === 0 ? "default" : "secondary"
                                      }
                                      className="font-bold"
                                    >
                                      {standing.points}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Clasificados a Eliminatorias */}
          {qualifiedPairs.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Star className="h-8 w-8 text-amber-600" />
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
                        {qualifiedPairs.length} parejas clasificadas • Bracket
                        de {bracketInfo.bracketSize} equipos •
                        {bracketInfo.stages.length} etapas:{" "}
                        {bracketInfo.stages.join(" → ")}
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm bg-white border border-gray-200 rounded-lg">
                      <thead className="bg-gradient-to-r from-amber-50 to-yellow-50">
                        <tr>
                          <th className="text-left p-3 font-semibold text-gray-700">
                            Seed
                          </th>
                          <th className="text-left p-3 font-semibold text-gray-700">
                            Pareja
                          </th>
                          <th className="text-center p-3 font-semibold text-gray-700">
                            Grupo Origen
                          </th>
                          <th className="text-center p-3 font-semibold text-gray-700">
                            Pts
                          </th>
                          <th className="text-center p-3 font-semibold text-gray-700">
                            PJ
                          </th>
                          <th className="text-center p-3 font-semibold text-gray-700">
                            Sets
                          </th>
                          <th className="text-center p-3 font-semibold text-gray-700">
                            Games
                          </th>
                          <th className="text-center p-3 font-semibold text-gray-700">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {qualifiedPairs.map((qualified, index) => (
                          <tr
                            key={qualified.pair.id}
                            className={`border-b hover:bg-gray-50 ${
                              qualified.seed <= 4
                                ? "bg-gradient-to-r from-amber-50 to-yellow-50"
                                : qualified.seed <= 8
                                ? "bg-gradient-to-r from-blue-50 to-cyan-50"
                                : "bg-gray-50"
                            }`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    qualified.seed === 1
                                      ? "bg-gradient-to-r from-yellow-400 to-amber-400 text-white shadow-lg"
                                      : qualified.seed === 2
                                      ? "bg-gradient-to-r from-gray-300 to-gray-400 text-white"
                                      : qualified.seed === 3
                                      ? "bg-gradient-to-r from-orange-300 to-red-400 text-white"
                                      : qualified.seed <= 4
                                      ? "bg-gradient-to-r from-amber-200 to-yellow-300 text-gray-800"
                                      : qualified.seed <= 8
                                      ? "bg-gradient-to-r from-blue-200 to-cyan-300 text-gray-800"
                                      : "bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  {qualified.seed}
                                </div>
                                {qualified.seed === 1 && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                                {qualified.seed === 2 && (
                                  <Medal className="h-4 w-4 text-gray-400" />
                                )}
                                {qualified.seed === 3 && (
                                  <Medal className="h-4 w-4 text-amber-600" />
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-gray-900">
                                {qualified.pair.player1.name} &{" "}
                                {qualified.pair.player2.name}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="text-sm">
                                {qualified.groupStanding.groupName}(
                                {qualified.groupStanding.groupPosition}º)
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                variant={
                                  qualified.seed <= 4 ? "default" : "secondary"
                                }
                                className="font-bold"
                              >
                                {qualified.groupStanding.points}
                              </Badge>
                            </td>
                            <td className="p-3 text-center font-medium">
                              {qualified.groupStanding.matchesPlayed}
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-medium">
                                {qualified.groupStanding.setsWon}-
                                {qualified.groupStanding.setsLost}
                              </span>
                              {qualified.groupStanding.setsDiff > 0 && (
                                <span className="text-green-600 ml-1 text-xs">
                                  (+{qualified.groupStanding.setsDiff})
                                </span>
                              )}
                              {qualified.groupStanding.setsDiff < 0 && (
                                <span className="text-red-600 ml-1 text-xs">
                                  ({qualified.groupStanding.setsDiff})
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-medium">
                                {qualified.groupStanding.gamesWon}-
                                {qualified.groupStanding.gamesLost}
                              </span>
                              {qualified.groupStanding.gamesDiff > 0 && (
                                <span className="text-green-600 ml-1 text-xs">
                                  (+{qualified.groupStanding.gamesDiff})
                                </span>
                              )}
                              {qualified.groupStanding.gamesDiff < 0 && (
                                <span className="text-red-600 ml-1 text-xs">
                                  ({qualified.groupStanding.gamesDiff})
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                variant="outline"
                                className={
                                  qualified.groupStanding.groupPosition === 1
                                    ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                    : "bg-blue-100 text-blue-700 border-blue-300"
                                }
                              >
                                {qualified.position}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Leyenda */}
                  <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span>1º lugar de grupo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Medal className="h-4 w-4 text-gray-400" />
                      <span>2º lugar de grupo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-600" />
                      <span>Seed: Posición en bracket</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span>Pts: Puntos (3 por victoria)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Eliminatorias */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-600" />
              Fase Eliminatoria
            </h2>

            {/* Progreso de Eliminatorias */}
            <Card className="shadow-lg border-2 border-yellow-100">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Clock className="h-6 w-6 text-blue-600" />
                  Progreso del Torneo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {/* Semifinales */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Play className="h-6 w-6 text-purple-600" />
                    <span className="font-semibold text-lg">Semifinales</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-40 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            progress.semifinals.total > 0
                              ? (progress.semifinals.completed /
                                  progress.semifinals.total) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {progress.semifinals.completed}/
                      {progress.semifinals.total}
                    </Badge>
                  </div>
                </div>

                {/* Final */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="h-6 w-6 text-yellow-600" />
                    <span className="font-semibold text-lg">Final</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-40 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            progress.finals.total > 0
                              ? (progress.finals.completed /
                                  progress.finals.total) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {progress.finals.completed}/{progress.finals.total}
                    </Badge>
                  </div>
                </div>

                {/* Tercer Lugar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Medal className="h-6 w-6 text-orange-600" />
                    <span className="font-semibold text-lg">Tercer Lugar</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-40 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            progress.thirdPlace.total > 0
                              ? (progress.thirdPlace.completed /
                                  progress.thirdPlace.total) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {progress.thirdPlace.completed}/
                      {progress.thirdPlace.total}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Partidos de Eliminatorias */}
            {eliminationMatches.length > 0 && (
              <Card className="shadow-lg border-2 border-yellow-100">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                    Partidos de Eliminatorias
                  </CardTitle>
                  <CardDescription className="text-base">
                    Resultados de la fase eliminatoria
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {eliminationMatches.map((match) => {
                      const pairA = pairs.find((p) => p.id === match.pairAId);
                      const pairB = pairs.find((p) => p.id === match.pairBId);

                      // Función para formatear el score completo
                      const formatScore = (score: any) => {
                        if (typeof score === "number") {
                          return score.toString();
                        }
                        if (score && typeof score === "object") {
                          let result = `${score.set1}-${score.set2}`;
                          if (score.set3) {
                            result += `-${score.set3}`;
                          }
                          return result;
                        }
                        return "0";
                      };

                      const scoreA = formatScore(match.scorePairA);
                      const scoreB = formatScore(match.scorePairB);

                      const getStageInfo = (stage: string) => {
                        switch (stage) {
                          case "semifinals":
                            return {
                              label: "Semifinal",
                              icon: "🏆",
                              color: "purple",
                            };
                          case "final":
                            return {
                              label: "Final",
                              icon: "👑",
                              color: "yellow",
                            };
                          case "third_place":
                            return {
                              label: "Tercer Lugar",
                              icon: "🥉",
                              color: "orange",
                            };
                          default:
                            return { label: stage, icon: "🏅", color: "blue" };
                        }
                      };

                      const stageInfo = getStageInfo(match.stage);

                      return (
                        <div
                          key={match.id}
                          className={`p-6 rounded-xl border-2 shadow-md ${
                            match.status === "completed"
                              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300"
                              : "bg-gradient-to-r from-gray-50 to-blue-50 border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{stageInfo.icon}</span>
                              <Badge
                                variant="outline"
                                className={`text-lg px-4 py-2 ${
                                  stageInfo.color === "purple"
                                    ? "border-purple-300 text-purple-700 bg-purple-50"
                                    : stageInfo.color === "yellow"
                                    ? "border-yellow-300 text-yellow-700 bg-yellow-50"
                                    : stageInfo.color === "orange"
                                    ? "border-orange-300 text-orange-700 bg-orange-50"
                                    : "border-blue-300 text-blue-700 bg-blue-50"
                                }`}
                              >
                                {stageInfo.label}
                              </Badge>
                            </div>
                            {match.status === "completed" && (
                              <Badge
                                variant="outline"
                                className="bg-green-100 text-green-700 border-green-300 text-lg px-4 py-2"
                              >
                                ✅ Finalizado
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-4">
                            {/* Pareja A */}
                            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                              <div
                                className={`flex items-center gap-3 ${
                                  match.winnerPairId === match.pairAId
                                    ? "font-bold text-green-700"
                                    : "text-gray-700"
                                }`}
                              >
                                {match.winnerPairId === match.pairAId && (
                                  <Crown className="h-5 w-5 text-yellow-500" />
                                )}
                                <div>
                                  <p className="text-lg font-semibold">
                                    {pairA?.player1.name} &{" "}
                                    {pairA?.player2.name}
                                  </p>
                                  {match.winnerPairId === match.pairAId && (
                                    <p className="text-sm text-green-600 font-medium">
                                      🏆 Ganador
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-3xl font-bold text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                                {scoreA}
                              </div>
                            </div>

                            {/* VS */}
                            <div className="text-center">
                              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full">
                                <span className="text-lg font-bold text-gray-600">
                                  VS
                                </span>
                              </div>
                            </div>

                            {/* Pareja B */}
                            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                              <div
                                className={`flex items-center gap-3 ${
                                  match.winnerPairId === match.pairBId
                                    ? "font-bold text-green-700"
                                    : "text-gray-700"
                                }`}
                              >
                                {match.winnerPairId === match.pairBId && (
                                  <Crown className="h-5 w-5 text-yellow-500" />
                                )}
                                <div>
                                  <p className="text-lg font-semibold">
                                    {pairB?.player1.name} &{" "}
                                    {pairB?.player2.name}
                                  </p>
                                  {match.winnerPairId === match.pairBId && (
                                    <p className="text-sm text-green-600 font-medium">
                                      🏆 Ganador
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-3xl font-bold text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                                {scoreB}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
