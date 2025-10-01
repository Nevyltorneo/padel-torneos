"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, Heart, Users, Calendar } from "lucide-react";
import { getCategories, getPairsByIds, getManualEliminationMatches } from "@/lib/supabase-queries";
import { Match as MatchType } from "@/types";

interface Match {
  id: string;
  tournamentId: string;
  categoryId: string;
  stage: string;
  pairAId: string;
  pairBId: string;
  status: "pending" | "scheduled" | "playing" | "completed";
  score?: any;
  winnerPairId?: string;
  createdAt: string;
  updatedAt: string;
}

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

export default function PublicBracketPage({ params }: { params: { slug: string } }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [eliminationMatches, setEliminationMatches] = useState<MatchType[]>([]);
  const [allPairs, setAllPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadEliminationMatches();
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const data = await getCategories("");
      setCategories(data);
      
      // Auto-seleccionar la categoría si solo hay una
      if (data.length === 1) {
        setSelectedCategory(data[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading categories:", error);
      setLoading(false);
    }
  };

  const loadEliminationMatches = async () => {
    if (!selectedCategory) return;

    try {
      const matches = await getManualEliminationMatches(selectedCategory.id);
      setEliminationMatches(matches);

      // Cargar información de todas las parejas
      const pairIds = matches.flatMap(match => [match.pairAId, match.pairBId]);
      const pairs = await getPairsByIds(pairIds);
      setAllPairs(pairs);
    } catch (error) {
      console.error("Error loading elimination matches:", error);
    }
  };

  const getPairById = (pairId: string): Pair | undefined => {
    return allPairs.find(pair => pair.id === pairId);
  };

  const formatPairName = (pair?: Pair): string => {
    if (!pair) return "TBD";
    return `${pair.player1?.name || "Jugador 1"} / ${pair.player2?.name || "Jugador 2"}`;
  };

  const getStageName = (stage: string, matchCount: number): string => {
    if (stage === "final") return "Final";
    if (stage === "semifinal" || stage === "semifinals") return "Semifinales";
    if (stage === "quarterfinal") return matchCount === 4 ? "Cuartos de Final" : "Octavos de Final";
    if (stage === "third_place") return "Tercer Lugar";
    return "Eliminatorias";
  };

  const getMatchesByStage = (stage: string): MatchType[] => {
    return eliminationMatches.filter(match => match.stage === stage);
  };

  // Verificar si hay una final completada
  const finalMatch = getMatchesByStage("final")[0];
  const isTournamentComplete = finalMatch && finalMatch.status === "completed";
  const champion = isTournamentComplete && finalMatch.winnerPairId ? 
    getPairById(finalMatch.winnerPairId) : null;

  // Verificar si hay tercer lugar completado
  const thirdPlaceMatch = getMatchesByStage("third_place")[0];
  const thirdPlace = thirdPlaceMatch && thirdPlaceMatch.status === "completed" && thirdPlaceMatch.winnerPairId ? 
    getPairById(thirdPlaceMatch.winnerPairId) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-gray-600">Cargando eliminatorias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <Trophy className="h-10 w-10 text-yellow-500" />
            Fase Eliminatoria
          </h1>
          <p className="text-xl text-gray-600">¡Sigue la emoción hasta el final!</p>
        </div>

        {/* Selector de Categoría */}
        {categories.length > 1 && (
          <div className="max-w-md mx-auto mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Seleccionar Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        selectedCategory?.id === category.id
                          ? "bg-blue-600 text-white shadow-lg"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      <Users className="h-5 w-5 inline mr-2" />
                      {category.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedCategory && (
          <>
            {/* Campeonas - Solo si el torneo está completo */}
            {isTournamentComplete && champion && (
              <div className="max-w-4xl mx-auto mb-8">
                <Card className="border-4 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-2xl">
                  <CardHeader className="text-center pb-4">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <Trophy className="h-16 w-16 text-yellow-500" />
                      <Crown className="h-16 w-16 text-yellow-500" />
                      <Trophy className="h-16 w-16 text-yellow-500" />
                    </div>
                    <CardTitle className="text-3xl text-yellow-800">
                      🏆 ¡CAMPEONAS! 🏆
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="bg-white rounded-lg p-6 shadow-lg mb-6">
                      <h2 className="text-4xl font-bold text-gray-800 mb-2">
                        {formatPairName(champion)}
                      </h2>
                      <Badge className="bg-yellow-500 text-white text-lg px-4 py-2">
                        <Crown className="h-5 w-5 mr-2" />
                        Ganadoras del Torneo
                      </Badge>
                    </div>
                    
                    {thirdPlace && (
                      <div className="bg-white rounded-lg p-4 shadow-lg">
                        <h3 className="text-2xl font-bold text-gray-600 mb-2 flex items-center justify-center gap-2">
                          <Medal className="h-6 w-6 text-amber-600" />
                          Tercer Lugar
                        </h3>
                        <p className="text-xl text-gray-700">
                          {formatPairName(thirdPlace)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Eliminatorias */}
            <div className="max-w-6xl mx-auto">
              {/* Semifinales */}
              {getMatchesByStage("semifinal").length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 flex items-center justify-center gap-2">
                    <Medal className="h-6 w-6 text-blue-600" />
                    {getStageName("semifinal", getMatchesByStage("semifinal").length)}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {getMatchesByStage("semifinal").map((match, index) => (
                      <Card key={match.id} className="shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-center">
                            Partido {index + 1}
                            {match.status === "completed" && (
                              <Badge className="ml-2 bg-green-100 text-green-800">
                                Completado
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Pareja A */}
                            <div className={`p-4 rounded-lg ${
                              match.status === "completed" && match.winnerPairId === match.pairAId 
                                ? "bg-green-100 border-2 border-green-400" 
                                : "bg-blue-50"
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-lg">
                                  {formatPairName(getPairById(match.pairAId))}
                                </span>
                                {match.status === "completed" && match.winnerPairId === match.pairAId && (
                                  <Badge className="bg-green-600 text-white">
                                    🏆 GANADOR
                                  </Badge>
                                )}
                              </div>
                              {match.status === "completed" && match.score && (
                                <div className="mt-2">
                                  <Badge variant="outline">
                                    {(match.score as any).sets ? 
                                      (match.score as any).sets.map((set: any) => `${set.a}-${set.b}`).join(", ") : 
                                      "N/A"}
                                  </Badge>
                                </div>
                              )}
                            </div>

                            <div className="text-center text-gray-500 font-bold">VS</div>

                            {/* Pareja B */}
                            <div className={`p-4 rounded-lg ${
                              match.status === "completed" && match.winnerPairId === match.pairBId 
                                ? "bg-green-100 border-2 border-green-400" 
                                : "bg-red-50"
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-lg">
                                  {formatPairName(getPairById(match.pairBId))}
                                </span>
                                {match.status === "completed" && match.winnerPairId === match.pairBId && (
                                  <Badge className="bg-green-600 text-white">
                                    🏆 GANADOR
                                  </Badge>
                                )}
                              </div>
                              {match.status === "completed" && match.score && (
                                <div className="mt-2">
                                  <Badge variant="outline">
                                    {(match.score as any).sets ? 
                                      (match.score as any).sets.map((set: any) => `${set.b}-${set.a}`).join(", ") : 
                                      "N/A"}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Final */}
              {getMatchesByStage("final").length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 flex items-center justify-center gap-2">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                    Final
                  </h2>
                  <div className="max-w-2xl mx-auto">
                    {getMatchesByStage("final").map((match) => (
                      <Card key={match.id} className="shadow-xl border-4 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50">
                        <CardHeader>
                          <CardTitle className="text-center text-xl">
                            🏆 Gran Final 🏆
                            {match.status === "completed" && (
                              <Badge className="ml-2 bg-green-100 text-green-800">
                                Completado
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Pareja A */}
                            <div className={`p-6 rounded-lg ${
                              match.status === "completed" && match.winnerPairId === match.pairAId 
                                ? "bg-green-100 border-4 border-green-400" 
                                : "bg-blue-50"
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xl">
                                  {formatPairName(getPairById(match.pairAId))}
                                </span>
                                {match.status === "completed" && match.winnerPairId === match.pairAId && (
                                  <Badge className="bg-green-600 text-white text-lg px-4 py-2">
                                    <Crown className="h-5 w-5 mr-2" />
                                    CAMPEONAS
                                  </Badge>
                                )}
                              </div>
                              {match.status === "completed" && match.score && (
                                <div className="mt-3">
                                  <Badge variant="outline" className="text-lg">
                                    {(match.score as any).sets ? 
                                      (match.score as any).sets.map((set: any) => `${set.a}-${set.b}`).join(", ") : 
                                      "N/A"}
                                  </Badge>
                                </div>
                              )}
                            </div>

                            <div className="text-center text-gray-600 font-bold text-xl">VS</div>

                            {/* Pareja B */}
                            <div className={`p-6 rounded-lg ${
                              match.status === "completed" && match.winnerPairId === match.pairBId 
                                ? "bg-green-100 border-4 border-green-400" 
                                : "bg-red-50"
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xl">
                                  {formatPairName(getPairById(match.pairBId))}
                                </span>
                                {match.status === "completed" && match.winnerPairId === match.pairBId && (
                                  <Badge className="bg-green-600 text-white text-lg px-4 py-2">
                                    <Crown className="h-5 w-5 mr-2" />
                                    CAMPEONAS
                                  </Badge>
                                )}
                              </div>
                              {match.status === "completed" && match.score && (
                                <div className="mt-3">
                                  <Badge variant="outline" className="text-lg">
                                    {(match.score as any).sets ? 
                                      (match.score as any).sets.map((set: any) => `${set.b}-${set.a}`).join(", ") : 
                                      "N/A"}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Tercer Lugar */}
              {getMatchesByStage("third_place").length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 flex items-center justify-center gap-2">
                    <Medal className="h-6 w-6 text-amber-600" />
                    Tercer Lugar
                  </h2>
                  <div className="max-w-2xl mx-auto">
                    {getMatchesByStage("third_place").map((match) => (
                      <Card key={match.id} className="shadow-lg border-2 border-amber-400">
                        <CardHeader>
                          <CardTitle className="text-center">
                            <Medal className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                            Tercer Lugar
                            {match.status === "completed" && (
                              <Badge className="ml-2 bg-green-100 text-green-800">
                                Completado
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Pareja A */}
                            <div className={`p-4 rounded-lg ${
                              match.status === "completed" && match.winnerPairId === match.pairAId 
                                ? "bg-green-100 border-2 border-green-400" 
                                : "bg-blue-50"
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-lg">
                                  {formatPairName(getPairById(match.pairAId))}
                                </span>
                                {match.status === "completed" && match.winnerPairId === match.pairAId && (
                                  <Badge className="bg-green-600 text-white">
                                    🏆 GANADOR
                                  </Badge>
                                )}
                              </div>
                              {match.status === "completed" && match.score && (
                                <div className="mt-2">
                                  <Badge variant="outline">
                                    {(match.score as any).sets ? 
                                      (match.score as any).sets.map((set: any) => `${set.a}-${set.b}`).join(", ") : 
                                      "N/A"}
                                  </Badge>
                                </div>
                              )}
                            </div>

                            <div className="text-center text-gray-500 font-bold">VS</div>

                            {/* Pareja B */}
                            <div className={`p-4 rounded-lg ${
                              match.status === "completed" && match.winnerPairId === match.pairBId 
                                ? "bg-green-100 border-2 border-green-400" 
                                : "bg-red-50"
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-lg">
                                  {formatPairName(getPairById(match.pairBId))}
                                </span>
                                {match.status === "completed" && match.winnerPairId === match.pairBId && (
                                  <Badge className="bg-green-600 text-white">
                                    🏆 GANADOR
                                  </Badge>
                                )}
                              </div>
                              {match.status === "completed" && match.score && (
                                <div className="mt-2">
                                  <Badge variant="outline">
                                    {(match.score as any).sets ? 
                                      (match.score as any).sets.map((set: any) => `${set.b}-${set.a}`).join(", ") : 
                                      "N/A"}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Agradecimientos */}
              <div className="max-w-4xl mx-auto mt-12">
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-purple-800 flex items-center justify-center gap-2">
                      <Heart className="h-6 w-6 text-red-500" />
                      ¡Gracias por Participar!
                      <Heart className="h-6 w-6 text-red-500" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="space-y-4 text-lg text-gray-700">
                      <p>
                        Queremos agradecer a todas las parejas que participaron en este torneo.
                      </p>
                      <p>
                        Cada partido fue una muestra de dedicación, esfuerzo y pasión por el pádel.
                      </p>
                      <p className="font-semibold text-purple-700">
                        ¡Felicitaciones a todas las participantes!
                      </p>
                      <div className="flex items-center justify-center gap-4 mt-6">
                        <Users className="h-8 w-8 text-purple-600" />
                        <span className="text-xl font-bold text-purple-800">
                          {allPairs.length} Jugadoras Participantes
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {!selectedCategory && !loading && (
          <div className="text-center">
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600">No hay eliminatorias disponibles</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
