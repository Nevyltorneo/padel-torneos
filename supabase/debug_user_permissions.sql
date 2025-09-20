-- =====================================================
-- DEBUG: VERIFICAR PERMISOS DEL USUARIO NEVYL
-- Ejecuta esto para diagnosticar el problema
-- =====================================================

-- 1. Ver TODOS los usuarios en auth.users
SELECT '=== TODOS LOS USUARIOS EN AUTH ===' as info;

SELECT
  id,
  email,
  created_at,
  last_sign_in_at,
  CASE
    WHEN email = 'nrm001sm@hotmail.com' THEN '✅ USUARIO NEVYL'
    WHEN email = 'admin@test.com' THEN '❌ USUARIO VIEJO'
    ELSE '❓ OTRO USUARIO'
  END as status
FROM auth.users
ORDER BY created_at;

-- 2. Ver TODOS los perfiles de usuarios
SELECT '=== TODOS LOS PERFILES DE USUARIOS ===' as info;

SELECT
  id,
  full_name,
  email,
  created_at,
  updated_at,
  CASE
    WHEN id::text LIKE 'dc126775%' THEN '✅ PERFIL NEVYL'
    WHEN id::text LIKE '72740151%' THEN '❌ PERFIL VIEJO'
    ELSE '❓ OTRO PERFIL'
  END as status
FROM public.user_profiles
ORDER BY created_at;

-- 3. Ver TODOS los roles asignados
SELECT '=== TODOS LOS ROLES ASIGNADOS ===' as info;

SELECT
  ur.id,
  ur.user_id,
  u.email,
  ur.role,
  ur.tournament_id,
  t.name as tournament_name,
  ur.is_active,
  ur.created_at,
  ur.granted_by,
  CASE
    WHEN u.email = 'nrm001sm@hotmail.com' THEN '✅ ROL DE NEVYL'
    WHEN u.email = 'admin@test.com' THEN '❌ ROL VIEJO'
    ELSE '❓ ROL DE OTRO'
  END as status
FROM public.user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
ORDER BY ur.created_at DESC;

-- 4. Ver qué torneos existen
SELECT '=== TORNEOS EXISTENTES ===' as info;

SELECT
  id,
  name,
  status,
  created_at
FROM public.tournaments
ORDER BY created_at;

-- 5. Ver permisos de torneo (si existe la tabla)
SELECT '=== PERMISOS DE TORNEO ===' as info;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_permissions') THEN
    PERFORM 1;
    SELECT 'Tabla tournament_permissions existe' as info;
    SELECT
      tp.id,
      tp.user_id,
      u.email,
      tp.role,
      tp.tournament_id,
      t.name as tournament_name
    FROM public.tournament_permissions tp
    LEFT JOIN auth.users u ON tp.user_id = u.id
    LEFT JOIN public.tournaments t ON tp.tournament_id = t.id
    ORDER BY tp.created_at DESC;
  ELSE
    SELECT 'Tabla tournament_permissions NO existe' as info;
  END IF;
END $$;

-- 6. Ver qué permisos tiene exactamente el usuario Nevyl
SELECT '=== PERMISOS ESPECÍFICOS DEL USUARIO NEVYL ===' as info;

-- Buscar el usuario Nevyl por email
WITH nevyl_user AS (
  SELECT id, email
  FROM auth.users
  WHERE email = 'nrm001sm@hotmail.com'
  LIMIT 1
)

SELECT
  'Usuario Nevyl encontrado:' as descripcion,
  (SELECT id FROM nevyl_user) as user_id,
  (SELECT email FROM nevyl_user) as email
UNION ALL
SELECT
  'Roles en user_roles:' as descripcion,
  COUNT(*)::text as cantidad,
  STRING_AGG(ur.role, ', ') as roles
FROM public.user_roles ur
WHERE ur.user_id = (SELECT id FROM nevyl_user)
UNION ALL
SELECT
  'Permisos en tournament_permissions:' as descripcion,
  COUNT(*)::text as cantidad,
  STRING_AGG(tp.role, ', ') as roles
FROM public.tournament_permissions tp
WHERE tp.user_id = (SELECT id FROM nevyl_user);

-- 7. Probar la consulta exacta que usa la aplicación
SELECT '=== PRUEBA DE CONSULTA DE LA APLICACIÓN ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  'Resultado de getUserRole (user_roles):' as descripcion,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT id FROM nevyl_user)
      AND ur.tournament_id = '91338693-d206-461e-8483-b31266088594'  -- UUID de torneo ejemplo
      AND ur.is_active = true
    ) THEN '✅ Rol encontrado'
    ELSE '❌ Rol NO encontrado'
  END as resultado
UNION ALL
SELECT
  'Roles activos para este usuario:' as descripcion,
  STRING_AGG(ur.role, ', ') as roles_encontrados
FROM public.user_roles ur
WHERE ur.user_id = (SELECT id FROM nevyl_user)
AND ur.is_active = true;

-- 8. Diagnóstico final
SELECT '=== DIAGNÓSTICO ===' as info;

-- Ver si el usuario Nevyl existe en auth
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'nrm001sm@hotmail.com')
    THEN '✅ Usuario Nevyl existe en auth.users'
    ELSE '❌ Usuario Nevyl NO existe en auth.users'
  END as status_auth
UNION ALL
-- Ver si tiene perfil
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM public.user_profiles WHERE id::text LIKE 'dc126775%')
    THEN '✅ Usuario Nevyl tiene perfil en user_profiles'
    ELSE '❌ Usuario Nevyl NO tiene perfil en user_profiles'
  END as status_profile
UNION ALL
-- Ver si tiene roles
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur
                 JOIN auth.users u ON ur.user_id = u.id
                 WHERE u.email = 'nrm001sm@hotmail.com')
    THEN '✅ Usuario Nevyl tiene roles asignados'
    ELSE '❌ Usuario Nevyl NO tiene roles asignados'
  END as status_roles;
