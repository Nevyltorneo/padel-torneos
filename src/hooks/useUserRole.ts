"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTournamentStore } from "@/stores/tournament-store";
import {
  getUserRole,
  getUserProfile,
  getRolePermissions,
  logAction,
} from "@/lib/supabase-queries";
import type {
  UserRole,
  UserProfile,
  RolePermissions,
  UserContext,
} from "@/types";

export function useUserRole() {
  const { user } = useAuth();
  const { currentTournament } = useTournamentStore();
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserContext = useCallback(async () => {
    if (!user) {
      setUserContext(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Obtener perfil del usuario
      const profile = await getUserProfile(user.id);

      // Obtener rol en el torneo actual (si existe)
      let role: UserRole | undefined;
      if (currentTournament) {
        role = (await getUserRole(user.id, currentTournament.id)) || "viewer";
      }

      // Obtener permisos basados en el rol
      const permissions = role
        ? getRolePermissions(role)
        : getRolePermissions("viewer");

      const context: UserContext = {
        user: {
          id: user.id,
          email: user.email || "",
          profile: profile || undefined,
        },
        currentTournament: currentTournament || undefined,
        role,
        permissions,
      };

      setUserContext(context);
    } catch (err) {
      console.error("Error loading user context:", err);
      setError("Error al cargar el contexto del usuario");

      // Contexto mínimo en caso de error
      const fallbackContext: UserContext = {
        user: {
          id: user.id,
          email: user.email || "",
        },
        currentTournament: currentTournament || undefined,
        role: "viewer",
        permissions: getRolePermissions("viewer"),
      };

      setUserContext(fallbackContext);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentTournament]);

  // Cargar contexto cuando cambie el usuario o torneo
  useEffect(() => {
    loadUserContext();
  }, [loadUserContext]);

  // Función para verificar si el usuario tiene un permiso específico
  const hasPermission = useCallback(
    (permission: keyof RolePermissions): boolean => {
      return userContext?.permissions[permission] || false;
    },
    [userContext]
  );

  // Función para verificar si el usuario tiene un rol específico
  const hasRole = useCallback(
    (role: UserRole): boolean => {
      return userContext?.role === role;
    },
    [userContext]
  );

  // Función para verificar si el usuario tiene al menos un rol específico
  const hasMinimumRole = useCallback(
    (minimumRole: UserRole): boolean => {
      if (!userContext?.role) return false;

      const roleHierarchy: Record<UserRole, number> = {
        owner: 4,
        admin: 3,
        referee: 2,
        viewer: 1,
      };

      return roleHierarchy[userContext.role] >= roleHierarchy[minimumRole];
    },
    [userContext]
  );

  // Función para registrar una acción del usuario
  const logUserAction = useCallback(
    async (
      action: string,
      resourceType?: string,
      resourceId?: string,
      details?: Record<string, unknown>
    ) => {
      if (!userContext?.user.id) return;

      try {
        await logAction(
          action,
          resourceType,
          resourceId,
          details,
          currentTournament?.id
        );
      } catch (error) {
        console.error("Error logging user action:", error);
        // No lanzamos el error para no interrumpir el flujo
      }
    },
    [userContext, currentTournament]
  );

  // Función para refrescar el contexto del usuario
  const refreshUserContext = useCallback(() => {
    loadUserContext();
  }, [loadUserContext]);

  return {
    userContext,
    isLoading,
    error,
    hasPermission,
    hasRole,
    hasMinimumRole,
    logUserAction,
    refreshUserContext,
    // Shortcuts para permisos comunes
    canManageUsers: hasPermission("canManageUsers"),
    canManageCategories: hasPermission("canManageCategories"),
    canUpdateScores: hasPermission("canUpdateScores"),
    canViewReports: hasPermission("canViewReports"),
    canManageSettings: hasPermission("canManageSettings"),
    // Shortcuts para roles
    isOwner: hasRole("owner"),
    isAdmin: hasRole("admin"),
    isReferee: hasRole("referee"),
    isViewer: hasRole("viewer"),
  };
}
