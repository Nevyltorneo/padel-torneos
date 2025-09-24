-- Limpiar caché de esquema de Supabase
-- Este script puede ayudar a refrescar la caché del esquema

-- 1. Verificar que la columna existe
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pairs' 
AND table_schema = 'public' 
AND column_name = 'seed';

-- 2. Forzar una consulta simple para refrescar la caché
SELECT 1 FROM public.pairs LIMIT 1;

-- 3. Mostrar la estructura completa de la tabla
\d public.pairs;
