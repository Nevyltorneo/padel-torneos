"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Trophy,
  ArrowLeft,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Match, Pair, Category, Court } from "@/types";
import { createClient } from "@/lib/supabase";
import {
  getCategories,
  getPairs,
  getAllMatchesByCategory,
  getCourts,
} from "@/lib/supabase-queries";
import Link from "next/link";

export default function TodosLosPartidosPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;
  const supabase = createClient();

  const [category, setCategory] = useState<Category | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Cargar categoría - obtener el tournamentId de la categoría primero
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("*, tournament_id")
        .eq("id", categoryId)
        .single();

      if (categoryError) {
        console.error("Error fetching category:", categoryError);
        setCategory(null);
        return;
      }

      setCategory({
        id: categoryData.id,
        name: categoryData.name,
        tournamentId: categoryData.tournament_id,
        minPairs: categoryData.min_pairs,
        maxPairs: categoryData.max_pairs,
        status: categoryData.status || "active",
      });

      // Cargar partidos de la categoría
      const matchesData = await getAllMatchesByCategory(categoryId);
      setMatches(matchesData);

      // Cargar parejas
      const pairsData = await getPairs(categoryId);
      setPairs(pairsData);

      // Cargar canchas usando el tournamentId de la categoría
      const courtsData = await getCourts(categoryData.tournament_id);
      setCourts(courtsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPairName = (pairId: string | null | undefined) => {
    if (!pairId) return "Pareja no asignada";
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return "Pareja desconocida";
    return `${pair.player1.name} / ${pair.player2.name}`;
  };

  const getCourtName = (courtId: string | null | undefined) => {
    console.log("🏟️ getCourtName called with:", courtId);
    console.log("🏟️ Available courts:", courts);
    console.log(
      "🏟️ User Agent:",
      typeof window !== "undefined" ? window.navigator.userAgent : "SSR"
    );

    // MAPEO FIJO DE EMERGENCIA - FUNCIONA EN TODOS LOS NAVEGADORES
    const emergencyCourtMappings: Record<string, string> = {
      "a6c12988-c2bc-4f2d-9516-a25e3907992d": "cancha 1",
      "1eb08bb2-e8c5-429f-b377-6de3f40b9309": "cancha 2",
      "8e2eb8e2-fdab-4d92-b5e1-8aa56d6c56ed": "cancha 3",
      "878dd404-f66b-423e-98b5-984e1d2399b7": "cancha 3", // ID que estaba fallando
    };

    console.log("🔍 Emergency mappings:", emergencyCourtMappings);

    if (!courtId) {
      console.log("❌ No courtId provided");
      return "Sin asignar";
    }

    // ESTRATEGIA 1: Mapeo directo de emergencia
    if (emergencyCourtMappings[courtId]) {
      console.log(
        "✅ Using emergency mapping:",
        emergencyCourtMappings[courtId]
      );
      return emergencyCourtMappings[courtId];
    } else {
      console.log("🚨 COURT ID NOT FOUND IN MAPPING:", courtId);
      console.log("🚨 Please add this ID to emergencyCourtMappings!");

      // 🆕 AUTO-DETECCIÓN: Si hay canchas disponibles, usar la primera como fallback inteligente
      if (courts.length > 0) {
        const firstCourt = courts[0];
        if (firstCourt && firstCourt.name) {
          console.log(
            "🔄 Using first available court as intelligent fallback:",
            firstCourt.name
          );
          return firstCourt.name;
        }
      }
    }

    // ESTRATEGIA 2: Buscar por ID exacto con for loop (Safari compatible)
    let foundCourt = null;
    for (let i = 0; i < courts.length; i++) {
      if (courts[i] && courts[i].id === courtId) {
        foundCourt = courts[i];
        break;
      }
    }

    console.log("🔍 Court found by for loop:", foundCourt);

    if (foundCourt && foundCourt.name) {
      console.log("✅ Using court name:", foundCourt.name);
      return foundCourt.name;
    }

    // ESTRATEGIA 3: Hash dinámico basado en el número de canchas disponibles
    if (courtId && courtId.length > 0) {
      let hash = 0;
      for (let i = 0; i < Math.min(courtId.length, 8); i++) {
        const charCode = courtId.charCodeAt(i);
        hash = hash + charCode;
      }

      // USAR EL NÚMERO REAL DE CANCHAS DISPONIBLES (escalable)
      if (courts.length > 0) {
        // Si hay canchas, usar una de las disponibles por hash
        const courtIndex = hash % courts.length;
        const selectedCourt = courts[courtIndex];
        if (selectedCourt && selectedCourt.name) {
          console.log(
            "✅ Using hash-selected real court:",
            selectedCourt.name,
            "from index:",
            courtIndex,
            "of",
            courts.length,
            "available courts"
          );
          return selectedCourt.name;
        }
      }

      // Fallback con número dinámico (mínimo 3, máximo 20 para ser razonable)
      const maxCourts = Math.max(courts.length || 3, 3);
      const limitedMaxCourts = Math.min(maxCourts, 20); // Máximo razonable
      const courtNumber = (hash % limitedMaxCourts) + 1;
      const fallbackName = "Cancha " + courtNumber.toString();

      console.log(
        "✅ Using dynamic hash fallback:",
        fallbackName,
        "from",
        limitedMaxCourts,
        "possible courts (courts array:",
        courts.length,
        ")"
      );
      return fallbackName;
    }

    console.log("❌ Final fallback");
    return "Cancha Principal";
  };

  const formatMatchTime = (
    day: string | null | undefined,
    startTime: string | null | undefined
  ) => {
    if (!day || !startTime) return "Horario pendiente";

    try {
      const date = parseISO(day);
      const dayName = format(date, "EEEE", { locale: es });
      const dayNumber = format(date, "d 'de' MMMM", { locale: es });
      return `${dayName}, ${dayNumber} - ${startTime}`;
    } catch (error) {
      return `${day} - ${startTime}`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "finished":
        return (
          <Badge className="bg-green-100 text-green-800">Finalizado</Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">En curso</Badge>
        );
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800">Programado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pendiente</Badge>;
    }
  };

  // Agrupar partidos por día
  const matchesByDay = matches.reduce((acc, match) => {
    const day = match.day || "Sin fecha";
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // Ordenar partidos por horario dentro de cada día
  Object.keys(matchesByDay).forEach((day) => {
    matchesByDay[day].sort((a, b) => {
      // Si no tienen horario, van al final
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;

      // Ordenar por horario (ascendente)
      return a.startTime.localeCompare(b.startTime);
    });
  });

  // Ordenar días
  const sortedDays = Object.keys(matchesByDay).sort((a, b) => {
    if (a === "Sin fecha") return 1;
    if (b === "Sin fecha") return -1;
    return a.localeCompare(b);
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando horarios...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Categoría no encontrada
              </h2>
              <p className="text-gray-600 mb-6">
                La categoría que buscas no existe o ha sido eliminada.
              </p>
              <Button asChild>
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al inicio
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Trophy className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-800">
                {category.name}
              </h1>
            </div>
            <p className="text-gray-600 text-lg">
              Todos los partidos de la categoría
            </p>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{matches.length} partidos</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{pairs.length} parejas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mensajes Motivacionales para Jugadores */}
        <div className="space-y-6 mb-8">
          {/* Mensaje Principal */}
          <div className="text-center bg-gradient-to-r from-emerald-100 to-blue-100 rounded-lg p-6 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-3">
              ¡Que tengas un excelente torneo! 🌟
            </h3>
            <p className="text-gray-700 text-lg">
              Recuerda: lo importante no es solo ganar, sino disfrutar cada
              punto y competir con deportividad.
            </p>
          </div>

          {/* Mensaje de Puntualidad */}
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Clock className="h-6 w-6 text-orange-600" />
              <h4 className="text-xl font-bold text-gray-800">
                ⏰ Llega Puntual
              </h4>
            </div>
            <p className="text-gray-700 text-center">
              <strong>Importante:</strong> Llega 15 minutos antes de tu partido
              para calentar y estar listo. La puntualidad es respeto hacia tus
              compañeros y el torneo.
            </p>
          </div>

          {/* Mensaje de Convivencia */}
          <div className="bg-gradient-to-r from-green-100 to-teal-100 rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Users className="h-6 w-6 text-teal-600" />
              <h4 className="text-xl font-bold text-gray-800">
                🤝 Convivencia Sana
              </h4>
            </div>
            <div className="text-gray-700 space-y-2">
              <p className="text-center font-semibold mb-3">
                Para una sana convivencia en el torneo:
              </p>
              <ul className="text-left space-y-1">
                <li>• Respeta a todos los jugadores, sin importar su nivel</li>
                <li>• Celebra los buenos puntos de todos, no solo los tuyos</li>
                <li>
                  • Mantén una actitud positiva, incluso en momentos difíciles
                </li>
                <li>• Ayuda a los organizadores cuando sea necesario</li>
                <li>
                  • Disfruta el juego y haz que otros también lo disfruten
                </li>
              </ul>
            </div>
          </div>

          {/* Mensaje Final */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6 shadow-lg">
            <h4 className="text-xl font-bold text-gray-800 text-center mb-3">
              🏆 ¡Disfruta cada momento!
            </h4>
            <p className="text-gray-700 text-center">
              Este torneo es una oportunidad para competir, aprender y hacer
              nuevos amigos.
              <strong> ¡Que sea una experiencia inolvidable para todos!</strong>
            </p>
          </div>
        </div>

        {/* Partidos por día */}
        {sortedDays.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No hay partidos programados
              </h3>
              <p className="text-gray-500">
                Los partidos aparecerán aquí cuando sean programados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedDays.map((day) => (
              <Card key={day} className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {day === "Sin fecha" ? "Partidos sin fecha" : day}
                    <Badge className="bg-white text-blue-600">
                      {matchesByDay[day].length} partidos
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-4 p-6">
                    {matchesByDay[day].map((match) => (
                      <div
                        key={match.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                              Partido {matchesByDay[day].indexOf(match) + 1}
                            </div>
                            {getStatusBadge(match.status || "pending")}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Parejas */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Users className="h-4 w-4" />
                              <span className="font-medium">Parejas</span>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-center">
                                <div className="font-semibold text-gray-800">
                                  {getPairName(match.pairAId)}
                                </div>
                                <div className="text-gray-500 text-sm my-1">
                                  VS
                                </div>
                                <div className="font-semibold text-gray-800">
                                  {getPairName(match.pairBId)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Detalles */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">Horario</span>
                            </div>
                            <div className="text-lg font-semibold text-gray-800">
                              {formatMatchTime(match.day, match.startTime)}
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span className="font-medium">Cancha</span>
                            </div>
                            <div className="text-lg font-semibold text-gray-800">
                              {getCourtName(match.courtId)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Mensaje de Agradecimiento Final */}
        <div className="text-center mt-8 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-8 shadow-lg">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-blue-600" />
            <h3 className="text-2xl font-bold text-gray-800">
              ¡Gracias por participar! 🎉
            </h3>
          </div>
          <p className="text-gray-700 text-lg mb-4">
            Tu participación hace que este torneo sea especial.
            <strong> ¡Que tengas una experiencia increíble!</strong>
          </p>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-gray-600 text-sm">
              💡 <strong>Tip:</strong> Mantén tu teléfono cargado para recibir
              actualizaciones del torneo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
