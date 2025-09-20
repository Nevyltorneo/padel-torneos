-- =====================================================
-- CORREGIR POLÍTICAS RLS PARA USUARIOS Y PERFILES
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
WHERE tablename IN ('user_profiles', 'user_roles', 'audit_logs')
ORDER BY tablename, policyname;

-- 2. Eliminar políticas problemáticas
SELECT '=== ELIMINANDO POLÍTICAS PROBLEMÁTICAS ===' as info;

-- Eliminar políticas restrictivas que pueden estar causando problemas
DROP POLICY IF EXISTS "Users can view and edit their own profile" ON user_profiles;
DROP POLICY IF EXISTS "All authenticated users can view public profiles" ON user_profiles;

-- 3. Recrear políticas correctas
SELECT '=== CREANDO POLÍTICAS CORRECTAS ===' as info;

-- Política para user_profiles - permitir que el trigger funcione
CREATE POLICY "Enable insert for authenticated users" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.jwt() ->> 'role' = 'service_role');

-- Permitir que usuarios vean y editen su propio perfil
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Permitir que usuarios autenticados vean todos los perfiles (para el admin panel)
CREATE POLICY "Authenticated users can view all profiles" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir que el trigger de Supabase cree perfiles automáticamente
CREATE POLICY "Enable profile creation via trigger" ON user_profiles
  FOR INSERT
  WITH CHECK (true);

-- 4. Verificar políticas finales
SELECT '=== POLÍTICAS FINALES ===' as info;

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
WHERE tablename IN ('user_profiles', 'user_roles', 'audit_logs')
ORDER BY tablename, policyname;

-- 5. Probar que el trigger funciona
SELECT '=== PROBANDO TRIGGER ===' as info;

-- Crear un usuario de prueba (si es necesario)
-- Nota: Esto solo funcionará si tienes permisos de service role
-- DO $$
-- DECLARE
--   test_user_id UUID;
-- BEGIN
--   -- Insertar un usuario de prueba en auth.users (solo para testing)
--   test_user_id := gen_random_uuid();
--
--   INSERT INTO auth.users (
--     id,
--     email,
--     encrypted_password,
--     email_confirmed_at,
--     created_at,
--     updated_at
--   ) VALUES (
--     test_user_id,
--     'test-' || test_user_id || '@test.com',
--     crypt('password123', gen_salt('bf')),
--     NOW(),
--     NOW(),
--     NOW()
--   );
--
--   RAISE NOTICE 'Usuario de prueba creado: %', test_user_id;
-- END $$;

-- 6. Verificar que no hay usuarios sin perfil
SELECT '=== VERIFICACIÓN FINAL ===' as info;

SELECT
  'Usuarios totales' as descripcion,
  COUNT(*) as cantidad
FROM auth.users
UNION ALL
SELECT
  'Usuarios con perfil' as descripcion,
  COUNT(*) as cantidad
FROM user_profiles
UNION ALL
SELECT
  'Usuarios sin perfil' as descripcion,
  COUNT(*) as cantidad
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE up.id IS NULL;

-- 7. Mostrar usuarios sin perfil (si los hay)
SELECT '=== USUARIOS SIN PERFIL (SI EXISTEN) ===' as info;
SELECT
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE up.id IS NULL;
