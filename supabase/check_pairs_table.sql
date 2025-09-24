-- Verificar la estructura de la tabla pairs
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pairs' 
AND table_schema = 'public'
ORDER BY ordinal_position;
