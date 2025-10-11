/**
 * VALIDADOR DE CONFIGURACIÓN DE TORNEOS
 * 
 * Este componente se encarga de validar que las configuraciones de torneos
 * sean válidas y consistentes antes de guardarlas en la base de datos.
 * 
 * Responsabilidades:
 * - Validar configuración básica de torneos
 * - Verificar consistencia entre parámetros
 * - Prevenir configuraciones imposibles
 * - Proporcionar mensajes de error claros
 */

import { TournamentConfig } from "@/types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export class TournamentConfigValidator {
  /**
   * Valida una configuración completa de torneo
   */
  static validate(config: TournamentConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar estructura básica
    this.validateBasicStructure(config, errors);
    
    // Validar configuración de grupos
    this.validateGroupStage(config.groupStage, errors, warnings);
    
    // Validar configuración de eliminatorias
    this.validateKnockout(config.knockout, errors, warnings);
    
    // Validar reglas del juego
    this.validateGameRules(config.rules, errors, warnings);
    
    // Validar días y horarios
    this.validateDaysAndSchedule(config.days, config.slotMinutes, errors, warnings);
    
    // Validar canchas
    this.validateCourts(config.courts, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Valida la estructura básica de la configuración
   */
  private static validateBasicStructure(config: TournamentConfig, errors: string[]): void {
    if (!config) {
      errors.push("La configuración no puede estar vacía");
      return;
    }

    if (!config.name || config.name.trim().length === 0) {
      errors.push("El nombre del torneo es obligatorio");
    }

    if (config.name && config.name.length > 100) {
      errors.push("El nombre del torneo no puede exceder 100 caracteres");
    }
  }

  /**
   * Valida la configuración de la fase de grupos
   */
  private static validateGroupStage(
    groupStage: TournamentConfig['groupStage'], 
    errors: string[], 
    warnings: string[]
  ): void {
    if (!groupStage) {
      errors.push("La configuración de grupos es obligatoria");
      return;
    }

    // Validar número de parejas por grupo
    if (groupStage.pairsPerGroup < 2) {
      errors.push("El número de parejas por grupo debe ser al menos 2");
    }

    if (groupStage.pairsPerGroup > 12) {
      errors.push("El número de parejas por grupo no puede exceder 12");
    }

    // Validar configuración round robin
    if (groupStage.roundRobin === undefined || groupStage.roundRobin === null) {
      errors.push("La configuración de round robin es obligatoria");
    }

    // Advertencias para configuraciones subóptimas
    if (groupStage.pairsPerGroup < 3) {
      warnings.push("Grupos con menos de 3 parejas pueden generar pocos partidos");
    }

    if (groupStage.pairsPerGroup > 8) {
      warnings.push("Grupos con más de 8 parejas pueden generar muchos partidos");
    }
  }

  /**
   * Valida la configuración de eliminatorias
   */
  private static validateKnockout(
    knockout: TournamentConfig['knockout'], 
    errors: string[], 
    warnings: string[]
  ): void {
    if (!knockout) {
      errors.push("La configuración de eliminatorias es obligatoria");
      return;
    }

    // Validar configuración de tercer lugar
    if (knockout.thirdPlace === undefined || knockout.thirdPlace === null) {
      errors.push("La configuración de tercer lugar es obligatoria");
    }

    // Validar tamaño de bracket si está especificado
    if (knockout.bracketSize !== undefined) {
      if (knockout.bracketSize < 2) {
        errors.push("El tamaño del bracket debe ser al menos 2");
      }

      if (knockout.bracketSize > 64) {
        errors.push("El tamaño del bracket no puede exceder 64");
      }

      // Verificar que sea una potencia de 2
      if (!this.isPowerOfTwo(knockout.bracketSize)) {
        errors.push("El tamaño del bracket debe ser una potencia de 2 (2, 4, 8, 16, 32, 64)");
      }
    }

    // Advertencias
    if (knockout.bracketSize && knockout.bracketSize > 32) {
      warnings.push("Brackets muy grandes pueden generar torneos muy largos");
    }
  }

  /**
   * Valida las reglas del juego
   */
  private static validateGameRules(
    rules: TournamentConfig['rules'], 
    errors: string[], 
    warnings: string[]
  ): void {
    if (!rules) {
      errors.push("Las reglas del juego son obligatorias");
      return;
    }

    // Validar best of
    if (rules.bestOf < 1 || rules.bestOf > 5) {
      errors.push("El formato 'al mejor de' debe estar entre 1 y 5");
    }

    // Validar sets to
    if (rules.setsTo < 1 || rules.setsTo > 15) {
      errors.push("Los sets deben ser hasta un número entre 1 y 15");
    }

    // Validar tiebreak
    if (rules.tieBreak === undefined || rules.tieBreak === null) {
      errors.push("La configuración de tiebreak es obligatoria");
    }

    // Validar consistencia
    if (rules.bestOf === 1 && rules.setsTo !== 1) {
      errors.push("Si es al mejor de 1, los sets deben ser hasta 1");
    }

    if (rules.bestOf === 3 && rules.setsTo < 2) {
      errors.push("Para al mejor de 3, los sets deben ser al menos hasta 2");
    }

    // Advertencias
    if (rules.bestOf === 5) {
      warnings.push("Partidos al mejor de 5 pueden ser muy largos");
    }

    if (rules.setsTo > 10) {
      warnings.push("Sets muy largos pueden hacer partidos muy extensos");
    }
  }

  /**
   * Valida días y horarios
   */
  private static validateDaysAndSchedule(
    days: TournamentConfig['days'], 
    slotMinutes: number,
    errors: string[], 
    warnings: string[]
  ): void {
    if (!days || days.length === 0) {
      errors.push("Debe configurar al menos un día para el torneo");
      return;
    }

    // Validar slot minutes
    if (slotMinutes < 15 || slotMinutes > 180) {
      errors.push("La duración de slots debe estar entre 15 y 180 minutos");
    }

    // Validar cada día
    const uniqueDates = new Set<string>();
    
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const dayErrors: string[] = [];

      // Validar fecha
      if (!day.date) {
        dayErrors.push("La fecha es obligatoria");
      } else {
        // Verificar formato de fecha
        if (!this.isValidDateFormat(day.date)) {
          dayErrors.push("Formato de fecha inválido. Use YYYY-MM-DD");
        }

        // Verificar que no sea fecha pasada
        if (new Date(day.date) < new Date()) {
          warnings.push(`El día ${day.date} está en el pasado`);
        }

        // Verificar fechas duplicadas
        if (uniqueDates.has(day.date)) {
          dayErrors.push(`La fecha ${day.date} está duplicada`);
        } else {
          uniqueDates.add(day.date);
        }
      }

      // Validar horarios
      if (!day.startHour || !day.endHour) {
        dayErrors.push("Los horarios de inicio y fin son obligatorios");
      } else {
        if (!this.isValidTimeFormat(day.startHour) || !this.isValidTimeFormat(day.endHour)) {
          dayErrors.push("Formato de horario inválido. Use HH:MM");
        } else {
          const startTime = this.parseTime(day.startHour);
          const endTime = this.parseTime(day.endHour);
          
          if (startTime >= endTime) {
            dayErrors.push("El horario de inicio debe ser anterior al de fin");
          }

          const duration = endTime - startTime;
          if (duration < 60) { // Menos de 1 hora
            dayErrors.push("La duración del día debe ser al menos 1 hora");
          }

          if (duration > 14 * 60) { // Más de 14 horas
            warnings.push(`El día ${day.date} es muy largo (${Math.round(duration / 60)} horas)`);
          }
        }
      }

      // Validar estado del día
      if (day.isActive === undefined || day.isActive === null) {
        dayErrors.push("El estado activo del día es obligatorio");
      }

      // Agregar errores del día
      if (dayErrors.length > 0) {
        errors.push(`Día ${i + 1} (${day.date || 'sin fecha'}): ${dayErrors.join(', ')}`);
      }
    }

    // Advertencias generales
    if (days.length > 7) {
      warnings.push("Torneos de más de 7 días pueden ser muy largos");
    }

    if (slotMinutes < 30) {
      warnings.push("Slots muy cortos pueden causar problemas de horarios");
    }
  }

  /**
   * Valida la configuración de canchas
   */
  private static validateCourts(
    courts: TournamentConfig['courts'], 
    errors: string[], 
    warnings: string[]
  ): void {
    if (!courts || courts.length === 0) {
      warnings.push("No hay canchas configuradas. Esto puede limitar la programación");
      return;
    }

    const uniqueNames = new Set<string>();

    for (let i = 0; i < courts.length; i++) {
      const court = courts[i];
      const courtErrors: string[] = [];

      // Validar nombre
      if (!court.name || court.name.trim().length === 0) {
        courtErrors.push("El nombre de la cancha es obligatorio");
      } else {
        if (court.name.length > 50) {
          courtErrors.push("El nombre de la cancha no puede exceder 50 caracteres");
        }

        if (uniqueNames.has(court.name)) {
          courtErrors.push("El nombre de la cancha está duplicado");
        } else {
          uniqueNames.add(court.name);
        }
      }

      // Validar ID
      if (!court.id || court.id.trim().length === 0) {
        courtErrors.push("El ID de la cancha es obligatorio");
      }

      // Agregar errores de la cancha
      if (courtErrors.length > 0) {
        errors.push(`Cancha ${i + 1} (${court.name || 'sin nombre'}): ${courtErrors.join(', ')}`);
      }
    }

    // Advertencias generales
    if (courts.length > 20) {
      warnings.push("Muchas canchas pueden complicar la gestión del torneo");
    }

    if (courts.length < 2) {
      warnings.push("Pocas canchas pueden limitar la capacidad del torneo");
    }
  }

  /**
   * Verifica si un número es una potencia de 2
   */
  private static isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  /**
   * Valida formato de fecha (YYYY-MM-DD)
   */
  private static isValidDateFormat(date: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;
    
    const parsedDate = new Date(date);
    return parsedDate.toISOString().split('T')[0] === date;
  }

  /**
   * Valida formato de tiempo (HH:MM)
   */
  private static isValidTimeFormat(time: string): boolean {
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  }

  /**
   * Convierte tiempo HH:MM a minutos desde medianoche
   */
  private static parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Valida una configuración específica de torneo antes de guardarla
   */
  static validateForSave(config: TournamentConfig): ValidationResult {
    const result = this.validate(config);
    
    // Para guardar, no permitir warnings que sean críticos
    if (result.warnings) {
      const criticalWarnings = result.warnings.filter(warning => 
        warning.includes('fecha') && warning.includes('pasado')
      );
      
      if (criticalWarnings.length > 0) {
        result.errors.push(...criticalWarnings);
        result.warnings = result.warnings.filter(warning => 
          !warning.includes('fecha') || !warning.includes('pasado')
        );
      }
    }

    return result;
  }

  /**
   * Valida una configuración inicial de torneo (más permisivo)
   */
  static validateInitialConfig(config: TournamentConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar estructura básica
    this.validateBasicStructure(config, errors);
    
    // Validar configuración de grupos (crítico)
    this.validateGroupStage(config.groupStage, errors, warnings);
    
    // Validar configuración de eliminatorias (crítico)
    this.validateKnockout(config.knockout, errors, warnings);
    
    // Validar reglas del juego (crítico)
    this.validateGameRules(config.rules, errors, warnings);
    
    // NO validar días ni canchas en configuración inicial
    // Los días y canchas se configuran después de crear el torneo

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Valida una configuración para mostrar al usuario (permite warnings)
   */
  static validateForDisplay(config: TournamentConfig): ValidationResult {
    return this.validate(config);
  }
}
