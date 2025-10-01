"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Match } from "@/types";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeMatchesProps {
  categoryId: string;
  initialMatches?: Match[];
  stageFilter?: string[]; // Nuevo: filtrar por stages específicos
}

export function useRealtimeMatches({
  categoryId,
  initialMatches = [],
  stageFilter,
}: UseRealtimeMatchesProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!categoryId) return;

    let channel: RealtimeChannel;

    const setupRealtimeSubscription = async () => {
      // Canal para escuchar cambios en matches
      channel = supabase
        .channel(`matches-${categoryId}`)
        .on(
          "postgres_changes",
          {
            event: "*", // INSERT, UPDATE, DELETE
            schema: "public",
            table: "matches",
            filter: `category_id=eq.${categoryId}`,
          },
          (payload) => {
            console.log("🔄 Realtime match update:", {
              eventType: payload.eventType,
              matchId: (payload.new as any)?.id || (payload.old as any)?.id,
              stage: (payload.new as any)?.stage || (payload.old as any)?.stage,
              status:
                (payload.new as any)?.status || (payload.old as any)?.status,
              categoryId:
                (payload.new as any)?.category_id ||
                (payload.old as any)?.category_id,
              fullPayload: payload,
            });

            if (payload.eventType === "INSERT") {
              // Convertir snake_case a camelCase
              const rawMatch = payload.new as any;
              const newMatch: Match = {
                id: rawMatch.id,
                tournamentId: rawMatch.tournament_id,
                categoryId: rawMatch.category_id,
                stage: rawMatch.stage,
                groupId: rawMatch.group_id,
                pairAId: rawMatch.pair_a_id,
                pairBId: rawMatch.pair_b_id,
                day: rawMatch.day,
                startTime: rawMatch.start_time,
                courtId: rawMatch.court_id,
                status: rawMatch.status,
                scorePairA: rawMatch.score_pair_a,
                scorePairB: rawMatch.score_pair_b,
                winnerPairId: rawMatch.winner_pair_id,
                roundNumber: rawMatch.round_number,
                matchNumber: rawMatch.match_number,
                bracketPosition: rawMatch.bracket_position,
                createdAt: rawMatch.created_at,
                updatedAt: rawMatch.updated_at,
              };

              // Verificar si el match cumple con el filtro de stage
              if (
                stageFilter &&
                stageFilter.length > 0 &&
                !stageFilter.includes(newMatch.stage)
              ) {
                console.log(
                  "🚫 Filtering out match with stage:",
                  newMatch.stage
                );
                return;
              }

              setMatches((prev) => {
                // Evitar duplicados
                if (prev.some((m) => m.id === newMatch.id)) return prev;
                console.log("🆕 Adding new match:", newMatch);
                return [...prev, newMatch];
              });
            } else if (payload.eventType === "UPDATE") {
              // Convertir snake_case a camelCase
              const rawMatch = payload.new as any;
              const updatedMatch: Match = {
                id: rawMatch.id,
                tournamentId: rawMatch.tournament_id,
                categoryId: rawMatch.category_id,
                stage: rawMatch.stage,
                groupId: rawMatch.group_id,
                pairAId: rawMatch.pair_a_id,
                pairBId: rawMatch.pair_b_id,
                day: rawMatch.day,
                startTime: rawMatch.start_time,
                courtId: rawMatch.court_id,
                status: rawMatch.status,
                scorePairA: rawMatch.score_pair_a,
                scorePairB: rawMatch.score_pair_b,
                winnerPairId: rawMatch.winner_pair_id,
                roundNumber: rawMatch.round_number,
                matchNumber: rawMatch.match_number,
                bracketPosition: rawMatch.bracket_position,
                createdAt: rawMatch.created_at,
                updatedAt: rawMatch.updated_at,
              };

              console.log("🔄 Updating match:", {
                id: updatedMatch.id,
                stage: updatedMatch.stage,
                status: updatedMatch.status,
                scorePairA: updatedMatch.scorePairA,
                scorePairB: updatedMatch.scorePairB,
                winnerPairId: updatedMatch.winnerPairId,
              });

              setMatches((prev) => {
                const updated = prev.map((match) =>
                  match.id === updatedMatch.id ? updatedMatch : match
                );
                console.log("📊 Matches after update:", updated.length);
                return updated;
              });
            } else if (payload.eventType === "DELETE") {
              const deletedMatch = payload.old as any;
              setMatches((prev) =>
                prev.filter((match) => match.id !== deletedMatch.id)
              );
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 Realtime status for matches-${categoryId}:`, status);
          setIsConnected(status === "SUBSCRIBED");
        });
    };

    setupRealtimeSubscription();

    // Carga inicial de matches existentes
    const loadInitialMatches = async () => {
      try {
        let query = supabase
          .from("matches")
          .select("*")
          .eq("category_id", categoryId);

        // Aplicar filtro de stage si se especifica
        if (stageFilter && stageFilter.length > 0) {
          query = query.in("stage", stageFilter);
          console.log("🔍 Filtering matches by stages:", stageFilter);
        }

        const { data, error } = await query.order("created_at", {
          ascending: true,
        });

        if (error) {
          console.error("Error loading initial matches:", error);
          return;
        }

        if (data && data.length > 0) {
          // Convertir snake_case a camelCase
          const convertedMatches: Match[] = data.map((rawMatch: any) => ({
            id: rawMatch.id,
            tournamentId: rawMatch.tournament_id,
            categoryId: rawMatch.category_id,
            stage: rawMatch.stage,
            groupId: rawMatch.group_id,
            pairAId: rawMatch.pair_a_id,
            pairBId: rawMatch.pair_b_id,
            day: rawMatch.day,
            startTime: rawMatch.start_time,
            courtId: rawMatch.court_id,
            status: rawMatch.status,
            scorePairA: rawMatch.score_pair_a,
            scorePairB: rawMatch.score_pair_b,
            winnerPairId: rawMatch.winner_pair_id,
            roundNumber: rawMatch.round_number,
            matchNumber: rawMatch.match_number,
            bracketPosition: rawMatch.bracket_position,
            createdAt: rawMatch.created_at,
            updatedAt: rawMatch.updated_at,
          }));

          console.log("📥 Loading initial matches:", convertedMatches);
          setMatches(convertedMatches);
        } else {
          console.log("📭 No matches found for category:", categoryId);
          setMatches([]);
        }
      } catch (error) {
        console.error("Error in loadInitialMatches:", error);
      }
    };

    loadInitialMatches();

    // Cleanup
    return () => {
      if (channel) {
        console.log(`🔌 Unsubscribing from matches-${categoryId}`);
        supabase.removeChannel(channel);
      }
    };
  }, [categoryId, supabase]);

  // Función para actualizar matches manualmente si es necesario
  const refreshMatches = async () => {
    try {
      let query = supabase
        .from("matches")
        .select("*")
        .eq("category_id", categoryId);

      // Aplicar filtro de stage si se especifica
      if (stageFilter && stageFilter.length > 0) {
        query = query.in("stage", stageFilter);
        console.log("🔄 Refreshing matches with stage filter:", stageFilter);
      }

      const { data, error } = await query.order("created_at", {
        ascending: true,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        // Convertir snake_case a camelCase
        const convertedMatches: Match[] = data.map((rawMatch: any) => ({
          id: rawMatch.id,
          tournamentId: rawMatch.tournament_id,
          categoryId: rawMatch.category_id,
          stage: rawMatch.stage,
          groupId: rawMatch.group_id,
          pairAId: rawMatch.pair_a_id,
          pairBId: rawMatch.pair_b_id,
          day: rawMatch.day,
          startTime: rawMatch.start_time,
          courtId: rawMatch.court_id,
          status: rawMatch.status,
          scorePairA: rawMatch.score_pair_a,
          scorePairB: rawMatch.score_pair_b,
          winnerPairId: rawMatch.winner_pair_id,
          roundNumber: rawMatch.round_number,
          matchNumber: rawMatch.match_number,
          bracketPosition: rawMatch.bracket_position,
          createdAt: rawMatch.created_at,
          updatedAt: rawMatch.updated_at,
        }));

        console.log("🔄 Refreshed matches:", convertedMatches.length);
        setMatches(convertedMatches);
      } else {
        setMatches([]);
      }
    } catch (error) {
      console.error("Error refreshing matches:", error);
    }
  };

  return {
    matches,
    isConnected,
    refreshMatches,
  };
}
