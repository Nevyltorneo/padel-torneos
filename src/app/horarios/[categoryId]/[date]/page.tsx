"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Heart,
  Star,
  Users,
  Target,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { Match, Pair, Category, Court } from "@/types";
import {
  getAllMatchesByCategory,
  getPairs,
  getCourts,
  getCategories,
} from "@/lib/supabase-queries";

export default function HorariosPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;
  const date = params.date as string;

  const [matches, setMatches] = useState<Match[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [categoryId, date]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Obtener datos básicos
      const [matchesData, pairsData] = await Promise.all([
        getAllMatchesByCategory(categoryId),
        getPairs(categoryId),
      ]);

      // Filtrar partidos del día específico que estén programados
      const scheduledMatches = matchesData.filter(
        (match) =>
          match.day === date &&
          match.startTime &&
          match.courtId &&
          (match.status === "scheduled" || match.status === "pending")
      );

      setMatches(scheduledMatches);
      setPairs(pairsData);

      // Obtener información del torneo para las canchas y categorías
      if (scheduledMatches.length > 0) {
        try {
          const tournamentId = scheduledMatches[0].tournamentId;
          console.log(
            "🏟️ Loading courts and categories for tournament:",
            tournamentId
          );

          const [courtsData, categoriesData] = await Promise.all([
            getCourts(tournamentId),
            getCategories(tournamentId),
          ]);

          console.log("🏟️ Courts loaded:", courtsData);
          console.log("📂 Categories loaded:", categoriesData);

          setCourts(courtsData || []);

          // Obtener información real de la categoría
          const realCategory = categoriesData.find(
            (cat) => cat.id === categoryId
          );
          if (realCategory) {
            setCategory(realCategory);
            console.log("✅ Category found:", realCategory.name);
          } else {
            console.warn("⚠️ Category not found, using fallback");
            // Fallback si no se encuentra
            setCategory({
              id: categoryId,
              tournamentId: tournamentId,
              name: "Tu Categoría",
              minPairs: 3,
              maxPairs: 6,
              status: "in_progress",
            });
          }
        } catch (error) {
          console.error("❌ Error loading courts and categories:", error);
          // Fallback si hay error
          setCategory({
            id: categoryId,
            tournamentId: scheduledMatches[0]?.tournamentId || "",
            name: "Tu Categoría",
            minPairs: 3,
            maxPairs: 6,
            status: "in_progress",
          });
        }
      } else {
        // No hay partidos, crear categoría básica
        setCategory({
          id: categoryId,
          tournamentId: "",
          name: "Tu Categoría",
          minPairs: 3,
          maxPairs: 6,
          status: "in_progress",
        });
      }

      // 🔍 DEBUG: Verificar datos cargados
      console.log("📅 Partidos programados:", scheduledMatches.length);
      console.log("👥 Parejas cargadas:", pairsData.length);
      if (scheduledMatches.length > 0) {
        console.log("🎾 Primer partido:", {
          pairAId: scheduledMatches[0].pairAId,
          pairBId: scheduledMatches[0].pairBId,
          day: scheduledMatches[0].day,
          startTime: scheduledMatches[0].startTime,
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPairById = (pairId: string): Pair | undefined => {
    return pairs.find((p) => p.id === pairId);
  };

  const getCourtById = (courtId: string): Court | undefined => {
    return courts.find((c) => c.id === courtId);
  };

  const getPairName = (pair: Pair): string => {
    return `${pair.player1.name} / ${pair.player2.name}`;
  };

  const getPairNameSafe = (pairId: string): string => {
    const pair = getPairById(pairId);
    if (pair) {
      return getPairName(pair);
    }
    return `Pareja ${pairId.substring(0, 8)}...`;
  };

  const getCourtName = (court: Court | undefined): string => {
    if (court?.name) {
      return court.name;
    }

    // Si no hay cancha definida, generar un nombre basado en el ID
    if (court?.id) {
      // Crear un hash simple del UUID para generar números consistentes
      const hashCode = court.id.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      const courtNumber = Math.abs(hashCode % 10) + 1; // Números del 1-10
      return `Cancha ${courtNumber}`;
    }

    return "Sin cancha asignada";
  };

  const formatTime = (time: string): string => {
    return time.substring(0, 5); // HH:MM
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando horarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50">
      {/* Header Hero */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <Trophy className="h-12 w-12 text-yellow-300" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            ¡Bienvenido al Torneo! 🏆
          </h1>

          <p className="text-xl md:text-2xl mb-6 font-light">
            Es hora de demostrar tu mejor juego
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-lg">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Calendar className="h-5 w-5" />
              {format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: es })}
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Star className="h-5 w-5" />
              {category?.name || "Tu Categoría"}
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje Motivacional */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-lg">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Heart className="h-8 w-8 text-red-500" />
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                ¡Estos son tus horarios de juego! 🎾
              </h2>

              <div className="grid md:grid-cols-3 gap-6 mt-6">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full p-3 w-fit mx-auto mb-3">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Puntualidad
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Llega <strong>10 minutos antes</strong> de cada juego
                  </p>
                </div>

                <div className="text-center">
                  <div className="bg-green-100 rounded-full p-3 w-fit mx-auto mb-3">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Respeto</h3>
                  <p className="text-gray-600 text-sm">
                    Respeta a tu rival y mantén un <strong>juego limpio</strong>
                  </p>
                </div>

                <div className="text-center">
                  <div className="bg-purple-100 rounded-full p-3 w-fit mx-auto mb-3">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Excelencia
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Da lo mejor de ti y <strong>¡diviértete!</strong>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Horarios de Partidos */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Calendar className="h-7 w-7 text-blue-600" />
              Tus Partidos del Día
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {matches.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full p-4 w-fit mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No hay partidos programados
                </h3>
                <p className="text-gray-500">
                  Verifica la fecha o contacta a los organizadores
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {matches
                  .sort((a, b) =>
                    (a.startTime || "").localeCompare(b.startTime || "")
                  )
                  .map((match, index) => {
                    const pairA = getPairById(match.pairAId);
                    const pairB = getPairById(match.pairBId);
                    const court = getCourtById(match.courtId || "");

                    // 🔍 DEBUG: Verificar datos de parejas y canchas
                    console.log(`🎾 Partido ${index + 1}:`, {
                      matchCourtId: match.courtId,
                      courtFound: court,
                      courtName: court?.name || "NO NAME",
                      totalCourtsInArray: courts.length,
                      allCourtIds: courts.map((c) => c.id),
                      pairAId: match.pairAId,
                      pairBId: match.pairBId,
                      pairA: pairA,
                      pairB: pairB,
                      pairAName: pairA ? getPairName(pairA) : "NO ENCONTRADA",
                      pairBName: pairB ? getPairName(pairB) : "NO ENCONTRADA",
                      totalPairsInArray: pairs.length,
                    });

                    return (
                      <div
                        key={match.id}
                        className="p-6 hover:bg-gray-50 transition-colors duration-200"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Información del Partido */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200"
                              >
                                Partido {index + 1}
                              </Badge>
                              {match.stage !== "group" && (
                                <Badge className="bg-purple-100 text-purple-700">
                                  {match.stage === "semifinals" && "Semifinal"}
                                  {match.stage === "final" && "Final"}
                                  {match.stage === "third_place" && "3er Lugar"}
                                  {match.stage === "quarterfinals" && "Cuartos"}
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-lg font-semibold">
                                <span className="text-blue-600">
                                  {getPairNameSafe(match.pairAId)}
                                </span>
                                <span className="text-gray-400 font-normal">
                                  vs
                                </span>
                                <span className="text-purple-600">
                                  {getPairNameSafe(match.pairBId)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Horario y Cancha */}
                          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                            <div className="flex items-center gap-2 bg-green-50 rounded-lg px-4 py-3">
                              <Clock className="h-5 w-5 text-green-600" />
                              <div>
                                <div className="text-sm text-green-600 font-medium">
                                  Hora
                                </div>
                                <div className="text-lg font-bold text-green-800">
                                  {formatTime(match.startTime || "")}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 bg-orange-50 rounded-lg px-4 py-3">
                              <MapPin className="h-5 w-5 text-orange-600" />
                              <div>
                                <div className="text-sm text-orange-600 font-medium">
                                  Cancha
                                </div>
                                <div className="text-lg font-bold text-orange-800">
                                  {getCourtName(court)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Motivacional */}
        <div className="text-center mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            ¡Que tengas un excelente torneo! 🌟
          </h3>
          <p className="text-gray-600">
            Recuerda: lo importante no es solo ganar, sino disfrutar cada punto
            y crear grandes recuerdos.
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <span className="text-2xl">🏆</span>
            <span className="text-2xl">🎾</span>
            <span className="text-2xl">💪</span>
            <span className="text-2xl">🌟</span>
          </div>
        </div>
      </div>
    </div>
  );
}
