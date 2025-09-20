-- =====================================================
-- BORRAR TODOS LOS USUARIOS DE PRUEBA
-- MANTIENE SOLO USUARIOS LEGÍTIMOS
-- =====================================================

-- 1. Ver usuarios actuales con clasificación
SELECT '=== USUARIOS ANTES DE LIMPIEZA ===' as info;

SELECT
  id,
  email,
  created_at,
  CASE
    WHEN email = 'admin@test.com' THEN '✅ MANTENER - Usuario principal'
    WHEN email LIKE '%@demo.com' THEN '🗑️ BORRAR - Demo'
    WHEN email LIKE '%@gmail.com' THEN '🗑️ BORRAR - Gmail prueba'
    WHEN email LIKE '%test%' THEN '🗑️ BORRAR - Contiene test'
    WHEN email LIKE '%prueba%' THEN '🗑️ BORRAR - Contiene prueba'
    WHEN email IS NULL OR email = '' THEN '🗑️ BORRAR - Sin email'
    ELSE '✅ MANTENER - Usuario real'
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
  AND (
    email LIKE '%@demo.com' OR
    email LIKE '%@gmail.com' OR
    email LIKE '%test%' OR
    email LIKE '%prueba%' OR
    email IS NULL OR
    email = ''
  )
);

-- Borrar de user_profiles (todos los que NO son admin@test.com)
DELETE FROM user_profiles
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email != 'admin@test.com'
  AND (
    email LIKE '%@demo.com' OR
    email LIKE '%@gmail.com' OR
    email LIKE '%test%' OR
    email LIKE '%prueba%' OR
    email IS NULL OR
    email = ''
  )
);

-- Borrar de auth.users (todos los que NO son admin@test.com)
DELETE FROM auth.users
WHERE email != 'admin@test.com'
AND (
  email LIKE '%@demo.com' OR
  email LIKE '%@gmail.com' OR
  email LIKE '%test%' OR
  email LIKE '%prueba%' OR
  email IS NULL OR
  email = ''
);

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
  'Solo deberían quedar usuarios legítimos' as descripcion
FROM auth.users;

-- 5. Mostrar usuarios específicos que se mantuvieron
SELECT
  '📋 USUARIOS MANTENIDOS' as info,
  email,
  created_at
FROM auth.users
WHERE email = 'admin@test.com';
