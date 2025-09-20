-- =====================================================
-- CORREGIR USER_PROFILES - SOLO EMAIL Y NOMBRE
-- =====================================================

-- 1. Ver estructura actual
SELECT '=== ESTRUCTURA ACTUAL ===' as info;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
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

-- Copiar solo los datos importantes
INSERT INTO user_profiles_temp (id, email, full_name, created_at, updated_at)
SELECT
  id,
  COALESCE(email, ''), -- Si no tiene email, usar vacío
  COALESCE(full_name, split_part('usuario@ejemplo.com', '@', 1)), -- Si no tiene nombre, usar parte del email
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
SELECT '=== RECREANDO TRIGGER SIMPLIFICADO ===' as info;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo insertar los campos necesarios
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

-- 6. Actualizar políticas RLS para la tabla simplificada
SELECT '=== ACTUALIZANDO POLÍTICAS RLS ===' as info;

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable profile creation via trigger" ON user_profiles;

-- Crear políticas nuevas
CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view all profiles" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 7. Ver resultado final
SELECT '=== RESULTADO FINAL ===' as info;

SELECT
  id,
  email,
  full_name,
  '✅ PERFIL SIMPLIFICADO' as status
FROM user_profiles
ORDER BY created_at;

-- 8. Resumen
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

-- 9. Mostrar estructura final
SELECT '=== ESTRUCTURA FINAL ===' as info;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
