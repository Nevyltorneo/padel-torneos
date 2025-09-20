-- =====================================================
-- CORREGIR PERMISOS DE NEVYL - SCRIPT SENCILLO
-- COPIA Y PEGA ESTO EN SUPABASE SQL EDITOR
-- =====================================================

-- 1. Buscar el ID del usuario Nevyl
SELECT '=== BUSCANDO USUARIO NEVYL ===' as info;

SELECT
  id,
  email,
  '✅ Usuario Nevyl encontrado' as status
FROM auth.users
WHERE email = 'nrm001sm@hotmail.com';

-- 2. Buscar torneos disponibles
SELECT '=== TORNEOS DISPONIBLES ===' as info;

SELECT
  id,
  name,
  '✅ Torneo disponible' as status
FROM public.tournaments;

-- 3. Ver roles actuales del usuario Nevyl
SELECT '=== ROLES ACTUALES DEL USUARIO NEVYL ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  ur.role,
  t.name as tournament_name,
  ur.is_active,
  'Estado actual del rol' as status
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = (SELECT id FROM nevyl_user);

-- 4. ELIMINAR roles existentes del usuario Nevyl
SELECT '=== ELIMINANDO ROLES EXISTENTES ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM nevyl_user);

SELECT '✅ Roles existentes eliminados' as status;

-- 5. CREAR rol de owner para Nevyl
SELECT '=== CREANDO ROL DE OWNER ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
), torneo AS (
  SELECT id FROM public.tournaments LIMIT 1
)

INSERT INTO public.user_roles (user_id, tournament_id, role, granted_by, is_active, created_at)
SELECT
  (SELECT id FROM nevyl_user),
  (SELECT id FROM torneo),
  'owner',
  (SELECT id FROM nevyl_user),
  true,
  NOW();

SELECT '✅ Rol de owner creado correctamente' as status;

-- 6. VERIFICACIÓN FINAL
SELECT '=== VERIFICACIÓN FINAL ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  'Roles del usuario Nevyl después de la corrección:' as descripcion,
  COUNT(*)::text as total_roles,
  STRING_AGG(ur.role, ', ') as roles_asignados
FROM public.user_roles ur
WHERE ur.user_id = (SELECT id FROM nevyl_user)
AND ur.is_active = true;

-- 7. INSTRUCCIONES
SELECT '=== ¡YA ESTÁ LISTO! ===' as info;
SELECT '1. Refresca tu navegador (F5)' as paso1;
SELECT '2. Ve al panel de admin' as paso2;
SELECT '3. Deberías tener permisos de owner ahora' as paso3;
SELECT '🎉 ¡Permisos corregidos exitosamente!' as final_message;
