import {
  TimeSlot,
  Court,
  Match,
  AvailabilityEvent,
  TournamentConfig,
} from "@/types";
import {
  addMinutes,
  format,
  parse,
  isAfter,
  isBefore,
  isEqual,
} from "date-fns";

/**
 * Genera todos los slots de tiempo disponibles según la configuración del torneo
 */
export function generateTimeSlots(config: TournamentConfig): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (const day of config.days) {
    const daySlots = generateDayTimeSlots(
      day,
      config.startHour,
      config.endHour,
      config.slotMinutes
    );
    slots.push(...daySlots);
  }

  return slots;
}

/**
 * Genera slots de tiempo para un día específico
 */
export function generateDayTimeSlots(
  day: string,
  startHour: string,
  endHour: string,
  slotMinutes: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Parsear horas de inicio y fin
  const start = parse(startHour, "HH:mm", new Date());
  const end = parse(endHour, "HH:mm", new Date());

  let currentTime = start;

  while (isBefore(currentTime, end) || isEqual(currentTime, end)) {
    const nextTime = addMinutes(currentTime, slotMinutes);

    // Solo agregar si el slot completo cabe antes del horario de cierre
    if (isBefore(nextTime, end) || isEqual(nextTime, end)) {
      slots.push({
        day,
        from: format(currentTime, "HH:mm"),
        to: format(nextTime, "HH:mm"),
      });
    }

    currentTime = nextTime;
  }

  return slots;
}

/**
 * Obtiene los slots disponibles para una cancha en un día específico
 */
export function getAvailableSlots(
  court: Court,
  day: string,
  timeSlots: TimeSlot[],
  matches: Match[],
  availabilityEvents: AvailabilityEvent[]
): TimeSlot[] {
  // Filtrar slots para el día específico
  const daySlots = timeSlots.filter((slot) => slot.day === day);

  // Obtener partidos programados en esta cancha para este día
  const courtMatches = matches.filter(
    (match) =>
      match.courtId === court.id &&
      match.day === day &&
      match.startTime &&
      match.status !== "finished"
  );

  // Obtener eventos de bloqueo para esta cancha en este día
  const blockingEvents = availabilityEvents.filter(
    (event) =>
      event.courtId === court.id &&
      event.day === day &&
      event.type === "blocked"
  );

  // Filtrar slots disponibles
  return daySlots.filter((slot) => {
    // Verificar que no haya partidos programados en este horario
    const hasMatch = courtMatches.some(
      (match) =>
        timesOverlap(
          slot.from,
          slot.to,
          match.startTime!,
          calculateMatchEndTime(match.startTime!, 50)
        ) // Asumiendo 50 min por partido
    );

    if (hasMatch) return false;

    // Verificar que no esté bloqueado
    const isBlocked = blockingEvents.some((event) =>
      timesOverlap(slot.from, slot.to, event.from, event.to)
    );

    return !isBlocked;
  });
}

/**
 * Calcula la hora de finalización de un partido
 */
export function calculateMatchEndTime(
  startTime: string,
  durationMinutes: number
): string {
  const start = parse(startTime, "HH:mm", new Date());
  const end = addMinutes(start, durationMinutes);
  return format(end, "HH:mm");
}

/**
 * Verifica si dos rangos de tiempo se superponen
 */
export function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = parse(start1, "HH:mm", new Date());
  const e1 = parse(end1, "HH:mm", new Date());
  const s2 = parse(start2, "HH:mm", new Date());
  const e2 = parse(end2, "HH:mm", new Date());

  return isBefore(s1, e2) && isAfter(e1, s2);
}

/**
 * Encuentra el siguiente slot disponible para una cancha
 */
export function findNextAvailableSlot(
  court: Court,
  fromTime: string,
  day: string,
  timeSlots: TimeSlot[],
  matches: Match[],
  availabilityEvents: AvailabilityEvent[]
): TimeSlot | null {
  const availableSlots = getAvailableSlots(
    court,
    day,
    timeSlots,
    matches,
    availabilityEvents
  );

  // Filtrar slots que empiecen después del tiempo dado
  const futureSlots = availableSlots.filter((slot) => {
    const slotStart = parse(slot.from, "HH:mm", new Date());
    const fromTimeParsed = parse(fromTime, "HH:mm", new Date());
    return (
      isAfter(slotStart, fromTimeParsed) || isEqual(slotStart, fromTimeParsed)
    );
  });

  // Retornar el más cercano
  return futureSlots.length > 0 ? futureSlots[0] : null;
}

/**
 * Calcula estadísticas de ocupación de canchas
 */
export function calculateCourtOccupancy(
  courts: Court[],
  day: string,
  timeSlots: TimeSlot[],
  matches: Match[]
): Array<{
  court: Court;
  totalSlots: number;
  occupiedSlots: number;
  occupancyRate: number;
  availableSlots: number;
}> {
  const daySlots = timeSlots.filter((slot) => slot.day === day);

  return courts.map((court) => {
    const courtMatches = matches.filter(
      (match) =>
        match.courtId === court.id &&
        match.day === day &&
        match.startTime &&
        match.status !== "finished"
    );

    const occupiedSlots = courtMatches.length;
    const totalSlots = daySlots.length;
    const availableSlots = totalSlots - occupiedSlots;
    const occupancyRate =
      totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

    return {
      court,
      totalSlots,
      occupiedSlots,
      occupancyRate,
      availableSlots,
    };
  });
}

/**
 * Algoritmo de asignación automática de cancha al liberarse una
 */
export interface CourtAssignmentPriority {
  matchId: string;
  priority: number;
  stage: Match["stage"];
  categoryId: string;
  delayMinutes: number;
}

export function findNextMatchForCourt(
  court: Court,
  currentTime: string,
  day: string,
  pendingMatches: Match[],
  timeSlots: TimeSlot[],
  matches: Match[],
  availabilityEvents: AvailabilityEvent[]
): { match: Match; suggestedSlot: TimeSlot } | null {
  // Filtrar partidos elegibles (pendientes o programados sin cancha)
  const eligibleMatches = pendingMatches.filter(
    (match) =>
      match.day === day &&
      (!match.courtId || match.status === "pending") &&
      match.status !== "finished"
  );

  if (eligibleMatches.length === 0) return null;

  // Calcular prioridades
  const priorities: CourtAssignmentPriority[] = eligibleMatches.map((match) => {
    let priority = 0;

    // Prioridad por fase (eliminatorias > grupos)
    switch (match.stage) {
      case "final":
        priority += 1000;
        break;
      case "semifinal":
        priority += 800;
        break;
      case "third_place":
        priority += 600;
        break;
      case "quarterfinal":
        priority += 400;
        break;
      case "groups":
        priority += 100;
        break;
    }

    // Penalidad por retraso si ya tenía horario programado
    let delayMinutes = 0;
    if (match.startTime) {
      const scheduledTime = parse(match.startTime, "HH:mm", new Date());
      const currentTimeParsed = parse(currentTime, "HH:mm", new Date());
      if (isAfter(currentTimeParsed, scheduledTime)) {
        delayMinutes =
          (currentTimeParsed.getTime() - scheduledTime.getTime()) / (1000 * 60);
        priority += delayMinutes * 10; // Más prioridad cuanto más retraso
      }
    }

    return {
      matchId: match.id,
      priority,
      stage: match.stage,
      categoryId: match.categoryId,
      delayMinutes,
    };
  });

  // Ordenar por prioridad descendente
  priorities.sort((a, b) => b.priority - a.priority);

  // Encontrar slot para el partido de mayor prioridad
  for (const priorityMatch of priorities) {
    const match = eligibleMatches.find((m) => m.id === priorityMatch.matchId);
    if (!match) continue;

    const suggestedSlot = findNextAvailableSlot(
      court,
      currentTime,
      day,
      timeSlots,
      matches,
      availabilityEvents
    );

    if (suggestedSlot) {
      return { match, suggestedSlot };
    }
  }

  return null;
}

/**
 * Valida que haya suficiente tiempo para completar todos los partidos
 */
export function validateScheduleFeasibility(
  totalMatches: number,
  courts: Court[],
  timeSlots: TimeSlot[],
  matchDurationMinutes: number = 50
): {
  isFeasible: boolean;
  totalCapacity: number;
  requiredCapacity: number;
  utilizationRate: number;
  message?: string;
} {
  const totalCapacity = courts.length * timeSlots.length;
  const requiredCapacity = totalMatches;
  const utilizationRate =
    totalCapacity > 0 ? (requiredCapacity / totalCapacity) * 100 : 0;

  const isFeasible = totalCapacity >= requiredCapacity;

  let message: string | undefined;
  if (!isFeasible) {
    message = `Capacidad insuficiente. Se necesitan ${requiredCapacity} slots pero solo hay ${totalCapacity} disponibles.`;
  } else if (utilizationRate > 90) {
    message = `Advertencia: Utilización muy alta (${utilizationRate.toFixed(
      1
    )}%). Considere agregar más canchas o tiempo.`;
  }

  return {
    isFeasible,
    totalCapacity,
    requiredCapacity,
    utilizationRate,
    message,
  };
}
