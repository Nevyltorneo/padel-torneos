-- Script para arreglar el problema de canchas
-- Ejecutar en Supabase SQL Editor

-- 1. Deshabilitar RLS temporalmente para courts
ALTER TABLE courts DISABLE ROW LEVEL SECURITY;

-- 2. Crear políticas públicas para courts (alternativa)
-- ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Enable read access for all users" ON courts
-- FOR SELECT USING (true);
-- 
-- CREATE POLICY "Enable insert access for all users" ON courts
-- FOR INSERT WITH CHECK (true);
-- 
-- CREATE POLICY "Enable update access for all users" ON courts
-- FOR UPDATE USING (true);
-- 
-- CREATE POLICY "Enable delete access for all users" ON courts
-- FOR DELETE USING (true);

-- 3. Insertar canchas de ejemplo (con UUID generado automáticamente)
INSERT INTO courts (id, name, tournament_id) VALUES 
(gen_random_uuid(), 'Cancha 1', 'deef8176-7fe7-4812-aa54-9bcc7fb14a9c'),
(gen_random_uuid(), 'Cancha 2', 'deef8176-7fe7-4812-aa54-9bcc7fb14a9c'),
(gen_random_uuid(), 'Cancha 3', 'deef8176-7fe7-4812-aa54-9bcc7fb14a9c');

-- 4. Verificar que se crearon
SELECT * FROM courts;
