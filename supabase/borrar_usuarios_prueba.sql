-- =====================================================
-- BORRAR USUARIOS DE PRUEBA ESPECÍFICOS
-- =====================================================

-- 1. Ver qué usuarios hay actualmente
SELECT '=== USUARIOS ACTUALES ===' as info;
SELECT email, created_at, id FROM auth.users ORDER BY created_at;

-- 2. Borrar usuarios específicos de prueba
SELECT '=== BORRANDO USUARIOS DE PRUEBA ===' as info;

-- Borrar de user_roles primero
DELETE FROM user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN (
    'admin.test@demo.com',
    'test.user@demo.com',
    'user2.test@demo.com',
    'user1.test@demo.com',
    'admin@gmail.com',
    'testuser3@gmail.com',
    'testuser2@gmail.com',
    'testuser1@gmail.com'
  )
);

-- Borrar de user_profiles
DELETE FROM user_profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email IN (
    'admin.test@demo.com',
    'test.user@demo.com',
    'user2.test@demo.com',
    'user1.test@demo.com',
    'admin@gmail.com',
    'testuser3@gmail.com',
    'testuser2@gmail.com',
    'testuser1@gmail.com'
  )
);

-- Borrar de auth.users
DELETE FROM auth.users WHERE email IN (
  'admin.test@demo.com',
  'test.user@demo.com',
  'user2.test@demo.com',
  'user1.test@demo.com',
  'admin@gmail.com',
  'testuser3@gmail.com',
  'testuser2@gmail.com',
  'testuser1@gmail.com'
);

-- 3. Verificar resultado
SELECT '=== USUARIOS DESPUÉS DE LIMPIEZA ===' as info;
SELECT email, created_at, id FROM auth.users ORDER BY created_at;

-- 4. Mostrar resumen
SELECT
  'LIMPIEZA COMPLETADA' as status,
  COUNT(*) as usuarios_restantes
FROM auth.users;
