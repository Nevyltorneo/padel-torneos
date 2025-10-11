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

  // Paso 3: Calcular número óptimo de grupos
  const optimalGroups = Math.ceil(pairs.length / maxGroupSize);
  const actualGroups = Math.max(optimalGroups, Math.ceil(pairs.length / maxGroupSize));
  
  console.log(`🎯 Calculando distribución óptima:`, {
    totalPairs: pairs.length,
    minGroupSize,
    maxGroupSize,
    optimalGroups,
    actualGroups
  });

  // Crear grupos iniciales
  for (let i = 0; i < actualGroups; i++) {
    groups.push({
      id: uuidv4(),
      categoryId,
      name: `Grupo ${String.fromCharCode(65 + i)}`, // A, B, C...
      pairIds: [],
    });
  }

  // Paso 4: Distribución equilibrada
  let pairIndex = 0;
  for (const pair of sortedPairs) {
    // Distribuir parejas de forma round-robin para equilibrio
    const targetGroupIndex = pairIndex % groups.length;
    groups[targetGroupIndex].pairIds.push(pair.id);
    pairIndex++;
  }

  console.log(`✅ Distribución inicial completada:`, {
    totalGroups: groups.length,
    pairsPerGroup: groups.map(g => g.pairIds.length)
  });

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
  console.log(`🔄 Optimizando distribución de grupos:`, {
    minGroupSize,
    maxGroupSize,
    currentDistribution: groups.map(g => g.pairIds.length)
  });

  // Verificar si necesitamos redistribución
  const needsRedistribution = groups.some(g => g.pairIds.length < minGroupSize);
  
  if (!needsRedistribution) {
    console.log(`✅ Distribución ya es óptima`);
    return;
  }

  // Recopilar todas las parejas
  const allPairs: string[] = [];
  groups.forEach(group => {
    allPairs.push(...group.pairIds);
  });

  // Limpiar grupos existentes
  groups.forEach(group => {
    group.pairIds = [];
  });

  // Redistribuir de forma equilibrada respetando minGroupSize
  const totalPairs = allPairs.length;
  const optimalGroups = Math.ceil(totalPairs / maxGroupSize);
  
  // Asegurar que tenemos suficientes grupos para respetar minGroupSize
  const minRequiredGroups = Math.ceil(totalPairs / maxGroupSize);
  const actualGroups = Math.max(optimalGroups, minRequiredGroups);

  console.log(`🎯 Redistribuyendo:`, {
    totalPairs,
    optimalGroups,
    actualGroups,
    groupsAvailable: groups.length
  });

  // Redistribuir parejas de forma round-robin
  let pairIndex = 0;
  for (const pairId of allPairs) {
    const targetGroupIndex = pairIndex % Math.min(groups.length, actualGroups);
    groups[targetGroupIndex].pairIds.push(pairId);
    pairIndex++;
  }

  // Reajustar nombres de grupos
  groups.forEach((group, index) => {
    group.name = `Grupo ${String.fromCharCode(65 + index)}`;
  });

  console.log(`✅ Redistribución completada:`, {
    finalDistribution: groups.map(g => g.pairIds.length)
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
