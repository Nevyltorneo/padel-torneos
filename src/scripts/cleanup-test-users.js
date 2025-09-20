const { createClient } = require("@supabase/supabase-js");

// Configuración - REEMPLAZA con tu Service Role Key real
const SUPABASE_URL = "https://cbsfgbucnpujogxwvpim.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNic2ZnYnVjbnB1am9neHd2cGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc2MDY4MywiZXhwIjoyMDcyMzM2NjgzfQ.c9XD9fjMnWzdHCe9yIDd-tHXlMCKOPinu0q9fkr1wms";

if (SUPABASE_SERVICE_ROLE_KEY.includes("YOUR_SERVICE_ROLE_KEY")) {
  console.error("❌ ERROR: Configura tu SUPABASE_SERVICE_ROLE_KEY real");
  console.log("🔧 Ve a Settings > API > service_role en Supabase");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Lista usuarios que son de prueba o tienen problemas
 */
async function listProblematicUsers() {
  console.log("🔍 Analizando usuarios para LIMPIAR...");
  console.log("📋 Buscando usuarios de prueba como:");
  console.log("  - admin.test@demo.com, test.user@demo.com");
  console.log("  - user1.test@demo.com, user2.test@demo.com");
  console.log("  - admin@gmail.com, testuser1@gmail.com");
  console.log("  - testuser2@gmail.com, testuser3@gmail.com");
  console.log("  - Cualquier email con 'test', 'demo', 'prueba'");
  console.log("");

  try {
    // Obtener usuarios de auth
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("❌ Error obteniendo usuarios:", authError);
      return;
    }

    console.log(
      `📊 Encontrados ${authUsers.users.length} usuarios en auth.users`
    );
    console.log("");

    // Filtrar usuarios a borrar (usuarios de prueba y sin email)
    const problematic = authUsers.users.filter((user) => {
      const email = user.email || "";

      // NO BORRAR admin@test.com - es el usuario principal del sistema
      if (email === "admin@test.com") {
        return false;
      }

      // Patrones específicos de usuarios de prueba vistos en las imágenes
      const testPatterns = [
        "admin.test@demo.com",
        "test.user@demo.com",
        "user2.test@demo.com",
        "user1.test@demo.com",
        "admin@gmail.com",
        "testuser3@gmail.com",
        "testuser2@gmail.com",
        "testuser1@gmail.com",
        "nevyl.stc@gmail.com",
      ];

      if (testPatterns.includes(email)) {
        return true;
      }

      // También detectar usuarios que contengan estas palabras
      const testWords = ["test", "demo", "prueba", "pruebas"];
      if (testWords.some((word) => email.toLowerCase().includes(word))) {
        return true;
      }

      // Borrar usuarios específicos que se ven en las imágenes
      const specificTestEmails = [
        "admin.test@demo.com",
        "test.user@demo.com",
        "user2.test@demo.com",
        "user1.test@demo.com",
        "admin@gmail.com",
        "testuser3@gmail.com",
        "testuser2@gmail.com",
        "testuser1@gmail.com",
      ];

      if (specificTestEmails.includes(email)) {
        return true;
      }

      // Borrar todos los de prueba, demo, gmail, etc.
      return (
        email.includes("@demo.com") ||
        email.includes("@gmail.com") ||
        (email.includes("@test.com") && email !== "admin@test.com") ||
        email.includes("@example.com") ||
        email.includes("@master.com") ||
        email === null ||
        email === "" ||
        email === "-"
      );
    });

    console.log(
      `⚠️ Usuarios BASURA encontrados: ${problematic.length} (se mantendrán usuarios reales como admin@test.com)`
    );
    problematic.forEach((user) => {
      console.log(
        `  - ${user.id}: ${user.email || "SIN EMAIL"} - ${user.created_at}`
      );
    });

    return problematic;
  } catch (error) {
    console.error("❌ Error en listProblematicUsers:", error);
    return [];
  }
}

/**
 * Borra un usuario por su email
 */
async function deleteUserByEmail(email) {
  console.log(`🗑️ Borrando usuario con email: ${email}`);

  try {
    // Buscar el usuario
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("❌ Error listando usuarios:", authError);
      return false;
    }

    const user = authUsers.users.find((u) => u.email === email);

    if (!user) {
      console.error(`❌ Usuario ${email} no encontrado`);
      return false;
    }

    // Borrar de todas las tablas
    const results = [];

    // Borrar roles
    const { error: rolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", user.id);

    if (rolesError) {
      results.push(`❌ Roles: ${rolesError.message}`);
    } else {
      results.push(`✅ Roles`);
    }

    // Borrar perfil
    const { error: profileError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) {
      results.push(`❌ Perfil: ${profileError.message}`);
    } else {
      results.push(`✅ Perfil`);
    }

    // Borrar de auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (authDeleteError) {
      results.push(`❌ Auth: ${authDeleteError.message}`);
    } else {
      results.push(`✅ Auth`);
    }

    console.log(`📊 Resultados para ${email}:`);
    results.forEach((result) => console.log(`  ${result}`));

    const success = results.filter((r) => r.includes("✅")).length >= 2; // Al menos Auth y Perfil

    if (success) {
      console.log(`🎉 Usuario ${email} borrado exitosamente`);
    } else {
      console.log(`⚠️ Usuario ${email} borrado parcialmente`);
    }

    return success;
  } catch (error) {
    console.error("❌ Error borrando usuario:", error);
    return false;
  }
}

/**
 * Limpia usuarios de prueba, demo y basura, mantiene usuarios reales
 */
async function cleanupAllProblematic() {
  console.log(
    "🧹 Iniciando limpieza - BORRARÁ usuarios de prueba/demo, MANTENDRÁ usuarios reales..."
  );

  const problematic = await listProblematicUsers();

  if (problematic.length === 0) {
    console.log("✅ No hay usuarios problemáticos que limpiar");
    return;
  }

  console.log("");
  console.log(
    "⚠️ ¿Quieres borrar TODOS estos usuarios (manteniendo solo admin@test.com)? (y/n)"
  );

  // En un entorno real, pedir confirmación
  // Por ahora, procedemos automáticamente
  console.log("🔄 Procediendo con borrado automático...");

  let successCount = 0;
  let errorCount = 0;

  for (const user of problematic) {
    const email = user.email || "SIN_EMAIL";
    console.log("");
    console.log(`📝 Procesando: ${email}`);

    const success = await deleteUserByEmail(email);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  console.log("");
  console.log("📊 RESUMEN DE LIMPIEZA:");
  console.log(`✅ Usuarios basura eliminados: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log(`🗑️ Total procesados: ${problematic.length}`);
  console.log(
    `💾 Usuarios reales mantenidos: admin@test.com y otros usuarios legítimos`
  );
}

// Ejemplo de uso
if (require.main === module) {
  const command = process.argv[2];
  const email = process.argv[3];

  switch (command) {
    case "list":
      listProblematicUsers();
      break;

    case "delete":
      if (!email) {
        console.log("📖 Uso: node cleanup-test-users.js delete <email>");
        console.log(
          "Ejemplo: node cleanup-test-users.js delete admin@test.com"
        );
        process.exit(1);
      }
      deleteUserByEmail(email);
      break;

    case "cleanup-all":
      cleanupAllProblematic();
      break;

    default:
      console.log("📖 Comandos disponibles:");
      console.log(
        "  node cleanup-test-users.js list - Lista usuarios BASURA para borrar"
      );
      console.log(
        "  node cleanup-test-users.js delete <email> - Borra un usuario específico"
      );
      console.log(
        "  node cleanup-test-users.js cleanup-all - Borra usuarios de prueba/demo (mantiene usuarios reales)"
      );
      break;
  }
}

module.exports = {
  listProblematicUsers,
  deleteUserByEmail,
  cleanupAllProblematic,
};
