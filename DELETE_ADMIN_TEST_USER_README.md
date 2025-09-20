# 🗑️ Eliminar Usuario de Prueba admin@test.com

## 📋 **Situación Actual**

- ✅ **Nevyl** (`nrm001sm@hotmail.com`) - Usuario principal (PRESERVAR)
- ❌ **admin@test.com** - Usuario de prueba (ELIMINAR)

## 🎯 **Objetivo**

Eliminar completamente el usuario `admin@test.com` de Supabase Auth y todas sus referencias en la base de datos.

## 🚀 **Método 1: SQL Directo (Más Fácil)**

### **Paso 1: Ejecutar SQL en Supabase**

1. Ve a tu **Supabase Dashboard**
2. Abre **SQL Editor**
3. Copia y pega el contenido del archivo `supabase/delete_admin_test_user_direct.sql`
4. Ejecuta el script
5. Verás un mensaje: "🎉 ¡Referencias eliminadas! Elimina manualmente de Auth"

### **Paso 2: Eliminar de Auth Manualmente**

1. Ve a **Authentication > Users**
2. Busca `admin@test.com`
3. Selecciona el usuario
4. Haz clic en **"Delete user"**
5. Confirma la eliminación

## 🚀 **Método 2: Script Node.js (Alternativo)**

### **Paso 1: Configurar Credenciales**

1. Edita el archivo `src/lib/delete-admin-test-user-simple.js`
2. Reemplaza estas líneas:
   ```javascript
   const SUPABASE_URL = "https://tu-proyecto.supabase.co"; // ← TU URL DE SUPABASE
   const SUPABASE_SERVICE_ROLE_KEY = "tu-service-role-key-aqui"; // ← TU SERVICE ROLE KEY
   ```
3. Pon tus valores reales de Supabase

### **Paso 2: Ejecutar Script**

1. Abre terminal en el directorio del proyecto
2. Ejecuta:
   ```bash
   node src/lib/delete-admin-test-user-simple.js
   ```

## ✅ **Verificación Final**

Después de completar cualquiera de los métodos, ejecuta este SQL en Supabase:

```sql
-- Verificar que solo queda Nevyl
SELECT
  id,
  email,
  CASE
    WHEN email = 'nrm001sm@hotmail.com' THEN '✅ Nevyl (CORRECTO)'
    ELSE '❌ Otro usuario'
  END as status
FROM auth.users;
```

Deberías ver **solo el usuario Nevyl**.

## 🔍 **¿Qué hace el proceso?**

1. ✅ **Elimina roles** del usuario de prueba en `user_roles`
2. ✅ **Elimina perfil** del usuario de prueba en `user_profiles`
3. ✅ **Elimina usuario** de Supabase Auth (manualmente)
4. ✅ **Preserva** al usuario Nevyl completamente

## ⚠️ **Importante**

- **NO** elimines el usuario Nevyl (`nrm001sm@hotmail.com`)
- **NO** elimines el usuario con ID `dc126775-3e49-4e51-8ab9-4b64b763c92b`
- Solo elimina el usuario con ID `72740151-42d5-4fae-b778-e5c6adf19dec`

## 🎉 **Resultado Final**

- ✅ Usuario `admin@test.com` completamente eliminado
- ✅ Usuario `nrm001sm@hotmail.com` intacto con permisos globales
- ✅ Sistema limpio y funcionando correctamente

---

**¿Todo listo? ¡Tu sistema estará completamente limpio!** 🔥
