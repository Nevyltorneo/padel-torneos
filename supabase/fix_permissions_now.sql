-- =====================================================
-- CORREGIR PERMISOS DE NEVYL AHORA MISMO
-- COPIA Y PEGA ESTO COMPLETO EN SUPABASE SQL EDITOR
-- =====================================================

-- 1. Encontrar el usuario Nevyl
DO $$
DECLARE
    nevyl_id UUID;
    torneo_id UUID;
BEGIN
    -- Buscar el ID del usuario Nevyl
    SELECT id INTO nevyl_id
    FROM auth.users
    WHERE email = 'nrm001sm@hotmail.com';

    IF nevyl_id IS NULL THEN
        RAISE NOTICE '❌ Usuario Nevyl no encontrado';
        RETURN;
    END IF;

    RAISE NOTICE '✅ Usuario Nevyl encontrado: %', nevyl_id;

    -- Buscar un torneo existente
    SELECT id INTO torneo_id
    FROM public.tournaments
    LIMIT 1;

    IF torneo_id IS NULL THEN
        RAISE NOTICE '❌ No hay torneos en la base de datos';
        RETURN;
    END IF;

    RAISE NOTICE '✅ Torneo encontrado: %', torneo_id;

    -- 2. Eliminar roles existentes del usuario
    DELETE FROM public.user_roles
    WHERE user_id = nevyl_id;

    RAISE NOTICE '✅ Roles existentes eliminados';

    -- 3. Crear rol de owner para el usuario
    INSERT INTO public.user_roles (user_id, tournament_id, role, granted_by, is_active, created_at)
    VALUES (
        nevyl_id,
        torneo_id,
        'owner',
        nevyl_id,
        true,
        NOW()
    );

    RAISE NOTICE '✅ Rol de owner asignado';

    -- 4. Verificación
    RAISE NOTICE '=== VERIFICACIÓN ===';

    SELECT
        'Roles del usuario Nevyl:' as descripcion,
        COUNT(*)::text as total_roles,
        STRING_AGG(ur.role, ', ') as roles_asignados
    FROM public.user_roles ur
    WHERE ur.user_id = nevyl_id;

    RAISE NOTICE '🎉 ¡PERMISOS DE OWNER ASIGNADOS CORRECTAMENTE!';

END $$;

-- 5. Confirmación final
SELECT '=== INSTRUCCIONES ===' as info;
SELECT '1. Refresca completamente tu navegador (F5)' as paso1;
SELECT '2. Ve al panel de admin' as paso2;
SELECT '3. Deberías tener permisos de owner ahora' as paso3;
SELECT '🎉 ¡Listo! Ya tienes permisos de owner.' as final_message;
