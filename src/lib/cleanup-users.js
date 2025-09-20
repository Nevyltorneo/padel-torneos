const { createClient } = require("@supabase/supabase-js");

// Configuración de Supabase
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://cbsfgbucnpujogxwvpim.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNic2ZnYnVjbnB1am9neHd2cGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc2MDY4MywiZXhwIjoyMDcyMzM2NjgzfQ.YOUR_SERVICE_ROLE_KEY_HERE";

if (
  !SUPABASE_SERVICE_ROLE_KEY ||
  SUPABASE_SERVICE_ROLE_KEY.includes("YOUR_SERVICE_ROLE_KEY")
) {
  console.error(
    "❌ ERROR: SUPABASE_SERVICE_ROLE_KEY no está configurada correctamente"
  );
  console.log("🔧 Obtén la Service Role Key de: Settings > API > service_role");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Lista todos los usuarios en auth.users
 */
async function listAllAuthUsers() {
  console.log("🔍 Listando usuarios en auth.users...");

  try {
    // Nota: Esta función requiere permisos especiales
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error("❌ Error listando usuarios:", error);
      return [];
    }

    console.log(`✅ Encontrados ${users.users.length} usuarios en auth.users:`);
    users.users.forEach((user) => {
      console.log(`  - ${user.id}: ${user.email}`);
    });

    return users.users;
  } catch (error) {
    console.error("❌ Error en listAllAuthUsers:", error);
    return [];
  }
}

/**
 * Lista todos los perfiles de usuario
 */
async function listAllUserProfiles() {
  console.log("🔍 Listando perfiles en user_profiles...");

  try {
    const { data: profiles, error } = await supabase
      .from("user_profiles")
      .select("*");

    if (error) {
      console.error("❌ Error listando perfiles:", error);
      return [];
    }

    console.log(`✅ Encontrados ${profiles.length} perfiles:`);
    profiles.forEach((profile) => {
      console.log(
        `  - ${profile.id}: ${profile.full_name} (${
          profile.email || "sin email"
        })`
      );
    });

    return profiles;
  } catch (error) {
    console.error("❌ Error en listAllUserProfiles:", error);
    return [];
  }
}

/**
 * Borra un usuario completamente de todas las tablas
 */
async function deleteUserFromAllTables(uid) {
  console.log(`🗑️ Borrando usuario ${uid} de todas las tablas...`);

  try {
    const results = [];

    // 1. Borrar de user_roles
    const { error: rolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", uid);

    if (rolesError) {
      results.push(`❌ Error borrando roles: ${rolesError.message}`);
    } else {
      results.push(`✅ Roles borrados`);
    }

    // 2. Borrar de user_profiles
    const { error: profileError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", uid);

    if (profileError) {
      results.push(`❌ Error borrando perfil: ${profileError.message}`);
    } else {
      results.push(`✅ Perfil borrado`);
    }

    // 3. Borrar de auth.users usando admin API
    const { error: authError } = await supabase.auth.admin.deleteUser(uid);

    if (authError) {
      results.push(`❌ Error borrando auth: ${authError.message}`);
    } else {
      results.push(`✅ Usuario borrado de auth`);
    }

    console.log(`📊 Resultados para ${uid}:`);
    results.forEach((result) => console.log(`  ${result}`));

    return {
      success: !authError && !profileError,
      results,
    };
  } catch (error) {
    console.error("❌ Error general en deleteUserFromAllTables:", error);
    return {
      success: false,
      results: [`Error general: ${error.message}`],
    };
  }
}

/**
 * Limpia usuarios huérfanos (que existen en auth pero no en profiles o viceversa)
 */
async function cleanupOrphanedUsers() {
  console.log("🧹 Iniciando limpieza de usuarios huérfanos...");

  try {
    // Obtener todos los usuarios de auth
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("❌ Error obteniendo usuarios de auth:", authError);
      return;
    }

    // Obtener todos los perfiles
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id");

    if (profilesError) {
      console.error("❌ Error obteniendo perfiles:", profilesError);
      return;
    }

    const profileIds = new Set(profiles?.map((p) => p.id) || []);

    console.log(`📊 Encontrados ${authUsers.users.length} usuarios en auth`);
    console.log(`📊 Encontrados ${profileIds.size} perfiles`);

    // Encontrar usuarios sin perfil
    const usersWithoutProfile = authUsers.users.filter(
      (user) => !profileIds.has(user.id)
    );

    if (usersWithoutProfile.length === 0) {
      console.log("✅ No hay usuarios huérfanos");
      return;
    }

    console.log(
      `⚠️ Encontrados ${usersWithoutProfile.length} usuarios sin perfil:`
    );
    usersWithoutProfile.forEach((user) => {
      console.log(`  - ${user.id}: ${user.email}`);
    });

    // Preguntar si quiere borrarlos
    console.log("❓ ¿Quieres borrar estos usuarios huérfanos? (y/n)");
  } catch (error) {
    console.error("❌ Error en cleanupOrphanedUsers:", error);
  }
}

// Ejemplo de uso
if (require.main === module) {
  const command = process.argv[2];
  const uid = process.argv[3];

  switch (command) {
    case "list":
      listAllAuthUsers();
      listAllUserProfiles();
      break;

    case "delete":
      if (!uid) {
        console.log("📖 Uso: node cleanup-users.js delete <uid>");
        console.log(
          "Ejemplo: node cleanup-users.js delete 123e4567-e89b-12d3-a456-426614174000"
        );
        process.exit(1);
      }
      deleteUserFromAllTables(uid);
      break;

    case "cleanup":
      cleanupOrphanedUsers();
      break;

    default:
      console.log("📖 Comandos disponibles:");
      console.log("  node cleanup-users.js list - Lista todos los usuarios");
      console.log(
        "  node cleanup-users.js delete <uid> - Borra un usuario específico"
      );
      console.log(
        "  node cleanup-users.js cleanup - Limpia usuarios huérfanos"
      );
      break;
  }
}

module.exports = {
  listAllAuthUsers,
  listAllUserProfiles,
  deleteUserFromAllTables,
  cleanupOrphanedUsers,
};
