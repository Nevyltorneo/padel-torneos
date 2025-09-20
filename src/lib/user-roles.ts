import { createClient } from "./supabase";
const supabase = createClient();
import type { UserRole, UserRoleAssignment, UserProfile } from "@/types";

// Buscar usuario por email
export async function findUserByEmail(
  email: string
): Promise<{ id: string; profile?: UserProfile } | null> {
  try {
    console.log("🔍 findUserByEmail: Buscando usuario por email:", email);

    // Buscar en la tabla de perfiles por email
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (profile && !error) {
      console.log(
        "✅ findUserByEmail: Usuario encontrado por email:",
        profile.id
      );
      return {
        id: profile.id,
        profile: convertUserProfileFromDb(profile),
      };
    }

    // Si no se encontró, el usuario no existe
    console.warn("⚠️ findUserByEmail: Usuario no encontrado:", email);
    return null;
  } catch (error) {
    console.error("❌ findUserByEmail: Error buscando usuario:", error);
    return null;
  }
}

// Asignar rol a un usuario
export async function assignRole(
  userId: string,
  tournamentId: string,
  role: UserRole,
  grantedBy: string,
  expiresAt?: string
): Promise<UserRoleAssignment> {
  try {
    console.log("🔄 assignRole: Asignando rol:", {
      userId,
      tournamentId,
      role,
      grantedBy,
      expiresAt,
    });

    // Verificar que el usuario existe
    const { data: userExists, error: userCheckError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (userCheckError || !userExists) {
      console.error("❌ assignRole: Usuario no encontrado:", userId);
      throw new Error(`Usuario con ID ${userId} no existe`);
    }

    console.log("✅ assignRole: Usuario verificado:", userId);

    // Verificar si ya existe un rol para este usuario en este torneo
    const { data: existingRole, error: checkRoleError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .eq("tournament_id", tournamentId)
      .single();

    let data, error;

    if (existingRole && !checkRoleError) {
      // Si ya existe un rol, actualizarlo
      console.log(
        "ℹ️ assignRole: Actualizando rol existente:",
        existingRole.id
      );
      const result = await supabase
        .from("user_roles")
        .update({
          role,
          granted_by: grantedBy,
          expires_at: expiresAt,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRole.id)
        .select("*")
        .single();

      data = result.data;
      error = result.error;
    } else if (checkRoleError && checkRoleError.code !== "PGRST116") {
      // Si hay un error diferente a "no encontrado", lanzar error
      console.error(
        "❌ assignRole: Error verificando rol existente:",
        checkRoleError
      );
      throw checkRoleError;
    } else {
      // Si no existe (PGRST116 = no rows returned), crear uno nuevo
      console.log("ℹ️ assignRole: Creando nuevo rol");
      const result = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          tournament_id: tournamentId,
          role,
          granted_by: grantedBy,
          expires_at: expiresAt,
          is_active: true,
        })
        .select("*")
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("❌ assignRole: Error en Supabase:", error);
      console.error("❌ assignRole: Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    console.log("✅ assignRole: Rol asignado exitosamente:", data);

    return convertUserRoleFromDb(data);
  } catch (error) {
    console.error("❌ assignRole: Error asignando rol:", error);
    throw error;
  }
}

// Revocar rol de un usuario
export async function revokeRole(
  userId: string,
  tournamentId: string
): Promise<void> {
  try {
    console.log("🔄 revokeRole: Revocando rol para usuario:", userId);

    const { error } = await supabase
      .from("user_roles")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("tournament_id", tournamentId);

    if (error) {
      console.error("❌ revokeRole: Error en Supabase:", error);
      console.error("❌ revokeRole: Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    console.log("✅ revokeRole: Rol revocado exitosamente");
  } catch (error) {
    console.error("❌ revokeRole: Error revocando rol:", error);
    throw error;
  }
}

// Obtener todos los usuarios con roles en un torneo
export async function getTournamentUsers(
  tournamentId: string
): Promise<(UserRoleAssignment & { profile?: UserProfile })[]> {
  try {
    console.log(
      "🔍 getTournamentUsers: Buscando usuarios para torneo:",
      tournamentId
    );

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("❌ getTournamentUsers: Usuario no autenticado");
      throw new Error("Usuario no autenticado");
    }

    console.log("✅ getTournamentUsers: Usuario autenticado:", user.id);

    // Obtener los roles de usuario del torneo
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (rolesError) {
      console.error(
        "❌ getTournamentUsers: Error obteniendo roles de usuario:",
        rolesError
      );
      console.error("❌ getTournamentUsers: Error details:", {
        message: rolesError.message,
        details: rolesError.details,
        hint: rolesError.hint,
        code: rolesError.code,
      });

      // Si es error de permisos RLS, dar mensaje más específico
      if (rolesError.code === "PGRST116") {
        throw new Error(
          "No tienes permisos para ver los usuarios de este torneo. Contacta al administrador."
        );
      }

      throw rolesError;
    }

    console.log(
      "✅ getTournamentUsers: Roles obtenidos:",
      userRoles?.length || 0
    );

    if (!userRoles || userRoles.length === 0) {
      console.log(
        "ℹ️ getTournamentUsers: No hay usuarios con roles activos en este torneo"
      );
      return [];
    }

    // Obtener los userIds para hacer la consulta de perfiles
    const userIds = userRoles.map((role) => role.user_id);

    // Obtener los perfiles de usuario
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("*")
      .in("id", userIds);

    if (profilesError) {
      console.error(
        "❌ getTournamentUsers: Error obteniendo perfiles de usuario:",
        profilesError
      );
      console.error("❌ getTournamentUsers: Error details:", {
        message: profilesError.message,
        details: profilesError.details,
        hint: profilesError.hint,
        code: profilesError.code,
      });

      // No lanzar error aquí, solo loguear y continuar sin perfiles
      console.warn(
        "⚠️ getTournamentUsers: No se pudieron cargar los perfiles de usuario, continuando sin ellos"
      );
    }

    console.log(
      "✅ getTournamentUsers: Perfiles obtenidos:",
      profiles?.length || 0
    );

    // Combinar los datos
    return userRoles.map((role: Record<string, unknown>) => {
      const profile = profiles?.find(
        (p: Record<string, unknown>) => p.id === role.user_id
      );

      return {
        ...convertUserRoleFromDb(role),
        profile: profile
          ? {
              id: profile.id,
              fullName: profile.full_name || undefined,
              email: profile.email || undefined,
              createdAt: profile.created_at || "",
              updatedAt: profile.updated_at || "",
            }
          : undefined,
      };
    });
  } catch (error) {
    console.error("❌ getTournamentUsers: Error obteniendo usuarios:", error);
    throw error;
  }
}

// Actualizar perfil de usuario
export async function updateUserProfile(
  userId: string,
  profile: Partial<UserProfile>
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({
      id: userId,
      email: profile.email,
      full_name: profile.fullName,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }

  return convertUserProfileFromDb(data);
}

// Funciones de conversión de datos
function convertUserRoleFromDb(
  data: Record<string, unknown>
): UserRoleAssignment {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    tournamentId: data.tournament_id as string,
    role: data.role as UserRole,
    grantedBy: data.granted_by as string,
    grantedAt: data.granted_at as string,
    expiresAt: data.expires_at as string | undefined,
    isActive: data.is_active as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function convertUserProfileFromDb(data: Record<string, unknown>): UserProfile {
  return {
    id: data.id as string,
    email: data.email as string | undefined,
    fullName: data.full_name as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
