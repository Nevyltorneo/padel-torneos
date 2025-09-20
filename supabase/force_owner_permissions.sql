-- =====================================================
-- FORZAR PERMISOS DE OWNER PARA NEVYL (SOLUCIÓN DEFINITIVA)
-- =====================================================

-- 1. Buscar el UUID real del usuario Nevyl
SELECT '=== BUSCANDO USUARIO NEVYL ===' as info;

DO $$
DECLARE
    nevyl_id UUID;
    tournament_record RECORD;
BEGIN
    -- Buscar el ID del usuario Nevyl
    SELECT id INTO nevyl_id
    FROM auth.users
    WHERE email = 'nrm001sm@hotmail.com';

    IF nevyl_id IS NULL THEN
        RAISE EXCEPTION 'Usuario Nevyl no encontrado';
    END IF;

    RAISE NOTICE 'Usuario Nevyl encontrado: %', nevyl_id;

    -- 2. Ver roles actuales
    RAISE NOTICE 'Verificando roles actuales...';

    FOR tournament_record IN
        SELECT id, name FROM public.tournaments
    LOOP
        RAISE NOTICE 'Procesando torneo: % (%)', tournament_record.name, tournament_record.id;

        -- Eliminar roles existentes para este usuario en este torneo
        DELETE FROM public.user_roles
        WHERE user_id = nevyl_id AND tournament_id = tournament_record.id;

        -- Crear rol de owner
        INSERT INTO public.user_roles (user_id, tournament_id, role, granted_by, is_active, created_at)
        VALUES (
            nevyl_id,
            tournament_record.id,
            'owner',
            nevyl_id,  -- Auto-asignado
            true,
            NOW()
        );

        RAISE NOTICE '✅ Rol owner asignado para torneo: %', tournament_record.name;
    END LOOP;

    RAISE NOTICE '=== PERMISOS ASIGNADOS ===';

    -- Verificación final
    SELECT
        'Total de roles de owner asignados:' as descripcion,
        COUNT(*)::text as cantidad
    FROM public.user_roles ur
    WHERE ur.user_id = nevyl_id
    AND ur.role = 'owner'
    AND ur.is_active = true;

END $$;

-- 2. Verificación de permisos
SELECT '=== VERIFICACIÓN FINAL ===' as info;

WITH nevyl_user AS (
    SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com' LIMIT 1
)

SELECT
    'Roles asignados al usuario Nevyl:' as descripcion,
    COUNT(*)::text as total,
    STRING_AGG(DISTINCT ur.role, ', ') as roles,
    STRING_AGG(DISTINCT t.name, ', ') as torneos
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = (SELECT id FROM nevyl_user)
AND ur.is_active = true
GROUP BY ur.user_id;

-- 3. Instrucciones
SELECT '=== INSTRUCCIONES ===' as info;
SELECT '1. Refresca completamente tu navegador (Ctrl+F5)' as paso1;
SELECT '2. Ve al panel de admin' as paso2;
SELECT '3. Selecciona cualquier torneo' as paso3;
SELECT '4. Deberías tener permisos de "owner" ahora' as paso4;
SELECT '🎉 ¡Permisos forzados exitosamente!' as final_message;
