"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Trophy,
  Users,
  Calendar,
  Play,
  Crown,
  Medal,
  ArrowRight,
  Trash2,
  Eye,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Category, Match, Pair } from "@/types";
import { useTournamentStore } from "@/stores/tournament-store";
import { toast } from "sonner";
import {
  getCategories,
  getTopPairsFromGroups,
  createEliminationMatches,
  getEliminationMatches,
  deleteAllCategoryMatches,
  updateMatchResult,
  clearEliminations,
  getAllGroupStandings,
} from "@/lib/supabase-queries";

export default function EliminationsPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [topPairs, setTopPairs] = useState<Pair[]>([]);
  const [eliminationMatches, setEliminationMatches] = useState<Match[]>([]);
  const [groupStandings, setGroupStandings] = useState<{
    [groupId: string]: { groupName: string; standings: any[] };
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMatchesDialog, setShowMatchesDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
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

  const { currentTournament } = useTournamentStore();

  useEffect(() => {
    if (currentTournament) {
      loadCategories();
    }
  }, [currentTournament]);

  useEffect(() => {
    if (selectedCategoryId) {
      loadCategoryData();
    }
  }, [selectedCategoryId]);

  const loadCategories = async () => {
    if (!currentTournament) return;

    try {
      setIsLoading(true);
      const categoriesData = await getCategories(currentTournament.id);

      if (categoriesData.length === 0) {
        toast.error("No hay categorías en este torneo");
        setIsLoading(false);
        return;
      }

      setCategories(categoriesData);
      setSelectedCategoryId(categoriesData[0].id);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Error al cargar las categorías");
      setIsLoading(false);
    }
  };

  const loadCategoryData = async () => {
    if (!selectedCategoryId) return;

    try {
      setIsLoading(true);

      // Limpiar estado local primero
      setTopPairs([]);
      setEliminationMatches([]);
      setGroupStandings({});

      // Cargar mejores parejas, partidos de eliminatorias y standings de grupos
      const [topPairsData, eliminationMatchesData, standingsData] =
        await Promise.all([
          getTopPairsFromGroups(selectedCategoryId, 2), // Top 2 de cada grupo
          getEliminationMatches(selectedCategoryId),
          getAllGroupStandings(selectedCategoryId), // Standings de todos los grupos
        ]);

      setTopPairs(topPairsData);
      setEliminationMatches(eliminationMatchesData);
      setGroupStandings(standingsData);

      console.log(
        `🏆 Cargadas ${topPairsData.length} parejas para eliminatorias`
      );
      console.log(
        `🎯 Cargados ${eliminationMatchesData.length} partidos de eliminatorias`
      );
    } catch (error) {
      console.error("Error loading category data:", error);
      toast.error("Error al cargar los datos de la categoría");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateEliminations = async () => {
    if (!currentTournament || !selectedCategoryId) {
      toast.error("No hay categoría seleccionada");
      return;
    }

    if (topPairs.length < 2) {
      toast.error("Se necesitan al menos 2 parejas para generar eliminatorias");
      return;
    }

    // Confirmar generación
    const confirmGenerate = window.confirm(
      `¿Estás seguro de que quieres generar eliminatorias para ${topPairs.length} parejas?\n\nEsto creará los partidos de cuartos, semifinales, final y tercer lugar.`
    );

    if (!confirmGenerate) return;

    try {
      setIsGenerating(true);
      toast.loading("Generando eliminatorias...", {
        id: "generate-eliminations",
      });

      // Eliminar SOLO partidos de eliminatorias existentes (NO los de grupos)
      await clearEliminations(selectedCategoryId);

      // Crear nuevos partidos de eliminatorias
      const createdMatches = await createEliminationMatches(
        selectedCategoryId,
        currentTournament.id,
        topPairs
      );

      // Recargar datos
      await loadCategoryData();

      toast.success(
        `¡Eliminatorias generadas exitosamente! ${createdMatches.length} partidos creados.`,
        { id: "generate-eliminations" }
      );
    } catch (error) {
      console.error("Error generating eliminations:", error);
      toast.error("Error al generar eliminatorias", {
        id: "generate-eliminations",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteEliminations = async () => {
    if (!selectedCategoryId) {
      toast.error("No hay categoría seleccionada");
      return;
    }

    if (eliminationMatches.length === 0) {
      toast.error("No hay eliminatorias para eliminar");
      return;
    }

    // Confirmar eliminación
    const confirmDelete = window.confirm(
      "¿Estás seguro de que quieres eliminar todas las eliminatorias? Esta acción no se puede deshacer."
    );

    if (!confirmDelete) return;

    try {
      toast.loading("Eliminando eliminatorias...", {
        id: "delete-eliminations",
      });

      // Eliminar solo partidos de eliminatorias
      await clearEliminations(selectedCategoryId);

      // Recargar datos
      await loadCategoryData();

      toast.success("Eliminatorias eliminadas exitosamente", {
        id: "delete-eliminations",
      });
    } catch (error) {
      console.error("Error deleting eliminations:", error);
      toast.error("Error al eliminar eliminatorias", {
        id: "delete-eliminations",
      });
    }
  };

  const handleForceNextRound = async () => {
    if (!selectedCategoryId) {
      toast.error("No hay categoría seleccionada");
      return;
    }

    const currentTournament = useTournamentStore.getState().tournaments[0];
    if (!currentTournament) {
      toast.error("No hay torneo seleccionado");
      return;
    }

    try {
      toast.loading("Generando siguiente ronda...", {
        id: "force-next-round",
      });

      const response = await fetch(
        `/api/force-next-round?categoryId=${selectedCategoryId}&tournamentId=${currentTournament.id}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Siguiente ronda generada exitosamente", {
          id: "force-next-round",
        });
        // Recargar los partidos
        await loadCategoryData();
      } else {
        toast.error(result.error || "Error generando siguiente ronda", {
          id: "force-next-round",
        });
      }
    } catch (error) {
      console.error("Error forzando siguiente ronda:", error);
      toast.error("Error forzando siguiente ronda", {
        id: "force-next-round",
      });
    }
  };

  const handleViewMatches = () => {
    setShowMatchesDialog(true);
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

  const handleSubmitScore = async () => {
    if (!selectedMatch) return;

    try {
      toast.loading("Guardando resultado...", { id: "save-score" });

      const {
        pairA_set1,
        pairA_set2,
        pairA_set3,
        pairB_set1,
        pairB_set2,
        pairB_set3,
        hasSuperDeath,
        pairA_superDeath,
        pairB_superDeath,
      } = scoreForm;

      // Validar datos
      if (!pairA_set1 || !pairA_set2 || !pairB_set1 || !pairB_set2) {
        toast.error("Los sets 1 y 2 son obligatorios");
        return;
      }

      const scorePairA = {
        set1: parseInt(pairA_set1),
        set2: parseInt(pairA_set2),
        set3: pairA_set3 ? parseInt(pairA_set3) : undefined,
        superDeath:
          hasSuperDeath && pairA_superDeath
            ? parseInt(pairA_superDeath)
            : undefined,
      };

      const scorePairB = {
        set1: parseInt(pairB_set1),
        set2: parseInt(pairB_set2),
        set3: pairB_set3 ? parseInt(pairB_set3) : undefined,
        superDeath:
          hasSuperDeath && pairB_superDeath
            ? parseInt(pairB_superDeath)
            : undefined,
      };

      // Determinar ganador
      let pairA_sets = 0;
      let pairB_sets = 0;

      if (scorePairA.set1 > scorePairB.set1) pairA_sets++;
      else pairB_sets++;
      if (scorePairA.set2 > scorePairB.set2) pairA_sets++;
      else pairB_sets++;
      if (scorePairA.set3 !== undefined && scorePairB.set3 !== undefined) {
        if (scorePairA.set3 > scorePairB.set3) pairA_sets++;
        else pairB_sets++;
      }

      let winnerPairId;

      // Si hay empate en sets y Super Muerte está activada
      if (pairA_sets === pairB_sets && hasSuperDeath) {
        winnerPairId =
          parseInt(pairA_superDeath) > parseInt(pairB_superDeath)
            ? selectedMatch.pairAId
            : selectedMatch.pairBId;
      } else {
        winnerPairId =
          pairA_sets > pairB_sets
            ? selectedMatch.pairAId
            : selectedMatch.pairBId;
      }

      // Actualizar resultado
      await updateMatchResult(
        selectedMatch.id,
        scorePairA,
        scorePairB,
        winnerPairId
      );

      // Recargar datos
      await loadCategoryData();

      toast.success("¡Resultado guardado exitosamente!", { id: "save-score" });
      setShowScoreDialog(false);
    } catch (error) {
      console.error("Error saving score:", error);
      toast.error("Error al guardar resultado", { id: "save-score" });
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "quarterfinals":
        return <Users className="h-4 w-4" />;
      case "semifinals":
        return <Play className="h-4 w-4" />;
      case "final":
        return <Crown className="h-4 w-4" />;
      case "third_place":
        return <Medal className="h-4 w-4" />;
      default:
        return <Trophy className="h-4 w-4" />;
    }
  };

  const getStageName = (stage: string) => {
    switch (stage) {
      case "quarterfinals":
        return "Cuartos de Final";
      case "semifinals":
        return "Semifinales";
      case "final":
        return "Final";
      case "third_place":
        return "Tercer Lugar";
      default:
        return stage;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "quarterfinals":
        return "bg-blue-100 text-blue-800";
      case "semifinals":
        return "bg-purple-100 text-purple-800";
      case "final":
        return "bg-yellow-100 text-yellow-800";
      case "third_place":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!currentTournament) {
    return (
      <div className="eliminations-page p-6 max-w-7xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              No hay torneo seleccionado
            </h2>
            <p className="text-gray-600 mb-4">
              Ve a "Torneos" y selecciona un torneo para gestionar las
              eliminatorias.
            </p>
            <Button onClick={() => router.push("/admin/tournaments")}>
              <Trophy className="h-4 w-4 mr-2" />
              Ir a Torneos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="eliminations-page p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-10 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg border p-6">
                <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-16 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="eliminations-page p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="eliminations-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Eliminatorias</h1>
          <p className="text-gray-600 mt-1">
            Torneo: {currentTournament.name} • {topPairs.length} parejas
            clasificadas
          </p>
        </div>

        {/* Category Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="category-select"
              className="text-sm font-medium whitespace-nowrap"
            >
              Categoría:
            </Label>
            <Select
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            {eliminationMatches.length === 0 ? (
              <Button
                onClick={handleGenerateEliminations}
                disabled={isGenerating || topPairs.length < 2}
                className="bg-green-600 hover:bg-green-700"
              >
                <Trophy className="h-4 w-4 mr-2" />
                {isGenerating ? "Generando..." : "Generar Eliminatorias"}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleViewMatches}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Ver Partidos
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(`/live/${selectedCategoryId}`, "_blank")
                  }
                  className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Vista en Tiempo Real
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleForceNextRound}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Generar Siguiente Ronda
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteEliminations}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Eliminatorias
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTopPairs([]);
                    setEliminationMatches([]);
                    loadCategoryData();
                  }}
                  className="bg-gray-100 hover:bg-gray-200"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recargar Datos
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Tabla de Resultados de Grupos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Resultados de Grupos
            </CardTitle>
            <CardDescription>
              Tabla general de posiciones de cada grupo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(groupStandings).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No hay resultados de grupos disponibles</p>
                <p className="text-sm">
                  Genera grupos y completa partidos para ver los resultados
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupStandings).map(([groupId, groupData]) => (
                  <div key={groupId} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-3 text-blue-700">
                      {groupData.groupName}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-2">Pos</th>
                            <th className="text-left p-2">Pareja</th>
                            <th className="text-center p-2">PJ</th>
                            <th className="text-center p-2">PG</th>
                            <th className="text-center p-2">Pts</th>
                            <th className="text-center p-2">Sets</th>
                            <th className="text-center p-2">Games</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupData.standings.map((standing, index) => (
                            <tr
                              key={standing.pairId}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="p-2 font-medium">
                                {index === 0 && (
                                  <Crown className="h-4 w-4 text-yellow-500 inline mr-1" />
                                )}
                                {index === 1 && (
                                  <Medal className="h-4 w-4 text-gray-400 inline mr-1" />
                                )}
                                {index === 2 && (
                                  <Medal className="h-4 w-4 text-amber-600 inline mr-1" />
                                )}
                                {index + 1}
                              </td>
                              <td className="p-2 font-medium">
                                {standing.pairName}
                              </td>
                              <td className="p-2 text-center">
                                {standing.matchesPlayed}
                              </td>
                              <td className="p-2 text-center">
                                {standing.matchesWon}
                              </td>
                              <td className="p-2 text-center font-semibold">
                                {standing.points}
                              </td>
                              <td className="p-2 text-center">
                                {standing.setsWon}-{standing.setsLost}
                                {standing.setsDifference > 0 && (
                                  <span className="text-green-600 ml-1">
                                    (+{standing.setsDifference})
                                  </span>
                                )}
                                {standing.setsDifference < 0 && (
                                  <span className="text-red-600 ml-1">
                                    ({standing.setsDifference})
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {standing.gamesWon}-{standing.gamesLost}
                                {standing.gamesDifference > 0 && (
                                  <span className="text-green-600 ml-1">
                                    (+{standing.gamesDifference})
                                  </span>
                                )}
                                {standing.gamesDifference < 0 && (
                                  <span className="text-red-600 ml-1">
                                    ({standing.gamesDifference})
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clasificados y Estado de Eliminatorias */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clasificados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Parejas Clasificadas
              </CardTitle>
              <CardDescription>
                Mejores parejas de cada grupo para eliminatorias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topPairs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay parejas clasificadas</p>
                  <p className="text-sm">
                    Genera grupos y completa partidos primero
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topPairs.map((pair, index) => (
                    <div
                      key={pair.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {pair.player1.name} & {pair.player2.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {pair.player1.phone} • {pair.player2.phone}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">Clasificado</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estado de Eliminatorias */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                Estado de Eliminatorias
              </CardTitle>
              <CardDescription>
                Progreso de los partidos de eliminatorias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eliminationMatches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay eliminatorias generadas</p>
                  <p className="text-sm">
                    Haz clic en "Generar Eliminatorias" para comenzar
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {["quarterfinals", "semifinals", "final", "third_place"].map(
                    (stage) => {
                      const stageMatches = eliminationMatches.filter(
                        (match) => match.stage === stage
                      );
                      const completedMatches = stageMatches.filter(
                        (match) => match.status === "completed"
                      );

                      if (stageMatches.length === 0) return null;

                      return (
                        <div key={stage} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getStageIcon(stage)}
                              <span className="font-medium">
                                {getStageName(stage)}
                              </span>
                            </div>
                            <Badge className={getStageColor(stage)}>
                              {completedMatches.length}/{stageMatches.length}
                            </Badge>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${
                                  (completedMatches.length /
                                    stageMatches.length) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog para mostrar partidos */}
      <Dialog open={showMatchesDialog} onOpenChange={setShowMatchesDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Partidos de Eliminatorias</DialogTitle>
            <DialogDescription>
              Lista de todos los partidos de eliminatorias con opciones para
              agregar resultados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {["quarterfinals", "semifinals", "final", "third_place"].map(
              (stage) => {
                const stageMatches = eliminationMatches.filter(
                  (match) => match.stage === stage
                );

                if (stageMatches.length === 0) return null;

                return (
                  <div key={stage} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      {getStageIcon(stage)}
                      <h3 className="text-lg font-semibold">
                        {getStageName(stage)}
                      </h3>
                      <Badge className={getStageColor(stage)}>
                        {stageMatches.length} partido
                        {stageMatches.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>

                    <div className="grid gap-4">
                      {stageMatches.map((match, index) => {
                        const pairA = topPairs.find(
                          (p) => p.id === match.pairAId
                        );
                        const pairB = topPairs.find(
                          (p) => p.id === match.pairBId
                        );

                        return (
                          <div
                            key={match.id}
                            className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            <div className="p-6">
                              {/* Header */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {index + 1}
                                  </div>
                                  <h4 className="font-semibold text-gray-900">
                                    {getStageName(stage)} - Partido {index + 1}
                                  </h4>
                                </div>
                                <Badge
                                  variant={
                                    match.status === "pending"
                                      ? "secondary"
                                      : match.status === "completed"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {match.status === "pending"
                                    ? "Pendiente"
                                    : match.status === "completed"
                                    ? "Finalizado"
                                    : "En Juego"}
                                </Badge>
                              </div>

                              {/* Parejas */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                {/* Pareja A */}
                                <div
                                  className={`rounded-lg p-4 border-2 transition-all relative overflow-hidden ${
                                    match.status === "completed" &&
                                    match.winnerPairId === pairA?.id
                                      ? "bg-gradient-to-r from-green-100 to-green-200 border-green-400 shadow-md"
                                      : "bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200"
                                  }`}
                                >
                                  {match.status === "completed" &&
                                    match.winnerPairId === pairA?.id && (
                                      <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                        <span className="text-8xl text-yellow-500">
                                          👑
                                        </span>
                                      </div>
                                    )}
                                  <div className="text-center relative z-10">
                                    <div
                                      className={`font-semibold mb-2 ${
                                        match.status === "completed" &&
                                        match.winnerPairId === pairA?.id
                                          ? "text-green-900"
                                          : "text-blue-900"
                                      }`}
                                    >
                                      <div className="flex items-center justify-center">
                                        <span>
                                          {pairA?.player1?.name || "Jugador 1"}
                                        </span>
                                      </div>
                                      <div className="text-sm opacity-75 border-t border-current/20 pt-1 mt-1">
                                        {pairA?.player2?.name || "Jugador 2"}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* VS y Resultado */}
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-gray-400 mb-2">
                                    VS
                                  </div>
                                  {match.status === "completed" &&
                                  match.scorePairA &&
                                  match.scorePairB ? (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                      <div className="text-lg font-mono font-bold text-green-800">
                                        {match.scorePairA.set1}-
                                        {match.scorePairB.set1} |{" "}
                                        {match.scorePairA.set2}-
                                        {match.scorePairB.set2}
                                        {match.scorePairA.set3 &&
                                          match.scorePairB.set3 && (
                                            <span>
                                              {" "}
                                              | {match.scorePairA.set3}-
                                              {match.scorePairB.set3}
                                            </span>
                                          )}
                                      </div>
                                      {match.scorePairA.superDeath !==
                                        undefined &&
                                        match.scorePairB.superDeath !==
                                          undefined && (
                                          <div className="text-sm text-red-600 font-bold mt-1">
                                            SM: {match.scorePairA.superDeath}-
                                            {match.scorePairB.superDeath}
                                          </div>
                                        )}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500">
                                      Sin resultado
                                    </div>
                                  )}
                                </div>

                                {/* Pareja B */}
                                <div
                                  className={`rounded-lg p-4 border-2 transition-all relative overflow-hidden ${
                                    match.status === "completed" &&
                                    match.winnerPairId === pairB?.id
                                      ? "bg-gradient-to-r from-green-100 to-green-200 border-green-400 shadow-md"
                                      : "bg-gradient-to-r from-red-50 to-red-100 border border-red-200"
                                  }`}
                                >
                                  {match.status === "completed" &&
                                    match.winnerPairId === pairB?.id && (
                                      <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                        <span className="text-8xl text-yellow-500">
                                          👑
                                        </span>
                                      </div>
                                    )}
                                  <div className="text-center relative z-10">
                                    <div
                                      className={`font-semibold mb-2 ${
                                        match.status === "completed" &&
                                        match.winnerPairId === pairB?.id
                                          ? "text-green-900"
                                          : "text-red-900"
                                      }`}
                                    >
                                      <div className="flex items-center justify-center">
                                        <span>
                                          {pairB?.player1?.name || "Jugador 1"}
                                        </span>
                                      </div>
                                      <div className="text-sm opacity-75 border-t border-current/20 pt-1 mt-1">
                                        {pairB?.player2?.name || "Jugador 2"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Botones de acción */}
                              <div className="flex justify-center mt-6 pt-4 border-t border-gray-100">
                                {match.status === "completed" &&
                                match.scorePairA &&
                                match.scorePairB ? (
                                  <Button
                                    variant="outline"
                                    onClick={() => handleAddScore(match)}
                                    className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
                                  >
                                    <Calendar className="h-4 w-4" />
                                    Editar Resultado
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => handleAddScore(match)}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                                  >
                                    <Calendar className="h-4 w-4" />
                                    Agregar Resultado
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para capturar resultado */}
      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cargar Resultado del Partido</DialogTitle>
            <DialogDescription>
              Formulario para ingresar los resultados de sets del partido de
              eliminatorias
            </DialogDescription>
          </DialogHeader>

          {selectedMatch && (
            <div className="space-y-6">
              {/* Info del partido */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {getStageName(selectedMatch.stage)}
                </h3>
                <div className="text-sm text-gray-600">
                  {
                    topPairs.find((p) => p.id === selectedMatch.pairAId)
                      ?.player1.name
                  }{" "}
                  &{" "}
                  {
                    topPairs.find((p) => p.id === selectedMatch.pairAId)
                      ?.player2.name
                  }{" "}
                  vs{" "}
                  {
                    topPairs.find((p) => p.id === selectedMatch.pairBId)
                      ?.player1.name
                  }{" "}
                  &{" "}
                  {
                    topPairs.find((p) => p.id === selectedMatch.pairBId)
                      ?.player2.name
                  }
                </div>
              </div>

              {/* Formulario de scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pareja A */}
                <div className="space-y-4">
                  <h4 className="font-medium text-blue-900">
                    {
                      topPairs.find((p) => p.id === selectedMatch.pairAId)
                        ?.player1.name
                    }{" "}
                    &{" "}
                    {
                      topPairs.find((p) => p.id === selectedMatch.pairAId)
                        ?.player2.name
                    }
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="pairA_set1">Set 1 *</Label>
                      <input
                        id="pairA_set1"
                        type="number"
                        min="0"
                        max="7"
                        value={scoreForm.pairA_set1}
                        onChange={(e) =>
                          setScoreForm({
                            ...scoreForm,
                            pairA_set1: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pairA_set2">Set 2 *</Label>
                      <input
                        id="pairA_set2"
                        type="number"
                        min="0"
                        max="7"
                        value={scoreForm.pairA_set2}
                        onChange={(e) =>
                          setScoreForm({
                            ...scoreForm,
                            pairA_set2: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pairA_set3">Set 3 (opcional)</Label>
                      <input
                        id="pairA_set3"
                        type="number"
                        min="0"
                        max="7"
                        value={scoreForm.pairA_set3}
                        onChange={(e) =>
                          setScoreForm({
                            ...scoreForm,
                            pairA_set3: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Pareja B */}
                <div className="space-y-4">
                  <h4 className="font-medium text-red-900">
                    {
                      topPairs.find((p) => p.id === selectedMatch.pairBId)
                        ?.player1.name
                    }{" "}
                    &{" "}
                    {
                      topPairs.find((p) => p.id === selectedMatch.pairBId)
                        ?.player2.name
                    }
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="pairB_set1">Set 1 *</Label>
                      <input
                        id="pairB_set1"
                        type="number"
                        min="0"
                        max="7"
                        value={scoreForm.pairB_set1}
                        onChange={(e) =>
                          setScoreForm({
                            ...scoreForm,
                            pairB_set1: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pairB_set2">Set 2 *</Label>
                      <input
                        id="pairB_set2"
                        type="number"
                        min="0"
                        max="7"
                        value={scoreForm.pairB_set2}
                        onChange={(e) =>
                          setScoreForm({
                            ...scoreForm,
                            pairB_set2: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pairB_set3">Set 3 (opcional)</Label>
                      <input
                        id="pairB_set3"
                        type="number"
                        min="0"
                        max="7"
                        value={scoreForm.pairB_set3}
                        onChange={(e) =>
                          setScoreForm({
                            ...scoreForm,
                            pairB_set3: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Super Muerte */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hasSuperDeath"
                    checked={scoreForm.hasSuperDeath}
                    onChange={(e) =>
                      setScoreForm({
                        ...scoreForm,
                        hasSuperDeath: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="hasSuperDeath">
                    ¿Hubo Super Muerte? (desempate - primer equipo en llegar a
                    10 gana)
                  </Label>
                </div>
                {scoreForm.hasSuperDeath && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pairA_superDeath">
                        Super Muerte Pareja A
                      </Label>
                      <input
                        id="pairA_superDeath"
                        type="number"
                        min="0"
                        max="15"
                        value={scoreForm.pairA_superDeath}
                        onChange={(e) =>
                          setScoreForm({
                            ...scoreForm,
                            pairA_superDeath: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pairB_superDeath">
                        Super Muerte Pareja B
                      </Label>
                      <input
                        id="pairB_superDeath"
                        type="number"
                        min="0"
                        max="15"
                        value={scoreForm.pairB_superDeath}
                        onChange={(e) =>
                          setScoreForm({
                            ...scoreForm,
                            pairB_superDeath: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowScoreDialog(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSubmitScore}>Guardar Resultado</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
