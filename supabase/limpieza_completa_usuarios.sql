-- =====================================================
-- LIMPIEZA COMPLETA DE USUARIOS DE PRUEBA
-- MANTENDRÁ SOLO USUARIOS LEGÍTIMOS
-- =====================================================

-- 1. Ver usuarios actuales
SELECT '=== USUARIOS ANTES DE LIMPIEZA ===' as info;
SELECT
  id,
  email,
  created_at,
  CASE
    WHEN email = 'admin@test.com' THEN '✅ MANTENER'
    WHEN email LIKE '%@gmail.com' THEN '🗑️ GMAIL PRUEBA'
    WHEN email LIKE '%@demo.com' THEN '🗑️ DEMO PRUEBA'
    WHEN email LIKE '%test%' THEN '🗑️ TEST PRUEBA'
    WHEN email LIKE '%prueba%' THEN '🗑️ PRUEBA'
    ELSE '❓ DESCONOCIDO'
  END as tipo
FROM auth.users
ORDER BY created_at;

-- 2. Borrar usuarios de prueba
SELECT '=== INICIANDO LIMPIEZA ===' as info;

-- Primero borrar roles
DELETE FROM user_roles
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email != 'admin@test.com'
  AND (
    email LIKE '%@gmail.com' OR
    email LIKE '%@demo.com' OR
    email LIKE '%test%' OR
    email LIKE '%prueba%' OR
    email IS NULL OR
    email = ''
  )
);

-- Borrar perfiles
DELETE FROM user_profiles
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email != 'admin@test.com'
  AND (
    email LIKE '%@gmail.com' OR
    email LIKE '%@demo.com' OR
    email LIKE '%test%' OR
    email LIKE '%prueba%' OR
    email IS NULL OR
    email = ''
  )
);

-- Borrar de auth.users
DELETE FROM auth.users
WHERE email != 'admin@test.com'
AND (
  email LIKE '%@gmail.com' OR
  email LIKE '%@demo.com' OR
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

-- 4. Resumen
SELECT
  '🎉 LIMPIEZA COMPLETADA' as status,
  COUNT(*) as usuarios_restantes,
  'Solo deberían quedar usuarios legítimos' as descripcion
FROM auth.users;
