-- =====================================================
-- LIMPIEZA FINAL COMPLETA DE USUARIO VIEJO
-- Ejecuta esto en Supabase SQL Editor
-- =====================================================

-- 1. Ver estado actual
SELECT '=== ESTADO ACTUAL ===' as info;

-- Ver usuarios en auth
SELECT 'Usuarios en auth:' as info, COUNT(*) as total
FROM auth.users;

-- Ver perfiles de usuarios
SELECT 'Perfiles de usuarios:' as info, COUNT(*) as total
FROM public.user_profiles;

-- Ver roles de usuarios
SELECT 'Roles de usuarios:' as info, COUNT(*) as total
FROM public.user_roles;

-- Ver permisos de torneos
SELECT 'Permisos de torneos:' as info, COUNT(*) as total
FROM public.tournament_permissions;

-- 2. Detalles de los usuarios actuales
SELECT '=== DETALLES DE USUARIOS ===' as info;

-- Usuario que se mantiene
SELECT
  'Usuario que se mantiene:' as descripcion,
  u.email,
  up.full_name,
  '✅ MANTENER' as status
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
WHERE u.email = 'nrm001sm@hotmail.com';

-- Usuario que se va a eliminar
SELECT
  'Usuario que se elimina:' as descripcion,
  u.email,
  up.full_name,
  '🗑️ ELIMINAR' as status
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
WHERE u.email = 'admin@test.com';

-- 3. Ver roles y permisos de TODOS los usuarios
SELECT '=== ROLES Y PERMISOS DE TODOS LOS USUARIOS ===' as info;

-- Ver todos los roles de usuarios
SELECT
  'ROLES actuales:' as tipo,
  u.email,
  up.full_name,
  ur.role,
  ur.tournament_id,
  t.name as tournament_name
FROM public.user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id
LEFT JOIN public.user_profiles up ON ur.user_id = up.id
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
ORDER BY u.email, ur.role;

-- Ver permisos de torneos de todos los usuarios
SELECT
  'PERMISOS actuales:' as tipo,
  u.email,
  up.full_name,
  tp.role,
  tp.tournament_id,
  t.name as tournament_name
FROM public.tournament_permissions tp
LEFT JOIN auth.users u ON tp.user_id = u.id
LEFT JOIN public.user_profiles up ON tp.user_id = up.id
LEFT JOIN public.tournaments t ON tp.tournament_id = t.id
ORDER BY u.email, tp.role;

-- 4. Eliminar TODO lo relacionado con el usuario viejo
SELECT '=== ELIMINANDO REGISTROS DEL USUARIO VIEJO ===' as info;

-- Eliminar roles del usuario
DELETE FROM public.user_roles
WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Roles eliminados' as status;

-- Eliminar permisos del usuario (si existe la tabla)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_permissions') THEN
    DELETE FROM public.tournament_permissions
    WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
    SELECT '✅ Permisos eliminados' as status;
  ELSE
    SELECT 'ℹ️ Tabla tournament_permissions no existe' as status;
  END IF;
END $$;

-- Eliminar perfil del usuario
DELETE FROM public.user_profiles
WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Perfil eliminado' as status;

-- 5. Verificación después de limpieza
SELECT '=== VERIFICACIÓN DESPUÉS DE LIMPIEZA ===' as info;

SELECT
  'Usuario que se mantiene (debe tener 1 registro):' as descripcion,
  COUNT(*) as registros
FROM public.user_profiles
WHERE id = 'dc126775-3e49-4e51-8ab9-4b64b763c92b';

SELECT
  'Usuario viejo eliminado (debe tener 0 registros):' as descripcion,
  COUNT(*) as registros
FROM public.user_profiles
WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 6. Verificar si el usuario Nevyl tiene roles de owner
SELECT '=== VERIFICAR ROLES DEL USUARIO NEVYL ===' as info;

-- Ver si hay algún rol para Nevyl
SELECT
  'Roles de Nevyl:' as descripcion,
  COUNT(*) as total_roles,
  STRING_AGG(ur.role, ', ') as roles_asignados
FROM public.user_roles ur
WHERE ur.user_id = 'dc126775-3e49-4e51-8ab9-4b64b763c92b';

-- 7. Si no tiene roles de owner, restaurarlos
SELECT '=== REPARAR PERMISOS DEL USUARIO NEVYL ===' as info;

-- Primero, verificar si hay algún torneo creado
SELECT 'Verificando torneos existentes...' as info;

-- Si no hay roles para Nevyl, crear uno de owner para todos los torneos
INSERT INTO public.user_roles (user_id, tournament_id, role, granted_by, is_active, created_at)
SELECT
  'dc126775-3e49-4e51-8ab9-4b64b763c92b' as user_id,
  t.id as tournament_id,
  'owner' as role,
  'dc126775-3e49-4e51-8ab9-4b64b763c92b' as granted_by,  -- Usar el propio UUID del usuario Nevyl
  true as is_active,
  NOW() as created_at
FROM public.tournaments t
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = 'dc126775-3e49-4e51-8ab9-4b64b763c92b'
  AND ur.tournament_id = t.id
)
ON CONFLICT (user_id, tournament_id) DO UPDATE SET
  role = EXCLUDED.role,
  is_active = true;

SELECT '✅ Permisos de owner restaurados para Nevyl' as status;

-- 8. Instrucciones finales para eliminar de auth
SELECT '=== INSTRUCCIONES FINALES ===' as info;

SELECT '✅ PASO 1: Ejecuta este script en SQL Editor' as instruccion1;
SELECT '✅ PASO 2: Ve a Authentication > Users en Supabase Dashboard' as instruccion2;
SELECT '✅ PASO 3: Busca el usuario "admin@test.com"' as instruccion3;
SELECT '✅ PASO 4: Haz clic en los tres puntos "..."' as instruccion4;
SELECT '✅ PASO 5: Selecciona "Delete user"' as instruccion5;
SELECT '✅ PASO 6: Confirma la eliminación' as instruccion6;
SELECT '🎉 ¡Usuario completamente eliminado!' as final_message;

-- 9. Verificación final
SELECT '=== VERIFICACIÓN FINAL ===' as info;

-- Ver usuarios en auth después de la eliminación manual
SELECT 'Después de eliminar manualmente, ve a Authentication > Users' as verificación1;
SELECT 'y verifica que solo quede el usuario "nrm001sm@hotmail.com"' as verificación2;
