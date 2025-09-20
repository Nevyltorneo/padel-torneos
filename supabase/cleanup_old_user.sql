-- =====================================================
-- LIMPIEZA COMPLETA DE USUARIO VIEJO
-- Ejecuta esto en Supabase SQL Editor antes de eliminar el usuario de Auth
-- =====================================================

-- 1. Ver qué registros tiene el usuario viejo
SELECT '=== REGISTROS DEL USUARIO VIEJO ===' as info;

-- Ver roles del usuario
SELECT 'Roles del usuario viejo:' as info, COUNT(*) as total
FROM public.user_roles
WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- Ver permisos del usuario
SELECT 'Permisos del usuario viejo:' as info, COUNT(*) as total
FROM public.tournament_permissions
WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- Ver perfil del usuario
SELECT 'Perfil del usuario viejo:' as info, COUNT(*) as total
FROM public.user_profiles
WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 2. Eliminar en orden correcto (por restricciones de foreign key)
SELECT '=== ELIMINANDO REGISTROS ===' as info;

-- Eliminar roles del usuario
DELETE FROM public.user_roles
WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';

SELECT '✅ Roles eliminados' as status;

-- Eliminar permisos de torneos del usuario
DELETE FROM public.tournament_permissions
WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';

SELECT '✅ Permisos eliminados' as status;

-- Eliminar perfil del usuario
DELETE FROM public.user_profiles
WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

SELECT '✅ Perfil eliminado' as status;

-- 3. Verificación final
SELECT '=== VERIFICACIÓN FINAL ===' as info;

SELECT
  'Usuario que se mantiene (Nevyl):' as descripcion,
  COUNT(*) as registros
FROM public.user_profiles
WHERE id = 'dc126775-3e49-4e51-8ab9-4b64b763c92b'
UNION ALL
SELECT
  'Usuario viejo eliminado:' as descripcion,
  COUNT(*) as registros
FROM public.user_profiles
WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 4. Instrucciones finales
SELECT '=== INSTRUCCIONES PARA ELIMINAR DE AUTH ===' as info;

SELECT 'Ahora ve a Authentication > Users en Supabase Dashboard' as instruccion1;
SELECT 'Busca el usuario con email "admin@test.com"' as instruccion2;
SELECT 'Haz clic en los tres puntos "..." y selecciona "Delete user"' as instruccion3;
SELECT 'Confirma la eliminación' as instruccion4;
SELECT '✅ ¡Usuario completamente eliminado!' as final_message;
