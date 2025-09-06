-- RECREAR TABLA PAIRS DESDE CERO
-- ATENCIÓN: Esto eliminará todos los datos actuales de parejas
-- Solo ejecutar si estás de acuerdo con perder los datos actuales

-- PASO 1: Eliminar tabla existente
DROP TABLE IF EXISTS pairs CASCADE;

-- PASO 2: Crear tabla con estructura correcta
CREATE TABLE pairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  player1 JSONB NOT NULL,
  player2 JSONB NOT NULL,
  seed INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PASO 3: Habilitar RLS
ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;

-- PASO 4: Crear políticas RLS
CREATE POLICY "Enable read access for all users" ON pairs FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON pairs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON pairs FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON pairs FOR DELETE USING (auth.role() = 'authenticated');

-- PASO 5: Crear trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pairs_updated_at BEFORE UPDATE ON pairs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PASO 6: Verificar estructura final
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pairs' AND table_schema = 'public'
ORDER BY ordinal_position;

-- PASO 7: Insertar datos de prueba (opcional)
-- INSERT INTO pairs (tournament_id, category_id, player1, player2, seed) VALUES 
-- (
--   (SELECT id FROM tournaments LIMIT 1),
--   (SELECT id FROM categories LIMIT 1),
--   '{"name": "Juan Pérez", "phone": "123456789"}',
--   '{"name": "María García", "phone": "987654321"}',
--   1
-- );
