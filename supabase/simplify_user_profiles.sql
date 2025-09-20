-- =====================================================
-- SIMPLIFICAR TABLA USER_PROFILES
-- Solo mantener: id, email, full_name
-- =====================================================

-- 1. Ver estructura actual
SELECT '=== ESTRUCTURA ACTUAL ===' as info;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Ver datos actuales
SELECT '=== DATOS ACTUALES ===' as info;

SELECT
  id,
  email,
  full_name,
  'Campos innecesarios eliminados' as status
FROM user_profiles
ORDER BY created_at;

-- 3. Recrear tabla simplificada
SELECT '=== RECREANDO TABLA SIMPLIFICADA ===' as info;

-- Crear nueva tabla temporal
CREATE TABLE user_profiles_temp (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Copiar datos importantes
INSERT INTO user_profiles_temp (id, email, full_name, created_at, updated_at)
SELECT
  id,
  email,
  COALESCE(full_name, split_part(email, '@', 1)),
  created_at,
  updated_at
FROM user_profiles;

-- Eliminar tabla antigua
DROP TABLE user_profiles;

-- Renombrar tabla nueva
ALTER TABLE user_profiles_temp RENAME TO user_profiles;

-- 4. Recrear índices
SELECT '=== RECREANDO ÍNDICES ===' as info;

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- 5. Recrear trigger simplificado
SELECT '=== RECREANDO TRIGGER ===' as info;

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Ver resultado final
SELECT '=== RESULTADO FINAL ===' as info;

SELECT
  'Usuarios con perfil simplificado' as descripcion,
  COUNT(*) as cantidad
FROM user_profiles;

-- 7. Mostrar algunos ejemplos
SELECT '=== EJEMPLOS ===' as info;

SELECT
  id,
  email,
  full_name,
  '✅ PERFIL SIMPLIFICADO' as status
FROM user_profiles
ORDER BY created_at
LIMIT 5;
