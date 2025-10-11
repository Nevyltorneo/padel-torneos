/**
 * VALIDADOR DE INTEGRIDAD DE DATOS
 * 
 * Este componente se encarga de validar la integridad y consistencia
 * de los datos del torneo en la base de datos.
 * 
 * Responsabilidades:
 * - Verificar que las relaciones entre entidades sean correctas
 * - Detectar datos corruptos o inconsistentes
 * - Validar que los grupos contengan parejas válidas
 * - Verificar que los partidos tengan datos coherentes
 * - Identificar problemas de referencias rotas
 */

import { 
  getPairs, 
  getGroups, 
  getAllMatchesByCategory, 
  getCategories,
  getCourts 
} from "@/lib/supabase-queries";
import { ValidationResult } from "./TournamentConfigValidator";

export interface DataIntegrityIssue {
  type: 'MISSING_REFERENCE' | 'DUPLICATE_DATA' | 'INVALID_DATA' | 'INCONSISTENT_DATA';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details: any;
  entityId?: string;
  entityType?: string;
}

export interface DataIntegrityReport {
  isValid: boolean;
  issues: DataIntegrityIssue[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
}

export class DataIntegrityValidator {
  /**
   * Valida la integridad completa de una categoría
   */
  static async validateCategory(categoryId: string): Promise<DataIntegrityReport> {
    console.log(`🔍 Validando integridad de datos para categoría: ${categoryId}`);
    
    const issues: DataIntegrityIssue[] = [];

    try {
      // Validar parejas
      const pairIssues = await this.validatePairs(categoryId);
      issues.push(...pairIssues);

      // Validar grupos
      const groupIssues = await this.validateGroups(categoryId);
      issues.push(...groupIssues);

      // Validar partidos
      const matchIssues = await this.validateMatches(categoryId);
      issues.push(...matchIssues);

      // Validar relaciones entre entidades
      const relationshipIssues = await this.validateRelationships(categoryId);
      issues.push(...relationshipIssues);

    } catch (error) {
      console.error("❌ Error durante validación de integridad:", error);
      issues.push({
        type: 'INVALID_DATA',
        severity: 'CRITICAL',
        message: 'Error durante la validación de integridad',
        details: error,
        entityType: 'category'
      });
    }

    return this.generateReport(issues);
  }

  /**
   * Valida la integridad completa de un torneo
   */
  static async validateTournament(tournamentId: string): Promise<DataIntegrityReport> {
    console.log(`🔍 Validando integridad de datos para torneo: ${tournamentId}`);
    
    const issues: DataIntegrityIssue[] = [];

    try {
      // Obtener categorías del torneo
      const categories = await getCategories(tournamentId);
      
      if (categories.length === 0) {
        issues.push({
          type: 'INVALID_DATA',
          severity: 'HIGH',
          message: 'El torneo no tiene categorías',
          details: { tournamentId },
          entityType: 'tournament'
        });
      }

      // Validar cada categoría
      for (const category of categories) {
        const categoryReport = await this.validateCategory(category.id);
        issues.push(...categoryReport.issues);
      }

      // Validar canchas del torneo
      const courtIssues = await this.validateCourts(tournamentId);
      issues.push(...courtIssues);

    } catch (error) {
      console.error("❌ Error durante validación de torneo:", error);
      issues.push({
        type: 'INVALID_DATA',
        severity: 'CRITICAL',
        message: 'Error durante la validación del torneo',
        details: error,
        entityType: 'tournament'
      });
    }

    return this.generateReport(issues);
  }

  /**
   * Valida las parejas de una categoría
   */
  private static async validatePairs(categoryId: string): Promise<DataIntegrityIssue[]> {
    const issues: DataIntegrityIssue[] = [];

    try {
      const pairs = await getPairs(categoryId);
      
      // Verificar que todas las parejas tengan datos válidos
      for (const pair of pairs) {
        // Validar jugador 1
        if (!pair.player1 || !pair.player1.name || pair.player1.name.trim().length === 0) {
          issues.push({
            type: 'INVALID_DATA',
            severity: 'HIGH',
            message: 'Pareja sin jugador 1 válido',
            details: { pairId: pair.id, player: 'player1' },
            entityId: pair.id,
            entityType: 'pair'
          });
        }

        // Validar jugador 2
        if (!pair.player2 || !pair.player2.name || pair.player2.name.trim().length === 0) {
          issues.push({
            type: 'INVALID_DATA',
            severity: 'HIGH',
            message: 'Pareja sin jugador 2 válido',
            details: { pairId: pair.id, player: 'player2' },
            entityId: pair.id,
            entityType: 'pair'
          });
        }

        // Verificar que los nombres no sean iguales
        if (pair.player1?.name === pair.player2?.name) {
          issues.push({
            type: 'INVALID_DATA',
            severity: 'MEDIUM',
            message: 'Una pareja no puede tener el mismo jugador dos veces',
            details: { pairId: pair.id, playerName: pair.player1?.name },
            entityId: pair.id,
            entityType: 'pair'
          });
        }

        // Validar seed si existe
        if (pair.seed !== undefined && pair.seed !== null) {
          if (pair.seed < 1) {
            issues.push({
              type: 'INVALID_DATA',
              severity: 'MEDIUM',
              message: 'Seed inválido (debe ser mayor a 0)',
              details: { pairId: pair.id, seed: pair.seed },
              entityId: pair.id,
              entityType: 'pair'
            });
          }
        }
      }

      // Verificar seeds duplicados
      const seedsWithPairs = pairs
        .filter(p => p.seed !== undefined && p.seed !== null)
        .map(p => ({ seed: p.seed!, pairId: p.id }));
      
      const seedCounts = new Map<number, string[]>();
      seedsWithPairs.forEach(({ seed, pairId }) => {
        if (!seedCounts.has(seed)) {
          seedCounts.set(seed, []);
        }
        seedCounts.get(seed)!.push(pairId);
      });

      for (const [seed, pairIds] of seedCounts) {
        if (pairIds.length > 1) {
          issues.push({
            type: 'DUPLICATE_DATA',
            severity: 'HIGH',
            message: `Seed duplicado: ${seed}`,
            details: { seed, pairIds },
            entityType: 'pair'
          });
        }
      }

    } catch (error) {
      console.error("❌ Error validando parejas:", error);
      issues.push({
        type: 'INVALID_DATA',
        severity: 'CRITICAL',
        message: 'Error al cargar parejas',
        details: error,
        entityType: 'pair'
      });
    }

    return issues;
  }

  /**
   * Valida los grupos de una categoría
   */
  private static async validateGroups(categoryId: string): Promise<DataIntegrityIssue[]> {
    const issues: DataIntegrityIssue[] = [];

    try {
      const groups = await getGroups(categoryId);
      
      for (const group of groups) {
        // Validar nombre del grupo
        if (!group.name || group.name.trim().length === 0) {
          issues.push({
            type: 'INVALID_DATA',
            severity: 'HIGH',
            message: 'Grupo sin nombre',
            details: { groupId: group.id },
            entityId: group.id,
            entityType: 'group'
          });
        }

        // Validar pairIds
        if (!group.pairIds || !Array.isArray(group.pairIds)) {
          issues.push({
            type: 'INVALID_DATA',
            severity: 'HIGH',
            message: 'Grupo sin lista de parejas válida',
            details: { groupId: group.id, pairIds: group.pairIds },
            entityId: group.id,
            entityType: 'group'
          });
          continue;
        }

        // Verificar que el grupo tenga parejas
        if (group.pairIds.length === 0) {
          issues.push({
            type: 'INVALID_DATA',
            severity: 'MEDIUM',
            message: 'Grupo vacío (sin parejas)',
            details: { groupId: group.id, groupName: group.name },
            entityId: group.id,
            entityType: 'group'
          });
        }

        // Verificar que todas las parejas del grupo existan
        const pairs = await getPairs(categoryId);
        const pairIds = pairs.map(p => p.id);
        
        for (const pairId of group.pairIds) {
          if (!pairIds.includes(pairId)) {
            issues.push({
              type: 'MISSING_REFERENCE',
              severity: 'HIGH',
              message: 'Grupo contiene pareja que no existe',
              details: { groupId: group.id, pairId, groupName: group.name },
              entityId: group.id,
              entityType: 'group'
            });
          }
        }

        // Verificar parejas duplicadas en el mismo grupo
        const uniquePairIds = [...new Set(group.pairIds)];
        if (uniquePairIds.length !== group.pairIds.length) {
          const duplicates = group.pairIds.filter((id, index) => 
            group.pairIds.indexOf(id) !== index
          );
          issues.push({
            type: 'DUPLICATE_DATA',
            severity: 'HIGH',
            message: 'Grupo contiene parejas duplicadas',
            details: { groupId: group.id, duplicates, groupName: group.name },
            entityId: group.id,
            entityType: 'group'
          });
        }
      }

      // Verificar que no haya parejas duplicadas entre grupos
      const allGroupPairIds = groups.flatMap(g => g.pairIds || []);
      const uniqueGroupPairIds = [...new Set(allGroupPairIds)];
      
      if (allGroupPairIds.length !== uniqueGroupPairIds.length) {
        const duplicates = allGroupPairIds.filter((id, index) => 
          allGroupPairIds.indexOf(id) !== index
        );
        issues.push({
          type: 'DUPLICATE_DATA',
          severity: 'CRITICAL',
          message: 'Parejas asignadas a múltiples grupos',
          details: { duplicates },
          entityType: 'group'
        });
      }

    } catch (error) {
      console.error("❌ Error validando grupos:", error);
      issues.push({
        type: 'INVALID_DATA',
        severity: 'CRITICAL',
        message: 'Error al cargar grupos',
        details: error,
        entityType: 'group'
      });
    }

    return issues;
  }

  /**
   * Valida los partidos de una categoría
   */
  private static async validateMatches(categoryId: string): Promise<DataIntegrityIssue[]> {
    const issues: DataIntegrityIssue[] = [];

    try {
      const matches = await getAllMatchesByCategory(categoryId);
      const pairs = await getPairs(categoryId);
      const pairIds = pairs.map(p => p.id);
      
      for (const match of matches) {
        // Validar que las parejas del partido existan
        if (!pairIds.includes(match.pairAId)) {
          issues.push({
            type: 'MISSING_REFERENCE',
            severity: 'HIGH',
            message: 'Partido con pareja A inexistente',
            details: { matchId: match.id, pairAId: match.pairAId },
            entityId: match.id,
            entityType: 'match'
          });
        }

        if (!pairIds.includes(match.pairBId)) {
          issues.push({
            type: 'MISSING_REFERENCE',
            severity: 'HIGH',
            message: 'Partido con pareja B inexistente',
            details: { matchId: match.id, pairBId: match.pairBId },
            entityId: match.id,
            entityType: 'match'
          });
        }

        // Validar que no sea un partido de una pareja contra sí misma
        if (match.pairAId === match.pairBId) {
          issues.push({
            type: 'INVALID_DATA',
            severity: 'HIGH',
            message: 'Partido de una pareja contra sí misma',
            details: { matchId: match.id, pairId: match.pairAId },
            entityId: match.id,
            entityType: 'match'
          });
        }

        // Validar estado del partido
        const validStatuses = ['pending', 'scheduled', 'playing', 'finished'];
        if (!validStatuses.includes(match.status)) {
          issues.push({
            type: 'INVALID_DATA',
            severity: 'MEDIUM',
            message: 'Estado de partido inválido',
            details: { matchId: match.id, status: match.status },
            entityId: match.id,
            entityType: 'match'
          });
        }

        // Validar puntuación si el partido está terminado
        if (match.status === 'finished') {
          if (!match.score || (!match.score.pairA && !match.score.pairB)) {
            issues.push({
              type: 'INVALID_DATA',
              severity: 'HIGH',
              message: 'Partido terminado sin puntuación',
              details: { matchId: match.id },
              entityId: match.id,
              entityType: 'match'
            });
          }

          // Validar que el ganador sea una de las parejas del partido
          if (match.winnerPairId && 
              match.winnerPairId !== match.pairAId && 
              match.winnerPairId !== match.pairBId) {
            issues.push({
              type: 'INVALID_DATA',
              severity: 'HIGH',
              message: 'Ganador del partido no es una de las parejas participantes',
              details: { 
                matchId: match.id, 
                winnerId: match.winnerPairId,
                pairAId: match.pairAId,
                pairBId: match.pairBId
              },
              entityId: match.id,
              entityType: 'match'
            });
          }
        }

        // Validar horarios
        if (match.day && match.startTime) {
          const matchDate = new Date(`${match.day}T${match.startTime}`);
          if (isNaN(matchDate.getTime())) {
            issues.push({
              type: 'INVALID_DATA',
              severity: 'MEDIUM',
              message: 'Fecha y hora de partido inválidas',
              details: { matchId: match.id, day: match.day, startTime: match.startTime },
              entityId: match.id,
              entityType: 'match'
            });
          }
        }
      }

    } catch (error) {
      console.error("❌ Error validando partidos:", error);
      issues.push({
        type: 'INVALID_DATA',
        severity: 'CRITICAL',
        message: 'Error al cargar partidos',
        details: error,
        entityType: 'match'
      });
    }

    return issues;
  }

  /**
   * Valida las relaciones entre entidades
   */
  private static async validateRelationships(categoryId: string): Promise<DataIntegrityIssue[]> {
    const issues: DataIntegrityIssue[] = [];

    try {
      const [pairs, groups, matches] = await Promise.all([
        getPairs(categoryId),
        getGroups(categoryId),
        getAllMatchesByCategory(categoryId)
      ]);

      const pairIds = pairs.map(p => p.id);

      // Verificar que todas las parejas estén en algún grupo
      for (const pair of pairs) {
        const isInAnyGroup = groups.some(group => 
          group.pairIds && group.pairIds.includes(pair.id)
        );

        if (!isInAnyGroup) {
          issues.push({
            type: 'INCONSISTENT_DATA',
            severity: 'HIGH',
            message: 'Pareja no asignada a ningún grupo',
            details: { pairId: pair.id, pairName: `${pair.player1?.name} / ${pair.player2?.name}` },
            entityId: pair.id,
            entityType: 'pair'
          });
        }
      }

      // Verificar que los partidos de grupos tengan groupId válido
      const groupMatches = matches.filter(m => m.stage === 'groups');
      const groupIds = groups.map(g => g.id);

      for (const match of groupMatches) {
        if (match.groupId && !groupIds.includes(match.groupId)) {
          issues.push({
            type: 'MISSING_REFERENCE',
            severity: 'HIGH',
            message: 'Partido de grupo con groupId inexistente',
            details: { matchId: match.id, groupId: match.groupId },
            entityId: match.id,
            entityType: 'match'
          });
        }

        // Verificar que las parejas del partido estén en el grupo correcto
        if (match.groupId) {
          const group = groups.find(g => g.id === match.groupId);
          if (group && group.pairIds) {
            if (!group.pairIds.includes(match.pairAId) || !group.pairIds.includes(match.pairBId)) {
              issues.push({
                type: 'INCONSISTENT_DATA',
                severity: 'HIGH',
                message: 'Partido con parejas que no pertenecen al grupo',
                details: { 
                  matchId: match.id, 
                  groupId: match.groupId,
                  pairAId: match.pairAId,
                  pairBId: match.pairBId,
                  groupPairs: group.pairIds
                },
                entityId: match.id,
                entityType: 'match'
              });
            }
          }
        }
      }

    } catch (error) {
      console.error("❌ Error validando relaciones:", error);
      issues.push({
        type: 'INVALID_DATA',
        severity: 'CRITICAL',
        message: 'Error al validar relaciones entre entidades',
        details: error,
        entityType: 'relationship'
      });
    }

    return issues;
  }

  /**
   * Valida las canchas de un torneo
   */
  private static async validateCourts(tournamentId: string): Promise<DataIntegrityIssue[]> {
    const issues: DataIntegrityIssue[] = [];

    try {
      const courts = await getCourts(tournamentId);
      
      const uniqueNames = new Set<string>();
      const uniqueIds = new Set<string>();

      for (const court of courts) {
        // Validar nombre
        if (!court.name || court.name.trim().length === 0) {
          issues.push({
            type: 'INVALID_DATA',
            severity: 'HIGH',
            message: 'Cancha sin nombre',
            details: { courtId: court.id },
            entityId: court.id,
            entityType: 'court'
          });
        } else {
          if (uniqueNames.has(court.name)) {
            issues.push({
              type: 'DUPLICATE_DATA',
              severity: 'HIGH',
              message: 'Nombre de cancha duplicado',
              details: { courtId: court.id, name: court.name },
              entityId: court.id,
              entityType: 'court'
            });
          } else {
            uniqueNames.add(court.name);
          }
        }

        // Validar ID
        if (!court.id || court.id.trim().length === 0) {
          issues.push({
            type: 'INVALID_DATA',
            severity: 'CRITICAL',
            message: 'Cancha sin ID',
            details: { court },
            entityType: 'court'
          });
        } else {
          if (uniqueIds.has(court.id)) {
            issues.push({
              type: 'DUPLICATE_DATA',
              severity: 'CRITICAL',
              message: 'ID de cancha duplicado',
              details: { courtId: court.id },
              entityId: court.id,
              entityType: 'court'
            });
          } else {
            uniqueIds.add(court.id);
          }
        }
      }

    } catch (error) {
      console.error("❌ Error validando canchas:", error);
      issues.push({
        type: 'INVALID_DATA',
        severity: 'CRITICAL',
        message: 'Error al cargar canchas',
        details: error,
        entityType: 'court'
      });
    }

    return issues;
  }

  /**
   * Genera un reporte de integridad de datos
   */
  private static generateReport(issues: DataIntegrityIssue[]): DataIntegrityReport {
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length;
    const highIssues = issues.filter(i => i.severity === 'HIGH').length;
    const mediumIssues = issues.filter(i => i.severity === 'MEDIUM').length;
    const lowIssues = issues.filter(i => i.severity === 'LOW').length;

    return {
      isValid: criticalIssues === 0 && highIssues === 0,
      issues,
      summary: {
        totalIssues: issues.length,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues
      }
    };
  }

  /**
   * Obtiene un resumen legible de los problemas de integridad
   */
  static getReadableSummary(report: DataIntegrityReport): string {
    if (report.isValid) {
      return "✅ Todos los datos están correctos";
    }

    const { summary } = report;
    let message = "❌ Se encontraron problemas de integridad:\n";

    if (summary.criticalIssues > 0) {
      message += `🚨 ${summary.criticalIssues} problemas críticos\n`;
    }
    if (summary.highIssues > 0) {
      message += `🔴 ${summary.highIssues} problemas importantes\n`;
    }
    if (summary.mediumIssues > 0) {
      message += `🟡 ${summary.mediumIssues} problemas moderados\n`;
    }
    if (summary.lowIssues > 0) {
      message += `🟢 ${summary.lowIssues} problemas menores\n`;
    }

    return message.trim();
  }
}
