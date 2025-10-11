-- Tabla para backups de torneos
CREATE TABLE IF NOT EXISTS public.tournament_backups (
  id TEXT PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  tournament_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  type TEXT CHECK (type IN ('AUTO', 'MANUAL', 'BEFORE_CHANGE')) NOT NULL DEFAULT 'MANUAL',
  description TEXT,
  data JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Índices para optimizar consultas
  CONSTRAINT valid_backup_type CHECK (type IN ('AUTO', 'MANUAL', 'BEFORE_CHANGE'))
);

-- Índices para optimizar consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_tournament_backups_tournament_id ON public.tournament_backups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_backups_created_at ON public.tournament_backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tournament_backups_type ON public.tournament_backups(type);
CREATE INDEX IF NOT EXISTS idx_tournament_backups_created_by ON public.tournament_backups(created_by);

-- Política RLS (Row Level Security)
ALTER TABLE public.tournament_backups ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver backups de torneos que tienen acceso
CREATE POLICY "Users can view backups of accessible tournaments" ON public.tournament_backups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournament_permissions tp
      WHERE tp.tournament_id = tournament_backups.tournament_id
      AND tp.user_id = auth.uid()
    )
  );

-- Política: Los administradores pueden crear backups
CREATE POLICY "Admins can create backups" ON public.tournament_backups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournament_permissions tp
      WHERE tp.tournament_id = tournament_backups.tournament_id
      AND tp.user_id = auth.uid()
      AND tp.role IN ('owner', 'admin')
    )
  );

-- Política: Los administradores pueden actualizar backups
CREATE POLICY "Admins can update backups" ON public.tournament_backups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tournament_permissions tp
      WHERE tp.tournament_id = tournament_backups.tournament_id
      AND tp.user_id = auth.uid()
      AND tp.role IN ('owner', 'admin')
    )
  );

-- Política: Los administradores pueden eliminar backups
CREATE POLICY "Admins can delete backups" ON public.tournament_backups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tournament_permissions tp
      WHERE tp.tournament_id = tournament_backups.tournament_id
      AND tp.user_id = auth.uid()
      AND tp.role IN ('owner', 'admin')
    )
  );

-- Función para limpiar backups antiguos automáticamente
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS void AS $$
BEGIN
  -- Limpiar backups automáticos antiguos (mantener últimos 10)
  DELETE FROM public.tournament_backups
  WHERE type = 'AUTO'
  AND id NOT IN (
    SELECT id FROM public.tournament_backups
    WHERE type = 'AUTO'
    ORDER BY created_at DESC
    LIMIT 10
  );

  -- Limpiar backups de antes de cambios antiguos (mantener últimos 20)
  DELETE FROM public.tournament_backups
  WHERE type = 'BEFORE_CHANGE'
  AND created_at < NOW() - INTERVAL '30 days'
  AND id NOT IN (
    SELECT id FROM public.tournament_backups
    WHERE type = 'BEFORE_CHANGE'
    ORDER BY created_at DESC
    LIMIT 20
  );

  -- Limpiar backups manuales muy antiguos (mantener últimos 5 y los de menos de 90 días)
  DELETE FROM public.tournament_backups
  WHERE type = 'MANUAL'
  AND created_at < NOW() - INTERVAL '90 days'
  AND id NOT IN (
    SELECT id FROM public.tournament_backups
    WHERE type = 'MANUAL'
    ORDER BY created_at DESC
    LIMIT 5
  );
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE public.tournament_backups IS 'Almacena backups completos de torneos para recuperación ante errores';
COMMENT ON COLUMN public.tournament_backups.id IS 'ID único del backup';
COMMENT ON COLUMN public.tournament_backups.tournament_id IS 'ID del torneo respaldado';
COMMENT ON COLUMN public.tournament_backups.tournament_name IS 'Nombre del torneo al momento del backup';
COMMENT ON COLUMN public.tournament_backups.created_at IS 'Fecha y hora de creación del backup';
COMMENT ON COLUMN public.tournament_backups.created_by IS 'Usuario que creó el backup';
COMMENT ON COLUMN public.tournament_backups.type IS 'Tipo de backup: AUTO, MANUAL, BEFORE_CHANGE';
COMMENT ON COLUMN public.tournament_backups.description IS 'Descripción opcional del backup';
COMMENT ON COLUMN public.tournament_backups.data IS 'Datos completos del torneo (JSON)';
COMMENT ON COLUMN public.tournament_backups.metadata IS 'Metadatos del backup (estadísticas, tamaño, etc.)';
