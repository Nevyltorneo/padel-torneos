# 🗑️ **ELIMINAR `admin@test.com` DEFINITIVAMENTE**

## 🚨 **PROBLEMA IDENTIFICADO**

El usuario `admin@test.com` está siendo referenciado en la tabla `tournaments` como `created_by`, lo que impide su eliminación.

## ✅ **SOLUCIÓN COMPLETA**

### **1. EJECUTA ESTE SQL EN SUPABASE:**

```sql
-- =====================================================
-- ELIMINAR admin@test.com - SOLUCIÓN DEFINITIVA
-- =====================================================

-- 1. VER EL PROBLEMA
SELECT '=== PROBLEMA ===' as info;
SELECT id, email FROM auth.users WHERE email = 'admin@test.com';

-- 2. CORREGIR LAS CONSTRAINTS
SELECT '=== CORRIGIENDO CONSTRAINTS ===' as info;

-- Actualizar torneos para que no referencien al usuario
UPDATE public.tournaments
SET created_by = 'dc126775-3e49-4e51-8ab9-4b64b763c92b'
WHERE created_by = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Torneos corregidos' as status;

-- Eliminar roles
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Roles eliminados' as status;

-- Eliminar perfil
DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';
SELECT '✅ Perfil eliminado' as status;

-- 3. ELIMINAR USUARIO
SELECT '=== ELIMINANDO USUARIO ===' as info;
DELETE FROM auth.users WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- 4. VERIFICAR
SELECT '=== RESULTADO ===' as info;
SELECT 'Usuarios restantes:' as info, COUNT(*)::text as total FROM auth.users;
SELECT id, email FROM auth.users ORDER BY created_at;

SELECT 'admin@test.com eliminado:' as info,
       CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com')
            THEN '❌ NO'
            ELSE '✅ SÍ'
       END as status;
```

### **2. INSTRUCCIONES:**

1. **Ve a Supabase Dashboard**
2. **Abre SQL Editor**
3. **Pega el código de arriba**
4. **Haz clic en "Run"**

### **3. RESULTADO ESPERADO:**

- ✅ `admin@test.com` eliminado completamente
- ✅ Solo queda `nrm001sm@hotmail.com`
- ✅ Sistema limpio

## 🎯 **¿QUÉ HACE ESTE SCRIPT?**

1. **Corrige las foreign keys** - Cambia `created_by` de `admin@test.com` a Nevyl
2. **Elimina roles** - Borra todos los roles del usuario
3. **Elimina perfil** - Borra el perfil del usuario
4. **Elimina usuario** - Borra el usuario de `auth.users`

## ⚠️ **IMPORTANTE:**

- **NO** elimina a `nrm001sm@hotmail.com`
- **SOLO** elimina `admin@test.com`
- **Transfiere** la propiedad de torneos a Nevyl

---

**¡Este script resuelve las constraints y elimina el usuario definitivamente!** 🔥

**Ejecuta esto y dime qué resultado obtienes.**
