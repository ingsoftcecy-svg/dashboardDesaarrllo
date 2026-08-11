import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function convertDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath);
  let convertedCount = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.jpeg' || ext === '.jpg') {
      const inputPath = path.join(dirPath, file);
      const baseName = path.basename(file, ext);
      const outputPath = path.join(dirPath, `${baseName}.webp`);

      try {
        await sharp(inputPath)
          .webp({ quality: 90 })
          .toFile(outputPath);
        console.log(`✅ [WEBP CONVERTIDO] ${file} -> ${baseName}.webp`);
        convertedCount++;
      } catch (err) {
        console.error(`❌ Error convirtiendo ${file}:`, err);
      }
    }
  }

  return convertedCount;
}

async function run() {
  console.log("🔄 INICIANDO CONVERSIÓN DE FOTOS JPEG A WEBP...");
  const dirs = [
    path.resolve('./public/fotos'),
    path.resolve('./public/fotos_originales'),
    path.resolve('./public/logos_originales')
  ];

  let totalConverted = 0;
  for (const dir of dirs) {
    const count = await convertDirectory(dir);
    totalConverted += count;
  }

  console.log(`🎉 CONVERSIÓN COMPLETA: Total ${totalConverted} imágenes .jpeg/.jpg convertidas a .webp`);
}

run().catch(console.error);
