# 🔧 SOLUCIONAR RANKING EN PAREJAS

## ❌ **PROBLEMA IDENTIFICADO:**

**Error:** `Could not find the 'seed' column of 'pairs' in the schema cache`

**Causa:** La columna `seed` no existe en tu base de datos de Supabase, aunque esté en el archivo `schema.sql` local.

---

## ✅ **SOLUCIÓN:**

### **PASO 1: Verificar la estructura de la tabla**

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Ejecuta este query para ver la estructura actual:

```sql
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pairs'
AND table_schema = 'public'
ORDER BY ordinal_position;
```

### **PASO 2: Agregar la columna seed**

Si no aparece la columna `seed`, ejecuta este script:

```sql
-- Agregar columna seed a la tabla pairs
ALTER TABLE public.pairs
ADD COLUMN IF NOT EXISTS seed int;

-- Verificar que se creó
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pairs' AND table_schema = 'public'
ORDER BY ordinal_position;
```

### **PASO 3: Script completo (alternativa)**

Si prefieres un script más robusto, ejecuta:

```sql
-- Script para verificar y agregar la columna seed a la tabla pairs
DO $$
BEGIN
    -- Verificar si la columna seed existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'pairs'
        AND table_schema = 'public'
        AND column_name = 'seed'
    ) THEN
        -- Agregar la columna seed si no existe
        ALTER TABLE public.pairs ADD COLUMN seed int;
        RAISE NOTICE 'Columna seed agregada a la tabla pairs';
    ELSE
        RAISE NOTICE 'La columna seed ya existe en la tabla pairs';
    END IF;
END $$;
```

---

## 🧪 **VERIFICACIÓN:**

### **1. Después de ejecutar el script:**

- La tabla `pairs` debería tener la columna `seed`
- El error `Could not find the 'seed' column` debería desaparecer
- Podrás editar el ranking de las parejas

### **2. Probar en la aplicación:**

1. Ve a **Admin** → **Parejas**
2. Edita una pareja existente
3. Cambia el ranking (ej: de 5 a 10)
4. Guarda los cambios
5. Verifica que el ranking se mantiene

---

## 📁 **ARCHIVOS CREADOS:**

- ✅ `supabase/add_seed_column.sql` - Script simple para agregar la columna
- ✅ `supabase/fix_seed_column.sql` - Script robusto con verificación
- ✅ `supabase/check_pairs_table.sql` - Script para verificar estructura

---

## 🚀 **INSTRUCCIONES:**

1. **Ejecuta el script en Supabase SQL Editor**
2. **Verifica que la columna `seed` se creó**
3. **Prueba editar una pareja en la aplicación**
4. **El ranking debería funcionar correctamente**

---

## ⚠️ **IMPORTANTE:**

**Este es un problema de base de datos, no de código.** El código está correcto, pero la columna `seed` no existe en tu base de datos de Supabase.

**¿Ya ejecutaste el script en Supabase?** 🎯✨
