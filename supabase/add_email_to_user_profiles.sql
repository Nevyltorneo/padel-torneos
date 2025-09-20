-- =====================================================
-- AGREGAR EMAIL A USER_PROFILES Y CORREGIR SISTEMA
-- =====================================================

-- 1. Ver estructura actual de user_profiles
SELECT '=== ESTRUCTURA ACTUAL DE USER_PROFILES ===' as info;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Agregar campo email si no existe
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

-- 3. Recrear función del trigger para incluir email
SELECT '=== RECREANDO TRIGGER CON EMAIL ===' as info;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log para debugging
  RAISE LOG 'handle_new_user trigger ejecutándose para usuario: %', NEW.id;

  -- Insertar en user_profiles con email
  INSERT INTO user_profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );

  RAISE LOG 'Perfil creado exitosamente para usuario: % con email: %', NEW.id, NEW.email;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log del error para debugging
    RAISE LOG 'Error en handle_new_user para usuario %: %', NEW.id, SQLERRM;
    -- No fallar el registro del usuario, solo log el error
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. Actualizar perfiles existentes con email
SELECT '=== ACTUALIZANDO PERFILES EXISTENTES ===' as info;

UPDATE user_profiles
SET
  email = auth.users.email,
  updated_at = NOW()
FROM auth.users
WHERE user_profiles.id = auth.users.id
AND user_profiles.email IS NULL;

-- 6. Verificar resultado
SELECT '=== VERIFICACIÓN FINAL ===' as info;

SELECT
  u.id,
  u.email,
  up.full_name,
  up.email as profile_email,
  CASE
    WHEN up.email IS NOT NULL THEN '✅ EMAIL OK'
    ELSE '❌ SIN EMAIL'
  END as email_status,
  CASE
    WHEN up.id IS NOT NULL THEN '✅ PERFIL OK'
    ELSE '❌ SIN PERFIL'
  END as profile_status
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
ORDER BY u.created_at;

-- 7. Crear índice para búsqueda por email
SELECT '=== CREANDO ÍNDICE PARA EMAIL ===' as info;

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- 8. Resumen final
SELECT '=== RESUMEN ===' as info;

SELECT
  'Usuarios totales en auth.users' as descripcion,
  COUNT(*) as cantidad
FROM auth.users
UNION ALL
SELECT
  'Perfiles en user_profiles' as descripcion,
  COUNT(*) as cantidad
FROM user_profiles
UNION ALL
SELECT
  'Perfiles con email' as descripcion,
  COUNT(*) as cantidad
FROM user_profiles
WHERE email IS NOT NULL;
