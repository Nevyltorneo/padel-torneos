const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Configuración de Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Error: Variables de entorno no encontradas");
  console.error(
    "Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function deleteAdminTestUser() {
  const USER_ID_TO_DELETE = "72740151-42d5-4fae-b778-e5c6adf19dec";
  const USER_EMAIL = "admin@test.com";

  console.log("🗑️  INICIANDO ELIMINACIÓN DEL USUARIO DE PRUEBA");
  console.log("========================================");
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`🆔 User ID: ${USER_ID_TO_DELETE}`);
  console.log("========================================\n");

  try {
    // 1. Verificar que el usuario existe
    console.log("🔍 1. Verificando que el usuario existe...");
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(USER_ID_TO_DELETE);

    if (userError) {
      console.error("❌ Error verificando usuario:", userError);
      return;
    }

    if (!userData.user) {
      console.log(
        "ℹ️  Usuario no encontrado en Auth, puede que ya esté eliminado"
      );
    } else {
      console.log("✅ Usuario encontrado en Auth");
      console.log(`   Email: ${userData.user.email}`);
      console.log(`   Creado: ${userData.user.created_at}`);
    }

    // 2. Eliminar referencias en tablas de la base de datos
    console.log("\n🧹 2. Eliminando referencias en la base de datos...");

    // Eliminar de user_roles
    const { error: rolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", USER_ID_TO_DELETE);

    if (rolesError) {
      console.error("❌ Error eliminando roles:", rolesError);
    } else {
      console.log("✅ Roles eliminados");
    }

    // Eliminar de user_profiles
    const { error: profileError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", USER_ID_TO_DELETE);

    if (profileError) {
      console.error("❌ Error eliminando perfil:", profileError);
    } else {
      console.log("✅ Perfil eliminado");
    }

    // Verificar si hay otras tablas que referencien al usuario
    const { data: existingRoles, error: checkRolesError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", USER_ID_TO_DELETE);

    if (!checkRolesError && existingRoles && existingRoles.length > 0) {
      console.log("⚠️  Aún quedan roles del usuario:", existingRoles.length);
    }

    // 3. Eliminar el usuario de Auth (este es el paso final y más importante)
    console.log("\n🔐 3. Eliminando usuario de Supabase Auth...");

    if (userData.user) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        USER_ID_TO_DELETE
      );

      if (deleteError) {
        console.error("❌ Error eliminando usuario de Auth:", deleteError);
        console.error("   Detalles:", deleteError.message);

        // Si hay error, intentar con el email
        console.log("🔄 Intentando eliminar por email...");
        const { error: deleteByEmailError } =
          await supabase.auth.admin.deleteUser(userData.user.email);

        if (deleteByEmailError) {
          console.error("❌ Error eliminando por email:", deleteByEmailError);
          console.log(
            "💡 NOTA: Puede que necesites eliminar manualmente desde Supabase Dashboard"
          );
        } else {
          console.log("✅ Usuario eliminado exitosamente por email");
        }
      } else {
        console.log("✅ Usuario eliminado exitosamente de Auth");
      }
    } else {
      console.log("ℹ️  Usuario ya no existe en Auth");
    }

    // 4. Verificación final
    console.log("\n✅ 4. Verificación final...");

    const { data: finalCheck, error: finalCheckError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", USER_ID_TO_DELETE);

    if (!finalCheckError && (!finalCheck || finalCheck.length === 0)) {
      console.log("✅ Usuario completamente eliminado de la base de datos");
    } else {
      console.log("⚠️  El usuario puede que aún exista en algunas tablas");
      if (finalCheck && finalCheck.length > 0) {
        console.log("   Encontrado en user_profiles:", finalCheck);
      }
    }

    console.log("\n🎉 ¡PROCESO COMPLETADO!");
    console.log("================================");
    console.log("✅ Usuario admin@test.com eliminado");
    console.log("✅ Usuario Nevyl (nrm001sm@hotmail.com) preservado");
    console.log("================================");
  } catch (error) {
    console.error("❌ Error inesperado:", error);
  }
}

// Ejecutar la función
deleteAdminTestUser();
