-- =====================================================
-- DEBUG: ESTADO ACTUAL COMPLETO DEL SISTEMA
-- =====================================================

-- 1. Ver el usuario Nevyl
SELECT '=== USUARIO NEVYL ===' as info;

SELECT
  id,
  email,
  '✅ Usuario encontrado' as status
FROM auth.users
WHERE email = 'nrm001sm@hotmail.com';

-- 2. Ver torneos disponibles
SELECT '=== TORNEOS DISPONIBLES ===' as info;

SELECT
  id,
  name,
  status,
  '✅ Torneo disponible' as status
FROM public.tournaments;

-- 3. Ver roles actuales del usuario Nevyl
SELECT '=== ROLES ACTUALES DEL USUARIO NEVYL ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  ur.id,
  ur.role,
  ur.tournament_id,
  t.name as tournament_name,
  ur.is_active,
  ur.created_at,
  CASE
    WHEN ur.role = 'owner' AND ur.is_active = true THEN '✅ ROL OWNER ACTIVO'
    ELSE '❌ ROL NO VÁLIDO'
  END as status
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = (SELECT id FROM nevyl_user)
ORDER BY ur.created_at DESC;

-- 4. Ver qué pasaría con getUserRole para cada torneo
SELECT '=== PRUEBA DE getUserRole ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  'Torneo: ' || t.name as torneo,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT id FROM nevyl_user)
      AND ur.tournament_id = t.id
      AND ur.is_active = true
    ) THEN '✅ getUserRole encontraría rol'
    ELSE '❌ getUserRole NO encontraría rol'
  END as resultado,
  (SELECT ur.role
   FROM public.user_roles ur
   WHERE ur.user_id = (SELECT id FROM nevyl_user)
   AND ur.tournament_id = t.id
   AND ur.is_active = true
   LIMIT 1) as rol_encontrado
FROM public.tournaments t;

-- 5. Ver permisos que tendría con cada rol
SELECT '=== PERMISOS POR ROL ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
), role_test AS (
  SELECT 'owner' as role UNION ALL
  SELECT 'admin' as role UNION ALL
  SELECT 'viewer' as role
)

SELECT
  'Rol ' || role_test.role as rol,
  CASE role_test.role
    WHEN 'owner' THEN '✅ canManageUsers: true, canManageSettings: true, etc.'
    WHEN 'admin' THEN '✅ canManageUsers: true, canManageSettings: false'
    WHEN 'viewer' THEN '❌ canManageUsers: false, canManageSettings: false'
  END as permisos
FROM role_test;
