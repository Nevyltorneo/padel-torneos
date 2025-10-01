"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { Match, Pair } from "@/types";
import { getAllMatchesByCategory } from "@/lib/supabase-queries";
import { RealtimeChannel } from "@supabase/supabase-js";

interface StandingsSummary {
  pair: Pair;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  position: number;
  trophy: string;
}

interface UseRealtimeStandingsProps {
  categoryId: string;
  allPairs: Pair[];
}

export function useRealtimeStandings({
  categoryId,
  allPairs,
}: UseRealtimeStandingsProps) {
  const [standings, setStandings] = useState<StandingsSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const supabase = createClient();

  // Función para calcular estadísticas
  const calculateStandings = useCallback(async () => {
    if (!categoryId || allPairs.length === 0) return [];

    try {
      const allTournamentMatches = await getAllMatchesByCategory(categoryId);
      const finishedMatches = allTournamentMatches.filter(
        (m) => m.status === "finished"
      );

      const pairStats = new Map<
        string,
        {
          pair: Pair;
          matchesPlayed: number;
          matchesWon: number;
          matchesLost: number;
          setsWon: number;
          setsLost: number;
          gamesWon: number;
          gamesLost: number;
          winRate: number;
          position: number;
          trophy: string;
        }
      >();

      // Inicializar estadísticas para todas las parejas
      allPairs.forEach((pair: Pair) => {
        pairStats.set(pair.id, {
          pair,
          matchesPlayed: 0,
          matchesWon: 0,
          matchesLost: 0,
          setsWon: 0,
          setsLost: 0,
          gamesWon: 0,
          gamesLost: 0,
          winRate: 0,
          position: 0,
          trophy: "",
        });
      });

      // Procesar partidos finalizados
      finishedMatches.forEach((match) => {
        const pairAStats = pairStats.get(match.pairAId);
        const pairBStats = pairStats.get(match.pairBId);

        if (!pairAStats || !pairBStats) return;

        // Incrementar partidos jugados
        pairAStats.matchesPlayed++;
        pairBStats.matchesPlayed++;

        // Determinar ganador y actualizar wins/losses
        if (match.winnerPairId) {
          if (match.winnerPairId === match.pairAId) {
            pairAStats.matchesWon++;
            pairBStats.matchesLost++;
          } else {
            pairBStats.matchesWon++;
            pairAStats.matchesLost++;
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

            // Debug logging para ver qué está pasando
            console.log("🏓 Processing match scores:", {
              matchId: match.id,
              pairAId: match.pairAId,
              pairBId: match.pairBId,
              winnerPairId: match.winnerPairId,
              scoreA,
              scoreB,
              status: match.status,
            });

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

            console.log("🎯 Games calculation:", {
              gamesA: `${scoreA.set1}+${scoreA.set2}+${scoreA.set3 || 0}+${
                scoreA.superDeath || 0
              }=${gamesA}`,
              gamesB: `${scoreB.set1}+${scoreB.set2}+${scoreB.set3 || 0}+${
                scoreB.superDeath || 0
              }=${gamesB}`,
            });

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
            console.warn("Error parsing scores:", error);
          }
        }
      });

      // Calcular win rate
      pairStats.forEach((stats) => {
        if (stats.matchesPlayed > 0) {
          stats.winRate = (stats.matchesWon / stats.matchesPlayed) * 100;
        }
      });

      // Determinar posiciones finales SOLO si hay partidos de final/tercer lugar COMPLETADOS
      const finalMatch = finishedMatches.find(
        (m) => m.stage === "final" && m.status === "finished" && m.winnerPairId
      );
      const thirdPlaceMatch = finishedMatches.find(
        (m) =>
          m.stage === "third_place" && m.status === "finished" && m.winnerPairId
      );

      // Debug: verificar qué partidos finales hay
      console.log("🏆 Final matches check:", {
        allFinishedMatches: finishedMatches.length,
        finalStages: finishedMatches.map((m) => m.stage),
        hasFinalMatch: !!finalMatch,
        hasThirdPlaceMatch: !!thirdPlaceMatch,
      });

      // Solo asignar posiciones si realmente hay un ganador del torneo
      if (finalMatch?.winnerPairId) {
        const winner = pairStats.get(finalMatch.winnerPairId);
        const runnerUp = pairStats.get(
          finalMatch.pairAId === finalMatch.winnerPairId
            ? finalMatch.pairBId
            : finalMatch.pairAId
        );

        if (winner) {
          winner.position = 1;
          winner.trophy = "🥇";
        }
        if (runnerUp) {
          runnerUp.position = 2;
          runnerUp.trophy = "🥈";
        }
      }

      // Solo asignar 3° y 4° lugar si hay partido por el tercer lugar completado
      if (thirdPlaceMatch?.winnerPairId) {
        const thirdPlace = pairStats.get(thirdPlaceMatch.winnerPairId);
        const fourthPlace = pairStats.get(
          thirdPlaceMatch.pairAId === thirdPlaceMatch.winnerPairId
            ? thirdPlaceMatch.pairBId
            : thirdPlaceMatch.pairAId
        );

        if (thirdPlace) {
          thirdPlace.position = 3;
          thirdPlace.trophy = "🥉";
        }
        if (fourthPlace) {
          fourthPlace.position = 4;
          fourthPlace.trophy = "4️⃣";
        }
      }

      // Convertir a array y ordenar
      const sortedStandings = Array.from(pairStats.values()).sort((a, b) => {
        if (a.position && b.position) return a.position - b.position;
        if (a.position && !b.position) return -1;
        if (!a.position && b.position) return 1;

        if (a.matchesWon !== b.matchesWon) return b.matchesWon - a.matchesWon;
        if (a.matchesLost !== b.matchesLost)
          return a.matchesLost - b.matchesLost;
        if (a.setsWon !== b.setsLost) return b.setsWon - a.setsWon;
        if (a.setsLost !== b.setsLost) return a.setsLost - b.setsLost;
        return b.gamesWon - a.gamesWon;
      });

      // Debug final standings
      console.log(
        "📊 Final standings calculated:",
        sortedStandings.map((s) => ({
          pair: `${s.pair.player1.name}/${s.pair.player2.name}`,
          played: s.matchesPlayed,
          won: s.matchesWon,
          gamesWon: s.gamesWon,
          gamesLost: s.gamesLost,
          setsWon: s.setsWon,
          setsLost: s.setsLost,
        }))
      );

      return sortedStandings;
    } catch (error) {
      console.error("Error calculating standings:", error);
      return [];
    }
  }, [categoryId, allPairs]);

  // Actualizar estadísticas
  const updateStandings = useCallback(async () => {
    setIsLoading(true);
    try {
      const newStandings = await calculateStandings();
      setStandings(newStandings);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error updating standings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [calculateStandings]);

  // Configurar suscripción en tiempo real
  useEffect(() => {
    if (!categoryId) return;

    let channel: RealtimeChannel;

    const setupRealtimeSubscription = async () => {
      // Calcular estadísticas iniciales
      await updateStandings();

      // Suscribirse a cambios en matches
      channel = supabase
        .channel(`standings-${categoryId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "matches",
            filter: `category_id=eq.${categoryId}`,
          },
          (payload) => {
            console.log("🏆 Realtime standings update triggered:", payload);
            // Recalcular estadísticas cuando un match se actualiza
            updateStandings();
          }
        )
        .subscribe((status) => {
          console.log(
            `📊 Realtime standings status for ${categoryId}:`,
            status
          );
        });
    };

    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (channel) {
        console.log(`🔌 Unsubscribing from standings-${categoryId}`);
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
