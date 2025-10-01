"use client";

import { useState, useEffect, use, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Crown,
  Medal,
  Calendar,
  Clock,
  Users,
  Target,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Match, Pair, Tournament } from "@/types";
import {
  getTournaments,
  getCategories,
  getPairs,
  getKnockoutMatches,
  getAllMatchesByCategory,
} from "@/lib/supabase-queries";
import { useRealtimeMatches } from "@/hooks/useRealtimeMatches";
import { useRealtimeStandings } from "@/hooks/useRealtimeStandings";
import { RealtimeIndicator } from "@/components/realtime/RealtimeIndicator";

interface PublicTournamentPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function PublicTournamentPage({
  params,
}: PublicTournamentPageProps) {
  const resolvedParams = use(params);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [allPairs, setAllPairs] = useState<Pair[]>([]);
  const [currentCategory, setCurrentCategory] = useState<{ id: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // Hooks de tiempo real
  const { matches: knockoutMatches, isConnected: isMatchesConnected } =
    useRealtimeMatches({
      categoryId: currentCategory?.id || "",
      initialMatches: [],
    });

  const { standings: summary } = useRealtimeStandings({
    categoryId: currentCategory?.id || "",
    allPairs,
  });

  const fetchTournamentData = useCallback(async () => {
    try {
      setLoading(true);

      // Buscar torneo por slug
      const tournaments = await getTournaments();
      const currentTournament = tournaments.find(
        (t) => t.slug === resolvedParams.slug
      );

      if (!currentTournament) {
        setLoading(false);
        return;
      }

      setTournament(currentTournament);

      // Obtener categorías
      const categories = await getCategories(currentTournament.id);
      if (categories.length === 0) {
        setLoading(false);
        return;
      }

      const firstCategory = categories[0];
      setCurrentCategory(firstCategory);

      // Obtener parejas
      const pairsData = await getPairs(firstCategory.id);
      setAllPairs(pairsData);
      // knockoutMatches se actualiza automáticamente via useRealtimeMatches
    } catch (error) {
      console.error("Error loading tournament data:", error);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.slug]);

  const getPairById = (pairId: string) => {
    return allPairs.find((p) => p.id === pairId);
  };

  const formatPairName = (pair?: Pair) => {
    if (!pair) return "Pareja no encontrada";
    return `${pair.player1.name} / ${pair.player2.name}`;
  };

  const getMatchesByStage = (stage: string) => {
    return knockoutMatches
      .filter((m) => m.stage === stage)
      .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
  };

  // Generar resumen de resultados (ACTUALIZADO para incluir partidos de grupos)
  // Ya no necesitamos generateTournamentSummary - se actualiza automáticamente via hooks de tiempo real
  useEffect(() => {
    fetchTournamentData();
  }, [fetchTournamentData]);

  // Las estadísticas se actualizan automáticamente via hooks de tiempo real
  // useEffect(() => {
  //   const loadTournamentSummary = async () => { ... };
  //   if (currentCategory && allPairs.length > 0) {
  //     loadTournamentSummary();
  //   }
  // }, [...]);

  const formatScore = (match: Match) => {
    if (!match.scorePairA || !match.scorePairB) return "";

    const scoreA = match.scorePairA;
    const scoreB = match.scorePairB;

    let result = `${scoreA.set1}-${scoreB.set1}, ${scoreA.set2}-${scoreB.set2}`;

    if (scoreA.set3 !== undefined && scoreB.set3 !== undefined) {
      result += `, ${scoreA.set3}-${scoreB.set3}`;
    }

    if (scoreA.superDeath !== undefined && scoreB.superDeath !== undefined) {
      result += ` (SD: ${scoreA.superDeath}-${scoreB.superDeath})`;
    }

    return result;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-blue-500 animate-pulse" />
          <p className="text-xl text-gray-600">Cargando torneo...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="py-12">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              Torneo no encontrado
            </h2>
            <p className="text-gray-500">
              El torneo que buscas no existe o no está disponible públicamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const quarterfinals = getMatchesByStage("quarterfinal");
  const semifinals = getMatchesByStage("semifinals"); // Usar 'semifinals' (plural) que funciona
  const finals = getMatchesByStage("final");
  // const thirdPlace = getMatchesByStage("third_place");

  // Función para determinar el nombre de la etapa basándose en el número de partidos
  const getStageName = (matches: any[]) => {
    const count = matches.length;
    if (count === 1) return "Final";
    if (count === 2) return "Semifinales";
    if (count === 4) return "Cuartos de Final";
    if (count === 8) return "Octavos de Final";
    return "Eliminatorias";
  };

  // Combinar todos los partidos de eliminatorias para mostrar dinámicamente
  const allEliminationMatches = [...quarterfinals, ...semifinals, ...finals];
  const currentStageName = getStageName(allEliminationMatches);

  // Debug para verificar datos
  console.log("🔍 Public View Debug:", {
    summaryLength: summary.length,
    knockoutMatchesLength: knockoutMatches.length,
    quarterfinalsLength: quarterfinals.length,
    summary: summary.map((s) => ({
      pair: `${s.pair.player1.name}/${s.pair.player2.name}`,
      position: s.position,
      matchesPlayed: s.matchesPlayed,
      matchesWon: s.matchesWon,
    })),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-cyan-50">
      {/* Header con diseño mejorado */}
      <div className="bg-gradient-to-r from-emerald-600 via-blue-600 to-cyan-600 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <Trophy className="h-16 w-16 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-white drop-shadow-lg">
                {tournament.name}
              </h1>
            </div>
            <p className="text-xl text-white/90 mb-6 font-medium">
              ¡Es hora de demostrar tu mejor juego!
            </p>
            <div className="flex items-center justify-center gap-8 text-white/90">
              <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3">
                <Calendar className="h-6 w-6" />
                <span className="font-semibold">
                  {new Date(tournament.createdAt || "").toLocaleDateString(
                    "es-ES",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </span>
              </div>
              <Badge
                variant="secondary"
                className="bg-white/20 text-white border-white/30 backdrop-blur-sm"
              >
                🏆 Vista Pública
              </Badge>
              <RealtimeIndicator
                isConnected={isMatchesConnected}
                lastUpdate={new Date()}
                showLastUpdate={true}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Sección de Bienvenida Motivacional */}
        <Card className="bg-gradient-to-r from-emerald-100 to-blue-100 border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="bg-emerald-500 rounded-full p-3">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800">
                  ¡Bienvenido al Torneo!
                </h2>
              </div>
              <p className="text-lg text-gray-700 mb-6">
                Es hora de demostrar tu mejor juego
              </p>

              {/* Tags informativos */}
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <div className="bg-white rounded-full px-6 py-3 shadow-md flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  <span className="font-semibold text-gray-800">
                    {new Date(tournament.createdAt || "").toLocaleDateString(
                      "es-ES"
                    )}
                  </span>
                </div>
                <div className="bg-white rounded-full px-6 py-3 shadow-md flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-gray-800">
                    Tu Categoría
                  </span>
                </div>
              </div>

              {/* Reglas del juego */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-2">
                  <span className="text-red-500">❤️</span>
                  ¡Estos son tus horarios de juego!
                  <span className="text-emerald-500">🎾</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-8 w-8 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-gray-800 mb-2">
                      Puntualidad
                    </h4>
                    <p className="text-sm text-gray-600">
                      Llega 10 minutos antes de cada juego
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h4 className="font-bold text-gray-800 mb-2">Respeto</h4>
                    <p className="text-sm text-gray-600">
                      Respeta a tu rival y mantén un juego limpio
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-cyan-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <Target className="h-8 w-8 text-cyan-600" />
                    </div>
                    <h4 className="font-bold text-gray-800 mb-2">Excelencia</h4>
                    <p className="text-sm text-gray-600">
                      Da lo mejor de ti y ¡diviértete!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Estadísticas Completas */}
        {summary.length > 0 && (
          <Card className="shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-3">
                📊 Estadísticas del Torneo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-emerald-100 to-blue-100">
                      <th className="border border-emerald-200 px-4 py-3 text-left font-bold text-gray-800">
                        Posición
                      </th>
                      <th className="border border-emerald-200 px-4 py-3 text-left font-bold text-gray-800">
                        Pareja
                      </th>
                      <th className="border border-emerald-200 px-4 py-3 text-center font-bold text-gray-800">
                        PJ
                      </th>
                      <th className="border border-emerald-200 px-4 py-3 text-center font-bold text-gray-800">
                        PG
                      </th>
                      <th className="border border-emerald-200 px-4 py-3 text-center font-bold text-gray-800">
                        PP
                      </th>
                      <th className="border border-emerald-200 px-4 py-3 text-center font-bold text-gray-800">
                        Sets G
                      </th>
                      <th className="border border-emerald-200 px-4 py-3 text-center font-bold text-gray-800">
                        Sets P
                      </th>
                      <th className="border border-emerald-200 px-4 py-3 text-center font-bold text-gray-800">
                        Games G
                      </th>
                      <th className="border border-emerald-200 px-4 py-3 text-center font-bold text-gray-800">
                        Games P
                      </th>
                      <th className="border border-emerald-200 px-4 py-3 text-center font-bold text-gray-800">
                        Efectividad
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((stat) => {
                      const bgColor =
                        stat.position === 1
                          ? "bg-yellow-50"
                          : stat.position === 2
                          ? "bg-gray-50"
                          : stat.position === 3
                          ? "bg-orange-50"
                          : "bg-white";

                      return (
                        <tr
                          key={stat.pair.id}
                          className={`${bgColor} hover:bg-emerald-50 transition-colors`}
                        >
                          <td className="border border-emerald-200 px-4 py-3 font-bold text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-2xl">{stat.trophy}</span>
                              <span>
                                {stat.position > 0 ? `${stat.position}°` : "-"}
                              </span>
                            </div>
                          </td>
                          <td className="border border-emerald-200 px-4 py-3 font-semibold text-gray-800">
                            {stat.pair.player1.name} / {stat.pair.player2.name}
                          </td>
                          <td className="border border-emerald-200 px-4 py-3 text-center text-gray-700">
                            {stat.matchesPlayed}
                          </td>
                          <td className="border border-emerald-200 px-4 py-3 text-center font-semibold text-emerald-600">
                            {stat.matchesWon}
                          </td>
                          <td className="border border-emerald-200 px-4 py-3 text-center font-semibold text-red-500">
                            {stat.matchesLost}
                          </td>
                          <td className="border border-emerald-200 px-4 py-3 text-center font-semibold text-emerald-600">
                            {stat.setsWon}
                          </td>
                          <td className="border border-emerald-200 px-4 py-3 text-center font-semibold text-red-500">
                            {stat.setsLost}
                          </td>
                          <td className="border border-emerald-200 px-4 py-3 text-center font-semibold text-emerald-600">
                            {stat.gamesWon}
                          </td>
                          <td className="border border-emerald-200 px-4 py-3 text-center font-semibold text-red-500">
                            {stat.gamesLost}
                          </td>
                          <td className="border border-emerald-200 px-4 py-3 text-center font-bold text-blue-600">
                            {stat.winRate.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Leyenda */}
              <div className="mt-4 text-sm text-gray-600">
                <p>
                  <strong>PJ:</strong> Partidos Jugados | <strong>PG:</strong>{" "}
                  Partidos Ganados | <strong>PP:</strong> Partidos Perdidos |{" "}
                  <strong>Sets G:</strong> Sets Ganados |{" "}
                  <strong>Sets P:</strong> Sets Perdidos |{" "}
                  <strong>Games G:</strong> Games Ganados |{" "}
                  <strong>Games P:</strong> Games Perdidos
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Podio de Ganadores */}
        {summary.some((s) => s.position > 0) && (
          <Card className="shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-t-lg">
              <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-3">
                <Crown className="h-8 w-8" />
                🏆 Ganadores del Torneo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {summary.slice(0, 3).map((stat, index) => {
                  const heights = ["h-32", "h-40", "h-28"];
                  const colors = [
                    "from-yellow-400 to-yellow-600",
                    "from-gray-300 to-gray-500",
                    "from-orange-400 to-orange-600",
                  ];

                  return (
                    <div key={stat.pair.id} className="text-center">
                      <div
                        className={`bg-gradient-to-b ${colors[index]} ${heights[index]} rounded-lg flex items-end justify-center pb-4 mb-4 shadow-lg`}
                      >
                        <div className="text-white">
                          <div className="text-4xl mb-2">{stat.trophy}</div>
                          <div className="font-bold text-lg">
                            {stat.position}° Lugar
                          </div>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-gray-800">
                        {stat.pair.player1.name}
                      </h3>
                      <h3 className="font-bold text-lg text-gray-800 mb-2">
                        {stat.pair.player2.name}
                      </h3>
                      <div className="text-sm text-gray-600">
                        {stat.matchesWon}G - {stat.matchesLost}P
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bracket Visual */}
        {knockoutMatches.length > 0 && (
          <Card className="shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-3">
                <Medal className="h-6 w-6" />
                Bracket del Torneo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Semifinales */}
                {semifinals.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-center mb-4 text-emerald-600">
                      {currentStageName}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                      {semifinals.map((match) => (
                        <Card
                          key={match.id}
                          className="border-2 border-emerald-200 shadow-lg hover:shadow-xl transition-shadow"
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-emerald-600">
                                  {match.bracketPosition}
                                </span>
                                <Badge
                                  variant={
                                    match.status === "finished"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {match.status === "finished"
                                    ? "Finalizado"
                                    : "Pendiente"}
                                </Badge>
                              </div>

                              <div className="space-y-2">
                                <div
                                  className={`p-2 rounded ${
                                    match.winnerPairId === match.pairAId
                                      ? "bg-emerald-100 border-2 border-emerald-500"
                                      : "bg-gray-50"
                                  }`}
                                >
                                  <div className="font-semibold">
                                    {formatPairName(getPairById(match.pairAId))}
                                  </div>
                                </div>
                                <div className="text-center text-sm text-gray-500">
                                  VS
                                </div>
                                <div
                                  className={`p-2 rounded ${
                                    match.winnerPairId === match.pairBId
                                      ? "bg-emerald-100 border-2 border-emerald-500"
                                      : "bg-gray-50"
                                  }`}
                                >
                                  <div className="font-semibold">
                                    {formatPairName(getPairById(match.pairBId))}
                                  </div>
                                </div>
                              </div>

                              {match.status === "finished" && (
                                <div className="text-center text-sm text-emerald-600 font-medium bg-emerald-50 py-2 rounded">
                                  {formatScore(match)}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Final */}
                {finals.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-center mb-4 text-orange-600">
                      🏆 {currentStageName}
                    </h3>
                    <div className="max-w-md mx-auto">
                      {finals.map((match) => (
                        <Card
                          key={match.id}
                          className="border-4 border-orange-400 shadow-xl"
                        >
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="text-center">
                                <Badge
                                  variant={
                                    match.status === "finished"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-lg px-4 py-1"
                                >
                                  {match.status === "finished"
                                    ? "¡FINALIZADO!"
                                    : "Por jugar"}
                                </Badge>
                              </div>

                              <div className="space-y-3">
                                <div
                                  className={`p-3 rounded-lg text-center ${
                                    match.winnerPairId === match.pairAId
                                      ? "bg-yellow-100 border-3 border-yellow-500"
                                      : "bg-gray-50"
                                  }`}
                                >
                                  <div className="font-bold text-lg">
                                    {formatPairName(getPairById(match.pairAId))}
                                  </div>
                                  {match.winnerPairId === match.pairAId && (
                                    <div className="text-yellow-600 font-bold">
                                      🏆 CAMPEONES
                                    </div>
                                  )}
                                </div>
                                <div className="text-center text-lg font-bold text-gray-500">
                                  VS
                                </div>
                                <div
                                  className={`p-3 rounded-lg text-center ${
                                    match.winnerPairId === match.pairBId
                                      ? "bg-yellow-100 border-3 border-yellow-500"
                                      : "bg-gray-50"
                                  }`}
                                >
                                  <div className="font-bold text-lg">
                                    {formatPairName(getPairById(match.pairBId))}
                                  </div>
                                  {match.winnerPairId === match.pairBId && (
                                    <div className="text-yellow-600 font-bold">
                                      🏆 CAMPEONES
                                    </div>
                                  )}
                                </div>
                              </div>

                              {match.status === "finished" && (
                                <div className="text-center text-lg font-bold text-yellow-700 bg-yellow-50 py-3 rounded-lg">
                                  {formatScore(match)}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enlace a Eliminatorias */}
        {currentCategory && (
          <div className="flex justify-center mb-8">
            <Link href={`/public/elimination/${currentCategory.id}`}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <Crown className="h-5 w-5 mr-2" />
                Ver Eliminatorias en Tiempo Real
                <Trophy className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        )}

        {/* Sección Motivacional Final */}
        <Card className="bg-gradient-to-r from-emerald-100 to-blue-100 border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="bg-emerald-500 rounded-full p-3">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800">
                ¡Que tengas un excelente torneo!
              </h2>
              <div className="bg-blue-500 rounded-full p-3">
                <Trophy className="h-8 w-8 text-white" />
              </div>
            </div>
            <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
              Recuerda: lo importante no es solo ganar, sino disfrutar cada
              punto y crear grandes recuerdos.
            </p>
            <div className="flex justify-center gap-4 mb-6">
              <div className="text-3xl">🏆</div>
              <div className="text-3xl">🎾</div>
              <div className="text-3xl">💪</div>
              <div className="text-3xl">⭐</div>
            </div>
          </CardContent>
        </Card>

        {/* Patrocinadores */}
        <Card className="bg-gradient-to-r from-blue-100 to-cyan-100 border-0 shadow-lg">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-center text-gray-800 mb-6 flex items-center justify-center gap-2">
              <div className="bg-blue-500 rounded-full p-2">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              Patrocinadores Oficiales
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 text-center shadow-md">
                <div className="bg-blue-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  Club Deportivo
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-md">
                <div className="bg-emerald-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  Bebidas Sport
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-md">
                <div className="bg-orange-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  Raquetas Pro
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-md">
                <div className="bg-cyan-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  Ropa Deportiva
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-gray-600">
            Powered by{" "}
            <span className="font-bold text-emerald-600">MiTorneo App</span> 🚀
          </p>
        </div>
      </div>
    </div>
  );
}
