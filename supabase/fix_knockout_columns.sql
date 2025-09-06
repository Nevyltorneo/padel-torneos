-- SQL para corregir las columnas de eliminatorias
-- Ejecutar en Supabase Dashboard -> SQL Editor

-- Primero verificar si las columnas existen
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'matches' 
  AND table_schema = 'public'
  AND column_name IN ('round_number', 'match_number', 'bracket_position', 'next_match_id')
ORDER BY column_name;

-- Si las columnas no existen, crearlas sin la referencia circular
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS round_number INTEGER,
ADD COLUMN IF NOT EXISTS match_number INTEGER,
ADD COLUMN IF NOT EXISTS bracket_position TEXT;

-- Agregar next_match_id después, sin la referencia por ahora
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS next_match_id UUID;

-- Verificar la estructura final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'matches' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
