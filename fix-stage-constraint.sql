-- Script para arreglar la restricción de stage en la tabla matches
-- Primero, eliminar la restricción existente si existe
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_stage_check;

-- Crear la restricción correcta
ALTER TABLE public.matches ADD CONSTRAINT matches_stage_check 
CHECK (stage IN ('groups', 'quarterfinal', 'semifinal', 'final', 'third_place'));

-- Verificar que la restricción se aplicó correctamente
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'public.matches'::regclass 
AND conname = 'matches_stage_check';
