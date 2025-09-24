# 🔍 VERIFICAR COLUMNA SEED

## ✅ **PASO 1: Verificar que la columna existe**

Ejecuta este query en **Supabase SQL Editor**:

```sql
-- Verificar que la columna seed existe y mostrar su estructura
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

**Resultado esperado:** Deberías ver la columna `seed` en la lista.

---

## ✅ **PASO 2: Verificar parejas existentes**

```sql
-- Mostrar algunas parejas para ver si tienen seed
SELECT
    id,
    player1,
    player2,
    seed,
    created_at
FROM public.pairs
LIMIT 5;
```

**Resultado esperado:** Deberías ver las parejas con `seed` como `NULL` (esto es normal).

---

## ✅ **PASO 3: Si la columna NO aparece, recrearla**

Ejecuta este script completo:

```sql
-- Script para recrear la columna seed
-- 1. Eliminar la columna si existe
ALTER TABLE public.pairs DROP COLUMN IF EXISTS seed;

-- 2. Agregar la columna nuevamente
ALTER TABLE public.pairs ADD COLUMN seed int;

-- 3. Verificar que se creó correctamente
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pairs'
AND table_schema = 'public'
AND column_name = 'seed';
```

---

## ✅ **PASO 4: Limpiar caché de la aplicación**

Después de ejecutar los scripts SQL:

1. **Reinicia tu servidor de desarrollo:**

   ```bash
   # Detén el servidor (Ctrl+C)
   npm run dev
   ```

2. **Limpia la caché del navegador:**
   - Presiona `Ctrl+Shift+R` (Windows/Linux) o `Cmd+Shift+R` (Mac)
   - O abre las herramientas de desarrollador y haz clic derecho en el botón de recargar → "Empty Cache and Hard Reload"

---

## ✅ **PASO 5: Probar la funcionalidad**

1. Ve a **Admin** → **Parejas**
2. Edita una pareja existente
3. Cambia el ranking (ej: de 5 a 10)
4. Guarda los cambios
5. Verifica que no aparezca el error

---

## 🔧 **SOLUCIONES ALTERNATIVAS:**

### **Opción A: Verificar caché de Supabase**

```sql
-- Forzar una consulta simple para refrescar la caché
SELECT 1 FROM public.pairs LIMIT 1;
```

### **Opción B: Verificar permisos RLS**

```sql
-- Verificar si RLS está bloqueando la columna
SELECT * FROM public.pairs LIMIT 1;
```

---

## 📁 **ARCHIVOS CREADOS:**

- ✅ `supabase/verify_seed_column.sql` - Verificar estructura
- ✅ `supabase/clear_schema_cache.sql` - Limpiar caché
- ✅ `supabase/recreate_seed_column.sql` - Recrear columna

---

## 🚀 **INSTRUCCIONES:**

1. **Ejecuta el PASO 1** para verificar
2. **Si no aparece la columna, ejecuta el PASO 3**
3. **Reinicia el servidor** (PASO 4)
4. **Prueba la funcionalidad** (PASO 5)

**¿Qué resultado obtuviste en el PASO 1?** 🎯✨
