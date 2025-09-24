-- Agregar campo slug a la tabla categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug TEXT;

-- Crear índice único para el slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Función para generar slug automáticamente
CREATE OR REPLACE FUNCTION generate_category_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(name, '[áàäâ]', 'a', 'g'),
                        '[éèëê]', 'e', 'g'
                      ),
                      '[íìïî]', 'i', 'g'
                    ),
                    '[óòöô]', 'o', 'g'
                  ),
                  '[úùüû]', 'u', 'g'
                ),
                'ñ', 'n', 'g'
              ),
              '[^a-z0-9\s-]', '', 'g'
            ),
            '\s+', '-', 'g'
          ),
          '-+', '-', 'g'
        ),
        '^-|-$', '', 'g'
      )
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar slug automáticamente al insertar
CREATE OR REPLACE FUNCTION set_category_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Generar slug base
  base_slug := generate_category_slug(NEW.name);
  
  -- Si el slug está vacío, usar el ID
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := NEW.id;
  END IF;
  
  final_slug := base_slug;
  
  -- Verificar si el slug ya existe
  WHILE EXISTS (SELECT 1 FROM categories WHERE slug = final_slug AND id != NEW.id) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para insert
DROP TRIGGER IF EXISTS trigger_set_category_slug_insert ON categories;
CREATE TRIGGER trigger_set_category_slug_insert
  BEFORE INSERT ON categories
  FOR EACH ROW
  EXECUTE FUNCTION set_category_slug();

-- Crear trigger para update
DROP TRIGGER IF EXISTS trigger_set_category_slug_update ON categories;
CREATE TRIGGER trigger_set_category_slug_update
  BEFORE UPDATE ON categories
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION set_category_slug();

-- Migrar categorías existentes que no tienen slug
UPDATE categories 
SET slug = generate_category_slug(name)
WHERE slug IS NULL OR slug = '';

-- Para categorías con slug vacío, usar el ID como fallback
UPDATE categories 
SET slug = id
WHERE slug IS NULL OR slug = '';

-- Asegurar que todos los slugs sean únicos
WITH numbered_categories AS (
  SELECT 
    id,
    slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM categories
  WHERE slug IS NOT NULL
)
UPDATE categories 
SET slug = categories.slug || '-' || numbered_categories.rn
FROM numbered_categories
WHERE categories.id = numbered_categories.id 
  AND numbered_categories.rn > 1;
