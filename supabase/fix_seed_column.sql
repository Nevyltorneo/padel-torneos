-- Script para verificar y agregar la columna seed a la tabla pairs
-- Ejecutar este script en Supabase SQL Editor

-- 1. Verificar si la columna seed existe
DO $$
BEGIN
    -- Verificar si la columna seed existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pairs' 
        AND table_schema = 'public' 
        AND column_name = 'seed'
    ) THEN
        -- Agregar la columna seed si no existe
        ALTER TABLE public.pairs ADD COLUMN seed int;
        RAISE NOTICE 'Columna seed agregada a la tabla pairs';
    ELSE
        RAISE NOTICE 'La columna seed ya existe en la tabla pairs';
    END IF;
END $$;

-- 2. Verificar la estructura actual de la tabla pairs
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pairs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Mostrar algunas parejas de ejemplo para verificar
SELECT 
    id,
    player1,
    player2,
    seed,
    created_at
FROM public.pairs 
LIMIT 5;
