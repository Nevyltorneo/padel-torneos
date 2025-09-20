-- =====================================================
-- PRUEBA: VERIFICAR PERMISOS GLOBALES DE NEVYL
-- =====================================================

-- 1. Ver el usuario Nevyl
SELECT '=== USUARIO NEVYL ===' as info;

SELECT
  id,
  email,
  '✅ Usuario encontrado' as status
FROM auth.users
WHERE email = 'nrm001sm@hotmail.com';

-- 2. Ver todos sus roles
SELECT '=== ROLES DEL USUARIO NEVYL ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  ur.role,
  t.name as tournament_name,
  ur.is_active,
  CASE
    WHEN ur.role = 'owner' THEN '✅ ROL OWNER ACTIVO'
    ELSE '❌ ROL NO VÁLIDO'
  END as status
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = (SELECT id FROM nevyl_user);

-- 3. Crear rol global si no existe
SELECT '=== ASEGURANDO PERMISOS GLOBALES ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
), global_tournament AS (
  SELECT id FROM public.tournaments LIMIT 1
)

INSERT INTO public.user_roles (user_id, tournament_id, role, granted_by, is_active, created_at)
SELECT
  (SELECT id FROM nevyl_user),
  (SELECT id FROM global_tournament),
  'owner',
  (SELECT id FROM nevyl_user),
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = (SELECT id FROM nevyl_user)
  AND role = 'owner'
  AND is_active = true
);

SELECT '✅ Permisos globales asegurados' as status;

-- 4. Verificación final
SELECT '=== VERIFICACIÓN FINAL ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  'Permisos del usuario Nevyl:' as descripcion,
  COUNT(*)::text as total_roles,
  STRING_AGG(DISTINCT ur.role, ', ') as roles_asignados,
  STRING_AGG(DISTINCT t.name, ', ') as torneos
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = (SELECT id FROM nevyl_user)
AND ur.is_active = true;

-- 5. Instrucciones para probar
SELECT '=== INSTRUCCIONES PARA PROBAR ===' as info;
SELECT '1. Refresca completamente tu navegador (Ctrl+F5)' as paso1;
SELECT '2. Ve al panel de admin' as paso2;
SELECT '3. Deberías ver "👑 Global Owner" junto a tu nombre' as paso3;
SELECT '4. Intenta acceder a cualquier sección' as paso4;
SELECT '5. Deberías tener acceso completo independientemente del torneo' as paso5;
SELECT '🎉 ¡Permisos globales activos!' as final_message;
