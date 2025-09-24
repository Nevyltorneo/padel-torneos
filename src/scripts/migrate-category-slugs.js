const { createClient } = require("@supabase/supabase-js");

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Faltan variables de entorno de Supabase");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Genera un slug a partir de un nombre de categoría
 */
function generateCategorySlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s-]/g, "") // Remover caracteres especiales
    .replace(/\s+/g, "-") // Reemplazar espacios con guiones
    .replace(/-+/g, "-") // Remover guiones múltiples
    .replace(/^-|-$/g, ""); // Remover guiones al inicio y final
}

/**
 * Migra las categorías existentes para agregar slugs
 */
async function migrateCategorySlugs() {
  try {
    console.log("🔄 Iniciando migración de slugs para categorías...");

    // Obtener todas las categorías
    const { data: categories, error: fetchError } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("❌ Error obteniendo categorías:", fetchError);
      return;
    }

    console.log(`📊 Encontradas ${categories.length} categorías`);

    if (categories.length === 0) {
      console.log("✅ No hay categorías para migrar");
      return;
    }

    // Procesar cada categoría
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const category of categories) {
      try {
        // Si ya tiene slug, saltar
        if (category.slug) {
          console.log(
            `⏭️  Saltando categoría "${category.name}" - ya tiene slug: ${category.slug}`
          );
          skipped++;
          continue;
        }

        // Generar slug
        const slug = generateCategorySlug(category.name);

        if (!slug) {
          console.warn(`⚠️  No se pudo generar slug para "${category.name}"`);
          errors++;
          continue;
        }

        // Verificar si el slug ya existe
        const { data: existingCategory } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", slug)
          .neq("id", category.id)
          .single();

        if (existingCategory) {
          // Si el slug ya existe, agregar un número
          let uniqueSlug = slug;
          let counter = 1;

          while (true) {
            const { data: checkCategory } = await supabase
              .from("categories")
              .select("id")
              .eq("slug", uniqueSlug)
              .neq("id", category.id)
              .single();

            if (!checkCategory) break;

            uniqueSlug = `${slug}-${counter}`;
            counter++;
          }

          console.log(
            `🔄 Slug duplicado para "${category.name}", usando: ${uniqueSlug}`
          );
        }

        // Actualizar la categoría con el slug
        const { error: updateError } = await supabase
          .from("categories")
          .update({ slug: uniqueSlug || slug })
          .eq("id", category.id);

        if (updateError) {
          console.error(
            `❌ Error actualizando categoría "${category.name}":`,
            updateError
          );
          errors++;
        } else {
          console.log(
            `✅ Actualizada categoría "${category.name}" con slug: ${
              uniqueSlug || slug
            }`
          );
          updated++;
        }
      } catch (error) {
        console.error(
          `❌ Error procesando categoría "${category.name}":`,
          error
        );
        errors++;
      }
    }

    console.log("\n📊 Resumen de la migración:");
    console.log(`✅ Categorías actualizadas: ${updated}`);
    console.log(`⏭️  Categorías saltadas: ${skipped}`);
    console.log(`❌ Errores: ${errors}`);

    if (errors === 0) {
      console.log("\n🎉 ¡Migración completada exitosamente!");
    } else {
      console.log("\n⚠️  Migración completada con errores");
    }
  } catch (error) {
    console.error("❌ Error en la migración:", error);
  }
}

// Ejecutar la migración
migrateCategorySlugs();
