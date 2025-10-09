export type ID = string;

export interface Tournament {
  id: ID;
  name: string;
  slug: string; // identificador único del torneo
  config: TournamentConfig; // JSON del torneo
  createdBy: ID; // userId
  status: TournamentStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface DaySchedule {
  date: string; // "2025-09-04"
  startHour: string; // "08:00"
  endHour: string; // "22:00"
  isActive: boolean; // Si este día está activo para el torneo
}

export interface TournamentConfig {
  name: string;
  days: DaySchedule[]; // Horarios específicos por día
  slotMinutes: number;
  courts: Court[];
  groupStage: {
    minPairs: number;
    maxPairs: number;
    roundRobin: boolean;
  };
  knockout: {
    bracketSize?: number; // Ahora es opcional, se calcula dinámicamente
    thirdPlace: boolean;
  };
  rules: {
    bestOf: number;
    setsTo: number;
    tieBreak: boolean;
  };
}

export interface Category {
  id: ID;
  tournamentId: ID;
  name: string; // ej. 4ta, Principiantes Femenil
  slug: string; // identificador único de la categoría (ej. "femenil", "principiantes")
  minPairs: number; // por defecto 3
  maxPairs: number; // por defecto 6
  status: "active" | "grouping" | "scheduled" | "in_progress" | "finished";
}

export interface Player {
  name: string;
  phone?: string;
  email?: string;
}

export interface Pair {
  id: ID;
  tournamentId: ID;
  categoryId: ID;
  player1: Player;
  player2: Player;
  seed?: number; // opcional para siembra manual
  groupId?: ID; // opcional para grupo asignado
}

export interface Group {
  id: ID;
  categoryId: ID;
  name: string; // Grupo A/B/C
  pairIds: ID[]; // ordenado
  createdAt?: string;
  updatedAt?: string;
}

export interface Match {
  id: ID;
  tournamentId: ID;
  categoryId: ID;
  stage:
    | "group"
    | "quarterfinals"
    | "semifinals"
    | "final"
    | "third_place"
    | "quarterfinal"
    | "semifinal"
    | "groups"; // aliases para compatibilidad
  groupId?: ID; // si es fase de grupos
  pairAId: ID;
  pairBId: ID;
  day?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm (puede ser nulo hasta asignar)
  courtId?: string; // asignación dinámica
  status: "pending" | "scheduled" | "playing" | "completed";
  // Campos opcionales para bracket (solo para compatibilidad TypeScript)
  matchNumber?: number;
  bracketPosition?: string;
  roundNumber?: number;
  scorePairA?: {
    set1: number;
    set2: number;
    set3?: number;
    superDeath?: number;
  };
  scorePairB?: {
    set1: number;
    set2: number;
    set3?: number;
    superDeath?: number;
  };
  winnerPairId?: ID;
  // 🆕 NUEVO: Campo score completo para debugging y datos detallados
  score?: Score | null;
  createdAt?: string;
  updatedAt?: string;
}

// Interfaz para el bracket eliminatorio
export interface BracketMatch {
  id: ID;
  stage:
    | "round_of_32"
    | "round_of_16"
    | "quarterfinal"
    | "semifinal"
    | "final"
    | "third_place";
  roundNumber: number;
  matchNumber: number;
  bracketPosition: string;
  pairA?: Pair;
  pairB?: Pair;
  winner?: Pair;
  status: "pending" | "scheduled" | "playing" | "completed";
  scorePairA?: {
    set1: number;
    set2: number;
    set3?: number;
    superDeath?: number;
  };
  scorePairB?: {
    set1: number;
    set2: number;
    set3?: number;
    superDeath?: number;
  };
  nextMatchId?: ID;
}

export interface ScoreSet {
  a: number;
  b: number;
}

export interface Score {
  sets: ScoreSet[];
  winnerPairId?: ID;
  notes?: string;
}

export interface Court {
  id: string; // C1, C2...
  name: string;
  tournamentId: ID;
}

export interface AvailabilityEvent {
  id: ID;
  tournamentId: ID;
  courtId: string;
  type: "free" | "blocked";
  day: string; // YYYY-MM-DD
  from: string; // HH:mm
  to: string; // HH:mm
}

export interface User {
  id: ID;
  name: string;
  email?: string;
  role: "owner" | "admin" | "referee" | "viewer";
}

export interface Standing {
  pairId: ID;
  pair: Pair;
  matchesPlayed: number;
  wins: number;
  losses: number;
  points: number;
  setsFor: number;
  setsAgainst: number;
  setsDiff: number;
  gamesFor: number;
  gamesAgainst: number;
  gamesDiff: number;
}

export interface TimeSlot {
  day: string;
  from: string;
  to: string;
}

// Estados para el flujo de trabajo
export type TournamentStatus =
  | "active"
  | "registration"
  | "groups_generated"
  | "scheduled"
  | "in_progress"
  | "finished";

// Configuración por defecto para nuevos torneos
export const DEFAULT_TOURNAMENT_CONFIG: Partial<TournamentConfig> = {
  slotMinutes: 90,
  days: [],
  groupStage: {
    minPairs: 3,
    maxPairs: 6,
    roundRobin: true,
  },
  knockout: {
    thirdPlace: true,
  },
  rules: {
    bestOf: 3,
    setsTo: 6,
    tieBreak: true,
  },
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  tournamentId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>; // JSON data específico del tipo de notificación
  isRead: boolean;
  createdAt: string;
  scheduledFor?: string; // Para notificaciones programadas
}

export type NotificationType =
  | "match_scheduled" // Partido programado
  | "match_reminder" // Recordatorio de partido (15 min antes)
  | "match_rescheduled" // Cambio de horario/cancha
  | "match_result" // Resultado de partido
  | "tournament_update" // Actualización del torneo
  | "bracket_advance" // Avance a siguiente fase
  | "tournament_finished" // Torneo terminado
  | "general"; // Notificación general

export interface NotificationPreferences {
  userId: string;
  tournamentId: string;
  enablePush: boolean;
  enableEmail: boolean;
  matchReminders: boolean;
  scheduleChanges: boolean;
  results: boolean;
  tournamentUpdates: boolean;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// SISTEMA DE ROLES Y PERMISOS
// =====================================================

export type UserRole = "owner" | "admin" | "referee" | "viewer";

export interface UserRoleAssignment {
  id: string;
  userId: string;
  tournamentId: string;
  role: UserRole;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  fullName?: string;
  createdAt: string;
  updatedAt: string;
}

// Permisos por rol
export interface RolePermissions {
  canCreateTournaments: boolean;
  canDeleteTournaments: boolean;
  canManageCategories: boolean;
  canManagePairs: boolean;
  canGenerateGroups: boolean;
  canGenerateMatches: boolean;
  canUpdateScores: boolean;
  canManageSchedule: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
}

// Contexto de usuario con permisos
export interface UserContext {
  user: {
    id: string;
    email: string;
    profile?: UserProfile;
  };
  currentTournament?: Tournament;
  role?: UserRole;
  permissions: RolePermissions;
}
