-- =====================================================
-- ELIMINAR TODOS LOS USUARIOS EXCEPTO admin@test.com
-- =====================================================

-- 1. Ver usuarios actuales
SELECT '=== USUARIOS ANTES DE LIMPIEZA ===' as info;
SELECT
  id,
  email,
  created_at,
  CASE
    WHEN email = 'admin@test.com' THEN '✅ MANTENER - Usuario principal'
    ELSE '🗑️ ELIMINAR - Usuario de prueba'
  END as decision
FROM auth.users
ORDER BY created_at;

-- 2. Borrar usuarios de prueba de TODAS las tablas
SELECT '=== BORRANDO USUARIOS DE PRUEBA ===' as info;

-- Borrar de user_roles (todos los que NO son admin@test.com)
DELETE FROM user_roles
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email != 'admin@test.com'
);

-- Borrar de user_profiles (todos los que NO son admin@test.com)
DELETE FROM user_profiles
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email != 'admin@test.com'
);

-- Borrar de auth.users (todos los que NO son admin@test.com)
DELETE FROM auth.users
WHERE email != 'admin@test.com';

-- 3. Ver resultado final
SELECT '=== USUARIOS DESPUÉS DE LIMPIEZA ===' as info;
SELECT
  id,
  email,
  created_at,
  '✅ LIMPIO' as status
FROM auth.users
ORDER BY created_at;

-- 4. Resumen final
SELECT
  '🎉 LIMPIEZA COMPLETADA' as status,
  COUNT(*) as usuarios_restantes,
  'Solo debe quedar admin@test.com' as descripcion
FROM auth.users;

-- 5. Verificar que solo queda admin@test.com
SELECT
  '📋 VERIFICACIÓN FINAL' as info,
  email,
  created_at,
  CASE
    WHEN email = 'admin@test.com' THEN '✅ USUARIO PRINCIPAL OK'
    ELSE '❌ ERROR - Usuario no autorizado'
  END as status
FROM auth.users;
