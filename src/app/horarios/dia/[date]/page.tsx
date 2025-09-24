"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, Trophy } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase";
import { getAllMatchesByCategory, getPairs } from "@/lib/supabase-queries";
import { Match, Pair, Category } from "@/types";

interface HorariosPorDiaProps {
  params: Promise<{
    date: string;
  }>;
}

export default function HorariosPorDia({ params }: HorariosPorDiaProps) {
  const { date } = use(params);
  const supabase = createClient();

  const [matches, setMatches] = useState<Match[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [date]);

  // Función para verificar datos específicos de sincronización
  const checkSpecificSync = async () => {
    try {
      console.log("🔍 VERIFICACIÓN ESPECÍFICA DE SINCRONIZACIÓN:");

      // Obtener partidos de los días problemáticos
      const problemDays = ["2025-09-25", "2025-09-26"]; // jueves y viernes

      for (const day of problemDays) {
        console.log(`\n📅 VERIFICANDO DÍA: ${day}`);

        const { data: dayMatches, error } = await supabase
          .from("matches")
          .select(
            `
            id,
            day,
            start_time,
            court_id,
            category_id,
            pair_a_id,
            pair_b_id,
            categories!inner(name)
          `
          )
          .eq("day", day)
          .not("start_time", "is", null)
          .not("court_id", "is", null);

        if (error) {
          console.error(`Error para ${day}:`, error);
          continue;
        }

        console.log(
          `📊 Partidos encontrados para ${day}: ${dayMatches?.length || 0}`
        );

        if (dayMatches && dayMatches.length > 0) {
          // Agrupar por categoría
          const byCategory = dayMatches.reduce((acc, match) => {
            const categoryName =
              (match.categories as any)?.name || "Sin categoría";
            if (!acc[categoryName]) acc[categoryName] = [];
            acc[categoryName].push(match);
            return acc;
          }, {} as Record<string, any[]>);

          Object.entries(byCategory).forEach(([categoryName, matches]) => {
            console.log(`  🏆 ${categoryName}: ${matches.length} partidos`);
            matches.forEach((match) => {
              console.log(
                `    * ${match.start_time} - Court ${match.court_id}`
              );
            });
          });
        }
      }
    } catch (error) {
      console.error("Error en verificación específica:", error);
    }
  };

  // Función para diagnosticar problemas de sincronización
  const diagnoseDataSync = async () => {
    try {
      console.log("🔍 DIAGNÓSTICO DE SINCRONIZACIÓN:");

      // Obtener todos los partidos de todas las categorías
      const { data: allMatchesData, error: matchesError } = await supabase
        .from("matches")
        .select(
          `
          id,
          day,
          start_time,
          court_id,
          category_id,
          pair_a_id,
          pair_b_id,
          categories!inner(name)
        `
        )
        .not("day", "is", null)
        .not("start_time", "is", null)
        .not("court_id", "is", null);

      if (matchesError) {
        console.error("Error en diagnóstico:", matchesError);
        return;
      }

      // Agrupar por categoría y día
      const analysis = allMatchesData?.reduce((acc, match) => {
        const categoryName = (match.categories as any)?.name || "Sin categoría";
        const day = match.day;

        if (!acc[categoryName]) {
          acc[categoryName] = {};
        }
        if (!acc[categoryName][day]) {
          acc[categoryName][day] = [];
        }

        acc[categoryName][day].push({
          id: match.id,
          time: match.start_time,
          court: match.court_id,
          pairA: match.pair_a_id,
          pairB: match.pair_b_id,
        });

        return acc;
      }, {} as Record<string, Record<string, any[]>>);

      console.log("📊 ANÁLISIS COMPLETO DE SINCRONIZACIÓN:");
      Object.entries(analysis || {}).forEach(([categoryName, days]) => {
        console.log(`\n🏆 ${categoryName}:`);
        Object.entries(days).forEach(([day, matches]) => {
          console.log(`  📅 ${day}: ${matches.length} partidos`);
          matches.forEach((match) => {
            console.log(`    * ${match.time} - Court ${match.court}`);
          });
        });
      });
    } catch (error) {
      console.error("Error en diagnóstico:", error);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Ejecutar diagnóstico de sincronización
      console.log("🚀 INICIANDO DIAGNÓSTICO DE SINCRONIZACIÓN");
      await checkSpecificSync();
      await diagnoseDataSync();

      // Cargar todas las categorías
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*");

      if (categoriesError) {
        throw categoriesError;
      }

      setCategories(categoriesData || []);

      // Cargar TODOS los partidos de todas las categorías
      const allMatches: Match[] = [];

      for (const category of categoriesData || []) {
        try {
          const categoryMatches = await getAllMatchesByCategory(category.id);
          console.log(`📊 Categoría ${category.name} (${category.id}):`);
          console.log(`  - Partidos encontrados: ${categoryMatches.length}`);

          // Agregar TODOS los partidos de la categoría
          allMatches.push(...categoryMatches);
        } catch (error) {
          console.error(
            `Error loading matches for category ${category.id}:`,
            error
          );
        }
      }

      console.log("📊 Total de partidos cargados:", allMatches.length);

      // DIAGNÓSTICO COMPLETO DE TODOS LOS PARTIDOS
      console.log("🔍 DIAGNÓSTICO COMPLETO DE PARTIDOS:");
      allMatches.forEach((match, index) => {
        console.log(`Partido ${index + 1}:`);
        console.log(`  - ID: ${match.id}`);
        console.log(`  - Día en BD: ${match.day}`);
        console.log(`  - Día solicitado: ${date}`);
        console.log(`  - Coincide: ${match.day === date}`);
        console.log(`  - Horario: ${match.startTime}`);
        console.log(`  - Cancha: ${match.courtId}`);
        console.log(`  - Categoría: ${getCategoryName(match.categoryId)}`);
        console.log("---");
      });

      // FILTRAR SOLO PARTIDOS DEL DÍA ESPECÍFICO
      console.log("🔍 FILTRANDO PARTIDOS PARA EL DÍA:", date);
      console.log("📊 Total de partidos cargados:", allMatches.length);

      const dayMatches = allMatches.filter((match) => {
        const isCorrectDay = match.day === date;
        const hasSchedule = match.startTime && match.courtId;

        if (isCorrectDay && hasSchedule) {
          console.log(
            `✅ PARTIDO VÁLIDO: ${match.id} - ${getCategoryName(
              match.categoryId
            )}`
          );
        } else {
          console.log(
            `❌ PARTIDO FILTRADO: ${match.id} - Día: ${match.day}, Horario: ${match.startTime}, Cancha: ${match.courtId}`
          );
        }

        return isCorrectDay && hasSchedule;
      });

      console.log("✅ Partidos del día cargados:", dayMatches.length);
      console.log("📅 Fecha solicitada:", date);

      setMatches(dayMatches);

      // Cargar todas las parejas de todas las categorías
      const allPairs: Pair[] = [];

      for (const category of categoriesData || []) {
        try {
          const categoryPairs = await getPairs(category.id);
          allPairs.push(...categoryPairs);
        } catch (error) {
          console.error(
            `Error loading pairs for category ${category.id}:`,
            error
          );
        }
      }

      setPairs(allPairs);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPairName = (pairId: string) => {
    const pair = pairs.find((p) => p.id === pairId);
    console.log(`🔍 Buscando pareja ${pairId}:`, pair);
    console.log(`📊 Total parejas cargadas: ${pairs.length}`);
    if (!pair) return "Pareja desconocida";
    return `${pair.player1.name} / ${pair.player2.name}`;
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    console.log(`🔍 Buscando categoría ${categoryId}:`, category);
    console.log(`📊 Total categorías cargadas: ${categories.length}`);
    return category?.name || "Categoría desconocida";
  };

  const formatMatchTime = (startTime: string | null | undefined) => {
    if (!startTime) return "Sin horario";
    return startTime;
  };

  const getCourtName = (courtId: string | null | undefined) => {
    if (!courtId) return "Sin asignar";

    // Mapeo temporal de canchas - SOLO LAS QUE EXISTEN
    const courtMappings: Record<string, string> = {
      "878dd404-f66b-423e-98b5-984e1d2399b7": "Cancha 3",
      "337bb07b-a732-4ef8-b1bc-18a503078bde": "Cancha 2",
      "1893deed-c241-404a-91de-aa4abc23777d": "Cancha 1",
    };

    const courtName = courtMappings[courtId];
    console.log(
      `🏟️ Buscando cancha ${courtId}: ${courtName || "NO ENCONTRADA"}`
    );

    // Si no está en el mapeo, no mostrar cancha inexistente
    if (!courtName) {
      console.log(`❌ Cancha ${courtId} no existe - NO MOSTRAR`);
      return null; // Retornar null para filtrar esta cancha
    }

    return courtName;
  };

  // Agrupar partidos por cancha - SOLO CANCHAS EXISTENTES
  const matchesByCourt = matches.reduce((acc, match) => {
    const courtName = getCourtName(match.courtId);

    // Solo agregar si la cancha existe
    if (courtName && courtName !== "Sin asignar") {
      if (!acc[courtName]) {
        acc[courtName] = [];
      }
      acc[courtName].push(match);
      console.log(`✅ Agregando partido a ${courtName}`);
    } else {
      console.log(
        `❌ Filtrando partido de cancha inexistente: ${match.courtId}`
      );
    }

    return acc;
  }, {} as Record<string, Match[]>);

  // Ordenar partidos por hora dentro de cada cancha
  Object.keys(matchesByCourt).forEach((courtName) => {
    matchesByCourt[courtName].sort((a, b) => {
      if (!a.startTime || !b.startTime) return 0;
      return a.startTime.localeCompare(b.startTime);
    });
  });

  // Ordenar canchas: Cancha 1, 2, 3, etc.
  const sortedCourts = Object.keys(matchesByCourt).sort((a, b) => {
    const courtNumberA = parseInt(a.replace(/\D/g, "")) || 999;
    const courtNumberB = parseInt(b.replace(/\D/g, "")) || 999;
    return courtNumberA - courtNumberB;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando horarios...</p>
        </div>
      </div>
    );
  }

  // DEBUG: Verificar la fecha que llega
  console.log("🔍 DEBUGGING FECHA:");
  console.log("📅 Fecha recibida (date):", date);
  console.log("📅 Tipo de fecha:", typeof date);
  console.log("📅 new Date(date):", new Date(date));
  console.log("📅 Fecha ISO:", new Date(date).toISOString());
  console.log("📅 Fecha local:", new Date(date).toLocaleDateString());

  const formattedDate = format(
    new Date(date + "T00:00:00"),
    "EEEE, dd 'de' MMMM 'de' yyyy",
    {
      locale: es,
    }
  );

  console.log("📅 Fecha formateada:", formattedDate);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="w-full max-w-none mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏆 Horarios del Día
          </h1>
          <div className="flex items-center justify-center gap-2 text-lg text-gray-600">
            <Calendar className="h-5 w-5" />
            <span>{formattedDate}</span>
          </div>
          <p className="text-gray-500 mt-2">
            Todos los partidos programados para este día
          </p>
        </div>

        {/* Mensaje motivacional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">
              🎾 ¡Día de Competencia!
            </h2>
            <p className="text-blue-800 mb-3">
              Lleguen puntuales a sus partidos y disfruten de una sana
              competencia.
            </p>
            <p className="text-blue-700 text-sm">
              ¡Que tengan un excelente día de pádel!
            </p>
          </div>
        </div>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay partidos programados
              </h3>
              <p className="text-gray-500">
                No se encontraron partidos para el {formattedDate}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
            {sortedCourts.map((courtName) => {
              const courtMatches = matchesByCourt[courtName];
              return (
                <Card key={courtName} className="h-fit shadow-lg">
                  <CardHeader className="bg-blue-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <MapPin className="h-6 w-6 text-blue-600" />
                      {courtName}
                      <Badge variant="secondary" className="ml-auto">
                        {courtMatches.length} partido
                        {courtMatches.length !== 1 ? "s" : ""}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {courtMatches.map((match, index) => (
                        <div
                          key={match.id}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 text-sm font-medium"
                              >
                                {index + 1}
                              </Badge>
                              <Badge variant="secondary" className="text-sm">
                                Programado
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-base text-gray-700 font-medium">
                                <Clock className="h-4 w-4" />
                                {formatMatchTime(match.startTime)}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {getCategoryName(match.categoryId)}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="text-center">
                              <p className="font-semibold text-base text-gray-900 mb-2">
                                {getPairName(match.pairAId)}
                              </p>
                              <p className="text-sm text-gray-500 my-2 font-medium">
                                VS
                              </p>
                              <p className="font-semibold text-base text-gray-900">
                                {getPairName(match.pairBId)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Mensaje de agradecimiento */}
        <div className="text-center mt-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              ¡Gracias por participar!
            </h3>
            <p className="text-green-800">
              Que disfruten de una excelente competencia y buena suerte en sus
              partidos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
