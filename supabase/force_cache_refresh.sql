-- Forzar actualización de caché de Supabase
-- Ejecuta estos queries en orden para refrescar la caché

-- 1. Verificar que la columna existe (ya lo confirmaste)
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

-- 3. Hacer una consulta que incluya la columna seed
SELECT 
    id,
    player1,
    player2,
    seed,
    created_at
FROM public.pairs 
LIMIT 1;

-- 4. Verificar que podemos actualizar la columna seed
UPDATE public.pairs 
SET seed = 1 
WHERE id IN (
    SELECT id FROM public.pairs LIMIT 1
);

-- 5. Verificar el update funcionó
SELECT 
    id,
    seed
FROM public.pairs 
WHERE seed = 1
LIMIT 1;
