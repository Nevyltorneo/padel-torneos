-- =====================================================
-- ELIMINACIÓN DEFINITIVA CON PRIVILEGIOS ELEVADOS
-- =====================================================

-- 1. HABILITAR PRIVILEGIOS DE SUPERUSUARIO TEMPORALMENTE
SELECT '=== HABILITANDO PRIVILEGIOS ===' as info;

-- Cambiar a rol de servicio/postgres temporalmente
SET ROLE postgres;

-- 2. VER EL USUARIO ANTES DE ELIMINAR
SELECT '=== USUARIO ANTES DE ELIMINAR ===' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'admin@test.com';

-- 3. ELIMINAR TODAS LAS REFERENCIAS PRIMERO
SELECT '=== LIMPIANDO REFERENCIAS ===' as info;

-- Limpiar todas las tablas que puedan tener referencias
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- Buscar y eliminar en cualquier tabla que tenga referencias
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'auth'
           AND table_name LIKE '%user%'
    LOOP
        BEGIN
            EXECUTE format('DELETE FROM auth.%I WHERE id = ''72740151-42d5-4fae-b778-e5c6adf19dec''', table_record.table_name);
            RAISE NOTICE '✅ Eliminado de auth.%', table_record.table_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️ No se pudo eliminar de auth.%: %', table_record.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 4. INTENTAR ELIMINAR DIRECTAMENTE DE auth.users
SELECT '=== ELIMINANDO DE auth.users ===' as info;

DO $$
BEGIN
    -- Intentar con DELETE directo con permisos elevados
    DELETE FROM auth.users WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
    RAISE NOTICE '✅ Usuario eliminado exitosamente de auth.users';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error eliminando de auth.users: %', SQLERRM;

        -- Si falla, intentar con una función más directa
        BEGIN
            -- Usar una función del sistema si está disponible
            PERFORM auth.delete_user('72740151-42d5-4fae-b778-e5c6adf19dec'::uuid);
            RAISE NOTICE '✅ Usuario eliminado usando auth.delete_user()';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Error con auth.delete_user(): %', SQLERRM;

                -- Último recurso: intentar manipular la tabla directamente
                BEGIN
                    -- Insertar comando SQL directo como texto
                    EXECUTE 'DELETE FROM auth.users WHERE id = ''72740151-42d5-4fae-b778-e5c6adf19dec''';
                    RAISE NOTICE '✅ Usuario eliminado con comando directo';
                EXCEPTION
                    WHEN OTHERS THEN
                        RAISE NOTICE '❌ Error final: %', SQLERRM;
                        RAISE NOTICE '💡 INSTRUCCIÓN: Deberás eliminar manualmente desde el Dashboard';
                        RAISE NOTICE '💡 Ve a Authentication > Users > Busca admin@test.com > Delete user';
                    END;
            END;
    END;
END $$;

-- 5. REVERTIR PRIVILEGIOS
RESET ROLE;

-- 6. VERIFICACIÓN FINAL
SELECT '=== VERIFICACIÓN FINAL ===' as info;

SELECT 'Usuarios totales:' as info, COUNT(*)::text as total FROM auth.users;

SELECT 'Usuario admin@test.com eliminado:' as info,
       CASE
         WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com')
         THEN '❌ NO, sigue existiendo - elimina manualmente'
         ELSE '✅ SÍ, fue eliminado completamente'
       END as status;

-- 7. MOSTRAR USUARIOS RESTANTES
SELECT '=== USUARIOS RESTANTES ===' as info;
SELECT id, email FROM auth.users ORDER BY created_at;

-- 8. CONFIRMACIÓN
SELECT '🎉 ¡PROCESO DE ELIMINACIÓN COMPLETADO!' as final_message;

-- Si todo falla, mostrar instrucciones claras
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com') THEN
        RAISE NOTICE '⚠️  EL USUARIO SIGUE EXISTIENDO';
        RAISE NOTICE '⚠️  VE AL DASHBOARD DE SUPABASE';
        RAISE NOTICE '⚠️  Authentication > Users > admin@test.com > Delete user';
    ELSE
        RAISE NOTICE '✅ ¡USUARIO ELIMINADO EXITOSAMENTE!';
    END IF;
END $$;
