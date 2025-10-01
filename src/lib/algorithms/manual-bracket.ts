import { Match, ID } from "@/types";
import { v4 as uuidv4 } from "uuid";

export interface ManualBracketMatch {
  id: string;
  pairAId: string | null;
  pairBId: string | null;
  stage: string;
  position: number;
}

export interface EliminationFormat {
  id: string;
  name: string;
  description: string;
  stages: string[];
  maxTeams: number;
}

export const ELIMINATION_FORMATS: EliminationFormat[] = [
  {
    id: "final_only",
    name: "Solo Final",
    description: "2 equipos - Solo final (sin semifinales)",
    stages: ["final"],
    maxTeams: 2,
  },
  {
    id: "semifinals_only",
    name: "Solo Semifinales y Final",
    description: "4 equipos - Solo semifinales + final (sin 3er lugar)",
    stages: ["semifinal", "final"],
    maxTeams: 4,
  },
  {
    id: "semifinals",
    name: "Semifinales Completas",
    description: "4 equipos - Semifinales + Final + 3er Lugar",
    stages: ["semifinal", "final", "third_place"],
    maxTeams: 4,
  },
  {
    id: "quarterfinals_only",
    name: "Solo Cuartos y Semifinales",
    description: "8 equipos - Cuartos + Semifinales + Final (sin 3er lugar)",
    stages: ["quarterfinal", "semifinal", "final"],
    maxTeams: 8,
  },
  {
    id: "quarterfinals",
    name: "Cuartos Completos",
    description: "8 equipos - Cuartos + Semifinales + Final + 3er Lugar",
    stages: ["quarterfinal", "semifinal", "final", "third_place"],
    maxTeams: 8,
  },
  {
    id: "round_of_16_only",
    name: "Solo Octavos y Cuartos",
    description: "16 equipos - Octavos + Cuartos + Semifinales + Final (sin 3er lugar)",
    stages: ["quarterfinal", "semifinal", "final"],
    maxTeams: 16,
  },
  {
    id: "round_of_16",
    name: "Octavos Completos",
    description: "16 equipos - Octavos + Cuartos + Semifinales + Final + 3er Lugar",
    stages: ["quarterfinal", "semifinal", "final", "third_place"],
    maxTeams: 16,
  },
];

/**
 * Genera la estructura del bracket manual según el formato seleccionado
 */
export function generateManualBracketStructure(
  format: EliminationFormat
): ManualBracketMatch[] {
  const matches: ManualBracketMatch[] = [];
  let matchId = 1;

  // Generar partidos para cada etapa
  format.stages.forEach((stage, stageIndex) => {
    const matchesInStage = Math.pow(2, format.stages.length - stageIndex - 1);
    
    for (let i = 0; i < matchesInStage; i++) {
      matches.push({
        id: `match-${matchId}`,
        pairAId: null,
        pairBId: null,
        stage,
        position: i + 1,
      });
      matchId++;
    }
  });

  return matches;
}

/**
 * Convierte los partidos del bracket manual a formato Match para la base de datos
 */
export function convertManualBracketToMatches(
  manualMatches: ManualBracketMatch[],
  tournamentId: ID,
  categoryId: ID
): Match[] {
  // Validar que los valores de stage sean correctos
  const validStages = ['groups', 'quarterfinal', 'semifinal', 'final', 'third_place'];
  
  const matches = manualMatches
    .filter((match) => match.pairAId && match.pairBId)
    .map((match) => {
      // Asegurar que el stage sea válido
      if (!validStages.includes(match.stage)) {
        console.error(`❌ Stage inválido: ${match.stage}. Valores permitidos:`, validStages);
        throw new Error(`Stage inválido: ${match.stage}`);
      }
      
      return {
        id: match.id,
        tournamentId,
        categoryId,
        stage: match.stage as Match["stage"],
        pairAId: match.pairAId!,
        pairBId: match.pairBId!,
        status: "pending" as const,
      };
    });

  // Debug: Mostrar los valores de stage que se están enviando
  console.log("🔍 Valores de stage que se envían a la BD:", matches.map(m => ({
    id: m.id,
    stage: m.stage,
    pairA: m.pairAId,
    pairB: m.pairBId
  })));
  
  // Debug: Verificar que todos los campos requeridos estén presentes
  console.log("🔍 Verificación de campos requeridos:", matches.map(m => ({
    hasPairA: !!m.pairAId,
    hasPairB: !!m.pairBId,
    hasStage: !!m.stage,
    stageValue: m.stage,
    stageType: typeof m.stage
  })));

  // Debug: Verificar que no hay matches vacíos
  console.log("🔍 Total de matches a crear:", matches.length);
  console.log("🔍 Matches con datos completos:", matches.filter(m => m.pairAId && m.pairBId).length);

  return matches;
}

/**
 * Obtiene el formato de eliminatorias recomendado según el número de equipos
 */
export function getRecommendedFormat(teamCount: number): EliminationFormat | null {
  // Encontrar el formato que mejor se adapte al número de equipos
  const suitableFormats = ELIMINATION_FORMATS.filter(
    (format) => teamCount <= format.maxTeams
  );

  if (suitableFormats.length === 0) {
    return null;
  }

  // Retornar el formato con el menor número de equipos que pueda manejar
  return suitableFormats.reduce((prev, current) =>
    current.maxTeams < prev.maxTeams ? current : prev
  );
}

/**
 * Valida que el bracket manual esté correctamente configurado
 */
export function validateManualBracket(
  manualMatches: ManualBracketMatch[],
  format: EliminationFormat
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Verificar que todos los partidos de la primera ronda tengan parejas
  const firstStage = format.stages[0];
  const firstRoundMatches = manualMatches.filter((m) => m.stage === firstStage);
  
  const incompleteFirstRound = firstRoundMatches.filter(
    (match) => !match.pairAId || !match.pairBId
  );

  if (incompleteFirstRound.length > 0) {
    errors.push(
      `Completa todos los enfrentamientos de ${getStageName(firstStage)}`
    );
  }

  // Verificar que no haya parejas duplicadas en la primera ronda
  const usedPairs = new Set<string>();
  for (const match of firstRoundMatches) {
    if (match.pairAId && match.pairBId) {
      if (usedPairs.has(match.pairAId)) {
        errors.push(`La pareja A del partido ${match.position} ya está en otro partido`);
      }
      if (usedPairs.has(match.pairBId)) {
        errors.push(`La pareja B del partido ${match.position} ya está en otro partido`);
      }
      if (match.pairAId === match.pairBId) {
        errors.push(`El partido ${match.position} no puede tener la misma pareja en ambas posiciones`);
      }
      usedPairs.add(match.pairAId);
      usedPairs.add(match.pairBId);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Obtiene las parejas no utilizadas en el bracket
 */
export function getUnusedPairs(
  manualMatches: ManualBracketMatch[],
  allPairs: { id: string }[]
): string[] {
  const usedPairIds = new Set<string>();
  
  // Recopilar todas las parejas usadas en el bracket
  manualMatches.forEach((match) => {
    if (match.pairAId) usedPairIds.add(match.pairAId);
    if (match.pairBId) usedPairIds.add(match.pairBId);
  });
  
  // Encontrar parejas no utilizadas
  return allPairs
    .filter((pair) => !usedPairIds.has(pair.id))
    .map((pair) => pair.id);
}

/**
 * Obtiene el nombre legible de una etapa
 */
export function getStageName(stage: string): string {
  switch (stage) {
    case "round_of_16":
      return "Octavos de Final";
    case "quarterfinal":
      return "Cuartos de Final";
    case "semifinal":
      return "Semifinales";
    case "final":
      return "Final";
    case "third_place":
      return "Tercer Lugar";
    default:
      return stage;
  }
}

/**
 * Obtiene el icono para una etapa
 */
export function getStageIcon(stage: string): string {
  switch (stage) {
    case "round_of_16":
      return "👥";
    case "quarterfinal":
      return "👥";
    case "semifinal":
      return "▶️";
    case "final":
      return "👑";
    case "third_place":
      return "🥉";
    default:
      return "🏆";
  }
}

/**
 * Obtiene el color para una etapa
 */
export function getStageColor(stage: string): string {
  switch (stage) {
    case "round_of_16":
      return "bg-blue-100 text-blue-800";
    case "quarterfinal":
      return "bg-blue-100 text-blue-800";
    case "semifinal":
      return "bg-purple-100 text-purple-800";
    case "final":
      return "bg-yellow-100 text-yellow-800";
    case "third_place":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
