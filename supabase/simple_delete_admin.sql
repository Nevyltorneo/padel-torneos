-- =====================================================
-- ELIMINAR admin@test.com - VERSIÓN MÁS SIMPLE
-- =====================================================

-- 1. Limpiar referencias primero
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 2. Intentar eliminar directamente
DELETE FROM auth.users WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 3. Verificar resultado
SELECT 'Usuarios restantes:' as info, COUNT(*)::text as total FROM auth.users;
SELECT 'Usuario admin@test.com eliminado:' as info,
       CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com')
            THEN '❌ NO'
            ELSE '✅ SÍ'
       END as status;

-- 4. Mostrar usuarios finales
SELECT id, email FROM auth.users;
