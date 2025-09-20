-- =====================================================
-- PRUEBA RÁPIDA: ASIGNAR PERMISOS DE OWNER
-- =====================================================

-- 1. Ver usuario actual
SELECT 'Usuario actual:' as info, email FROM auth.users WHERE email = 'nrm001sm@hotmail.com';

-- 2. Ver torneos
SELECT 'Torneos:' as info, name FROM public.tournaments;

-- 3. Limpiar roles existentes
DELETE FROM public.user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com');

-- 4. Asignar rol de owner
INSERT INTO public.user_roles (user_id, tournament_id, role, granted_by, is_active, created_at)
SELECT
  (SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com'),
  (SELECT id FROM public.tournaments LIMIT 1),
  'owner',
  (SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com'),
  true,
  NOW();

-- 5. Ver resultado
SELECT 'Resultado:' as info, COUNT(*)::text as roles_asignados
FROM public.user_roles ur
WHERE ur.user_id = (SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com')
AND ur.role = 'owner';

-- 6. Confirmación
SELECT '✅ ¡Script ejecutado! Ahora refresca el navegador.' as final_message;
