-- Agregar columna group_id a la tabla pairs para drag & drop
ALTER TABLE public.pairs 
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

-- Comentario para la columna
COMMENT ON COLUMN public.pairs.group_id IS 'ID del grupo al que pertenece la pareja (para drag & drop)';

-- Verificar que la columna se creó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'pairs' 
AND table_schema = 'public'
AND column_name = 'group_id';
