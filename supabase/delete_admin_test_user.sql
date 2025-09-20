-- =====================================================
-- ELIMINAR USUARIO DE PRUEBA admin@test.com
-- =====================================================

-- 1. Verificar el usuario que vamos a eliminar
SELECT '=== VERIFICANDO USUARIO A ELIMINAR ===' as info;

SELECT
  id,
  email,
  '✅ Usuario encontrado para eliminar' as status
FROM auth.users
WHERE email = 'admin@test.com';

-- 2. Verificar que Nevyl sigue existiendo
SELECT '=== VERIFICANDO USUARIO NEVYL ===' as info;

SELECT
  id,
  email,
  '✅ Usuario Nevyl preservado' as status
FROM auth.users
WHERE email = 'nrm001sm@hotmail.com';

-- 3. Eliminar todas las referencias del usuario de prueba
SELECT '=== ELIMINANDO REFERENCIAS ===' as info;

-- Eliminar roles
DELETE FROM public.user_roles
WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Roles eliminados' as status;

-- Eliminar perfil
DELETE FROM public.user_profiles
WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Perfil eliminado' as status;

-- Verificar que no quedan referencias
SELECT '=== VERIFICANDO QUE NO QUEDAN REFERENCIAS ===' as info;

SELECT
  'Roles restantes:' as descripcion,
  COUNT(*)::text as total
FROM public.user_roles
WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 4. NOTA IMPORTANTE:
-- Para eliminar completamente el usuario de Auth, necesitas hacerlo
-- desde el Dashboard de Supabase > Authentication > Users
-- Selecciona el usuario y haz clic en "Delete user"

SELECT '=== INSTRUCCIONES MANUALES ===' as info;
SELECT '⚠️  PASO MANUAL REQUERIDO:' as warning;
SELECT 'Ve a Supabase Dashboard > Authentication > Users' as paso1;
SELECT 'Selecciona el usuario admin@test.com' as paso2;
SELECT 'Haz clic en "Delete user"' as paso3;
SELECT 'Confirma la eliminación' as paso4;

-- 5. Verificación final
SELECT '=== VERIFICACIÓN FINAL ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  'Estado del usuario Nevyl:' as descripcion,
  COUNT(*)::text as roles_actividad,
  STRING_AGG(DISTINCT ur.role, ', ') as roles
FROM public.user_roles ur
WHERE ur.user_id = (SELECT id FROM nevyl_user)
AND ur.is_active = true;

SELECT '🎉 ¡Referencias eliminadas! Ahora elimina manualmente de Auth' as final_message;
