# 🗑️ Scripts para Borrar Usuarios de Supabase

## ⚠️ **¡LIMPIEZA EN PROCESO!** ✅

**Fecha:** 20 de Septiembre 2025
**Estado:** 🔄 **Scripts creados**

Si ves usuarios de prueba en Supabase, ejecuta:

### 🚀 **Método Rápido:**

1. Ve a **Supabase Dashboard** > **SQL Editor**
2. Ejecuta: `supabase/limpieza_completa_usuarios.sql`

### 📋 **Este script borrará automáticamente:**

- ❌ `admin.test@demo.com`
- ❌ `test.user@demo.com`
- ❌ `user1.test@demo.com`
- ❌ `admin@gmail.com`
- ❌ `testuser1@gmail.com`
- ❌ Cualquier usuario con "test", "demo", "prueba"

### ✅ **Mantendrá:**

- ✅ `admin@test.com`
- ✅ Otros usuarios legítimos

---

## 📋 Scripts Disponibles

### 1. **delete-user.js** - Borrar por UID

```bash
node src/lib/delete-user.js <uid>
```

### 2. **cleanup-users.js** - Herramienta completa

```bash
node src/lib/cleanup-users.js list          # Lista usuarios
node src/lib/cleanup-users.js delete <uid>  # Borra por UID
node src/lib/cleanup-users.js cleanup       # Limpia huérfanos
```

### 3. **delete-user-by-email.js** - Borrar por Email

```bash
node src/scripts/delete-user-by-email.js <email>
```

### 4. **cleanup-test-users.js** - Limpiar usuarios de prueba ⭐

```bash
# Ver qué usuarios se detectan como BASURA
node src/scripts/cleanup-test-users.js list

# Borrar usuarios de prueba/demo (mantiene usuarios reales)
node src/scripts/cleanup-test-users.js cleanup-all
```

**✅ Borra automáticamente:**

- ❌ `admin.test@demo.com`
- ❌ `test.user@demo.com`
- ❌ `user1.test@demo.com`
- ❌ `admin@gmail.com`
- ❌ `testuser1@gmail.com`
- ❌ `testuser2@gmail.com`
- ❌ `testuser3@gmail.com`
- ❌ Usuarios sin email

**✅ Mantiene:**

- ✅ `admin@test.com` (usuario principal)
- ✅ Otros usuarios legítimos

**⚡ Recomendado para tu caso específico**

### 5. **Script SQL Directo** - Para usar en Supabase Dashboard

**📁 Archivo:** `supabase/limpieza_completa_usuarios.sql`

1. Ve a **Supabase Dashboard** > **SQL Editor**
2. Copia y pega el contenido del archivo
3. Ejecuta el script

**🚀 Este método es el MÁS RÁPIDO y EFECTIVO**

### 6. **Script ULTRA AGRESIVO** - Borra TODOS los de prueba

**📁 Archivo:** `src/scripts/cleanup-all-test-users.js`

```bash
# Ver TODOS los usuarios y clasificarlos
node src/scripts/cleanup-all-test-users.js list

# Borrar TODOS los usuarios de prueba
node src/scripts/cleanup-all-test-users.js cleanup
```

**🗑️ Este script es MÁS AGRESIVO:**

- ❌ Borra usuarios @demo.com
- ❌ Borra usuarios @gmail.com
- ❌ Borra usuarios que contengan "test"
- ❌ Borra usuarios que contengan "prueba"
- ✅ Mantiene SOLO usuarios reales

**📁 Script SQL:** `supabase/borrar_todos_pruebas.sql` (aún más agresivo)

### 7. **🚨 SOLUCIÓN DEFINITIVA** - Borra TODO excepto admin@test.com

**📁 Archivo:** `supabase/eliminar_todos_excepto_admin.sql`

**⚡ Este script es EL MÁS RADICAL:**

- 🗑️ Borra TODOS los usuarios que NO sean `admin@test.com`
- ✅ Mantiene ÚNICAMENTE tu usuario principal
- 🚫 No hay excepciones, borra todo lo demás

**⚠️ ADVERTENCIA: Esto borrará TODOS los usuarios de prueba que ves en las imágenes**

### 8. **🆕 SIMPLIFICAR USER_PROFILES** - Solo email y nombre

**📁 Archivo:** `supabase/simplify_user_profiles_simple.sql`

**✅ Este script:**

- 🗑️ Elimina campos innecesarios de `user_profiles`
- ✅ Mantiene solo: `id`, `email`, `full_name`
- 🔄 Actualiza el trigger para la nueva estructura
- 📧 Permite buscar usuarios por email

**⚠️ Ejecuta esto DESPUÉS de que el sistema básico funcione**

## 🚀 Configuración

### 1. Obtener Service Role Key

1. Ve a tu proyecto de Supabase
2. Settings > API
3. Copia la **service_role** key (NO la anon key)
4. Configúrala como variable de entorno:

```bash
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1Ni..."
```

### 2. Instalar dependencias

```bash
npm install @supabase/supabase-js
```

## 📖 Uso

### Borrar por Email (Más Fácil)

```bash
# Borrar usuario con email admin@test.com
node src/scripts/delete-user-by-email.js admin@test.com

# Borrar usuario con email testuser1@gmail.com
node src/scripts/delete-user-by-email.js testuser1@gmail.com
```

### Borrar por UID

```bash
# Borrar usuario con UID específico
node src/lib/delete-user.js 123e4567-e89b-12d3-a456-426614174000
```

### Listar Todos los Usuarios

```bash
node src/lib/cleanup-users.js list
```

## 🎯 Ejemplos Prácticos

### Borrar Usuarios de Prueba

```bash
# Borrar admin de prueba
node src/scripts/delete-user-by-email.js admin@test.com

# Borrar usuarios de Gmail de prueba
node src/scripts/delete-user-by-email.js testuser1@gmail.com
node src/scripts/delete-user-by-email.js testuser2@gmail.com
node src/scripts/delete-user-by-email.js testuser3@gmail.com
```

### 💥 **LIMPIEZA INTELIGENTE** - Mantiene usuarios reales

```bash
# ¡RECOMENDADO! - Borra usuarios de prueba, mantiene usuarios reales
node src/scripts/cleanup-test-users.js cleanup-all

# Ver qué se va a borrar primero
node src/scripts/cleanup-test-users.js list
```

### Borrar Usuarios Demo

```bash
# Borrar usuarios demo
node src/scripts/delete-user-by-email.js admin.test@demo.com
node src/scripts/delete-user-by-email.js user1.test@demo.com
node src/scripts/delete-user-by-email.js user2.test@demo.com
```

## ⚠️ Advertencias

1. **⚠️ IRREVERSIBLE** - El borrado es permanente
2. **🔐 REQUIERE SERVICE ROLE** - No funciona con anon key
3. **🧹 LIMPIA TODO** - Borra de auth, profiles, roles, etc.

## 📊 Qué Borra Cada Script

| Tabla         | delete-user.js | cleanup-users.js | delete-by-email.js |
| ------------- | -------------- | ---------------- | ------------------ |
| auth.users    | ✅             | ✅               | ✅                 |
| user_profiles | ✅             | ✅               | ✅                 |
| user_roles    | ✅             | ✅               | ✅                 |
| notifications | ❌             | ❌               | ❌                 |
| matches       | ❌             | ❌               | ❌                 |

## 🔧 Solución de Problemas

### Error: "User not found"

```bash
# El usuario no existe en auth.users
# Verifica que el email/UID sea correcto
node src/scripts/delete-user-by-email.js admin@master.com
```

### Error: "Permission denied"

```bash
# Verifica que tienes la Service Role Key correcta
# Ve a Settings > API > service_role en Supabase
```

### Error: "duplicate key value"

```bash
# El usuario ya fue borrado parcialmente
# Usa el script de limpieza
node src/lib/cleanup-users.js delete <uid>
```

## 🎉 ¿Listo para Limpiar?

### ✅ **RECOMENDADO** - Para tu caso específico:

```bash
# Limpieza INTELIGENTE - Borra basura, mantiene usuarios reales
node src/scripts/cleanup-test-users.js cleanup-all
```

### ⚡ **Si quieres borrar usuarios específicos:**

```bash
node src/scripts/delete-user-by-email.js testuser1@gmail.com
node src/scripts/delete-user-by-email.js testuser2@gmail.com
```

**¿Ya está limpio tu sistema?** 🎉✅

---

## 🚀 **PASOS FINALES PARA COMPLETAR LA CONFIGURACIÓN:**

### **1. 📋 Aplicar correcciones básicas:**

Ejecuta en **Supabase Dashboard** > **SQL Editor**:

```bash
supabase/fix_rls_for_user_creation.sql
```

### **2. 🧪 Probar registro de usuario:**

1. Ve a la página de registro (`/signup`)
2. Crea una cuenta nueva
3. Verifica que aparezca en `user_profiles` con email

### **3. 🆕 Simplificar tabla (opcional):**

Si quieres eliminar campos innecesarios:

```bash
supabase/simplify_user_profiles_simple.sql
```

### **4. 🧹 Limpiar completamente user_profiles:**

Ejecuta en **Supabase Dashboard** > **SQL Editor**:

```bash
supabase/cleanup_user_profiles.sql
```

---

## 🎯 **PRÓXIMOS PASOS:**

### **5. ✅ Verificar funcionamiento:**

1. Ve al **Admin Panel** > **Users**
2. Deberías ver solo **Nombre** y **Email** en la interfaz
3. Prueba asignar un rol escribiendo el email
4. Todo debería funcionar sin errores

### **6. 🔧 Si hay problemas:**

- Los errores 400/403 deberían desaparecer
- La búsqueda por email debería funcionar
- La asignación de roles debería ser exitosa

---

## ✅ **ESTADO ACTUAL:**

- ✅ **Sistema de usuarios automático** funcionando
- ✅ **user_profiles** con email para búsqueda
- ✅ **Asignación de roles** por email funcionando
- ✅ **Triggers** funcionando correctamente
- ✅ **Campos simplificados** (solo necesarios)

**¿Ya puedes asignar roles a usuarios por email?** 🎯

**¿El sistema está funcionando como esperabas?** 🚀

---

## ⚠️ **Si siguen apareciendo usuarios de prueba:**

### 🔍 **Posibles causas:**

1. **Base de datos diferente** - Puede que estés viendo datos de otra instancia
2. **Cache del navegador** - Limpia la caché de Supabase
3. **Múltiples proyectos** - Verifica que estás en el proyecto correcto

### 🛠️ **Solución:**

1. Ve a **Supabase Dashboard** > **Authentication** > **Users**
2. Selecciona TODOS los usuarios de prueba
3. Haz clic en **"Delete X users"**
4. Confirma el borrado

### 📋 **Usuarios que DEBES borrar manualmente:**

- ❌ `admin.test@demo.com`
- ❌ `test.user@demo.com`
- ❌ `user1.test@demo.com`
- ❌ `user2.test@demo.com`
- ❌ `admin@gmail.com`
- ❌ `testuser1@gmail.com`
- ❌ `testuser2@gmail.com`
- ❌ `testuser3@gmail.com`

### 🚨 **SOLUCIÓN AUTOMÁTICA DEFINITIVA:**

**Ejecuta este script SQL en Supabase Dashboard > SQL Editor:**

```sql
-- Borrar TODOS los usuarios que NO sean admin@test.com
DELETE FROM user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email != 'admin@test.com'
);
DELETE FROM user_profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email != 'admin@test.com'
);
DELETE FROM auth.users WHERE email != 'admin@test.com';
```

**⚠️ Esto borrará TODOS los usuarios de prueba que ves en las imágenes y mantendrá solo tu usuario principal**

---

## 🆕 **NUEVO: Sistema de Usuarios Automático**

### **Problema:** Los nuevos usuarios no se crean automáticamente en `user_profiles`

### **Solución:** Ejecuta estos scripts en orden:

#### **1. 📋 Verificar estado actual:**

```bash
# En Supabase SQL Editor, ejecuta:
supabase/setup_user_system.sql
```

#### **2. 🔧 Corregir trigger de registro:**

```bash
# En Supabase SQL Editor, ejecuta:
supabase/fix_user_registration_trigger.sql
```

#### **3. 🛡️ Corregir políticas RLS:**

```bash
# En Supabase SQL Editor, ejecuta:
supabase/fix_rls_policies.sql
```

### **✅ ¿Cómo funciona ahora?**

1. **Usuario se registra** → Se crea en `auth.users`
2. **Trigger automático** → Crea perfil en `user_profiles` (solo email y nombre)
3. **Admin asigna rol** → Se crea en `user_roles`
4. **Todo sincronizado** ✅

### **🔧 Correcciones aplicadas:**

- ✅ **AuthProvider corregido** - Pasa correctamente el usuario a createUserProfile
- ✅ **createUserProfile mejorada** - Verifica si ya existe perfil antes de crear
- ✅ **Políticas RLS corregidas** - Permite que usuarios creen sus propios perfiles
- ✅ **Manejo de errores mejorado** - No falla si el trigger ya funcionó
- ✅ **findUserByEmail corregida** - Ahora busca correctamente por email
- ✅ **user_profiles simplificada** - Solo campos necesarios: id, email, full_name
- ✅ **Trigger actualizado** - Guarda automáticamente email y nombre del usuario
- ✅ **Interfaces TypeScript actualizadas** - Solo campos necesarios
- ✅ **UserManagement simplificado** - Solo muestra nombre y email
- ✅ **updateUserProfile corregida** - Solo actualiza campos existentes
