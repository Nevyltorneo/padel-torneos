"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, Heart, Sparkles } from "lucide-react";
import { getCategories, getPairsByIds, getManualEliminationMatches, getPairs } from "@/lib/supabase-queries";
import { Match as MatchType } from "@/types";

interface Pair {
  id: string;
  player1?: { name: string };
  player2?: { name: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function PublicEliminationPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const resolvedParams = use(params);
  const [category, setCategory] = useState<Category | null>(null);
  const [eliminationMatches, setEliminationMatches] = useState<MatchType[]>([]);
  const [allPairs, setAllPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [resolvedParams.categoryId]);

  const loadData = async () => {
    try {
      // Cargar partidos de eliminatorias
      const matches = await getManualEliminationMatches(resolvedParams.categoryId);
      setEliminationMatches(matches);
      
      // Si hay partidos, obtener el nombre de la categoría
      if (matches.length > 0) {
        const tournamentId = matches[0].tournamentId;
        const categories = await getCategories(tournamentId);
        const currentCategory = categories.find(cat => cat.id === resolvedParams.categoryId);
        setCategory(currentCategory || null);
      }

      // Cargar información de todas las parejas
      const pairIds = matches.flatMap(match => [match.pairAId, match.pairBId]);
      const allPairsFromCategory = await getPairs(resolvedParams.categoryId);
      const pairs = getPairsByIds(pairIds, allPairsFromCategory);
      setAllPairs(pairs);

      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  };

  const formatPairName = (pair: Pair | null): string => {
    if (!pair) {
      return "TBD";
    }
    const name1 = pair.player1?.name || "Jugador 1";
    const name2 = pair.player2?.name || "Jugador 2";
    return `${name1} / ${name2}`;
  };

  const getPairById = (pairId: string): Pair | null => {
    return allPairs.find(pair => pair.id === pairId) || null;
  };

  const getStageName = (stage: string, matchCount: number): string => {
    if (stage === "final") return "Gran Final";
    if (stage === "semifinal") return "Semifinales";
    if (stage === "quarterfinal") return matchCount === 4 ? "Cuartos de Final" : "¡Gracias por participar en esta fase!";
    if (stage === "third_place") return "Tercer Lugar";
    return "Eliminatorias";
  };

  const getMatchesByStage = (stage: string): MatchType[] => {
    if (stage === "quarterfinal") {
      // Para quarterfinal, mostrar solo matches de quarterfinal
      return eliminationMatches.filter(match => 
        match.stage === "quarterfinal"
      );
    }
    
    return eliminationMatches.filter(match => match.stage === stage);
  };

  // Función para determinar la fase actual y título principal
  const getCurrentPhaseInfo = () => {
    // Filtrar matches de una sola vez para optimizar
    const allMatches = eliminationMatches.filter(match => match.stage !== "groups");
    const finalMatches = allMatches.filter(m => m.stage === "final");
    const semifinalMatches = allMatches.filter(m => m.stage === "semifinal");
    const quarterfinalMatches = allMatches.filter(m => m.stage === "quarterfinal");
    
    // Si hay final completada
    if (finalMatches.length > 0 && finalMatches[0].status === "completed") {
      return {
        title: "¡CAMPEONES(AS) DEL TORNEO!",
        subtitle: "🏆 ¡Felicidades por una gran temporada!",
        icon: "trophy"
      };
    }
    
    // Si hay final pendiente Y no hay semifinales pendientes
    const pendingSemifinals = semifinalMatches.filter(m => m.status !== "completed");
    if (finalMatches.length > 0 && pendingSemifinals.length === 0) {
      return {
        title: "GRAN FINAL",
        subtitle: "🎾 ¡El momento más esperado ha llegado!",
        icon: "crown"
      };
    }
    
    // Por defecto - SIEMPRE mostrar FASE ELIMINATORIA como título principal
    return {
      title: "FASE ELIMINATORIA",
      subtitle: "🎾 ¡Sigue la emoción hasta el final!",
      icon: "trophy"
    };
  };

  const currentPhase = getCurrentPhaseInfo();

  // Verificar si el torneo está completo (hay una final completada)
  const finalMatch = getMatchesByStage("final")[0];
  const isTournamentComplete = finalMatch && finalMatch.status === "completed";
  const champion = isTournamentComplete && finalMatch.winnerPairId ? 
    getPairById(finalMatch.winnerPairId) : null;
  
  // Identificar el Segundo Lugar (la pareja que perdió la final)
  const runnerUp = isTournamentComplete && finalMatch ? 
    getPairById(finalMatch.winnerPairId === finalMatch.pairAId ? finalMatch.pairBId : finalMatch.pairAId) : null;

  // Verificar si hay tercer lugar completado
  const thirdPlaceMatch = getMatchesByStage("third_place")[0];
  const thirdPlace = thirdPlaceMatch && thirdPlaceMatch.status === "completed" && thirdPlaceMatch.winnerPairId ? 
    getPairById(thirdPlaceMatch.winnerPairId) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-400 border-t-transparent mx-auto"></div>
            <Trophy className="h-8 w-8 text-yellow-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce" />
          </div>
          <p className="mt-6 text-xl text-white font-medium">Cargando eliminatorias...</p>
          <p className="mt-2 text-blue-200">Preparando la emoción del torneo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/10 rounded-full filter blur-3xl animate-pulse delay-500"></div>
      </div>
      
      <div className="relative container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
          <div className="flex items-center justify-center mb-3">
            {currentPhase.icon === "trophy" && (
              <>
                <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse mr-2" />
                <Trophy className="h-8 w-8 text-yellow-400 drop-shadow-lg" />
                <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse ml-2" />
              </>
            )}
            {currentPhase.icon === "crown" && (
              <>
                <Crown className="h-7 w-7 text-yellow-400 drop-shadow-lg" />
                <Trophy className="h-8 w-8 text-yellow-400 drop-shadow-lg" />
                <Crown className="h-7 w-7 text-yellow-400 drop-shadow-lg" />
              </>
            )}
            {currentPhase.icon === "medal" && (
              <>
                <Medal className="h-6 w-6 text-yellow-400 drop-shadow-lg" />
                <Trophy className="h-8 w-8 text-yellow-400 drop-shadow-lg" />
                <Medal className="h-6 w-6 text-yellow-400 drop-shadow-lg" />
              </>
            )}
          </div>
          <h1 className="text-3xl font-black text-white mb-3 tracking-tight">
            {currentPhase.title}
          </h1>
          <h2 className="text-xl font-bold text-blue-200 mb-2">{category?.name || 'Categoría'}</h2>
          <p className="text-base text-blue-100">{currentPhase.subtitle}</p>
        </div>
        </div>

        {/* Primer y Segundo Lugar - Solo si el torneo está completo */}
        {isTournamentComplete && champion && (
          <div className="max-w-4xl mx-auto mb-8">
            <Card className="border-4 border-yellow-400 bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Crown className="h-8 w-8 text-white drop-shadow-lg" />
                  <Trophy className="h-10 w-10 text-white drop-shadow-lg" />
                  <Crown className="h-8 w-8 text-white drop-shadow-lg" />
                </div>
                <CardTitle className="text-2xl font-black text-white drop-shadow-lg">
                  ¡GANADORES(AS) DEL TORNEO!
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                {/* Primer Lugar */}
                <div className="bg-white/95 rounded-xl p-4 shadow-lg">
                  <h3 className="text-lg font-bold text-gray-600 mb-3 flex items-center justify-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    PRIMER LUGAR
                  </h3>
                  <h2 className="text-2xl font-black text-gray-800 mb-3">
                    {formatPairName(champion)}
                  </h2>
                  <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-sm px-4 py-2 rounded-full shadow-lg">
                    <Trophy className="h-4 w-4 mr-1" />
                    Ganadores(as) del Torneo
                  </Badge>
                </div>

                {/* Segundo Lugar */}
                {runnerUp && (
                  <div className="bg-white/95 rounded-xl p-4 shadow-lg">
                    <h3 className="text-lg font-bold text-gray-600 mb-3 flex items-center justify-center gap-2">
                      <Medal className="h-5 w-5 text-gray-500" />
                      SEGUNDO LUGAR
                    </h3>
                    <h2 className="text-xl font-bold text-gray-800 mb-3">
                      {formatPairName(runnerUp)}
                    </h2>
                    <Badge className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-sm px-4 py-2 rounded-full shadow-lg">
                      <Medal className="h-4 w-4 mr-1" />
                      Segundo Lugar
                    </Badge>
                  </div>
                )}
                
                {thirdPlace && (
                  <div className="bg-white/95 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-2xl font-bold text-gray-700 mb-3 flex items-center justify-center gap-2">
                      <Medal className="h-6 w-6 text-amber-600" />
                      Tercer Lugar
                    </h3>
                    <p className="text-xl font-semibold text-gray-800">
                      {formatPairName(thirdPlace)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Partidos de Eliminatorias */}
        {eliminationMatches.length > 0 && (
          <div className="space-y-12">
            {/* Eliminatorias (Cuartos/Semifinales) */}
            {getMatchesByStage("quarterfinal").length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
                <h3 className="text-3xl font-black text-center mb-8 text-white flex items-center justify-center gap-3">
                  <Medal className="h-8 w-8 text-emerald-400" />
                  {getStageName("quarterfinal", getMatchesByStage("quarterfinal").length)}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                  {getMatchesByStage("quarterfinal").map((match, index) => {
                    const pairA = getPairById(match.pairAId);
                    const pairB = getPairById(match.pairBId);
                    const isCompleted = match.status === "completed";
                    const winnerId = match.winnerPairId;
                    
                    return (
                      <Card key={match.id} className="bg-white/95 border-2 border-emerald-500 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                        <CardHeader className="text-center pb-4">
                          <Badge className={`text-lg px-4 py-2 rounded-full ${
                            isCompleted ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                          }`}>
                            {isCompleted ? 'Completado' : 'Pendiente'}
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Pareja A */}
                          <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            isCompleted && winnerId === match.pairAId 
                              ? 'bg-green-100 border-green-500 shadow-lg' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-gray-800">
                                {formatPairName(pairA)}
                              </span>
                              {isCompleted && winnerId === match.pairAId && (
                                <Badge className="bg-green-600 text-white animate-pulse">
                                  <Trophy className="h-4 w-4 mr-1" />
                                  GANADOR
                                </Badge>
                              )}
                            </div>
                            {match.score && (match.score as any).sets && (
                              <div className="mt-2 text-sm text-gray-600">
                                {(match.score as any).sets.map((set: any, i: number) => (
                                  <span key={i} className="mr-2 font-semibold">{set.a}-{set.b}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="text-center">
                            <span className="text-2xl font-bold text-gray-500">VS</span>
                          </div>

                          {/* Pareja B */}
                          <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            isCompleted && winnerId === match.pairBId 
                              ? 'bg-green-100 border-green-500 shadow-lg' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-gray-800">
                                {formatPairName(pairB)}
                              </span>
                              {isCompleted && winnerId === match.pairBId && (
                                <Badge className="bg-green-600 text-white animate-pulse">
                                  <Trophy className="h-4 w-4 mr-1" />
                                  GANADOR
                                </Badge>
                              )}
                            </div>
                            {match.score && (match.score as any).sets && (
                              <div className="mt-2 text-sm text-gray-600">
                                {(match.score as any).sets.map((set: any, i: number) => (
                                  <span key={i} className="mr-2 font-semibold">{set.b}-{set.a}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Información de horario y cancha */}
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-blue-700 font-medium">📅 Día:</span>
                                <span className="font-semibold text-gray-800">
                                  {match.day ? new Date(match.day).toLocaleDateString('es-ES') : "Por asignar"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-blue-700 font-medium">🕐 Hora:</span>
                                <span className="font-semibold text-gray-800">
                                  {match.startTime ? match.startTime : "Por asignar"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-blue-700 font-medium">🏟️ Cancha:</span>
                                <span className="font-semibold text-gray-800">
                                  {match.courtId || "Por asignar"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Semifinales */}
            {getMatchesByStage("semifinal").length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
                <h3 className="text-3xl font-black text-center mb-8 text-white flex items-center justify-center gap-3">
                  <Medal className="h-8 w-8 text-purple-400" />
                  {getStageName("semifinal", getMatchesByStage("semifinal").length)}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                  {getMatchesByStage("semifinal").map((match, index) => {
                    const pairA = getPairById(match.pairAId);
                    const pairB = getPairById(match.pairBId);
                    const isCompleted = match.status === "completed";
                    const winnerId = match.winnerPairId;
                    
                    return (
                      <Card key={match.id} className="bg-white/95 border-2 border-purple-500 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                        <CardHeader className="text-center pb-4">
                          <Badge className={`text-lg px-4 py-2 rounded-full ${
                            isCompleted ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                          }`}>
                            {isCompleted ? 'Completado' : 'Pendiente'}
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Pareja A */}
                          <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            isCompleted && winnerId === match.pairAId 
                              ? 'bg-green-100 border-green-500 shadow-lg' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <p className="text-xl font-bold text-center text-gray-800">
                              {pairA ? formatPairName(pairA) : "TBD"}
                            </p>
                          </div>

                          {/* VS */}
                          <div className="text-center">
                            <p className="text-2xl font-black text-gray-600">VS</p>
                          </div>

                          {/* Pareja B */}
                          <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            isCompleted && winnerId === match.pairBId 
                              ? 'bg-green-100 border-green-500 shadow-lg' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <p className="text-xl font-bold text-center text-gray-800">
                              {pairB ? formatPairName(pairB) : "TBD"}
                            </p>
                          </div>

                          {/* Marcador si está completado */}
                          {isCompleted && match.score && (match.score as any).sets && (
                            <div className="bg-gray-100 p-3 rounded-lg">
                              <div className="text-lg font-semibold text-center text-gray-700">
                                {(match.score as any).sets.map((set: any, i: number) => (
                                  <span key={i} className="mr-3 font-bold text-xl">{set.a}-{set.b}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Información de horario y cancha */}
                          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 mt-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-purple-700 font-medium">📅 Día:</span>
                                <span className="font-semibold text-gray-800">
                                  {match.day ? new Date(match.day).toLocaleDateString('es-ES') : "Por asignar"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-purple-700 font-medium">🕐 Hora:</span>
                                <span className="font-semibold text-gray-800">
                                  {match.startTime ? match.startTime : "Por asignar"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-purple-700 font-medium">🏟️ Cancha:</span>
                                <span className="font-semibold text-gray-800">
                                  {match.courtId || "Por asignar"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Final */}
            {getMatchesByStage("final").length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
                <h3 className="text-3xl font-black text-center mb-8 text-white flex items-center justify-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-400" />
                  {getStageName("final", getMatchesByStage("final").length)}
                </h3>
                <div className="max-w-2xl mx-auto">
                  {getMatchesByStage("final").map((match) => {
                    const pairA = getPairById(match.pairAId);
                    const pairB = getPairById(match.pairBId);
                    const isCompleted = match.status === "completed";
                    const winnerId = match.winnerPairId;
                    
                    return (
                      <Card key={match.id} className="bg-gradient-to-br from-yellow-50 to-amber-50 border-4 border-yellow-400 shadow-2xl">
                        <CardHeader className="text-center pb-4">
                          <Badge className={`text-xl px-6 py-3 rounded-full ${
                            isCompleted ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                          }`}>
                            {isCompleted ? 'Completado' : 'Pendiente'}
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Pareja A */}
                          <div className={`p-6 rounded-2xl border-4 transition-all duration-300 ${
                            isCompleted && winnerId === match.pairAId 
                              ? 'bg-green-200 border-green-600 shadow-xl' 
                              : 'bg-white border-gray-300'
                          }`}>
                            <div className="flex items-center justify-center">
                              <span className="text-2xl font-black text-gray-800">
                                {formatPairName(pairA)}
                              </span>
                            </div>
                            {match.score && (match.score as any).sets && (
                              <div className="mt-3 text-lg text-gray-700">
                                {(match.score as any).sets.map((set: any, i: number) => (
                                  <span key={i} className="mr-3 font-bold text-xl">{set.a}-{set.b}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="text-center">
                            <span className="text-4xl font-black text-yellow-600">VS</span>
                          </div>

                          {/* Pareja B */}
                          <div className={`p-6 rounded-2xl border-4 transition-all duration-300 ${
                            isCompleted && winnerId === match.pairBId 
                              ? 'bg-green-200 border-green-600 shadow-xl' 
                              : 'bg-white border-gray-300'
                          }`}>
                            <div className="flex items-center justify-center">
                              <span className="text-2xl font-black text-gray-800">
                                {formatPairName(pairB)}
                              </span>
                            </div>
                            {match.score && (match.score as any).sets && (
                              <div className="mt-3 text-lg text-gray-700">
                                {(match.score as any).sets.map((set: any, i: number) => (
                                  <span key={i} className="mr-3 font-bold text-xl">{set.b}-{set.a}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Información de horario y cancha */}
                          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-yellow-700 font-medium">📅 Día:</span>
                                <span className="font-semibold text-gray-800">
                                  {match.day ? new Date(match.day).toLocaleDateString('es-ES') : "Por asignar"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-yellow-700 font-medium">🕐 Hora:</span>
                                <span className="font-semibold text-gray-800">
                                  {match.startTime ? match.startTime : "Por asignar"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-yellow-700 font-medium">🏟️ Cancha:</span>
                                <span className="font-semibold text-gray-800">
                                  {match.courtId || "Por asignar"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tercer Lugar */}
            {getMatchesByStage("third_place").length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
                <h3 className="text-3xl font-black text-center mb-8 text-white flex items-center justify-center gap-3">
                  <Award className="h-8 w-8 text-amber-600" />
                  {getStageName("third_place", getMatchesByStage("third_place").length)}
                </h3>
                <div className="max-w-2xl mx-auto">
                  {getMatchesByStage("third_place").map((match) => {
                    const pairA = getPairById(match.pairAId);
                    const pairB = getPairById(match.pairBId);
                    const isCompleted = match.status === "completed";
                    const winnerId = match.winnerPairId;
                    
                    return (
                      <Card key={match.id} className="bg-white/95 border-2 border-amber-500 shadow-xl">
                        <CardHeader className="text-center pb-4">
                          <Badge className={`text-lg px-4 py-2 rounded-full ${
                            isCompleted ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {isCompleted ? 'Completado' : 'Pendiente'}
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Pareja A */}
                          <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            isCompleted && winnerId === match.pairAId 
                              ? 'bg-amber-100 border-amber-500 shadow-lg' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-gray-800">
                                {formatPairName(pairA)}
                              </span>
                              {isCompleted && winnerId === match.pairAId && (
                                <Badge className="bg-amber-600 text-white">
                                  <Medal className="h-4 w-4 mr-1" />
                                  TERCER LUGAR
                                </Badge>
                              )}
                            </div>
                            {match.score && (match.score as any).sets && (
                              <div className="mt-2 text-sm text-gray-600">
                                {(match.score as any).sets.map((set: any, i: number) => (
                                  <span key={i} className="mr-2 font-semibold">{set.a}-{set.b}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="text-center">
                            <span className="text-2xl font-bold text-gray-500">VS</span>
                          </div>

                          {/* Pareja B */}
                          <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            isCompleted && winnerId === match.pairBId 
                              ? 'bg-amber-100 border-amber-500 shadow-lg' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-gray-800">
                                {formatPairName(pairB)}
                              </span>
                              {isCompleted && winnerId === match.pairBId && (
                                <Badge className="bg-amber-600 text-white">
                                  <Medal className="h-4 w-4 mr-1" />
                                  TERCER LUGAR
                                </Badge>
                              )}
                            </div>
                            {match.score && (match.score as any).sets && (
                              <div className="mt-2 text-sm text-gray-600">
                                {(match.score as any).sets.map((set: any, i: number) => (
                                  <span key={i} className="mr-2 font-semibold">{set.b}-{set.a}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Agradecimiento */}
        <div className="max-w-4xl mx-auto mt-8">
          <Card className="bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 backdrop-blur-md border border-white/20 shadow-xl">
            <CardHeader className="text-center">
              <Heart className="h-8 w-8 text-pink-400 mx-auto mb-3" />
              <CardTitle className="text-2xl font-black text-white">
                ¡Gracias por Participar!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-base text-blue-100 space-y-3">
              <p className="text-lg font-semibold text-white mb-3">
                ¡Gracias por hacer de este torneo una experiencia inolvidable!
              </p>
              <p>Cada partido fue una muestra de dedicación, esfuerzo y pasión por el pádel.</p>
              <p className="text-base font-medium text-yellow-200 mt-3">
                Su espíritu deportivo y determinación nos inspiran a seguir organizando eventos como este.
              </p>
              <p className="text-sm text-blue-200 mt-2">
                ¡Esperamos verlas en la próxima edición!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}