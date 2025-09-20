-- =====================================================
-- CORREGIR POLÍTICAS RLS PARA CREACIÓN DE PERFILES
-- =====================================================

-- 1. Ver políticas actuales
SELECT '=== POLÍTICAS ACTUALES ===' as info;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 2. Eliminar políticas problemáticas
SELECT '=== ELIMINANDO POLÍTICAS PROBLEMÁTICAS ===' as info;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable profile creation via trigger" ON user_profiles;

-- 3. Crear políticas correctas
SELECT '=== CREANDO POLÍTICAS CORRECTAS ===' as info;

-- Permitir que usuarios autenticados creen su propio perfil
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

-- Permitir que usuarios autenticados vean todos los perfiles (para admin)
CREATE POLICY "Authenticated users can view all profiles" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Verificar políticas finales
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

-- 5. Probar permisos
SELECT '=== PROBANDO PERMISOS ===' as info;

-- Ver si el usuario actual puede hacer operaciones
SELECT
  'Auth UID actual' as info,
  auth.uid() as current_user_id;

-- Ver usuarios existentes
SELECT
  'Usuarios en auth.users' as info,
  COUNT(*) as total
FROM auth.users;

-- Ver perfiles existentes
SELECT
  'Perfiles en user_profiles' as info,
  COUNT(*) as total
FROM user_profiles;
