# 🔧 Crear Favicon.ico para Reemplazar Icon de Vercel

Para eliminar completamente el icon de Vercel y usar tu logo personalizado, necesitas crear un favicon.ico real.

## 🚨 Problema Actual

El navegador muestra el favicon de Vercel porque:

- No hay un `favicon.ico` real en `/public`
- El navegador busca automáticamente `favicon.ico`
- Si no lo encuentra, usa el favicon por defecto de Vercel

## ✅ Solución

### 1. Convertir SVG a ICO

**Opción A - Herramienta Online (Más Fácil):**

1. Ve a: https://cloudconvert.com/svg-to-ico
2. Sube tu `public/favicon.svg`
3. Configura:
   - **Tamaños:** 16x16, 32x32, 48x48
   - **Formato:** ICO
4. Descarga el archivo

**Opción B - Usando Código:**

```bash
# Instalar ImageMagick si no lo tienes
brew install imagemagick

# Convertir SVG a ICO
convert public/favicon.svg -resize 32x32 public/favicon.ico
```

### 2. Subir el Archivo

Una vez que tengas `favicon.ico`:

1. Renómbralo a `favicon.ico` (si tiene otro nombre)
2. Súbelo a la carpeta `public/` de tu proyecto
3. Reemplaza el archivo existente

### 3. Verificar

Después de subir:

1. Ve a https://padel-torneos.vercel.app
2. Deberías ver tu logo de pádel en la pestaña
3. También se verá al compartir links

## 📁 Archivos Necesarios

```
public/
├── favicon.ico     ← Este es el que necesitas crear
├── favicon.svg     ← Ya existe y está bien
├── manifest.json   ← Ya configurado
└── mito.png        ← Tu imagen para WhatsApp
```

## 🎯 Configuración Actual

Los meta tags ya están configurados correctamente en `layout.tsx`:

```typescript
icons: {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/favicon.svg", type: "image/svg+xml" },
  ],
  apple: "/favicon.svg",
  shortcut: "/favicon.ico",
},
```

## ⚡ Verificación

Una vez que subas `favicon.ico`:

1. **Limpia el cache** del navegador (Ctrl+F5)
2. **Ve a tu sitio** - Deberías ver tu logo
3. **Comparte un link** - WhatsApp debería usar tu imagen
4. **Guarda en favoritos** - Debería aparecer tu icon

## 🚀 ¡El favicon de Vercel desaparecerá completamente!

¡Una vez que tengas el favicon.ico real, todo funcionará perfecto! 🎉
