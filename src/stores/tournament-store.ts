import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  Tournament,
  TournamentConfig,
  DEFAULT_TOURNAMENT_CONFIG,
} from "@/types";

interface TournamentState {
  // Current tournament data
  currentTournament: Tournament | null;
  tournaments: Tournament[];

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;

  // Actions
  setCurrentTournament: (tournament: Tournament | null) => void;
  setTournaments: (tournaments: Tournament[]) => void;
  addTournament: (tournament: Tournament) => void;
  updateTournament: (id: string, updates: Partial<Tournament>) => void;
  deleteTournament: (id: string) => void;

  // Config actions
  updateTournamentConfig: (config: Partial<TournamentConfig>) => void;

  // Loading actions
  setLoading: (loading: boolean) => void;
  setCreating: (creating: boolean) => void;
  setUpdating: (updating: boolean) => void;

  // Reset
  reset: () => void;
  clearPersistedData: () => void;
}

const initialState = {
  currentTournament: null,
  tournaments: [],
  isLoading: false,
  isCreating: false,
  isUpdating: false,
};

export const useTournamentStore = create<TournamentState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setCurrentTournament: (tournament) =>
          set({ currentTournament: tournament }),

        setTournaments: (tournaments) => set({ tournaments }),

        addTournament: (tournament) =>
          set((state) => ({
            tournaments: [...state.tournaments, tournament],
          })),

        updateTournament: (id, updates) =>
          set((state) => ({
            tournaments: state.tournaments.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
            currentTournament:
              state.currentTournament?.id === id
                ? { ...state.currentTournament, ...updates }
                : state.currentTournament,
          })),

        deleteTournament: (id) =>
          set((state) => ({
            tournaments: state.tournaments.filter((t) => t.id !== id),
            currentTournament:
              state.currentTournament?.id === id
                ? null
                : state.currentTournament,
          })),

        updateTournamentConfig: (configUpdates) =>
          set((state) => {
            if (!state.currentTournament) return state;

            const updatedConfig = {
              ...state.currentTournament.config,
              ...configUpdates,
            };

            const updatedTournament = {
              ...state.currentTournament,
              config: updatedConfig,
            };

            return {
              currentTournament: updatedTournament,
              tournaments: state.tournaments.map((t) =>
                t.id === updatedTournament.id ? updatedTournament : t
              ),
            };
          }),

        setLoading: (loading) => set({ isLoading: loading }),
        setCreating: (creating) => set({ isCreating: creating }),
        setUpdating: (updating) => set({ isUpdating: updating }),

        reset: () => set(initialState),

        clearPersistedData: () => {
          // Limpiar localStorage
          localStorage.removeItem("tournament-store");
          // Resetear el estado
          set(initialState);
        },
      }),
      {
        name: "tournament-store",
        partialize: (state) => ({
          currentTournament: state.currentTournament,
          tournaments: state.tournaments,
        }),
      }
    ),
    { name: "TournamentStore" }
  )
);

// Helper hooks for common operations
export const useCurrentTournament = () => {
  return useTournamentStore((state) => state.currentTournament);
};

export const useTournamentConfig = () => {
  return useTournamentStore(
    (state) => state.currentTournament?.config || DEFAULT_TOURNAMENT_CONFIG
  );
};

export const useTournamentActions = () => {
  return useTournamentStore((state) => ({
    setCurrentTournament: state.setCurrentTournament,
    updateTournament: state.updateTournament,
    updateTournamentConfig: state.updateTournamentConfig,
    setLoading: state.setLoading,
    setCreating: state.setCreating,
    setUpdating: state.setUpdating,
  }));
};
