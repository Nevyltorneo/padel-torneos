import { Match, Standing, Pair, Score, ScoreSet, ID } from "@/types";

/**
 * Configuración para el cálculo de puntos
 */
export interface StandingsConfig {
  pointsPerWin: number;
  pointsPerLoss: number;
  pointsPerDraw?: number; // Para casos especiales
}

const DEFAULT_CONFIG: StandingsConfig = {
  pointsPerWin: 2,
  pointsPerLoss: 0,
};

/**
 * Calcula la tabla de posiciones para un grupo o categoría
 */
export function calculateStandings(
  matches: Match[],
  pairs: Pair[],
  config: StandingsConfig = DEFAULT_CONFIG
): Standing[] {
  // Filtrar solo partidos terminados
  const finishedMatches = matches.filter(
    (match) => match.status === "finished" && match.score?.winnerPairId
  );

  // Inicializar estadísticas para cada pareja
  const pairStats = new Map<ID, Standing>();

  pairs.forEach((pair) => {
    pairStats.set(pair.id, {
      pairId: pair.id,
      pair,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      points: 0,
      setsFor: 0,
      setsAgainst: 0,
      setsDiff: 0,
      gamesFor: 0,
      gamesAgainst: 0,
      gamesDiff: 0,
    });
  });

  // Procesar cada partido terminado
  finishedMatches.forEach((match) => {
    if (!match.score) return;

    const pairAStats = pairStats.get(match.pairAId);
    const pairBStats = pairStats.get(match.pairBId);

    if (!pairAStats || !pairBStats) return;

    // Calcular estadísticas del partido
    const matchStats = calculateMatchStats(match.score);

    // Actualizar partidos jugados
    pairAStats.matchesPlayed++;
    pairBStats.matchesPlayed++;

    // Actualizar sets y games
    pairAStats.setsFor += matchStats.pairASets;
    pairAStats.setsAgainst += matchStats.pairBSets;
    pairAStats.gamesFor += matchStats.pairAGames;
    pairAStats.gamesAgainst += matchStats.pairBGames;

    pairBStats.setsFor += matchStats.pairBSets;
    pairBStats.setsAgainst += matchStats.pairASets;
    pairBStats.gamesFor += matchStats.pairBGames;
    pairBStats.gamesAgainst += matchStats.pairAGames;

    // Actualizar diferencias
    pairAStats.setsDiff = pairAStats.setsFor - pairAStats.setsAgainst;
    pairAStats.gamesDiff = pairAStats.gamesFor - pairAStats.gamesAgainst;
    pairBStats.setsDiff = pairBStats.setsFor - pairBStats.setsAgainst;
    pairBStats.gamesDiff = pairBStats.gamesFor - pairBStats.gamesAgainst;

    // Actualizar victorias/derrotas y puntos
    if (match.score.winnerPairId === match.pairAId) {
      pairAStats.wins++;
      pairAStats.points += config.pointsPerWin;
      pairBStats.losses++;
      pairBStats.points += config.pointsPerLoss;
    } else if (match.score.winnerPairId === match.pairBId) {
      pairBStats.wins++;
      pairBStats.points += config.pointsPerWin;
      pairAStats.losses++;
      pairAStats.points += config.pointsPerLoss;
    }
  });

  // Convertir a array y ordenar
  const standings = Array.from(pairStats.values());
  return sortStandings(standings, finishedMatches);
}

/**
 * Calcula estadísticas de un partido individual
 */
function calculateMatchStats(score: Score): {
  pairASets: number;
  pairBSets: number;
  pairAGames: number;
  pairBGames: number;
} {
  let pairASets = 0;
  let pairBSets = 0;
  let pairAGames = 0;
  let pairBGames = 0;

  score.sets.forEach((set) => {
    pairAGames += set.a;
    pairBGames += set.b;

    if (set.a > set.b) {
      pairASets++;
    } else if (set.b > set.a) {
      pairBSets++;
    }
  });

  return { pairASets, pairBSets, pairAGames, pairBGames };
}

/**
 * Ordena la tabla de posiciones según los criterios establecidos
 */
function sortStandings(standings: Standing[], matches: Match[]): Standing[] {
  return standings.sort((a, b) => {
    // 1. Puntos (más puntos = mejor posición)
    if (a.points !== b.points) {
      return b.points - a.points;
    }

    // 2. Diferencia de sets
    if (a.setsDiff !== b.setsDiff) {
      return b.setsDiff - a.setsDiff;
    }

    // 3. Diferencia de games
    if (a.gamesDiff !== b.gamesDiff) {
      return b.gamesDiff - a.gamesDiff;
    }

    // 4. Head-to-head (enfrentamiento directo)
    const h2h = calculateHeadToHead(a.pairId, b.pairId, matches);
    if (h2h !== 0) {
      return h2h;
    }

    // 5. Sets a favor
    if (a.setsFor !== b.setsFor) {
      return b.setsFor - a.setsFor;
    }

    // 6. Games a favor
    if (a.gamesFor !== b.gamesFor) {
      return b.gamesFor - a.gamesFor;
    }

    // 7. Empate perfecto - mantener orden actual (se podría implementar sorteo)
    return 0;
  });
}

/**
 * Calcula el resultado del enfrentamiento directo entre dos parejas
 * Retorna: > 0 si pairA ganó, < 0 si pairB ganó, 0 si empate o no jugaron
 */
function calculateHeadToHead(
  pairAId: ID,
  pairBId: ID,
  matches: Match[]
): number {
  const h2hMatches = matches.filter(
    (match) =>
      match.status === "finished" &&
      match.score?.winnerPairId &&
      ((match.pairAId === pairAId && match.pairBId === pairBId) ||
        (match.pairAId === pairBId && match.pairBId === pairAId))
  );

  if (h2hMatches.length === 0) return 0;

  let pairAWins = 0;
  let pairBWins = 0;

  h2hMatches.forEach((match) => {
    if (match.score?.winnerPairId === pairAId) {
      pairAWins++;
    } else if (match.score?.winnerPairId === pairBId) {
      pairBWins++;
    }
  });

  return pairAWins - pairBWins;
}

/**
 * Obtiene los clasificados para la siguiente fase
 */
export function getQualifiedPairs(
  standings: Standing[],
  qualifyingPositions: number[] = [1, 2] // Por defecto 1º y 2º
): Standing[] {
  const qualified: Standing[] = [];

  qualifyingPositions.forEach((position) => {
    if (position <= standings.length) {
      qualified.push(standings[position - 1]); // position es 1-based, array es 0-based
    }
  });

  return qualified;
}

/**
 * Calcula wildcards por mejor diferencial cuando hay posiciones impares
 */
export function calculateWildcards(
  allGroupStandings: Standing[][],
  wildcardPositions: number[], // ej: [2] para segundos lugares
  numberOfWildcards: number
): Standing[] {
  const wildcardCandidates: Standing[] = [];

  // Recopilar candidatos de todas las posiciones especificadas
  allGroupStandings.forEach((groupStandings) => {
    wildcardPositions.forEach((position) => {
      if (position <= groupStandings.length) {
        wildcardCandidates.push(groupStandings[position - 1]);
      }
    });
  });

  // Ordenar candidatos por mejor rendimiento
  const sortedCandidates = wildcardCandidates.sort((a, b) => {
    // Priorizar por puntos
    if (a.points !== b.points) {
      return b.points - a.points;
    }

    // Luego por diferencia de sets
    if (a.setsDiff !== b.setsDiff) {
      return b.setsDiff - a.setsDiff;
    }

    // Finalmente por diferencia de games
    return b.gamesDiff - a.gamesDiff;
  });

  return sortedCandidates.slice(0, numberOfWildcards);
}

/**
 * Valida que todos los partidos necesarios estén completados
 */
export function validateStandingsCompleteness(
  matches: Match[],
  expectedMatches: number
): {
  isComplete: boolean;
  finishedMatches: number;
  pendingMatches: number;
  completionRate: number;
} {
  const finishedMatches = matches.filter((m) => m.status === "finished").length;
  const pendingMatches = expectedMatches - finishedMatches;
  const completionRate =
    expectedMatches > 0 ? (finishedMatches / expectedMatches) * 100 : 0;

  return {
    isComplete: pendingMatches === 0,
    finishedMatches,
    pendingMatches,
    completionRate,
  };
}

/**
 * Genera reporte de estadísticas de la fase de grupos
 */
export function generateGroupStageReport(allGroupStandings: Standing[][]): {
  totalGroups: number;
  totalPairs: number;
  averagePairsPerGroup: number;
  topScorers: Standing[];
  bestAttack: Standing[]; // Mayor diferencia positiva de games
  bestDefense: Standing[]; // Menor games en contra por partido
} {
  const allStandings = allGroupStandings.flat();

  // Top scorers (más puntos)
  const topScorers = [...allStandings]
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  // Best attack (mejor diferencia de games)
  const bestAttack = [...allStandings]
    .sort((a, b) => b.gamesDiff - a.gamesDiff)
    .slice(0, 5);

  // Best defense (menos games en contra por partido)
  const bestDefense = [...allStandings]
    .filter((s) => s.matchesPlayed > 0)
    .sort(
      (a, b) =>
        a.gamesAgainst / a.matchesPlayed - b.gamesAgainst / b.matchesPlayed
    )
    .slice(0, 5);

  return {
    totalGroups: allGroupStandings.length,
    totalPairs: allStandings.length,
    averagePairsPerGroup:
      allGroupStandings.length > 0
        ? allStandings.length / allGroupStandings.length
        : 0,
    topScorers,
    bestAttack,
    bestDefense,
  };
}
