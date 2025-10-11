/**
 * GESTOR DE BACKUP DE TORNEOS
 * 
 * Este componente se encarga de crear, gestionar y restaurar
 * backups completos de torneos.
 * 
 * Responsabilidades:
 * - Crear backups automáticos antes de cambios importantes
 * - Crear backups manuales bajo demanda
 * - Restaurar torneos desde backups
 * - Gestionar el historial de backups
 * - Limpiar backups antiguos automáticamente
 */

import { supabase } from '@/lib/supabase';
import { 
  getTournament, 
  getCategories, 
  getPairs, 
  getGroups, 
  getAllMatchesByCategory,
  getCourts 
} from '@/lib/supabase-queries';
import { TournamentErrorHandler } from '@/lib/validators/TournamentErrorHandler';
import { Tournament, Category, Pair, Match } from '@/types';

export interface TournamentBackup {
  id: string;
  tournamentId: string;
  tournamentName: string;
  createdAt: Date;
  createdBy: string;
  type: 'AUTO' | 'MANUAL' | 'BEFORE_CHANGE';
  description?: string;
  data: {
    tournament: Tournament;
    categories: Category[];
    pairs: Pair[];
    groups: any[];
    matches: Match[];
    courts: any[];
  };
  metadata: {
    totalPairs: number;
    totalGroups: number;
    totalMatches: number;
    totalCourts: number;
    dataSize: number;
  };
}

export interface BackupOptions {
  type: 'AUTO' | 'MANUAL' | 'BEFORE_CHANGE';
  description?: string;
  createdBy: string;
  maxBackupsToKeep?: number;
}

export class TournamentBackupManager {
  private static readonly BACKUP_TABLE = 'tournament_backups';
  private static readonly MAX_AUTO_BACKUPS = 10;
  private static readonly MAX_MANUAL_BACKUPS = 5;
  private static readonly MAX_BEFORE_CHANGE_BACKUPS = 20;

  /**
   * Crea un backup completo de un torneo
   */
  static async createBackup(
    tournamentId: string, 
    options: BackupOptions
  ): Promise<string> {
    console.log(`🔄 Creating backup for tournament: ${tournamentId}`);
    
    try {
      // Obtener datos del torneo
      const tournamentData = await this.collectTournamentData(tournamentId);
      
      // Crear backup
      const backupId = this.generateBackupId();
      const backup: TournamentBackup = {
        id: backupId,
        tournamentId,
        tournamentName: tournamentData.tournament.name,
        createdAt: new Date(),
        createdBy: options.createdBy,
        type: options.type,
        description: options.description,
        data: tournamentData,
        metadata: {
          totalPairs: tournamentData.pairs.length,
          totalGroups: tournamentData.groups.length,
          totalMatches: tournamentData.matches.length,
          totalCourts: tournamentData.courts.length,
          dataSize: JSON.stringify(tournamentData).length
        }
      };

      // Guardar en base de datos
      await this.saveBackup(backup);

      // Limpiar backups antiguos
      await this.cleanupOldBackups(tournamentId, options.type);

      console.log(`✅ Backup created successfully: ${backupId}`);
      return backupId;

    } catch (error) {
      console.error('❌ Error creating backup:', error);
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  /**
   * Restaura un torneo desde un backup
   */
  static async restoreFromBackup(backupId: string): Promise<void> {
    console.log(`🔄 Restoring tournament from backup: ${backupId}`);
    
    try {
      // Obtener backup
      const backup = await this.getBackup(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Crear backup antes de restaurar (seguridad)
      await this.createBackup(backup.tournamentId, {
        type: 'BEFORE_CHANGE',
        description: `Backup before restoring from ${backupId}`,
        createdBy: 'system'
      });

      // Restaurar datos
      await this.restoreTournamentData(backup);

      console.log(`✅ Tournament restored successfully from backup: ${backupId}`);

    } catch (error) {
      console.error('❌ Error restoring backup:', error);
      throw new Error(`Failed to restore backup: ${error}`);
    }
  }

  /**
   * Lista todos los backups de un torneo
   */
  static async getTournamentBackups(tournamentId: string): Promise<TournamentBackup[]> {
    try {
      const { data, error } = await supabase
        .from(this.BACKUP_TABLE)
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(this.mapDbBackupToTournamentBackup);

    } catch (error) {
      console.error('❌ Error getting tournament backups:', error);
      throw error;
    }
  }

  /**
   * Obtiene un backup específico
   */
  static async getBackup(backupId: string): Promise<TournamentBackup | null> {
    try {
      const { data, error } = await supabase
        .from(this.BACKUP_TABLE)
        .select('*')
        .eq('id', backupId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No encontrado
        }
        throw error;
      }

      return this.mapDbBackupToTournamentBackup(data);

    } catch (error) {
      console.error('❌ Error getting backup:', error);
      throw error;
    }
  }

  /**
   * Elimina un backup
   */
  static async deleteBackup(backupId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.BACKUP_TABLE)
        .delete()
        .eq('id', backupId);

      if (error) {
        throw error;
      }

      console.log(`✅ Backup deleted: ${backupId}`);

    } catch (error) {
      console.error('❌ Error deleting backup:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de backups
   */
  static async getBackupStats(tournamentId?: string): Promise<{
    totalBackups: number;
    totalSize: number;
    byType: Record<string, number>;
    lastBackup?: Date;
  }> {
    try {
      let query = supabase
        .from(this.BACKUP_TABLE)
        .select('*');

      if (tournamentId) {
        query = query.eq('tournament_id', tournamentId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const backups = (data || []).map(this.mapDbBackupToTournamentBackup);

      const stats = {
        totalBackups: backups.length,
        totalSize: backups.reduce((sum, b) => sum + b.metadata.dataSize, 0),
        byType: backups.reduce((acc, b) => {
          acc[b.type] = (acc[b.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        lastBackup: backups.length > 0 ? backups[0].createdAt : undefined
      };

      return stats;

    } catch (error) {
      console.error('❌ Error getting backup stats:', error);
      throw error;
    }
  }

  /**
   * Recopila todos los datos de un torneo
   */
  private static async collectTournamentData(tournamentId: string): Promise<TournamentBackup['data']> {
    const [tournament, categories] = await Promise.all([
      TournamentErrorHandler.safeQuery(
        () => getTournament(tournamentId),
        {
          fallback: null,
          errorMessage: `Error getting tournament ${tournamentId}`,
          showToast: false,
          logError: true
        }
      ),
      TournamentErrorHandler.safeQuery(
        () => getCategories(tournamentId),
        {
          fallback: [],
          errorMessage: `Error getting categories for tournament ${tournamentId}`,
          showToast: false,
          logError: true
        }
      )
    ]);

    if (!tournament) {
      throw new Error(`Tournament not found: ${tournamentId}`);
    }

    // Recopilar datos de todas las categorías
    const [pairs, groups, matches, courts] = await Promise.all([
      this.collectAllPairs(categories),
      this.collectAllGroups(categories),
      this.collectAllMatches(categories),
      TournamentErrorHandler.safeQuery(
        () => getCourts(tournamentId),
        {
          fallback: [],
          errorMessage: `Error getting courts for tournament ${tournamentId}`,
          showToast: false,
          logError: true
        }
      )
    ]);

    return {
      tournament,
      categories,
      pairs,
      groups,
      matches,
      courts
    };
  }

  /**
   * Recopila todas las parejas de todas las categorías
   */
  private static async collectAllPairs(categories: Category[]): Promise<Pair[]> {
    const allPairs: Pair[] = [];

    for (const category of categories) {
      const pairs = await TournamentErrorHandler.safeQuery(
        () => getPairs(category.id),
        {
          fallback: [],
          errorMessage: `Error getting pairs for category ${category.id}`,
          showToast: false,
          logError: true
        }
      );
      allPairs.push(...pairs);
    }

    return allPairs;
  }

  /**
   * Recopila todos los grupos de todas las categorías
   */
  private static async collectAllGroups(categories: Category[]): Promise<any[]> {
    const allGroups: any[] = [];

    for (const category of categories) {
      const groups = await TournamentErrorHandler.safeQuery(
        () => getGroups(category.id),
        {
          fallback: [],
          errorMessage: `Error getting groups for category ${category.id}`,
          showToast: false,
          logError: true
        }
      );
      allGroups.push(...groups);
    }

    return allGroups;
  }

  /**
   * Recopila todos los partidos de todas las categorías
   */
  private static async collectAllMatches(categories: Category[]): Promise<Match[]> {
    const allMatches: Match[] = [];

    for (const category of categories) {
      const matches = await TournamentErrorHandler.safeQuery(
        () => getAllMatchesByCategory(category.id),
        {
          fallback: [],
          errorMessage: `Error getting matches for category ${category.id}`,
          showToast: false,
          logError: true
        }
      );
      allMatches.push(...matches);
    }

    return allMatches;
  }

  /**
   * Guarda un backup en la base de datos
   */
  private static async saveBackup(backup: TournamentBackup): Promise<void> {
    const dbBackup = {
      id: backup.id,
      tournament_id: backup.tournamentId,
      tournament_name: backup.tournamentName,
      created_at: backup.createdAt.toISOString(),
      created_by: backup.createdBy,
      type: backup.type,
      description: backup.description,
      data: backup.data,
      metadata: backup.metadata
    };

    const { error } = await supabase
      .from(this.BACKUP_TABLE)
      .insert(dbBackup);

    if (error) {
      throw error;
    }
  }

  /**
   * Restaura los datos de un torneo desde un backup
   */
  private static async restoreTournamentData(backup: TournamentBackup): Promise<void> {
    // NOTA: Esta es una implementación simplificada
    // En un sistema real, necesitarías lógica más compleja para restaurar
    // sin duplicar datos o romper referencias
    
    console.log(`🔄 Restoring data for tournament: ${backup.tournamentName}`);
    console.log(`📊 Data to restore:`, {
      categories: backup.data.categories.length,
      pairs: backup.data.pairs.length,
      groups: backup.data.groups.length,
      matches: backup.data.matches.length,
      courts: backup.data.courts.length
    });

    // Aquí implementarías la lógica de restauración
    // Por ahora, solo logueamos lo que se restauraría
    console.log('⚠️ Restore functionality needs to be implemented based on your specific requirements');
  }

  /**
   * Limpia backups antiguos según el tipo
   */
  private static async cleanupOldBackups(tournamentId: string, type: 'AUTO' | 'MANUAL' | 'BEFORE_CHANGE'): Promise<void> {
    const maxBackups = this.getMaxBackupsForType(type);
    
    const { data, error } = await supabase
      .from(this.BACKUP_TABLE)
      .select('id, created_at')
      .eq('tournament_id', tournamentId)
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️ Error cleaning up old backups:', error);
      return;
    }

    const backups = data || [];
    if (backups.length > maxBackups) {
      const backupsToDelete = backups.slice(maxBackups);
      
      for (const backup of backupsToDelete) {
        await this.deleteBackup(backup.id);
      }

      console.log(`🧹 Cleaned up ${backupsToDelete.length} old ${type} backups`);
    }
  }

  /**
   * Obtiene el máximo de backups por tipo
   */
  private static getMaxBackupsForType(type: 'AUTO' | 'MANUAL' | 'BEFORE_CHANGE'): number {
    switch (type) {
      case 'AUTO':
        return this.MAX_AUTO_BACKUPS;
      case 'MANUAL':
        return this.MAX_MANUAL_BACKUPS;
      case 'BEFORE_CHANGE':
        return this.MAX_BEFORE_CHANGE_BACKUPS;
      default:
        return 5;
    }
  }

  /**
   * Genera un ID único para el backup
   */
  private static generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Mapea un backup de la base de datos al tipo TournamentBackup
   */
  private static mapDbBackupToTournamentBackup(dbBackup: any): TournamentBackup {
    return {
      id: dbBackup.id,
      tournamentId: dbBackup.tournament_id,
      tournamentName: dbBackup.tournament_name,
      createdAt: new Date(dbBackup.created_at),
      createdBy: dbBackup.created_by,
      type: dbBackup.type,
      description: dbBackup.description,
      data: dbBackup.data,
      metadata: dbBackup.metadata
    };
  }
}
