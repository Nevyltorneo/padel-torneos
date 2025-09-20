-- =====================================================
-- CORREGIR PERMISOS DE NEVYL - VERSIÓN SENCILLA
-- COPIA Y PEGA ESTO EN SUPABASE SQL EDITOR
-- =====================================================

-- Buscar el ID del usuario Nevyl
SELECT id, email FROM auth.users WHERE email = 'nrm001sm@hotmail.com';

-- Ver torneos disponibles
SELECT id, name FROM public.tournaments;

-- Eliminar roles existentes del usuario Nevyl
DELETE FROM public.user_roles WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com'
);

-- Crear rol de owner para el primer torneo
INSERT INTO public.user_roles (user_id, tournament_id, role, granted_by, is_active, created_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com'),
  (SELECT id FROM public.tournaments LIMIT 1),
  'owner',
  (SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com'),
  true,
  NOW()
);

-- Verificación
SELECT
  'Roles del usuario Nevyl:' as descripcion,
  COUNT(*)::text as total_roles,
  STRING_AGG(ur.role, ', ') as roles_asignados
FROM public.user_roles ur
WHERE ur.user_id = (
  SELECT id FROM auth.users WHERE email = 'nrm001sm@hotmail.com'
);

-- Confirmación
SELECT '✅ Script ejecutado correctamente' as status;
SELECT '🎉 ¡Ejecuta supabase/debug_current_state.sql para verificar!' as next_step;
