"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCategoryStore } from "@/stores/category-store";
import {
  generateGroups,
  validateGroupConfiguration,
  GroupGenerationOptions,
} from "@/lib/algorithms/group-generation";
import { generateAllGroupMatches } from "@/lib/algorithms/round-robin";
import { useMatchStore } from "@/stores/match-store";
import { useTournamentStore } from "@/stores/tournament-store";
import { ID } from "@/types";

export function useGenerateGroups() {
  const [isGenerating, setIsGenerating] = useState(false);

  const { getPairsByCategory, setGroups, clearGroups, updateCategory } =
    useCategoryStore();

  const { addMatch, clearMatchesByCategory } = useMatchStore();

  const { currentTournament } = useTournamentStore();

  const generateGroupsForCategory = async (
    categoryId: ID,
    options?: Partial<GroupGenerationOptions>
  ) => {
    if (!currentTournament) {
      toast.error("No hay torneo seleccionado");
      return { success: false };
    }

    setIsGenerating(true);

    try {
      // Obtener parejas de la categoría
      const pairs = getPairsByCategory(categoryId);

      if (pairs.length === 0) {
        toast.error("No hay parejas registradas en esta categoría");
        return { success: false };
      }

      // Configuración por defecto
      const defaultOptions: GroupGenerationOptions = {
        minGroupSize: 3,
        maxGroupSize: 6,
        balanceBySeeds: true,
        ...options,
      };

      // Validar configuración
      const validation = validateGroupConfiguration(
        pairs.length,
        defaultOptions.minGroupSize,
        defaultOptions.maxGroupSize
      );

      if (!validation.isValid) {
        toast.error(validation.message || "Configuración de grupos inválida");
        return { success: false };
      }

      // Mostrar advertencia si hay mucha utilización
      if (validation.suggestedGroups) {
        toast.info(
          `Se crearán ${validation.suggestedGroups} grupos para ${pairs.length} parejas`
        );
      }

      // Limpiar grupos existentes
      clearGroups(categoryId);
      clearMatchesByCategory(categoryId);

      // Generar grupos
      const groups = generateGroups(pairs, categoryId, defaultOptions);

      // Actualizar store con los grupos generados
      groups.forEach((group) => {
        setGroups([group]);
      });

      // Generar partidos round-robin para cada grupo
      const matches = generateAllGroupMatches(groups, pairs, {
        tournamentId: currentTournament.id,
        categoryId,
      });

      // Agregar partidos al store
      matches.forEach((match) => {
        addMatch(match);
      });

      // Actualizar estado de la categoría
      updateCategory(categoryId, { status: "scheduled" });

      toast.success(
        `Grupos generados exitosamente: ${groups.length} grupos, ${matches.length} partidos`
      );

      return {
        success: true,
        groups,
        matches,
        stats: {
          groupsCreated: groups.length,
          matchesCreated: matches.length,
          totalPairs: pairs.length,
        },
      };
    } catch (error) {
      console.error("Error generando grupos:", error);
      toast.error(
        error instanceof Error ? error.message : "Error generando grupos"
      );
      return { success: false };
    } finally {
      setIsGenerating(false);
    }
  };

  const validateGroupsBeforeGeneration = (
    categoryId: ID,
    options: Partial<GroupGenerationOptions> = {}
  ) => {
    const pairs = getPairsByCategory(categoryId);

    const defaultOptions: GroupGenerationOptions = {
      minGroupSize: 3,
      maxGroupSize: 6,
      balanceBySeeds: true,
      ...options,
    };

    return validateGroupConfiguration(
      pairs.length,
      defaultOptions.minGroupSize,
      defaultOptions.maxGroupSize
    );
  };

  const regenerateGroups = async (
    categoryId: ID,
    options?: Partial<GroupGenerationOptions>
  ) => {
    const confirmed = confirm(
      "¿Estás seguro de que quieres regenerar los grupos? Esto eliminará todos los grupos y partidos existentes."
    );

    if (!confirmed) {
      return { success: false };
    }

    return generateGroupsForCategory(categoryId, options);
  };

  return {
    generateGroupsForCategory,
    regenerateGroups,
    validateGroupsBeforeGeneration,
    isGenerating,
  };
}
