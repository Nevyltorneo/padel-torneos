import { Match, Standing, ID, Pair } from "@/types";
import { v4 as uuidv4 } from "uuid";

export interface BracketConfig {
  tournamentId: ID;
  categoryId: ID;
  bracketSize: number; // 4, 8, 16, etc.
  thirdPlace: boolean;
  seeding: "group_position" | "overall_performance" | "manual";
}

export interface BracketPosition {
  position: number; // 1-based position in bracket
  pair?: Pair;
  seed: number;
  source?: string; // "Grupo A - 1º", "Wildcard", etc.
}

/**
 * Genera el cuadro eliminatorio completo desde los clasificados
 */
export function generateBracket(
  qualifiedPairs: Standing[],
  config: BracketConfig
): Match[] {
  const { tournamentId, categoryId, bracketSize, thirdPlace } = config;

  if (qualifiedPairs.length > bracketSize) {
    throw new Error(
      `Demasiados clasificados (${qualifiedPairs.length}) para un bracket de ${bracketSize}`
    );
  }

  // Crear posiciones del bracket con seeding
  const bracketPositions = createBracketPositions(
    qualifiedPairs,
    bracketSize,
    config.seeding
  );

  // Generar todas las rondas
  const matches: Match[] = [];

  // Calcular número de rondas
  const rounds = Math.log2(bracketSize);
  if (rounds !== Math.floor(rounds)) {
    throw new Error(`Bracket size debe ser potencia de 2: 4, 8, 16, etc.`);
  }

  // Generar primera ronda (cuartos, octavos, etc.)
  const firstRoundMatches = generateFirstRound(
    bracketPositions,
    tournamentId,
    categoryId,
    bracketSize
  );
  matches.push(...firstRoundMatches);

  // Generar rondas subsecuentes
  let currentRoundMatches = firstRoundMatches;
  const stages: Match["stage"][] = getStageSequence(bracketSize);

  for (let round = 1; round < rounds; round++) {
    const nextRoundMatches = generateNextRound(
      currentRoundMatches,
      stages[round],
      tournamentId,
      categoryId
    );
    matches.push(...nextRoundMatches);
    currentRoundMatches = nextRoundMatches;
  }

  // Generar partido por el tercer lugar si está habilitado
  if (thirdPlace && bracketSize >= 4) {
    const thirdPlaceMatch = generateThirdPlaceMatch(
      matches,
      tournamentId,
      categoryId
    );
    if (thirdPlaceMatch) {
      matches.push(thirdPlaceMatch);
    }
  }

  return matches;
}

/**
 * Crea las posiciones del bracket con el seeding apropiado
 */
function createBracketPositions(
  qualifiedPairs: Standing[],
  bracketSize: number,
  seedingType: BracketConfig["seeding"]
): BracketPosition[] {
  const positions: BracketPosition[] = [];

  // Ordenar clasificados según el tipo de seeding
  let seededPairs: Standing[];

  switch (seedingType) {
    case "overall_performance":
      seededPairs = [...qualifiedPairs].sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        if (a.setsDiff !== b.setsDiff) return b.setsDiff - a.setsDiff;
        return b.gamesDiff - a.gamesDiff;
      });
      break;

    case "group_position":
    case "manual":
    default:
      seededPairs = [...qualifiedPairs]; // Mantener orden original
      break;
  }

  // Crear posiciones con seeding clásico
  const seedOrder = generateSeedOrder(bracketSize);

  for (let i = 0; i < bracketSize; i++) {
    const position: BracketPosition = {
      position: seedOrder[i],
      seed: i + 1,
      pair: seededPairs[i]?.pair,
      source: seededPairs[i]
        ? generateSourceDescription(seededPairs[i])
        : undefined,
    };
    positions.push(position);
  }

  return positions.sort((a, b) => a.position - b.position);
}

/**
 * Genera el orden de seeds para el bracket con seeding estándar
 * ALGORITMO INFINITO - Funciona para cualquier cantidad de equipos
 * Ejemplos:
 * - 2 equipos: 1vs2
 * - 4 equipos: 1vs4, 2vs3
 * - 8 equipos: 1vs8, 2vs7, 3vs6, 4vs5
 * - 16 equipos: 1vs16, 2vs15, 3vs14, 4vs13, 5vs12, 6vs11, 7vs10, 8vs9
 * - 32 equipos: 1vs32, 2vs31, ..., 16vs17
 * - 64 equipos: 1vs64, 2vs63, ..., 32vs33
 * - 128 equipos: 1vs128, 2vs127, ..., 64vs65
 * - etc. infinitamente...
 */
function generateSeedOrder(bracketSize: number): number[] {
  console.log(
    `🎯 Generando seeding DINÁMICO para bracket de ${bracketSize} equipos`
  );

  // Validar que sea potencia de 2
  if (bracketSize <= 0 || (bracketSize & (bracketSize - 1)) !== 0) {
    throw new Error(
      `El bracket size debe ser una potencia de 2. Recibido: ${bracketSize}`
    );
  }

  const order: number[] = [];
  const numMatches = bracketSize / 2;

  // ALGORITMO UNIVERSAL: Para cualquier potencia de 2
  // Patrón: 1 vs último, 2 vs penúltimo, 3 vs antepenúltimo, etc.
  for (let i = 1; i <= numMatches; i++) {
    const highSeed = i; // 1, 2, 3, 4, 5, ...
    const lowSeed = bracketSize + 1 - i; // último, penúltimo, antepenúltimo, ...

    order.push(highSeed, lowSeed);
  }

  // Logging detallado
  console.log(
    `📊 Bracket de ${bracketSize} equipos = ${numMatches} partidos en primera ronda`
  );
  console.log(`📋 Orden generado:`, order);

  const matchups = [];
  for (let i = 0; i < order.length; i += 2) {
    matchups.push(`Seed ${order[i]} vs Seed ${order[i + 1]}`);
  }
  console.log(`🥊 Enfrentamientos generados:`, matchups);

  // Verificar que el seeding sea correcto
  if (order.length !== bracketSize) {
    throw new Error(
      `Error en el algoritmo: se generaron ${order.length} seeds para ${bracketSize} equipos`
    );
  }

  return order;
}

/**
 * Calcula el bracket size correcto (siguiente potencia de 2) para cualquier número de equipos
 */
export function calculateOptimalBracketSize(numTeams: number): number {
  if (numTeams <= 0) return 0;
  if (numTeams === 1) return 2; // Mínimo 2 para un bracket

  // Encontrar la siguiente potencia de 2 mayor o igual al número de equipos
  let bracketSize = 1;
  while (bracketSize < numTeams) {
    bracketSize *= 2;
  }

  console.log(`🧮 Para ${numTeams} equipos → Bracket óptimo: ${bracketSize}`);
  return bracketSize;
}

/**
 * Genera descripción del origen del clasificado
 */
function generateSourceDescription(standing: Standing): string {
  // Esta función se puede personalizar según cómo se identifiquen los grupos
  return `Clasificado - ${standing.points} pts`;
}

/**
 * Genera los partidos de la primera ronda con seeding correcto
 */
function generateFirstRound(
  bracketPositions: BracketPosition[],
  tournamentId: ID,
  categoryId: ID,
  bracketSize: number
): Match[] {
  const matches: Match[] = [];
  const stage = getFirstRoundStage(bracketSize);

  console.log("🎾 Generando primera ronda con seeding correcto:");
  console.log(
    "Posiciones del bracket:",
    bracketPositions.map((p) => ({
      position: p.position,
      seed: p.seed,
      pair: p.pair ? `${p.pair.player1.name}/${p.pair.player2.name}` : "TBD",
    }))
  );

  // El array bracketPositions ya viene ordenado por el seeding correcto
  // Generar enfrentamientos por pares consecutivos: [0] vs [1], [2] vs [3], etc.
  for (let i = 0; i < bracketPositions.length; i += 2) {
    const pos1 = bracketPositions[i];
    const pos2 = bracketPositions[i + 1];

    console.log(`🥎 Enfrentamiento: Seed ${pos1.seed} vs Seed ${pos2.seed}`);

    // Solo crear partido si ambas posiciones tienen parejas
    if (pos1.pair && pos2.pair) {
      const match: Match = {
        id: uuidv4(),
        tournamentId,
        categoryId,
        stage,
        pairAId: pos1.pair.id,
        pairBId: pos2.pair.id,
        status: "pending",
      };
      matches.push(match);

      console.log(
        `✅ Partido creado: ${pos1.pair.player1.name}/${pos1.pair.player2.name} vs ${pos2.pair.player1.name}/${pos2.pair.player2.name}`
      );
    }
  }

  return matches;
}

/**
 * Genera los partidos de la siguiente ronda basándose en los anteriores
 */
function generateNextRound(
  previousRoundMatches: Match[],
  stage: Match["stage"],
  tournamentId: ID,
  categoryId: ID
): Match[] {
  const matches: Match[] = [];

  // Emparejar partidos de la ronda anterior de a pares
  for (let i = 0; i < previousRoundMatches.length; i += 2) {
    const match1 = previousRoundMatches[i];
    const match2 = previousRoundMatches[i + 1];

    if (match1 && match2) {
      const newMatch: Match = {
        id: uuidv4(),
        tournamentId,
        categoryId,
        stage,
        pairAId: "", // Se llenará con el ganador de match1
        pairBId: "", // Se llenará con el ganador de match2
        status: "pending",
      };
      matches.push(newMatch);
    }
  }

  return matches;
}

/**
 * Genera el partido por el tercer lugar
 */
function generateThirdPlaceMatch(
  allMatches: Match[],
  tournamentId: ID,
  categoryId: ID
): Match | null {
  // Buscar las semifinales
  const semifinals = allMatches.filter((m) => m.stage === "semifinal");

  if (semifinals.length !== 2) {
    return null; // No hay exactamente 2 semifinales
  }

  const thirdPlaceMatch: Match = {
    id: uuidv4(),
    tournamentId,
    categoryId,
    stage: "third_place",
    pairAId: "", // Se llenará con el perdedor de semifinal 1
    pairBId: "", // Se llenará con el perdedor de semifinal 2
    status: "pending",
  };

  return thirdPlaceMatch;
}

/**
 * Obtiene la secuencia de stages según el tamaño del bracket
 */
function getStageSequence(bracketSize: number): Match["stage"][] {
  const stages: Match["stage"][] = [];

  switch (bracketSize) {
    case 4:
      stages.push("semifinal", "final");
      break;
    case 8:
      stages.push("quarterfinal", "semifinal", "final");
      break;
    case 16:
      // Sería necesario agregar 'round_of_16' al tipo Match['stage']
      stages.push("quarterfinal", "semifinal", "final");
      break;
    default:
      throw new Error(`Bracket size ${bracketSize} no soportado`);
  }

  return stages;
}

/**
 * Obtiene el stage de la primera ronda según el tamaño del bracket
 */
function getFirstRoundStage(bracketSize: number): Match["stage"] {
  switch (bracketSize) {
    case 4:
      return "semifinal";
    case 8:
      return "quarterfinal";
    case 16:
      return "quarterfinal"; // O 'round_of_16' si se agrega al tipo
    default:
      throw new Error(`Bracket size ${bracketSize} no soportado`);
  }
}

/**
 * Actualiza los partidos del bracket cuando se completa un partido
 */
export function updateBracketProgression(
  allMatches: Match[],
  completedMatch: Match
): Match[] {
  if (!completedMatch.score?.winnerPairId) {
    return allMatches; // No hay ganador definido
  }

  const winnerId = completedMatch.score.winnerPairId;
  const loserId =
    completedMatch.pairAId === winnerId
      ? completedMatch.pairBId
      : completedMatch.pairAId;

  // Encontrar el siguiente partido que depende de este resultado
  const nextMatch = findNextMatch(allMatches, completedMatch);
  const thirdPlaceMatch = findThirdPlaceMatch(allMatches, completedMatch);

  const updatedMatches = [...allMatches];

  // Actualizar siguiente partido con el ganador
  if (nextMatch) {
    const nextMatchIndex = updatedMatches.findIndex(
      (m) => m.id === nextMatch.id
    );
    if (nextMatchIndex !== -1) {
      const updated = { ...nextMatch };

      // Determinar si va en posición A o B
      if (!updated.pairAId) {
        updated.pairAId = winnerId;
      } else if (!updated.pairBId) {
        updated.pairBId = winnerId;
      }

      updatedMatches[nextMatchIndex] = updated;
    }
  }

  // Actualizar partido por el tercer lugar con el perdedor (si es semifinal)
  if (thirdPlaceMatch && completedMatch.stage === "semifinal") {
    const thirdPlaceIndex = updatedMatches.findIndex(
      (m) => m.id === thirdPlaceMatch.id
    );
    if (thirdPlaceIndex !== -1) {
      const updated = { ...thirdPlaceMatch };

      if (!updated.pairAId) {
        updated.pairAId = loserId;
      } else if (!updated.pairBId) {
        updated.pairBId = loserId;
      }

      updatedMatches[thirdPlaceIndex] = updated;
    }
  }

  return updatedMatches;
}

/**
 * Encuentra el siguiente partido que depende del resultado actual
 */
function findNextMatch(
  allMatches: Match[],
  completedMatch: Match
): Match | null {
  // Esta lógica depende de cómo se estructure la navegación del bracket
  // Por simplicidad, buscar partidos de la siguiente stage que no tengan parejas asignadas

  const nextStages: Record<Match["stage"], Match["stage"]> = {
    quarterfinal: "semifinal",
    semifinal: "final",
    groups: "quarterfinal",
    final: "final", // No hay siguiente
    third_place: "third_place", // No hay siguiente
  };

  const nextStage = nextStages[completedMatch.stage];
  if (!nextStage || nextStage === completedMatch.stage) {
    return null;
  }

  return (
    allMatches.find(
      (match) =>
        match.stage === nextStage &&
        match.categoryId === completedMatch.categoryId &&
        (!match.pairAId || !match.pairBId)
    ) || null
  );
}

/**
 * Encuentra el partido por el tercer lugar
 */
function findThirdPlaceMatch(
  allMatches: Match[],
  completedMatch: Match
): Match | null {
  if (completedMatch.stage !== "semifinal") {
    return null;
  }

  return (
    allMatches.find(
      (match) =>
        match.stage === "third_place" &&
        match.categoryId === completedMatch.categoryId
    ) || null
  );
}

/**
 * Valida que el bracket esté correctamente estructurado
 */
export function validateBracket(
  matches: Match[],
  bracketSize: number
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Verificar número de partidos por stage
  const stageCount = matches.reduce((acc, match) => {
    acc[match.stage] = (acc[match.stage] || 0) + 1;
    return acc;
  }, {} as Record<Match["stage"], number>);

  // Validaciones según el tamaño del bracket
  const expectedStages = getStageSequence(bracketSize);

  expectedStages.forEach((stage, index) => {
    const expectedCount = Math.pow(2, expectedStages.length - index - 1);
    const actualCount = stageCount[stage] || 0;

    if (actualCount !== expectedCount) {
      errors.push(
        `${stage}: esperados ${expectedCount} partidos, encontrados ${actualCount}`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
