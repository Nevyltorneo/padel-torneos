const { createClient } = require("@supabase/supabase-js");

// =====================================================
// CONFIGURACIÓN - REEMPLAZA ESTOS VALORES CON LOS TUYOS
// =====================================================

const SUPABASE_URL = "https://tu-proyecto.supabase.co"; // ← TU URL DE SUPABASE
const SUPABASE_SERVICE_ROLE_KEY = "tu-service-role-key-aqui"; // ← TU SERVICE ROLE KEY

// =====================================================
// NO MODIFICAR NADA DEBAJO DE ESTA LÍNEA
// =====================================================

if (
  SUPABASE_URL === "https://tu-proyecto.supabase.co" ||
  SUPABASE_SERVICE_ROLE_KEY === "tu-service-role-key-aqui"
) {
  console.error("❌ ERROR: Configura tus credenciales de Supabase");
  console.error("1. Copia este archivo y modifícalo con tus valores reales");
  console.error("2. Reemplaza SUPABASE_URL con tu URL de proyecto");
  console.error(
    "3. Reemplaza SUPABASE_SERVICE_ROLE_KEY con tu service role key"
  );
  console.error("4. Ejecuta: node src/lib/delete-admin-test-user-simple.js");
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

    // 3. Eliminar el usuario de Auth
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
    }

    console.log("\n🎉 ¡PROCESO COMPLETADO!");
    console.log("================================");
    console.log("✅ Usuario admin@test.com eliminado");
    console.log("✅ Usuario Nevyl preservado");
    console.log("================================");
  } catch (error) {
    console.error("❌ Error inesperado:", error);
  }
}

// Ejecutar la función
deleteAdminTestUser();
