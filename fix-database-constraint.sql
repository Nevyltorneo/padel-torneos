-- Script para verificar y corregir la restricción matches_status_check
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar la restricción actual (PostgreSQL moderno)
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'matches_status_check';

-- 2. Si la restricción no permite 'finished', ejecutar esto:
-- (CUIDADO: Esto elimina la restricción actual)
-- ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;

-- 3. Recrear la restricción con los valores correctos
-- ALTER TABLE matches ADD CONSTRAINT matches_status_check 
-- CHECK (status IN ('pending', 'scheduled', 'playing', 'finished'));

-- 4. Verificar que la columna winner_id existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'matches' AND column_name = 'winner_id';

-- 5. Si winner_id no existe, agregarla:
-- ALTER TABLE matches ADD COLUMN winner_id uuid REFERENCES pairs(id);

-- 6. Verificar la estructura final de la tabla
\d matches;
