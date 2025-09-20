-- =====================================================
-- RESTORAR PERMISOS DE NEVYL (OWNER)
-- Ejecuta esto en Supabase SQL Editor
-- =====================================================

-- 1. Ver estado actual del usuario Nevyl
SELECT '=== VERIFICANDO USUARIO NEVYL ===' as info;

-- Ver información del usuario Nevyl
SELECT
  'Usuario Nevyl:' as descripcion,
  u.email,
  up.full_name,
  up.id as profile_id,
  '✅ PERFIL EXISTE' as status
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
WHERE u.email = 'nrm001sm@hotmail.com';

-- 2. Ver roles actuales de Nevyl
SELECT '=== ROLES ACTUALES DE NEVYL ===' as info;

SELECT
  'Roles asignados:' as descripcion,
  ur.role,
  ur.tournament_id,
  t.name as tournament_name,
  ur.is_active,
  ur.created_at
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = 'dc126775-3e49-4e51-8ab9-4b64b763c92b'
ORDER BY ur.created_at DESC;

-- 3. Contar roles por tipo
SELECT
  'Resumen de roles:' as descripcion,
  ur.role,
  COUNT(*) as cantidad
FROM public.user_roles ur
WHERE ur.user_id = 'dc126775-3e49-4e51-8ab9-4b64b763c92b'
GROUP BY ur.role;

-- 4. Si no tiene roles de owner, crearlos
SELECT '=== RESTORANDO PERMISOS DE OWNER ===' as info;

-- Ver qué torneos existen
SELECT
  'Torneos disponibles:' as descripcion,
  COUNT(*) as total_torneos
FROM public.tournaments;

-- Crear roles de owner para Nevyl en todos los torneos donde no los tenga
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
  AND ur.role = 'owner'
)
ON CONFLICT (user_id, tournament_id) DO UPDATE SET
  role = EXCLUDED.role,
  is_active = true;

SELECT '✅ Roles de owner creados/actualizados para Nevyl' as status;

-- 5. Verificación final
SELECT '=== VERIFICACIÓN FINAL ===' as info;

-- Ver todos los roles de Nevyl después de la restauración
SELECT
  'Roles finales de Nevyl:' as descripcion,
  ur.role,
  t.name as tournament_name,
  ur.is_active,
  ur.created_at
FROM public.user_roles ur
LEFT JOIN public.tournaments t ON ur.tournament_id = t.id
WHERE ur.user_id = 'dc126775-3e49-4e51-8ab9-4b64b763c92b'
ORDER BY ur.created_at DESC;

-- 6. Instrucciones para probar
SELECT '=== PRÓXIMOS PASOS ===' as info;
SELECT '1. Refresca la página del admin panel' as paso1;
SELECT '2. Deberías ver que ahora tienes permisos de "owner"' as paso2;
SELECT '3. Intenta acceder a la sección de Users' as paso3;
SELECT '4. Deberías poder gestionar usuarios ahora' as paso4;
SELECT '🎉 ¡Permisos restaurados exitosamente!' as final_message;
