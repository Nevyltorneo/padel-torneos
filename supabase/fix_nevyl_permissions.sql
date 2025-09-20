-- =====================================================
-- CORREGIR PERMISOS DEL USUARIO NEVYL (BÚSQUEDA DINÁMICA)
-- =====================================================

-- 1. Buscar el UUID real del usuario Nevyl
SELECT '=== BUSCANDO USUARIO NEVYL ===' as info;

WITH nevyl_user AS (
  SELECT
    id,
    email,
    created_at
  FROM auth.users
  WHERE email = 'nrm001sm@hotmail.com'
  LIMIT 1
)

SELECT
  'Usuario encontrado:' as descripcion,
  id as user_id,
  email,
  created_at
FROM nevyl_user;

-- 2. Ver qué roles tiene actualmente
SELECT '=== ROLES ACTUALES DEL USUARIO ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  'Roles actuales:' as descripcion,
  ur.role,
  ur.tournament_id,
  t.name as tournament_name,
  ur.is_active,
  ur.created_at
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = (SELECT id FROM nevyl_user);

-- 3. Eliminar roles existentes (para empezar de cero)
SELECT '=== ELIMINANDO ROLES EXISTENTES ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM nevyl_user);

SELECT '✅ Roles existentes eliminados' as status;

-- 4. Crear roles de owner para TODOS los torneos
SELECT '=== CREANDO NUEVOS ROLES DE OWNER ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

INSERT INTO public.user_roles (user_id, tournament_id, role, granted_by, is_active, created_at)
SELECT
  (SELECT id FROM nevyl_user) as user_id,
  t.id as tournament_id,
  'owner' as role,
  (SELECT id FROM nevyl_user) as granted_by,  -- Auto-asignado
  true as is_active,
  NOW() as created_at
FROM public.tournaments t;

SELECT '✅ Roles de owner creados para todos los torneos' as status;

-- 5. Verificación final
SELECT '=== VERIFICACIÓN FINAL ===' as info;

WITH nevyl_user AS (
  SELECT id, email FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  'Roles finales del usuario Nevyl:' as descripcion,
  ur.role,
  t.name as tournament_name,
  ur.is_active,
  ur.created_at
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = (SELECT id FROM nevyl_user)
ORDER BY ur.created_at DESC;

-- 6. Confirmación
SELECT '=== CONFIRMACIÓN ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  'Total de roles de owner asignados:' as descripcion,
  COUNT(*)::text as cantidad
FROM public.user_roles ur
WHERE ur.user_id = (SELECT id FROM nevyl_user)
AND ur.role = 'owner'
AND ur.is_active = true;
