-- =====================================================
-- ELIMINAR USUARIO DE PRUEBA admin@test.com (SQL DIRECTO)
-- =====================================================

-- 1. Verificar usuarios actuales
SELECT '=== USUARIOS ACTUALES ===' as info;

SELECT
  id,
  email,
  CASE
    WHEN email = 'nrm001sm@hotmail.com' THEN '✅ Nevyl (PRESERVAR)'
    WHEN email = 'admin@test.com' THEN '❌ admin@test.com (ELIMINAR)'
    ELSE 'ℹ️ Otro usuario'
  END as status
FROM auth.users;

-- 2. Eliminar referencias del usuario de prueba
SELECT '=== ELIMINANDO REFERENCIAS ===' as info;

-- Ver roles del usuario antes de eliminar
SELECT 'Roles del usuario admin@test.com:' as info, COUNT(*)::text as total
FROM public.user_roles
WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- Eliminar roles
DELETE FROM public.user_roles
WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Roles eliminados' as status;

-- Ver perfiles antes de eliminar
SELECT 'Perfiles del usuario admin@test.com:' as info, COUNT(*)::text as total
FROM public.user_profiles
WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- Eliminar perfil
DELETE FROM public.user_profiles
WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Perfil eliminado' as status;

-- 3. Verificación de que no quedan referencias
SELECT '=== VERIFICACIÓN FINAL ===' as info;

SELECT
  'Roles restantes del usuario eliminado:' as descripcion,
  COUNT(*)::text as total
FROM public.user_roles
WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 4. IMPORTANTE: Para eliminar completamente de Auth
-- DEBES HACERLO MANUALMENTE desde el Dashboard de Supabase

SELECT '=== PASOS MANUALES REQUERIDOS ===' as info;
SELECT '⚠️  PASO 1: Ve a Supabase Dashboard > Authentication > Users' as paso1;
SELECT '⚠️  PASO 2: Busca admin@test.com' as paso2;
SELECT '⚠️  PASO 3: Selecciona el usuario' as paso3;
SELECT '⚠️  PASO 4: Haz clic en "Delete user"' as paso4;
SELECT '⚠️  PASO 5: Confirma la eliminación' as paso5;

-- 5. Verificación final de que Nevyl sigue intacto
SELECT '=== VERIFICANDO QUE NEVYL SIGUE INTACTO ===' as info;

WITH nevyl_user AS (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
  'Estado del usuario Nevyl:' as descripcion,
  COUNT(*)::text as roles_activos,
  STRING_AGG(DISTINCT ur.role, ', ') as roles,
  STRING_AGG(DISTINCT t.name, ', ') as torneos
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = (SELECT id FROM nevyl_user)
AND ur.is_active = true;

SELECT '🎉 ¡Referencias eliminadas! Elimina manualmente de Auth' as final_message;
