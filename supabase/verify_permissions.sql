-- =====================================================
-- VERIFICAR PERMISOS ACTUALES (SOLUCIÓN INMEDIATA)
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
  ur.created_at,
  CASE
    WHEN ur.role = 'owner' AND ur.is_active = true THEN '✅ ROL OWNER ACTIVO'
    ELSE '❌ ROL INSUFICIENTE'
  END as status
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = (SELECT id FROM nevyl_user)
ORDER BY ur.created_at DESC;

-- 3. Crear rol de owner si no existe
SELECT '=== CREANDO ROL DE OWNER (SI ES NECESARIO) ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

INSERT INTO public.user_roles (user_id, tournament_id, role, granted_by, is_active, created_at)
SELECT
  (SELECT id FROM nevyl_user),
  t.id,
  'owner',
  (SELECT id FROM nevyl_user),
  true,
  NOW()
FROM public.tournaments t
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = (SELECT id FROM nevyl_user)
  AND ur.tournament_id = t.id
  AND ur.role = 'owner'
);

SELECT '✅ Rol de owner creado/actualizado' as status;

-- 4. Verificación final
SELECT '=== VERIFICACIÓN FINAL ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  'Total de roles de owner:' as descripcion,
  COUNT(*)::text as cantidad,
  STRING_AGG(t.name, ', ') as torneos
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = (SELECT id FROM nevyl_user)
AND ur.role = 'owner'
AND ur.is_active = true;

-- 5. Instrucciones inmediatas
SELECT '=== INSTRUCCIONES INMEDIATAS ===' as info;
SELECT '1. Refresca la página del admin (F5)' as paso1;
SELECT '2. Abre la consola del navegador (F12)' as paso2;
SELECT '3. Busca el mensaje: "SOLUCIÓN TEMPORAL: Asignando rol owner directamente para Nevyl"' as paso3;
SELECT '4. Si ves ese mensaje, deberías tener permisos de owner' as paso4;
SELECT '🎉 ¡Solución aplicada!' as final_message;
