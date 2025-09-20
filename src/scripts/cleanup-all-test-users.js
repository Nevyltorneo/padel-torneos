const { createClient } = require("@supabase/supabase-js");

// =====================================================
// LIMPIEZA TOTAL DE USUARIOS DE PRUEBA
// =====================================================

const SUPABASE_URL = "https://cbsfgbucnpujogxwvpim.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNic2ZnYnVjbnB1am9neHd2cGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc2MDY4MywiZXhwIjoyMDcyMzM2NjgzfQ.c9XD9fjMnWzdHCe9yIDd-tHXlMCKOPinu0q9fkr1wms";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Lista todos los usuarios y clasifica cuáles son basura
 */
async function listAllUsers() {
  console.log("🔍 ANALIZANDO TODOS LOS USUARIOS...");
  console.log("=====================================");

  try {
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("❌ Error obteniendo usuarios:", authError);
      return { users: [], error };
    }

    console.log(`📊 Total de usuarios encontrados: ${authUsers.users.length}`);
    console.log("");

    // Clasificar usuarios
    const realUsers = [];
    const testUsers = [];
    const demoUsers = [];
    const gmailUsers = [];

    authUsers.users.forEach((user) => {
      const email = user.email || "SIN EMAIL";

      console.log(`📧 ${user.id} -> ${email} (${user.created_at})`);

      if (email === "admin@test.com") {
        realUsers.push(user);
      } else if (email.includes("@demo.com")) {
        demoUsers.push(user);
      } else if (email.includes("@gmail.com")) {
        gmailUsers.push(user);
      } else if (
        email.includes("test") ||
        email.includes("prueba") ||
        email === "SIN EMAIL"
      ) {
        testUsers.push(user);
      } else {
        realUsers.push(user);
      }
    });

    console.log("");
    console.log("📋 CLASIFICACIÓN:");
    console.log(`✅ Usuarios reales: ${realUsers.length}`);
    console.log(`🗑️ Usuarios demo (@demo.com): ${demoUsers.length}`);
    console.log(`🗑️ Usuarios gmail (@gmail.com): ${gmailUsers.length}`);
    console.log(`🗑️ Usuarios test/prueba: ${testUsers.length}`);

    return {
      allUsers: authUsers.users,
      realUsers,
      testUsers,
      demoUsers,
      gmailUsers,
      totalTest: testUsers.length + demoUsers.length + gmailUsers.length,
    };
  } catch (error) {
    console.error("❌ Error en listAllUsers:", error);
    return { users: [], error };
  }
}

/**
 * Borra un usuario específico
 */
async function deleteSingleUser(user) {
  const email = user.email || "SIN EMAIL";

  try {
    console.log(`🗑️ Borrando: ${email} (${user.id})`);

    // Borrar de todas las tablas primero
    const results = [];

    // 1. Borrar roles
    const { error: rolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", user.id);

    if (rolesError) {
      results.push(`❌ Roles: ${rolesError.message}`);
    } else {
      results.push("✅ Roles");
    }

    // 2. Borrar perfil
    const { error: profileError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) {
      results.push(`❌ Perfil: ${profileError.message}`);
    } else {
      results.push("✅ Perfil");
    }

    // 3. Borrar de auth
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

    if (authError) {
      results.push(`❌ Auth: ${authError.message}`);
    } else {
      results.push("✅ Auth");
    }

    // Mostrar resultado
    results.forEach((result) => console.log(`  ${result}`));

    const success = results.filter((r) => r.includes("✅")).length >= 2;

    if (success) {
      console.log(`🎉 Usuario ${email} borrado exitosamente`);
      return true;
    } else {
      console.log(`⚠️ Usuario ${email} borrado parcialmente`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error borrando ${email}:`, error);
    return false;
  }
}

/**
 * Limpia todos los usuarios de prueba
 */
async function cleanupAllTestUsers() {
  console.log("🧹 INICIANDO LIMPIEZA TOTAL DE USUARIOS DE PRUEBA");
  console.log("=================================================");

  const classification = await listAllUsers();

  if (classification.totalTest === 0) {
    console.log("✅ No hay usuarios de prueba que borrar");
    return;
  }

  console.log("");
  console.log("⚠️ USUARIOS QUE SE VAN A BORRAR:");
  console.log("--------------------------------");

  [
    ...classification.demoUsers,
    ...classification.gmailUsers,
    ...classification.testUsers,
  ].forEach((user) => {
    const email = user.email || "SIN EMAIL";
    console.log(`🗑️ ${email} (${user.id})`);
  });

  console.log("");
  console.log("✅ USUARIOS QUE SE MANTENDRÁN:");
  console.log("-----------------------------");

  classification.realUsers.forEach((user) => {
    const email = user.email || "SIN EMAIL";
    console.log(`✅ ${email} (${user.id})`);
  });

  console.log("");
  console.log("🔄 ¿Proceder con el borrado? (y/n)");
  console.log("⚠️ Esta acción es IRREVERSIBLE");

  // Proceder automáticamente (en un entorno real, pedir confirmación)
  console.log("🔄 Procediendo con borrado automático...");

  const usersToDelete = [
    ...classification.demoUsers,
    ...classification.gmailUsers,
    ...classification.testUsers,
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const user of usersToDelete) {
    console.log("");
    console.log(`📝 Procesando: ${user.email || "SIN EMAIL"}`);

    const success = await deleteSingleUser(user);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  console.log("");
  console.log("📊 RESUMEN DE LIMPIEZA:");
  console.log("======================");
  console.log(`✅ Borrados exitosamente: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log(`🗑️ Total procesados: ${usersToDelete.length}`);
  console.log(
    `💾 Usuarios reales mantenidos: ${classification.realUsers.length}`
  );
  console.log("");
  console.log("🎉 ¡LIMPIEZA COMPLETADA!");
}

// =====================================================
// EJECUCIÓN
// =====================================================

if (require.main === module) {
  const command = process.argv[2] || "list";

  switch (command) {
    case "list":
      listAllUsers();
      break;

    case "cleanup":
      cleanupAllTestUsers();
      break;

    default:
      console.log("📖 Comandos disponibles:");
      console.log(
        "  node cleanup-all-test-users.js list - Lista y clasifica todos los usuarios"
      );
      console.log(
        "  node cleanup-all-test-users.js cleanup - Borra TODOS los usuarios de prueba"
      );
      console.log("");
      console.log("⚠️ ADVERTENCIA: Esta herramienta es AGRESIVA");
      console.log("✅ Solo mantiene usuarios reales como admin@test.com");
      console.log("🗑️ Borra todo lo que parezca de prueba, demo, test, gmail");
      break;
  }
}

module.exports = {
  listAllUsers,
  cleanupAllTestUsers,
  deleteSingleUser,
};
