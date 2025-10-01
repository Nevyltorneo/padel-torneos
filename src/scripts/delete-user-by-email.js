const { createClient } = require("@supabase/supabase-js");

// Configuración - REEMPLAZA con tus valores reales
const SUPABASE_URL = "https://cbsfgbucnpujogxwvpim.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNic2ZnYnVjbnB1am9neHd2cGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc2MDY4MywiZXhwIjoyMDcyMzM2NjgzfQ.YOUR_SERVICE_ROLE_KEY_HERE";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Borra un usuario por su email
 */
async function deleteUserByEmail(email) {
  console.log(`🔍 Buscando usuario con email: ${email}`);

  try {
    // 1. Buscar el usuario en auth.users
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("❌ Error listando usuarios:", authError);
      return;
    }

    const user = authUsers.users.find((u) => u.email === email);

    if (!user) {
      console.error(`❌ Usuario con email ${email} no encontrado`);
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.id} (${user.email})`);

    // 2. Borrar de todas las tablas
    const results = [];

    // Borrar roles
    const { error: rolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", user.id);

    if (rolesError) {
      results.push(`❌ Error borrando roles: ${rolesError.message}`);
    } else {
      results.push(`✅ Roles borrados`);
    }

    // Borrar perfil
    const { error: profileError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) {
      results.push(`❌ Error borrando perfil: ${profileError.message}`);
    } else {
      results.push(`✅ Perfil borrado`);
    }

    // Borrar de auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (authDeleteError) {
      results.push(`❌ Error borrando auth: ${authDeleteError.message}`);
    } else {
      results.push(`✅ Usuario borrado de auth`);
    }

    console.log(`📊 Resultados para ${email}:`);
    results.forEach((result) => console.log(`  ${result}`));

    if (results.every((r) => r.includes("✅"))) {
      console.log(`🎉 Usuario ${email} borrado completamente`);
    } else {
      console.log(`⚠️ Usuario ${email} borrado parcialmente`);
    }
  } catch (error) {
    console.error("❌ Error general:", error);
  }
}

// Ejemplo de uso
if (require.main === module) {
  const email = process.argv[2];

  if (!email) {
    console.log("📖 Uso: node delete-user-by-email.js <email>");
    console.log("Ejemplo: node delete-user-by-email.js admin@test.com");
    console.log("Ejemplo: node delete-user-by-email.js testuser1@gmail.com");
    process.exit(1);
  }

  deleteUserByEmail(email);
}

module.exports = { deleteUserByEmail };
