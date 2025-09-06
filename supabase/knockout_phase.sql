-- SQL para agregar soporte a la fase eliminatoria
-- Ejecutar en Supabase Dashboard -> SQL Editor

-- Agregar nuevas columnas a la tabla matches para soportar eliminatorias
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS round_number INTEGER, -- Para identificar la ronda (1=cuartos, 2=semis, 3=final)
ADD COLUMN IF NOT EXISTS match_number INTEGER, -- Número del partido dentro de la ronda
ADD COLUMN IF NOT EXISTS next_match_id UUID REFERENCES public.matches(id), -- Partido al que avanza el ganador
ADD COLUMN IF NOT EXISTS bracket_position TEXT; -- Posición en el bracket (ej: "QF1", "SF1", "F1")

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_matches_stage_round ON public.matches(stage, round_number);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_stage ON public.matches(tournament_id, stage);
CREATE INDEX IF NOT EXISTS idx_matches_bracket_position ON public.matches(bracket_position);

-- Agregar comentarios para documentación
COMMENT ON COLUMN public.matches.round_number IS 'Número de ronda en eliminatorias: 1=cuartos, 2=semis, 3=final/3er lugar';
COMMENT ON COLUMN public.matches.match_number IS 'Número del partido dentro de la ronda (1, 2, 3, 4 para cuartos)';
COMMENT ON COLUMN public.matches.next_match_id IS 'ID del partido al que avanza el ganador (NULL para final y 3er lugar)';
COMMENT ON COLUMN public.matches.bracket_position IS 'Posición en el bracket: QF1-4 (cuartos), SF1-2 (semis), F1 (final), TP1 (3er lugar)';

-- Verificar que todo se creó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'matches' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
