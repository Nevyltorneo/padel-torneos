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
  Calendar,
  MapPin,
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

        // Cargar canchas por separado para mejor manejo de errores
        let courtsData: any[] = [];
        try {
          courtsData = await getCourts(currentCategory.tournamentId);
          console.log("✅ Courts loaded:", courtsData.length);

          // Si no hay canchas, crear algunas por defecto (solo para mostrar)
          if (courtsData.length === 0) {
            console.log("⚠️ No courts found, using default display");
            courtsData = [];
          }
        } catch (courtsError) {
          console.warn("⚠️ Could not load courts:", courtsError);
          courtsData = [];
        }

        console.log("✅ Data loaded:", {
          pairs: pairsData.length,
          groups: groupsData.length,
          matches: matchesData.length,
          eliminations: eliminationData.length,
          standings: Object.keys(standingsData).length,
          courts: courtsData.length,
        });

        // Debug courts para ver qué nombres tienen
        console.log(
          "🏟️ Courts debug:",
          courtsData.map((c) => ({ id: c.id.slice(0, 8), name: c.name }))
        );
        console.log(
          "🕒 Page loaded at:",
          new Date().toISOString(),
          "Cache buster:",
          Math.random()
        );

        setPairs(pairsData);
        setGroups(groupsData);
        setGroupMatches(matchesData.filter((m) => m.stage === "group"));
        setEliminationMatches(eliminationData);
        setGroupStandings(standingsData);
        setCourts(courtsData);

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

    // Actualizar cada 60 segundos
    const interval = setInterval(() => {
      console.log(
        "🔄 Auto-refresh triggered at:",
        new Date().toLocaleTimeString()
      );
      loadCategoryData();
    }, 60000);
    return () => clearInterval(interval);
  }, [categoryId]);

  const getPairName = (pairId: string) => {
    const pair = pairs.find((p) => p.id === pairId);
    return pair
      ? `${pair.player1.name} / ${pair.player2.name}`
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

  const getTournamentWinners = () => {
    const finishedFinals = eliminationMatches.filter(
      (m) => m.stage === "final" && m.status === "completed"
    );
    const finishedThirdPlace = eliminationMatches.filter(
      (m) => m.stage === "third_place" && m.status === "completed"
    );

    let champion = null;
    let runnerUp = null;
    let thirdPlace = null;

    // Campeón y subcampeón de la final
    if (finishedFinals.length > 0) {
      const finalMatch = finishedFinals[0];
      const championPair = pairs.find((p) => p.id === finalMatch.winnerPairId);
      const runnerUpPair = pairs.find(
        (p) =>
          p.id ===
          (finalMatch.winnerPairId === finalMatch.pairAId
            ? finalMatch.pairBId
            : finalMatch.pairAId)
      );

      champion = championPair;
      runnerUp = runnerUpPair;
    }

    // Tercer lugar
    if (finishedThirdPlace.length > 0) {
      const thirdPlaceMatch = finishedThirdPlace[0];
      const thirdPlacePair = pairs.find(
        (p) => p.id === thirdPlaceMatch.winnerPairId
      );
      thirdPlace = thirdPlacePair;
    }

    const isComplete = champion && runnerUp && thirdPlace;

    return { champion, runnerUp, thirdPlace, isComplete };
  };

  const getScheduledMatches = () => {
    // Obtener todos los partidos que tienen programación (día y hora)
    const allMatches = [...groupMatches, ...eliminationMatches];
    const scheduledMatches = allMatches.filter(
      (match) => match.day && match.startTime
    );

    // Agrupar por día
    const matchesByDay = scheduledMatches.reduce((acc, match) => {
      const day = match.day!;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(match);
      return acc;
    }, {} as { [day: string]: Match[] });

    // Ordenar partidos por hora dentro de cada día
    Object.keys(matchesByDay).forEach((day) => {
      matchesByDay[day].sort((a, b) => {
        const timeA = a.startTime || "00:00";
        const timeB = b.startTime || "00:00";
        return timeA.localeCompare(timeB);
      });
    });

    return matchesByDay;
  };

  const getCourtName = (courtId: string) => {
    console.log("🏟️ getCourtName called with:", courtId);

    if (!courtId) return "Sin cancha asignada";

    const court = courts.find((c) => c.id === courtId);
    console.log("🔍 Found court:", court);

    if (court && court.name && court.name.trim() !== "") {
      console.log("✅ Using court name:", court.name);
      return court.name;
    }

    // Si no encontramos la cancha o no tiene nombre, generar uno amigable
    // Forzar a tomar solo 2 caracteres para que sea más corto
    const shortId = courtId.slice(0, 2).toUpperCase();
    const result = `Cancha ${shortId}`;
    console.log("🔧 Generated court name:", result, "from", courtId);
    return result;
  };

  const getPairNames = (pairId: string) => {
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return "Pareja no encontrada";
    return `${pair.player1.name} / ${pair.player2.name}`;
  };

  const getGroupName = (groupId: string) => {
    if (!groupId) return "Grupo";

    const group = groups.find((g) => g.id === groupId);
    if (group) {
      return group.name; // Esto debería ser "Grupo A", "Grupo B", etc.
    }

    // Fallback si no encontramos el grupo
    return "Grupo";
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getMatchStatusBadge = (match: Match) => {
    switch (match.status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">Finalizado</Badge>
        );
      case "playing":
        return <Badge className="bg-blue-100 text-blue-800">En Juego</Badge>;
      case "scheduled":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Programado</Badge>
        );
      default:
        return <Badge variant="outline">Pendiente</Badge>;
    }
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
  const winners = getTournamentWinners();

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

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Grupos */}
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 px-2">
              <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-600" />
              Fase de Grupos
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
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
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 lg:p-6">
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Play className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                        {groupData.groupName}
                      </CardTitle>
                      <CardDescription className="text-sm sm:text-base">
                        {standings.length} parejas • {completedMatches.length}/
                        {groupMatchesData.length} partidos jugados
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 lg:p-6">
                      {/* Tabla de Posiciones */}
                      <div className="mb-4 sm:mb-6">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                          Tabla de Posiciones
                        </h3>
                        <div className="space-y-2 sm:space-y-3">
                          {standings.map((standing, index) => {
                            // Obtener los partidos de esta pareja en este grupo
                            const pairMatches = groupMatchesData.filter(
                              (match) =>
                                (match.pairAId === standing.pairId ||
                                  match.pairBId === standing.pairId) &&
                                match.status === "completed"
                            );

                            // Debug: Verificar estructura de datos
                            if (pairMatches.length > 0) {
                              console.log(
                                `🔍 BUSCANDO DATOS DETALLADOS para ${standing.pairName}:`,
                                {
                                  pairId: standing.pairId,
                                  matches: pairMatches.map((m) => ({
                                    id: m.id,
                                    scorePairA: m.scorePairA,
                                    scorePairB: m.scorePairB,
                                    score: m.score, // Campo principal donde pueden estar los datos detallados
                                    winnerPairId: m.winnerPairId,
                                    allKeys: Object.keys(m), // Ver qué otros campos tiene
                                    // Buscar en otros posibles campos
                                    rawScoreA: m.score?.pairA,
                                    rawScoreB: m.score?.pairB,
                                    allScoreData: m.score,
                                  })),
                                }
                              );
                            }

                            // Función para formatear el resultado de un partido
                            const formatMatchResult = (
                              match: any,
                              pairId: string
                            ) => {
                              // Ahora con los datos arreglados, deberíamos tener acceso directo a los datos detallados
                              let scoreA = match.scorePairA;
                              let scoreB = match.scorePairB;

                              console.log(
                                `🎯 DEBUG formatMatchResult (ARREGLADO):`,
                                {
                                  matchId: match.id,
                                  scorePairA: scoreA,
                                  scorePairB: scoreB,
                                  scoreField: match.score,
                                  hasDetailedData:
                                    scoreA &&
                                    typeof scoreA === "object" &&
                                    scoreA.set1 !== undefined,
                                }
                              );

                              if (!scoreA || !scoreB) {
                                return "";
                              }

                              // Parsear si es string
                              if (typeof scoreA === "string") {
                                try {
                                  scoreA = JSON.parse(scoreA);
                                } catch (e) {
                                  console.warn("Error parsing scoreA:", scoreA);
                                  return "";
                                }
                              }

                              if (typeof scoreB === "string") {
                                try {
                                  scoreB = JSON.parse(scoreB);
                                } catch (e) {
                                  console.warn("Error parsing scoreB:", scoreB);
                                  return "";
                                }
                              }

                              const isPairA = match.pairAId === pairId;
                              const isWinner = match.winnerPairId === pairId;

                              // Si son objetos con sets detallados (LO QUE QUEREMOS AHORA)
                              if (
                                typeof scoreA === "object" &&
                                typeof scoreB === "object" &&
                                scoreA.set1 !== undefined
                              ) {
                                let result = "";
                                if (isPairA) {
                                  result = `${scoreA.set1}-${scoreB.set1}`;
                                  if (
                                    scoreA.set2 !== undefined &&
                                    scoreB.set2 !== undefined
                                  ) {
                                    result += `, ${scoreA.set2}-${scoreB.set2}`;
                                  }
                                  if (
                                    scoreA.set3 !== undefined &&
                                    scoreB.set3 !== undefined
                                  ) {
                                    result += `, ${scoreA.set3}-${scoreB.set3}`;
                                  }
                                  if (
                                    scoreA.superDeath !== undefined &&
                                    scoreB.superDeath !== undefined
                                  ) {
                                    result += `, ${scoreA.superDeath}-${scoreB.superDeath}SD`;
                                  }
                                } else {
                                  result = `${scoreB.set1}-${scoreA.set1}`;
                                  if (
                                    scoreA.set2 !== undefined &&
                                    scoreB.set2 !== undefined
                                  ) {
                                    result += `, ${scoreB.set2}-${scoreA.set2}`;
                                  }
                                  if (
                                    scoreA.set3 !== undefined &&
                                    scoreB.set3 !== undefined
                                  ) {
                                    result += `, ${scoreB.set3}-${scoreA.set3}`;
                                  }
                                  if (
                                    scoreA.superDeath !== undefined &&
                                    scoreB.superDeath !== undefined
                                  ) {
                                    result += `, ${scoreB.superDeath}-${scoreA.superDeath}SD`;
                                  }
                                }

                                // No agregar indicador aquí, se agregará al final del partido
                                console.log(
                                  `✅ Resultado detallado: "${result}"`
                                );
                                return result;
                              }

                              // Si son números simples (fallback para partidos antiguos)
                              if (
                                typeof scoreA === "number" &&
                                typeof scoreB === "number"
                              ) {
                                let result = isPairA
                                  ? `${scoreA}-${scoreB} sets`
                                  : `${scoreB}-${scoreA} sets`;
                                console.log(
                                  `⚠️ Solo sets ganados: "${result}"`
                                );
                                return result;
                              }

                              // Si llegamos aquí, formato no reconocido
                              console.warn(
                                "🚨 Formato de score no reconocido:",
                                {
                                  scoreA,
                                  scoreB,
                                }
                              );
                              return "";
                            };

                            return (
                              <div
                                key={standing.pairId}
                                className={`flex items-center justify-between p-2 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl border-2 ${
                                  index === 0
                                    ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 shadow-md"
                                    : index === 1
                                    ? "bg-gradient-to-r from-gray-50 to-blue-50 border-gray-300"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-1 min-w-0">
                                  <div
                                    className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-sm sm:text-base lg:text-lg font-bold flex-shrink-0 ${
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
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-sm sm:text-base lg:text-lg truncate">
                                      {standing.pairName}
                                    </p>

                                    {/* Mostrar resultados de partidos */}
                                    {pairMatches.length > 0 ? (
                                      <div className="mt-1 space-y-0.5">
                                        {pairMatches.map(
                                          (match, matchIndex) => {
                                            const result = formatMatchResult(
                                              match,
                                              standing.pairId
                                            );
                                            const isWinner =
                                              match.winnerPairId ===
                                              standing.pairId;
                                            const opponentPair = pairs.find(
                                              (p) =>
                                                p.id ===
                                                (match.pairAId ===
                                                standing.pairId
                                                  ? match.pairBId
                                                  : match.pairAId)
                                            );

                                            // Mostrar incluso si no hay resultado, para debug
                                            return (
                                              <div
                                                key={matchIndex}
                                                className={`text-xs ${
                                                  result
                                                    ? isWinner
                                                      ? "text-green-700 font-medium"
                                                      : "text-red-600"
                                                    : "text-gray-500 italic"
                                                }`}
                                              >
                                                <span className="font-semibold">
                                                  J{matchIndex + 1}:
                                                </span>{" "}
                                                {result ||
                                                  "Sin resultado disponible"}
                                                {opponentPair && (
                                                  <>
                                                    {" vs "}
                                                    {
                                                      opponentPair.player1.name.split(
                                                        " "
                                                      )[0]
                                                    }
                                                    /
                                                    {
                                                      opponentPair.player2.name.split(
                                                        " "
                                                      )[0]
                                                    }
                                                  </>
                                                )}
                                                {result &&
                                                  (isWinner ? " ✅" : " ❌")}
                                              </div>
                                            );
                                          }
                                        )}
                                      </div>
                                    ) : (
                                      <div className="mt-1 text-xs text-gray-500 italic">
                                        Sin partidos completados aún
                                      </div>
                                    )}

                                    <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm text-gray-600 flex-wrap mt-1">
                                      <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></span>
                                        <span className="whitespace-nowrap">
                                          {standing.matchesWon}V
                                        </span>
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></span>
                                        <span className="whitespace-nowrap">
                                          {standing.matchesLost}D
                                        </span>
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></span>
                                        <span className="whitespace-nowrap">
                                          {standing.setsWon}-{standing.setsLost}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <Badge
                                  variant={
                                    index === 0 ? "default" : "secondary"
                                  }
                                  className="text-xs sm:text-sm lg:text-base px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 ml-2 flex-shrink-0"
                                >
                                  {standing.points}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tabla Detallada de Resultados */}
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                          Resultados Detallados
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs sm:text-sm bg-white border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left p-2 sm:p-3 font-semibold text-gray-700">
                                  Pareja
                                </th>
                                <th className="text-center p-1 sm:p-3 font-semibold text-gray-700 text-xs">
                                  PJ
                                </th>
                                <th className="text-center p-1 sm:p-3 font-semibold text-gray-700 text-xs">
                                  PG
                                </th>
                                <th className="text-center p-1 sm:p-3 font-semibold text-gray-700 text-xs">
                                  PP
                                </th>
                                <th className="text-center p-1 sm:p-3 font-semibold text-gray-700 text-xs">
                                  Sets
                                </th>
                                <th className="text-center p-1 sm:p-3 font-semibold text-gray-700 text-xs hidden sm:table-cell">
                                  Games
                                </th>
                                <th className="text-center p-1 sm:p-3 font-semibold text-gray-700 text-xs">
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
                                  <td className="p-2 sm:p-3">
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
                                  </td>
                                  <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">
                                    {standing.matchesPlayed}
                                  </td>
                                  <td className="p-1 sm:p-3 text-center font-semibold text-green-600 text-xs sm:text-sm">
                                    {standing.matchesWon}
                                  </td>
                                  <td className="p-1 sm:p-3 text-center font-semibold text-red-600 text-xs sm:text-sm">
                                    {standing.matchesLost}
                                  </td>
                                  <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center">
                                      <span className="font-medium">
                                        {standing.setsWon}-{standing.setsLost}
                                      </span>
                                      {standing.setsDifference !== 0 && (
                                        <span
                                          className={`text-xs ${
                                            standing.setsDifference > 0
                                              ? "text-green-600"
                                              : "text-red-600"
                                          } sm:ml-1`}
                                        >
                                          (
                                          {standing.setsDifference > 0
                                            ? "+"
                                            : ""}
                                          {standing.setsDifference})
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-1 sm:p-3 text-center text-xs sm:text-sm hidden sm:table-cell">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center">
                                      <span className="font-medium">
                                        {standing.gamesWon}-{standing.gamesLost}
                                      </span>
                                      {standing.gamesDifference !== 0 && (
                                        <span
                                          className={`text-xs ${
                                            standing.gamesDifference > 0
                                              ? "text-green-600"
                                              : "text-red-600"
                                          } sm:ml-1`}
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
                                  <td className="p-1 sm:p-3 text-center">
                                    <Badge
                                      variant={
                                        index === 0 ? "default" : "secondary"
                                      }
                                      className="font-bold text-xs sm:text-sm px-1 sm:px-2 py-0.5 sm:py-1"
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

          {/* Calendario de Partidos */}
          {(() => {
            const scheduledMatches = getScheduledMatches();
            const hasScheduledMatches =
              Object.keys(scheduledMatches).length > 0;

            return hasScheduledMatches ? (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 px-2">
                  <Calendar className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-green-600" />
                  Calendario de Partidos
                </h2>

                <div className="space-y-4">
                  {Object.entries(scheduledMatches)
                    .sort(([dayA], [dayB]) => dayA.localeCompare(dayB))
                    .map(([day, matches]) => (
                      <Card
                        key={day}
                        className="shadow-lg border-2 border-green-100"
                      >
                        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:p-4 lg:p-6">
                          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                            {formatDate(day)}
                          </CardTitle>
                          <CardDescription className="text-sm sm:text-base">
                            {matches.length} partidos programados
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 lg:p-6">
                          <div className="space-y-3">
                            {matches.map((match) => (
                              <div
                                key={match.id}
                                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                              >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                  {/* Información del partido */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h3 className="font-semibold text-gray-900">
                                        {match.stage === "group"
                                          ? getGroupName(match.groupId || "")
                                          : match.stage === "quarterfinals"
                                          ? "Cuartos de Final"
                                          : match.stage === "semifinals"
                                          ? "Semifinal"
                                          : match.stage === "final"
                                          ? "Final"
                                          : match.stage === "third_place"
                                          ? "Tercer Lugar"
                                          : "Partido"}
                                      </h3>
                                      {getMatchStatusBadge(match)}
                                    </div>

                                    <div className="text-sm text-gray-600 space-y-1">
                                      <div className="font-medium">
                                        {getPairNames(match.pairAId)} vs{" "}
                                        {getPairNames(match.pairBId)}
                                      </div>

                                      {/* Resultado si está completado */}
                                      {match.status === "completed" &&
                                        match.scorePairA &&
                                        match.scorePairB && (
                                          <div className="text-xs bg-gray-50 p-2 rounded border">
                                            <span className="font-medium">
                                              Resultado:
                                            </span>{" "}
                                            {match.scorePairA.set1}-
                                            {match.scorePairB.set1}
                                            {match.scorePairA.set2 !==
                                              undefined && (
                                              <>
                                                , {match.scorePairA.set2}-
                                                {match.scorePairB.set2}
                                              </>
                                            )}
                                            {match.scorePairA.set3 !==
                                              undefined && (
                                              <>
                                                , {match.scorePairA.set3}-
                                                {match.scorePairB.set3}
                                              </>
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  </div>

                                  {/* Horario y cancha */}
                                  <div className="flex flex-col sm:flex-row gap-2 text-sm">
                                    <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
                                      <Clock className="h-4 w-4 text-blue-600" />
                                      <span className="font-medium text-blue-800">
                                        {match.startTime}
                                      </span>
                                    </div>

                                    {match.courtId && (
                                      <div className="flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full">
                                        <MapPin className="h-4 w-4 text-green-600" />
                                        <span className="font-medium text-green-800">
                                          {getCourtName(match.courtId)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ) : null;
          })()}

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
                                {qualified.pair.player1.name} /{" "}
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
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 px-2">
              <Trophy className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-yellow-600" />
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
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 sm:p-4 lg:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                    Partidos de Eliminatorias
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Resultados de la fase eliminatoria
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="space-y-3 sm:space-y-4 lg:space-y-6">
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
                          className={`p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl border-2 shadow-md ${
                            match.status === "completed"
                              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300"
                              : "bg-gradient-to-r from-gray-50 to-blue-50 border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="text-lg sm:text-xl lg:text-2xl">
                                {stageInfo.icon}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs sm:text-sm lg:text-base px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 ${
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
                                className="bg-green-100 text-green-700 border-green-300 text-xs sm:text-sm lg:text-base px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2"
                              >
                                ✅ Finalizado
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                            {/* Pareja A */}
                            <div className="flex items-center justify-between p-2 sm:p-3 lg:p-4 bg-white rounded-lg border border-gray-200">
                              <div
                                className={`flex items-center gap-2 sm:gap-3 flex-1 min-w-0 ${
                                  match.winnerPairId === match.pairAId
                                    ? "font-bold text-green-700"
                                    : "text-gray-700"
                                }`}
                              >
                                {match.winnerPairId === match.pairAId && (
                                  <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm sm:text-base lg:text-lg font-semibold truncate">
                                    {pairA?.player1.name} /{" "}
                                    {pairA?.player2.name}
                                  </p>
                                  {match.winnerPairId === match.pairAId && (
                                    <p className="text-xs sm:text-sm text-green-600 font-medium">
                                      🏆 Ganador
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800 bg-gray-100 px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 rounded-lg ml-2 flex-shrink-0 min-w-0 leading-tight">
                                <span className="block text-center break-all">
                                  {scoreA}
                                </span>
                              </div>
                            </div>

                            {/* VS */}
                            <div className="text-center">
                              <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-200 rounded-full">
                                <span className="text-sm sm:text-base lg:text-lg font-bold text-gray-600">
                                  VS
                                </span>
                              </div>
                            </div>

                            {/* Pareja B */}
                            <div className="flex items-center justify-between p-2 sm:p-3 lg:p-4 bg-white rounded-lg border border-gray-200">
                              <div
                                className={`flex items-center gap-2 sm:gap-3 flex-1 min-w-0 ${
                                  match.winnerPairId === match.pairBId
                                    ? "font-bold text-green-700"
                                    : "text-gray-700"
                                }`}
                              >
                                {match.winnerPairId === match.pairBId && (
                                  <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm sm:text-base lg:text-lg font-semibold truncate">
                                    {pairB?.player1.name} /{" "}
                                    {pairB?.player2.name}
                                  </p>
                                  {match.winnerPairId === match.pairBId && (
                                    <p className="text-xs sm:text-sm text-green-600 font-medium">
                                      🏆 Ganador
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800 bg-gray-100 px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 rounded-lg ml-2 flex-shrink-0 min-w-0 leading-tight">
                                <span className="block text-center break-all">
                                  {scoreB}
                                </span>
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

          {/* Sección de Felicitaciones a los Ganadores */}
          {winners.isComplete && (
            <div className="mt-8 mb-12 px-4">
              <Card className="bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 border-4 border-yellow-400 shadow-2xl max-w-7xl mx-auto">
                <CardContent className="p-4 sm:p-6 lg:p-12">
                  <div className="text-center space-y-6 lg:space-y-10">
                    {/* Título Principal */}
                    <div className="space-y-3 lg:space-y-6">
                      <div className="flex justify-center">
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 lg:p-4 rounded-full shadow-lg">
                          <Trophy className="h-12 w-12 lg:h-16 lg:w-16 text-white" />
                        </div>
                      </div>
                      <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent px-4">
                        🎉 ¡Felicitaciones! 🎉
                      </h2>
                      <p className="text-sm sm:text-base lg:text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed px-4">
                        Ha concluido oficialmente el torneo de la categoría{" "}
                        <span className="font-bold text-blue-600 text-lg sm:text-xl lg:text-2xl">
                          {category.name}
                        </span>
                        . Felicitamos a todos los participantes por su excelente
                        nivel y deportividad.
                      </p>
                    </div>

                    {/* Podio Responsive */}
                    <div className="space-y-6 lg:space-y-8">
                      {/* Campeones - Primera fila en móvil */}
                      <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-4 lg:p-6 rounded-2xl shadow-xl border-4 border-yellow-500 relative overflow-hidden">
                        {/* Confeti animado de fondo */}
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-500/10 animate-pulse"></div>

                        <div className="relative z-10 text-center space-y-4 lg:space-y-6">
                          <div className="flex justify-center">
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 lg:p-4 rounded-full shadow-xl animate-bounce">
                              <Crown className="h-12 w-12 lg:h-16 lg:w-16 text-white" />
                            </div>
                          </div>

                          <div className="space-y-2 lg:space-y-4">
                            <h3 className="text-xl sm:text-2xl lg:text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                              👑 ¡CAMPEONES! 👑
                            </h3>
                            <p className="text-base sm:text-lg lg:text-2xl font-bold text-gray-800 px-2">
                              {winners.champion?.player1.name} /{" "}
                              {winners.champion?.player2.name}
                            </p>
                            <div className="flex justify-center my-3 lg:my-4">
                              <div className="bg-yellow-200 p-3 lg:p-4 rounded-xl shadow-inner">
                                <span className="text-4xl lg:text-6xl">🏆</span>
                              </div>
                            </div>
                            <p className="text-sm sm:text-base lg:text-lg font-semibold text-yellow-700">
                              ¡Excelente juego! ¡Se lo merecen!
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Grid para Subcampeones y Tercer Lugar */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8 max-w-5xl mx-auto">
                        {/* Subcampeones */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 lg:p-6 rounded-2xl shadow-xl border-4 border-gray-400 transform hover:scale-105 transition-transform duration-300">
                          <div className="text-center space-y-3 lg:space-y-4">
                            <div className="flex justify-center">
                              <div className="bg-gradient-to-r from-gray-400 to-gray-500 p-2 lg:p-3 rounded-full shadow-lg">
                                <Medal className="h-8 w-8 lg:h-12 lg:w-12 text-white" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-700">
                                🥈 Subcampeones
                              </h3>
                              <p className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 px-2">
                                {winners.runnerUp?.player1.name} /{" "}
                                {winners.runnerUp?.player2.name}
                              </p>
                              <div className="bg-gray-200 p-2 lg:p-3 rounded-lg mx-auto w-fit">
                                <span className="text-2xl lg:text-4xl">🥈</span>
                              </div>
                              <p className="text-xs sm:text-sm lg:text-base text-gray-600">
                                ¡Gran actuación!
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Tercer Lugar */}
                        <div className="bg-gradient-to-br from-orange-50 to-red-100 p-4 lg:p-6 rounded-2xl shadow-xl border-4 border-orange-500 transform hover:scale-105 transition-transform duration-300">
                          <div className="text-center space-y-3 lg:space-y-4">
                            <div className="flex justify-center">
                              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 lg:p-3 rounded-full shadow-lg">
                                <Medal className="h-8 w-8 lg:h-12 lg:w-12 text-white" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-700">
                                🥉 Tercer Lugar
                              </h3>
                              <p className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 px-2">
                                {winners.thirdPlace?.player1.name} /{" "}
                                {winners.thirdPlace?.player2.name}
                              </p>
                              <div className="bg-orange-200 p-2 lg:p-3 rounded-lg mx-auto w-fit">
                                <span className="text-2xl lg:text-4xl">🥉</span>
                              </div>
                              <p className="text-xs sm:text-sm lg:text-base text-orange-600">
                                ¡Muy buen nivel!
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mensaje de Agradecimiento Mejorado */}
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-4 border-blue-300 p-4 sm:p-6 lg:p-8 rounded-2xl shadow-xl max-w-5xl mx-auto">
                      <div className="space-y-4 lg:space-y-6">
                        <div className="flex justify-center">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 lg:p-3 rounded-full shadow-lg">
                            <Users className="h-8 w-8 lg:h-10 lg:w-10 text-white" />
                          </div>
                        </div>

                        <h3 className="text-lg sm:text-xl lg:text-3xl font-bold text-gray-800 mb-4">
                          🙏 ¡Gracias por Participar! 🙏
                        </h3>

                        <div className="space-y-3 lg:space-y-4 text-sm sm:text-base lg:text-lg text-gray-700 leading-relaxed">
                          <p className="bg-white/70 p-3 lg:p-4 rounded-xl">
                            <strong>Agradecemos profundamente</strong> a todos
                            los participantes por hacer de este torneo una
                            experiencia increíble. Su pasión por el pádel y su
                            espíritu deportivo han sido ejemplares.
                          </p>

                          <div className="bg-gradient-to-r from-red-50 to-pink-50 p-3 lg:p-4 rounded-xl border-2 border-red-200">
                            <p className="font-semibold text-red-600 flex items-center justify-center gap-2 flex-wrap">
                              <span className="text-xl lg:text-2xl">🐕</span>
                              <span className="text-center">
                                Cada torneo que organizamos contribuye a una
                                causa noble:
                                <br className="sm:hidden" />
                                <strong className="text-red-700">
                                  ayudar a los perritos de la calle
                                </strong>
                                <br className="sm:hidden" />
                                con alimento y cuidados veterinarios
                              </span>
                              <span className="text-xl lg:text-2xl">❤️</span>
                            </p>
                          </div>

                          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 lg:p-4 rounded-xl border-2 border-green-300">
                            <p className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent text-center">
                              🌟 ¡Esperamos verlos en la siguiente edición! 🌟
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-center flex-wrap gap-2 lg:gap-4 text-2xl lg:text-3xl pt-4">
                          <span
                            className="animate-bounce"
                            style={{ animationDelay: "0s" }}
                          >
                            🐕
                          </span>
                          <span
                            className="animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          >
                            🏆
                          </span>
                          <span
                            className="animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          >
                            🎾
                          </span>
                          <span
                            className="animate-bounce"
                            style={{ animationDelay: "0.3s" }}
                          >
                            ❤️
                          </span>
                          <span
                            className="animate-bounce"
                            style={{ animationDelay: "0.4s" }}
                          >
                            🌟
                          </span>
                          <span
                            className="animate-bounce"
                            style={{ animationDelay: "0.5s" }}
                          >
                            🎉
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
