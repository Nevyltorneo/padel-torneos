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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Trophy,
  Calendar,
  ArrowRight,
  Plus,
  Edit,
  Trash2,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Group, Pair, Match, Category } from "@/types";
import { useTournamentStore } from "@/stores/tournament-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getGroups,
  getPairs,
  getCategories,
  createMatches,
  getMatches,
  updateMatchResult,
  calculateStandings,
  deleteAllGroupMatches,
  deleteAllCategoryMatches,
  deleteGroups,
  updateGroup,
  StandingsEntry,
} from "@/lib/supabase-queries";
import { generateRoundRobinMatches } from "@/lib/algorithms/round-robin";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { DroppableGroup } from "@/components/drag-drop/DroppableGroup";
import { DraggablePair } from "@/components/drag-drop/DraggablePair";
import { usePairSwap } from "@/hooks/usePairSwap";

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [allPairs, setAllPairs] = useState<Pair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedGroupMatches, setSelectedGroupMatches] = useState<Match[]>([]);
  const [showMatchesDialog, setShowMatchesDialog] = useState(false);
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showStandingsDialog, setShowStandingsDialog] = useState(false);
  const [selectedGroupStandings, setSelectedGroupStandings] = useState<
    StandingsEntry[]
  >([]);

  // Drag & Drop states
  const [activePair, setActivePair] = useState<Pair | null>(null);
  const [isDragMode, setIsDragMode] = useState(false);
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
    isTimeLimit: false,
  });

  const { currentTournament } = useTournamentStore();

  // Función para recargar grupos (definida antes del hook)
  const loadGroups = async () => {
    if (!selectedCategoryId) return;

    try {
      console.log("Reloading groups for category:", selectedCategoryId);

      // Recargar solo los grupos y parejas
      const [groupsData, pairsData] = await Promise.all([
        getGroups(selectedCategoryId),
        getPairs(selectedCategoryId),
      ]);

      console.log("Groups reloaded:", groupsData);
      console.log("Pairs reloaded:", pairsData);

      setGroups(groupsData);
      setAllPairs(pairsData);
    } catch (error) {
      console.error("Error reloading groups:", error);
      toast.error("Error al recargar los grupos");
    }
  };

  // Drag & Drop hook
  const { swapPairs, movePairToGroup, isSwapping } = usePairSwap({
    onSwapComplete: () => {
      loadGroups();
      setActivePair(null);
    },
  });

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

      // Obtener todas las categorías del torneo actual
      const categoriesData = await getCategories(currentTournament.id);

      if (categoriesData.length === 0) {
        toast.error("No hay categorías en este torneo");
        setIsLoading(false);
        return;
      }

      setCategories(categoriesData);

      // Seleccionar la primera categoría por defecto
      const firstCategory = categoriesData[0];
      setSelectedCategoryId(firstCategory.id);
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

      console.log("Loading groups for category:", selectedCategoryId);

      // Cargar grupos y parejas de la categoría seleccionada
      const [groupsData, pairsData] = await Promise.all([
        getGroups(selectedCategoryId),
        getPairs(selectedCategoryId),
      ]);

      console.log("Groups loaded:", groupsData);
      console.log("Pairs loaded:", pairsData);

      setGroups(groupsData);
      setAllPairs(pairsData);
    } catch (error) {
      console.error("Error loading category data:", error);
      toast.error("Error al cargar los datos de la categoría");
    } finally {
      setIsLoading(false);
    }
  };

  const getPairsByIds = (pairIds: string[]): Pair[] => {
    return pairIds
      .map((id) => allPairs.find((pair) => pair.id === id))
      .filter(Boolean) as Pair[];
  };

  const handleGenerateMatches = async () => {
    if (!currentTournament || groups.length === 0) {
      toast.error("No hay grupos para generar partidos");
      return;
    }

    try {
      toast.loading("Regenerando partidos Round-Robin...", {
        id: "generate-matches",
      });

      // 🗑️🧹 RESET COMPLETO - LIMPIAR TODOS los partidos (grupos + eliminatorias)
      console.log(
        "🔄 RESET COMPLETO - Eliminando TODOS los partidos anteriores..."
      );
      await deleteAllCategoryMatches(selectedCategoryId);

      let totalMatches = 0;

      // Generar partidos para cada grupo
      for (const group of groups) {
        console.log(
          `Generando partidos para ${group.name} con ${group.pairIds.length} parejas`
        );

        const matchesToCreate = generateRoundRobinMatches(group, allPairs, {
          tournamentId: currentTournament.id,
          categoryId: selectedCategoryId,
        });

        console.log(
          `${group.name}: ${matchesToCreate.length} partidos a crear`
        );

        if (matchesToCreate.length > 0) {
          await createMatches(matchesToCreate, true); // skipDelete = true porque ya limpiamos todo
          totalMatches += matchesToCreate.length;
        }
      }

      toast.success(
        `¡Partidos regenerados! ${totalMatches} partidos Round-Robin creados para ${groups.length} grupos`,
        { id: "generate-matches" }
      );

      console.log(`Total de partidos generados: ${totalMatches}`);
    } catch (error) {
      console.error("Error generating matches:", error);
      toast.error("Error al regenerar partidos", { id: "generate-matches" });
    }
  };

  const handleViewMatches = async (group: Group) => {
    try {
      toast.loading("Cargando partidos...", { id: "load-matches" });

      const matches = await getMatches(group.id);

      setSelectedGroupMatches(matches);
      setSelectedGroupName(group.name);
      setShowMatchesDialog(true);

      toast.success(`${matches.length} partidos cargados`, {
        id: "load-matches",
      });
    } catch (error) {
      console.error("Error loading matches:", error);
      toast.error("Error al cargar partidos", { id: "load-matches" });
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
      isTimeLimit: false,
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
      isTimeLimit: false, // No se guarda en BD por ahora, solo para UI
    });
    setShowScoreDialog(true);
  };

  const handleSubmitScore = async () => {
    if (!selectedMatch) return;

    try {
      toast.loading("Guardando resultado...", { id: "save-score" });

      // Validar que al menos 1 set esté completo
      const pairA_set1 = scoreForm.pairA_set1 ? parseInt(scoreForm.pairA_set1) : undefined;
      const pairA_set2 = scoreForm.pairA_set2 ? parseInt(scoreForm.pairA_set2) : undefined;
      const pairA_set3 = scoreForm.pairA_set3
        ? parseInt(scoreForm.pairA_set3)
        : undefined;

      const pairB_set1 = scoreForm.pairB_set1 ? parseInt(scoreForm.pairB_set1) : undefined;
      const pairB_set2 = scoreForm.pairB_set2 ? parseInt(scoreForm.pairB_set2) : undefined;
      const pairB_set3 = scoreForm.pairB_set3
        ? parseInt(scoreForm.pairB_set3)
        : undefined;

      // Verificar que al menos un set esté completo
      if (
        (pairA_set1 === undefined || pairB_set1 === undefined) &&
        (pairA_set2 === undefined || pairB_set2 === undefined) &&
        (pairA_set3 === undefined || pairB_set3 === undefined)
      ) {
        toast.error("Debes completar al menos 1 set para determinar el ganador", {
          id: "save-score",
        });
        return;
      }

      // Validar Super Muerte si está activada
      let pairA_superDeath, pairB_superDeath;
      if (scoreForm.hasSuperDeath) {
        pairA_superDeath = parseInt(scoreForm.pairA_superDeath);
        pairB_superDeath = parseInt(scoreForm.pairB_superDeath);

        if (isNaN(pairA_superDeath) || isNaN(pairB_superDeath)) {
          toast.error("Debes completar los puntos de Super Muerte", {
            id: "save-score",
          });
          return;
        }

        if (
          pairA_superDeath < 0 ||
          pairA_superDeath > 20 ||
          pairB_superDeath < 0 ||
          pairB_superDeath > 20
        ) {
          toast.error("Los puntos de Super Muerte deben estar entre 0 y 20", {
            id: "save-score",
          });
          return;
        }

        // Validar que al menos uno llegue a 10 puntos
        if (pairA_superDeath < 10 && pairB_superDeath < 10) {
          toast.error(
            "Al menos una pareja debe llegar a 10 puntos para ganar",
            {
              id: "save-score",
            }
          );
          return;
        }
      }

      // Crear objetos de score
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

      // Determinar ganador
      let pairA_sets = 0;
      let pairB_sets = 0;
      let hasEmpate = false;

      // Solo contar sets que estén completos
      if (pairA_set1 !== undefined && pairB_set1 !== undefined) {
        if (pairA_set1 > pairB_set1) pairA_sets++;
        else if (pairB_set1 > pairA_set1) pairB_sets++;
        else hasEmpate = true; // Empate en games (4-4, 5-5, etc.)
      }
      if (pairA_set2 !== undefined && pairB_set2 !== undefined) {
        if (pairA_set2 > pairB_set2) pairA_sets++;
        else if (pairB_set2 > pairA_set2) pairB_sets++;
        else hasEmpate = true; // Empate en games
      }
      if (pairA_set3 !== undefined && pairB_set3 !== undefined) {
        if (pairA_set3 > pairB_set3) pairA_sets++;
        else if (pairB_set3 > pairA_set3) pairB_sets++;
        else hasEmpate = true; // Empate en games
      }

      let winnerPairId;

      // Si hay empate en sets y Super Muerte está activada
      if (pairA_sets === pairB_sets && scoreForm.hasSuperDeath) {
        winnerPairId =
          pairA_superDeath! > pairB_superDeath!
            ? selectedMatch.pairAId
            : selectedMatch.pairBId;
      } 
      // Si hay empate en games (4-4, 5-5, etc.) y Super Muerte está activada
      else if (hasEmpate && scoreForm.hasSuperDeath) {
        winnerPairId =
          pairA_superDeath! > pairB_superDeath!
            ? selectedMatch.pairAId
            : selectedMatch.pairBId;
      }
      // Si hay empate en sets o games sin Super Muerte, determinar por diferencia de games
      else if (pairA_sets === pairB_sets || hasEmpate) {
        // Calcular diferencia total de games
        let pairA_totalGames = 0;
        let pairB_totalGames = 0;
        
        if (pairA_set1 !== undefined && pairB_set1 !== undefined) {
          pairA_totalGames += pairA_set1;
          pairB_totalGames += pairB_set1;
        }
        if (pairA_set2 !== undefined && pairB_set2 !== undefined) {
          pairA_totalGames += pairA_set2;
          pairB_totalGames += pairB_set2;
        }
        if (pairA_set3 !== undefined && pairB_set3 !== undefined) {
          pairA_totalGames += pairA_set3;
          pairB_totalGames += pairB_set3;
        }
        
        if (pairA_totalGames > pairB_totalGames) {
          winnerPairId = selectedMatch.pairAId;
        } else if (pairB_totalGames > pairA_totalGames) {
          winnerPairId = selectedMatch.pairBId;
        } else {
          // Empate total - asignar ganador por sorteo o ranking
          // En torneos relámpago es normal tener empates por tiempo
          winnerPairId = selectedMatch.pairAId; // Por defecto, se puede cambiar por sorteo
        }
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

      // Recargar partidos inmediatamente
      const updatedMatches = await getMatches(selectedMatch.groupId!);
      setSelectedGroupMatches(updatedMatches);

      // Recargar datos principales de la categoría
      await loadCategoryData();

      // Forzar actualización adicional después de 1 segundo para asegurar sincronización
      setTimeout(async () => {
        console.log(
          "🔄 Forzando actualización adicional de partidos de grupos..."
        );
        try {
          const refreshedMatches = await getMatches(selectedMatch.groupId!);
          setSelectedGroupMatches(refreshedMatches);
          // También recargar datos principales
          await loadCategoryData();
          console.log("✅ Partidos de grupos actualizados");
        } catch (error) {
          console.error("Error en actualización adicional:", error);
        }
      }, 1000);

      toast.success("¡Resultado guardado exitosamente!", { id: "save-score" });
      setShowScoreDialog(false);
    } catch (error) {
      console.error("Error saving score:", error);
      toast.error("Error al guardar resultado", { id: "save-score" });
    }
  };

  const handleDeleteMatches = async () => {
    if (!currentTournament || !selectedCategoryId) {
      toast.error("No hay categoría seleccionada");
      return;
    }

    if (groups.length === 0) {
      toast.error("No hay grupos para eliminar partidos");
      return;
    }

    // Confirmar eliminación
    const confirmDelete = window.confirm(
      "¿Estás seguro de que quieres eliminar todos los partidos generados? Esta acción no se puede deshacer."
    );

    if (!confirmDelete) return;

    try {
      toast.loading("Eliminando partidos...", { id: "delete-matches" });

      // Eliminar todos los partidos de la categoría
      await deleteAllCategoryMatches(selectedCategoryId);

      // Actualizar estado local
      setSelectedGroupMatches([]);

      toast.success("Partidos eliminados exitosamente", {
        id: "delete-matches",
      });
    } catch (error) {
      console.error("Error deleting matches:", error);
      toast.error("Error al eliminar partidos", { id: "delete-matches" });
    }
  };

  const handleViewStandings = async (group: Group) => {
    try {
      toast.loading("Calculando tabla de posiciones...", {
        id: "load-standings",
      });

      const groupPairs = getPairsByIds(group.pairIds);
      const standings = await calculateStandings(group.id, groupPairs);

      setSelectedGroupStandings(standings);
      setSelectedGroupName(group.name);
      setShowStandingsDialog(true);

      toast.success("Tabla calculada", { id: "load-standings" });
    } catch (error) {
      console.error("Error calculating standings:", error);
      toast.error("Error al calcular tabla", { id: "load-standings" });
    }
  };

  // Wrapper functions for DroppableGroup component
  const handleViewMatchesWrapper = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      handleViewMatches(group);
    }
  };

  const handleViewStandingsWrapper = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      handleViewStandings(group);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (event: any) => {
    const { active } = event;
    const pair = allPairs.find((p) => p.id === active.id);
    setActivePair(pair || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActivePair(null);
      return;
    }

    // Buscar la pareja directamente por el active.id
    const draggedPair = allPairs.find((p) => p.id === active.id);
    if (!draggedPair) {
      setActivePair(null);
      return;
    }

    const targetGroupId = over.id as string;

    const currentGroup = groups.find((group) =>
      group.pairIds.includes(draggedPair.id)
    );

    if (!currentGroup || currentGroup.id === targetGroupId) {
      setActivePair(null);
      return;
    }

    // Encontrar el grupo objetivo
    const targetGroup = groups.find((group) => group.id === targetGroupId);

    if (!targetGroup) {
      setActivePair(null);
      return;
    }

    // Mover la pareja al grupo objetivo
    movePairToGroup(draggedPair, targetGroupId, groups);

    setActivePair(null);
  };

  if (!currentTournament) {
    return (
      <div className="groups-no-tournament p-6 max-w-7xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              No hay torneo seleccionado
            </h2>
            <p className="text-gray-600 mb-4">
              Selecciona un torneo para ver los grupos.
            </p>
            <Button onClick={() => router.push("/admin/tournaments")}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Ir a Torneos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="groups-loading p-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-40"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg border p-6">
                <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
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

  if (groups.length === 0) {
    return (
      <div className="groups-empty p-6 max-w-7xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              No hay grupos generados
            </h2>
            <p className="text-gray-600 mb-4">
              Ve a &quot;Categorías&quot; y haz clic en &quot;Generar
              Grupos&quot; para crear los grupos automáticamente.
            </p>
            <Button onClick={() => router.push("/admin/categories")}>
              <Trophy className="h-4 w-4 mr-2" />
              Ir a Categorías
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="groups-page p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="groups-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grupos Generados</h1>
          <p className="text-gray-600 mt-1">
            Torneo: {currentTournament.name} • {groups.length} grupos •{" "}
            {allPairs.length} parejas
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
            <Button variant="outline" onClick={handleGenerateMatches}>
              <Calendar className="h-4 w-4 mr-2" />
              Generar Partidos
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
            <Button onClick={() => router.push("/admin/schedule")}>
              <Trophy className="h-4 w-4 mr-2" />
              Ver Calendario
            </Button>
            {groups.length > 0 && (
              <Button variant="destructive" onClick={handleDeleteMatches}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Partidos
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Drag & Drop Toggle */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Grupos</h2>
          <Badge variant="outline" className="text-sm">
            {groups.length} grupos generados
          </Badge>
        </div>
        <Button
          onClick={() => setIsDragMode(!isDragMode)}
          variant={isDragMode ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          {isDragMode ? "Desactivar" : "Activar"} Reorganización
        </Button>
      </div>

      {/* Groups Grid with Drag & Drop */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="groups-grid grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((group) => {
            const groupPairs = getPairsByIds(group.pairIds);

            return (
              <DroppableGroup
                key={group.id}
                group={group}
                pairs={groupPairs}
                onViewMatches={handleViewMatchesWrapper}
                onViewStandings={handleViewStandingsWrapper}
                isDragMode={isDragMode}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activePair ? <DraggablePair pair={activePair} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Dialog para mostrar partidos */}
      <Dialog open={showMatchesDialog} onOpenChange={setShowMatchesDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Partidos de {selectedGroupName}</DialogTitle>
            <DialogDescription>
              Lista de partidos del grupo {selectedGroupName} con opciones para
              agregar resultados y ver detalles
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedGroupMatches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay partidos generados para este grupo.
                <br />
                Haz clic en &quot;Generar Partidos&quot; para crear los
                enfrentamientos.
              </div>
            ) : (
              <div className="grid gap-3">
                {selectedGroupMatches.map((match, index) => {
                  const pairA = allPairs.find((p) => p.id === match.pairAId);
                  const pairB = allPairs.find((p) => p.id === match.pairBId);
                  
                  // Detectar si hay empate
                  const isTie = match.status === "completed" && 
                    match.scorePairA && match.scorePairB && (
                      (match.scorePairA.set1 === match.scorePairB.set1 && match.scorePairA.set1 !== undefined) ||
                      (match.scorePairA.set2 === match.scorePairB.set2 && match.scorePairA.set2 !== undefined) ||
                      (match.scorePairA.set3 === match.scorePairB.set3 && match.scorePairA.set3 !== undefined)
                    );

                  return (
                    <div
                      key={match.id}
                      className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className="p-6">
                        {/* Header con número de partido */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <h4 className="font-semibold text-gray-900">
                              Partido {index + 1}
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

                        {/* Parejas enfrentándose */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                          {/* Pareja A */}
                          <div
                            className={`rounded-lg p-4 border-2 transition-all relative overflow-hidden ${
                              isTie
                                ? "bg-gradient-to-r from-blue-100 to-blue-200 border-blue-400 shadow-md"
                                : match.status === "completed" &&
                                  match.winnerPairId === pairA?.id
                                ? "bg-gradient-to-r from-green-100 to-green-200 border-green-400 shadow-md"
                                : "bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200"
                            }`}
                          >
                            {/* Corona de fondo para ganador (solo si no hay empate) */}
                            {match.status === "completed" &&
                              match.winnerPairId === pairA?.id && 
                              !isTie && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                  <span className="text-8xl text-yellow-500">
                                    👑
                                  </span>
                                </div>
                              )}
                            <div className="text-center relative z-10">
                              <div
                                className={`font-semibold mb-2 ${
                                  isTie
                                    ? "text-blue-900"
                                    : match.status === "completed" &&
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
                              {isTie ? "🤝" : "VS"}
                            </div>
                            {match.status === "completed" &&
                            match.scorePairA &&
                            match.scorePairB ? (
                              <div className={`${isTie ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'} rounded-lg p-3`}>
                                <div className={`text-lg font-mono font-bold ${isTie ? 'text-blue-800' : 'text-green-800'}`}>
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
                                {match.scorePairA.superDeath !== undefined &&
                                  match.scorePairB.superDeath !== undefined && (
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
                              isTie
                                ? "bg-gradient-to-r from-blue-100 to-blue-200 border-blue-400 shadow-md"
                                : match.status === "completed" &&
                                  match.winnerPairId === pairB?.id
                                ? "bg-gradient-to-r from-green-100 to-green-200 border-green-400 shadow-md"
                                : "bg-gradient-to-r from-red-50 to-red-100 border border-red-200"
                            }`}
                          >
                            {/* Corona de fondo para ganador (solo si no hay empate) */}
                            {match.status === "completed" &&
                              match.winnerPairId === pairB?.id && 
                              !isTie && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                  <span className="text-8xl text-yellow-500">
                                    👑
                                  </span>
                                </div>
                              )}
                            <div className="text-center relative z-10">
                              <div
                                className={`font-semibold mb-2 ${
                                  isTie
                                    ? "text-blue-900"
                                    : match.status === "completed" &&
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
                              onClick={() => handleEditScore(match)}
                              className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
                            >
                              <Edit className="h-4 w-4" />
                              Editar Resultado
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleAddScore(match)}
                              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                            >
                              <Plus className="h-4 w-4" />
                              Agregar Resultado
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
              Formulario para ingresar los resultados de sets del partido entre
              las parejas
            </DialogDescription>
          </DialogHeader>

          {selectedMatch && (
            <div className="space-y-6">
              {/* Info del partido */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <div className="font-medium text-lg mb-2">
                    {
                      allPairs.find((p) => p.id === selectedMatch.pairAId)
                        ?.player1?.name
                    }{" "}
                    /{" "}
                    {
                      allPairs.find((p) => p.id === selectedMatch.pairAId)
                        ?.player2?.name
                    }
                  </div>
                  <div className="text-gray-500 mb-2">vs</div>
                  <div className="font-medium text-lg">
                    {
                      allPairs.find((p) => p.id === selectedMatch.pairBId)
                        ?.player1?.name
                    }{" "}
                    /{" "}
                    {
                      allPairs.find((p) => p.id === selectedMatch.pairBId)
                        ?.player2?.name
                    }
                  </div>
                </div>
              </div>

              {/* Nota sobre sets */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  💡 <strong>Flexible:</strong> Puedes usar solo 1 set (torneos relámpago), 2 sets (estándar) o 3 sets (completo). 
                  El sistema determinará automáticamente al ganador según los sets completados.
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  🎯 <strong>Empates:</strong> Si hay empate en games (4-4, 5-5) por tiempo, el sistema usa diferencia total de games 
                  o Super Muerte para determinar al ganador.
                </p>
              </div>

              {/* Formulario de sets */}
              <div className="grid grid-cols-2 gap-6">
                {/* Pareja A */}
                <div className="space-y-4">
                  <h4 className="font-medium text-center">
                    {
                      allPairs.find((p) => p.id === selectedMatch.pairAId)
                        ?.player1?.name
                    }{" "}
                    /{" "}
                    {
                      allPairs.find((p) => p.id === selectedMatch.pairAId)
                        ?.player2?.name
                    }
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Set 1</Label>
                      <Input
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
                        placeholder="6"
                      />
                    </div>
                    <div>
                      <Label>Set 2</Label>
                      <Input
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
                        placeholder="4"
                      />
                    </div>
                    <div>
                      <Label>Set 3 (opcional)</Label>
                      <Input
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
                        placeholder="6"
                      />
                    </div>
                  </div>
                </div>

                {/* Pareja B */}
                <div className="space-y-4">
                  <h4 className="font-medium text-center">
                    {
                      allPairs.find((p) => p.id === selectedMatch.pairBId)
                        ?.player1?.name
                    }{" "}
                    /{" "}
                    {
                      allPairs.find((p) => p.id === selectedMatch.pairBId)
                        ?.player2?.name
                    }
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Set 1</Label>
                      <Input
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
                        placeholder="4"
                      />
                    </div>
                    <div>
                      <Label>Set 2</Label>
                      <Input
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
                        placeholder="6"
                      />
                    </div>
                    <div>
                      <Label>Set 3 (opcional)</Label>
                      <Input
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
                        placeholder="4"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Opciones especiales */}
              <div className="border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="superDeath"
                      checked={scoreForm.hasSuperDeath}
                      onCheckedChange={(checked) =>
                        setScoreForm({ ...scoreForm, hasSuperDeath: !!checked })
                      }
                    />
                    <Label htmlFor="superDeath" className="text-sm font-medium">
                      ¿Hubo Super Muerte? (desempate - primer equipo en llegar a
                      10 gana)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="timeLimit"
                      checked={scoreForm.isTimeLimit}
                      onCheckedChange={(checked) =>
                        setScoreForm({ ...scoreForm, isTimeLimit: !!checked })
                      }
                    />
                    <Label htmlFor="timeLimit" className="text-sm font-medium">
                      ¿Terminó por límite de tiempo? (empate en games)
                    </Label>
                  </div>
                </div>

                {scoreForm.hasSuperDeath && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label>
                        Puntos -{" "}
                        {
                          allPairs.find((p) => p.id === selectedMatch.pairAId)
                            ?.player1?.name
                        }{" "}
                        /{" "}
                        {
                          allPairs.find((p) => p.id === selectedMatch.pairAId)
                            ?.player2?.name
                        }
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={scoreForm.pairA_superDeath}
                        onChange={(e) =>
                          setScoreForm({
                            ...scoreForm,
                            pairA_superDeath: e.target.value,
                          })
                        }
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <Label>
                        Puntos -{" "}
                        {
                          allPairs.find((p) => p.id === selectedMatch.pairBId)
                            ?.player1?.name
                        }{" "}
                        /{" "}
                        {
                          allPairs.find((p) => p.id === selectedMatch.pairBId)
                            ?.player2?.name
                        }
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={scoreForm.pairB_superDeath}
                        onChange={(e) =>
                          setScoreForm({
                            ...scoreForm,
                            pairB_superDeath: e.target.value,
                          })
                        }
                        placeholder="6"
                      />
                    </div>
                  </div>
                )}

                {scoreForm.hasSuperDeath && (
                  <p className="text-sm text-gray-500 mt-2">
                    * El primer equipo en llegar a 10 puntos gana
                  </p>
                )}

                {scoreForm.isTimeLimit && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
                    <p className="text-sm text-orange-800">
                      ⏰ <strong>Partido por tiempo:</strong> Cuando el partido termina por límite de tiempo con empate 
                      (ej: 4-4, 5-5), el sistema usará la diferencia total de games o Super Muerte para determinar al ganador.
                    </p>
                  </div>
                )}

              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-4">
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

      {/* Dialog para mostrar tabla de posiciones */}
      <Dialog open={showStandingsDialog} onOpenChange={setShowStandingsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-blue-900">
              🏆 Tabla de Posiciones - {selectedGroupName}
            </DialogTitle>
            <DialogDescription>
              Tabla de posiciones del grupo {selectedGroupName} mostrando
              estadísticas de partidos jugados, ganados, puntos y diferencias
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {selectedGroupStandings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">
                  No hay resultados para calcular la tabla
                </p>
                <p className="text-sm mt-2">
                  Carga algunos resultados de partidos para ver las posiciones
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tabla principal simplificada */}
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">
                          Pos
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Pareja
                        </th>
                        <th className="px-3 py-3 text-center font-semibold">
                          PJ
                        </th>
                        <th className="px-3 py-3 text-center font-semibold">
                          PG
                        </th>
                        <th className="px-3 py-3 text-center font-semibold">
                          Pts
                        </th>
                        <th className="px-3 py-3 text-center font-semibold">
                          Sets
                        </th>
                        <th className="px-3 py-3 text-center font-semibold">
                          Games
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedGroupStandings.map((entry, index) => (
                        <tr
                          key={entry.pairId}
                          className={`hover:bg-gray-50 transition-colors ${
                            index === 0
                              ? "bg-green-50 border-l-4 border-green-500"
                              : index === 1
                              ? "bg-yellow-50 border-l-4 border-yellow-500"
                              : "border-l-4 border-transparent"
                          }`}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              <span className="text-lg font-bold text-gray-800">
                                {index + 1}
                              </span>
                              {index === 0 && (
                                <span className="ml-2 text-xl">👑</span>
                              )}
                              {index === 1 && (
                                <span className="ml-2 text-lg">🥈</span>
                              )}
                              {index === 2 && (
                                <span className="ml-2 text-lg">🥉</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-gray-900">
                              {entry.pairName}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-center text-sm font-medium text-gray-600">
                            {entry.matchesPlayed}
                          </td>
                          <td className="px-3 py-4 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {entry.matchesWon}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <span className="text-lg font-bold text-blue-600">
                              {entry.points}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <div className="text-sm">
                              <span className="text-gray-900 font-medium">
                                {entry.setsWon}-{entry.setsLost}
                              </span>
                              <div
                                className={`text-xs font-medium ${
                                  entry.setsDifference > 0
                                    ? "text-green-600"
                                    : entry.setsDifference < 0
                                    ? "text-red-600"
                                    : "text-gray-500"
                                }`}
                              >
                                ({entry.setsDifference > 0 ? "+" : ""}
                                {entry.setsDifference})
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <div className="text-sm">
                              <span className="text-gray-900 font-medium">
                                {entry.gamesWon}-{entry.gamesLost}
                              </span>
                              <div
                                className={`text-xs font-medium ${
                                  entry.gamesDifference > 0
                                    ? "text-green-600"
                                    : entry.gamesDifference < 0
                                    ? "text-red-600"
                                    : "text-gray-500"
                                }`}
                              >
                                ({entry.gamesDifference > 0 ? "+" : ""}
                                {entry.gamesDifference})
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Información adicional */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      📊 Leyenda
                    </h4>
                    <div className="text-xs text-blue-700 space-y-1">
                      <p>
                        <strong>PJ:</strong> Partidos Jugados
                      </p>
                      <p>
                        <strong>PG:</strong> Partidos Ganados
                      </p>
                      <p>
                        <strong>Pts:</strong> Puntos (3 por victoria)
                      </p>
                      <p>
                        <strong>Sets:</strong> Ganados-Perdidos (diferencia)
                      </p>
                      <p>
                        <strong>Games:</strong> Ganados-Perdidos (diferencia)
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      🏅 Criterios de Desempate
                    </h4>
                    <div className="text-xs text-gray-700 space-y-1">
                      <p>1. Puntos (partidos ganados)</p>
                      <p>2. Diferencia de sets</p>
                      <p>3. Diferencia de games</p>
                      <p>4. Sets ganados</p>
                      <p>5. Games ganados</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface GroupCardProps {
  group: Group;
  pairs: Pair[];
  onViewMatches: (group: Group) => void;
  onViewStandings: (group: Group) => void;
}

function GroupCard({
  group,
  pairs,
  onViewMatches,
  onViewStandings,
}: GroupCardProps) {
  return (
    <Card className="group-card transition-all hover:shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-blue-900">
            {group.name}
          </CardTitle>
          <Badge variant="secondary" className="text-sm">
            {pairs.length} parejas
          </Badge>
        </div>
        <CardDescription>Fase de grupos • Round Robin</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {pairs.map((pair, index) => (
          <PairCard key={pair.id} pair={pair} position={index + 1} />
        ))}

        <div className="group-actions pt-4 border-t flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onViewMatches(group)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Ver Partidos
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewStandings(group)}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Tabla
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface PairCardProps {
  pair: Pair;
  position: number;
}

function PairCard({ pair, position }: PairCardProps) {
  return (
    <div className="pair-card bg-gray-50 rounded-lg p-4 border transition-all hover:bg-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="pair-position w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700">
            {position}
          </div>
          <div className="pair-info">
            <h4 className="font-semibold text-gray-900">Pareja #{position}</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{pair.player1?.name || "Jugador 1"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{pair.player2?.name || "Jugador 2"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pair-ranking">
          <Badge variant="outline" className="text-xs">
            Ranking {pair.seed || "N/A"}
          </Badge>
        </div>
      </div>
    </div>
  );
}
