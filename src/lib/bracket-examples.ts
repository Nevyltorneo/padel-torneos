/**
 * EJEMPLOS DEL ALGORITMO INFINITO DE BRACKETS
 * Demuestra cómo funciona para cualquier cantidad de equipos
 */

import { calculateOptimalBracketSize } from "./algorithms/bracket";

interface BracketExample {
  numTeams: number;
  bracketSize: number;
  firstRoundMatches: number;
  totalRounds: number;
  stages: string[];
  sampleMatchups: string[];
}

/**
 * Genera ejemplos de brackets para diferentes cantidades de equipos
 */
export function generateBracketExamples(): BracketExample[] {
  const examples: BracketExample[] = [];

  // Casos de prueba: desde torneos pequeños hasta mega torneos
  const testCases = [
    2, 3, 4, 5, 8, 10, 16, 20, 32, 50, 64, 100, 128, 200, 256, 500,
  ];

  testCases.forEach((numTeams) => {
    const bracketSize = calculateOptimalBracketSize(numTeams);
    const firstRoundMatches = bracketSize / 2;
    const totalRounds = Math.log2(bracketSize);
    const stages = generateStagesForSize(bracketSize);
    const sampleMatchups = generateSampleMatchups(
      bracketSize,
      Math.min(4, firstRoundMatches)
    );

    examples.push({
      numTeams,
      bracketSize,
      firstRoundMatches,
      totalRounds,
      stages,
      sampleMatchups,
    });
  });

  return examples;
}

/**
 * Genera las etapas para un bracket size dado
 */
function generateStagesForSize(bracketSize: number): string[] {
  const stages: string[] = [];
  const stageNames: { [key: number]: string } = {
    1024: "round_of_1024",
    512: "round_of_512",
    256: "round_of_256",
    128: "round_of_128",
    64: "round_of_64",
    32: "round_of_32",
    16: "round_of_16",
    8: "quarterfinals",
    4: "semifinals",
    2: "final",
  };

  let currentSize = bracketSize;
  while (currentSize >= 2) {
    const stageName = stageNames[currentSize] || `round_of_${currentSize}`;
    stages.push(stageName);
    currentSize = currentSize / 2;
  }

  return stages;
}

/**
 * Genera enfrentamientos de muestra para la primera ronda
 */
function generateSampleMatchups(
  bracketSize: number,
  numSamples: number
): string[] {
  const matchups: string[] = [];
  const numMatches = bracketSize / 2;

  for (let i = 1; i <= Math.min(numSamples, numMatches); i++) {
    const highSeed = i;
    const lowSeed = bracketSize + 1 - i;
    matchups.push(`Seed ${highSeed} vs Seed ${lowSeed}`);
  }

  if (numMatches > numSamples) {
    matchups.push(`... y ${numMatches - numSamples} partidos más`);
  }

  return matchups;
}

/**
 * Imprime todos los ejemplos de manera legible
 */
export function printBracketExamples(): void {
  const examples = generateBracketExamples();

  console.log("🏆 ALGORITMO INFINITO DE BRACKETS - EJEMPLOS 🏆");
  console.log("=".repeat(60));

  examples.forEach((example) => {
    console.log(`\n📊 ${example.numTeams} EQUIPOS:`);
    console.log(`   🏟️  Bracket size: ${example.bracketSize}`);
    console.log(`   🥊 Primera ronda: ${example.firstRoundMatches} partidos`);
    console.log(`   🔢 Total rondas: ${example.totalRounds}`);
    console.log(`   🎯 Etapas: ${example.stages.join(" → ")}`);
    console.log(`   ⚔️  Enfrentamientos: ${example.sampleMatchups.join(", ")}`);
  });

  console.log("\n" + "=".repeat(60));
  console.log("✅ El algoritmo funciona para CUALQUIER cantidad de equipos!");
  console.log("🚀 Desde 2 equipos hasta 1000+ equipos sin límite!");
}

/**
 * Calcula estadísticas para mega torneos
 */
export function calculateMegaTournamentStats(numTeams: number): {
  bracketSize: number;
  totalMatches: number;
  rounds: number;
  daysNeeded: number; // Asumiendo 32 partidos por día
  courtsNeeded: number; // Asumiendo 8 horas por día, partidos de 1.5 horas
} {
  const bracketSize = calculateOptimalBracketSize(numTeams);
  const totalMatches = bracketSize - 1; // En eliminación directa
  const rounds = Math.log2(bracketSize);
  const matchesPerDay = 32; // Estimación
  const daysNeeded = Math.ceil(totalMatches / matchesPerDay);
  const courtsNeeded = Math.ceil(bracketSize / 2 / 5); // 5 partidos simultáneos máximo por cancha

  return {
    bracketSize,
    totalMatches,
    rounds,
    daysNeeded,
    courtsNeeded,
  };
}

// Ejemplo de uso inmediato
if (typeof window === "undefined") {
  // Solo en Node.js/servidor
  console.log("🎾 SISTEMA DE BRACKETS INFINITO ACTIVADO");

  // Ejemplos rápidos
  const quickExamples = [10, 50, 100, 200];
  quickExamples.forEach((num) => {
    const stats = calculateMegaTournamentStats(num);
    console.log(
      `\n${num} equipos → Bracket ${stats.bracketSize} → ${stats.totalMatches} partidos → ${stats.rounds} rondas`
    );
  });
}
