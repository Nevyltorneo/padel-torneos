const { createClient } = require("@supabase/supabase-js");

// Configuración de Supabase
const SUPABASE_URL = "https://cbsfgbucnpujogxwvpim.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNic2ZnYnVjbnB1am9neHd2cGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc2MDY4MywiZXhwIjoyMDcyMzM2NjgzfQ.c9XD9fjMnWzdHCe9yIDd-tHXlMCKOPinu0q9fkr1wms";

// Crear cliente de Supabase con service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Limpia completamente un usuario de Supabase (roles, permisos, perfil)
 * @param {string} uid - UUID del usuario a borrar
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function cleanupUser(uid) {
  console.log(`🔄 Iniciando limpieza del usuario: ${uid}`);

  try {
    // 1. Eliminar roles del usuario
    console.log(`🗑️ Eliminando roles del usuario...`);
    const { error: deleteRolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", uid);

    if (deleteRolesError) {
      console.warn("⚠️ Error eliminando roles:", deleteRolesError.message);
    } else {
      console.log(`✅ Roles eliminados exitosamente`);
    }

    // 2. Eliminar permisos de torneos del usuario
    console.log(`🗑️ Eliminando permisos de torneos...`);
    const { error: deletePermissionsError } = await supabase
      .from("tournament_permissions")
      .delete()
      .eq("user_id", uid);

    if (deletePermissionsError) {
      console.warn(
        "⚠️ Error eliminando permisos:",
        deletePermissionsError.message
      );
    } else {
      console.log(`✅ Permisos eliminados exitosamente`);
    }

    // 3. Eliminar perfil del usuario
    console.log(`🗑️ Eliminando perfil del usuario...`);
    const { error: deleteProfileError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", uid);

    if (deleteProfileError) {
      console.warn("⚠️ Error eliminando perfil:", deleteProfileError.message);
    } else {
      console.log(`✅ Perfil eliminado exitosamente`);
    }

    console.log(`🎉 Usuario ${uid} limpiado completamente de la base de datos`);

    return {
      success: true,
      message: `Usuario ${uid} limpiado completamente de la base de datos`,
    };
  } catch (error) {
    console.error("❌ Error en cleanupUser:", error);
    return {
      success: false,
      message: `Error limpiando usuario: ${error.message}`,
    };
  }
}

/**
 * Elimina completamente un usuario de Supabase (auth + db)
 * @param {string} uid - UUID del usuario a borrar
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function deleteUserCompletely(uid) {
  console.log(`🔄 Iniciando borrado completo del usuario: ${uid}`);

  try {
    // 1. Primero limpiar la base de datos
    console.log(`📋 Paso 1: Limpiando registros de la base de datos...`);
    const cleanupResult = await cleanupUser(uid);

    if (!cleanupResult.success) {
      return cleanupResult;
    }

    // 2. Verificar que el usuario existe en auth.users
    console.log(`📋 Paso 2: Verificando usuario en auth.users...`);
    const { data: userData, error: checkError } =
      await supabase.auth.admin.getUserById(uid);

    if (checkError) {
      console.error("❌ Error verificando usuario:", checkError);
      return {
        success: false,
        message: `Error verificando usuario: ${checkError.message}`,
      };
    }

    if (!userData.user) {
      return {
        success: false,
        message: `Usuario ${uid} no encontrado en auth.users`,
      };
    }

    console.log(`✅ Usuario encontrado: ${userData.user.email}`);

    // 3. Borrar de auth.users
    console.log(`🗑️ Paso 3: Borrando usuario de auth.users...`);
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
      uid
    );

    if (deleteAuthError) {
      console.error("❌ Error borrando usuario de auth:", deleteAuthError);
      return {
        success: false,
        message: `Error borrando de auth: ${deleteAuthError.message}`,
      };
    }

    console.log(`✅ Usuario borrado de auth.users`);
    console.log(
      `🎉 Usuario ${uid} (${userData.user.email}) borrado completamente de Supabase`
    );

    return {
      success: true,
      message: `Usuario ${uid} (${userData.user.email}) borrado completamente de Supabase`,
    };
  } catch (error) {
    console.error("❌ Error general en deleteUserCompletely:", error);
    return {
      success: false,
      message: `Error borrando usuario: ${error.message}`,
    };
  }
}

// Ejemplo de uso
if (require.main === module) {
  const uid = process.argv[2];

  if (!uid) {
    console.log("📖 Uso:");
    console.log("  Limpieza solo: node cleanup-user.js <uid>");
    console.log("  Borrado completo: node delete-user-cleanup.js <uid>");
    console.log("");
    console.log(
      "Ejemplo: node delete-user-cleanup.js 72740151-42d5-4fae-b778-e5c6adf19dec"
    );
    process.exit(1);
  }

  deleteUserCompletely(uid)
    .then((result) => {
      console.log("📊 Resultado:", result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Error inesperado:", error);
      process.exit(1);
    });
}

module.exports = { cleanupUser, deleteUserCompletely };
