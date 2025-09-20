-- =====================================================
-- CORREGIR TRIGGER DE REGISTRO DE USUARIOS
-- =====================================================

-- 1. Verificar que existe el trigger
SELECT '=== VERIFICANDO TRIGGERS ===' as info;

-- Ver triggers existentes en auth.users
SELECT
  trigger_name,
  action_timing,
  action_statement,
  action_condition
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY trigger_name;

-- 2. Recrear la función del trigger con mejor manejo de errores
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log para debugging (se puede ver en los logs de Supabase)
  RAISE LOG 'handle_new_user trigger ejecutándose para usuario: %', NEW.id;

  -- Insertar en user_profiles
  INSERT INTO user_profiles (
    id,
    full_name,
    is_verified,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    false,
    NOW(),
    NOW()
  );

  RAISE LOG 'Perfil creado exitosamente para usuario: %', NEW.id;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log del error para debugging
    RAISE LOG 'Error en handle_new_user para usuario %: %', NEW.id, SQLERRM;
    -- No fallar el registro del usuario, solo log el error
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Verificar que el trigger se creó correctamente
SELECT '=== VERIFICANDO TRIGGER CREADO ===' as info;
SELECT
  schemaname,
  tablename,
  trigger_name,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 5. Ver usuarios existentes sin perfil
SELECT '=== USUARIOS SIN PERFIL ===' as info;
SELECT
  u.id,
  u.email,
  u.created_at,
  CASE
    WHEN up.id IS NOT NULL THEN '✅ Tiene perfil'
    ELSE '❌ Sin perfil'
  END as perfil_status
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
ORDER BY u.created_at;

-- 6. Crear perfiles faltantes manualmente
SELECT '=== CREANDO PERFILES FALTANTES ===' as info;

INSERT INTO user_profiles (id, full_name, is_verified, created_at, updated_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  false,
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 7. Ver resultado final
SELECT '=== VERIFICACIÓN FINAL ===' as info;
SELECT
  u.id,
  u.email,
  up.full_name,
  CASE
    WHEN up.id IS NOT NULL THEN '✅ OK'
    ELSE '❌ PROBLEMA'
  END as status
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
ORDER BY u.created_at;

-- 8. Mostrar resumen
SELECT '=== RESUMEN ===' as info;

SELECT
  'Total usuarios en auth.users' as descripcion,
  COUNT(*) as cantidad
FROM auth.users
UNION ALL
SELECT
  'Usuarios con perfil en user_profiles' as descripcion,
  COUNT(*) as cantidad
FROM user_profiles
UNION ALL
SELECT
  'Usuarios sin perfil (después de la corrección)' as descripcion,
  COUNT(*) as cantidad
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE up.id IS NULL;
