-- =====================================================
-- SOLO AGREGAR EMAIL A USER_PROFILES
-- =====================================================

-- 1. Agregar campo email a la tabla existente
SELECT '=== AGREGANDO CAMPO EMAIL ===' as info;

DO $$
BEGIN
  -- Verificar si la columna email ya existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email TEXT;
    RAISE NOTICE 'Campo email agregado a user_profiles';
  ELSE
    RAISE NOTICE 'Campo email ya existe en user_profiles';
  END IF;
END $$;

-- 2. Actualizar perfiles existentes con email de auth.users
SELECT '=== ACTUALIZANDO PERFILES CON EMAIL ===' as info;

UPDATE user_profiles
SET
  email = auth.users.email,
  updated_at = NOW()
FROM auth.users
WHERE user_profiles.id = auth.users.id
AND user_profiles.email IS NULL;

-- 3. Recrear trigger para incluir email
SELECT '=== ACTUALIZANDO TRIGGER ===' as info;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Ver resultado
SELECT '=== RESULTADO FINAL ===' as info;

SELECT
  id,
  email,
  full_name,
  '✅ PERFIL CON EMAIL' as status
FROM user_profiles
WHERE email IS NOT NULL
ORDER BY created_at;

-- 5. Resumen
SELECT '=== RESUMEN ===' as info;

SELECT
  'Perfiles totales' as descripcion,
  COUNT(*) as cantidad
FROM user_profiles
UNION ALL
SELECT
  'Perfiles con email' as descripcion,
  COUNT(*) as cantidad
FROM user_profiles
WHERE email IS NOT NULL AND email != ''
UNION ALL
SELECT
  'Perfiles sin email' as descripcion,
  COUNT(*) as cantidad
FROM user_profiles
WHERE email IS NULL OR email = '';

-- 6. Ver estructura final
SELECT '=== ESTRUCTURA FINAL ===' as info;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
