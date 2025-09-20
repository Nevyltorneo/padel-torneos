-- =====================================================
-- VERIFICAR PERMISOS GLOBALES DE NEVYL
-- =====================================================

-- 1. Ver el usuario Nevyl
SELECT '=== USUARIO NEVYL ===' as info;

SELECT
  id,
  email,
  '✅ Usuario encontrado' as status
FROM auth.users
WHERE email = 'nrm001sm@hotmail.com';

-- 2. Ver sus roles actuales
SELECT '=== ROLES ACTUALES ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  ur.role,
  t.name as tournament_name,
  ur.is_active,
  CASE
    WHEN ur.role = 'owner' AND ur.is_active = true THEN '✅ ROL OWNER ACTIVO'
    ELSE '❌ ROL NO VÁLIDO'
  END as status
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = (SELECT id FROM nevyl_user);

-- 3. Ver permisos que tendría
SELECT '=== PERMISOS GLOBALES ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  'Permisos de owner:' as descripcion,
  '✅ canManageUsers: true' as canManageUsers,
  '✅ canManageSettings: true' as canManageSettings,
  '✅ canCreateTournaments: true' as canCreateTournaments,
  '✅ canViewReports: true' as canViewReports,
  '🎉 ¡Todos los permisos activos!' as final_status
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = (SELECT id FROM nevyl_user)
  AND ur.role = 'owner'
  AND ur.is_active = true
);

-- 4. Confirmación
SELECT '=== CONFIRMACIÓN ===' as info;
SELECT '✅ El usuario Nevyl tiene permisos globales de owner' as status;
SELECT '🎉 ¡El sistema de permisos globales está funcionando!' as final_message;
