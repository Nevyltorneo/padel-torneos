"use client";

import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  ArrowLeft,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { Category, Match, Court, Pair } from "@/types";
import {
  getCategory,
  getAllMatchesByCategory,
  getCourts,
  getTournament,
  getPairs,
} from "@/lib/supabase-queries";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface PublicCategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

export default function PublicCategoryPage({
  params,
}: PublicCategoryPageProps) {
  const resolvedParams = use(params);
  const { categoryId } = resolvedParams;

  const [category, setCategory] = useState<Category | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [tournamentName, setTournamentName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategoryData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Cargar categoría
      const categoryData = await getCategory(categoryId);
      if (!categoryData) {
        setError("Categoría no encontrada");
        return;
      }
      setCategory(categoryData);

      // Cargar torneo
      const tournament = await getTournament(categoryData.tournamentId);
      setTournamentName(tournament?.name || "Torneo");

      // Cargar partidos de la categoría
      const matchesData = await getAllMatchesByCategory(categoryId);
      setMatches(matchesData);

      // Cargar canchas
      const courtsData = await getCourts(categoryData.tournamentId);
      setCourts(courtsData);

      // Cargar parejas
      const pairsData = await getPairs(categoryId);
      setPairs(pairsData);
    } catch (error) {
      console.error("Error loading category data:", error);
      setError("Error al cargar los datos de la categoría");
    } finally {
      setIsLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    loadCategoryData();
  }, [loadCategoryData]);

  const getCourtName = (courtId: string | null) => {
    if (!courtId) return "Sin asignar";
    const court = courts.find((c) => c.id === courtId);
    return court?.name || "Cancha desconocida";
  };

  const getPairName = (pairId: string | null) => {
    if (!pairId) return "Pareja no asignada";
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return "Pareja desconocida";
    return `${pair.player1.name}/${pair.player2.name}`;
  };

  const formatMatchTime = (day: string | null, startTime: string | null) => {
    if (!day || !startTime) return "Horario pendiente";

    try {
      const date = parseISO(day);
      const dayName = format(date, "EEEE", { locale: es });
      const dayNumber = format(date, "d 'de' MMMM", { locale: es });
      return `${
        dayName.charAt(0).toUpperCase() + dayName.slice(1)
      }, ${dayNumber} - ${startTime}`;
    } catch {
      return `${day} - ${startTime}`;
    }
  };

  const getMatchStatusBadge = (match: Match) => {
    if (match.status === "finished") {
      return (
        <Badge variant="default" className="bg-green-600">
          Finalizado
        </Badge>
      );
    }
    if (match.status === "scheduled") {
      return <Badge variant="secondary">Programado</Badge>;
    }
    return <Badge variant="outline">Pendiente</Badge>;
  };

  const groupMatchesByStage = (matches: Match[]) => {
    const grouped = matches.reduce((acc, match) => {
      const stage = match.stage || "group";
      if (!acc[stage]) acc[stage] = [];
      acc[stage].push(match);
      return acc;
    }, {} as Record<string, Match[]>);

    // Ordenar por fecha y hora
    Object.keys(grouped).forEach((stage) => {
      grouped[stage].sort((a, b) => {
        if (!a.day || !b.day) return 0;
        if (a.day !== b.day) return a.day.localeCompare(b.day);
        if (!a.startTime || !b.startTime) return 0;
        return a.startTime.localeCompare(b.startTime);
      });
    });

    return grouped;
  };

  const getStageTitle = (stage: string) => {
    const stageTitles: Record<string, string> = {
      groups: "Fase de Grupos",
      quarterfinals: "Cuartos de Final",
      semifinals: "Semifinales",
      final: "Final",
      "third-place": "Tercer Lugar",
    };
    return stageTitles[stage] || stage;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Cargando información de la categoría...
          </p>
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              {error || "Categoría no encontrada"}
            </h2>
            <p className="text-gray-600 mb-4">
              La categoría que buscas no existe o no está disponible.
            </p>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const groupedMatches = groupMatchesByStage(matches);
  const scheduledMatches = matches.filter(
    (m) => m.status === "scheduled" || m.status === "finished"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Trophy className="h-4 w-4" />
                <span>{tournamentName}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                {category.name}
              </h1>
              <p className="text-gray-600 mt-1">Horarios de Juego y Canchas</p>
            </div>

            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Partidos
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {matches.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Programados
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {scheduledMatches.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MapPin className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Canchas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {courts.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Estado</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {category.status === "active"
                      ? "Borrador"
                      : category.status === "in_progress"
                      ? "Activo"
                      : category.status === "finished"
                      ? "Finalizado"
                      : category.status}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botón de Eliminatorias */}
        <div className="flex justify-center mb-8">
          <Link href={`/public/elimination/${categoryId}`}>
            <Button
              size="lg"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            >
              <Crown className="h-5 w-5 mr-2" />
              Ver Eliminatorias
              <Trophy className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Partidos por etapa */}
        <div className="space-y-8">
          {Object.entries(groupedMatches).map(([stage, stageMatches]) => (
            <div key={stage}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {getStageTitle(stage)}
              </h2>

              <div className="grid gap-4">
                {stageMatches.map((match) => (
                  <Card
                    key={match.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Información del partido */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {match.stage === "group"
                                ? `Grupo ${match.groupId?.slice(
                                    -1
                                  )} - Partido ${match.matchNumber}`
                                : `${getStageTitle(
                                    match.stage || ""
                                  )} - Partido ${match.matchNumber}`}
                            </h3>
                            {getMatchStatusBadge(match)}
                          </div>

                          <div className="text-gray-600 space-y-1">
                            <p className="font-medium">
                              {getPairName(match.pairAId)} vs{" "}
                              {getPairName(match.pairBId)}
                            </p>
                          </div>
                        </div>

                        {/* Horario y cancha */}
                        <div className="lg:text-right space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {formatMatchTime(
                                match.day || null,
                                match.startTime || null
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span>{getCourtName(match.courtId || null)}</span>
                          </div>

                          {match.status === "finished" &&
                            match.winnerPairId && (
                              <div className="text-sm font-medium text-green-600">
                                Partido finalizado
                              </div>
                            )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {matches.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay partidos programados
              </h3>
              <p className="text-gray-600">
                Los horarios de juego aparecerán aquí una vez que sean
                programados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
