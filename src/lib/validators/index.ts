/**
 * ÍNDICE DE VALIDADORES
 * 
 * Este archivo exporta todos los validadores del sistema de torneos
 * para facilitar su importación y uso.
 */

// Exportar validadores principales
export { TournamentConfigValidator, type ValidationResult } from './TournamentConfigValidator';
export { DataIntegrityValidator, type DataIntegrityReport, type DataIntegrityIssue } from './DataIntegrityValidator';
export { 
  TournamentErrorHandler, 
  TournamentError,
  withErrorHandling,
  type TournamentError as TournamentErrorType,
  type SafeQueryOptions
} from './TournamentErrorHandler';
