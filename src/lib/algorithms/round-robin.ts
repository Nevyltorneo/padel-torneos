import { Match, Group, Pair, ID } from "@/types";
import { v4 as uuidv4 } from "uuid";

export interface RoundRobinOptions {
  tournamentId: ID;
  categoryId: ID;
}

/**
 * Genera partidos round-robin para un grupo
 * Cada pareja juega contra todas las demás exactamente una vez
 */
export function generateRoundRobinMatches(
  group: Group,
  pairs: Pair[],
  options: RoundRobinOptions
): Match[] {
  const { tournamentId, categoryId } = options;
  const matches: Match[] = [];

  // Filtrar parejas que pertenecen al grupo
  const groupPairs = pairs.filter((pair) => group.pairIds.includes(pair.id));

  if (groupPairs.length < 2) {
    return matches; // No se pueden generar partidos con menos de 2 parejas
  }

  console.log(
    `🎯 Generando partidos para grupo "${group.name}" con ${groupPairs.length} parejas:`
  );
  groupPairs.forEach((pair, index) => {
    console.log(
      `  ${index + 1}. ${pair.player1.name} / ${pair.player2.name} (ID: ${
        pair.id
      })`
    );
  });

  // Algoritmo simple: generar todos los enfrentamientos posibles
  // Cada pareja juega contra todas las demás exactamente una vez
  for (let i = 0; i < groupPairs.length; i++) {
    for (let j = i + 1; j < groupPairs.length; j++) {
      const pairA = groupPairs[i];
      const pairB = groupPairs[j];

      // Verificar que no sea la misma pareja
      if (pairA.id === pairB.id) {
        console.error(
          `❌ ERROR: Pareja ${pairA.id} se está enfrentando a sí misma!`
        );
        continue;
      }

      const newMatch: Match = {
        id: uuidv4(),
        tournamentId,
        categoryId,
        stage: "groups",
        groupId: group.id,
        pairAId: pairA.id,
        pairBId: pairB.id,
        status: "pending",
      };

      console.log(
        `⚽ Partido: ${pairA.player1.name} / ${pairA.player2.name} vs ${pairB.player1.name} / ${pairB.player2.name}`
      );
      matches.push(newMatch);
    }
  }

  console.log(
    `✅ Generados ${matches.length} partidos para el grupo "${group.name}"`
  );
  return matches;
}

/**
 * Genera todos los partidos round-robin para múltiples grupos
 */
export function generateAllGroupMatches(
  groups: Group[],
  pairs: Pair[],
  options: RoundRobinOptions
): Match[] {
  const allMatches: Match[] = [];

  for (const group of groups) {
    const groupMatches = generateRoundRobinMatches(group, pairs, options);
    allMatches.push(...groupMatches);
  }

  return allMatches;
}

/**
 * Calcula el número total de partidos para un grupo round-robin
 */
export function calculateTotalMatches(numPairs: number): number {
  if (numPairs < 2) return 0;
  return (numPairs * (numPairs - 1)) / 2;
}

/**
 * Calcula el número de rondas necesarias para completar un round-robin
 */
export function calculateRounds(numPairs: number): number {
  if (numPairs < 2) return 0;
  return numPairs % 2 === 0 ? numPairs - 1 : numPairs;
}

/**
 * Valida que no haya partidos duplicados
 */
export function validateMatches(matches: Match[]): {
  isValid: boolean;
  duplicates: Array<{ match1: Match; match2: Match }>;
} {
  const duplicates: Array<{ match1: Match; match2: Match }> = [];

  for (let i = 0; i < matches.length; i++) {
    for (let j = i + 1; j < matches.length; j++) {
      const match1 = matches[i];
      const match2 = matches[j];

      // Verificar si es el mismo enfrentamiento (A vs B == B vs A)
      const sameMatchup =
        ((match1.pairAId === match2.pairAId &&
          match1.pairBId === match2.pairBId) ||
          (match1.pairAId === match2.pairBId &&
            match1.pairBId === match2.pairAId)) &&
        match1.groupId === match2.groupId;

      if (sameMatchup) {
        duplicates.push({ match1, match2 });
      }
    }
  }

  return {
    isValid: duplicates.length === 0,
    duplicates,
  };
}

/**
 * Genera estadísticas de los partidos generados
 */
export function generateMatchStats(
  groups: Group[],
  matches: Match[]
): {
  totalGroups: number;
  totalMatches: number;
  matchesByGroup: Record<string, number>;
  averageMatchesPerGroup: number;
} {
  const matchesByGroup: Record<string, number> = {};

  // Contar partidos por grupo
  for (const match of matches) {
    if (match.groupId) {
      matchesByGroup[match.groupId] = (matchesByGroup[match.groupId] || 0) + 1;
    }
  }

  // Asegurar que todos los grupos estén representados
  for (const group of groups) {
    if (!(group.id in matchesByGroup)) {
      matchesByGroup[group.id] = 0;
    }
  }

  const totalMatches = matches.length;
  const averageMatchesPerGroup =
    groups.length > 0 ? totalMatches / groups.length : 0;

  return {
    totalGroups: groups.length,
    totalMatches,
    matchesByGroup,
    averageMatchesPerGroup,
  };
}

/**
 * Verifica que todos los enfrentamientos posibles estén cubiertos en un grupo
 */
export function verifyGroupCompleteness(
  group: Group,
  matches: Match[]
): { isComplete: boolean; missingMatches: Array<{ pairA: ID; pairB: ID }> } {
  const groupMatches = matches.filter((m) => m.groupId === group.id);
  const pairs = group.pairIds;
  const missingMatches: Array<{ pairA: ID; pairB: ID }> = [];

  // Generar todos los enfrentamientos posibles
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const pairA = pairs[i];
      const pairB = pairs[j];

      // Verificar si existe un partido entre estas parejas
      const matchExists = groupMatches.some(
        (m) =>
          (m.pairAId === pairA && m.pairBId === pairB) ||
          (m.pairAId === pairB && m.pairBId === pairA)
      );

      if (!matchExists) {
        missingMatches.push({ pairA, pairB });
      }
    }
  }

  return {
    isComplete: missingMatches.length === 0,
    missingMatches,
  };
}
