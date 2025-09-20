-- =====================================================
-- CONFIGURACIÓN COMPLETA DEL SISTEMA DE USUARIOS
-- Ejecuta esto en Supabase SQL Editor
-- =====================================================

-- 1. Ver estado actual
SELECT '=== 1. VERIFICANDO ESTADO ACTUAL ===' as info;

SELECT
  'Usuarios en auth.users' as tabla,
  COUNT(*) as cantidad
FROM auth.users
UNION ALL
SELECT
  'Perfiles en user_profiles' as tabla,
  COUNT(*) as cantidad
FROM user_profiles
UNION ALL
SELECT
  'Roles en user_roles' as tabla,
  COUNT(*) as cantidad
FROM user_roles;

-- 2. Ver usuarios sin perfil
SELECT '=== 2. USUARIOS SIN PERFIL ===' as info;

SELECT
  u.id,
  u.email,
  u.created_at,
  'SIN PERFIL' as problema
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE up.id IS NULL;

-- 3. Crear perfiles faltantes
SELECT '=== 3. CREANDO PERFILES FALTANTES ===' as info;

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
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- 4. Verificar resultado
SELECT '=== 4. VERIFICACIÓN DESPUÉS DE CORRECCIÓN ===' as info;

SELECT
  u.id,
  u.email,
  up.full_name,
  CASE
    WHEN up.id IS NOT NULL THEN '✅ PERFIL OK'
    ELSE '❌ SIN PERFIL'
  END as status
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
ORDER BY u.created_at;

-- 5. Ver políticas RLS
SELECT '=== 5. VERIFICANDO POLÍTICAS RLS ===' as info;

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 6. Resumen final
SELECT '=== 6. RESUMEN FINAL ===' as info;

SELECT
  'Sistema de usuarios configurado correctamente' as descripcion,
  COUNT(*) as usuarios_con_perfil
FROM auth.users u
JOIN user_profiles up ON u.id = up.id;
