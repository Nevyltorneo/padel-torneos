-- =====================================================
-- ELIMINAR COMPLETAMENTE admin@test.com DE TODOS LADOS
-- =====================================================

-- 1. VER TODOS LOS USUARIOS ACTUALES
SELECT '=== USUARIOS ACTUALES EN AUTH ===' as info;

SELECT
  id,
  email,
  CASE
    WHEN email = 'nrm001sm@hotmail.com' THEN '✅ Nevyl (PRESERVAR)'
    WHEN email = 'admin@test.com' THEN '❌ admin@test.com (ELIMINAR)'
    ELSE 'ℹ️ Otro usuario'
  END as status
FROM auth.users;

-- 2. VER REFERENCIAS EN TODAS LAS TABLAS POSIBLES
SELECT '=== REFERENCIAS EN user_roles ===' as info;
SELECT user_id, role, tournament_id FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';

SELECT '=== REFERENCIAS EN user_profiles ===' as info;
SELECT id, email, full_name FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 3. ELIMINAR TODAS LAS REFERENCIAS
SELECT '=== ELIMINANDO TODAS LAS REFERENCIAS ===' as info;

-- Eliminar de user_roles (pueden haber múltiples registros)
DELETE FROM public.user_roles
WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ user_roles eliminados' as status;

-- Eliminar de user_profiles
DELETE FROM public.user_profiles
WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ user_profiles eliminados' as status;

-- Verificar si hay otras tablas que referencien este usuario
SELECT '=== BUSCANDO OTRAS REFERENCIAS ===' as info;

DO $$
DECLARE
    table_name text;
    query text;
    result_count int;
BEGIN
    -- Buscar en todas las tablas que puedan tener referencias al user_id
    FOR table_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        -- Construir query para buscar el user_id en cada tabla
        query := format('SELECT COUNT(*) FROM public.%I WHERE ''72740151-42d5-4fae-b778-e5c6adf19dec''::uuid IN (SELECT column_name::uuid FROM information_schema.columns WHERE table_name = %L AND data_type = ''uuid'' AND column_name::text LIKE ''%%user_id%%'')', table_name, table_name);

        EXECUTE query INTO result_count;

        IF result_count > 0 THEN
            RAISE NOTICE '⚠️  Encontradas referencias en tabla: %', table_name;
        END IF;
    END LOOP;
END $$;

-- 4. LIMPIAR TODO LO RELACIONADO CON EL USUARIO
SELECT '=== LIMPIEZA COMPLETA ===' as info;

-- Eliminar cualquier registro que contenga el user_id o el email
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- Verificar si existe la tabla tournament_permissions y eliminar referencias
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_permissions') THEN
        DELETE FROM public.tournament_permissions WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
        RAISE NOTICE '✅ tournament_permissions limpiado';
    END IF;
END $$;

-- 5. VERIFICACIÓN FINAL
SELECT '=== VERIFICACIÓN FINAL ===' as info;

SELECT 'Usuarios restantes en auth.users:' as descripcion, COUNT(*)::text as total
FROM auth.users;

SELECT 'Referencias restantes en user_roles:' as descripcion, COUNT(*)::text as total
FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';

SELECT 'Referencias restantes en user_profiles:' as descripcion, COUNT(*)::text as total
FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 6. MOSTRAR ESTADO FINAL DE NEVYL
SELECT '=== ESTADO FINAL DE NEVYL ===' as info;

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

-- 7. INSTRUCCIONES PARA ELIMINACIÓN MANUAL FINAL
SELECT '=== INSTRUCCIONES PARA ELIMINAR DE AUTH ===' as info;
SELECT '⚠️  DESPUÉS DE ESTE SCRIPT, DEBES ELIMINAR MANUALMENTE:' as warning;
SELECT '1. Ve a Supabase Dashboard > Authentication > Users' as paso1;
SELECT '2. Busca admin@test.com' as paso2;
SELECT '3. Selecciona el usuario' as paso3;
SELECT '4. Haz clic en "Delete user"' as paso4;
SELECT '5. Confirma la eliminación' as paso5;
SELECT '🎉 ¡DESPUÉS DE ELIMINAR MANUALMENTE, EL USUARIO DESAPARECERÁ!' as final_message;
