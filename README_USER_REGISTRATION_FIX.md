# 🔧 SOLUCIÓN PARA REGISTRO DE USUARIOS

## 🚨 **PROBLEMA ACTUAL:**

El registro de usuarios falla con "Database error saving new user" porque hay problemas con el trigger de la base de datos.

## ✅ **SOLUCIÓN:**

### **PASO 1: Ejecutar Script de Diagnóstico**

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Copia y pega este script:

```sql
-- Verificar estado actual
SELECT
    'user_profiles table exists' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles')
    THEN '✅ YES' ELSE '❌ NO' END as status
UNION ALL
SELECT
    'on_auth_user_created trigger' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')
    THEN '✅ YES' ELSE '❌ NO' END as status;
```

3. Haz clic en **"Run"** y revisa los resultados

### **PASO 2: Aplicar la Solución**

Si ves `❌ NO` en algún elemento, ejecuta este script completo:

```sql
-- Recrear la función del trigger con mejor manejo de errores
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Intentar crear el perfil
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  -- Si hay error, intentar con nombre por defecto
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.user_profiles (id, full_name)
    VALUES (NEW.id, split_part(NEW.email, '@', 1));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verificar que las políticas RLS permitan la creación
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.user_profiles;
CREATE POLICY "Enable insert for authenticated users" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Verificar permisos
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO anon;
```

### **PASO 3: Probar el Registro**

1. Ve a `http://localhost:3000/signup`
2. Regístrate con datos de prueba
3. Revisa la consola del navegador para ver los logs

## 📊 **ARCHIVOS DE APOYO:**

| Archivo                          | Descripción                           |
| -------------------------------- | ------------------------------------- |
| `supabase/quick_user_fix.sql`    | Script rápido para corregir problemas |
| `supabase/complete_user_fix.sql` | Script completo para recrear todo     |
| `supabase/check_user_setup.sql`  | Verificar configuración actual        |

## 🐛 **DEBUGGING:**

Si sigue sin funcionar:

1. **Revisa los logs** en la consola del navegador
2. **Ejecuta el script de diagnóstico** nuevamente
3. **Verifica las políticas RLS** en Supabase Dashboard → Authentication → Policies

## 🎯 **TESTING FINAL:**

**Datos de prueba para registro:**

- **Nombre:** "Usuario Prueba"
- **Email:** `test@ejemplo.com`
- **Contraseña:** `123456`

**¿Ya funciona el registro?** 🎉
