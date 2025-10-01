import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  Match,
  Standing,
  Court,
  AvailabilityEvent,
  TimeSlot,
  ID,
} from "@/types";

interface MatchState {
  // Data
  matches: Match[];
  courts: Court[];
  availabilityEvents: AvailabilityEvent[];
  standings: Record<ID, Standing[]>; // categoryId -> standings

  // Loading states
  isLoading: boolean;
  isGeneratingSchedule: boolean;
  isAssigningCourt: boolean;
  isUpdatingScore: boolean;

  // Actions - Matches
  setMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  updateMatch: (id: ID, updates: Partial<Match>) => void;
  deleteMatch: (id: ID) => void;
  clearMatchesByCategory: (categoryId: ID) => void;

  // Actions - Courts
  setCourts: (courts: Court[]) => void;
  addCourt: (court: Court) => void;
  updateCourt: (id: string, tournamentId: ID, updates: Partial<Court>) => void;
  deleteCourt: (id: string, tournamentId: ID) => void;

  // Actions - Availability
  setAvailabilityEvents: (events: AvailabilityEvent[]) => void;
  addAvailabilityEvent: (event: AvailabilityEvent) => void;
  updateAvailabilityEvent: (
    id: ID,
    updates: Partial<AvailabilityEvent>
  ) => void;
  deleteAvailabilityEvent: (id: ID) => void;

  // Actions - Standings
  setStandings: (categoryId: ID, standings: Standing[]) => void;
  updateStandings: (categoryId: ID) => void;

  // Court assignment
  assignMatchToCourt: (matchId: ID, courtId: string, startTime: string) => void;
  clearMatchFromCourt: (matchId: ID) => void;

  // Loading actions
  setLoading: (loading: boolean) => void;
  setGeneratingSchedule: (generating: boolean) => void;
  setAssigningCourt: (assigning: boolean) => void;
  setUpdatingScore: (updating: boolean) => void;

  // Helpers
  getMatchesByCategory: (categoryId: ID) => Match[];
  getMatchesByStage: (categoryId: ID, stage: Match["stage"]) => Match[];
  getMatchesByDay: (day: string) => Match[];
  getMatchesByCourt: (courtId: string, day?: string) => Match[];
  getAvailableTimeSlots: (courtId: string, day: string) => TimeSlot[];
  getStandingsByCategory: (categoryId: ID) => Standing[];
  isCourtAvailable: (
    courtId: string,
    day: string,
    startTime: string,
    duration: number
  ) => boolean;

  // Reset
  reset: () => void;
  resetSchedule: () => void;
}

const initialState = {
  matches: [],
  courts: [],
  availabilityEvents: [],
  standings: {},
  isLoading: false,
  isGeneratingSchedule: false,
  isAssigningCourt: false,
  isUpdatingScore: false,
};

export const useMatchStore = create<MatchState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Matches
      setMatches: (matches) => set({ matches }),

      addMatch: (match) =>
        set((state) => ({
          matches: [...state.matches, match],
        })),

      updateMatch: (id, updates) =>
        set((state) => ({
          matches: state.matches.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      deleteMatch: (id) =>
        set((state) => ({
          matches: state.matches.filter((m) => m.id !== id),
        })),

      clearMatchesByCategory: (categoryId) =>
        set((state) => ({
          matches: state.matches.filter((m) => m.categoryId !== categoryId),
        })),

      // Courts
      setCourts: (courts) => set({ courts }),

      addCourt: (court) =>
        set((state) => ({
          courts: [...state.courts, court],
        })),

      updateCourt: (id, tournamentId, updates) =>
        set((state) => ({
          courts: state.courts.map((c) =>
            c.id === id && c.tournamentId === tournamentId
              ? { ...c, ...updates }
              : c
          ),
        })),

      deleteCourt: (id, tournamentId) =>
        set((state) => ({
          courts: state.courts.filter(
            (c) => !(c.id === id && c.tournamentId === tournamentId)
          ),
          matches: state.matches.map((m) =>
            m.courtId === id
              ? { ...m, courtId: undefined, status: "pending" }
              : m
          ),
        })),

      // Availability
      setAvailabilityEvents: (events) => set({ availabilityEvents: events }),

      addAvailabilityEvent: (event) =>
        set((state) => ({
          availabilityEvents: [...state.availabilityEvents, event],
        })),

      updateAvailabilityEvent: (id, updates) =>
        set((state) => ({
          availabilityEvents: state.availabilityEvents.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),

      deleteAvailabilityEvent: (id) =>
        set((state) => ({
          availabilityEvents: state.availabilityEvents.filter(
            (e) => e.id !== id
          ),
        })),

      // Standings
      setStandings: (categoryId, standings) =>
        set((state) => ({
          standings: { ...state.standings, [categoryId]: standings },
        })),

      updateStandings: (categoryId) => {
        // This will be implemented with the algorithm
        // For now, just a placeholder
        console.log("Updating standings for category:", categoryId);
      },

      // Court assignment
      assignMatchToCourt: (matchId, courtId, startTime) =>
        set((state) => ({
          matches: state.matches.map((m) =>
            m.id === matchId
              ? { ...m, courtId, startTime, status: "scheduled" as const }
              : m
          ),
        })),

      clearMatchFromCourt: (matchId) =>
        set((state) => ({
          matches: state.matches.map((m) =>
            m.id === matchId
              ? {
                  ...m,
                  courtId: undefined,
                  startTime: undefined,
                  status: "pending" as const,
                }
              : m
          ),
        })),

      // Loading
      setLoading: (loading) => set({ isLoading: loading }),
      setGeneratingSchedule: (generating) =>
        set({ isGeneratingSchedule: generating }),
      setAssigningCourt: (assigning) => set({ isAssigningCourt: assigning }),
      setUpdatingScore: (updating) => set({ isUpdatingScore: updating }),

      // Helpers
      getMatchesByCategory: (categoryId) => {
        const state = get();
        return state.matches.filter((m) => m.categoryId === categoryId);
      },

      getMatchesByStage: (categoryId, stage) => {
        const state = get();
        return state.matches.filter(
          (m) => m.categoryId === categoryId && m.stage === stage
        );
      },

      getMatchesByDay: (day) => {
        const state = get();
        return state.matches.filter((m) => m.day === day);
      },

      getMatchesByCourt: (courtId, day) => {
        const state = get();
        return state.matches.filter(
          (m) => m.courtId === courtId && (!day || m.day === day)
        );
      },

      getAvailableTimeSlots: (courtId, day) => {
        // This will be implemented with the time slot algorithm
        return [];
      },

      getStandingsByCategory: (categoryId) => {
        const state = get();
        return state.standings[categoryId] || [];
      },

      isCourtAvailable: (courtId, day, startTime, duration) => {
        // This will be implemented to check availability
        return true;
      },

      // Reset
      reset: () => set(initialState),

      resetSchedule: () =>
        set((state) => ({
          matches: state.matches.map((m) => ({
            ...m,
            day: undefined,
            startTime: undefined,
            courtId: undefined,
            status: "pending" as const,
          })),
        })),
    }),
    { name: "MatchStore" }
  )
);

// Helper hooks
export const useMatchesByCategory = (categoryId: ID | null) => {
  return useMatchStore((state) => {
    if (!categoryId) return [];
    return state.matches.filter((m) => m.categoryId === categoryId);
  });
};

export const useMatchesByDay = (day: string) => {
  return useMatchStore((state) => state.matches.filter((m) => m.day === day));
};

export const useStandingsByCategory = (categoryId: ID | null) => {
  return useMatchStore((state) => {
    if (!categoryId) return [];
    return state.standings[categoryId] || [];
  });
};

export const useMatchActions = () => {
  return useMatchStore((state) => ({
    addMatch: state.addMatch,
    updateMatch: state.updateMatch,
    deleteMatch: state.deleteMatch,
    assignMatchToCourt: state.assignMatchToCourt,
    clearMatchFromCourt: state.clearMatchFromCourt,
    setLoading: state.setLoading,
    setGeneratingSchedule: state.setGeneratingSchedule,
    setAssigningCourt: state.setAssigningCourt,
    setUpdatingScore: state.setUpdatingScore,
  }));
};
