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
  ArrowLeft,
  TrendingUp,
} from "lucide-react";
import { Category, Match, Pair } from "@/types";
import { toast } from "sonner";
import {
  getAllCategories,
  getPairs,
  getGroups,
  getAllMatchesByCategory,
  getEliminationMatches,
} from "@/lib/supabase-queries";
import { useEliminationStandings } from "@/hooks/useEliminationStandings";
import { useRealtimeMatches } from "@/hooks/useRealtimeMatches";
import { RealtimeIndicator } from "@/components/realtime/RealtimeIndicator";
import Link from "next/link";

export default function PublicEliminationView() {
  const params = useParams();
  const categoryId = params.categoryId as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Hooks en tiempo real
  const { standings, isLoading: isStandingsLoading } = useEliminationStandings({
    categoryId,
  });

  const { matches: eliminationMatches, isConnected: isMatchesConnected } =
    useRealtimeMatches({
      categoryId,
      initialMatches: [],
      stageFilter: ["quarterfinal", "semifinal", "final", "third_place"],
    });

  const loadCategoryData = async () => {
    try {
      console.log("🔄 Loading category data for:", categoryId);
      setLoading(true);

      // Cargar categoría
      const categories = await getAllCategories();
      const currentCategory = categories.find((c) => c.id === categoryId);
      setCategory(currentCategory || null);

      if (!currentCategory) {
        console.error("❌ Category not found:", categoryId);
        toast.error("Categoría no encontrada");
        return;
      }

      // Cargar parejas
      const pairsData = await getPairs(currentCategory.id);
      setPairs(pairsData);

      setLastUpdated(new Date());
      console.log("✅ Public elimination data loaded");
    } catch (error) {
      console.error("Error loading elimination data:", error);
      toast.error("Error cargando datos de eliminatorias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categoryId) {
      loadCategoryData();
    }
  }, [categoryId]);

  const getPairById = (pairId: string): Pair | undefined => {
    return pairs.find((p) => p.id === pairId);
  };

  const formatPairName = (pair: Pair | undefined): string => {
    if (!pair) return "Por definir";
    return `${pair.player1.name} / ${pair.player2.name}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "champion":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Crown className="h-3 w-3 mr-1" />
            Campeón
          </Badge>
        );
      case "runner_up":
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            <Medal className="h-3 w-3 mr-1" />
            Subcampeón
          </Badge>
        );
      case "third_place":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            <Trophy className="h-3 w-3 mr-1" />
            3er Lugar
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <Play className="h-3 w-3 mr-1" />
            En competencia
          </Badge>
        );
      case "eliminated":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            Eliminado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTrophyIcon = (index: number, status: string) => {
    if (status === "champion") return "🥇";
    if (status === "runner_up") return "🥈";
    if (status === "third_place") return "🥉";
    return null;
  };

  const formatScore = (match: Match): string => {
    if (!match.scorePairA || !match.scorePairB) return "";

    try {
      const scoreA =
        typeof match.scorePairA === "string"
          ? JSON.parse(match.scorePairA)
          : match.scorePairA;
      const scoreB =
        typeof match.scorePairB === "string"
          ? JSON.parse(match.scorePairB)
          : match.scorePairB;

      let result = `${scoreA.set1}-${scoreB.set1}, ${scoreA.set2}-${scoreB.set2}`;

      if (scoreA.set3 !== undefined && scoreB.set3 !== undefined) {
        result += `, ${scoreA.set3}-${scoreB.set3}`;
      }

      if (scoreA.superDeath !== undefined && scoreB.superDeath !== undefined) {
        result += ` (SD: ${scoreA.superDeath}-${scoreB.superDeath})`;
      }

      return result;
    } catch (error) {
      console.warn("Error parsing score:", error);
      return "";
    }
  };

  // Separar partidos por etapa
  const currentMatches = eliminationMatches.filter(
    (m) => m.status === "playing"
  );
  const finishedMatches = eliminationMatches.filter(
    (m) => m.status === "finished"
  );
  const pendingMatches = eliminationMatches.filter(
    (m) => m.status === "pending" || m.status === "scheduled"
  );

  if (loading || isStandingsLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Categoría no encontrada
            </h2>
            <Link href="/public">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al torneo
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Eliminatorias - {category.name}
          </h1>
          <p className="text-gray-600">
            Vista en tiempo real para participantes
          </p>
        </div>
        <div className="flex items-center gap-4">
          <RealtimeIndicator
            isConnected={isMatchesConnected}
            lastUpdate={lastUpdated}
          />
          <Link href="/public">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al torneo
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabla de Posiciones de Eliminatorias */}
      {standings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-600" />
                Tabla de Eliminatorias
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <TrendingUp className="h-4 w-4" />
                <span>{standings.length} parejas clasificadas</span>
              </div>
            </div>
            <CardDescription>
              Clasificación actual de las eliminatorias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold text-gray-700">
                      Pos
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700">
                      Pareja
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700">
                      Origen
                    </th>
                    <th className="text-center p-3 font-semibold text-gray-700">
                      PJ
                    </th>
                    <th className="text-center p-3 font-semibold text-gray-700">
                      PG
                    </th>
                    <th className="text-center p-3 font-semibold text-gray-700">
                      Pts
                    </th>
                    <th className="text-center p-3 font-semibold text-gray-700">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((standing, index) => {
                    const trophy = getTrophyIcon(
                      index,
                      standing.eliminationStatus
                    );
                    const isTopThree = [
                      "champion",
                      "runner_up",
                      "third_place",
                    ].includes(standing.eliminationStatus);

                    return (
                      <tr
                        key={standing.pair.id}
                        className={`border-b hover:bg-gray-50 ${
                          isTopThree
                            ? "bg-gradient-to-r from-amber-50 to-transparent"
                            : ""
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {trophy && (
                              <span className="text-lg">{trophy}</span>
                            )}
                            <span className="font-medium text-gray-900">
                              {index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {standing.pair.player1.name}
                            </p>
                            <p className="font-medium text-gray-900">
                              {standing.pair.player2.name}
                            </p>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {standing.groupPosition}
                          </Badge>
                        </td>
                        <td className="text-center p-3 font-medium">
                          {standing.matchesPlayed}
                        </td>
                        <td className="text-center p-3">
                          <span className="font-medium text-green-600">
                            {standing.matchesWon}
                          </span>
                        </td>
                        <td className="text-center p-3">
                          <span className="font-bold text-blue-600">
                            {standing.points}
                          </span>
                        </td>
                        <td className="text-center p-3">
                          {getStatusBadge(standing.eliminationStatus)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partidos en Vivo */}
      {currentMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-red-600" />
              Partidos en Vivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentMatches.map((match) => (
                <Card key={match.id} className="border-red-200 bg-red-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-red-700">
                        {match.stage === "quarterfinal" && "Cuartos de Final"}
                        {match.stage === "semifinal" && "Semifinal"}
                        {match.stage === "final" && "Final"}
                        {match.stage === "third_place" && "3er Lugar"}
                      </h4>
                      <Badge className="bg-red-100 text-red-800 border-red-300">
                        <Play className="h-3 w-3 mr-1" />
                        En vivo
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="p-2 rounded bg-gray-50 border-l-4 border-gray-300">
                        <p className="text-sm font-medium text-gray-800">
                          {formatPairName(getPairById(match.pairAId))}
                        </p>
                      </div>
                      <div className="text-center text-xs text-gray-500">
                        vs
                      </div>
                      <div className="p-2 rounded bg-gray-50 border-l-4 border-gray-300">
                        <p className="text-sm font-medium text-gray-800">
                          {formatPairName(getPairById(match.pairBId))}
                        </p>
                      </div>
                    </div>
                    {match.courtId && (
                      <div className="text-center">
                        <Badge variant="outline" className="text-xs">
                          Cancha {match.courtId}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultados */}
      {finishedMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-600" />
              Resultados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {finishedMatches.slice(-6).map((match) => (
                <Card key={match.id} className="border-green-200 bg-green-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-green-700">
                        {match.stage === "quarterfinal" && "Cuartos de Final"}
                        {match.stage === "semifinal" && "Semifinal"}
                        {match.stage === "final" && "Final"}
                        {match.stage === "third_place" && "3er Lugar"}
                      </h4>
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        Finalizado
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div
                        className={`p-2 rounded border-l-4 ${
                          match.winnerPairId === match.pairAId
                            ? "border-green-500 bg-green-50"
                            : "border-gray-300 bg-gray-50"
                        }`}
                      >
                        <p
                          className={`text-sm font-medium ${
                            match.winnerPairId === match.pairAId
                              ? "text-green-800"
                              : "text-gray-800"
                          }`}
                        >
                          {formatPairName(getPairById(match.pairAId))}
                          {match.winnerPairId === match.pairAId && (
                            <Crown className="inline h-4 w-4 ml-2 text-green-600" />
                          )}
                        </p>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900 bg-white px-3 py-1 rounded border">
                          {formatScore(match)}
                        </div>
                      </div>

                      <div
                        className={`p-2 rounded border-l-4 ${
                          match.winnerPairId === match.pairBId
                            ? "border-green-500 bg-green-50"
                            : "border-gray-300 bg-gray-50"
                        }`}
                      >
                        <p
                          className={`text-sm font-medium ${
                            match.winnerPairId === match.pairBId
                              ? "text-green-800"
                              : "text-gray-800"
                          }`}
                        >
                          {formatPairName(getPairById(match.pairBId))}
                          {match.winnerPairId === match.pairBId && (
                            <Crown className="inline h-4 w-4 ml-2 text-green-600" />
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximos Partidos */}
      {pendingMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Próximos Partidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingMatches.map((match) => (
                <Card key={match.id} className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-blue-700">
                        {match.stage === "quarterfinal" && "Cuartos de Final"}
                        {match.stage === "semifinal" && "Semifinal"}
                        {match.stage === "final" && "Final"}
                        {match.stage === "third_place" && "3er Lugar"}
                      </h4>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                        <Clock className="h-3 w-3 mr-1" />
                        Programado
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="p-2 rounded bg-white border-l-4 border-blue-300">
                        <p className="text-sm font-medium text-gray-800">
                          {formatPairName(getPairById(match.pairAId))}
                        </p>
                      </div>
                      <div className="text-center text-xs text-gray-500">
                        vs
                      </div>
                      <div className="p-2 rounded bg-white border-l-4 border-blue-300">
                        <p className="text-sm font-medium text-gray-800">
                          {formatPairName(getPairById(match.pairBId))}
                        </p>
                      </div>
                    </div>
                    {(match.day || match.startTime || match.courtId) && (
                      <div className="text-center space-y-1">
                        {match.day && match.startTime && (
                          <p className="text-xs text-blue-700 font-medium">
                            {match.day} - {match.startTime}
                          </p>
                        )}
                        {match.courtId && (
                          <Badge variant="outline" className="text-xs">
                            Cancha {match.courtId}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje si no hay eliminatorias */}
      {standings.length === 0 && eliminationMatches.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Eliminatorias no iniciadas
            </h2>
            <p className="text-gray-500 mb-4">
              Las eliminatorias comenzarán una vez que se complete la fase de
              grupos.
            </p>
            <Link href="/public">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Ver fase de grupos
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
