import { Pair, Group, ID } from "@/types";
import { v4 as uuidv4 } from "uuid";

export interface GroupGenerationOptions {
  minGroupSize: number;
  maxGroupSize: number;
  balanceBySeeds?: boolean;
}

/**
 * Genera grupos balanceados por seeds desde una lista de parejas
 * Implementa el algoritmo de distribución equilibrada descrito en el diseño
 */
export function generateGroups(
  pairs: Pair[],
  categoryId: ID,
  options: GroupGenerationOptions
): Group[] {
  const { minGroupSize, maxGroupSize, balanceBySeeds = true } = options;

  if (pairs.length < minGroupSize) {
    throw new Error(
      `Insuficientes parejas. Mínimo requerido: ${minGroupSize}, actual: ${pairs.length}`
    );
  }

  // Paso 1: Ordenar parejas por seed (nulls al final)
  const sortedPairs = balanceBySeeds
    ? [...pairs].sort((a, b) => {
        if (a.seed === undefined && b.seed === undefined) return 0;
        if (a.seed === undefined) return 1;
        if (b.seed === undefined) return -1;
        return a.seed - b.seed;
      })
    : [...pairs];

  // Paso 2: Inicializar grupos
  const groups: Group[] = [];
  let remainingPairs = [...sortedPairs];

  // Paso 3: Distribución inicial
  while (remainingPairs.length > 0) {
    // Buscar grupo que pueda aceptar más parejas
    let targetGroup = groups.find((g) => g.pairIds.length < maxGroupSize);

    // Si no hay grupo disponible, crear uno nuevo
    if (!targetGroup) {
      targetGroup = {
        id: uuidv4(),
        categoryId,
        name: `Grupo ${String.fromCharCode(65 + groups.length)}`, // A, B, C...
        pairIds: [],
      };
      groups.push(targetGroup);
    }

    // Agregar pareja al grupo
    const pair = remainingPairs.shift()!;
    targetGroup.pairIds.push(pair.id);
  }

  // Paso 4: Redistribuir si algún grupo quedó muy pequeño
  redistributeSmallGroups(groups, minGroupSize, maxGroupSize);

  return groups;
}

/**
 * Redistribuye parejas de grupos muy pequeños a otros grupos
 */
function redistributeSmallGroups(
  groups: Group[],
  minGroupSize: number,
  maxGroupSize: number
): void {
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];

    if (group.pairIds.length < minGroupSize) {
      // Redistribuir parejas de este grupo
      const pairsToRedistribute = [...group.pairIds];

      // Remover el grupo pequeño
      groups.splice(i, 1);

      // Redistribuir las parejas
      for (const pairId of pairsToRedistribute) {
        // Buscar grupo con espacio disponible
        const targetGroup = groups.find((g) => g.pairIds.length < maxGroupSize);

        if (targetGroup) {
          targetGroup.pairIds.push(pairId);
        } else {
          // Si no hay espacio, crear nuevo grupo (esto debería ser raro)
          const newGroup: Group = {
            id: uuidv4(),
            categoryId: group.categoryId,
            name: `Grupo ${String.fromCharCode(65 + groups.length)}`,
            pairIds: [pairId],
          };
          groups.push(newGroup);
        }
      }
    }
  }

  // Reajustar nombres de grupos
  groups.forEach((group, index) => {
    group.name = `Grupo ${String.fromCharCode(65 + index)}`;
  });
}

/**
 * Valida que la configuración de grupos sea viable
 */
export function validateGroupConfiguration(
  totalPairs: number,
  minGroupSize: number,
  maxGroupSize: number
): { isValid: boolean; message?: string; suggestedGroups?: number } {
  if (totalPairs < minGroupSize) {
    return {
      isValid: false,
      message: `Insuficientes parejas. Mínimo: ${minGroupSize}, actual: ${totalPairs}`,
    };
  }

  // Calcular número óptimo de grupos
  const minGroups = Math.ceil(totalPairs / maxGroupSize);
  const maxGroups = Math.floor(totalPairs / minGroupSize);

  if (minGroups > maxGroups) {
    return {
      isValid: false,
      message: `Configuración imposible. Con ${totalPairs} parejas, min ${minGroupSize} y max ${maxGroupSize} por grupo no es viable.`,
    };
  }

  // Encontrar distribución más equilibrada
  let bestGroups = minGroups;
  let bestBalance = Infinity;

  for (let numGroups = minGroups; numGroups <= maxGroups; numGroups++) {
    const avgSize = totalPairs / numGroups;
    const largeGroups = totalPairs % numGroups;
    const smallGroups = numGroups - largeGroups;

    const largeGroupSize = Math.ceil(avgSize);
    const smallGroupSize = Math.floor(avgSize);

    // Calcular desbalance
    const balance =
      largeGroups * Math.pow(largeGroupSize - avgSize, 2) +
      smallGroups * Math.pow(smallGroupSize - avgSize, 2);

    if (balance < bestBalance) {
      bestBalance = balance;
      bestGroups = numGroups;
    }
  }

  return {
    isValid: true,
    suggestedGroups: bestGroups,
  };
}

/**
 * Calcula estadísticas de distribución de grupos
 */
export function calculateGroupStats(groups: Group[]): {
  totalGroups: number;
  totalPairs: number;
  averageSize: number;
  minSize: number;
  maxSize: number;
  distribution: number[];
} {
  const sizes = groups.map((g) => g.pairIds.length);
  const totalPairs = sizes.reduce((sum, size) => sum + size, 0);

  return {
    totalGroups: groups.length,
    totalPairs,
    averageSize: totalPairs / groups.length,
    minSize: Math.min(...sizes),
    maxSize: Math.max(...sizes),
    distribution: sizes,
  };
}
