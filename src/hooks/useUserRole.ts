"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTournamentStore } from "@/stores/tournament-store";
import {
  getUserRole,
  getUserProfile,
  getRolePermissions,
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

      // SOLUCIÓN PERMANENTE: Usuario Nevyl tiene permisos globales
      let role: UserRole | undefined;

      if (user.email === "nrm001sm@hotmail.com") {
        console.log("🎯 USUARIO NEVYL DETECTADO - PERMISOS GLOBALES ACTIVADOS");
        console.log(
          "✅ Nevyl tiene acceso completo al sistema independientemente del torneo"
        );
        role = "owner";
      } else if (currentTournament) {
        console.log("🔍 Current tournament:", {
          id: currentTournament.id,
          name: currentTournament.name,
        });

        role = (await getUserRole(user.id, currentTournament.id)) || "viewer";
        console.log("📋 Role obtained from database:", role);
      } else {
        console.log("⚠️ No current tournament selected, using viewer role");
        role = "viewer";
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

      // Log para debugging
      console.log("🔍 UserContext final:", {
        email: user.email,
        role,
        hasOwnerPermissions: permissions.canManageUsers,
        isOwner: role === "owner",
        permissions: permissions,
      });

      // Log especial para Nevyl
      if (user.email === "nrm001sm@hotmail.com") {
        console.log("🎯 SISTEMA GLOBAL ACTIVADO PARA NEVYL:");
        console.log("  ✅ Email:", user.email);
        console.log("  ✅ Role asignado:", role);
        console.log("  ✅ CanManageUsers:", permissions.canManageUsers);
        console.log("  ✅ IsOwner:", role === "owner");
        console.log(
          "  ✅ Permisos globales:",
          Object.entries(permissions)
            .filter(([k, v]) => v)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        );
        console.log("  🎉 ¡Nevyl tiene acceso completo al sistema!");
      }

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

  // Función para registrar una acción del usuario (DESHABILITADA)
  const logUserAction = useCallback(
    async (
      action: string,
      resourceType?: string,
      resourceId?: string,
      details?: Record<string, unknown>
    ) => {
      // Auditoría deshabilitada - no hacer nada
      console.log("Auditoría deshabilitada:", {
        action,
        resourceType,
        resourceId,
      });
    },
    []
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
