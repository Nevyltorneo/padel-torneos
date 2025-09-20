-- =====================================================
-- ACTUALIZAR PERFILES EXISTENTES CON EMAIL
-- =====================================================

-- 1. Ver perfiles actuales sin email
SELECT '=== PERFILES SIN EMAIL ===' as info;

SELECT
  up.id,
  u.email,
  up.full_name,
  CASE
    WHEN up.email IS NULL THEN '❌ SIN EMAIL'
    ELSE '✅ TIENE EMAIL'
  END as email_status
FROM user_profiles up
JOIN auth.users u ON up.id = u.id
ORDER BY up.created_at;

-- 2. Actualizar perfiles existentes con email
SELECT '=== ACTUALIZANDO PERFILES CON EMAIL ===' as info;

UPDATE user_profiles
SET
  email = auth.users.email,
  updated_at = NOW()
FROM auth.users
WHERE user_profiles.id = auth.users.id
AND user_profiles.email IS NULL;

-- 3. Ver resultado
SELECT '=== VERIFICACIÓN FINAL ===' as info;

SELECT
  up.id,
  u.email,
  up.full_name,
  up.email as profile_email,
  CASE
    WHEN up.email IS NOT NULL THEN '✅ EMAIL OK'
    ELSE '❌ SIN EMAIL'
  END as email_status
FROM user_profiles up
JOIN auth.users u ON up.id = u.id
ORDER BY up.created_at;

-- 4. Resumen
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
WHERE email IS NOT NULL
UNION ALL
SELECT
  'Perfiles sin email' as descripcion,
  COUNT(*) as cantidad
FROM user_profiles
WHERE email IS NULL;
