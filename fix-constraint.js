const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (usa las variables de entorno)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStageConstraint() {
  try {
    console.log('🔧 Arreglando restricción de stage...');
    
    // Eliminar restricción existente
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_stage_check;`
    });
    
    if (dropError) {
      console.log('⚠️ No se pudo eliminar la restricción existente (puede que no exista):', dropError.message);
    } else {
      console.log('✅ Restricción existente eliminada');
    }
    
    // Crear nueva restricción
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.matches ADD CONSTRAINT matches_stage_check 
            CHECK (stage IN ('groups', 'quarterfinal', 'semifinal', 'final', 'third_place'));`
    });
    
    if (addError) {
      console.error('❌ Error creando nueva restricción:', addError);
    } else {
      console.log('✅ Nueva restricción creada exitosamente');
    }
    
    // Verificar la restricción
    const { data, error: checkError } = await supabase.rpc('exec_sql', {
      sql: `SELECT conname, consrc 
            FROM pg_constraint 
            WHERE conrelid = 'public.matches'::regclass 
            AND conname = 'matches_stage_check';`
    });
    
    if (checkError) {
      console.error('❌ Error verificando restricción:', checkError);
    } else {
      console.log('✅ Restricción verificada:', data);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

fixStageConstraint();
