"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trophy, Play, Calendar, Users, Crown, Medal, Award, RefreshCw, Edit, RotateCcw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { useCurrentTournament } from "@/stores/tournament-store";
import { Match, Pair, Category } from "@/types";
import {
  getCategories,
  getPairs,
  getPairsByIds,
  getManualEliminationMatches,
  updateMatchResult,
  checkAndGenerateNextRound,
} from "@/lib/supabase-queries";
import { createClient } from "@/lib/supabase";

const supabase = createClient();

export default function AdminBracketPage() {
  const currentTournament = useCurrentTournament();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [allPairs, setAllPairs] = useState<Pair[]>([]);
  const [eliminationMatches, setEliminationMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);
  const [isEditPairsDialogOpen, setIsEditPairsDialogOpen] = useState(false);
  const [selectedPairA, setSelectedPairA] = useState<string>("");
  const [selectedPairB, setSelectedPairB] = useState<string>("");
  
  // Estados para los sets de cada pareja
  const [pairASet1, setPairASet1] = useState("");
  const [pairASet2, setPairASet2] = useState("");
  const [pairASet3, setPairASet3] = useState("");
  const [pairBSet1, setPairBSet1] = useState("");
  const [pairBSet2, setPairBSet2] = useState("");
  const [pairBSet3, setPairBSet3] = useState("");

  // Cargar datos iniciales
  useEffect(() => {
    if (currentTournament) {
      loadData();
    }
  }, [currentTournament]);

  // Cargar partidos cuando cambie la categoría
  useEffect(() => {
    if (selectedCategoryId) {
      loadEliminationMatches();
    }
  }, [selectedCategoryId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const categoriesData = await getCategories(currentTournament!.id);
      setCategories(categoriesData);

      if (categoriesData.length > 0) {
        const firstCategory = categoriesData[0];
        setSelectedCategoryId(firstCategory.id);
        await loadPairs(firstCategory.id);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPairs = async (categoryId: string) => {
    try {
      const pairsData = await getPairs(categoryId);
      setAllPairs(pairsData);
    } catch (error) {
      console.error("Error cargando parejas:", error);
    }
  };

  const loadEliminationMatches = async () => {
    if (!selectedCategoryId) return;

    try {
      console.log("🔄 Cargando partidos de eliminatorias para categoría:", selectedCategoryId);
      const matches = await getManualEliminationMatches(selectedCategoryId);
      console.log("✅ Partidos cargados:", matches);
      setEliminationMatches(matches);
    } catch (error) {
      console.error("❌ Error cargando partidos:", error);
      setEliminationMatches([]);
      toast.error("Error al cargar partidos de eliminatorias");
    }
  };

  const handleRegenerateNextPhase = async () => {
    if (!selectedCategoryId || !currentTournament) {
      toast.error("No hay categoría o torneo seleccionado");
      return;
    }

    try {
      toast.info("Regenerando siguiente fase...");
      console.log("🔄 Regenerando siguiente fase - eliminando y creando nueva...");
      
      // Primero recargar los partidos para asegurar datos actualizados
      await loadEliminationMatches();
      
      // Identificar qué fase necesitamos regenerar
      const semifinals = eliminationMatches.filter((m: Match) => m.stage === "semifinal" || m.stage === "semifinals");
      const finals = eliminationMatches.filter((m: Match) => m.stage === "final");
      const thirdPlace = eliminationMatches.filter((m: Match) => m.stage === "third_place");
      
      console.log(`🔍 Fases encontradas - Semifinales: ${semifinals.length}, Finales: ${finals.length}, 3er lugar: ${thirdPlace.length}`);
      
      if (semifinals.length === 2 && semifinals.every(m => m.status === "completed")) {
        // Eliminar finales y tercer lugar existentes
        const matchesToDelete = [...finals, ...thirdPlace];
        
        if (matchesToDelete.length > 0) {
          console.log(`🗑️ Eliminando ${matchesToDelete.length} partidos existentes...`);
          
          for (const match of matchesToDelete) {
            const { error } = await supabase
              .from("matches")
              .delete()
              .eq("id", match.id);
            
            if (error) {
              console.error(`❌ Error eliminando partido ${match.id}:`, error);
            } else {
              console.log(`✅ Partido eliminado: ${match.id}`);
            }
          }
        }
        
        // Ahora generar la nueva fase
        console.log("🎯 Generando nueva fase...");
        const generatedMatches = await checkAndGenerateNextRound(selectedCategoryId, currentTournament.id);
        
        if (generatedMatches.length > 0) {
          toast.success(`¡Se regeneraron ${generatedMatches.length} partidos!`);
          console.log("🎉 Partidos regenerados:", generatedMatches);
          
          // Recargar múltiples veces para asegurar
          setTimeout(async () => {
            await loadEliminationMatches();
            setTimeout(async () => {
              await loadEliminationMatches();
            }, 500);
          }, 1000);
        } else {
          toast.error("No se pudieron regenerar los partidos");
          console.log("⚠️ No se generaron partidos nuevos");
        }
      } else {
        toast.error("Solo se puede regenerar si hay 2 semifinales completadas");
      }
    } catch (error) {
      console.error("❌ Error regenerando siguiente fase:", error);
      toast.error("Error al regenerar la siguiente fase");
    }
  };

  const handleViewLive = () => {
    if (!selectedCategoryId) {
      toast.error("Selecciona una categoría primero");
      return;
    }
    
    // Abrir la vista pública en una nueva pestaña
    const liveUrl = `/public/elimination/${selectedCategoryId}`;
    window.open(liveUrl, '_blank');
    
    toast.success("Vista en vivo abierta en nueva pestaña");
  };

  const handleGenerateNextPhase = async () => {
    if (!selectedCategoryId || !currentTournament) {
      toast.error("No hay categoría o torneo seleccionado");
      return;
    }

    try {
      toast.info("Generando siguiente fase...");
      console.log("🚀 Generando siguiente fase manualmente...");
      console.log("🔍 Categoría:", selectedCategoryId);
      console.log("🔍 Torneo:", currentTournament.id);
      
      // Primero recargar los partidos para asegurar datos actualizados
      await loadEliminationMatches();
      
      // Mostrar info de los partidos actuales
      console.log("🔍 Partidos actuales en eliminationMatches:", eliminationMatches.map((m: Match) => ({
        id: m.id,
        stage: m.stage,
        status: m.status,
        winnerPairId: m.winnerPairId
      })));
      
      // Forzar la generación de la siguiente fase
      const generatedMatches = await checkAndGenerateNextRound(selectedCategoryId, currentTournament.id);
      
      if (generatedMatches.length > 0) {
        toast.success(`¡Se generaron ${generatedMatches.length} nuevos partidos!`);
        console.log("🎉 Partidos generados:", generatedMatches);
        
        // Esperar un momento y luego recargar múltiples veces para asegurar
        setTimeout(async () => {
          await loadEliminationMatches();
          setTimeout(async () => {
            await loadEliminationMatches();
            setTimeout(async () => {
              await loadEliminationMatches();
            }, 500);
          }, 500);
        }, 1000);
        
        // También mostrar mensaje para recargar manualmente
        setTimeout(() => {
          toast.info("Si no ves la nueva fase, recarga la página (F5)");
        }, 2000);
      } else {
        toast.info("No se pudo generar la siguiente fase. Verifica que todos los partidos de la fase actual estén completados.");
        console.log("⚠️ No se generaron partidos nuevos");
        
        // Mostrar más detalles sobre por qué no se pudo generar
        const semifinals = eliminationMatches.filter((m: Match) => m.stage === "semifinal" || m.stage === "semifinals");
        const completedSemifinals = semifinals.filter((m: Match) => m.status === "completed");
        console.log(`🔍 DEBUG: Semifinales total: ${semifinals.length}, completados: ${completedSemifinals.length}`);
        console.log("🔍 DEBUG: Detalles semifinales:", semifinals.map((m: Match) => ({
          id: m.id,
          stage: m.stage,
          status: m.status,
          winnerPairId: m.winnerPairId
        })));
      }
    } catch (error) {
      console.error("❌ Error generando siguiente fase:", error);
      toast.error("Error al generar la siguiente fase");
    }
  };

  const getPairById = (pairId: string): Pair | undefined => {
    return allPairs.find(pair => pair.id === pairId);
  };

  const formatPairName = (pair?: Pair): string => {
    if (!pair) return "TBD";
    return `${pair.player1?.name || "Jugador 1"} / ${pair.player2?.name || "Jugador 2"}`;
  };

  const handleAddScore = (match: Match) => {
    setSelectedMatch(match);
    
    // Si el partido ya tiene resultado, pre-llenar los campos
    if (match.status === "completed" && match.score && (match.score as any).sets) {
      const sets = (match.score as any).sets;
      if (sets.length >= 1) {
        setPairASet1(`${sets[0].a}-${sets[0].b}`);
        setPairBSet1(`${sets[0].b}-${sets[0].a}`);
      }
      if (sets.length >= 2) {
        setPairASet2(`${sets[1].a}-${sets[1].b}`);
        setPairBSet2(`${sets[1].b}-${sets[1].a}`);
      }
      if (sets.length >= 3) {
        setPairASet3(`${sets[2].a}-${sets[2].b}`);
        setPairBSet3(`${sets[2].b}-${sets[2].a}`);
      }
    } else {
      // Limpiar todos los campos de sets para partido nuevo
      setPairASet1("");
      setPairASet2("");
      setPairASet3("");
      setPairBSet1("");
      setPairBSet2("");
      setPairBSet3("");
    }
    
    setIsScoreDialogOpen(true);
  };

  const handleEditPairs = (match: Match) => {
    setSelectedMatch(match);
    setSelectedPairA(match.pairAId);
    setSelectedPairB(match.pairBId);
    setIsEditPairsDialogOpen(true);
  };

  const handleSavePairs = async () => {
    if (!selectedMatch) {
      toast.error("No hay partido seleccionado");
      return;
    }

    if (!selectedPairA || !selectedPairB) {
      toast.error("Debes seleccionar ambas parejas");
      return;
    }

    if (selectedPairA === selectedPairB) {
      toast.error("Las parejas no pueden ser iguales");
      return;
    }

    try {
      const { error } = await supabase
        .from("matches")
        .update({
          pair_a_id: selectedPairA,
          pair_b_id: selectedPairB,
          status: "pending", // Resetear status si se cambian las parejas
          winner_id: null,
          score: null
        })
        .eq("id", selectedMatch.id);

      if (error) {
        console.error("Error updating match pairs:", error);
        toast.error("Error al actualizar las parejas");
        return;
      }

      toast.success("¡Parejas actualizadas correctamente!");
      setIsEditPairsDialogOpen(false);
      
      // Recargar los partidos
      await loadEliminationMatches();
    } catch (error) {
      console.error("Error updating match pairs:", error);
      toast.error("Error al actualizar las parejas");
    }
  };

  const handleSaveScore = async () => {
    if (!selectedMatch) {
      toast.error("No hay partido seleccionado");
      return;
    }

    // Validar que al menos Set 1 y Set 2 estén completos
    if (!pairASet1 || !pairASet2 || !pairBSet1 || !pairBSet2) {
      toast.error("Por favor ingresa al menos Set 1 y Set 2 para ambas parejas");
      return;
    }

    try {
      // Parsear puntajes de cada set
      const parseSetScore = (setScore: string) => {
        const [gamesA, gamesB] = setScore.split("-").map(Number);
        return { gamesA, gamesB };
      };

      const set1A = parseSetScore(pairASet1);
      const set2A = parseSetScore(pairASet2);
      const set1B = parseSetScore(pairBSet1);
      const set2B = parseSetScore(pairBSet2);

      // Validar que los puntajes coincidan
      if (set1A.gamesA !== set1B.gamesB || set1A.gamesB !== set1B.gamesA ||
          set2A.gamesA !== set2B.gamesB || set2A.gamesB !== set2B.gamesA) {
        toast.error("Los puntajes de las parejas deben ser consistentes (ej: 6-4 vs 4-6)");
        return;
      }

      // Determinar ganador basado en sets ganados
      let setsWonA = 0;
      let setsWonB = 0;

      // Set 1
      if (set1A.gamesA > set1A.gamesB) setsWonA++;
      else setsWonB++;

      // Set 2
      if (set2A.gamesA > set2A.gamesB) setsWonA++;
      else setsWonB++;

      // Set 3 (si existe)
      if (pairASet3 && pairBSet3) {
        const set3A = parseSetScore(pairASet3);
        const set3B = parseSetScore(pairBSet3);
        
        if (set3A.gamesA !== set3B.gamesB || set3A.gamesB !== set3B.gamesA) {
          toast.error("Los puntajes del Set 3 deben ser consistentes");
          return;
        }
        
        if (set3A.gamesA > set3A.gamesB) setsWonA++;
        else setsWonB++;
      }

      const winnerPairId = setsWonA > setsWonB ? selectedMatch.pairAId : selectedMatch.pairBId;
      
      console.log("🔍 DEBUG handleSaveScore:");
      console.log("🔍 Sets ganados - PairA:", setsWonA, "PairB:", setsWonB);
      console.log("🔍 Winner Pair ID:", winnerPairId);
      console.log("🔍 Match ID:", selectedMatch.id);

      // Crear objetos de score compatibles con el formato de la fase de grupos
      const scorePairA = {
        set1: set1A.gamesA,
        set2: set2A.gamesA,
        set3: pairASet3 ? parseInt(pairASet3.split("-")[0]) : undefined
      };

      const scorePairB = {
        set1: set1B.gamesA,
        set2: set2B.gamesA,
        set3: pairBSet3 ? parseInt(pairBSet3.split("-")[0]) : undefined
      };

      await updateMatchResult(selectedMatch.id, scorePairA, scorePairB, winnerPairId);
      
      toast.success("Resultado guardado exitosamente");
      setIsScoreDialogOpen(false);
      setSelectedMatch(null);
      
      // Recargar partidos
      await loadEliminationMatches();
      
      // Mostrar mensaje si se generó la siguiente ronda
      setTimeout(async () => {
        await loadEliminationMatches(); // Recargar una vez más para asegurar que se muestre la nueva ronda
      }, 1000);
    } catch (error) {
      console.error("Error guardando resultado:", error);
      toast.error("Error al guardar resultado");
    }
  };

  const getStageName = (stage: string): string => {
    switch (stage) {
      case "quarterfinal": return "Cuartos de Final";
      case "semifinal": return "Semifinales";
      case "final": return "Final";
      case "third_place": return "Tercer Lugar";
      default: return "Eliminatorias";
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "quarterfinal": return <Medal className="h-5 w-5" />;
      case "semifinal": return <Award className="h-5 w-5" />;
      case "final": return <Crown className="h-5 w-5" />;
      case "third_place": return <Medal className="h-5 w-5" />;
      default: return <Trophy className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando bracket...</p>
        </div>
      </div>
    );
  }

  if (!currentTournament) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">No hay torneo seleccionado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-blue-600" />
            Bracket Eliminatorio
          </CardTitle>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Torneo: {currentTournament.name}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="default" 
                size="sm"
                onClick={handleGenerateNextPhase}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Trophy className="h-4 w-4" />
                Generar Siguiente Fase
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleRegenerateNextPhase}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <RotateCcw className="h-4 w-4" />
                Regenerar Fase
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={handleViewLive}
                disabled={!selectedCategoryId}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <ExternalLink className="h-4 w-4" />
                En Vivo
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Selector de Categoría */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Seleccionar Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="category-select">Categoría</Label>
            <select
              id="category-select"
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                if (e.target.value) {
                  loadPairs(e.target.value);
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Seleccionar categoría...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Partidos de Eliminatorias */}
      {selectedCategoryId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Partidos de Eliminatorias
              <Badge variant="outline">
                {eliminationMatches.length} partidos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eliminationMatches.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No hay partidos de eliminatorias configurados para esta categoría</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Agrupar partidos por stage */}
                {Object.entries(
                  eliminationMatches.reduce((acc, match) => {
                    if (!acc[match.stage]) {
                      acc[match.stage] = [];
                    }
                    acc[match.stage].push(match);
                    return acc;
                  }, {} as Record<string, Match[]>)
                ).map(([stage, matches]) => (
                  <div key={stage} className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      {getStageIcon(stage)}
                      {getStageName(stage)}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {matches.map((match) => (
                        <Card key={match.id} className="border-2 border-blue-200">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center justify-between">
                              <span>Partido {matches.indexOf(match) + 1}</span>
                              <Badge 
                                variant={match.status === "completed" ? "default" : "secondary"}
                                className={match.status === "completed" ? "bg-green-100 text-green-800" : ""}
                              >
                                {match.status === "completed" ? "Completado" : "Pendiente"}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Parejas */}
                            <div className="space-y-2">
                              {/* Pareja A */}
                              <div className={`flex items-center justify-between p-3 rounded-md relative ${
                                match.status === "completed" && match.winnerPairId === match.pairAId 
                                  ? "bg-green-100 border-2 border-green-400" 
                                  : "bg-blue-50"
                              }`}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {formatPairName(getPairById(match.pairAId))}
                                  </span>
                                  {match.status === "completed" && match.winnerPairId === match.pairAId && (
                                    <Badge className="bg-green-600 text-white text-xs">
                                      🏆 GANADOR
                                    </Badge>
                                  )}
                                </div>
                                {match.status === "completed" && match.score && (
                                  <Badge variant="outline">
                                    {(match.score as any).sets ? 
                                      (match.score as any).sets.map((set: any) => `${set.a}-${set.b}`).join(", ") : 
                                      "N/A"}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-center text-gray-500">VS</div>
                              
                              {/* Pareja B */}
                              <div className={`flex items-center justify-between p-3 rounded-md relative ${
                                match.status === "completed" && match.winnerPairId === match.pairBId 
                                  ? "bg-green-100 border-2 border-green-400" 
                                  : "bg-red-50"
                              }`}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {formatPairName(getPairById(match.pairBId))}
                                  </span>
                                  {match.status === "completed" && match.winnerPairId === match.pairBId && (
                                    <Badge className="bg-green-600 text-white text-xs">
                                      🏆 GANADOR
                                    </Badge>
                                  )}
                                </div>
                                {match.status === "completed" && match.score && (
                                  <Badge variant="outline">
                                    {(match.score as any).sets ? 
                                      (match.score as any).sets.map((set: any) => `${set.b}-${set.a}`).join(", ") : 
                                      "N/A"}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="space-y-2">
                              {/* Botón para agregar resultado */}
                              {match.status !== "completed" && (
                                <Button
                                  onClick={() => handleAddScore(match)}
                                  className="w-full"
                                  variant="outline"
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Agregar Resultado
                                </Button>
                              )}

                              {/* Botón para editar parejas - disponible siempre */}
                              <Button
                                onClick={() => handleEditPairs(match)}
                                className="w-full"
                                variant="secondary"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar Parejas
                              </Button>
                            </div>

                            {/* Mostrar ganador */}
                            {match.status === "completed" && match.winnerPairId && (
                              <div className="text-center">
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  🏆 Ganador: {formatPairName(getPairById(match.winnerPairId))}
                                </Badge>
                              </div>
                            )}

                            {/* Botón para editar resultado en partidos completados */}
                            {match.status === "completed" && (
                              <div className="mt-2">
                                <Button
                                  onClick={() => handleAddScore(match)}
                                  className="w-full"
                                  variant="outline"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar Resultado
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog para agregar resultado */}
      <Dialog open={isScoreDialogOpen} onOpenChange={setIsScoreDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Resultado</DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-6">
              {/* Pareja A */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">
                  Pareja A: {formatPairName(getPairById(selectedMatch.pairAId))}
                </Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pairA-set1">Set 1</Label>
                    <Input
                      id="pairA-set1"
                      placeholder="6-4"
                      value={pairASet1}
                      onChange={(e) => setPairASet1(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pairA-set2">Set 2</Label>
                    <Input
                      id="pairA-set2"
                      placeholder="6-2"
                      value={pairASet2}
                      onChange={(e) => setPairASet2(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pairA-set3">Set 3 (opcional)</Label>
                    <Input
                      id="pairA-set3"
                      placeholder="6-4"
                      value={pairASet3}
                      onChange={(e) => setPairASet3(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Pareja B */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">
                  Pareja B: {formatPairName(getPairById(selectedMatch.pairBId))}
                </Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pairB-set1">Set 1</Label>
                    <Input
                      id="pairB-set1"
                      placeholder="4-6"
                      value={pairBSet1}
                      onChange={(e) => setPairBSet1(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pairB-set2">Set 2</Label>
                    <Input
                      id="pairB-set2"
                      placeholder="2-6"
                      value={pairBSet2}
                      onChange={(e) => setPairBSet2(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pairB-set3">Set 3 (opcional)</Label>
                    <Input
                      id="pairB-set3"
                      placeholder="4-6"
                      value={pairBSet3}
                      onChange={(e) => setPairBSet3(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsScoreDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveScore}>
                  Guardar Resultado
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para editar parejas */}
      <Dialog open={isEditPairsDialogOpen} onOpenChange={setIsEditPairsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Parejas del Partido</DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-6">
              <div className="space-y-4">
                {/* Pareja A */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Pareja A</Label>
                  <select
                    value={selectedPairA}
                    onChange={(e) => setSelectedPairA(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Seleccionar pareja A</option>
                    {allPairs.map((pair) => (
                      <option key={pair.id} value={pair.id} disabled={pair.id === selectedPairB}>
                        {formatPairName(pair)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pareja B */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Pareja B</Label>
                  <select
                    value={selectedPairB}
                    onChange={(e) => setSelectedPairB(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Seleccionar pareja B</option>
                    {allPairs.map((pair) => (
                      <option key={pair.id} value={pair.id} disabled={pair.id === selectedPairA}>
                        {formatPairName(pair)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsEditPairsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePairs}>
                  Guardar Parejas
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}