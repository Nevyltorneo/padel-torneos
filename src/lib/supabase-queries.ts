import { createClient } from "./supabase";
import {
  Tournament,
  TournamentConfig,
  User,
  Category,
  Pair,
  Group,
  Match,
  Court,
  UserRole,
  UserRoleAssignment,
  UserProfile,
  RolePermissions,
} from "@/types";

const supabase = createClient();

// ============================================================================
// TOURNAMENTS
// ============================================================================

export async function getTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tournaments:", error);
    throw error;
  }

  // Convertir snake_case a camelCase para TypeScript
  const tournaments = (data || []).map((tournamentRow) => ({
    ...tournamentRow,
    createdBy: tournamentRow.created_by,
    createdAt: tournamentRow.created_at,
    updatedAt: tournamentRow.updated_at,
  }));

  return tournaments;
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // No se encontró el torneo
    }
    console.error("Error fetching tournament:", error);
    throw error;
  }

  // Convertir snake_case a camelCase
  const tournament = {
    ...data,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return tournament;
}

export async function getTournamentBySlug(
  slug: string
): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from("tournaments")
    .select(
      `
      *,
      created_by_user:users!tournaments_created_by_fkey(*)
    `
    )
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // No se encontró el torneo
    }
    console.error("Error fetching tournament:", error);
    throw error;
  }

  return data;
}

export async function createTournament(
  tournament: Omit<Tournament, "id" | "createdAt" | "updatedAt">
): Promise<Tournament> {
  const { data: user, error: userError } = await supabase.auth.getUser();

  if (userError || !user.user) {
    throw new Error("Usuario no autenticado");
  }

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      name: tournament.name,
      slug: tournament.slug,
      config: tournament.config,
      status: tournament.status,
      created_by: user.user.id,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating tournament:", error);
    throw error;
  }

  // Convertir snake_case a camelCase para TypeScript
  const tournamentData = {
    ...data,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  // Asignar automáticamente el rol de "owner" al creador del torneo
  try {
    await assignRole(user.user.id, tournamentData.id, "owner", user.user.id);
    console.log("Owner role assigned to tournament creator");
  } catch (roleError) {
    console.error("Error assigning owner role:", roleError);
    // No lanzamos error para no interrumpir la creación del torneo
  }

  return tournamentData;
}

export async function updateTournament(
  id: string,
  updates: Partial<Tournament>
): Promise<Tournament> {
  // Convertir camelCase a snake_case para Supabase
  const supabaseUpdates: any = {};

  if (updates.name !== undefined) supabaseUpdates.name = updates.name;
  if (updates.slug !== undefined) supabaseUpdates.slug = updates.slug;
  if (updates.config !== undefined) supabaseUpdates.config = updates.config;
  if (updates.status !== undefined) supabaseUpdates.status = updates.status;
  if (updates.updatedAt !== undefined)
    supabaseUpdates.updated_at = updates.updatedAt;

  const { data, error } = await supabase
    .from("tournaments")
    .update(supabaseUpdates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating tournament:", error);
    throw error;
  }

  // Convertir snake_case a camelCase para TypeScript
  const tournament: Tournament = {
    id: data.id,
    name: data.name,
    slug: data.slug,
    config: data.config,
    createdBy: data.created_by,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  console.log(`✅ Torneo actualizado: ${tournament.name}`);
  return tournament;
}

export async function deleteTournament(id: string): Promise<void> {
  const { error } = await supabase.from("tournaments").delete().eq("id", id);

  if (error) {
    console.error("Error deleting tournament:", error);
    throw error;
  }
}

// ============================================================================
// USERS
// ============================================================================

export async function getCurrentUser(): Promise<User | null> {
  const { data: authUser, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Usuario no existe en la tabla users, crear uno
      return await createUserProfile(authUser.user);
    }
    console.error("Error fetching user:", error);
    throw error;
  }

  return data;
}

export async function createUserProfile(authUser: any): Promise<User> {
  console.log(
    "🔄 createUserProfile - Intentando crear perfil para:",
    authUser.id
  );

  // Verificar si el perfil ya existe
  const { data: existingProfile, error: checkError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    console.error("❌ Error verificando perfil existente:", checkError);
    throw checkError;
  }

  if (existingProfile) {
    console.log(
      "ℹ️  Perfil ya existe, retornando existente:",
      existingProfile.id
    );
    return {
      id: existingProfile.id,
      name: existingProfile.full_name,
      email: authUser.email,
      role: "admin", // Por defecto admin para el MVP
    };
  }

  // Crear nuevo perfil
  const { data, error } = await supabase
    .from("user_profiles")
    .insert({
      id: authUser.id,
      email: authUser.email,
      full_name:
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split("@")[0] ||
        "Usuario",
    })
    .select("*")
    .single();

  if (error) {
    console.error("❌ Error en createUserProfile:", error);
    console.error("❌ Detalles del error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  console.log("✅ createUserProfile - Perfil creado exitosamente:", data.id);

  return {
    id: data.id,
    name: data.full_name,
    email: authUser.email,
    role: "admin", // Por defecto admin para el MVP
  };
}

// ============================================================================
// CATEGORIES
// ============================================================================

export async function getCategories(tournamentId: string): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      throw new Error(`Error fetching categories: ${error.message}`);
    }

    // Convertir snake_case a camelCase para TypeScript
    const categories = (data || []).map((category) => ({
      ...category,
      tournamentId: category.tournament_id,
      minPairs: category.min_pairs,
      maxPairs: category.max_pairs,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    }));

    return categories;
  } catch (error) {
    console.error("Unexpected error in getCategories:", error);
    return [];
  }
}

// Función para obtener todas las categorías para vista pública
export async function getAllCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching all categories:", error);
      return [];
    }

    // Convertir snake_case a camelCase para TypeScript
    const categories = (data || []).map((category) => ({
      ...category,
      tournamentId: category.tournament_id,
      minPairs: category.min_pairs,
      maxPairs: category.max_pairs,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    }));

    return categories;
  } catch (error) {
    console.error("Unexpected error in getAllCategories:", error);
    return [];
  }
}

export async function getCategory(id: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // No se encontró la categoría
    }
    console.error("Error fetching category:", error);
    throw error;
  }

  // Convertir snake_case a camelCase para TypeScript
  const category = {
    ...data,
    tournamentId: data.tournament_id,
    minPairs: data.min_pairs,
    maxPairs: data.max_pairs,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return category;
}

export async function createCategory(
  category: Omit<Category, "id" | "createdAt" | "updatedAt">
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({
      tournament_id: category.tournamentId,
      name: category.name,
      slug: category.slug,
      min_pairs: category.minPairs,
      max_pairs: category.maxPairs,
      status: category.status,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating category:", error);
    throw error;
  }

  // Convertir snake_case a camelCase para TypeScript
  const categoryData = {
    ...data,
    tournamentId: data.tournament_id,
    minPairs: data.min_pairs,
    maxPairs: data.max_pairs,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return categoryData;
}

export async function updateCategory(
  id: string,
  updates: Partial<
    Pick<Category, "name" | "slug" | "minPairs" | "maxPairs" | "status">
  >
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update({
      name: updates.name,
      slug: updates.slug,
      min_pairs: updates.minPairs,
      max_pairs: updates.maxPairs,
      status: updates.status,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating category:", error);
    throw error;
  }

  // Convertir snake_case a camelCase para TypeScript
  const categoryData = {
    ...data,
    tournamentId: data.tournament_id,
    minPairs: data.min_pairs,
    maxPairs: data.max_pairs,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return categoryData;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
}

// ============================================================================
// PAIRS
// ============================================================================

// Función de prueba para verificar conexión a Supabase
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("pairs")
      .select("count")
      .limit(1);

    if (error) {
      console.error("testSupabaseConnection: Error:", error);
      return false;
    }

    console.log("testSupabaseConnection: Success, data:", data);
    return true;
  } catch (error) {
    console.error("testSupabaseConnection: Unexpected error:", error);
    return false;
  }
}

export async function getPairs(categoryId: string): Promise<Pair[]> {
  // Validar que categoryId no esté vacío y sea un UUID válido
  if (!categoryId || categoryId.trim() === "") {
    console.warn("getPairs called with empty categoryId");
    return [];
  }

  // Validar formato UUID básico
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(categoryId)) {
    console.warn("getPairs called with invalid UUID format:", categoryId);
    return [];
  }

  console.log(`getPairs: Fetching pairs for category ${categoryId}`);

  try {
    const { data, error } = await supabase
      .from("pairs")
      .select("*")
      .eq("category_id", categoryId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(
        "getPairs: Error fetching pairs for category",
        categoryId,
        ":",
        error.message || error
      );
      // En lugar de lanzar error, retornar array vacío
      return [];
    }

    console.log(
      `getPairs: Found ${data?.length || 0} pairs for category ${categoryId}`
    );

    // Debug: Ver datos crudos de la base de datos
    if (data && data.length > 0) {
      console.log("getPairs: Raw data from DB:", data[0]);
      console.log("getPairs: player1 structure:", data[0].player1);
      console.log("getPairs: player2 structure:", data[0].player2);
      console.log("getPairs: seed from DB:", data[0].seed);
    }

    // Convertir snake_case a camelCase para TypeScript
    const pairs = (data || []).map((pair, index) => ({
      id: pair.id,
      tournamentId: pair.tournament_id,
      categoryId: pair.category_id,
      player1: {
        name: pair.player1?.name || "",
        phone: pair.player1?.phone || "",
      },
      player2: {
        name: pair.player2?.name || "",
        phone: pair.player2?.phone || "",
      },
      seed: pair.seed, // Usar el seed de la BD directamente
      groupId: pair.group_id, // Incluir el groupId
      createdAt: pair.created_at,
      updatedAt: pair.updated_at,
    }));

    // Debug: Verificar el seed después de la conversión
    if (pairs.length > 0) {
      console.log("getPairs: Converted pairs seed:", pairs[0].seed);
    }

    return pairs;
  } catch (error) {
    console.error("getPairs: Unexpected error:", error);
    return [];
  }
}

// Función para obtener parejas por sus IDs (helper function)
export function getPairsByIds(
  pairIds: string[],
  allPairs: Pair[] = []
): Pair[] {
  return pairIds
    .map((id) => allPairs.find((pair) => pair.id === id))
    .filter((pair): pair is Pair => pair !== undefined);
}

export async function createPair(
  pair: Omit<Pair, "id" | "createdAt" | "updatedAt">
): Promise<Pair> {
  // Validar datos requeridos
  if (!pair.tournamentId || !pair.categoryId) {
    throw new Error("tournamentId y categoryId son requeridos");
  }

  if (!pair.player1?.name || !pair.player2?.name) {
    throw new Error("Los nombres de ambos jugadores son requeridos");
  }

  // Obtener el número de parejas existentes en la categoría para asignar ranking
  const existingPairs = await getPairs(pair.categoryId);
  const nextRanking = existingPairs.length + 1;

  // Preparar datos para insertar
  const insertData = {
    tournament_id: pair.tournamentId,
    category_id: pair.categoryId,
    player1: {
      name: pair.player1.name.trim(),
      phone: pair.player1.phone?.trim() || null,
    },
    player2: {
      name: pair.player2.name.trim(),
      phone: pair.player2.phone?.trim() || null,
    },
    seed: pair.seed || null, // Incluir el seed en la inserción
  };

  console.log("createPair: Inserting data:", insertData);

  const { data, error } = await supabase
    .from("pairs")
    .insert(insertData)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating pair:", error);
    console.error("Error details:", {
      message: error.message || "Unknown error",
      details: error.details || "No details available",
      hint: error.hint || "No hint available",
      code: error.code || "No code available",
    });
    throw error;
  }

  // Convertir snake_case a camelCase para TypeScript
  const pairData = {
    id: data.id,
    tournamentId: data.tournament_id || pair.tournamentId,
    categoryId: data.category_id,
    player1: {
      name: data.player1?.name || "",
      phone: data.player1?.phone || "",
    },
    player2: {
      name: data.player2?.name || "",
      phone: data.player2?.phone || "",
    },
    seed: data.seed || pair.seed || nextRanking, // Usar el seed de la BD, proporcionado o calculado
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return pairData;
}

export async function deletePair(id: string): Promise<void> {
  if (!id || id.trim() === "") {
    throw new Error("ID de pareja es requerido");
  }

  console.log("deletePair: Deleting pair with ID:", id);

  const { error } = await supabase.from("pairs").delete().eq("id", id);

  if (error) {
    console.error("Error deleting pair:", error);
    console.error("Error details:", {
      message: error.message || "Unknown error",
      details: error.details || "No details available",
      hint: error.hint || "No hint available",
      code: error.code || "No code available",
    });
    throw error;
  }

  console.log("deletePair: Successfully deleted pair with ID:", id);
}

export async function updateGroup(
  id: string,
  group: Omit<Group, "id" | "createdAt" | "updatedAt">
): Promise<Group> {
  if (!id || id.trim() === "") {
    throw new Error("ID de grupo es requerido");
  }

  // Validar datos requeridos
  if (!group.categoryId || !group.name) {
    throw new Error("categoryId y name son requeridos");
  }

  // Preparar datos para actualizar
  const updateData = {
    category_id: group.categoryId,
    name: group.name.trim(),
    pair_ids: group.pairIds,
  };

  console.log("updateGroup: Updating group with ID:", id, "Data:", updateData);

  const { data, error } = await supabase
    .from("groups")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating group:", error);
    console.error("Error details:", {
      message: error.message || "No message",
      details: error.details || "No details",
      hint: error.hint || "No hint",
      code: error.code || "No code",
    });
    throw error;
  }

  console.log("updateGroup: Successfully updated group:", data);

  // Convertir snake_case a camelCase para TypeScript
  const updatedGroup: Group = {
    id: data.id,
    categoryId: data.category_id,
    name: data.name,
    pairIds: data.pair_ids || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return updatedGroup;
}

export async function updatePair(
  id: string,
  pair: Omit<Pair, "id" | "createdAt" | "updatedAt">
): Promise<Pair> {
  if (!id || id.trim() === "") {
    throw new Error("ID de pareja es requerido");
  }

  // Validar datos requeridos
  if (!pair.tournamentId || !pair.categoryId) {
    throw new Error("tournamentId y categoryId son requeridos");
  }

  if (!pair.player1?.name || !pair.player2?.name) {
    throw new Error("Los nombres de ambos jugadores son requeridos");
  }

  // Preparar datos para actualizar
  const updateData = {
    tournament_id: pair.tournamentId,
    category_id: pair.categoryId,
    player1: {
      name: pair.player1.name.trim(),
      phone: pair.player1.phone?.trim() || null,
    },
    player2: {
      name: pair.player2.name.trim(),
      phone: pair.player2.phone?.trim() || null,
    },
    seed: pair.seed || null, // Incluir el seed en la actualización
    group_id: pair.groupId || null, // Incluir el groupId en la actualización
  };

  console.log("updatePair: Updating pair with ID:", id, "Data:", updateData);

  const { data, error } = await supabase
    .from("pairs")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating pair:", error);
    console.error("Error details:", {
      message: error.message || "Unknown error",
      details: error.details || "No details available",
      hint: error.hint || "No hint available",
      code: error.code || "No code available",
    });
    throw error;
  }

  // Convertir snake_case a camelCase para TypeScript
  const pairData = {
    id: data.id,
    tournamentId: data.tournament_id || pair.tournamentId,
    categoryId: data.category_id,
    player1: {
      name: data.player1?.name || "",
      phone: data.player1?.phone || "",
    },
    player2: {
      name: data.player2?.name || "",
      phone: data.player2?.phone || "",
    },
    seed: data.seed || pair.seed || 1, // Usar el seed de la BD o el proporcionado
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  console.log("updatePair: Successfully updated pair:", pairData);
  return pairData;
}

// ============================================================================
// UTILITIES
// ============================================================================

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[áäâà]/g, "a")
    .replace(/[éëêè]/g, "e")
    .replace(/[íïîì]/g, "i")
    .replace(/[óöôò]/g, "o")
    .replace(/[úüûù]/g, "u")
    .replace(/[ñ]/g, "n")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ============================================================================
// GROUPS
// ============================================================================

export async function getGroups(categoryId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("category_id", categoryId)
    .order("name");

  if (error) {
    console.error("Error fetching groups:", error);
    throw error;
  }

  // Convertir snake_case a camelCase
  return data.map((group) => ({
    id: group.id,
    categoryId: group.category_id,
    name: group.name,
    pairIds: group.pair_ids || [],
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  }));
}

export async function createGroups(
  groups: Omit<Group, "id" | "createdAt" | "updatedAt">[]
): Promise<Group[]> {
  // Primero, limpiar grupos existentes de la categoría para evitar duplicados
  if (groups.length > 0) {
    await deleteGroups(groups[0].categoryId);
  }

  // Convertir camelCase a snake_case para la base de datos
  const dbGroups = groups.map((group) => ({
    category_id: group.categoryId,
    name: group.name,
    pair_ids: group.pairIds,
  }));

  const { data, error } = await supabase
    .from("groups")
    .insert(dbGroups)
    .select("*");

  if (error) {
    console.error("Error creating groups:", error);
    throw error;
  }

  // Convertir snake_case a camelCase
  return data.map((group) => ({
    id: group.id,
    categoryId: group.category_id,
    name: group.name,
    pairIds: group.pair_ids || [],
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  }));
}

export async function deleteGroups(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("category_id", categoryId);

  if (error) {
    console.error("Error deleting groups:", error);
    throw error;
  }
}

// Algoritmo para generar grupos balanceados
export function generateBalancedGroups(
  pairs: Pair[],
  maxGroupSize: number = 3
): Omit<Group, "id" | "createdAt" | "updatedAt">[] {
  // Filtrar parejas únicas por ID para evitar duplicados
  const uniquePairs = pairs.filter(
    (pair, index, self) => index === self.findIndex((p) => p.id === pair.id)
  );

  const sortedPairs = [...uniquePairs].sort(
    (a, b) => (a.seed || 0) - (b.seed || 0)
  );
  const numGroups = Math.ceil(sortedPairs.length / maxGroupSize);
  const groups: Omit<Group, "id" | "createdAt" | "updatedAt">[] = [];

  console.log(
    `Generando ${numGroups} grupos con ${sortedPairs.length} parejas únicas`
  );

  // Inicializar grupos vacíos
  for (let i = 0; i < numGroups; i++) {
    groups.push({
      categoryId: pairs[0]?.categoryId || "",
      name: `Grupo ${String.fromCharCode(65 + i)}`, // A, B, C, etc.
      pairIds: [],
    });
  }

  // Distribuir parejas de forma balanceada (serpiente)
  let currentGroup = 0;
  let direction = 1; // 1 = forward, -1 = backward

  for (const pair of sortedPairs) {
    groups[currentGroup].pairIds.push(pair.id);
    console.log(
      `Pareja ${pair.id} (Ranking ${pair.seed}) → ${groups[currentGroup].name}`
    );

    currentGroup += direction;

    // Cambiar dirección al llegar a los extremos
    if (currentGroup >= numGroups) {
      currentGroup = numGroups - 1;
      direction = -1;
    } else if (currentGroup < 0) {
      currentGroup = 0;
      direction = 1;
    }
  }

  return groups;
}

// Función para actualizar resultado de un partido
export async function updateMatchResult(
  matchId: string,
  scorePairA: {
    set1?: number;
    set2?: number;
    set3?: number;
    superDeath?: number;
  },
  scorePairB: {
    set1?: number;
    set2?: number;
    set3?: number;
    superDeath?: number;
  },
  winnerPairId: string
): Promise<Match> {
  // Calcular sets ganados por cada pareja
  let pairASets = 0;
  let pairBSets = 0;
  let hasEmpate = false;

  // Solo contar sets que estén completos
  if (scorePairA.set1 !== undefined && scorePairB.set1 !== undefined) {
    if (scorePairA.set1 > scorePairB.set1) pairASets++;
    else if (scorePairB.set1 > scorePairA.set1) pairBSets++;
    else hasEmpate = true; // Empate en games (4-4, 5-5, etc.)
  }
  if (scorePairA.set2 !== undefined && scorePairB.set2 !== undefined) {
    if (scorePairA.set2 > scorePairB.set2) pairASets++;
    else if (scorePairB.set2 > scorePairA.set2) pairBSets++;
    else hasEmpate = true; // Empate en games
  }
  if (scorePairA.set3 !== undefined && scorePairB.set3 !== undefined) {
    if (scorePairA.set3 > scorePairB.set3) pairASets++;
    else if (scorePairB.set3 > scorePairA.set3) pairBSets++;
    else hasEmpate = true; // Empate en games
  }

  console.log("🔍 Actualizando partido con ID:", matchId);
  console.log("🔍 Score PairA:", scorePairA);
  console.log("🔍 Score PairB:", scorePairB);
  console.log("🔍 Winner Pair ID:", winnerPairId);
  console.log("🔍 Sets calculados - PairA:", pairASets, "PairB:", pairBSets);

  // Los empates son válidos en torneos relámpago por límite de tiempo

  // Limpiar objetos para eliminar valores undefined que causan constraint violations
  const cleanObject = (obj: any) => {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined && obj[key] !== null) {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  };

  const cleanedScorePairA = cleanObject(scorePairA);
  const cleanedScorePairB = cleanObject(scorePairB);

  // Crear el objeto score en el formato correcto para la base de datos
  const scoreObject: any = {
    pairA: cleanedScorePairA,
    pairB: cleanedScorePairB,
    winner: winnerPairId,
    sets: []
  };

  // Agregar solo los sets que fueron jugados
  if (cleanedScorePairA.set1 !== undefined && cleanedScorePairB.set1 !== undefined) {
    scoreObject.sets.push({
      a: cleanedScorePairA.set1,
      b: cleanedScorePairB.set1
    });
  }
  if (cleanedScorePairA.set2 !== undefined && cleanedScorePairB.set2 !== undefined) {
    scoreObject.sets.push({
      a: cleanedScorePairA.set2,
      b: cleanedScorePairB.set2
    });
  }

  // Agregar set3 si existe
  if (cleanedScorePairA.set3 !== undefined && cleanedScorePairB.set3 !== undefined) {
    scoreObject.sets.push({
      a: cleanedScorePairA.set3,
      b: cleanedScorePairB.set3
    });
  }

  // Limpiar el objeto para eliminar valores undefined
  const cleanScoreObject = (obj: any) => {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined && obj[key] !== null) {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  };

  const finalScoreObject = cleanScoreObject(scoreObject);

  console.log("🔍 Score object final limpio:", finalScoreObject);
  console.log("🔍 Winner ID que se va a guardar:", winnerPairId);
  console.log("🔍 Match ID que se va a actualizar:", matchId);

  const { data, error } = await supabase
    .from("matches")
    .update({
      score: finalScoreObject,
      status: "completed",
      winner_id: winnerPairId,
    })
    .eq("id", matchId)
    .select("*")
    .single();

  if (error) {
    console.error("❌ Error updating match result:", error);
    console.error("❌ Error details:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }

  console.log("✅ Partido actualizado exitosamente:", data);
  console.log("✅ Winner ID que devolvió la DB:", data.winner_id);

  // Convertir snake_case a camelCase
  const updatedMatch = {
    id: data.id,
    tournamentId: data.tournament_id,
    categoryId: data.category_id,
    stage: data.stage,
    groupId: data.group_id,
    pairAId: data.pair_a_id,
    pairBId: data.pair_b_id,
    day: data.day,
    startTime: data.start_time,
    courtId: data.court_id,
    status: data.status,
    score: data.score || null,
    winnerPairId: data.winner_id || data.score?.winnerPairId || null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  // Si es un partido de eliminatorias, verificar si se debe generar la siguiente ronda
  if (
    ["quarterfinals", "semifinals", "quarterfinal", "semifinal", "final", "third_place"].includes(data.stage)
  ) {
    console.log(
      "🔄 Verificando si se debe generar la siguiente ronda de eliminatorias..."
    );
    console.log("🔍 Stage del partido:", data.stage);
    console.log("🔍 Category ID:", data.category_id);
    console.log("🔍 Tournament ID:", data.tournament_id);
    try {
      const generatedMatches = await checkAndGenerateNextRound(data.category_id, data.tournament_id);
      if (generatedMatches.length > 0) {
        console.log("🎉 ¡Se generaron", generatedMatches.length, "nuevos partidos!");
      } else {
        console.log("⏳ Aún no se puede generar la siguiente ronda");
      }
    } catch (error) {
      console.error(
        "⚠️ Error verificando siguiente ronda (no crítico):",
        error
      );
      // No lanzamos el error porque el resultado ya se guardó correctamente
    }
  }

  return updatedMatch;
}

// ============================================================================
// MATCHES
// ============================================================================

export async function getMatches(groupId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at");

  if (error) {
    console.error("Error fetching matches:", error);
    throw error;
  }

  // Convertir snake_case a camelCase
  return data.map((match) => ({
    id: match.id,
    tournamentId: match.tournament_id,
    categoryId: match.category_id,
    stage: match.stage,
    groupId: match.group_id,
    pairAId: match.pair_a_id,
    pairBId: match.pair_b_id,
    day: match.day,
    startTime: match.start_time,
    courtId: match.court_id,
    status: match.status,
    // ✅ ARREGLADO: Usar los datos del campo score JSON
    scorePairA: match.score?.pairA || null,
    scorePairB: match.score?.pairB || null,
    winnerPairId: match.score?.winner || match.winner_id || null,
    // 🆕 NUEVO: Pasar también el campo score completo
    score: match.score || null,
    createdAt: match.created_at,
    updatedAt: match.updated_at,
  }));
}

// 🆕 Nueva función: Obtener TODOS los partidos de una categoría (grupos + knockout)
export async function getAllMatchesByCategory(
  categoryId: string
): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("category_id", categoryId)
    .order("created_at");

  if (error) {
    console.error("Error fetching all matches by category:", error);
    throw error;
  }

  // Convertir snake_case a camelCase
  return (data || []).map((match) => ({
    id: match.id,
    tournamentId: match.tournament_id,
    categoryId: match.category_id,
    stage: match.stage,
    groupId: match.group_id,
    pairAId: match.pair_a_id,
    pairBId: match.pair_b_id,
    day: match.day,
    startTime: match.start_time,
    courtId: match.court_id,
    status: match.status,
    // ✅ ARREGLADO: Usar los datos del campo score JSON
    scorePairA: match.score?.pairA || null,
    scorePairB: match.score?.pairB || null,
    winnerPairId: match.score?.winner || match.winner_pair_id || null,
    // 🆕 NUEVO: Pasar también el campo score completo para debugging
    score: match.score || null,
    createdAt: match.created_at,
    updatedAt: match.updated_at,
  }));
}

export async function createMatches(
  matches: Omit<Match, "id" | "createdAt" | "updatedAt">[],
  skipDelete = false
): Promise<Match[]> {
  // Primero, limpiar partidos existentes del grupo para evitar duplicados
  // Solo si no se especifica skipDelete (para evitar eliminar dos veces)
  if (!skipDelete && matches.length > 0 && matches[0].groupId) {
    await deleteMatches(matches[0].groupId);
  }

  // Convertir camelCase a snake_case para la base de datos
  // Solo usar columnas que realmente existen en el esquema de Supabase
  const dbMatches = matches.map((match) => {
    // Validar que todos los campos requeridos estén presentes
    if (!match.tournamentId || match.tournamentId === "") {
      console.error("❌ tournamentId inválido:", match.tournamentId);
      throw new Error("tournamentId es requerido y no puede estar vacío");
    }
    if (!match.categoryId || match.categoryId === "") {
      console.error("❌ categoryId inválido:", match.categoryId);
      throw new Error("categoryId es requerido y no puede estar vacío");
    }
    if (!match.stage) {
      console.error("❌ stage inválido:", match.stage);
      throw new Error("stage es requerido y no puede estar vacío");
    }
    if (!match.pairAId || match.pairAId === "") {
      console.error("❌ pairAId inválido:", match.pairAId);
      throw new Error("pairAId es requerido y no puede estar vacío");
    }
    if (!match.pairBId || match.pairBId === "") {
      console.error("❌ pairBId inválido:", match.pairBId);
      throw new Error("pairBId es requerido y no puede estar vacío");
    }
    
    return {
      tournament_id: match.tournamentId,
      category_id: match.categoryId,
      group_id: match.groupId || null,
      stage: match.stage,
      pair_a_id: match.pairAId,
      pair_b_id: match.pairBId,
      day: match.day || null,
      start_time: match.startTime || null,
      court_id: match.courtId || null,
      status: match.status || "pending",
      score:
        match.scorePairA && match.scorePairB
          ? {
              pairA: match.scorePairA,
              pairB: match.scorePairB,
              winner: match.winnerPairId,
            }
          : null,
    };
  });

  // Debug: Mostrar TODOS los datos que se envían a la BD
  console.log("🔍 Datos completos que se envían a Supabase:", dbMatches);
  console.log("🔍 Valores de stage específicos:", dbMatches.map(m => m.stage));
  console.log("🔍 Tipos de stage:", dbMatches.map(m => typeof m.stage));
  
  // Debug: Verificar valores específicos
  dbMatches.forEach((match, index) => {
    console.log(`🔍 Match ${index + 1}:`, {
      tournament_id: match.tournament_id,
      category_id: match.category_id,
      stage: match.stage,
      pair_a_id: match.pair_a_id,
      pair_b_id: match.pair_b_id,
      status: match.status
    });
  });

  // Validar que todos los campos requeridos estén presentes antes de enviar
  const validStages = ['groups', 'quarterfinal', 'semifinal', 'final', 'third_place'];
  dbMatches.forEach((match, index) => {
    if (!validStages.includes(match.stage)) {
      console.error(`❌ Stage inválido en match ${index + 1}:`, match.stage);
      console.error(`❌ Valores permitidos:`, validStages);
      throw new Error(`Stage inválido: ${match.stage}. Valores permitidos: ${validStages.join(', ')}`);
    }
    if (!match.tournament_id) {
      console.error(`❌ Tournament ID faltante en match ${index + 1}:`, match.tournament_id);
      throw new Error(`Tournament ID es requerido`);
    }
    if (!match.category_id) {
      console.error(`❌ Category ID faltante en match ${index + 1}:`, match.category_id);
      throw new Error(`Category ID es requerido`);
    }
  });

  // Usar los stages originales - ya no necesitamos forzar 'groups'
  console.log("🔧 Usando stages originales para eliminatorias");
  
  // Mantener los stages originales para partidos de eliminatorias
  const fixedMatches = dbMatches.map(match => {
    // Solo cambiar a 'groups' si es realmente un partido de grupos
    if (match.stage === 'groups' || (!match.group_id && ['quarterfinal', 'semifinal', 'final', 'third_place'].includes(match.stage))) {
      return match; // Mantener el stage original
    }
    // Para otros casos, usar 'groups' como fallback
    return {
      ...match,
      stage: 'groups'
    };
  });
  
  console.log("🔍 Matches corregidos:", fixedMatches);
  
  const { data, error } = await supabase
    .from("matches")
    .insert(fixedMatches)
    .select("*");

  if (error) {
    console.error("❌ Error creating matches:", error);
    console.error("❌ Error details:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }

  console.log("✅ Matches creados exitosamente:", data);

  // Convertir snake_case a camelCase
  return data.map((match) => ({
    id: match.id,
    tournamentId: match.tournament_id,
    categoryId: match.category_id,
    stage: match.stage,
    groupId: match.group_id,
    pairAId: match.pair_a_id,
    pairBId: match.pair_b_id,
    day: match.day,
    startTime: match.start_time,
    courtId: match.court_id,
    status: match.status,
    scorePairA: match.score_pair_a,
    scorePairB: match.score_pair_b,
    winnerPairId: match.winner_pair_id,
    createdAt: match.created_at,
    updatedAt: match.updated_at,
  }));
}

export async function deleteMatches(groupId: string): Promise<void> {
  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("group_id", groupId);

  if (error) {
    console.error("Error deleting matches:", error);
    throw error;
  }
}

// Función para limpiar TODOS los partidos de fase de grupos de una categoría
export async function deleteAllGroupMatches(categoryId: string): Promise<void> {
  console.log(
    "🗑️ Limpiando todos los partidos de grupos para la categoría:",
    categoryId
  );

  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("category_id", categoryId)
    .eq("stage", "groups");

  if (error) {
    console.error("Error deleting all group matches:", error);
    throw error;
  }

  console.log("✅ Partidos de grupos eliminados correctamente");
}

// Función para limpiar TODAS las eliminatorias de una categoría
export async function deleteAllKnockoutMatches(
  categoryId: string
): Promise<void> {
  console.log(
    "🗑️ Limpiando todas las eliminatorias para la categoría:",
    categoryId
  );

  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("category_id", categoryId)
    .in("stage", ["quarterfinals", "semifinals", "final", "third_place"]);

  if (error) {
    console.error("Error deleting all knockout matches:", error);
    throw error;
  }

  console.log("✅ Eliminatorias eliminadas correctamente");
}

// Función para limpiar TODOS los partidos de una categoría (grupos + eliminatorias)
export async function deleteAllCategoryMatches(
  categoryId: string
): Promise<void> {
  console.log(
    "🗑️🧹 RESET COMPLETO - Limpiando TODOS los partidos de la categoría:",
    categoryId
  );

  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("category_id", categoryId);

  if (error) {
    console.error("Error deleting all category matches:", error);
    throw error;
  }

  console.log(
    "✅ TODOS los partidos eliminados correctamente (grupos + eliminatorias)"
  );
}

// ============================================================================
// DYNAMIC BRACKET SIZING
// ============================================================================

// Función INFINITA para calcular cuántas parejas avanzan de la fase de grupos
// Funciona para cualquier número de grupos: 2, 5, 10, 50, 100, etc.
export function calculateAdvancingPairs(groups: Group[]): {
  totalAdvancing: number;
  bracketSize: number;
  firstPlaces: number;
  bestSecondPlaces: number;
  stages: string[];
} {
  const totalGroups = groups.length;

  if (totalGroups === 0) {
    return {
      totalAdvancing: 0,
      bracketSize: 0,
      firstPlaces: 0,
      bestSecondPlaces: 0,
      stages: [],
    };
  }

  // NUEVA LÓGICA: Siempre clasifican los 2 mejores de cada grupo
  const firstPlaces = totalGroups; // 1º lugar de cada grupo
  const secondPlaces = totalGroups; // 2º lugar de cada grupo
  const totalAdvancing = firstPlaces + secondPlaces; // Total = 2 * número de grupos

  // ALGORITMO DINÁMICO: Encontrar el bracket size óptimo para TODOS los clasificados
  let bracketSize = calculateOptimalBracketSize(totalAdvancing);

  // Los "mejores segundos" son TODOS los segundos lugares (ya que todos clasifican)
  const bestSecondPlaces = secondPlaces;

  // GENERADOR DINÁMICO DE ETAPAS: Funciona para cualquier bracket size
  const stages = generateStagesForBracketSize(bracketSize);

  console.log(`📊 BRACKET DINÁMICO INFINITO calculado:
    🏟️  Grupos: ${totalGroups}
    🥇 Primeros lugares: ${firstPlaces}
    🥈 Segundos lugares: ${bestSecondPlaces}
    👥 Total que avanzan: ${totalAdvancing} (2 por grupo)
    🏆 Tamaño del bracket: ${bracketSize}
    🎯 Etapas: ${stages.join(" → ")}
    📏 Número de rondas: ${Math.log2(bracketSize)}`);

  return {
    totalAdvancing,
    bracketSize,
    firstPlaces,
    bestSecondPlaces,
    stages,
  };
}

/**
 * Calcula el bracket size óptimo (siguiente potencia de 2) para cualquier número de equipos
 */
function calculateOptimalBracketSize(numTeams: number): number {
  if (numTeams <= 0) return 0;
  if (numTeams === 1) return 2; // Mínimo bracket válido

  // Encontrar la siguiente potencia de 2 mayor o igual al número de equipos
  let bracketSize = 1;
  while (bracketSize < numTeams) {
    bracketSize *= 2;
  }

  return bracketSize;
}

/**
 * Genera las etapas dinámicamente basado en el bracket size
 * Funciona para brackets de cualquier tamaño: 4, 8, 16, 32, 64, 128, 256, etc.
 */
function generateStagesForBracketSize(bracketSize: number): string[] {
  const stages: string[] = [];

  // Mapeo de bracket sizes a nombres de etapas
  const stageNames: { [key: number]: string } = {
    256: "round_of_256",
    128: "round_of_128",
    64: "round_of_64",
    32: "round_of_32",
    16: "round_of_16",
    8: "quarterfinals",
    4: "semifinals",
    2: "final",
  };

  // Generar etapas en orden descendente
  let currentSize = bracketSize;
  while (currentSize >= 2) {
    const stageName = stageNames[currentSize] || `round_of_${currentSize}`;
    stages.push(stageName);
    currentSize = currentSize / 2;
  }

  return stages;
}

// Función para obtener las parejas que avanzan a eliminatorias CON ESTADÍSTICAS COMPLETAS
export async function getAdvancingPairsWithStats(categoryId: string): Promise<{
  advancingPairs: Array<{
    pair: Pair;
    seed: number;
    position: string;
    groupStanding: {
      points: number;
      matchesPlayed: number;
      matchesWon: number;
      matchesLost: number;
      setsWon: number;
      setsLost: number;
      setsDiff: number;
      gamesWon: number;
      gamesLost: number;
      gamesDiff: number;
      groupPosition: number;
      groupName: string;
    };
  }>;
  bracketInfo: ReturnType<typeof calculateAdvancingPairs>;
}> {
  // Obtener grupos y standings
  const groups = await getGroups(categoryId);
  const allPairs = await getPairs(categoryId);
  const standings = await calculateStandings(categoryId, allPairs);

  const bracketInfo = calculateAdvancingPairs(groups);

  if (bracketInfo.totalAdvancing === 0) {
    return { advancingPairs: [], bracketInfo };
  }

  // 🔥 VALIDACIÓN CRÍTICA: Verificar que hay partidos jugados en los grupos
  let hasPlayedMatches = false;
  for (const group of groups) {
    const groupMatches = await getMatches(group.id);
    const finishedMatches = groupMatches.filter(
      (match) => match.status === "completed"
    );

    if (finishedMatches.length > 0) {
      hasPlayedMatches = true;
      break;
    }
  }

  // Si no hay partidos jugados, NO generar parejas clasificadas
  if (!hasPlayedMatches) {
    console.log(
      "❌ No se pueden generar parejas clasificadas: No hay partidos jugados en la fase de grupos"
    );
    return { advancingPairs: [], bracketInfo };
  }

  // Separar por posición en grupo CON ESTADÍSTICAS COMPLETAS
  const firstPlaces: Array<{
    pair: Pair;
    points: number;
    setsDiff: number;
    gamesDiff: number;
    position: number;
    fullStats: any;
    groupName: string;
  }> = [];
  const secondPlaces: Array<{
    pair: Pair;
    points: number;
    setsDiff: number;
    gamesDiff: number;
    position: number;
    fullStats: any;
    groupName: string;
  }> = [];

  console.log(
    `🔍 DEBUG: Analizando ${groups.length} grupos para clasificación`
  );
  console.log(`🏆 Bracket info:`, bracketInfo);

  // Obtener standings por grupo individual
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    const groupName = `Grupo ${String.fromCharCode(65 + groupIndex)}`; // A, B, C...

    const groupPairs = allPairs.filter((pair) =>
      group.pairIds.includes(pair.id)
    );
    const groupStandings = await calculateStandings(group.id, groupPairs);

    console.log(
      `📊 ${groupName}: ${groupPairs.length} parejas, ${groupStandings.length} standings`
    );

    // Ordenar por criterios CORRECTOS de desempate
    const sorted = groupStandings.sort((a, b) => {
      // 1º Puntos (mayor es mejor)
      if (b.points !== a.points) return b.points - a.points;
      
      // 1er criterio de desempate: Diferencia de sets (mayor es mejor)
      if (b.setsDifference !== a.setsDifference) return b.setsDifference - a.setsDifference;
      
      // 2do criterio de desempate: Diferencia de games (mayor es mejor)
      if (b.gamesDifference !== a.gamesDifference) return b.gamesDifference - a.gamesDifference;
      
      // 3er criterio de desempate: Encuentro directo (si son del mismo grupo)
      // Por ahora mantenemos orden alfabético como último criterio
      if (a.pairName < b.pairName) return -1;
      if (a.pairName > b.pairName) return 1;
      
      return 0;
    });

    console.log(
      `🏅 ${groupName} resultados:`,
      sorted.map((s) => `${s.pairId} - ${s.points} pts`)
    );

    if (sorted[0]) {
      const firstPair = allPairs.find((p) => p.id === sorted[0].pairId);
      if (firstPair) {
        firstPlaces.push({
          pair: firstPair,
          points: sorted[0].points,
          setsDiff: sorted[0].setsDifference,
          gamesDiff: sorted[0].gamesDifference,
          position: 1,
          fullStats: sorted[0],
          groupName,
        });
      }
    }

    if (sorted[1]) {
      const secondPair = allPairs.find((p) => p.id === sorted[1].pairId);
      if (secondPair) {
        secondPlaces.push({
          pair: secondPair,
          points: sorted[1].points,
          setsDiff: sorted[1].setsDifference,
          gamesDiff: sorted[1].gamesDifference,
          position: 2,
          fullStats: sorted[1],
          groupName,
        });
      }
    }
  }

  // NUEVO ALGORITMO: Combinar TODOS los clasificados y ordenarlos globalmente por rendimiento
  const allQualified: Array<{
    pair: Pair;
    points: number;
    setsDiff: number;
    gamesDiff: number;
    position: number;
    fullStats: any;
    groupName: string;
  }> = [];

  // Agregar todos los primeros lugares
  allQualified.push(...firstPlaces);

  // Agregar solo los mejores segundos lugares que clasifican
  const selectedSecondPlaces = secondPlaces.slice(
    0,
    bracketInfo.bestSecondPlaces
  );
  allQualified.push(...selectedSecondPlaces);

  console.log(`🔍 RESUMEN ANTES DEL ORDENAMIENTO:`);
  console.log(`   👥 Primeros lugares encontrados: ${firstPlaces.length}`);
  console.log(`   👥 Segundos lugares disponibles: ${secondPlaces.length}`);
  console.log(
    `   👥 Segundos lugares que clasifican: ${selectedSecondPlaces.length}`
  );
  console.log(`   👥 Total clasificados: ${allQualified.length}`);

  // ORDENAMIENTO GLOBAL por criterios CORRECTOS de desempate
  allQualified.sort((a, b) => {
    // 1º Puntos (mayor es mejor)
    if (b.points !== a.points) return b.points - a.points;

    // 1er criterio de desempate: Diferencia de sets (mayor es mejor)
    if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;

    // 2do criterio de desempate: Diferencia de games (mayor es mejor)
    if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;

    // 3er criterio de desempate: Encuentro directo (si son del mismo grupo)
    // Por ahora mantenemos orden alfabético como último criterio
    if (a.pair.player1.name < b.pair.player1.name) return -1;
    if (a.pair.player1.name > b.pair.player1.name) return 1;

    return 0;
  });

  // Crear array con el seeding correcto basado en rendimiento GLOBAL
  const seededAdvancing: Array<{
    pair: Pair;
    seed: number;
    position: string;
    groupStanding: {
      points: number;
      matchesPlayed: number;
      matchesWon: number;
      matchesLost: number;
      setsWon: number;
      setsLost: number;
      setsDiff: number;
      gamesWon: number;
      gamesLost: number;
      gamesDiff: number;
      groupPosition: number;
      groupName: string;
    };
  }> = [];

  // Asignar seeds basado en el ordenamiento global de rendimiento
  allQualified.forEach((qualified, index) => {
    const seed = index + 1; // Seed 1 = mejor rendimiento, Seed 2 = segundo mejor, etc.
    const positionText =
      qualified.position === 1
        ? `1º lugar - ${qualified.points} pts`
        : `2º lugar - ${qualified.points} pts`;

    seededAdvancing.push({
      pair: qualified.pair,
      seed,
      position: positionText,
      groupStanding: {
        points: qualified.fullStats.points,
        matchesPlayed: qualified.fullStats.matchesPlayed,
        matchesWon: qualified.fullStats.matchesWon,
        matchesLost: qualified.fullStats.matchesLost,
        setsWon: qualified.fullStats.setsWon,
        setsLost: qualified.fullStats.setsLost,
        setsDiff: qualified.fullStats.setsDifference,
        gamesWon: qualified.fullStats.gamesWon,
        gamesLost: qualified.fullStats.gamesLost,
        gamesDiff: qualified.fullStats.gamesDifference,
        groupPosition: qualified.position,
        groupName: qualified.groupName,
      },
    });
  });

  // Log detallado del seeding GLOBAL
  console.log(`🏆 SEEDING GLOBAL POR RENDIMIENTO (NO POR POSICIÓN EN GRUPO):`);
  console.log(`📊 Información del bracket:`, bracketInfo);
  console.log(`🎯 ORDEN FINAL DE CLASIFICADOS (mejor a peor):`);

  seededAdvancing.forEach((qualified, index) => {
    console.log(
      `  🏅 Seed ${qualified.seed}: ${qualified.pair.player1.name}/${qualified.pair.player2.name}`
    );
    console.log(
      `     📊 Stats: ${qualified.groupStanding.points} pts | Sets: ${
        qualified.groupStanding.setsDiff > 0 ? "+" : ""
      }${qualified.groupStanding.setsDiff} | Games: ${
        qualified.groupStanding.gamesDiff > 0 ? "+" : ""
      }${qualified.groupStanding.gamesDiff}`
    );
    console.log(
      `     📍 Origen: ${qualified.groupStanding.groupName} (${qualified.groupStanding.groupPosition}º lugar)`
    );
    console.log(
      `     ⚔️  Vs: Seed ${
        seededAdvancing.length + 1 - qualified.seed
      } en eliminatorias`
    );
    console.log("");
  });

  console.log(`🎯 ENFRENTAMIENTOS DE PRIMERA RONDA:`);
  for (let i = 0; i < seededAdvancing.length; i += 2) {
    const pair1 = seededAdvancing[i];
    const pair2 = seededAdvancing[seededAdvancing.length - 1 - i];
    if (pair2) {
      console.log(
        `  🥊 Seed ${pair1.seed} (${pair1.pair.player1.name}/${pair1.pair.player2.name}) vs Seed ${pair2.seed} (${pair2.pair.player1.name}/${pair2.pair.player2.name})`
      );
    }
  }

  return { advancingPairs: seededAdvancing, bracketInfo };
}

// Función para obtener las parejas que avanzan a eliminatorias (VERSIÓN SIMPLE)
export async function getAdvancingPairs(categoryId: string): Promise<{
  advancingPairs: Pair[];
  bracketInfo: ReturnType<typeof calculateAdvancingPairs>;
}> {
  // Obtener grupos y standings
  const groups = await getGroups(categoryId);
  const allPairs = await getPairs(categoryId);
  const standings = await calculateStandings(categoryId, allPairs);

  const bracketInfo = calculateAdvancingPairs(groups);

  if (bracketInfo.totalAdvancing === 0) {
    return { advancingPairs: [], bracketInfo };
  }

  // 🔥 VALIDACIÓN CRÍTICA: Verificar que hay partidos jugados en los grupos
  let hasPlayedMatches = false;
  for (const group of groups) {
    const groupMatches = await getMatches(group.id);
    const finishedMatches = groupMatches.filter(
      (match) => match.status === "completed"
    );

    if (finishedMatches.length > 0) {
      hasPlayedMatches = true;
      break;
    }
  }

  // Si no hay partidos jugados, NO generar parejas clasificadas
  if (!hasPlayedMatches) {
    console.log(
      "❌ No se pueden generar parejas clasificadas: No hay partidos jugados en la fase de grupos"
    );
    return { advancingPairs: [], bracketInfo };
  }

  // Separar por posición en grupo
  const firstPlaces: Array<{
    pair: Pair;
    points: number;
    setsDiff: number;
    gamesDiff: number;
    position: number;
  }> = [];
  const secondPlaces: Array<{
    pair: Pair;
    points: number;
    setsDiff: number;
    gamesDiff: number;
    position: number;
  }> = [];

  // Obtener standings por grupo individual
  for (const group of groups) {
    const groupPairs = allPairs.filter((pair) =>
      group.pairIds.includes(pair.id)
    );
    const groupStandings = await calculateStandings(group.id, groupPairs);

    // Ordenar por criterios CORRECTOS de desempate
    const sorted = groupStandings.sort((a, b) => {
      // 1º Puntos (mayor es mejor)
      if (b.points !== a.points) return b.points - a.points;
      
      // 1er criterio de desempate: Diferencia de sets (mayor es mejor)
      if (b.setsDifference !== a.setsDifference) return b.setsDifference - a.setsDifference;
      
      // 2do criterio de desempate: Diferencia de games (mayor es mejor)
      if (b.gamesDifference !== a.gamesDifference) return b.gamesDifference - a.gamesDifference;
      
      // 3er criterio de desempate: Encuentro directo (si son del mismo grupo)
      // Por ahora mantenemos orden alfabético como último criterio
      if (a.pairName < b.pairName) return -1;
      if (a.pairName > b.pairName) return 1;
      
      return 0;
    });

    if (sorted[0]) {
      const firstPair = allPairs.find((p) => p.id === sorted[0].pairId);
      if (firstPair) {
        firstPlaces.push({
          pair: firstPair,
          points: sorted[0].points,
          setsDiff: sorted[0].setsDifference,
          gamesDiff: sorted[0].gamesDifference,
          position: 1,
        });
      }
    }

    if (sorted[1]) {
      const secondPair = allPairs.find((p) => p.id === sorted[1].pairId);
      if (secondPair) {
        secondPlaces.push({
          pair: secondPair,
          points: sorted[1].points,
          setsDiff: sorted[1].setsDifference,
          gamesDiff: sorted[1].gamesDifference,
          position: 2,
        });
      }
    }
  }

  // Ordenar primeros lugares por criterios CORRECTOS de desempate
  firstPlaces.sort((a, b) => {
    // 1º Puntos (mayor es mejor)
    if (b.points !== a.points) return b.points - a.points;
    
    // 1er criterio de desempate: Sets ganados (mayor es mejor)
    if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
    
    // 2do criterio de desempate: Games acumulados en los juegos (mayor es mejor)
    return b.gamesDiff - a.gamesDiff;
  });

  // Ordenar segundos lugares por criterios CORRECTOS de desempate
  secondPlaces.sort((a, b) => {
    // 1º Puntos (mayor es mejor)
    if (b.points !== a.points) return b.points - a.points;
    
    // 1er criterio de desempate: Sets ganados (mayor es mejor)
    if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
    
    // 2do criterio de desempate: Games acumulados en los juegos (mayor es mejor)
    return b.gamesDiff - a.gamesDiff;
  });

  // Crear array con el seeding correcto: todos los primeros lugares primero, luego los mejores segundos
  const seededAdvancing: { pair: Pair; seed: number; position: string }[] = [];

  // Agregar primeros lugares (seeds 1, 2, 3, etc.)
  firstPlaces.forEach((fp, index) => {
    seededAdvancing.push({
      pair: fp.pair,
      seed: index + 1,
      position: `1º lugar - ${fp.points} pts`,
    });
  });

  // Agregar mejores segundos lugares (seeds siguientes)
  const selectedSecondPlaces = secondPlaces.slice(
    0,
    bracketInfo.bestSecondPlaces
  );
  selectedSecondPlaces.forEach((sp, index) => {
    seededAdvancing.push({
      pair: sp.pair,
      seed: firstPlaces.length + index + 1,
      position: `2º lugar - ${sp.points} pts`,
    });
  });

  const advancingPairs: Pair[] = seededAdvancing.map((sa) => sa.pair);

  // Log detallado del seeding
  console.log(`🏆 SEEDING DE ELIMINATORIAS GENERADO:`);
  console.log(`📊 Información del bracket:`, bracketInfo);
  console.log(`🥇 Primeros lugares (seeds 1-${firstPlaces.length}):`);
  seededAdvancing.slice(0, firstPlaces.length).forEach((sa, i) => {
    console.log(
      `  Seed ${sa.seed}: ${sa.pair.player1.name}/${sa.pair.player2.name} (${sa.position})`
    );
  });

  if (selectedSecondPlaces.length > 0) {
    console.log(
      `🥈 Mejores segundos lugares (seeds ${firstPlaces.length + 1}-${
        seededAdvancing.length
      }):`
    );
    seededAdvancing.slice(firstPlaces.length).forEach((sa, i) => {
      console.log(
        `  Seed ${sa.seed}: ${sa.pair.player1.name}/${sa.pair.player2.name} (${sa.position})`
      );
    });
  }

  console.log(`✅ Parejas que avanzan calculadas:
    - Primeros lugares: ${firstPlaces.length}
    - Mejores segundos: ${Math.min(
      secondPlaces.length,
      bracketInfo.bestSecondPlaces
    )}
    - Total: ${advancingPairs.length}`);

  return { advancingPairs, bracketInfo };
}

// ============================================================================
// CALENDAR & SCHEDULING
// ============================================================================

// Función para actualizar la programación de un partido
export async function updateMatchSchedule(
  matchId: string,
  day: string,
  startTime: string,
  courtId: string
): Promise<void> {
  // Si los valores están vacíos, limpiar la programación
  const updateData: any = {
    day: day || null,
    start_time: startTime || null,
    court_id: courtId || null,
  };

  // Determinar el status basado en si tiene programación
  if (day && startTime && courtId) {
    updateData.status = "scheduled";
  } else {
    updateData.status = "pending";
  }

  // 🐛 LOG CRÍTICO: Verificar qué datos se están enviando
  console.log(
    `🔄 updateMatchSchedule - Partido ${matchId}: ${day} ${startTime}`
  );

  const { error } = await supabase
    .from("matches")
    .update(updateData)
    .eq("id", matchId);

  if (error) {
    console.error("❌ Error updating match schedule:", error);
    throw error;
  }

  console.log(`   ✅ BD actualizada: ${day} ${startTime}`);

  if (day && startTime && courtId) {
    console.log(`✅ Programado: ${day} ${startTime} cancha ${courtId}`);
  } else {
    console.log(`🗑️ Horario limpiado para partido: ${matchId}`);
  }
}

// ============================================================================
// NOTIFICATIONS SYSTEM
// ============================================================================

import {
  Notification,
  NotificationPreferences,
  NotificationType,
} from "@/types";

// Crear notificación
export async function createNotification(
  userId: string,
  tournamentId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: any,
  scheduledFor?: string
): Promise<Notification> {
  const { data: notification, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      tournament_id: tournamentId,
      type,
      title,
      message,
      data,
      scheduled_for: scheduledFor,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating notification:", error);
    throw error;
  }

  // Convertir snake_case a camelCase
  return {
    id: notification.id,
    userId: notification.user_id,
    tournamentId: notification.tournament_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    isRead: notification.is_read,
    createdAt: notification.created_at,
    scheduledFor: notification.scheduled_for,
  };
}

// Obtener notificaciones de un usuario
export async function getUserNotifications(
  userId: string,
  tournamentId?: string,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (tournamentId) {
    query = query.eq("tournament_id", tournamentId);
  }

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }

  // Convertir snake_case a camelCase
  return data.map((notification) => ({
    id: notification.id,
    userId: notification.user_id,
    tournamentId: notification.tournament_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    isRead: notification.is_read,
    createdAt: notification.created_at,
    scheduledFor: notification.scheduled_for,
  }));
}

// Marcar notificación como leída
export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

// Marcar todas las notificaciones como leídas
export async function markAllNotificationsAsRead(
  userId: string,
  tournamentId?: string
): Promise<void> {
  let query = supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId);

  if (tournamentId) {
    query = query.eq("tournament_id", tournamentId);
  }

  const { error } = await query;

  if (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

// Eliminar notificación
export async function deleteNotification(
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
}

// Obtener preferencias de notificaciones
export async function getNotificationPreferences(
  userId: string,
  tournamentId: string
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("tournament_id", tournamentId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = not found
    console.error("Error fetching notification preferences:", error);
    throw error;
  }

  if (!data) return null;

  // Convertir snake_case a camelCase
  return {
    userId: data.user_id,
    tournamentId: data.tournament_id,
    enablePush: data.enable_push,
    enableEmail: data.enable_email,
    matchReminders: data.match_reminders,
    scheduleChanges: data.schedule_changes,
    results: data.results,
    tournamentUpdates: data.tournament_updates,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Crear o actualizar preferencias de notificaciones
export async function upsertNotificationPreferences(
  preferences: Partial<NotificationPreferences> & {
    userId: string;
    tournamentId: string;
  }
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert({
      user_id: preferences.userId,
      tournament_id: preferences.tournamentId,
      enable_push: preferences.enablePush ?? true,
      enable_email: preferences.enableEmail ?? true,
      match_reminders: preferences.matchReminders ?? true,
      schedule_changes: preferences.scheduleChanges ?? true,
      results: preferences.results ?? true,
      tournament_updates: preferences.tournamentUpdates ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error upserting notification preferences:", error);
    throw error;
  }

  // Convertir snake_case a camelCase
  return {
    userId: data.user_id,
    tournamentId: data.tournament_id,
    enablePush: data.enable_push,
    enableEmail: data.enable_email,
    matchReminders: data.match_reminders,
    scheduleChanges: data.schedule_changes,
    results: data.results,
    tournamentUpdates: data.tournament_updates,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ============================================================================
// NOTIFICATION HELPERS - Funciones específicas para crear notificaciones
// ============================================================================

// Notificar cuando se programa un partido
export async function notifyMatchScheduled(
  match: Match,
  pairA: Pair,
  pairB: Pair
): Promise<void> {
  const players = [pairA.player1, pairA.player2, pairB.player1, pairB.player2];

  const title = "Partido Programado";
  const message = `Tu partido está programado para ${match.day} a las ${match.startTime}`;
  const data = {
    matchId: match.id,
    day: match.day,
    startTime: match.startTime,
    courtId: match.courtId,
    opponents:
      match.pairAId === pairA.id
        ? `${pairB.player1.name} / ${pairB.player2.name}`
        : `${pairA.player1.name} / ${pairA.player2.name}`,
  };

  // Crear notificación para cada jugador (necesitaríamos sus user IDs)
  // Por ahora, esto es la estructura - necesitaremos mapear players a user IDs
  console.log("📅 Notificación de partido programado:", {
    title,
    message,
    data,
  });
}

// Notificar cambio de horario/cancha
export async function notifyMatchRescheduled(
  match: Match,
  oldSchedule: { day?: string; startTime?: string; courtId?: string },
  pairA: Pair,
  pairB: Pair
): Promise<void> {
  const title = "Cambio de Horario";
  const message = `Tu partido ha sido reprogramado para ${match.day} a las ${match.startTime}`;
  const data = {
    matchId: match.id,
    newDay: match.day,
    newStartTime: match.startTime,
    newCourtId: match.courtId,
    oldDay: oldSchedule.day,
    oldStartTime: oldSchedule.startTime,
    oldCourtId: oldSchedule.courtId,
  };

  console.log("🔄 Notificación de reprogramación:", { title, message, data });
}

// Notificar resultado de partido
export async function notifyMatchResult(
  match: Match,
  winnerPair: Pair,
  loserPair: Pair
): Promise<void> {
  const title = "Resultado de Partido";
  const winnerMessage = `¡Felicidades! Has ganado tu partido`;
  const loserMessage = `Tu partido ha terminado`;
  const data = {
    matchId: match.id,
    winner: `${winnerPair.player1.name} / ${winnerPair.player2.name}`,
    loser: `${loserPair.player1.name} / ${loserPair.player2.name}`,
  };

  console.log("🏆 Notificación de resultado:", {
    title,
    winnerMessage,
    loserMessage,
    data,
  });
}

// ============================================================================
// COURTS MANAGEMENT
// ============================================================================

// Función para obtener todas las canchas de un torneo - COMPATIBLE CON TODOS LOS NAVEGADORES
export async function getCourts(tournamentId: string): Promise<Court[]> {
  try {
    console.log("🔄 getCourts called with tournamentId:", tournamentId);
    
    // Detectar si es móvil
    const isMobile = typeof window !== 'undefined' && 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    console.log("📱 Is mobile:", isMobile);
    
    if (isMobile) {
      // Para móviles: usar fetch directo
      console.log("📱 Using direct fetch for mobile compatibility...");
      return await getCourtsDirectFetch(tournamentId);
    } else {
      // Para desktop: usar cliente Supabase
      console.log("🖥️ Using Supabase client for desktop...");
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("name");

      if (error) {
        console.error("❌ Error fetching courts:", error);
        throw new Error(`Error fetching courts: ${error.message}`);
      }

      console.log("✅ Courts fetched successfully:", data?.length || 0);
      return (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        tournamentId: row.tournament_id,
      }));
    }
  } catch (error) {
    console.error("❌ Unexpected error in getCourts:", error);
    return [];
  }
}

// Función de fetch directo para móviles
async function getCourtsDirectFetch(tournamentId: string): Promise<Court[]> {
  try {
    console.log("📱 Starting direct fetch for courts...");
    
    const supabaseUrl = "https://cbsfgbucnpujogxwvpim.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNic2ZnYnVjbnB1am9neHd2cGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjA2ODMsImV4cCI6MjA3MjMzNjY4M30.OKpeyasfs7qRdesqeMyq82zLewZXBfzupJEcYAg6Hdc";
    
    const url = `${supabaseUrl}/rest/v1/courts?tournament_id=eq.${tournamentId}&select=*&order=name`;
    console.log("📱 Fetching from URL:", url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      cache: 'no-store',
      credentials: 'omit',
      mode: 'cors'
    });
    
    console.log("📱 Response status:", response.status);
    console.log("📱 Response ok:", response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("📱 Response error:", errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("📱 Raw response data:", data);
    
    if (!Array.isArray(data)) {
      console.error("📱 Response is not an array:", typeof data, data);
      throw new Error("Response is not an array");
    }
    
    const courts = data.map((court: any) => ({
      id: court.id,
      name: court.name,
      tournamentId: court.tournament_id
    }));
    
    console.log("📱 Processed courts:", courts);
    return courts;
    
  } catch (error) {
    console.error("❌ Direct fetch failed:", error);
    throw error;
  }
}

// Función para crear una nueva cancha
export async function createCourt(
  tournamentId: string,
  name: string
): Promise<Court> {
  // Generar un ID único para la cancha
  const courtId = crypto.randomUUID();

  const { data, error } = await supabase
    .from("courts")
    .insert({
      id: courtId, // ✅ Especificar el ID explícitamente
      tournament_id: tournamentId,
      name: name,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating court:", error);
    console.error("Error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  console.log(`✅ Cancha creada: ${name} con ID: ${courtId}`);

  return {
    id: data.id,
    name: data.name,
    tournamentId: data.tournament_id,
  };
}

// Función para eliminar una cancha
export async function deleteCourt(courtId: string): Promise<void> {
  const { error } = await supabase.from("courts").delete().eq("id", courtId);

  if (error) {
    console.error("Error deleting court:", error);
    throw error;
  }

  console.log(`✅ Cancha eliminada: ${courtId}`);
}

// Algoritmo Round-Robin para generar partidos
export function generateRoundRobinMatches(
  group: Group,
  tournamentId: string,
  categoryId: string
): Omit<Match, "id" | "createdAt" | "updatedAt">[] {
  const matches: Omit<Match, "id" | "createdAt" | "updatedAt">[] = [];
  const pairIds = group.pairIds;

  console.log(
    `Generando partidos Round-Robin para ${group.name} con ${pairIds.length} parejas`
  );

  // Generar todos los enfrentamientos posibles (todos contra todos)
  for (let i = 0; i < pairIds.length; i++) {
    for (let j = i + 1; j < pairIds.length; j++) {
      const match: Omit<Match, "id" | "createdAt" | "updatedAt"> = {
        tournamentId,
        categoryId,
        groupId: group.id,
        stage: "groups",
        pairAId: pairIds[i],
        pairBId: pairIds[j],
        day: undefined,
        startTime: undefined,
        courtId: undefined,
        status: "pending",
        scorePairA: undefined,
        scorePairB: undefined,
        winnerPairId: undefined,
      };

      matches.push(match);
      console.log(
        `Partido: Pareja ${i + 1} vs Pareja ${j + 1} en ${group.name}`
      );
    }
  }

  return matches;
}

// Interfaz para la tabla de posiciones
export interface StandingsEntry {
  pairId: string;
  pairName: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number; // 3 puntos por partido ganado, 0 por perdido
  setsDifference: number;
  gamesDifference: number;
}

// Función para calcular la tabla de posiciones de un grupo
export async function calculateStandings(
  groupId: string,
  pairs: Pair[]
): Promise<StandingsEntry[]> {
  // Obtener todos los partidos del grupo
  const matches = await getMatches(groupId);

  // Filtrar solo partidos finalizados
  const finishedMatches = matches.filter(
    (match) => match.status === "completed"
  );

  // Inicializar estadísticas para cada pareja
  const standings: { [pairId: string]: StandingsEntry } = {};

  pairs.forEach((pair) => {
    standings[pair.id] = {
      pairId: pair.id,
      pairName: `${pair.player1?.name || "Jugador 1"} / ${
        pair.player2?.name || "Jugador 2"
      }`,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0,
      setsDifference: 0,
      gamesDifference: 0,
    };
  });

  // Procesar cada partido finalizado
  finishedMatches.forEach((match) => {
    if (!match.scorePairA || !match.scorePairB || !match.winnerPairId) return;

    const pairAId = match.pairAId;
    const pairBId = match.pairBId;
    const winnerId = match.winnerPairId;
    const loserId = winnerId === pairAId ? pairBId : pairAId;

    // Actualizar partidos jugados
    standings[pairAId].matchesPlayed++;
    standings[pairBId].matchesPlayed++;

    // Actualizar partidos ganados/perdidos y puntos
    standings[winnerId].matchesWon++;
    standings[winnerId].points += 3; // 3 puntos por victoria
    standings[loserId].matchesLost++;

    // Calcular sets y games
    const scoreA = match.scorePairA;
    const scoreB = match.scorePairB;

    let setsA = 0,
      setsB = 0;
    let gamesA = 0,
      gamesB = 0;

    // Set 1 (solo si ambos están definidos)
    if (scoreA.set1 !== undefined && scoreB.set1 !== undefined) {
      if (scoreA.set1 > scoreB.set1) setsA++;
      else if (scoreB.set1 > scoreA.set1) setsB++;
      // Si hay empate (4-4, 5-5), no se cuenta como set ganado para ninguno
      gamesA += scoreA.set1;
      gamesB += scoreB.set1;
    }

    // Set 2 (solo si ambos están definidos)
    if (scoreA.set2 !== undefined && scoreB.set2 !== undefined) {
      if (scoreA.set2 > scoreB.set2) setsA++;
      else if (scoreB.set2 > scoreA.set2) setsB++;
      // Si hay empate, no se cuenta como set ganado para ninguno
      gamesA += scoreA.set2;
      gamesB += scoreB.set2;
    }

    // Set 3 (solo si ambos están definidos)
    if (scoreA.set3 !== undefined && scoreB.set3 !== undefined) {
      if (scoreA.set3 > scoreB.set3) setsA++;
      else if (scoreB.set3 > scoreA.set3) setsB++;
      // Si hay empate, no se cuenta como set ganado para ninguno
      gamesA += scoreA.set3;
      gamesB += scoreB.set3;
    }

    // Super Muerte cuenta como games adicionales
    if (scoreA.superDeath !== undefined && scoreB.superDeath !== undefined) {
      gamesA += scoreA.superDeath;
      gamesB += scoreB.superDeath;
    }

    // Actualizar estadísticas de sets y games
    standings[pairAId].setsWon += setsA;
    standings[pairAId].setsLost += setsB;
    standings[pairAId].gamesWon += gamesA;
    standings[pairAId].gamesLost += gamesB;

    standings[pairBId].setsWon += setsB;
    standings[pairBId].setsLost += setsA;
    standings[pairBId].gamesWon += gamesB;
    standings[pairBId].gamesLost += gamesA;
  });

  // Calcular diferencias
  Object.values(standings).forEach((entry) => {
    entry.setsDifference = entry.setsWon - entry.setsLost;
    entry.gamesDifference = entry.gamesWon - entry.gamesLost;
  });

  // Ordenar por criterios CORRECTOS de desempate
  const sortedStandings = Object.values(standings).sort((a, b) => {
    // 1º Puntos (mayor es mejor)
    if (b.points !== a.points) return b.points - a.points;

    // 1er criterio de desempate: Diferencia de sets (mayor es mejor)
    if (b.setsDifference !== a.setsDifference) return b.setsDifference - a.setsDifference;

    // 2do criterio de desempate: Diferencia de games (mayor es mejor)
    if (b.gamesDifference !== a.gamesDifference) return b.gamesDifference - a.gamesDifference;

    // 3er criterio de desempate: Encuentro directo (si son del mismo grupo)
    // Por ahora mantenemos orden alfabético como último criterio
    if (a.pairName < b.pairName) return -1;
    if (a.pairName > b.pairName) return 1;

    return 0;
  });

  return sortedStandings;
}

// ============================================
// FUNCIONES PARA FASE ELIMINATORIA
// ============================================

// Función para generar la fase eliminatoria basada en los ganadores de grupos
export async function generateKnockoutPhase(
  categoryId: string,
  tournamentId: string
): Promise<Match[]> {
  try {
    console.log("🏆 Iniciando generación de fase eliminatoria dinámica...");

    // Obtener las parejas que avanzan usando la nueva lógica dinámica
    const { advancingPairs, bracketInfo } = await getAdvancingPairs(categoryId);

    if (advancingPairs.length === 0) {
      throw new Error("No hay parejas que avancen a eliminatorias");
    }

    if (advancingPairs.length < 2) {
      throw new Error(
        "Se necesitan al menos 2 parejas para generar eliminatorias"
      );
    }

    console.log(
      `✅ Parejas que avanzan: ${advancingPairs.length} (${bracketInfo.firstPlaces} primeros + ${bracketInfo.bestSecondPlaces} mejores segundos)`
    );
    console.log(
      `📊 Bracket dinámico: ${
        bracketInfo.bracketSize
      } parejas, etapas: ${bracketInfo.stages.join(", ")}`
    );

    // La estructura del torneo ya está definida en bracketInfo.stages
    console.log("🏗️ Estructura del torneo:", bracketInfo.stages);

    // Generar partidos de la primera ronda con las parejas que avanzan
    const knockoutMatches: Match[] = [];

    // Generar emparejamientos de la primera ronda basado en el bracket dinámico
    const firstRoundStage = bracketInfo.stages[0]; // Primera etapa (puede ser cuartos, semis, etc.)
    const stageNames = {
      quarterfinal: "Cuartos de Final",
      semifinal: "Semifinal",
      final: "Final",
      round_of_16: "Octavos de Final",
      round_of_32: "Dieciseisavos de Final",
    };

    console.log(
      `🎯 Generando ${
        stageNames[firstRoundStage as keyof typeof stageNames] ||
        firstRoundStage
      }...`
    );

    // Crear emparejamientos para la primera ronda
    const matchesCount = Math.floor(advancingPairs.length / 2);

    for (let i = 0; i < matchesCount; i++) {
      const pairA = advancingPairs[i];
      const pairB = advancingPairs[advancingPairs.length - 1 - i]; // Emparejamiento cruzado

      if (pairA && pairB && pairA.id !== pairB.id) {
        const match: Match = {
          id: "", // Se generará en la BD
          tournamentId,
          categoryId,
          stage: firstRoundStage as any,
          pairAId: pairA.id,
          pairBId: pairB.id,
          status: "pending",
          // roundNumber: 1, // ❌ Eliminado - no existe en la tabla
          // matchNumber: i + 1, // ❌ Eliminado - no existe en la tabla
          // bracketPosition: `${firstRoundStage.toUpperCase()}${i + 1}`, // ❌ Eliminado - no existe en la tabla
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        knockoutMatches.push(match);
      }
    }

    console.log(
      `✅ ${
        stageNames[firstRoundStage as keyof typeof stageNames] ||
        firstRoundStage
      } generados: ${knockoutMatches.length} partidos`
    );
    console.log(
      `📊 Bracket dinámico completado para ${bracketInfo.bracketSize} parejas`
    );

    return knockoutMatches;
  } catch (error) {
    console.error("Error generating knockout phase:", error);
    throw error;
  }
}

// Función para crear los partidos eliminatorios en la base de datos
export async function createKnockoutMatches(matches: Match[]): Promise<void> {
  const supabase = createClient();

  try {
    if (matches.length === 0) {
      throw new Error("No hay partidos para crear");
    }

    // Solo eliminar partidos PENDIENTES para evitar duplicados
    // NO eliminar partidos que ya tienen resultados (status = 'finished')
    await supabase
      .from("matches")
      .delete()
      .in("stage", ["quarterfinals", "semifinals", "final", "third_place"])
      .eq("tournament_id", matches[0].tournamentId)
      .eq("category_id", matches[0].categoryId)
      .eq("status", "pending"); // ⚠️ CRÍTICO: Solo eliminar partidos pendientes

    // Insertar nuevos partidos - solo campos esenciales
    const matchesToInsert = matches.map((match) => ({
      tournament_id: match.tournamentId,
      category_id: match.categoryId,
      stage: match.stage,
      pair_a_id: match.pairAId && match.pairAId !== "" ? match.pairAId : null,
      pair_b_id: match.pairBId && match.pairBId !== "" ? match.pairBId : null,
      status: match.status,
      // round_number: match.roundNumber, // ❌ Eliminado - no existe en la tabla
      // match_number: match.matchNumber, // ❌ Eliminado - no existe en la tabla
      // bracket_position: match.bracketPosition, // ❌ Eliminado - no existe en la tabla
    }));

    console.log("Matches to insert:", matchesToInsert);

    const { data, error } = await supabase
      .from("matches")
      .insert(matchesToInsert);

    if (error) {
      console.error("Supabase insert error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      console.error("Data being inserted:", matchesToInsert);
      throw new Error(
        `Error inserting matches: ${error.message} - ${
          error.details || error.hint || "No additional details"
        }`
      );
    }

    console.log("Knockout matches created successfully");
  } catch (error) {
    console.error("Error creating knockout matches:", error);
    throw error;
  }
}

// Función para obtener los partidos eliminatorios
export async function getKnockoutMatches(categoryId: string): Promise<Match[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("category_id", categoryId)
      .in("stage", ["quarterfinals", "semifinals", "final", "third_place"])
      .order("round_number", { ascending: true })
      .order("match_number", { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      tournamentId: row.tournament_id,
      categoryId: row.category_id,
      stage: row.stage,
      groupId: row.group_id,
      pairAId: row.pair_a_id || "",
      pairBId: row.pair_b_id || "",
      day: row.day,
      startTime: row.start_time,
      courtId: row.court_id,
      status: row.status,
      scorePairA: row.score_pair_a,
      scorePairB: row.score_pair_b,
      winnerPairId: row.winner_pair_id,
      roundNumber: row.round_number,
      matchNumber: row.match_number,
      nextMatchId: row.next_match_id,
      bracketPosition: row.bracket_position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error("Error fetching knockout matches:", error);
    return [];
  }
}

// Función para avanzar ganador a la siguiente ronda
export async function advanceWinnerToNextRound(
  matchId: string,
  winnerId: string
): Promise<void> {
  const supabase = createClient();

  try {
    // 1. Obtener el partido actual
    const { data: currentMatch, error: fetchError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (fetchError || !currentMatch) {
      throw new Error("No se pudo encontrar el partido");
    }

    // 2. Determinar el siguiente partido basado en la lógica del bracket
    let nextMatchBracketPosition = "";

    if (currentMatch.stage === "quarterfinals") {
      // Para torneos de 4 parejas: QF1 y QF2 van directo a F1 (Final)
      // Para torneos de 8+ parejas: QF1/QF2 → SF1, QF3/QF4 → SF2

      // Verificar si existe alguna semifinal para determinar el tipo de torneo
      const { data: semifinalExists } = await supabase
        .from("matches")
        .select("id")
        .eq("tournament_id", currentMatch.tournament_id)
        .eq("category_id", currentMatch.category_id)
        .eq("stage", "semifinal")
        .limit(1);

      if (!semifinalExists || semifinalExists.length === 0) {
        // Torneo de 4 parejas - ir directo a final
        nextMatchBracketPosition = "F1";
      } else {
        // Torneo de 8+ parejas - ir a semifinal
        if (
          currentMatch.bracket_position === "QF1" ||
          currentMatch.bracket_position === "QF2"
        ) {
          nextMatchBracketPosition = "SF1";
        } else {
          nextMatchBracketPosition = "SF2";
        }
      }
    } else if (currentMatch.stage === "semifinal") {
      if (
        currentMatch.bracket_position === "SF1" ||
        currentMatch.bracket_position === "SF2"
      ) {
        nextMatchBracketPosition = "F1"; // Final
      }
    }

    if (nextMatchBracketPosition) {
      // 3. Buscar el siguiente partido
      const { data: nextMatch, error: nextError } = await supabase
        .from("matches")
        .select("*")
        .eq("category_id", currentMatch.category_id)
        .eq("bracket_position", nextMatchBracketPosition)
        .single();

      if (nextError || !nextMatch) {
        console.warn("No se encontró el siguiente partido para avanzar");
        return;
      }

      // 4. Asignar el ganador al siguiente partido
      let updateData: any = {};

      // Para semifinales, asignar según el cuarto de final
      if (currentMatch.stage === "quarterfinals") {
        if (
          currentMatch.bracket_position === "QF1" ||
          currentMatch.bracket_position === "QF2"
        ) {
          // QF1 y QF2 van a SF1
          if (!nextMatch.pair_a_id) {
            updateData.pair_a_id = winnerId;
          } else if (!nextMatch.pair_b_id) {
            updateData.pair_b_id = winnerId;
          }
        } else {
          // QF3 y QF4 van a SF2
          if (!nextMatch.pair_a_id) {
            updateData.pair_a_id = winnerId;
          } else if (!nextMatch.pair_b_id) {
            updateData.pair_b_id = winnerId;
          }
        }
      } else {
        // Para otros casos, asignar normalmente
        if (!nextMatch.pair_a_id) {
          updateData.pair_a_id = winnerId;
        } else if (!nextMatch.pair_b_id) {
          updateData.pair_b_id = winnerId;
        }
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("matches")
          .update(updateData)
          .eq("id", nextMatch.id);

        if (updateError) {
          throw updateError;
        }

        console.log(
          `Ganador ${winnerId} avanzado a ${nextMatchBracketPosition}`
        );
      }
    }
  } catch (error) {
    console.error("Error advancing winner:", error);
    throw error;
  }
}

// Función para crear las siguientes rondas automáticamente
export async function createNextRoundMatches(
  categoryId: string,
  tournamentId: string
): Promise<void> {
  console.log(
    "⚠️ createNextRoundMatches: Esta función está deshabilitada temporalmente"
  );
  console.log("Las semifinales se crearán dinámicamente cuando se necesiten");

  // NOTA: Esta función está deshabilitada porque causa errores 400
  // al intentar crear matches con pair_a_id y pair_b_id como NULL
  // cuando la base de datos tiene restricciones NOT NULL en esos campos.

  // Las semifinales y finales se crearán dinámicamente cuando:
  // 1. Se completen suficientes cuartos de final
  // 2. Se haga clic en "Generar Semifinales" o "Generar Finales"

  return Promise.resolve();
}

// =====================================================
// SISTEMA DE ROLES Y PERMISOS
// =====================================================

// Obtener el rol de un usuario en un torneo
export async function getUserRole(
  userId: string,
  tournamentId: string
): Promise<UserRole | null> {
  console.log("🔍 getUserRole called with:", { userId, tournamentId });

  // Si no hay tournamentId, retornar null sin hacer consulta
  if (!tournamentId) {
    console.log("❌ getUserRole: No tournamentId provided");
    return null;
  }

  try {
    // Primero, ver todos los roles del usuario para debugging
    const { data: allRoles, error: allRolesError } = await supabase
      .from("user_roles")
      .select("role, tournament_id, is_active")
      .eq("user_id", userId);

    if (!allRolesError && allRoles) {
      console.log("📋 All roles for user:", allRoles);
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("tournament_id", tournamentId)
      .eq("is_active", true)
      .single();

    if (error) {
      // Si no se encuentra el rol, no es un error crítico
      if (error.code === "PGRST116") {
        console.log(
          "⚠️ getUserRole: No role found for tournament:",
          tournamentId
        );
        return null;
      }
      console.error("Error getting user role:", error);
      return null;
    }

    console.log("✅ getUserRole: Found role:", data?.role);
    return (data?.role as UserRole) || null;
  } catch (error) {
    console.error("Unexpected error in getUserRole:", error);
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
  const { data, error } = await supabase
    .from("user_roles")
    .upsert({
      user_id: userId,
      tournament_id: tournamentId,
      role,
      granted_by: grantedBy,
      expires_at: expiresAt,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error assigning role:", error);
    throw error;
  }

  return convertUserRoleFromDb(data);
}

// Revocar rol de un usuario
export async function revokeRole(
  userId: string,
  tournamentId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("tournament_id", tournamentId);

  if (error) {
    console.error("Error revoking role:", error);
    throw error;
  }
}

// Obtener todos los usuarios con roles en un torneo
export async function getTournamentUsers(
  tournamentId: string
): Promise<(UserRoleAssignment & { profile?: UserProfile })[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select(
      `
      *,
      user_profiles:user_id (
        id,
        full_name,
        avatar_url,
        organization,
        is_verified
      )
    `
    )
    .eq("tournament_id", tournamentId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getting tournament users:", error);
    throw error;
  }

  return data.map((item) => ({
    ...convertUserRoleFromDb(item),
    profile: item.user_profiles
      ? {
          id: item.user_profiles.id,
          fullName: item.user_profiles.full_name,
          avatarUrl: item.user_profiles.avatar_url,
          organization: item.user_profiles.organization,
          isVerified: item.user_profiles.is_verified,
          createdAt: "",
          updatedAt: "",
        }
      : undefined,
  }));
}

// Obtener perfil de usuario
export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle(); // Cambiado de .single() a .maybeSingle()

  if (error) {
    console.error("Error getting user profile:", error);
    return null;
  }

  if (!data) {
    console.log("No user profile found for user:", userId);
    return null;
  }

  return convertUserProfileFromDb(data);
}

// Actualizar perfil de usuario
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      full_name: updates.fullName,
      email: updates.email,
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }

  return convertUserProfileFromDb(data);
}

// Obtener permisos basados en el rol
export function getRolePermissions(role: UserRole): RolePermissions {
  const basePermissions: RolePermissions = {
    canCreateTournaments: false,
    canDeleteTournaments: false,
    canManageCategories: false,
    canManagePairs: false,
    canGenerateGroups: false,
    canGenerateMatches: false,
    canUpdateScores: false,
    canManageSchedule: false,
    canViewReports: false,
    canManageUsers: false,
    canManageSettings: false,
  };

  switch (role) {
    case "owner":
      return {
        ...basePermissions,
        canCreateTournaments: true,
        canDeleteTournaments: true,
        canManageCategories: true,
        canManagePairs: true,
        canGenerateGroups: true,
        canGenerateMatches: true,
        canUpdateScores: true,
        canManageSchedule: true,
        canViewReports: true,
        canManageUsers: true,
        canManageSettings: true,
      };

    case "admin":
      return {
        ...basePermissions,
        canManageCategories: true,
        canManagePairs: true,
        canGenerateGroups: true,
        canGenerateMatches: true,
        canUpdateScores: true,
        canManageSchedule: true,
        canViewReports: true,

        canManageSettings: true,
      };

    case "referee":
      return {
        ...basePermissions,
        canUpdateScores: true,
        canViewReports: true,
      };

    case "viewer":
    default:
      return {
        ...basePermissions,
        canViewReports: true,
      };
  }
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

// ============================================================================
// ELIMINATORIAS / KNOCKOUT SYSTEM
// ============================================================================

// Función para obtener las mejores parejas de cada grupo para eliminatorias
export async function getTopPairsFromGroups(
  categoryId: string,
  pairsPerGroup: number = 2
): Promise<Pair[]> {
  try {
    console.log(
      `🏆 Obteniendo top ${pairsPerGroup} parejas de cada grupo para eliminatorias...`
    );

    // Obtener todos los grupos de la categoría
    const groups = await getGroups(categoryId);

    if (groups.length === 0) {
      console.log("⚠️ No hay grupos para generar eliminatorias");
      return [];
    }

    // Obtener todas las parejas de la categoría
    const allPairs = await getPairs(categoryId);

    if (allPairs.length === 0) {
      console.log("⚠️ No hay parejas para generar eliminatorias");
      return [];
    }

    const topPairs: Pair[] = [];

    // Para cada grupo, obtener las mejores parejas
    for (const group of groups) {
      console.log(`📊 Procesando grupo: ${group.name}`);

      // Obtener partidos del grupo
      const groupMatches = await getMatches(group.id);

      // Filtrar solo partidos completados
      const completedMatches = groupMatches.filter(
        (match) => match.status === "completed"
      );

      if (completedMatches.length === 0) {
        console.log(
          `❌ No hay partidos completados en ${group.name}, no se pueden seleccionar parejas para eliminatorias`
        );
        // Si no hay partidos completados, NO seleccionar parejas para eliminatorias
        continue;
      }

      // Calcular tabla de posiciones del grupo
      const groupPairs = allPairs.filter((pair) =>
        group.pairIds.includes(pair.id)
      );
      const standings = await calculateStandings(group.id, groupPairs);

      // Ordenar por criterios CORRECTOS de desempate
      const sortedStandings = standings.sort((a, b) => {
        // 1º Puntos (mayor es mejor)
        if (b.points !== a.points) return b.points - a.points;
        
        // 1er criterio de desempate: Diferencia de sets (mayor es mejor)
        if (b.setsDifference !== a.setsDifference) return b.setsDifference - a.setsDifference;
        
        // 2do criterio de desempate: Diferencia de games (mayor es mejor)
        if (b.gamesDifference !== a.gamesDifference) return b.gamesDifference - a.gamesDifference;
        
        // 3er criterio de desempate: Encuentro directo (si son del mismo grupo)
        // Por ahora mantenemos orden alfabético como último criterio
        if (a.pairName < b.pairName) return -1;
        if (a.pairName > b.pairName) return 1;
        
        return 0;
      });

      // Tomar las mejores parejas del grupo
      const topGroupPairs = sortedStandings
        .slice(0, pairsPerGroup)
        .map(
          (standing) => groupPairs.find((pair) => pair.id === standing.pairId)!
        );

      console.log(
        `✅ Top ${topGroupPairs.length} parejas de ${group.name}:`,
        topGroupPairs.map(
          (pair) => `${pair.player1.name} / ${pair.player2.name}`
        )
      );

      topPairs.push(...topGroupPairs);
    }

    console.log(
      `🎯 Total de parejas seleccionadas para eliminatorias: ${topPairs.length}`
    );

    // 🔥 VALIDACIÓN CRÍTICA: Verificar que hay partidos jugados en al menos un grupo
    if (topPairs.length === 0) {
      console.log(
        "❌ No se pueden seleccionar parejas: No hay partidos completados en ningún grupo"
      );
      return [];
    }

    return topPairs;
  } catch (error) {
    console.error("❌ Error obteniendo top pairs para eliminatorias:", error);
    throw error;
  }
}

// Función para generar partidos de eliminatorias (SOLO LA PRIMERA RONDA)
export async function generateEliminationMatches(
  categoryId: string,
  tournamentId: string,
  topPairs: Pair[],
  tournamentConfig?: TournamentConfig
): Promise<Match[]> {
  try {
    console.log(
      `🏆 Generando PRIMERA RONDA de eliminatorias para ${topPairs.length} parejas...`
    );

    // 🔥 VALIDACIÓN CRÍTICA: Verificar que hay parejas válidas
    if (topPairs.length < 2) {
      console.log("❌ Se necesitan al menos 2 parejas para eliminatorias");
      return [];
    }

    // 🔥 VALIDACIÓN CRÍTICA: Verificar que todas las parejas tienen IDs válidos
    const validPairs = topPairs.filter(
      (pair) => pair.id && pair.id.trim() !== ""
    );
    if (validPairs.length !== topPairs.length) {
      console.log("❌ Algunas parejas no tienen IDs válidos");
      return [];
    }

    if (validPairs.length < 2) {
      console.log("❌ No hay suficientes parejas válidas para eliminatorias");
      return [];
    }

    const matches: Match[] = [];
    const { v4: uuidv4 } = await import("uuid");

    // Determinar qué fase es la primera ronda
    const firstRoundStage = getFirstRoundStage(validPairs.length);
    console.log(`🎯 Primera ronda: ${firstRoundStage}`);

    // Crear solo los partidos de la primera ronda
    const firstRoundMatches = createFirstRoundMatches(
      validPairs,
      firstRoundStage
    );
    console.log(`🏗️ Partidos de primera ronda creados:`, firstRoundMatches);
    console.log(`📊 Cantidad de partidos a crear:`, firstRoundMatches.length);

    // Generar solo los partidos de la primera ronda
    for (let i = 0; i < firstRoundMatches.length; i++) {
      const matchData = firstRoundMatches[i];

      const match: Match = {
        id: uuidv4(),
        tournamentId,
        categoryId,
        stage: firstRoundStage,
        pairAId: matchData.pairAId,
        pairBId: matchData.pairBId,
        status: "pending",
      };

      matches.push(match);
      console.log(
        `⚽ Partido ${firstRoundStage} ${i + 1}: ${matchData.pairAId} vs ${
          matchData.pairBId
        }`
      );
    }

    console.log(`✅ Total de partidos generados:`, matches.length);

    console.log(`✅ Generados ${matches.length} partidos de la primera ronda`);
    return matches;
  } catch (error) {
    console.error("❌ Error generando partidos de eliminatorias:", error);
    throw error;
  }
}

// Función para determinar la primera ronda según el número de parejas
function getFirstRoundStage(
  pairCount: number
): "quarterfinals" | "semifinals" | "final" {
  if (pairCount <= 2) {
    return "final";
  } else if (pairCount <= 4) {
    return "semifinals";
  } else {
    return "quarterfinals";
  }
}

// 🌟 ALGORITMO UNIVERSAL DE SEEDING - Funciona para 1 a 1000+ parejas
function createFirstRoundMatches(
  pairs: Pair[],
  stage: "quarterfinals" | "semifinals" | "final"
): Array<{ pairAId: string; pairBId: string }> {
  const matches: Array<{ pairAId: string; pairBId: string }> = [];

  // 🔥 VALIDACIÓN CRÍTICA: Verificar que hay parejas válidas
  if (pairs.length < 2) {
    console.log("❌ createFirstRoundMatches: No hay suficientes parejas");
    return [];
  }

  // 🏆 SEEDING UNIVERSAL - Las parejas ya vienen ordenadas por rendimiento
  const seededPairs = [...pairs];
  const numPairs = seededPairs.length;

  console.log(
    `🌟 ALGORITMO UNIVERSAL DE SEEDING activado para ${numPairs} parejas`
  );
  console.log(
    "🏆 Parejas ordenadas por rendimiento:",
    seededPairs.map((p, i) => `Seed ${i + 1}: ${p.id}`).slice(0, 8) // Mostrar solo primeras 8
  );

  // 🧮 CALCULAR BRACKET SIZE DINÁMICO (siguiente potencia de 2)
  const bracketSize = calculateOptimalBracketSize(numPairs);
  const firstRoundSize = bracketSize / 2; // Número de partidos en primera ronda

  console.log(
    `📊 Bracket dinámico: ${numPairs} parejas → Bracket de ${bracketSize} → ${firstRoundSize} partidos`
  );

  // 🎯 ALGORITMO MATEMÁTICO UNIVERSAL DE SEEDING
  // Usa la fórmula estándar de torneos: Seed A vs Seed (bracketSize + 1 - A)
  const matchups = generateUniversalSeeding(numPairs, bracketSize);

  console.log("🔢 Enfrentamientos calculados por seeding matemático:");
  matchups.forEach((matchup, i) => {
    if (matchup.bye) {
      console.log(`   Partido ${i + 1}: Seed ${matchup.seedA} (BYE)`);
    } else {
      console.log(
        `   Partido ${i + 1}: Seed ${matchup.seedA} vs Seed ${matchup.seedB}`
      );
    }
  });

  // 🏗️ CREAR PARTIDOS BASADOS EN SEEDING MATEMÁTICO
  for (let i = 0; i < matchups.length; i++) {
    const matchup = matchups[i];
    const pairA = seededPairs[matchup.seedA - 1]; // seedA es 1-based, array es 0-based
    const pairB =
      matchup.bye || !matchup.seedB ? null : seededPairs[matchup.seedB - 1];

    if (pairA && pairB) {
      // Partido normal
      matches.push({
        pairAId: pairA.id,
        pairBId: pairB.id,
      });
      console.log(`✅ Partido ${i + 1} creado: ${pairA.id} vs ${pairB.id}`);
    } else if (pairA) {
      // BYE - pareja pasa automáticamente
      matches.push({
        pairAId: pairA.id,
        pairBId: pairA.id, // Mismo ID indica BYE
      });
      console.log(`✅ Partido ${i + 1} (BYE): ${pairA.id} pasa directo`);
    } else {
      console.warn(
        `⚠️ Partido ${i + 1}: Parejas no encontradas para seeds ${
          matchup.seedA
        }-${matchup.seedB}`
      );
    }
  }

  console.log(`🎉 Total de partidos generados: ${matches.length}`);
  return matches;
}

// 🧮 GENERADOR UNIVERSAL DE SEEDING MATEMÁTICO
// Funciona para cualquier número de parejas usando la fórmula estándar de torneos
function generateUniversalSeeding(
  numPairs: number,
  bracketSize: number
): Array<{
  seedA: number;
  seedB: number | null;
  bye: boolean;
}> {
  const matchups: Array<{ seedA: number; seedB: number | null; bye: boolean }> =
    [];
  const numMatches = bracketSize / 2;

  console.log(
    `🧮 Generando seeding universal: ${numPairs} parejas en bracket de ${bracketSize}`
  );

  for (let i = 0; i < numMatches; i++) {
    const seedA = i + 1; // Seed del mejor (1, 2, 3, 4...)
    const seedB = bracketSize - i; // Seed del contrario por fórmula matemática

    if (seedA <= numPairs && seedB <= numPairs) {
      // Ambas parejas existen - partido normal
      matchups.push({
        seedA,
        seedB,
        bye: false,
      });
    } else if (seedA <= numPairs) {
      // Solo la pareja A existe - BYE
      matchups.push({
        seedA,
        seedB: null,
        bye: true,
      });
    }
    // Si ninguna pareja existe, no crear partido (esto no debería pasar con bracket correcto)
  }

  return matchups;
}

// Función para crear el bracket de eliminatorias (DEPRECATED - solo para referencia)
function createEliminationBracket(
  pairs: Pair[]
): Record<string, Array<{ pairAId: string; pairBId: string }>> {
  const bracket: Record<
    string,
    Array<{ pairAId: string; pairBId: string }>
  > = {};

  // Mezclar las parejas para evitar sesgos
  const shuffledPairs = [...pairs].sort(() => Math.random() - 0.5);

  if (pairs.length <= 2) {
    // Solo final
    bracket.final = [
      {
        pairAId: shuffledPairs[0].id,
        pairBId: shuffledPairs[1].id,
      },
    ];
  } else if (pairs.length <= 4) {
    // Semifinales + final + tercer lugar
    bracket.semifinals = [
      {
        pairAId: shuffledPairs[0].id,
        pairBId: shuffledPairs[1].id,
      },
      {
        pairAId: shuffledPairs[2].id,
        pairBId: shuffledPairs[3].id,
      },
    ];

    // Para final y tercer lugar, usamos las mismas parejas pero las asignaremos después
    // cuando se conozcan los resultados de semifinales
    bracket.final = [
      {
        pairAId: shuffledPairs[0].id, // Temporal - se actualizará después
        pairBId: shuffledPairs[2].id, // Temporal - se actualizará después
      },
    ];

    bracket.third_place = [
      {
        pairAId: shuffledPairs[1].id, // Temporal - se actualizará después
        pairBId: shuffledPairs[3].id, // Temporal - se actualizará después
      },
    ];
  } else if (pairs.length <= 8) {
    // Cuartos + semifinales + final + tercer lugar
    bracket.quarterfinals = [
      {
        pairAId: shuffledPairs[0].id,
        pairBId: shuffledPairs[1].id,
      },
      {
        pairAId: shuffledPairs[2].id,
        pairBId: shuffledPairs[3].id,
      },
      {
        pairAId: shuffledPairs[4].id,
        pairBId: shuffledPairs[5].id,
      },
      {
        pairAId: shuffledPairs[6].id,
        pairBId: shuffledPairs[7].id,
      },
    ];

    // Para semifinales, usamos las primeras parejas temporalmente
    bracket.semifinals = [
      {
        pairAId: shuffledPairs[0].id, // Temporal - se actualizará después
        pairBId: shuffledPairs[2].id, // Temporal - se actualizará después
      },
      {
        pairAId: shuffledPairs[4].id, // Temporal - se actualizará después
        pairBId: shuffledPairs[6].id, // Temporal - se actualizará después
      },
    ];

    // Para final y tercer lugar, usamos las primeras parejas temporalmente
    bracket.final = [
      {
        pairAId: shuffledPairs[0].id, // Temporal - se actualizará después
        pairBId: shuffledPairs[4].id, // Temporal - se actualizará después
      },
    ];

    bracket.third_place = [
      {
        pairAId: shuffledPairs[2].id, // Temporal - se actualizará después
        pairBId: shuffledPairs[6].id, // Temporal - se actualizará después
      },
    ];
  } else {
    // Para más de 8 parejas, usar cuartos de final
    const quarterFinals = Math.ceil(pairs.length / 2);

    bracket.quarterfinals = [];
    for (let i = 0; i < quarterFinals; i++) {
      if (shuffledPairs[i * 2 + 1]) {
        bracket.quarterfinals.push({
          pairAId: shuffledPairs[i * 2].id,
          pairBId: shuffledPairs[i * 2 + 1].id,
        });
      } else {
        // Si hay número impar, la última pareja pasa directo a semifinales
        bracket.quarterfinals.push({
          pairAId: shuffledPairs[i * 2].id,
          pairBId: shuffledPairs[i * 2].id, // Mismo ID para indicar bye
        });
      }
    }

    // Para semifinales, usamos las primeras parejas temporalmente
    const semifinals = Math.ceil(quarterFinals / 2);
    bracket.semifinals = [];
    for (let i = 0; i < semifinals; i++) {
      bracket.semifinals.push({
        pairAId: shuffledPairs[i * 4]?.id || shuffledPairs[0].id, // Temporal
        pairBId: shuffledPairs[i * 4 + 2]?.id || shuffledPairs[2].id, // Temporal
      });
    }

    // Para final y tercer lugar, usamos las primeras parejas temporalmente
    bracket.final = [
      {
        pairAId: shuffledPairs[0].id, // Temporal - se actualizará después
        pairBId: shuffledPairs[4]?.id || shuffledPairs[2].id, // Temporal - se actualizará después
      },
    ];

    bracket.third_place = [
      {
        pairAId: shuffledPairs[2].id, // Temporal - se actualizará después
        pairBId:
          shuffledPairs[6]?.id || shuffledPairs[4]?.id || shuffledPairs[3].id, // Temporal - se actualizará después
      },
    ];
  }

  return bracket;
}

// Función para calcular las fases de eliminatorias
function calculateEliminationPhases(
  pairCount: number,
  includeThirdPlace: boolean = true
): Array<{
  stage: "quarterfinals" | "semifinals" | "final" | "third_place";
  matches: number;
}> {
  const phases: Array<{
    stage: "quarterfinals" | "semifinals" | "final" | "third_place";
    matches: number;
  }> = [];

  if (pairCount <= 2) {
    // Solo final
    phases.push({ stage: "final", matches: 1 });
  } else if (pairCount <= 4) {
    // Semifinales + final + (tercer lugar opcional)
    phases.push({ stage: "semifinals", matches: 2 });
    phases.push({ stage: "final", matches: 1 });
    if (includeThirdPlace) {
      phases.push({ stage: "third_place", matches: 1 });
    }
  } else if (pairCount <= 8) {
    // Cuartos + semifinales + final + (tercer lugar opcional)
    phases.push({ stage: "quarterfinals", matches: 4 });
    phases.push({ stage: "semifinals", matches: 2 });
    phases.push({ stage: "final", matches: 1 });
    if (includeThirdPlace) {
      phases.push({ stage: "third_place", matches: 1 });
    }
  } else {
    // Para más de 8 parejas, usar cuartos de final
    const quarterFinals = Math.ceil(pairCount / 2);
    phases.push({ stage: "quarterfinals", matches: quarterFinals });
    phases.push({ stage: "semifinals", matches: Math.ceil(quarterFinals / 2) });
    phases.push({ stage: "final", matches: 1 });
    if (includeThirdPlace) {
      phases.push({ stage: "third_place", matches: 1 });
    }
  }

  return phases;
}

// Función para crear partidos de eliminatorias en la base de datos
export async function createEliminationMatches(
  categoryId: string,
  tournamentId: string,
  topPairs: Pair[]
): Promise<Match[]> {
  try {
    console.log(`🏆 Creando partidos de eliminatorias en la base de datos...`);

    // 🔥 VALIDACIÓN CRÍTICA: Verificar que hay parejas válidas antes de generar
    if (topPairs.length < 2) {
      console.log(
        "❌ createEliminationMatches: No hay suficientes parejas para eliminatorias"
      );
      return [];
    }

    // 🔧 OBTENER CONFIGURACIÓN DEL TORNEO
    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("config")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournamentData) {
      console.error(
        "❌ Error obteniendo configuración del torneo:",
        tournamentError
      );
      throw new Error("No se pudo obtener la configuración del torneo");
    }

    const tournamentConfig = tournamentData.config as TournamentConfig;
    console.log(
      `⚙️ Configuración torneo - Incluir 3er lugar:`,
      tournamentConfig.knockout.thirdPlace
    );

    // Generar los partidos
    const matches = await generateEliminationMatches(
      categoryId,
      tournamentId,
      topPairs,
      tournamentConfig
    );

    if (matches.length === 0) {
      console.log("⚠️ No hay partidos para crear");
      return [];
    }

    // Crear los partidos en la base de datos
    const createdMatches = await createMatches(matches);

    console.log(
      `✅ Creados ${createdMatches.length} partidos de eliminatorias en la base de datos`
    );
    return createdMatches;
  } catch (error) {
    console.error("❌ Error creando partidos de eliminatorias:", error);
    throw error;
  }
}

// Función para obtener partidos de eliminatorias de una categoría
export async function getEliminationMatches(
  categoryId: string
): Promise<Match[]> {
  try {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("category_id", categoryId)
      .in("stage", ["quarterfinals", "semifinals", "quarterfinal", "semifinal", "final", "third_place"])
      .order("created_at");

    if (error) {
      console.error("Error fetching elimination matches:", error);
      throw error;
    }

    // Convertir snake_case a camelCase
    return data.map((match) => ({
      id: match.id,
      tournamentId: match.tournament_id,
      categoryId: match.category_id,
      stage: match.stage,
      groupId: match.group_id,
      pairAId: match.pair_a_id,
      pairBId: match.pair_b_id,
      day: match.day,
      startTime: match.start_time,
      courtId: match.court_id,
      status: match.status,
      scorePairA: match.score?.pairA || null,
      scorePairB: match.score?.pairB || null,
      winnerPairId: match.score?.winner || match.winner_id || null,
      createdAt: match.created_at,
      updatedAt: match.updated_at,
    }));
  } catch (error) {
    console.error("❌ Error obteniendo partidos de eliminatorias:", error);
    throw error;
  }
}

// Función para obtener standings de todos los grupos de una categoría
export async function getAllGroupStandings(categoryId: string): Promise<{
  [groupId: string]: {
    groupName: string;
    standings: any[];
  };
}> {
  try {
    console.log(
      "📊 Obteniendo standings de todos los grupos para categoría:",
      categoryId
    );

    const groups = await getGroups(categoryId);
    const allPairs = await getPairs(categoryId);
    const standings: {
      [groupId: string]: { groupName: string; standings: any[] };
    } = {};

    for (const group of groups) {
      const groupPairs = allPairs.filter((pair) =>
        group.pairIds.includes(pair.id)
      );
      const groupStandings = await calculateStandings(group.id, groupPairs);

      standings[group.id] = {
        groupName: group.name,
        standings: groupStandings,
      };
    }

    console.log(
      "✅ Standings obtenidos para",
      Object.keys(standings).length,
      "grupos"
    );
    return standings;
  } catch (error) {
    console.error("❌ Error obteniendo standings de grupos:", error);
    throw error;
  }
}

// Función para limpiar todas las eliminatorias de una categoría
export async function clearEliminations(categoryId: string): Promise<void> {
  try {
    console.log("🧹 Limpiando eliminatorias para categoría:", categoryId);

    // Eliminar todos los partidos de eliminatorias
    const { error: matchesError } = await supabase
      .from("matches")
      .delete()
      .eq("category_id", categoryId)
      .in("stage", ["quarterfinals", "semifinals", "final", "third_place"]);

    if (matchesError) {
      console.error(
        "Error eliminando partidos de eliminatorias:",
        matchesError
      );
      throw matchesError;
    }

    console.log("✅ Eliminatorias limpiadas exitosamente");
  } catch (error) {
    console.error("❌ Error limpiando eliminatorias:", error);
    throw error;
  }
}

// Función para determinar el número esperado de partidos para cada stage
function getExpectedMatchCount(stage: string, matches: any[]): number {
  switch (stage) {
    case "quarterfinals":
      // Cuartos de final: 4 partidos (8 parejas)
      return 4;
    case "semifinals":
      // Semifinales: 2 partidos (4 parejas)
      return 2;
    case "final":
      // Final: 1 partido (2 parejas)
      return 1;
    case "third_place":
      // Tercer lugar: 1 partido (2 parejas)
      return 1;
    default:
      // Por defecto, no eliminar nada
      return matches.length;
  }
}

// Función para limpiar partidos duplicados de eliminatorias
export async function cleanDuplicateEliminationMatches(
  categoryId: string
): Promise<void> {
  try {
    console.log("🧹 Limpiando partidos duplicados de eliminatorias...");

    // Obtener todos los partidos de eliminatorias
    const allMatches = await getEliminationMatches(categoryId);

    // Agrupar por stage
    const matchesByStage = {
      quarterfinals: allMatches.filter((m) => m.stage === "quarterfinals"),
      semifinals: allMatches.filter((m) => m.stage === "semifinals"),
      final: allMatches.filter((m) => m.stage === "final"),
      third_place: allMatches.filter((m) => m.stage === "third_place"),
    };

    // Para cada stage, verificar si hay duplicados reales
    for (const [stage, matches] of Object.entries(matchesByStage)) {
      // Solo eliminar duplicados si hay más partidos de los esperados para cada stage
      const expectedCount = getExpectedMatchCount(stage, matches);

      if (matches.length > expectedCount) {
        console.log(
          `🗑️ Eliminando ${
            matches.length - expectedCount
          } partidos duplicados de ${stage}`
        );

        // Mantener los primeros partidos esperados, eliminar el resto
        const matchesToDelete = matches.slice(expectedCount);

        for (const match of matchesToDelete) {
          const { error } = await supabase
            .from("matches")
            .delete()
            .eq("id", match.id);

          if (error) {
            console.error(
              `❌ Error eliminando partido duplicado ${match.id}:`,
              error
            );
          } else {
            console.log(
              `✅ Eliminado partido duplicado ${match.id} de ${stage}`
            );
          }
        }
      }
    }

    console.log("✅ Limpieza de partidos duplicados completada");
  } catch (error) {
    console.error("❌ Error limpiando partidos duplicados:", error);
    throw error;
  }
}

// Función para verificar si se debe generar la siguiente ronda
export async function checkAndGenerateNextRound(
  categoryId: string,
  tournamentId: string
): Promise<Match[]> {
  try {
    console.log("🔍 Verificando si se debe generar la siguiente ronda...");

    // Primero limpiar partidos duplicados si los hay
    await cleanDuplicateEliminationMatches(categoryId);

    // Obtener todos los partidos de eliminatorias
    const allMatches = await getEliminationMatches(categoryId);

    console.log(`🔍 Total matches obtenidos: ${allMatches.length}`);
    console.log(`🔍 Stages de todos los matches:`, allMatches.map(m => ({ id: m.id, stage: m.stage, status: m.status })));

    if (allMatches.length === 0) {
      console.log("⚠️ No hay partidos de eliminatorias");
      return [];
    }

    // Verificar cuartos de final
    const quarterfinals = allMatches.filter((m) => m.stage === "quarterfinal" || m.stage === "quarterfinals");
    const completedQuarterfinals = quarterfinals.filter(
      (m) => m.status === "completed"
    );

    console.log(`🔍 DEBUG cuartos: Total: ${quarterfinals.length}, Completados: ${completedQuarterfinals.length}`);
    console.log(`🔍 DEBUG cuartos detalle:`, quarterfinals.map(m => ({ id: m.id, stage: m.stage, status: m.status })));

    if (
      quarterfinals.length > 0 &&
      completedQuarterfinals.length === quarterfinals.length
    ) {
      // Verificar si ya existen partidos de semifinales
      const existingSemifinals = allMatches.filter(
        (m) => m.stage === "semifinals" || m.stage === "semifinal"
      );

      if (existingSemifinals.length === 0) {
        // Todos los cuartos están completados y no hay semifinales, generar
        console.log(
          "✅ Todos los cuartos completados, generando semifinales..."
        );
        return await generateSemifinals(
          categoryId,
          tournamentId,
          completedQuarterfinals
        );
      } else {
        console.log("⚠️ Ya existen partidos de semifinales");
      }
    }

    // Verificar semifinales
    const semifinals = allMatches.filter((m) => m.stage === "semifinals" || m.stage === "semifinal");
    const completedSemifinals = semifinals.filter(
      (m) => m.status === "completed"
    );

    console.log(`🔍 DEBUG semifinales: Total: ${semifinals.length}, Completados: ${completedSemifinals.length}`);
    console.log(`🔍 DEBUG semifinales detalle:`, semifinals.map(m => ({ id: m.id, stage: m.stage, status: m.status })));

    if (
      semifinals.length > 0 &&
      completedSemifinals.length === semifinals.length
    ) {
      // Verificar si ya existen partidos de final y tercer lugar
      const existingFinals = allMatches.filter((m) => m.stage === "final");
      const existingThirdPlace = allMatches.filter(
        (m) => m.stage === "third_place"
      );

      if (existingFinals.length === 0 && existingThirdPlace.length === 0) {
        // Todos los semifinales están completados y no hay final/tercer lugar, generar
        console.log(
          "✅ Todos los semifinales completados, generando final y tercer lugar..."
        );
        return await generateFinalAndThirdPlace(
          categoryId,
          tournamentId,
          completedSemifinals
        );
      } else {
        console.log("⚠️ Ya existen partidos de final y/o tercer lugar");
      }
    }

    console.log("⏳ No se puede generar la siguiente ronda aún");
    return [];
  } catch (error) {
    console.error("❌ Error verificando siguiente ronda:", error);
    throw error;
  }
}

// Función para generar semifinales basado en ganadores de cuartos
async function generateSemifinals(
  categoryId: string,
  tournamentId: string,
  completedQuarterfinals: Match[]
): Promise<Match[]> {
  try {
    console.log("🏆 Generando semifinales...");

    // Obtener ganadores de cuartos
    const winners = completedQuarterfinals
      .map((match) => match.winnerPairId)
      .filter((winnerId) => winnerId !== null) as string[];

    console.log(`🔍 Ganadores de cuartos encontrados:`, winners);
    console.log(`🔍 Total ganadores: ${winners.length}`);

    if (winners.length < 2) {
      console.log("⚠️ No hay suficientes ganadores para semifinales");
      return [];
    }

    const matches: Match[] = [];
    const { v4: uuidv4 } = await import("uuid");

    // Crear semifinales
    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i + 1]) {
        const match: Match = {
          id: uuidv4(),
          tournamentId,
          categoryId,
          stage: "semifinal",
          pairAId: winners[i],
          pairBId: winners[i + 1],
          status: "pending",
        };
        matches.push(match);
        console.log(
          `⚽ Semifinal ${Math.floor(i / 2) + 1}: ${winners[i]} vs ${
            winners[i + 1]
          }`
        );
      }
    }

    // Crear partidos en la base de datos
    if (matches.length > 0) {
      const createdMatches = await createMatches(matches);
      console.log(`✅ Creados ${createdMatches.length} semifinales`);
      return createdMatches;
    }

    return [];
  } catch (error) {
    console.error("❌ Error generando semifinales:", error);
    throw error;
  }
}

// Función para generar final y tercer lugar basado en ganadores de semifinales
async function generateFinalAndThirdPlace(
  categoryId: string,
  tournamentId: string,
  completedSemifinals: Match[]
): Promise<Match[]> {
  try {
    console.log("🏆 Generando final y tercer lugar...");

    // Obtener ganadores y perdedores de semifinales
    console.log(
      "🔍 Analizando semifinales completadas:",
      completedSemifinals.length
    );

    const winners = completedSemifinals
      .map((match) => match.winnerPairId)
      .filter((winnerId) => winnerId !== null) as string[];

    const losers = completedSemifinals
      .map((match) => {
        if (match.winnerPairId === match.pairAId) {
          return match.pairBId;
        } else {
          return match.pairAId;
        }
      })
      .filter((loserId) => loserId !== null) as string[];

    console.log("🏆 Ganadores encontrados:", winners);
    console.log("😞 Perdedores encontrados:", losers);
    console.log(
      "📊 Cantidad - Ganadores:",
      winners.length,
      "Perdedores:",
      losers.length
    );

    if (winners.length < 2 || losers.length < 2) {
      console.log(
        "⚠️ No hay suficientes ganadores/perdedores para final y tercer lugar"
      );
      console.log(
        "🔍 Detalles de semifinales:",
        completedSemifinals.map((m) => ({
          id: m.id,
          pairA: m.pairAId,
          pairB: m.pairBId,
          winner: m.winnerPairId,
          status: m.status,
        }))
      );
      return [];
    }

    const matches: Match[] = [];
    const { v4: uuidv4 } = await import("uuid");

    // Crear final
    const finalMatch: Match = {
      id: uuidv4(),
      tournamentId,
      categoryId,
      stage: "final",
      pairAId: winners[0],
      pairBId: winners[1],
      status: "pending",
    };
    matches.push(finalMatch);
    console.log(`⚽ Final: ${winners[0]} vs ${winners[1]}`);

    // 🔧 OBTENER CONFIGURACIÓN DEL TORNEO PARA VERIFICAR 3ER LUGAR
    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("config")
      .eq("id", tournamentId)
      .single();

    if (tournamentError) {
      console.error(
        "❌ Error obteniendo configuración del torneo:",
        tournamentError
      );
    }

    const tournamentConfig = tournamentData?.config as TournamentConfig;
    const includeThirdPlace = tournamentConfig?.knockout?.thirdPlace ?? true; // default true para retrocompatibilidad

    console.log(`⚙️ Configuración - Incluir 3er lugar: ${includeThirdPlace}`);

    // Solo crear tercer lugar si está habilitado en la configuración
    if (includeThirdPlace) {
      const thirdPlaceMatch: Match = {
        id: uuidv4(),
        tournamentId,
        categoryId,
        stage: "third_place",
        pairAId: losers[0],
        pairBId: losers[1],
        status: "pending",
      };
      matches.push(thirdPlaceMatch);
      console.log(`⚽ 3er Lugar: ${losers[0]} vs ${losers[1]}`);
    } else {
      console.log(`🚫 3er lugar DESHABILITADO en configuración del torneo`);
    }

    // Crear partidos en la base de datos
    const createdMatches = await createMatches(matches);
    console.log(
      `✅ Creados ${createdMatches.length} partidos de final${
        includeThirdPlace ? " y tercer lugar" : ""
      }`
    );
    return createdMatches;
  } catch (error) {
    console.error("❌ Error generando final y tercer lugar:", error);
    throw error;
  }
}

// ============================================
// FUNCIONES PARA ELIMINATORIAS MANUALES
// ============================================

interface ManualMatch {
  id: string;
  pairA: {
    pairId: string;
    pairName: string;
  };
  pairB: {
    pairId: string;
    pairName: string;
  };
  round: string;
  matchNumber: number;
}

// Función para crear partidos de eliminatorias manuales
export async function createManualEliminationMatches(
  categoryId: string,
  tournamentId: string,
  manualMatches: ManualMatch[]
): Promise<Match[]> {
  try {
    console.log("🏆 NUEVO SISTEMA: Creando partidos de eliminatorias manuales...");
    console.log(`📊 ${manualMatches.length} partidos a crear`);

    // Validar que hay partidos para crear
    if (manualMatches.length === 0) {
      throw new Error("No hay partidos para crear");
    }

    // Importar uuid para generar IDs válidos
    const { v4: uuidv4 } = await import("uuid");

    // Convertir los partidos manuales al formato de la base de datos
    const dbMatches = manualMatches.map((match, index) => {
      console.log(`🔍 Procesando partido ${index + 1}:`, match);
      
      // Validar que los campos requeridos existen
      if (!match.pairA || !match.pairA.pairId) {
        throw new Error(`Partido ${index + 1}: pairA.pairId es requerido`);
      }
      if (!match.pairB || !match.pairB.pairId) {
        throw new Error(`Partido ${index + 1}: pairB.pairId es requerido`);
      }
      
      // Validar que las parejas son diferentes
      if (match.pairA.pairId === match.pairB.pairId) {
        throw new Error(`Partido ${index + 1}: Una pareja no puede jugar contra sí misma. PairA: ${match.pairA.pairName}, PairB: ${match.pairB.pairName}`);
      }
      
      // Determinar el stage basado en el número de partidos (AHORA CON BASE DE DATOS ARREGLADA)
      let stage = 'semifinal'; // Por defecto para eliminatorias
      
      if (manualMatches.length === 1) {
        stage = 'final';
        console.log(`✅ Partido único detectado - usando stage: 'final'`);
      } else if (manualMatches.length === 2) {
        stage = 'semifinal';
        console.log(`✅ Dos partidos detectados - usando stage: 'semifinal'`);
      } else if (manualMatches.length === 4) {
        stage = 'quarterfinal';
        console.log(`✅ Cuatro partidos detectados - usando stage: 'quarterfinal'`);
      } else if (manualMatches.length === 8) {
        stage = 'quarterfinal'; // Usar quarterfinal para octavos
        console.log(`✅ Ocho partidos detectados - usando stage: 'quarterfinal'`);
      }
      
      const matchData: any = {
        id: uuidv4(),
        tournament_id: tournamentId,
        category_id: categoryId,
        stage: stage,
        group_id: null,
        pair_a_id: match.pairA.pairId,
        pair_b_id: match.pairB.pairId,
        status: 'pending'
      };

      console.log(`✅ Partido ${index + 1} configurado con stage: '${stage}'`);
      return matchData;
    });

    console.log("🔍 Partidos finales a insertar:", JSON.stringify(dbMatches, null, 2));

    // Insertar los partidos en la base de datos
    const { data, error } = await supabase
      .from("matches")
      .insert(dbMatches)
      .select("*");

    if (error) {
      console.error("❌ Error creando partidos manuales:", error);
      console.error("❌ Error details:", JSON.stringify(error, null, 2));
      console.error("❌ Data que se intentó insertar:", JSON.stringify(dbMatches, null, 2));
      throw error;
    }

    console.log("✅ NUEVO SISTEMA: Partidos de eliminatorias creados exitosamente:", data);

    // Convertir a formato camelCase
    return data.map((match) => ({
      id: match.id,
      tournamentId: match.tournament_id,
      categoryId: match.category_id,
      stage: match.stage,
      groupId: match.group_id,
      pairAId: match.pair_a_id,
      pairBId: match.pair_b_id,
      day: match.day,
      startTime: match.start_time,
      courtId: match.court_id,
      status: match.status,
      score: match.score,
      createdAt: match.created_at,
      updatedAt: match.updated_at,
    }));
  } catch (error) {
    console.error("❌ Error creando partidos de eliminatorias manuales:", error);
    throw error;
  }
}

// Función para limpiar solo partidos de eliminatorias (no de grupos)
export async function clearManualEliminations(categoryId: string): Promise<void> {
  try {
    console.log("🗑️ Limpiando partidos de eliminatorias existentes...");

    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("category_id", categoryId)
      .in("stage", ["quarterfinal", "semifinal", "final", "third_place"]);

    if (error) {
      console.error("❌ Error limpiando eliminatorias:", error);
      throw error;
    }

    console.log("✅ Partidos de eliminatorias eliminados exitosamente");
  } catch (error) {
    console.error("❌ Error limpiando partidos de eliminatorias:", error);
    throw error;
  }
}

// Función para obtener partidos de eliminatorias de una categoría
export async function getManualEliminationMatches(
  categoryId: string
): Promise<Match[]> {
  try {
    // Solo una consulta optimizada - excluir matches de grupos
    const { data, error } = await supabase
      .from("matches")
      .select("id, tournament_id, category_id, stage, group_id, pair_a_id, pair_b_id, day, start_time, court_id, status, score, winner_id, created_at, updated_at")
      .eq("category_id", categoryId)
      .not("stage", "eq", "groups")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error obteniendo partidos de eliminatorias:", error);
      throw error;
    }

    // Convertir a formato camelCase
    return data.map((match) => ({
      id: match.id,
      tournamentId: match.tournament_id,
      categoryId: match.category_id,
      stage: match.stage,
      groupId: match.group_id,
      pairAId: match.pair_a_id,
      pairBId: match.pair_b_id,
      day: match.day,
      startTime: match.start_time,
      courtId: match.court_id,
      status: match.status,
      score: match.score,
      winnerPairId: match.winner_id,
      createdAt: match.created_at,
      updatedAt: match.updated_at,
    }));
  } catch (error) {
    console.error("Error en getManualEliminationMatches:", error);
    throw error;
  }
}
