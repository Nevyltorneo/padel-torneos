# 📸 Crear Imagen PNG para WhatsApp

WhatsApp prefiere imágenes PNG sobre SVG. Sigue estos pasos para crear la imagen que se mostrará cuando compartas el link del sistema.

## 🚀 Pasos Rápidos

### 1. Abrir Generador de Imágenes

Ve a: https://www.htmlcsstoimage.com/

### 2. Copiar el HTML

Copia todo el contenido del archivo `public/og-image.html` de este proyecto.

### 3. Configurar Dimensiones

- **Ancho:** 1200px
- **Alto:** 630px
- **Formato:** PNG

### 4. Generar Imagen

Haz clic en "Generate Image" y descarga el PNG.

### 5. Subir a Public

Renombra el archivo descargado a `og-image.png` y súbelo a la carpeta `public/` de tu proyecto.

## ✅ Lo que Deberías Ver

La imagen PNG debe mostrar:

- **Fondo azul gradiente**
- **Logo de pádel blanco** (círculo con raqueta)
- **Texto "MiTorneo"** en grande
- **"Sistema de Torneos de Pádel"**
- **Características:** Grupos automáticos, calendarios inteligentes, seguimiento en vivo
- **URL:** padel-torneos.vercel.app

## 🧪 Verificar

1. Ve a: https://padel-torneos.vercel.app/whatsapp-test.html
2. Copia la URL principal: https://padel-torneos.vercel.app
3. Pégala en WhatsApp
4. Deberías ver la imagen PNG

## ⚡ Alternativa Rápida

Si no quieres usar htmlcsstoimage.com, puedes usar:

- **Screenshot de navegador** (presiona F12 → Device toolbar → 1200x630)
- **Puppeteer** para generar automáticamente
- **Cualquier herramienta online** de HTML a imagen

## 🎯 Meta Tags Configurados

Los meta tags ya están actualizados para usar:

- `og:image: https://padel-torneos.vercel.app/og-image.png`
- `twitter:image: https://padel-torneos.vercel.app/og-image.png`

¡Una vez que subas el PNG, debería funcionar inmediatamente en WhatsApp! 📱✨
