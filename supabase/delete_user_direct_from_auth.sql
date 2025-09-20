-- =====================================================
-- ELIMINAR DIRECTAMENTE DE auth.users
-- =====================================================

-- 1. VER EL USUARIO ANTES DE ELIMINAR
SELECT '=== USUARIO ANTES DE ELIMINAR ===' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'admin@test.com';

-- 2. ELIMINAR DIRECTAMENTE DE auth.users
-- Nota: Esto puede requerir permisos de superusuario
DELETE FROM auth.users WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 3. VERIFICAR SI FUE ELIMINADO
SELECT '=== VERIFICACIÓN DESPUÉS DE ELIMINAR ===' as info;
SELECT 'Usuarios totales ahora:' as info, COUNT(*)::text as total FROM auth.users;

SELECT 'Usuario admin@test.com eliminado:' as info,
       CASE
         WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com')
         THEN '❌ NO, sigue existiendo'
         ELSE '✅ SÍ, fue eliminado'
       END as status;

-- 4. MOSTRAR USUARIOS RESTANTES
SELECT '=== USUARIOS RESTANTES ===' as info;
SELECT id, email FROM auth.users ORDER BY created_at;

-- 5. CONFIRMACIÓN FINAL
SELECT '🎉 ¡USUARIO ELIMINADO COMPLETAMENTE!' as success_message;
