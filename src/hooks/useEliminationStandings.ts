"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { Match, Pair } from "@/types";
import {
  getAdvancingPairs,
  getAllMatchesByCategory,
  getGroups,
  getPairs,
  calculateStandings,
} from "@/lib/supabase-queries";
import { RealtimeChannel } from "@supabase/supabase-js";

interface EliminationStanding {
  pair: Pair;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  setsDiff: number;
  gamesDiff: number;
  points: number; // Puntos obtenidos en eliminatorias
  groupPosition: string; // "1º Grupo A", "2º Grupo B", etc.
  eliminationStatus:
    | "active"
    | "eliminated"
    | "champion"
    | "runner_up"
    | "third_place";
  currentStage?: string;
}

interface UseEliminationStandingsProps {
  categoryId: string;
}

export function useEliminationStandings({
  categoryId,
}: UseEliminationStandingsProps) {
  const [standings, setStandings] = useState<EliminationStanding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const supabase = createClient();

  // Función para calcular estadísticas de eliminatorias
  const calculateEliminationStandings = useCallback(async () => {
    if (!categoryId) return [];

    try {
      // Obtener parejas que avanzaron de grupos
      const { advancingPairs, bracketInfo } = await getAdvancingPairs(
        categoryId
      );

      if (advancingPairs.length === 0) {
        console.log("🔍 No hay parejas clasificadas a eliminatorias");
        return [];
      }

      // Obtener todos los partidos de eliminatorias
      const allMatches = await getAllMatchesByCategory(categoryId);
      const eliminationMatches = allMatches.filter((m) =>
        ["quarterfinal", "semifinal", "final", "third_place"].includes(m.stage)
      );

      console.log("🏆 Calculating elimination standings:", {
        advancingPairs: advancingPairs.length,
        eliminationMatches: eliminationMatches.length,
        bracketInfo,
      });

      // Obtener información real de grupos para determinar posiciones
      const groups = await getGroups(categoryId);
      const allPairs = await getPairs(categoryId);

      // Crear mapa de posiciones reales en grupos
      const pairGroupPositions = new Map<string, string>();

      for (const group of groups) {
        const groupPairs = allPairs.filter((pair) =>
          group.pairIds.includes(pair.id)
        );
        const groupStandings = await calculateStandings(group.id, groupPairs);

        // Ordenar por puntos
        const sortedStandings = groupStandings.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.setsDifference !== a.setsDifference)
            return b.setsDifference - a.setsDifference;
          return b.gamesDifference - a.gamesDifference;
        });

        sortedStandings.forEach((standing, index) => {
          if (index < 2) {
            // Solo primeros y segundos lugares
            const position = index + 1;
            pairGroupPositions.set(
              standing.pairId,
              `${position}º ${group.name}`
            );
          }
        });
      }

      // Inicializar estadísticas para cada pareja clasificada
      const pairStats = new Map<string, EliminationStanding>();

      advancingPairs.forEach((pair) => {
        const groupPosition = pairGroupPositions.get(pair.id) || "Clasificado";

        pairStats.set(pair.id, {
          pair,
          matchesPlayed: 0,
          matchesWon: 0,
          matchesLost: 0,
          setsWon: 0,
          setsLost: 0,
          gamesWon: 0,
          gamesLost: 0,
          setsDiff: 0,
          gamesDiff: 0,
          points: 0,
          groupPosition,
          eliminationStatus: "active",
        });
      });

      // Procesar partidos de eliminatorias finalizados
      const finishedMatches = eliminationMatches.filter(
        (m) => m.status === "finished"
      );

      finishedMatches.forEach((match) => {
        const pairAStats = pairStats.get(match.pairAId);
        const pairBStats = pairStats.get(match.pairBId);

        if (!pairAStats || !pairBStats) return;

        // Actualizar partidos jugados
        pairAStats.matchesPlayed++;
        pairBStats.matchesPlayed++;
        pairAStats.currentStage = match.stage;
        pairBStats.currentStage = match.stage;

        // Determinar ganador y perdedor
        if (match.winnerPairId) {
          if (match.winnerPairId === match.pairAId) {
            pairAStats.matchesWon++;
            pairAStats.points += 3; // 3 puntos por victoria
            pairBStats.matchesLost++;
            // El perdedor queda eliminado (excepto en el partido por el 3er lugar)
            if (match.stage !== "third_place") {
              pairBStats.eliminationStatus = "eliminated";
            }
          } else {
            pairBStats.matchesWon++;
            pairBStats.points += 3; // 3 puntos por victoria
            pairAStats.matchesLost++;
            if (match.stage !== "third_place") {
              pairAStats.eliminationStatus = "eliminated";
            }
          }
        }

        // Procesar sets y games si están disponibles
        if (match.scorePairA && match.scorePairB) {
          try {
            const scoreA =
              typeof match.scorePairA === "string"
                ? JSON.parse(match.scorePairA)
                : match.scorePairA;
            const scoreB =
              typeof match.scorePairB === "string"
                ? JSON.parse(match.scorePairB)
                : match.scorePairB;

            // Calcular games totales
            const gamesA =
              (scoreA.set1 || 0) +
              (scoreA.set2 || 0) +
              (scoreA.set3 || 0) +
              (scoreA.superDeath || 0);
            const gamesB =
              (scoreB.set1 || 0) +
              (scoreB.set2 || 0) +
              (scoreB.set3 || 0) +
              (scoreB.superDeath || 0);

            pairAStats.gamesWon += gamesA;
            pairAStats.gamesLost += gamesB;
            pairBStats.gamesWon += gamesB;
            pairBStats.gamesLost += gamesA;

            // Contar sets ganados
            let setsA = 0,
              setsB = 0;
            if (scoreA.set1 > scoreB.set1) setsA++;
            else setsB++;
            if (scoreA.set2 > scoreB.set2) setsA++;
            else setsB++;
            if (scoreA.set3 !== undefined && scoreB.set3 !== undefined) {
              if (scoreA.set3 > scoreB.set3) setsA++;
              else setsB++;
            }

            pairAStats.setsWon += setsA;
            pairAStats.setsLost += setsB;
            pairBStats.setsWon += setsB;
            pairBStats.setsLost += setsA;
          } catch (error) {
            console.warn("Error parsing elimination scores:", error);
          }
        }
      });

      // Determinar posiciones finales
      const finalMatch = finishedMatches.find((m) => m.stage === "final");
      const thirdPlaceMatch = finishedMatches.find(
        (m) => m.stage === "third_place"
      );

      if (finalMatch?.winnerPairId) {
        const winner = pairStats.get(finalMatch.winnerPairId);
        const runnerUp = pairStats.get(
          finalMatch.pairAId === finalMatch.winnerPairId
            ? finalMatch.pairBId
            : finalMatch.pairAId
        );

        if (winner) winner.eliminationStatus = "champion";
        if (runnerUp) runnerUp.eliminationStatus = "runner_up";
      }

      if (thirdPlaceMatch?.winnerPairId) {
        const thirdPlace = pairStats.get(thirdPlaceMatch.winnerPairId);
        if (thirdPlace) thirdPlace.eliminationStatus = "third_place";
      }

      // Calcular diferencias
      pairStats.forEach((stats) => {
        stats.setsDiff = stats.setsWon - stats.setsLost;
        stats.gamesDiff = stats.gamesWon - stats.gamesLost;
      });

      // Convertir a array y ordenar por status y estadísticas
      const sortedStandings = Array.from(pairStats.values()).sort((a, b) => {
        // Primero por status (campeón, subcampeón, 3er lugar, activos, eliminados)
        const statusOrder = {
          champion: 1,
          runner_up: 2,
          third_place: 3,
          active: 4,
          eliminated: 5,
        };
        if (
          statusOrder[a.eliminationStatus] !== statusOrder[b.eliminationStatus]
        ) {
          return (
            statusOrder[a.eliminationStatus] - statusOrder[b.eliminationStatus]
          );
        }

        // Luego por puntos
        if (a.points !== b.points) return b.points - a.points;

        // Luego por partidos ganados
        if (a.matchesWon !== b.matchesWon) return b.matchesWon - a.matchesWon;

        // Luego por diferencia de sets
        if (a.setsDiff !== b.setsDiff) return b.setsDiff - a.setsDiff;

        // Finalmente por diferencia de games
        return b.gamesDiff - a.gamesDiff;
      });

      console.log(
        "🏆 Elimination standings calculated:",
        sortedStandings.map((s) => ({
          pair: `${s.pair.player1.name}/${s.pair.player2.name}`,
          groupPosition: s.groupPosition,
          played: s.matchesPlayed,
          won: s.matchesWon,
          status: s.eliminationStatus,
          gamesWon: s.gamesWon,
          gamesLost: s.gamesLost,
        }))
      );

      return sortedStandings;
    } catch (error) {
      console.error("Error calculating elimination standings:", error);
      return [];
    }
  }, [categoryId]);

  // Actualizar estadísticas
  const updateStandings = useCallback(async () => {
    setIsLoading(true);
    try {
      const newStandings = await calculateEliminationStandings();
      setStandings(newStandings);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error updating elimination standings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [calculateEliminationStandings]);

  // Configurar suscripción en tiempo real
  useEffect(() => {
    if (!categoryId) return;

    let channel: RealtimeChannel;

    const setupRealtimeSubscription = async () => {
      // Calcular estadísticas iniciales
      await updateStandings();

      // Suscribirse a cambios en matches de eliminatorias
      channel = supabase
        .channel(`elimination-standings-${categoryId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "matches",
            filter: `category_id=eq.${categoryId}`,
          },
          (payload) => {
            console.log(
              "🏆 Realtime elimination standings update triggered:",
              payload
            );
            // Recalcular solo si es un partido de eliminatorias
            const matchData = payload.new as any;
            if (
              ["quarterfinal", "semifinal", "final", "third_place"].includes(
                matchData.stage
              )
            ) {
              updateStandings();
            }
          }
        )
        .subscribe((status) => {
          console.log(
            `📊 Realtime elimination standings status for ${categoryId}:`,
            status
          );
        });
    };

    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (channel) {
        console.log(
          `🔌 Unsubscribing from elimination-standings-${categoryId}`
        );
        supabase.removeChannel(channel);
      }
    };
  }, [categoryId, supabase, updateStandings]);

  return {
    standings,
    isLoading,
    lastUpdate,
    refreshStandings: updateStandings,
  };
}
