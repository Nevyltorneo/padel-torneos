-- Script para verificar y corregir la estructura de la tabla pairs
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar la estructura actual de la tabla pairs
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pairs' 
ORDER BY ordinal_position;

-- 2. Si la tabla tiene player1_name, player1_phone, etc., necesitamos migrar a JSONB
-- Primero, verificar si existen datos actuales
SELECT COUNT(*) as total_pairs FROM pairs;

-- 3. Mostrar algunos datos actuales para entender la estructura
SELECT * FROM pairs LIMIT 3;

-- 4. MIGRACIÓN: Si la tabla tiene columnas separadas, convertir a JSONB
-- NOTA: Solo ejecutar después de verificar la estructura actual

-- Paso 1: Agregar nuevas columnas JSONB
-- ALTER TABLE pairs ADD COLUMN IF NOT EXISTS player1 JSONB;
-- ALTER TABLE pairs ADD COLUMN IF NOT EXISTS player2 JSONB;

-- Paso 2: Migrar datos existentes (si existen columnas player1_name, etc.)
-- UPDATE pairs SET 
--   player1 = jsonb_build_object(
--     'name', COALESCE(player1_name, ''),
--     'phone', COALESCE(player1_phone, '')
--   ),
--   player2 = jsonb_build_object(
--     'name', COALESCE(player2_name, ''),
--     'phone', COALESCE(player2_phone, '')
--   )
-- WHERE player1 IS NULL OR player2 IS NULL;

-- Paso 3: Eliminar columnas viejas (después de verificar que la migración funcionó)
-- ALTER TABLE pairs DROP COLUMN IF EXISTS player1_name;
-- ALTER TABLE pairs DROP COLUMN IF EXISTS player1_phone;
-- ALTER TABLE pairs DROP COLUMN IF EXISTS player2_name;
-- ALTER TABLE pairs DROP COLUMN IF EXISTS player2_phone;

-- 5. RECREAR TABLA COMPLETA (opción alternativa si hay muchos problemas)
-- NOTA: Esto eliminará todos los datos existentes
-- DROP TABLE IF EXISTS pairs CASCADE;
-- 
-- CREATE TABLE pairs (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
--   category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
--   player1 JSONB NOT NULL,
--   player2 JSONB NOT NULL,
--   seed INTEGER,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
-- );
-- 
-- -- Habilitar RLS
-- ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;
-- 
-- -- Políticas RLS
-- CREATE POLICY "Enable read access for all users" ON pairs FOR SELECT USING (true);
-- CREATE POLICY "Enable insert for authenticated users only" ON pairs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- CREATE POLICY "Enable update for authenticated users only" ON pairs FOR UPDATE USING (auth.role() = 'authenticated');
-- CREATE POLICY "Enable delete for authenticated users only" ON pairs FOR DELETE USING (auth.role() = 'authenticated');
-- 
-- -- Trigger para updated_at
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = timezone('utc'::text, now());
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';
-- 
-- CREATE TRIGGER update_pairs_updated_at BEFORE UPDATE ON pairs
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
