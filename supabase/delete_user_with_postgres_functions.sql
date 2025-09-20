-- =====================================================
-- ELIMINAR USUARIO USANDO FUNCIONES DE POSTGRESQL
-- =====================================================

-- 1. VER EL USUARIO ACTUAL
SELECT '=== USUARIO ACTUAL ===' as info;
SELECT id, email FROM auth.users WHERE email = 'admin@test.com';

-- 2. INTENTAR ELIMINAR CON FUNCIONES INTERNAS
-- Usar las funciones de Supabase para eliminar
SELECT '=== INTENTANDO ELIMINAR CON FUNCIONES INTERNAS ===' as info;

-- Intentar usar la función auth.uid() para verificar
SELECT auth.uid() as current_user_id;

-- Usar DO block para ejecutar función de eliminación
DO $$
BEGIN
    -- Intentar eliminar usando la función interna de auth
    PERFORM auth.delete_user('72740151-42d5-4fae-b778-e5c6adf19dec'::uuid);

    RAISE NOTICE '✅ Usuario eliminado usando auth.delete_user()';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error usando auth.delete_user(): %', SQLERRM;

        -- Si falla, intentar con DELETE directo
        BEGIN
            DELETE FROM auth.users WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
            RAISE NOTICE '✅ Usuario eliminado con DELETE directo';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Error con DELETE directo: %', SQLERRM;

                -- Si todo falla, mostrar instrucciones
                RAISE NOTICE '💡 INSTRUCCIONES: Si todo falla, contacta a soporte de Supabase';
                RAISE NOTICE '💡 O usa el Dashboard manualmente después de limpiar todas las referencias';
            END;
    END;
END $$;

-- 3. VERIFICAR RESULTADO
SELECT '=== VERIFICACIÓN FINAL ===' as info;

SELECT 'Usuarios totales:' as info, COUNT(*)::text as total FROM auth.users;

SELECT 'Usuario admin@test.com existe:' as info,
       CASE
         WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com')
         THEN '❌ SÍ, sigue existiendo'
         ELSE '✅ NO, fue eliminado'
       END as status;

-- 4. MOSTRAR USUARIOS RESTANTES
SELECT '=== USUARIOS RESTANTES ===' as info;
SELECT id, email FROM auth.users ORDER BY created_at;

-- 5. LIMPIEZA FINAL DE REFERENCIAS
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

SELECT '🎉 ¡PROCESO COMPLETADO!' as final_message;
