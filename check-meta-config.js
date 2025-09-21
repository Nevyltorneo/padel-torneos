#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔍 Verificando configuración de meta tags y archivos...\n");

// Verificar archivos requeridos
const requiredFiles = [
  "public/favicon.svg",
  "public/og-image.svg",
  "public/manifest.json",
  "public/test-meta.html",
];

console.log("📁 Verificando archivos:");
requiredFiles.forEach((file) => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? "✅" : "❌"} ${file}`);
});

console.log("\n📋 Archivos del directorio public:");
try {
  const publicFiles = fs.readdirSync("public");
  publicFiles.forEach((file) => {
    console.log(`   📄 ${file}`);
  });
} catch (error) {
  console.log("❌ Error al leer directorio public");
}

console.log("\n🔗 URLs de archivos:");
const baseUrl = "https://padel-torneos.com";
const files = [
  "/favicon.svg",
  "/og-image.svg",
  "/manifest.json",
  "/test-meta.html",
];

files.forEach((file) => {
  console.log(`   ${baseUrl}${file}`);
});

console.log("\n📱 Configuración de Open Graph:");
console.log(`   Título: MiTorneo - Sistema Profesional de Torneos de Pádel`);
console.log(
  `   Descripción: Organiza torneos de pádel de manera profesional con nuestro sistema completo de gestión. Grupos automáticos, brackets, calendarios y seguimiento en vivo.`
);
console.log(`   Imagen: ${baseUrl}/og-image.svg`);
console.log(`   URL: ${baseUrl}`);

console.log("\n✅ Verificación completada!");
console.log("\n💡 Para probar:");
console.log(
  "   1. Abre el navegador y ve a: https://padel-torneos.com/test-meta.html"
);
console.log(
  "   2. Usa herramientas como: https://opengraph.dev/ para verificar las meta tags"
);
console.log(
  "   3. Comparte el link en redes sociales para ver la imagen de preview"
);
