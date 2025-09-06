import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Category, Pair, Group, ID } from "@/types";

interface CategoryState {
  // Data
  categories: Category[];
  pairs: Pair[];
  groups: Group[];

  // Current selections
  selectedCategoryId: ID | null;

  // Loading states
  isLoading: boolean;
  isGeneratingGroups: boolean;

  // Actions - Categories
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: ID, updates: Partial<Category>) => void;
  deleteCategory: (id: ID) => void;
  setSelectedCategory: (id: ID | null) => void;

  // Actions - Pairs
  setPairs: (pairs: Pair[]) => void;
  addPair: (pair: Pair) => void;
  updatePair: (id: ID, updates: Partial<Pair>) => void;
  deletePair: (id: ID) => void;

  // Actions - Groups
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  updateGroup: (id: ID, updates: Partial<Group>) => void;
  deleteGroup: (id: ID) => void;
  clearGroups: (categoryId: ID) => void;

  // Loading actions
  setLoading: (loading: boolean) => void;
  setGeneratingGroups: (generating: boolean) => void;

  // Helpers
  getPairsByCategory: (categoryId: ID) => Pair[];
  getGroupsByCategory: (categoryId: ID) => Group[];
  getCategoryById: (id: ID) => Category | undefined;
  getPairById: (id: ID) => Pair | undefined;

  // Reset
  reset: () => void;
  resetCategory: (categoryId: ID) => void;
}

const initialState = {
  categories: [],
  pairs: [],
  groups: [],
  selectedCategoryId: null,
  isLoading: false,
  isGeneratingGroups: false,
};

export const useCategoryStore = create<CategoryState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Categories
      setCategories: (categories) => set({ categories }),

      addCategory: (category) =>
        set((state) => ({
          categories: [...state.categories, category],
        })),

      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          pairs: state.pairs.filter((p) => p.categoryId !== id),
          groups: state.groups.filter((g) => g.categoryId !== id),
          selectedCategoryId:
            state.selectedCategoryId === id ? null : state.selectedCategoryId,
        })),

      setSelectedCategory: (id) => set({ selectedCategoryId: id }),

      // Pairs
      setPairs: (pairs) => set({ pairs }),

      addPair: (pair) =>
        set((state) => ({
          pairs: [...state.pairs, pair],
        })),

      updatePair: (id, updates) =>
        set((state) => ({
          pairs: state.pairs.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      deletePair: (id) =>
        set((state) => ({
          pairs: state.pairs.filter((p) => p.id !== id),
          // Remove from groups if exists
          groups: state.groups.map((g) => ({
            ...g,
            pairIds: g.pairIds.filter((pairId) => pairId !== id),
          })),
        })),

      // Groups
      setGroups: (groups) => set({ groups }),

      addGroup: (group) =>
        set((state) => ({
          groups: [...state.groups, group],
        })),

      updateGroup: (id, updates) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        })),

      deleteGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
        })),

      clearGroups: (categoryId) =>
        set((state) => ({
          groups: state.groups.filter((g) => g.categoryId !== categoryId),
        })),

      // Loading
      setLoading: (loading) => set({ isLoading: loading }),
      setGeneratingGroups: (generating) =>
        set({ isGeneratingGroups: generating }),

      // Helpers
      getPairsByCategory: (categoryId) => {
        const state = get();
        return state.pairs.filter((p) => p.categoryId === categoryId);
      },

      getGroupsByCategory: (categoryId) => {
        const state = get();
        return state.groups.filter((g) => g.categoryId === categoryId);
      },

      getCategoryById: (id) => {
        const state = get();
        return state.categories.find((c) => c.id === id);
      },

      getPairById: (id) => {
        const state = get();
        return state.pairs.find((p) => p.id === id);
      },

      // Reset
      reset: () => set(initialState),

      resetCategory: (categoryId) =>
        set((state) => ({
          pairs: state.pairs.filter((p) => p.categoryId !== categoryId),
          groups: state.groups.filter((g) => g.categoryId !== categoryId),
        })),
    }),
    { name: "CategoryStore" }
  )
);

// Helper hooks
export const useSelectedCategory = () => {
  return useCategoryStore((state) => {
    if (!state.selectedCategoryId) return null;
    return (
      state.categories.find((c) => c.id === state.selectedCategoryId) || null
    );
  });
};

export const useSelectedCategoryPairs = () => {
  return useCategoryStore((state) => {
    if (!state.selectedCategoryId) return [];
    return state.pairs.filter((p) => p.categoryId === state.selectedCategoryId);
  });
};

export const useSelectedCategoryGroups = () => {
  return useCategoryStore((state) => {
    if (!state.selectedCategoryId) return [];
    return state.groups.filter(
      (g) => g.categoryId === state.selectedCategoryId
    );
  });
};

export const useCategoryActions = () => {
  return useCategoryStore((state) => ({
    addCategory: state.addCategory,
    updateCategory: state.updateCategory,
    deleteCategory: state.deleteCategory,
    setSelectedCategory: state.setSelectedCategory,
    addPair: state.addPair,
    updatePair: state.updatePair,
    deletePair: state.deletePair,
    addGroup: state.addGroup,
    updateGroup: state.updateGroup,
    deleteGroup: state.deleteGroup,
    clearGroups: state.clearGroups,
    setLoading: state.setLoading,
    setGeneratingGroups: state.setGeneratingGroups,
  }));
};
