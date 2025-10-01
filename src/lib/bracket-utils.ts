import {
  deleteAllKnockoutMatches,
  getAdvancingPairs,
} from "./supabase-queries";
import { generateBracket, BracketConfig } from "./algorithms/bracket";
import { createKnockoutMatches } from "./supabase-queries";

/**
 * Regenera completamente las eliminatorias con el seeding correcto
 */
export async function regenerateEliminatoriesWithCorrectSeeding(
  categoryId: string
) {
  try {
    console.log("🔄 Regenerando eliminatorias con seeding correcto...");

    // 1. Limpiar eliminatorias existentes
    console.log("🗑️ Limpiando eliminatorias existentes...");
    await deleteAllKnockoutMatches(categoryId);

    // 2. Obtener parejas clasificadas con seeding correcto
    console.log("📊 Obteniendo parejas clasificadas...");
    const { advancingPairs, bracketInfo } = await getAdvancingPairs(categoryId);

    if (advancingPairs.length === 0) {
      throw new Error("No hay parejas clasificadas para eliminatorias");
    }

    // 3. Convertir a Standing objects (simplificado para el bracket)
    const standings = advancingPairs.map((pair, index) => ({
      pairId: pair.id,
      pair: pair,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      points: 0, // Se podría calcular desde los grupos
      setsFor: 0,
      setsAgainst: 0,
      setsDiff: 0,
      gamesFor: 0,
      gamesAgainst: 0,
      gamesDiff: 0,
    }));

    // 4. Configurar bracket
    const bracketConfig: BracketConfig = {
      tournamentId: advancingPairs[0].tournamentId,
      categoryId: categoryId,
      bracketSize: bracketInfo.bracketSize,
      thirdPlace: true,
      seeding: "group_position", // Usar el orden de grupos
    };

    // 5. Generar nuevo bracket con seeding correcto
    console.log("🎾 Generando bracket con seeding correcto...");
    const matches = generateBracket(standings, bracketConfig);

    // 6. Crear partidos en la base de datos
    console.log("💾 Guardando partidos en la base de datos...");
    await createKnockoutMatches(matches);

    console.log("✅ Eliminatorias regeneradas exitosamente");
    console.log(
      `📊 Resumen: ${matches.length} partidos creados para ${advancingPairs.length} parejas`
    );

    return {
      success: true,
      matchesCreated: matches.length,
      advancingPairs: advancingPairs.length,
      bracketSize: bracketInfo.bracketSize,
    };
  } catch (error) {
    console.error("❌ Error regenerando eliminatorias:", error);
    throw error;
  }
}

/**
 * Verifica si las eliminatorias necesitan ser regeneradas
 */
export async function checkIfEliminationsNeedRegeneration(
  categoryId: string
): Promise<{
  needsRegeneration: boolean;
  reason?: string;
  advancingPairs: number;
  currentMatches: number;
}> {
  try {
    const { advancingPairs } = await getAdvancingPairs(categoryId);

    // Aquí se podría agregar lógica para verificar si los partidos existentes
    // coinciden con el seeding correcto

    return {
      needsRegeneration: false,
      advancingPairs: advancingPairs.length,
      currentMatches: 0, // Se podría calcular
    };
  } catch (error) {
    console.error("Error checking elimination status:", error);
    return {
      needsRegeneration: true,
      reason: "Error al verificar estado",
      advancingPairs: 0,
      currentMatches: 0,
    };
  }
}
