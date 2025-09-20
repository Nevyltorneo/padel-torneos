-- =====================================================
-- ELIMINAR admin@test.com RESOLVIENDO CONSTRAINTS
-- =====================================================

-- 1. VER TODAS LAS REFERENCIAS DEL USUARIO
SELECT '=== BUSCANDO TODAS LAS REFERENCIAS ===' as info;

-- Buscar en tournaments
SELECT 'Referencias en tournaments:' as info, COUNT(*)::text as total
FROM public.tournaments WHERE created_by = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- Buscar en cualquier tabla que pueda tener user_id
SELECT 'Referencias en user_roles:' as info, COUNT(*)::text as total
FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';

SELECT 'Referencias en user_profiles:' as info, COUNT(*)::text as total
FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 2. MOSTRAR TORNEOS CREADOS POR EL USUARIO
SELECT '=== TORNEOS CREADOS POR EL USUARIO ===' as info;
SELECT id, name, created_by FROM public.tournaments WHERE created_by = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 3. RESOLVER LAS CONSTRAINTS
SELECT '=== RESOLVIENDO CONSTRAINTS ===' as info;

-- Cambiar el created_by de los torneos a Nevyl o NULL
UPDATE public.tournaments
SET created_by = 'dc126775-3e49-4e51-8ab9-4b64b763c92b'  -- ID de Nevyl
WHERE created_by = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Torneos actualizados' as status;

-- Eliminar roles del usuario
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ User roles eliminados' as status;

-- Eliminar perfil del usuario
DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ User profile eliminado' as status;

-- 4. BUSCAR OTRAS REFERENCIAS POSIBLES
DO $$
DECLARE
    table_record RECORD;
    column_record RECORD;
    query text;
    result_count int;
BEGIN
    RAISE NOTICE '🔍 BUSCANDO REFERENCIAS EN TODAS LAS TABLAS...';

    FOR table_record IN
        SELECT tablename, schemaname
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        FOR column_record IN
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = table_record.tablename
              AND table_schema = table_record.schemaname
              AND data_type = 'uuid'
        LOOP
            -- Construir query para contar referencias
            query := format('SELECT COUNT(*) FROM %I.%I WHERE %I = ''72740151-42d5-4fae-b778-e5c6adf19dec''::uuid',
                          table_record.schemaname, table_record.tablename, column_record.column_name);

            EXECUTE query INTO result_count;

            IF result_count > 0 THEN
                RAISE NOTICE '⚠️  Encontradas % referencias en %.%', result_count, table_record.tablename, column_record.column_name;

                -- Si la columna no es crítica, intentar eliminar
                IF column_record.column_name NOT IN ('id', 'created_by', 'updated_by') THEN
                    query := format('DELETE FROM %I.%I WHERE %I = ''72740151-42d5-4fae-b778-e5c6adf19dec''::uuid',
                                  table_record.schemaname, table_record.tablename, column_record.column_name);
                    EXECUTE query;
                    RAISE NOTICE '✅ Referencias eliminadas de %', table_record.tablename;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE '✅ BÚSQUEDA COMPLETADA';
END $$;

-- 5. INTENTAR ELIMINAR EL USUARIO
SELECT '=== INTENTANDO ELIMINAR USUARIO ===' as info;

DO $$
BEGIN
    -- Intentar eliminar con auth.delete_user
    PERFORM auth.delete_user('72740151-42d5-4fae-b778-e5c6adf19dec'::uuid);
    RAISE NOTICE '✅ Usuario eliminado usando auth.delete_user()';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error con auth.delete_user(): %', SQLERRM;

        -- Intentar con DELETE directo
        BEGIN
            DELETE FROM auth.users WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
            RAISE NOTICE '✅ Usuario eliminado con DELETE directo';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Error con DELETE directo: %', SQLERRM;
                RAISE NOTICE '💡 INTENTAR MANUALMENTE DESPUÉS DE ESTA LIMPIEZA';
            END;
    END;
END $$;

-- 6. VERIFICACIÓN FINAL
SELECT '=== VERIFICACIÓN FINAL ===' as info;

SELECT 'Usuarios totales:' as info, COUNT(*)::text as total FROM auth.users;

SELECT 'Usuario admin@test.com eliminado:' as info,
       CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com')
            THEN '❌ NO, sigue existiendo'
            ELSE '✅ SÍ, fue eliminado'
       END as status;

-- 7. MOSTRAR USUARIOS RESTANTES
SELECT '=== USUARIOS RESTANTES ===' as info;
SELECT id, email FROM auth.users ORDER BY created_at;

-- 8. CONFIRMACIÓN
SELECT '🎉 ¡PROCESO COMPLETADO!' as final_message;

-- Si aún existe, mostrar instrucciones finales
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com') THEN
        RAISE NOTICE '⚠️  EL USUARIO SIGUE EXISTIENDO';
        RAISE NOTICE '⚠️  AHORA INTENTA ELIMINARLO MANUALMENTE DEL DASHBOARD';
        RAISE NOTICE '⚠️  Debería funcionar después de esta limpieza';
    ELSE
        RAISE NOTICE '✅ ¡USUARIO ELIMINADO EXITOSAMENTE!';
    END IF;
END $$;
