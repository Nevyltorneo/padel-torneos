-- Migración de la tabla pairs para usar JSONB para player1 y player2
-- EJECUTAR PASO A PASO EN SUPABASE SQL EDITOR

-- PASO 1: Verificar estructura actual
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pairs' AND table_schema = 'public'
ORDER BY ordinal_position;

-- PASO 2: Backup de datos actuales
CREATE TABLE IF NOT EXISTS pairs_backup AS SELECT * FROM pairs;

-- PASO 3: Agregar columnas JSONB temporales
ALTER TABLE pairs ADD COLUMN IF NOT EXISTS player1_temp JSONB;
ALTER TABLE pairs ADD COLUMN IF NOT EXISTS player2_temp JSONB;

-- PASO 4: Migrar datos existentes a JSONB
-- Si las columnas son player1_name, player1_phone, player2_name, player2_phone:
UPDATE pairs SET 
  player1_temp = jsonb_build_object(
    'name', COALESCE(player1_name, ''),
    'phone', COALESCE(player1_phone, '')
  ),
  player2_temp = jsonb_build_object(
    'name', COALESCE(player2_name, ''),
    'phone', COALESCE(player2_phone, '')
  )
WHERE player1_temp IS NULL;

-- PASO 5: Eliminar columnas viejas
ALTER TABLE pairs DROP COLUMN IF EXISTS player1_name;
ALTER TABLE pairs DROP COLUMN IF EXISTS player1_phone;
ALTER TABLE pairs DROP COLUMN IF EXISTS player2_name;
ALTER TABLE pairs DROP COLUMN IF EXISTS player2_phone;
ALTER TABLE pairs DROP COLUMN IF EXISTS player1;
ALTER TABLE pairs DROP COLUMN IF EXISTS player2;

-- PASO 6: Renombrar columnas temporales
ALTER TABLE pairs RENAME COLUMN player1_temp TO player1;
ALTER TABLE pairs RENAME COLUMN player2_temp TO player2;

-- PASO 7: Hacer columnas NOT NULL
ALTER TABLE pairs ALTER COLUMN player1 SET NOT NULL;
ALTER TABLE pairs ALTER COLUMN player2 SET NOT NULL;

-- PASO 8: Verificar resultado
SELECT 
  id, 
  player1->>'name' as player1_name,
  player1->>'phone' as player1_phone,
  player2->>'name' as player2_name,
  player2->>'phone' as player2_phone,
  seed
FROM pairs 
LIMIT 3;
