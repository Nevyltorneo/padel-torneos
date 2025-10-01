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
  Clock,
  MapPin,
  Calendar,
  RefreshCw,
  Eye,
  Play,
  Crown,
} from "lucide-react";
import { Category, Match, Pair, Court } from "@/types";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  getAllCategories,
  getAllMatchesByCategory,
  getCourts,
  getPairs,
} from "@/lib/supabase-queries";

export default function HorariosBySlug() {
  const params = useParams();
  const categorySlug = params.slug as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
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
          window.location.replace(`/horarios/${currentCategory.slug}`);
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
        const [matchesData, courtsData, pairsData] = await Promise.all([
          getAllMatchesByCategory(currentCategory.id),
          getCourts(currentCategory.tournamentId),
          getPairs(currentCategory.id),
        ]);

        setMatches(matchesData);
        setCourts(courtsData || []);
        setPairs(pairsData);

        console.log("✅ Data loaded:", {
          matches: matchesData.length,
          courts: (courtsData || []).length,
          pairs: pairsData.length,
        });

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

  const getCourtName = (courtId: string) => {
    const court = courts.find((c) => c.id === courtId);
    return court ? court.name : "Cancha no encontrada";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600 text-white">✅ Finalizado</Badge>;
      case "playing":
        return <Badge className="bg-red-600 text-white">🔴 En Juego</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-600 text-white">📅 Programado</Badge>;
      case "pending":
        return <Badge variant="outline">⏳ Pendiente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (time: string) => {
    try {
      return format(parseISO(`2000-01-01T${time}`), "HH:mm", { locale: es });
    } catch {
      return time;
    }
  };

  const formatDate = (date: string) => {
    try {
      return format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: es });
    } catch {
      return date;
    }
  };

  // Agrupar partidos por día
  const groupedMatches = matches.reduce((acc, match) => {
    if (!match.day) return acc;
    if (!acc[match.day]) {
      acc[match.day] = [];
    }
    acc[match.day].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // Ordenar partidos por día y hora
  Object.keys(groupedMatches).forEach((day) => {
    groupedMatches[day].sort((a, b) => {
      if (!a.startTime || !b.startTime) return 0;
      return a.startTime.localeCompare(b.startTime);
    });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-700">
            Cargando horarios...
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
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              Horarios del Torneo
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

        {/* Información de la categoría */}
        <div className="mb-8">
          <Card className="shadow-lg border-2 border-blue-100">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Trophy className="h-6 w-6 text-blue-600" />
                {category.name}
              </CardTitle>
              <CardDescription className="text-base">
                Información de la categoría
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Parejas</p>
                    <p className="text-lg font-semibold">{pairs.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Play className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Partidos</p>
                    <p className="text-lg font-semibold">{matches.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPin className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Canchas</p>
                    <p className="text-lg font-semibold">{courts.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Partidos por día */}
        <div className="space-y-8">
          {Object.keys(groupedMatches).length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No hay partidos programados
              </h2>
              <p className="text-gray-600">
                Los horarios aparecerán aquí cuando estén disponibles.
              </p>
            </div>
          ) : (
            Object.entries(groupedMatches)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([day, dayMatches]) => (
                <div key={day} className="space-y-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-blue-600" />
                    {formatDate(day)}
                  </h2>

                  <div className="grid gap-4">
                    {dayMatches.map((match) => (
                      <Card
                        key={match.id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Información del partido */}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge
                                  variant="outline"
                                  className="text-sm font-semibold"
                                >
                                  {match.stage === "group" && "Fase de Grupos"}
                                  {match.stage === "quarterfinals" &&
                                    "Cuartos de Final"}
                                  {match.stage === "semifinals" && "Semifinal"}
                                  {match.stage === "final" && "Final"}
                                  {match.stage === "third_place" &&
                                    "Tercer Lugar"}
                                </Badge>
                                {getStatusBadge(match.status)}
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-center gap-4">
                                  <div className="text-center">
                                    <p className="font-semibold text-lg">
                                      {getPairName(match.pairAId)}
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-2xl font-bold text-gray-500">
                                      VS
                                    </span>
                                  </div>
                                  <div className="text-center">
                                    <p className="font-semibold text-lg">
                                      {getPairName(match.pairBId)}
                                    </p>
                                  </div>
                                </div>

                                {/* Mostrar resultado si está completado */}
                                {match.status === "completed" &&
                                  match.score && (
                                    <div className="text-center mt-3">
                                      <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
                                        <span className="text-sm text-gray-600">
                                          Resultado:
                                        </span>
                                        <span className="font-bold text-green-700">
                                          {match.score.pairA?.set1 || 0}-
                                          {match.score.pairB?.set1 || 0}
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
                                              </>
                                            )}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>

                            {/* Información de horario y cancha */}
                            <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                              {match.startTime && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">
                                    {formatTime(match.startTime)}
                                  </span>
                                </div>
                              )}
                              {match.courtId && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <MapPin className="h-4 w-4" />
                                  <span className="font-medium">
                                    {getCourtName(match.courtId)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-2xl overflow-hidden">
          <div className="p-8">
            <div className="text-center">
              <h4 className="text-xl font-bold mb-3 flex items-center justify-center gap-2">
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
