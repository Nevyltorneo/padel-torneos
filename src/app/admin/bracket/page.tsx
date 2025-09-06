"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trophy,
  Play,
  Calendar,
  Users,
  Crown,
  Medal,
  Award,
  Download,
  Image as ImageIcon,
  Camera,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";

import { useCurrentTournament } from "@/stores/tournament-store";
import { Match, Pair, Category, BracketMatch } from "@/types";
import {
  getCategories,
  getPairs,
  getPairsByIds,
  generateKnockoutPhase,
  createKnockoutMatches,
  getKnockoutMatches,
  updateMatchResult,
  advanceWinnerToNextRound,
  createNextRoundMatches,
  getAllMatchesByCategory,
  deleteAllCategoryMatches,
  deleteAllKnockoutMatches,
} from "@/lib/supabase-queries";
import { useRealtimeMatches } from "@/hooks/useRealtimeMatches";
import { useRealtimeStandings } from "@/hooks/useRealtimeStandings";
import { RealtimeIndicator } from "@/components/realtime/RealtimeIndicator";

export default function BracketPage() {
  const currentTournament = useCurrentTournament();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [allPairs, setAllPairs] = useState<Pair[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hooks de tiempo real - Solo matches de eliminatorias
  const {
    matches: knockoutMatches,
    isConnected: isMatchesConnected,
    refreshMatches,
  } = useRealtimeMatches({
    categoryId: selectedCategoryId,
    initialMatches: [],
    stageFilter: ["quarterfinal", "semifinal", "final", "third_place"], // Solo eliminatorias
  });

  // Debug: verificar estado de knockoutMatches
  useEffect(() => {
    console.log("🔍 knockoutMatches updated:", {
      count: knockoutMatches.length,
      categoryId: selectedCategoryId,
      isConnected: isMatchesConnected,
      timestamp: new Date().toLocaleTimeString(),
      matches: knockoutMatches.map((m) => ({
        id: m.id,
        stage: m.stage,
        status: m.status,
        scorePairA: m.scorePairA,
        scorePairB: m.scorePairB,
        winnerPairId: m.winnerPairId,
      })),
    });
  }, [knockoutMatches, selectedCategoryId, isMatchesConnected]);

  const {
    standings,
    isLoading: isStandingsLoading,
    lastUpdate: standingsLastUpdate,
    refreshStandings,
  } = useRealtimeStandings({
    categoryId: selectedCategoryId,
    allPairs,
  });

  // Estados para diálogos
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [scoreForm, setScoreForm] = useState({
    pairA_set1: "",
    pairA_set2: "",
    pairA_set3: "",
    pairB_set1: "",
    pairB_set2: "",
    pairB_set3: "",
    hasSuperDeath: false,
    pairA_superDeath: "",
    pairB_superDeath: "",
  });

  useEffect(() => {
    if (currentTournament) {
      fetchData();
    }
  }, [currentTournament]);

  // Los matches se actualizan automáticamente via useRealtimeMatches
  // useEffect(() => {
  //   if (selectedCategoryId) {
  //     fetchKnockoutMatches();
  //   }
  // }, [selectedCategoryId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const categoriesData = await getCategories(currentTournament!.id);
      setCategories(categoriesData);

      if (categoriesData.length > 0) {
        const firstCategory = categoriesData[0];
        setSelectedCategoryId(firstCategory.id);

        const pairsData = await getPairs(firstCategory.id);
        setAllPairs(pairsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  };

  // Ya no necesitamos fetchKnockoutMatches - se actualiza automáticamente via hooks de tiempo real

  const handleGenerateKnockout = async () => {
    if (!selectedCategoryId || !currentTournament) return;

    try {
      toast.loading("Generando fase eliminatoria...", {
        id: "generate-knockout",
      });

      const matches = await generateKnockoutPhase(
        selectedCategoryId,
        currentTournament.id
      );
      await createKnockoutMatches(matches);

      // Las semifinales se crearán cuando se completen los cuartos de final
      // No las creamos automáticamente para evitar problemas de NULL constraints

      // Los matches se actualizarán automáticamente via tiempo real
      console.log(
        "🎯 Eliminatorias creadas, esperando actualización en tiempo real..."
      );

      toast.success("¡Fase eliminatoria generada!", {
        id: "generate-knockout",
      });

      // Forzar actualización manual después de generar eliminatorias
      setTimeout(async () => {
        console.log("🔄 Actualizando eliminatorias generadas...");
        await refreshMatches();
        await refreshStandings();
        console.log("✅ Eliminatorias actualizadas");
      }, 1500);
    } catch (error) {
      console.error("Error generating knockout:", error);
      toast.error("Error al generar eliminatorias", {
        id: "generate-knockout",
      });
    }
  };

  // Función para resetear SOLO las eliminatorias
  const handleResetTournament = async () => {
    if (!selectedCategoryId) return;

    try {
      toast.loading("Reseteando bracket eliminatorio...", {
        id: "reset-tournament",
      });

      console.log("🗑️🧹 RESET BRACKET - Eliminando SOLO eliminatorias...");
      await deleteAllKnockoutMatches(selectedCategoryId);

      toast.success("¡Bracket eliminatorio reseteado!", {
        id: "reset-tournament",
      });

      // Forzar actualización manual después de resetear
      setTimeout(async () => {
        console.log("🔄 Actualizando después del reset...");
        await refreshMatches();
        await refreshStandings();
        console.log("✅ Reset completado y actualizado");
      }, 1500);
    } catch (error) {
      console.error("Error resetting tournament:", error);
      toast.error("Error al resetear torneo", {
        id: "reset-tournament",
      });
    }
  };

  const handleAddScore = (match: Match) => {
    setSelectedMatch(match);
    setScoreForm({
      pairA_set1: "",
      pairA_set2: "",
      pairA_set3: "",
      pairB_set1: "",
      pairB_set2: "",
      pairB_set3: "",
      hasSuperDeath: false,
      pairA_superDeath: "",
      pairB_superDeath: "",
    });
    setShowScoreDialog(true);
  };

  const handleEditScore = (match: Match) => {
    setSelectedMatch(match);

    // Pre-llenar formulario con datos existentes
    const scoreA = match.scorePairA;
    const scoreB = match.scorePairB;

    setScoreForm({
      pairA_set1: scoreA?.set1?.toString() || "",
      pairA_set2: scoreA?.set2?.toString() || "",
      pairA_set3: scoreA?.set3?.toString() || "",
      pairB_set1: scoreB?.set1?.toString() || "",
      pairB_set2: scoreB?.set2?.toString() || "",
      pairB_set3: scoreB?.set3?.toString() || "",
      hasSuperDeath: !!(scoreA?.superDeath || scoreB?.superDeath),
      pairA_superDeath: scoreA?.superDeath?.toString() || "",
      pairB_superDeath: scoreB?.superDeath?.toString() || "",
    });
    setShowScoreDialog(true);
  };

  const handleSubmitScore = async () => {
    if (!selectedMatch) return;

    try {
      toast.loading("Guardando resultado...", { id: "save-score" });

      // Parsear scores
      const pairA_set1 = parseInt(scoreForm.pairA_set1) || 0;
      const pairA_set2 = parseInt(scoreForm.pairA_set2) || 0;
      const pairA_set3 = scoreForm.pairA_set3
        ? parseInt(scoreForm.pairA_set3)
        : undefined;
      const pairB_set1 = parseInt(scoreForm.pairB_set1) || 0;
      const pairB_set2 = parseInt(scoreForm.pairB_set2) || 0;
      const pairB_set3 = scoreForm.pairB_set3
        ? parseInt(scoreForm.pairB_set3)
        : undefined;

      // Super Muerte
      const pairA_superDeath = scoreForm.hasSuperDeath
        ? parseInt(scoreForm.pairA_superDeath) || 0
        : undefined;
      const pairB_superDeath = scoreForm.hasSuperDeath
        ? parseInt(scoreForm.pairB_superDeath) || 0
        : undefined;

      // Validaciones básicas
      if (
        pairA_set1 < 0 ||
        pairA_set2 < 0 ||
        pairB_set1 < 0 ||
        pairB_set2 < 0
      ) {
        toast.error("Los sets no pueden ser negativos", { id: "save-score" });
        return;
      }

      if (scoreForm.hasSuperDeath) {
        if (pairA_superDeath === undefined || pairB_superDeath === undefined) {
          toast.error("Ingresa los puntos de Super Muerte", {
            id: "save-score",
          });
          return;
        }

        if (
          pairA_superDeath < 0 ||
          pairB_superDeath < 0 ||
          pairA_superDeath > 20 ||
          pairB_superDeath > 20
        ) {
          toast.error("Los puntos de Super Muerte deben estar entre 0 y 20", {
            id: "save-score",
          });
          return;
        }

        if (pairA_superDeath < 10 && pairB_superDeath < 10) {
          toast.error(
            "Al menos una pareja debe llegar a 10 puntos para ganar",
            { id: "save-score" }
          );
          return;
        }
      }

      // Calcular ganador
      let setsA = 0,
        setsB = 0;

      if (pairA_set1 > pairB_set1) setsA++;
      else setsB++;
      if (pairA_set2 > pairB_set2) setsA++;
      else setsB++;
      if (pairA_set3 !== undefined && pairB_set3 !== undefined) {
        if (pairA_set3 > pairB_set3) setsA++;
        else setsB++;
      }

      let winnerId = "";
      if (setsA > setsB) {
        winnerId = selectedMatch.pairAId;
      } else if (setsB > setsA) {
        winnerId = selectedMatch.pairBId;
      } else if (
        scoreForm.hasSuperDeath &&
        pairA_superDeath !== undefined &&
        pairB_superDeath !== undefined
      ) {
        winnerId =
          pairA_superDeath > pairB_superDeath
            ? selectedMatch.pairAId
            : selectedMatch.pairBId;
      }

      if (!winnerId) {
        toast.error("No se puede determinar el ganador", { id: "save-score" });
        return;
      }

      // Preparar scores
      const scorePairA = {
        set1: pairA_set1,
        set2: pairA_set2,
        set3: pairA_set3,
        superDeath: pairA_superDeath,
      };

      const scorePairB = {
        set1: pairB_set1,
        set2: pairB_set2,
        set3: pairB_set3,
        superDeath: pairB_superDeath,
      };

      // Guardar resultado
      const updatedMatch = await updateMatchResult(
        selectedMatch.id,
        scorePairA,
        scorePairB,
        winnerId
      );

      console.log("✅ Match result updated in DB:", {
        id: updatedMatch.id,
        status: updatedMatch.status,
        scorePairA: updatedMatch.scorePairA,
        scorePairB: updatedMatch.scorePairB,
        winnerPairId: updatedMatch.winnerPairId,
      });

      // Avanzar ganador a la siguiente ronda solo si existe
      try {
        await advanceWinnerToNextRound(selectedMatch.id, winnerId);
        console.log("✅ Ganador avanzado a la siguiente ronda");
      } catch (advanceError) {
        // Si no puede avanzar (ej: no existe siguiente ronda), no es un error crítico
        console.log(
          "ℹ️ No se pudo avanzar automáticamente - probablemente no existe la siguiente ronda"
        );
      }

      // Recargar datos
      // Los matches se actualizarán automáticamente via tiempo real

      // Forzar actualización manual si el tiempo real no funciona
      setTimeout(async () => {
        console.log(
          "🔄 Forzando actualización manual de partidos y estadísticas..."
        );
        await refreshMatches();
        await refreshStandings();
        console.log("✅ Actualización manual completada");
      }, 1000);

      toast.success("¡Resultado guardado correctamente!", {
        id: "save-score",
      });
      setShowScoreDialog(false);
    } catch (error) {
      console.error("Error saving score:", error);
      toast.error("Error al guardar resultado", { id: "save-score" });
    }
  };

  const getPairById = (pairId: string): Pair | undefined => {
    return allPairs.find((p) => p.id === pairId);
  };

  const formatPairName = (pair?: Pair): string => {
    if (!pair) return "TBD";
    return `${pair.player1?.name || "Jugador 1"} / ${
      pair.player2?.name || "Jugador 2"
    }`;
  };

  const formatScore = (match: Match): string => {
    if (!match.scorePairA || !match.scorePairB) return "";

    const scoreA = match.scorePairA;
    const scoreB = match.scorePairB;

    let result = `${scoreA.set1}-${scoreB.set1}, ${scoreA.set2}-${scoreB.set2}`;

    if (scoreA.set3 !== undefined && scoreB.set3 !== undefined) {
      result += `, ${scoreA.set3}-${scoreB.set3}`;
    }

    if (scoreA.superDeath !== undefined && scoreB.superDeath !== undefined) {
      result += ` (SM: ${scoreA.superDeath}-${scoreB.superDeath})`;
    }

    return result;
  };

  const getMatchesByStage = (stage: string) => {
    return knockoutMatches
      .filter((m) => m.stage === stage)
      .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
  };

  // Función para determinar la ronda actual basada en el número de parejas
  const getTournamentStructure = (totalPairs: number) => {
    if (totalPairs <= 2) {
      return {
        currentStage: "final",
        stageName: "Final",
        nextStage: null,
        nextStageName: null,
        roundNumber: 1,
      };
    } else if (totalPairs <= 4) {
      return {
        currentStage: "quarterfinal", // En BD seguimos usando quarterfinal
        stageName: "Semifinales", // Pero mostramos como Semifinales
        nextStage: "final",
        nextStageName: "Final",
        roundNumber: 1,
      };
    } else if (totalPairs <= 8) {
      return {
        currentStage: "quarterfinal",
        stageName: "Cuartos de Final",
        nextStage: "semifinal",
        nextStageName: "Semifinales",
        roundNumber: 1,
      };
    } else if (totalPairs <= 16) {
      return {
        currentStage: "round_of_16",
        stageName: "Octavos de Final",
        nextStage: "quarterfinal",
        nextStageName: "Cuartos de Final",
        roundNumber: 1,
      };
    }
    // Para más de 16 parejas, podríamos agregar más rondas
    return {
      currentStage: "round_of_32",
      stageName: "Dieciseisavos de Final",
      nextStage: "round_of_16",
      nextStageName: "Octavos de Final",
      roundNumber: 1,
    };
  };

  // Función dinámica para generar la siguiente ronda
  const handleGenerateNextRound = async () => {
    if (!selectedCategoryId || !currentTournament) return;

    try {
      const currentMatches = getMatchesByStage(
        structure.currentStage as string
      );
      const finishedMatches = currentMatches.filter(
        (m) => m.status === "finished"
      );

      // Usar la estructura definida - no sobreescribir
      const nextStage = structure.nextStage;
      const nextStageName = structure.nextStageName;
      const nextRoundNumber = 2;

      if (!nextStage) return;

      toast.loading(`Generando ${nextStageName?.toLowerCase()}...`, {
        id: "generate-next",
      });

      const nextRoundMatches: Match[] = [];

      // Generar partidos de la siguiente ronda basados en los ganadores
      for (let i = 0; i < finishedMatches.length; i += 2) {
        const match1 = finishedMatches[i];
        const match2 = finishedMatches[i + 1];

        if (match1?.winnerPairId && match2?.winnerPairId) {
          nextRoundMatches.push({
            id: "",
            tournamentId: currentTournament.id,
            categoryId: selectedCategoryId,
            stage: nextStage as "quarterfinal" | "semifinal" | "final",
            pairAId: match1.winnerPairId,
            pairBId: match2.winnerPairId,
            status: "pending",
            roundNumber: nextRoundNumber,
            matchNumber: Math.floor(i / 2) + 1,
            bracketPosition: `${nextStage.toUpperCase().substring(0, 2)}${
              Math.floor(i / 2) + 1
            }`,
          });
        }
      }

      // Para la final, también crear el partido de 3er lugar
      if (nextStage === "final" && finishedMatches.length >= 2) {
        const match1 = finishedMatches[0];
        const match2 = finishedMatches[1];

        const loser1 =
          match1.pairAId === match1.winnerPairId
            ? match1.pairBId
            : match1.pairAId;
        const loser2 =
          match2.pairAId === match2.winnerPairId
            ? match2.pairBId
            : match2.pairAId;

        nextRoundMatches.push({
          id: "",
          tournamentId: currentTournament.id,
          categoryId: selectedCategoryId,
          stage: "third_place",
          pairAId: loser1,
          pairBId: loser2,
          status: "pending",
          roundNumber: nextRoundNumber,
          matchNumber: 2,
          bracketPosition: "TP1",
        });
      }

      if (nextRoundMatches.length > 0) {
        await createKnockoutMatches(nextRoundMatches);
        // Los matches se actualizarán automáticamente via tiempo real
        toast.success(
          `¡${nextStageName} generada${
            nextStageName?.includes("Final") ? "" : "s"
          }!`,
          { id: "generate-next" }
        );

        // Forzar actualización manual después de generar siguiente ronda
        setTimeout(async () => {
          console.log(`🔄 Actualizando ${nextStageName} generada...`);
          await refreshMatches();
          await refreshStandings();
          console.log(`✅ ${nextStageName} actualizada`);
        }, 1500);
      } else {
        toast.error(
          `No hay suficientes partidos completados para generar ${nextStageName?.toLowerCase()}`,
          { id: "generate-next" }
        );
      }
    } catch (error) {
      console.error("Error generating next round:", error);
      toast.error("Error al generar la siguiente ronda", {
        id: "generate-next",
      });
    }
  };

  // Función legacy para mantener compatibilidad (ahora usa la función dinámica)
  const handleGenerateFinals = handleGenerateNextRound;

  // Función simplificada - ahora las estadísticas vienen del hook de tiempo real
  const generateTournamentSummary = () => {
    // Retornar las estadísticas calculadas por el hook de tiempo real
    return standings;
  };

  // Estados para mostrar tabla de resumen
  const [showSummaryTable, setShowSummaryTable] = useState(false);
  const [summaryManuallyClosed, setSummaryManuallyClosed] = useState(false);

  const handleCloseSummary = () => {
    setShowSummaryTable(false);
    setSummaryManuallyClosed(true);
  };

  const handleShowSummary = () => {
    setShowSummaryTable(true);
  };

  // Auto-mostrar tabla si hay estadísticas disponibles (solo si no se ha cerrado manualmente)
  const hasStatsData = standings.some((s) => s.matchesPlayed > 0);
  const shouldShowSummary =
    showSummaryTable || (hasStatsData && !summaryManuallyClosed);

  // Auto-mostrar tabla cuando hay estadísticas disponibles
  useEffect(() => {
    if (hasStatsData && !summaryManuallyClosed) {
      console.log("📊 Auto-mostrando tabla de estadísticas");
      setShowSummaryTable(true);
    }
  }, [hasStatsData, summaryManuallyClosed]);

  if (!currentTournament) {
    return (
      <div className="bracket-no-tournament p-6 max-w-7xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-2xl font-bold text-gray-600 mb-2">
              No hay torneo seleccionado
            </h2>
            <p className="text-gray-500">
              Selecciona un torneo para ver el bracket eliminatorio
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bracket-loading flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando bracket...</p>
        </div>
      </div>
    );
  }

  const quarterfinals = getMatchesByStage("quarterfinal");
  const semifinals = getMatchesByStage("semifinal");
  const finals = getMatchesByStage("final");
  const thirdPlace = getMatchesByStage("third_place");

  // Obtener estructura del torneo actual basada en las parejas que están en el bracket
  const getPairsInBracket = () => {
    const pairsSet = new Set<string>();
    quarterfinals.forEach((match) => {
      pairsSet.add(match.pairAId);
      pairsSet.add(match.pairBId);
    });
    return pairsSet;
  };

  const totalPairsInBracket = getPairsInBracket().size;
  const structure = getTournamentStructure(totalPairsInBracket);

  // Debug para verificar la estructura
  console.log("🔍 Debug Tournament Structure:", {
    allPairsTotal: allPairs.length,
    totalPairsInBracket,
    quarterfinals: quarterfinals.length,
    pairsInBracketIds: Array.from(getPairsInBracket()),
    currentStage: structure.currentStage,
    stageName: structure.stageName,
    nextStage: structure.nextStage,
    nextStageName: structure.nextStageName,
  });

  // Determinar qué botones mostrar - DINÁMICO basado en número de parejas
  const canGenerateNextRound = () => {
    const currentMatches = getMatchesByStage(structure.currentStage as string);
    const finishedMatches = currentMatches.filter(
      (m) => m.status === "finished"
    );
    const requiredFinished = Math.ceil(currentMatches.length / 2) * 2; // Pares de partidos

    // Verificar si ya existe la siguiente ronda
    const nextStageMatches = structure.nextStage
      ? getMatchesByStage(structure.nextStage as string)
      : [];
    const finalMatches = getMatchesByStage("final");

    return (
      finishedMatches.length >= 2 && // Al menos 2 partidos terminados
      finishedMatches.length % 2 === 0 && // Número par de partidos terminados
      nextStageMatches.length === 0 && // No existe la siguiente ronda
      finalMatches.length === 0 // No existe la final
    );
  };

  // Función legacy para compatibilidad
  const canGenerateFinals = canGenerateNextRound;

  return (
    <div className="bracket-page p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bracket-header">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold text-blue-900 flex items-center gap-3">
                  <Trophy className="h-8 w-8" />
                  Bracket Eliminatorio
                </CardTitle>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-gray-600">
                    Torneo: {currentTournament.name}
                  </p>
                  <RealtimeIndicator
                    isConnected={isMatchesConnected}
                    lastUpdate={standingsLastUpdate}
                    showLastUpdate={false}
                    className="ml-auto"
                  />
                  <div className="text-sm text-gray-500 border border-gray-200 px-2 py-1 rounded">
                    Partidos: {knockoutMatches.length} | Conectado:{" "}
                    {isMatchesConnected ? "✅" : "❌"} |
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleGenerateKnockout}
                  className="bg-gradient-to-r from-blue-600 to-blue-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Generar Eliminatorias
                </Button>

                {selectedCategoryId && (
                  <Button
                    onClick={handleResetTournament}
                    variant="destructive"
                    className="bg-gradient-to-r from-red-600 to-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Resetear Bracket
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Bracket Visual */}
      {knockoutMatches.length > 0 ? (
        <div className="bracket-visual space-y-8">
          {/* Ronda actual - dinámico */}
          {quarterfinals.length > 0 && (
            <div className="bracket-round">
              <h3 className="text-xl font-bold text-center mb-6 text-blue-900 flex items-center justify-center gap-2">
                <Play className="h-5 w-5" />
                {(() => {
                  console.log("🔍 Rendering title with:", {
                    totalPairsInBracket,
                    stageName: structure.stageName,
                  });
                  if (totalPairsInBracket === 0) return "Cargando...";
                  if (totalPairsInBracket <= 4) return "Semifinales";
                  return structure.stageName;
                })()}
                <span className="text-xs text-gray-500 ml-2">
                  ({totalPairsInBracket} parejas)
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quarterfinals.map((match) => (
                  <BracketMatchCard
                    key={match.id}
                    match={match}
                    pairA={getPairById(match.pairAId)}
                    pairB={getPairById(match.pairBId)}
                    onAddScore={() => handleAddScore(match)}
                    onEditScore={() => handleEditScore(match)}
                    formatScore={formatScore}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Botón para generar siguiente ronda - dinámico */}
          {canGenerateNextRound() && structure.nextStage && (
            <div className="text-center py-6">
              <Button
                onClick={handleGenerateNextRound}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
                size="lg"
              >
                <Crown className="h-5 w-5 mr-2" />
                Generar {structure.nextStageName}
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                {
                  getMatchesByStage(structure.currentStage as string).filter(
                    (q) => q.status === "finished"
                  ).length
                }{" "}
                {structure.stageName.toLowerCase()} completada
                {structure.stageName.includes("Final") ? "" : "s"}
              </p>
            </div>
          )}

          {/* Final y 3er Lugar */}
          {(finals.length > 0 || thirdPlace.length > 0) && (
            <div className="bracket-finals space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-yellow-600 flex items-center gap-2">
                  <Crown className="h-6 w-6" />
                  Finales
                </h3>

                {/* Botón para ver tabla de resumen */}
                <Button
                  onClick={handleShowSummary}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                  size="lg"
                >
                  <Trophy className="h-5 w-5 mr-2" />
                  Ver Tabla de Resultados
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {/* Tercer Lugar */}
                {thirdPlace.map((match) => (
                  <div key={match.id} className="text-center">
                    <h4 className="text-lg font-semibold text-orange-600 mb-3 flex items-center justify-center gap-2">
                      <Award className="h-4 w-4" />
                      Tercer Lugar
                    </h4>
                    <BracketMatchCard
                      match={match}
                      pairA={getPairById(match.pairAId)}
                      pairB={getPairById(match.pairBId)}
                      onAddScore={() => handleAddScore(match)}
                      onEditScore={() => handleEditScore(match)}
                      formatScore={formatScore}
                      isImportant
                    />
                  </div>
                ))}

                {/* Final */}
                {finals.map((match) => (
                  <div key={match.id} className="text-center">
                    <h4 className="text-lg font-semibold text-yellow-600 mb-3 flex items-center justify-center gap-2">
                      <Crown className="h-4 w-4" />
                      Gran Final
                    </h4>
                    <BracketMatchCard
                      match={match}
                      pairA={getPairById(match.pairAId)}
                      pairB={getPairById(match.pairBId)}
                      onAddScore={() => handleAddScore(match)}
                      onEditScore={() => handleEditScore(match)}
                      formatScore={formatScore}
                      isFinal
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bracket-empty text-center py-16">
          <Trophy className="h-20 w-20 mx-auto mb-6 text-gray-300" />
          <h3 className="text-2xl font-bold text-gray-600 mb-4">
            No hay eliminatorias generadas
          </h3>
          <p className="text-gray-500 mb-6">
            Usa el botón &quot;Generar Eliminatorias&quot; en la parte superior
            para crear el bracket del torneo
          </p>
        </div>
      )}

      {/* Tabla de Resumen de Resultados */}
      {shouldShowSummary && standings.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-center text-purple-800 flex items-center gap-3">
                🏆 Tabla de Resultados Finales
              </CardTitle>
              <Button onClick={handleCloseSummary} variant="ghost" size="sm">
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-100 to-pink-100">
                    <th className="border border-purple-200 px-4 py-3 text-left font-bold">
                      Posición
                    </th>
                    <th className="border border-purple-200 px-4 py-3 text-left font-bold">
                      Pareja
                    </th>
                    <th className="border border-purple-200 px-4 py-3 text-center font-bold">
                      PJ
                    </th>
                    <th className="border border-purple-200 px-4 py-3 text-center font-bold">
                      PG
                    </th>
                    <th className="border border-purple-200 px-4 py-3 text-center font-bold">
                      PP
                    </th>
                    <th className="border border-purple-200 px-4 py-3 text-center font-bold">
                      Sets G
                    </th>
                    <th className="border border-purple-200 px-4 py-3 text-center font-bold">
                      Sets P
                    </th>
                    <th className="border border-purple-200 px-4 py-3 text-center font-bold">
                      Games G
                    </th>
                    <th className="border border-purple-200 px-4 py-3 text-center font-bold">
                      Games P
                    </th>
                    <th className="border border-purple-200 px-4 py-3 text-center font-bold">
                      Efectividad
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const summary = generateTournamentSummary();
                    console.log("🔍 Summary data:", summary);
                    return summary;
                  })().map((stat, index) => {
                    const winRate =
                      stat.matchesPlayed > 0
                        ? (
                            (stat.matchesWon / stat.matchesPlayed) *
                            100
                          ).toFixed(1)
                        : "0";
                    const bgColor =
                      stat.position === 1
                        ? "bg-yellow-50"
                        : stat.position === 2
                        ? "bg-gray-50"
                        : stat.position === 3
                        ? "bg-orange-50"
                        : "bg-white";

                    return (
                      <tr
                        key={stat.pair.id}
                        className={`${bgColor} hover:bg-purple-50`}
                      >
                        <td className="border border-purple-200 px-4 py-3 font-bold text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-2xl">{stat.trophy}</span>
                            <span>
                              {stat.position > 0 ? `${stat.position}°` : "-"}
                            </span>
                          </div>
                        </td>
                        <td className="border border-purple-200 px-4 py-3 font-semibold">
                          {stat.pair.player1.name} / {stat.pair.player2.name}
                        </td>
                        <td className="border border-purple-200 px-4 py-3 text-center">
                          {stat.matchesPlayed}
                        </td>
                        <td className="border border-purple-200 px-4 py-3 text-center font-semibold text-green-600">
                          {stat.matchesWon}
                        </td>
                        <td className="border border-purple-200 px-4 py-3 text-center font-semibold text-red-600">
                          {stat.matchesLost}
                        </td>
                        <td className="border border-purple-200 px-4 py-3 text-center text-green-600">
                          {stat.setsWon}
                        </td>
                        <td className="border border-purple-200 px-4 py-3 text-center text-red-600">
                          {stat.setsLost}
                        </td>
                        <td className="border border-purple-200 px-4 py-3 text-center text-green-600">
                          {stat.gamesWon}
                        </td>
                        <td className="border border-purple-200 px-4 py-3 text-center text-red-600">
                          {stat.gamesLost}
                        </td>
                        <td className="border border-purple-200 px-4 py-3 text-center font-bold text-blue-600">
                          {winRate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Leyenda */}
            <div className="mt-4 text-sm text-gray-600">
              <p>
                <strong>PJ:</strong> Partidos Jugados | <strong>PG:</strong>{" "}
                Partidos Ganados | <strong>PP:</strong> Partidos Perdidos
              </p>
            </div>

            {/* Botón para vista pública */}
            <div className="mt-6 text-center">
              <Button
                onClick={() =>
                  window.open(`/public/${currentTournament?.slug}`, "_blank")
                }
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                size="lg"
              >
                <Users className="h-5 w-5 mr-2" />
                Ver Vista Pública del Torneo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog para capturar resultados */}
      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Capturar Resultado</DialogTitle>
          </DialogHeader>

          {selectedMatch && (
            <div className="space-y-6">
              {/* Información del partido */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">
                  {formatPairName(getPairById(selectedMatch.pairAId))}
                </p>
                <p className="text-sm text-gray-500 mb-2">VS</p>
                <p className="font-medium text-gray-900">
                  {formatPairName(getPairById(selectedMatch.pairBId))}
                </p>
              </div>

              {/* Sets */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Pareja A</Label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Set 1"
                      value={scoreForm.pairA_set1}
                      onChange={(e) =>
                        setScoreForm((prev) => ({
                          ...prev,
                          pairA_set1: e.target.value,
                        }))
                      }
                      min="0"
                      max="20"
                    />
                    <Input
                      type="number"
                      placeholder="Set 2"
                      value={scoreForm.pairA_set2}
                      onChange={(e) =>
                        setScoreForm((prev) => ({
                          ...prev,
                          pairA_set2: e.target.value,
                        }))
                      }
                      min="0"
                      max="20"
                    />
                    <Input
                      type="number"
                      placeholder="Set 3 (opcional)"
                      value={scoreForm.pairA_set3}
                      onChange={(e) =>
                        setScoreForm((prev) => ({
                          ...prev,
                          pairA_set3: e.target.value,
                        }))
                      }
                      min="0"
                      max="20"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Pareja B</Label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Set 1"
                      value={scoreForm.pairB_set1}
                      onChange={(e) =>
                        setScoreForm((prev) => ({
                          ...prev,
                          pairB_set1: e.target.value,
                        }))
                      }
                      min="0"
                      max="20"
                    />
                    <Input
                      type="number"
                      placeholder="Set 2"
                      value={scoreForm.pairB_set2}
                      onChange={(e) =>
                        setScoreForm((prev) => ({
                          ...prev,
                          pairB_set2: e.target.value,
                        }))
                      }
                      min="0"
                      max="20"
                    />
                    <Input
                      type="number"
                      placeholder="Set 3 (opcional)"
                      value={scoreForm.pairB_set3}
                      onChange={(e) =>
                        setScoreForm((prev) => ({
                          ...prev,
                          pairB_set3: e.target.value,
                        }))
                      }
                      min="0"
                      max="20"
                    />
                  </div>
                </div>
              </div>

              {/* Super Muerte */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="superDeath"
                    checked={scoreForm.hasSuperDeath}
                    onCheckedChange={(checked) =>
                      setScoreForm((prev) => ({
                        ...prev,
                        hasSuperDeath: checked as boolean,
                      }))
                    }
                  />
                  <Label htmlFor="superDeath" className="text-sm font-medium">
                    ¿Hubo Super Muerte? (desempate - primer equipo en llegar a
                    10 gana)
                  </Label>
                </div>

                {scoreForm.hasSuperDeath && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="10"
                      value={scoreForm.pairA_superDeath}
                      onChange={(e) =>
                        setScoreForm((prev) => ({
                          ...prev,
                          pairA_superDeath: e.target.value,
                        }))
                      }
                      min="0"
                      max="20"
                    />
                    <Input
                      type="number"
                      placeholder="6"
                      value={scoreForm.pairB_superDeath}
                      onChange={(e) =>
                        setScoreForm((prev) => ({
                          ...prev,
                          pairB_superDeath: e.target.value,
                        }))
                      }
                      min="0"
                      max="20"
                    />
                  </div>
                )}

                {scoreForm.hasSuperDeath && (
                  <p className="text-sm text-gray-500 mt-2">
                    * El primer equipo en llegar a 10 puntos gana
                  </p>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowScoreDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button onClick={handleSubmitScore} className="flex-1">
                  Guardar Resultado
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente para cada partido del bracket
interface BracketMatchCardProps {
  match: Match;
  pairA?: Pair;
  pairB?: Pair;
  onAddScore: () => void;
  onEditScore?: () => void;
  formatScore: (match: Match) => string;
  isImportant?: boolean;
  isFinal?: boolean;
}

function BracketMatchCard({
  match,
  pairA,
  pairB,
  onAddScore,
  onEditScore,
  formatScore,
  isImportant = false,
  isFinal = false,
}: BracketMatchCardProps) {
  const formatPairName = (pair?: Pair): string => {
    if (!pair) return "TBD";
    return `${pair.player1?.name || "Jugador 1"} / ${
      pair.player2?.name || "Jugador 2"
    }`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "finished":
        return (
          <Badge className="bg-green-100 text-green-800">Finalizado</Badge>
        );
      case "playing":
        return <Badge className="bg-blue-100 text-blue-800">Jugando</Badge>;
      case "scheduled":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Programado</Badge>
        );
      default:
        return <Badge variant="outline">Pendiente</Badge>;
    }
  };

  const cardClass = `bracket-match-card transition-all hover:shadow-lg ${
    isFinal
      ? "border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100"
      : isImportant
      ? "border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100"
      : ""
  }`;

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm text-gray-700">
            {match.bracketPosition}
          </h4>
          {getStatusBadge(match.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Parejas */}
        <div className="space-y-3">
          <div
            className={`p-3 rounded-lg border-l-4 ${
              match.winnerPairId === pairA?.id
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                match.winnerPairId === pairA?.id
                  ? "text-green-800"
                  : "text-gray-800"
              }`}
            >
              {formatPairName(pairA)}
              {match.winnerPairId === pairA?.id && (
                <Crown className="inline h-4 w-4 ml-2 text-green-600" />
              )}
            </p>
          </div>

          <div
            className={`p-3 rounded-lg border-l-4 ${
              match.winnerPairId === pairB?.id
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                match.winnerPairId === pairB?.id
                  ? "text-green-800"
                  : "text-gray-800"
              }`}
            >
              {formatPairName(pairB)}
              {match.winnerPairId === pairB?.id && (
                <Crown className="inline h-4 w-4 ml-2 text-green-600" />
              )}
            </p>
          </div>
        </div>

        {/* Resultado */}
        {match.status === "finished" && (
          <div className="space-y-2">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-sm font-mono text-blue-800">
                {formatScore(match)}
              </p>
            </div>
            {onEditScore && (
              <Button
                size="sm"
                onClick={onEditScore}
                className="w-full"
                variant="outline"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Resultado
              </Button>
            )}
          </div>
        )}

        {/* Botón de acción */}
        {match.status === "pending" && pairA && pairB && (
          <Button
            size="sm"
            onClick={onAddScore}
            className="w-full"
            variant="outline"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Resultado
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
