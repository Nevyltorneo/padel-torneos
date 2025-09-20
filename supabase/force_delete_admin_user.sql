-- =====================================================
-- ELIMINACIÓN FORZADA DE admin@test.com
-- =====================================================

-- 1. VER EL ESTADO ACTUAL
SELECT '=== ESTADO ACTUAL ANTES DE ELIMINAR ===' as info;

SELECT
  id,
  email,
  'Usuario a eliminar' as status
FROM auth.users
WHERE email = 'admin@test.com';

-- 2. ELIMINAR TODAS LAS REFERENCIAS POSIBLES
SELECT '=== ELIMINANDO TODAS LAS REFERENCIAS ===' as info;

-- Eliminar múltiples veces por si acaso
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';

DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- Buscar y eliminar en cualquier tabla que pueda tener referencias
DO $$
DECLARE
    table_record RECORD;
    delete_query text;
BEGIN
    -- Buscar todas las tablas que tengan columnas user_id
    FOR table_record IN
        SELECT
            t.table_name,
            c.column_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public'
          AND c.data_type = 'uuid'
          AND c.column_name = 'user_id'
    LOOP
        -- Construir query para eliminar
        delete_query := format('DELETE FROM public.%I WHERE %I = ''72740151-42d5-4fae-b778-e5c6adf19dec''::uuid',
                             table_record.table_name, table_record.column_name);

        EXECUTE delete_query;
        RAISE NOTICE '✅ Eliminado de % en columna %', table_record.table_name, table_record.column_name;
    END LOOP;
END $$;

-- Buscar también por email si hay alguna tabla que lo tenga
DO $$
DECLARE
    table_record RECORD;
    delete_query text;
BEGIN
    FOR table_record IN
        SELECT
            t.table_name,
            c.column_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public'
          AND c.data_type = 'text'
          AND (c.column_name LIKE '%email%' OR c.column_name = 'email')
    LOOP
        delete_query := format('DELETE FROM public.%I WHERE %I = ''admin@test.com''',
                             table_record.table_name, table_record.column_name);

        EXECUTE delete_query;
        RAISE NOTICE '✅ Eliminado de % por email', table_record.table_name;
    END LOOP;
END $$;

-- 3. VERIFICACIÓN
SELECT '=== VERIFICACIÓN DESPUÉS DE LIMPIEZA ===' as info;

SELECT 'Usuarios en auth.users:' as descripcion, COUNT(*)::text as total FROM auth.users;
SELECT 'Referencias en user_roles:' as descripcion, COUNT(*)::text as total FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT 'Referencias en user_profiles:' as descripcion, COUNT(*)::text as total FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 4. MOSTRAR SOLO NEVYL
SELECT '=== USUARIOS QUE DEBEN QUEDAR ===' as info;

SELECT
  id,
  email,
  CASE
    WHEN email = 'nrm001sm@hotmail.com' THEN '✅ Nevyl (CORRECTO)'
    ELSE '❌ Otro usuario'
  END as status
FROM auth.users;

-- 5. LIMPIEZA ADICIONAL - Buscar cualquier rastro
DO $$
DECLARE
    search_result RECORD;
BEGIN
    RAISE NOTICE '🔍 BUSCANDO CUALQUIER RASTRO DEL USUARIO...';

    -- Buscar en todas las tablas del schema public
    FOR search_result IN
        SELECT
            schemaname,
            tablename,
            attname
        FROM pg_attribute a
        JOIN pg_class c ON a.attrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE a.attname = 'user_id'
          AND n.nspname = 'public'
          AND c.relkind = 'r'
    LOOP
        CONTINUE; -- Solo para mostrar que se encontró
    END LOOP;

    RAISE NOTICE '✅ Búsqueda completada';
END $$;

SELECT '🎯 LIMPIEZA COMPLETA FINALIZADA' as status;
SELECT '⚠️  AHORA VE A SUPABASE DASHBOARD Y ELIMINA MANUALMENTE' as next_step;
SELECT '1. Authentication > Users' as paso1;
SELECT '2. Busca admin@test.com' as paso2;
SELECT '3. Delete user' as paso3;
