-- Agregar columna seed a la tabla pairs si no existe
ALTER TABLE public.pairs 
ADD COLUMN IF NOT EXISTS seed int;

-- Comentario para la columna
COMMENT ON COLUMN public.pairs.seed IS 'Ranking/semilla de la pareja en el torneo';

-- Verificar que la columna se creó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pairs' AND table_schema = 'public'
ORDER BY ordinal_position;
