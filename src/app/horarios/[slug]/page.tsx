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
        console.log("🔄 Loading data for category:", currentCategory.id);
        console.log("🔄 Tournament ID:", currentCategory.tournamentId);
        
        // Cargar matches y pairs primero
        const [matchesData, pairsData] = await Promise.all([
          getAllMatchesByCategory(currentCategory.id),
          getPairs(currentCategory.id),
        ]);

        console.log("📊 Matches and pairs loaded:", {
          matches: matchesData?.length || 0,
          pairs: pairsData?.length || 0,
        });

        setMatches(matchesData || []);
        setPairs(pairsData || []);

        // Cargar canchas
        console.log("🔄 Loading courts...");
        const courtsData = await getCourts(currentCategory.tournamentId);
        console.log("✅ Courts loaded:", courtsData?.length || 0);
        setCourts(courtsData || []);

        setLastUpdated(new Date());
        console.log("🎉 Data loading completed successfully");
      } catch (parallelError) {
        console.error("❌ Error in parallel data loading:", parallelError);
        console.error("❌ Error details:", parallelError);
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
    if (!courtId) {
      console.log("⚠️ No courtId provided");
      return "Sin cancha asignada";
    }
    
    if (!courts || courts.length === 0) {
      console.log("⚠️ No courts loaded:", { courts, courtId });
      return "Canchas no cargadas";
    }
    
    const court = courts.find((c) => c.id === courtId);
    
    if (!court) {
      console.log("⚠️ Court not found:", { courtId, availableCourts: courts.map(c => ({ id: c.id, name: c.name })) });
      return "Cancha no encontrada";
    }
    
    console.log("✅ Court found:", { courtId, courtName: court.name });
    return court.name;
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

          {/* Mensaje motivacional */}
          <div className="mt-6 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white shadow-xl">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Trophy className="h-8 w-8 text-yellow-300 animate-pulse" />
                <h3 className="text-2xl font-bold">¡La Pasión del Pádel en Acción!</h3>
                <Trophy className="h-8 w-8 text-yellow-300 animate-pulse" />
              </div>
              <p className="text-lg mb-4 text-blue-100">
                Cada partido es una historia de dedicación, esfuerzo y amor por el deporte.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                  <Play className="h-4 w-4" />
                  <span>Emoción garantizada</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                  <Users className="h-4 w-4" />
                  <span>Competencia de élite</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                  <Clock className="h-4 w-4" />
                  <span>Actualización en vivo</span>
                </div>
              </div>
            </div>
          </div>
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
                    <p className="text-lg font-semibold">
                      {courts.length === 0 ? (
                        <span className="text-red-600">Sin cargar</span>
                      ) : (
                        courts.length
                      )}
                    </p>
                    {courts.length === 0 && (
                      <p className="text-xs text-red-500">
                        Problema de carga de canchas
                      </p>
                    )}
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

                  <div className="grid gap-6">
                    {dayMatches.map((match, index) => (
                      <Card
                        key={match.id}
                        className={`hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                          match.status === "completed" 
                            ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200" 
                            : match.status === "playing"
                            ? "bg-gradient-to-r from-red-50 to-pink-50 border-red-200"
                            : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                        }`}
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            {/* Información del partido */}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-4">
                                <Badge
                                  className={`text-sm font-semibold ${
                                    match.stage === "groups" 
                                      ? "bg-blue-100 text-blue-800 border-blue-200" 
                                      : match.stage === "quarterfinals"
                                      ? "bg-purple-100 text-purple-800 border-purple-200"
                                      : match.stage === "semifinals"
                                      ? "bg-orange-100 text-orange-800 border-orange-200"
                                      : match.stage === "final"
                                      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                      : "bg-gray-100 text-gray-800 border-gray-200"
                                  }`}
                                >
                                  {match.stage === "groups" && "🏆 Fase de Grupos"}
                                  {match.stage === "quarterfinals" && "🥉 Cuartos de Final"}
                                  {match.stage === "semifinals" && "🥈 Semifinal"}
                                  {match.stage === "final" && "🥇 Final"}
                                  {match.stage === "third_place" && "🏅 Tercer Lugar"}
                                </Badge>
                                {getStatusBadge(match.status)}
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center justify-center gap-6">
                                  <div className="text-center flex-1">
                                    <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-gray-100">
                                      <p className="font-bold text-lg text-gray-800">
                                        {getPairName(match.pairAId)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg">
                                      VS
                                    </div>
                                  </div>
                                  <div className="text-center flex-1">
                                    <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-gray-100">
                                      <p className="font-bold text-lg text-gray-800">
                                        {getPairName(match.pairBId)}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Mostrar resultado si está completado */}
                                {match.status === "completed" &&
                                  match.score && (
                                    <div className="text-center">
                                      <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-3 rounded-xl border-2 border-green-200 shadow-sm">
                                        <Trophy className="h-5 w-5 text-green-600" />
                                        <span className="text-sm font-medium text-green-800">
                                          Resultado Final:
                                        </span>
                                        <span className="font-bold text-green-700 text-lg">
                                          {match.scorePairA?.set1 || 0}-
                                          {match.scorePairB?.set1 || 0}
                                          {match.scorePairA?.set2 !==
                                            undefined &&
                                            match.scorePairB?.set2 !==
                                              undefined && (
                                              <>
                                                , {match.scorePairA.set2}-
                                                {match.scorePairB.set2}
                                              </>
                                            )}
                                          {match.scorePairA?.set3 !==
                                            undefined &&
                                            match.scorePairB?.set3 !==
                                              undefined && (
                                              <>
                                                , {match.scorePairA.set3}-
                                                {match.scorePairB.set3}
                                              </>
                                            )}
                                        </span>
                                        <Crown className="h-5 w-5 text-yellow-500" />
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>

                            {/* Información de horario y cancha */}
                            <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
                              {match.startTime && (
                                <div className="flex items-center gap-3 text-sm bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100">
                                  <div className="bg-blue-100 p-2 rounded-lg">
                                    <Clock className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-gray-600 text-xs">Hora</p>
                                    <p className="font-bold text-gray-800">
                                      {formatTime(match.startTime)}
                                    </p>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-3 text-sm bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100">
                                <div className={`p-2 rounded-lg ${
                                  match.courtId ? 
                                    (getCourtName(match.courtId).includes("no encontrada") || getCourtName(match.courtId).includes("no cargadas") ? 
                                      "bg-red-100" : "bg-green-100") : 
                                    "bg-gray-100"
                                }`}>
                                  <MapPin className={`h-4 w-4 ${
                                    match.courtId ? 
                                      (getCourtName(match.courtId).includes("no encontrada") || getCourtName(match.courtId).includes("no cargadas") ? 
                                        "text-red-600" : "text-green-600") : 
                                      "text-gray-600"
                                  }`} />
                                </div>
                                <div>
                                  <p className="text-gray-600 text-xs">Cancha</p>
                                  <p className={`font-bold ${
                                    match.courtId ? 
                                      (getCourtName(match.courtId).includes("no encontrada") || getCourtName(match.courtId).includes("no cargadas") ? 
                                        "text-red-600" : "text-green-600") : 
                                      "text-gray-600"
                                  }`}>
                                    {match.courtId ? getCourtName(match.courtId) : "Sin asignar"}
                                  </p>
                                </div>
                              </div>
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

        {/* Footer motivacional */}
        <footer className="mt-16 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Trophy className="h-8 w-8 text-yellow-300 animate-bounce" />
                <h4 className="text-2xl font-bold">
                  ¡Cada Partido Cuenta!
                </h4>
                <Trophy className="h-8 w-8 text-yellow-300 animate-bounce" />
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Play className="h-6 w-6 text-yellow-300" />
                    <h5 className="font-bold text-lg">Pasión Deportiva</h5>
                  </div>
                  <p className="text-blue-100 text-sm">
                    Cada jugador da lo mejor de sí en la cancha
                  </p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-6 w-6 text-green-300" />
                    <h5 className="font-bold text-lg">Espíritu Competitivo</h5>
                  </div>
                  <p className="text-blue-100 text-sm">
                    La competencia sana nos hace mejores
                  </p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="h-6 w-6 text-pink-300" />
                    <h5 className="font-bold text-lg">Tiempo Real</h5>
                  </div>
                  <p className="text-blue-100 text-sm">
                    Sigue cada momento de la acción
                  </p>
                </div>
              </div>

              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 mb-6">
                <h5 className="text-xl font-bold mb-3 text-yellow-300">
                  🏆 ¡Disfruta del Mejor Pádel! 🏆
                </h5>
                <p className="text-blue-100 text-lg leading-relaxed">
                  "En cada partido se escribe una nueva historia de dedicación, 
                  esfuerzo y amor por este hermoso deporte. ¡Que gane el mejor!"
                </p>
              </div>

              <p className="text-blue-200 text-sm mb-4">
                ⚡ Actualización automática cada 60 segundos
              </p>
            </div>

            {/* Copyright mejorado */}
            <div className="border-t border-white/20 mt-8 pt-6 text-center">
              <p className="text-blue-200 text-sm">
                © 2025 Sistema de Torneos Profesional •
                <span className="text-yellow-300 ml-1 font-bold">by NevylDev</span> • 
                <span className="text-pink-300 ml-1">Hecho con ❤️ para el pádel</span>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
