-- Script para recrear la columna seed
-- Esto puede ayudar si hay problemas de caché

-- 1. Eliminar la columna si existe
ALTER TABLE public.pairs DROP COLUMN IF EXISTS seed;

-- 2. Agregar la columna nuevamente
ALTER TABLE public.pairs ADD COLUMN seed int;

-- 3. Verificar que se creó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pairs' 
AND table_schema = 'public' 
AND column_name = 'seed';

-- 4. Mostrar estructura de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pairs' 
AND table_schema = 'public'
ORDER BY ordinal_position;
