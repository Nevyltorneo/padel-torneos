-- Verificar que la columna seed existe y mostrar su estructura
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pairs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Mostrar algunas parejas para ver si tienen seed
SELECT 
    id,
    player1,
    player2,
    seed,
    created_at
FROM public.pairs 
LIMIT 5;

-- Verificar si hay parejas con seed NULL
SELECT 
    COUNT(*) as total_pairs,
    COUNT(seed) as pairs_with_seed,
    COUNT(*) - COUNT(seed) as pairs_without_seed
FROM public.pairs;
