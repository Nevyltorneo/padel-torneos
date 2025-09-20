-- =====================================================
-- ELIMINAR admin@test.com - SOLUCIÓN DEFINITIVA
-- =====================================================

-- 1. VER EL PROBLEMA
SELECT '=== PROBLEMA ===' as info;
SELECT id, email FROM auth.users WHERE email = 'admin@test.com';

-- 2. CORREGIR LAS CONSTRAINTS
SELECT '=== CORRIGIENDO CONSTRAINTS ===' as info;

-- Actualizar torneos para que no referencien al usuario
UPDATE public.tournaments
SET created_by = 'dc126775-3e49-4e51-8ab9-4b64b763c92b'
WHERE created_by = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Torneos corregidos' as status;

-- Eliminar roles
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Roles eliminados' as status;

-- Eliminar perfil
DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Perfil eliminado' as status;

-- 3. ELIMINAR USUARIO
SELECT '=== ELIMINANDO USUARIO ===' as info;
DELETE FROM auth.users WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 4. VERIFICAR
SELECT '=== RESULTADO ===' as info;
SELECT 'Usuarios restantes:' as info, COUNT(*)::text as total FROM auth.users;
SELECT id, email FROM auth.users ORDER BY created_at;

SELECT 'admin@test.com eliminado:' as info,
       CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com')
            THEN '❌ NO'
            ELSE '✅ SÍ'
       END as status;
