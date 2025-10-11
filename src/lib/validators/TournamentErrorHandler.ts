/**
 * MANEJADOR DE ERRORES DE TORNEOS
 * 
 * Este componente se encarga de manejar errores de forma consistente
 * en todo el sistema de torneos.
 * 
 * Responsabilidades:
 * - Manejo unificado de errores de base de datos
 * - Logging consistente de errores
 * - Recuperación automática cuando es posible
 * - Proporcionar fallbacks seguros
 * - Notificaciones de errores al usuario
 */

import { toast } from "sonner";

export interface TournamentError {
  code: string;
  message: string;
  context?: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recoverable: boolean;
  timestamp: Date;
}

export interface SafeQueryOptions<T> {
  fallback?: T;
  errorMessage: string;
  showToast?: boolean;
  logError?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export class TournamentErrorHandler {
  private static errorLog: TournamentError[] = [];
  private static maxLogSize = 100;

  /**
   * Ejecuta una consulta de forma segura con manejo de errores
   */
  static async safeQuery<T>(
    queryFn: () => Promise<T>,
    options: SafeQueryOptions<T>
  ): Promise<T> {
    const {
      fallback,
      errorMessage,
      showToast = true,
      logError = true,
      retryAttempts = 0,
      retryDelay = 1000
    } = options;

    let lastError: any = null;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const result = await queryFn();
        
        // Si es un reintento exitoso, logearlo
        if (attempt > 0 && logError) {
          console.log(`✅ Retry successful after ${attempt} attempts for: ${errorMessage}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Logear el error
        if (logError) {
          console.error(`❌ Error in safeQuery (attempt ${attempt + 1}):`, error);
        }

        // Si no es el último intento, esperar antes de reintentar
        if (attempt < retryAttempts) {
          await this.delay(retryDelay * (attempt + 1)); // Backoff exponencial
          continue;
        }

        // Error final - crear y logear el error del torneo
        const tournamentError: TournamentError = {
          code: this.getErrorCode(error),
          message: errorMessage,
          context: {
            originalError: error,
            attempt: attempt + 1,
            retryAttempts,
            timestamp: new Date().toISOString()
          },
          severity: this.getErrorSeverity(error),
          recoverable: fallback !== undefined,
          timestamp: new Date()
        };

        this.logError(tournamentError);

        // Mostrar toast si está habilitado
        if (showToast) {
          this.showErrorToast(tournamentError);
        }

        // Retornar fallback si está disponible
        if (fallback !== undefined) {
          if (logError) {
            console.warn(`⚠️ Using fallback for: ${errorMessage}`, fallback);
          }
          return fallback;
        }

        // Si no hay fallback, lanzar el error
        throw new TournamentError(
          tournamentError.message,
          tournamentError.code,
          tournamentError.context
        );
      }
    }

    // Esto nunca debería ejecutarse, pero por seguridad
    throw new TournamentError(
      errorMessage,
      'UNKNOWN_ERROR',
      { originalError: lastError }
    );
  }

  /**
   * Ejecuta múltiples consultas en paralelo de forma segura
   */
  static async safeParallelQuery<T extends Record<string, any>>(
    queries: { [K in keyof T]: () => Promise<T[K]> },
    options: {
      errorMessage: string;
      fallbacks?: Partial<T>;
      showToast?: boolean;
      logError?: boolean;
    }
  ): Promise<T> {
    const { errorMessage, fallbacks = {}, showToast = true, logError = true } = options;
    
    const results: Partial<T> = {};
    const errors: Record<string, any> = {};

    // Ejecutar todas las consultas en paralelo
    const promises = Object.entries(queries).map(async ([key, queryFn]) => {
      try {
        const result = await queryFn();
        results[key as keyof T] = result;
      } catch (error) {
        errors[key] = error;
        
        // Usar fallback si está disponible
        if (fallbacks[key as keyof T] !== undefined) {
          results[key as keyof T] = fallbacks[key as keyof T]!;
          if (logError) {
            console.warn(`⚠️ Using fallback for ${key}:`, error);
          }
        }
      }
    });

    await Promise.all(promises);

    // Verificar si hay errores críticos
    const criticalErrors = Object.values(errors).filter(error => 
      this.getErrorSeverity(error) === 'CRITICAL'
    );

    if (criticalErrors.length > 0 && showToast) {
      const tournamentError: TournamentError = {
        code: 'PARALLEL_QUERY_FAILED',
        message: errorMessage,
        context: { errors, results },
        severity: 'HIGH',
        recoverable: Object.keys(fallbacks).length > 0,
        timestamp: new Date()
      };

      this.logError(tournamentError);
      this.showErrorToast(tournamentError);
    }

    return results as T;
  }

  /**
   * Valida y ejecuta una operación de escritura de forma segura
   */
  static async safeWrite<T>(
    writeFn: () => Promise<T>,
    options: {
      errorMessage: string;
      showToast?: boolean;
      logError?: boolean;
      validateBefore?: () => boolean;
    }
  ): Promise<T> {
    const { errorMessage, showToast = true, logError = true, validateBefore } = options;

    // Validar antes de escribir si se proporciona validación
    if (validateBefore && !validateBefore()) {
      const validationError = new TournamentError(
        'VALIDATION_FAILED',
        'Operación no válida',
        { validationMessage: errorMessage },
        'HIGH',
        false,
        new Date()
      );

      this.logError(validationError);
      if (showToast) {
        this.showErrorToast(validationError);
      }
      throw validationError;
    }

    try {
      const result = await writeFn();
      
      if (logError) {
        console.log(`✅ Write operation successful: ${errorMessage}`);
      }
      
      return result;
    } catch (error) {
      const tournamentError: TournamentError = {
        code: this.getErrorCode(error),
        message: errorMessage,
        context: {
          originalError: error,
          operation: 'write',
          timestamp: new Date().toISOString()
        },
        severity: this.getErrorSeverity(error),
        recoverable: false,
        timestamp: new Date()
      };

      this.logError(tournamentError);
      
      if (showToast) {
        this.showErrorToast(tournamentError);
      }

      throw new TournamentError(
        tournamentError.message,
        tournamentError.code,
        tournamentError.context
      );
    }
  }

  /**
   * Obtiene el código de error basado en el tipo de error
   */
  private static getErrorCode(error: any): string {
    if (error?.code) {
      return error.code;
    }

    if (error?.name) {
      switch (error.name) {
        case 'PostgrestError':
          return 'DATABASE_ERROR';
        case 'AuthError':
          return 'AUTH_ERROR';
        case 'NetworkError':
          return 'NETWORK_ERROR';
        case 'ValidationError':
          return 'VALIDATION_ERROR';
        default:
          return 'UNKNOWN_ERROR';
      }
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Determina la severidad del error
   */
  private static getErrorSeverity(error: any): TournamentError['severity'] {
    // Errores de autenticación son críticos
    if (error?.message?.includes('auth') || error?.code?.includes('AUTH')) {
      return 'CRITICAL';
    }

    // Errores de red pueden ser altos o críticos
    if (error?.message?.includes('network') || error?.code?.includes('NETWORK')) {
      return 'HIGH';
    }

    // Errores de validación son medios
    if (error?.message?.includes('validation') || error?.code?.includes('VALIDATION')) {
      return 'MEDIUM';
    }

    // Errores de base de datos
    if (error?.code?.includes('PGRST') || error?.message?.includes('database')) {
      return 'HIGH';
    }

    // Por defecto, medio
    return 'MEDIUM';
  }

  /**
   * Registra un error en el log interno
   */
  private static logError(error: TournamentError): void {
    this.errorLog.push(error);

    // Mantener el log dentro del tamaño límite
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Log detallado en consola
    console.group(`🚨 Tournament Error [${error.severity}]`);
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Context:', error.context);
    console.error('Timestamp:', error.timestamp);
    console.error('Recoverable:', error.recoverable);
    console.groupEnd();
  }

  /**
   * Muestra un toast de error al usuario
   */
  private static showErrorToast(error: TournamentError): void {
    const toastMessage = this.getUserFriendlyMessage(error);
    
    switch (error.severity) {
      case 'CRITICAL':
        toast.error(toastMessage, {
          duration: 10000,
          description: 'Error crítico del sistema'
        });
        break;
      case 'HIGH':
        toast.error(toastMessage, {
          duration: 7000,
          description: 'Error importante'
        });
        break;
      case 'MEDIUM':
        toast.warning(toastMessage, {
          duration: 5000
        });
        break;
      case 'LOW':
        toast.info(toastMessage, {
          duration: 3000
        });
        break;
    }
  }

  /**
   * Convierte el error técnico en un mensaje amigable para el usuario
   */
  private static getUserFriendlyMessage(error: TournamentError): string {
    switch (error.code) {
      case 'DATABASE_ERROR':
        return 'Error al acceder a los datos. Por favor, intenta nuevamente.';
      case 'AUTH_ERROR':
        return 'Error de autenticación. Por favor, inicia sesión nuevamente.';
      case 'NETWORK_ERROR':
        return 'Error de conexión. Verifica tu internet e intenta nuevamente.';
      case 'VALIDATION_ERROR':
        return 'Los datos proporcionados no son válidos.';
      case 'PARALLEL_QUERY_FAILED':
        return 'Algunos datos no pudieron cargarse correctamente.';
      default:
        return error.message || 'Ha ocurrido un error inesperado.';
    }
  }

  /**
   * Utilidad para crear un delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtiene el historial de errores
   */
  static getErrorHistory(): TournamentError[] {
    return [...this.errorLog];
  }

  /**
   * Limpia el historial de errores
   */
  static clearErrorHistory(): void {
    this.errorLog = [];
    console.log('🧹 Error history cleared');
  }

  /**
   * Obtiene estadísticas de errores
   */
  static getErrorStats(): {
    total: number;
    bySeverity: Record<string, number>;
    byCode: Record<string, number>;
    last24Hours: number;
  } {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const last24HoursErrors = this.errorLog.filter(
      error => error.timestamp > last24Hours
    );

    const bySeverity = this.errorLog.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCode = this.errorLog.reduce((acc, error) => {
      acc[error.code] = (acc[error.code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.errorLog.length,
      bySeverity,
      byCode,
      last24Hours: last24HoursErrors.length
    };
  }
}

/**
 * Error personalizado para torneos
 */
export class TournamentError extends Error {
  public readonly code: string;
  public readonly context: any;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    context?: any
  ) {
    super(message);
    this.name = 'TournamentError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();

    // Mantener el stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TournamentError);
    }
  }

  /**
   * Convierte el error en un objeto serializable
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

/**
 * Wrapper para funciones que manejan errores de forma automática
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    errorMessage: string;
    fallback?: R;
    showToast?: boolean;
    logError?: boolean;
  }
) {
  return async (...args: T): Promise<R> => {
    return TournamentErrorHandler.safeQuery(
      () => fn(...args),
      options
    );
  };
}
