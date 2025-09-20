-- =====================================================
-- CORREGIR PERMISOS DIRECTAMENTE (SIN CTEs)
-- =====================================================

-- 1. Eliminar TODOS los roles del usuario Nevyl
DELETE FROM public.user_roles
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com'
);

-- 2. Crear rol de owner para todos los torneos
INSERT INTO public.user_roles (user_id, tournament_id, role, granted_by, is_active, created_at)
SELECT
  (SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com'),
  t.id,
  'owner',
  (SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com'),
  true,
  NOW()
FROM public.tournaments t;

-- 3. Verificación
SELECT '=== VERIFICACIÓN ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  'Total de roles de owner asignados:' as descripcion,
  COUNT(*)::text as cantidad,
  STRING_AGG(t.name, ', ') as torneos
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = (SELECT id FROM nevyl_user)
AND ur.role = 'owner'
AND ur.is_active = true;

-- 4. Ver todos los roles
SELECT '=== TODOS LOS ROLES CREADOS ===' as info;

SELECT
  ur.id,
  u.email,
  ur.role,
  t.name as tournament_name,
  ur.is_active
FROM public.user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
ORDER BY ur.created_at DESC;

-- 5. Confirmación
SELECT '=== CONFIRMACIÓN ===' as info;
SELECT '✅ Script ejecutado correctamente' as status;
SELECT '🎉 ¡Permisos de owner asignados!' as final_message;
