const { createClient } = require("@supabase/supabase-js");

// Configuración de Supabase
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://cbsfgbucnpujogxwvpim.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNic2ZnYnVjbnB1am9neHd2cGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc2MDY4MywiZXhwIjoyMDcyMzM2NjgzfQ.c9XD9fjMnWzdHCe9yIDd-tHXlMCKOPinu0q9fkr1wms";

if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY.length < 50) {
  console.error(
    "❌ ERROR: SUPABASE_SERVICE_ROLE_KEY no está configurada correctamente"
  );
  console.log("🔧 Instrucciones para obtener la Service Role Key:");
  console.log("1. Ve a tu proyecto de Supabase");
  console.log("2. Ve a Settings > API");
  console.log('3. Copia la "service_role" key (NO la "anon" key)');
  console.log(
    "4. Configúrala como variable de entorno SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

// Crear cliente de Supabase con service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Borra un usuario completamente de Supabase
 * @param {string} uid - UUID del usuario a borrar
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function deleteUser(uid) {
  console.log(`🔄 Iniciando borrado del usuario: ${uid}`);

  try {
    // Validar que uid sea un UUID válido
    if (!uid || typeof uid !== "string") {
      throw new Error("UID inválido: debe ser un string no vacío");
    }

    // Verificar que el usuario existe en auth.users
    console.log(`📋 Verificando usuario en auth.users...`);
    const { data: userData, error: checkError } =
      await supabase.auth.admin.getUserById(uid);

    if (checkError) {
      console.error("❌ Error verificando usuario:", checkError);
      throw new Error(`Error verificando usuario: ${checkError.message}`);
    }

    if (!userData.user) {
      console.warn(`⚠️ Usuario ${uid} no encontrado en auth.users`);
      return {
        success: false,
        message: `Usuario ${uid} no encontrado en auth.users`,
      };
    }

    console.log(`✅ Usuario encontrado: ${userData.user.email}`);

    // 1. Borrar de auth.users usando admin API
    console.log(`🗑️ Borrando usuario de auth.users...`);
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
      uid
    );

    if (deleteAuthError) {
      console.error("❌ Error borrando usuario de auth:", deleteAuthError);
      throw new Error(`Error borrando de auth: ${deleteAuthError.message}`);
    }

    console.log(`✅ Usuario borrado de auth.users`);

    // 2. Borrar de la tabla user_profiles
    console.log(`🗑️ Borrando usuario de tabla user_profiles...`);
    const { error: deleteUserError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", uid);

    if (deleteUserError) {
      console.error(
        "❌ Error borrando usuario de tabla user_profiles:",
        deleteUserError
      );
      // No lanzar error aquí, solo loguear - el usuario ya se borró de auth
      console.warn("⚠️ Usuario borrado de auth pero no de tabla user_profiles");
      return {
        success: false,
        message: `Usuario borrado de auth pero error en tabla users: ${deleteUserError.message}`,
      };
    }

    console.log(`✅ Usuario borrado de tabla user_profiles`);

    // 3. Borrar también de user_roles si tiene roles asignados
    console.log(`🗑️ Borrando roles del usuario...`);
    const { error: deleteRolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", uid);

    if (deleteRolesError) {
      console.warn(
        "⚠️ Error borrando roles (puede no tener roles):",
        deleteRolesError.message
      );
    } else {
      console.log(`✅ Roles borrados exitosamente`);
    }

    console.log(`🎉 Usuario ${uid} borrado completamente de Supabase`);

    return {
      success: true,
      message: `Usuario ${uid} borrado completamente de Supabase`,
    };
  } catch (error) {
    console.error("❌ Error general en deleteUser:", error);
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
    console.log("📖 Uso: node delete-user.js <uid>");
    console.log(
      "Ejemplo: node delete-user.js 123e4567-e89b-12d3-a456-426614174000"
    );
    process.exit(1);
  }

  deleteUser(uid)
    .then((result) => {
      console.log("📊 Resultado:", result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Error inesperado:", error);
      process.exit(1);
    });
}

module.exports = { deleteUser };
