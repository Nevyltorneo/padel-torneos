-- =====================================================
-- CORREGIR CONSTRAINTS Y ELIMINAR admin@test.com
-- =====================================================

-- 1. VER EL PROBLEMA ACTUAL
SELECT '=== PROBLEMA ACTUAL ===' as info;
SELECT id, email FROM auth.users WHERE email = 'admin@test.com';

-- 2. VER LAS CONSTRAINTS QUE IMPIDEN ELIMINAR
SELECT '=== CONSTRAINTS QUE IMPIDEN ELIMINACIÓN ===' as info;

-- Ver las foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND (kcu.column_name = 'created_by' OR ccu.table_name = 'auth.users');

-- 3. RESOLVER LAS CONSTRAINTS
SELECT '=== RESOLVIENDO CONSTRAINTS ===' as info;

-- Actualizar todos los torneos creados por admin@test.com a Nevyl
UPDATE public.tournaments
SET created_by = 'dc126775-3e49-4e51-8ab9-4b64b763c92b'
WHERE created_by = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Torneos actualizados a Nevyl' as status;

-- Eliminar todas las referencias en user_roles
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ User roles eliminados' as status;

-- Eliminar el perfil
DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ User profile eliminado' as status;

-- 4. INTENTAR ELIMINAR EL USUARIO
SELECT '=== INTENTANDO ELIMINAR USUARIO ===' as info;

-- Usar DO block para manejar errores
DO $$
BEGIN
    -- Intentar eliminar directamente
    DELETE FROM auth.users WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
    RAISE NOTICE '✅ Usuario eliminado exitosamente';
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE '❌ Aún hay constraints: %', SQLERRM;
        RAISE NOTICE '💡 Necesitas verificar qué más referencia este usuario';

        -- Si falla, buscar todas las referencias posibles
        PERFORM
        FROM pg_tables t
        WHERE EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_name = t.tablename
              AND c.table_schema = t.schemaname
              AND c.data_type = 'uuid'
              AND EXISTS (
                  SELECT 1 FROM information_schema.table_constraints tc
                  WHERE tc.table_name = t.tablename
                    AND tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema = t.schemaname
              )
        );

    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error inesperado: %', SQLERRM;
END $$;

-- 5. VERIFICACIÓN FINAL
SELECT '=== VERIFICACIÓN ===' as info;

SELECT 'Usuarios totales:' as info, COUNT(*)::text as total FROM auth.users;

SELECT 'admin@test.com eliminado:' as info,
       CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com')
            THEN '❌ NO'
            ELSE '✅ SÍ'
       END as status;

-- 6. MOSTRAR RESULTADO FINAL
SELECT id, email FROM auth.users ORDER BY created_at;
