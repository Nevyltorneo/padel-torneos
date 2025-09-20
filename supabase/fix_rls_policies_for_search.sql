-- =====================================================
-- CORREGIR POLÍTICAS RLS PARA BÚSQUEDA POR EMAIL
-- =====================================================

-- 1. Ver políticas actuales
SELECT '=== POLÍTICAS ACTUALES ===' as info;

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 2. Eliminar políticas problemáticas
SELECT '=== ELIMINANDO POLÍTICAS PROBLEMÁTICAS ===' as info;

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON user_profiles;

-- 3. Crear políticas correctas
SELECT '=== CREANDO POLÍTICAS CORRECTAS ===' as info;

-- Permitir que usuarios autenticados busquen perfiles por email
CREATE POLICY "Authenticated users can search profiles by email" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir que usuarios creen su propio perfil
CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Permitir que usuarios vean su propio perfil
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Permitir que usuarios actualicen su propio perfil
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 4. Ver políticas finales
SELECT '=== POLÍTICAS FINALES ===' as info;

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 5. Probar búsqueda por email
SELECT '=== PROBANDO BÚSQUEDA POR EMAIL ===' as info;

-- Crear un usuario de prueba si es necesario
-- Nota: Esto solo funcionará si tienes permisos de service role
-- DO $$
-- DECLARE
--   test_user_id UUID;
-- BEGIN
--   test_user_id := gen_random_uuid();
--
--   INSERT INTO auth.users (
--     id,
--     email,
--     encrypted_password,
--     email_confirmed_at,
--     created_at,
--     updated_at,
--     raw_user_meta_data
--   ) VALUES (
--     test_user_id,
--     'test-' || test_user_id || '@test.com',
--     crypt('password123', gen_salt('bf')),
--     NOW(),
--     NOW(),
--     NOW(),
--     '{"full_name": "Usuario Test"}'::jsonb
--   );
--
--   INSERT INTO user_profiles (id, email, full_name)
--   VALUES (
--     test_user_id,
--     'test-' || test_user_id || '@test.com',
--     'Usuario Test'
--   );
--
--   RAISE NOTICE 'Usuario de prueba creado: %', test_user_id;
-- END $$;

-- 6. Ver usuarios existentes
SELECT '=== USUARIOS EXISTENTES ===' as info;

SELECT
  'Usuarios en auth.users' as info,
  COUNT(*) as total
FROM auth.users
UNION ALL
SELECT
  'Perfiles en user_profiles' as info,
  COUNT(*) as total
FROM user_profiles
UNION ALL
SELECT
  'Perfiles con email' as info,
  COUNT(*) as total
FROM user_profiles
WHERE email IS NOT NULL AND email != '';
