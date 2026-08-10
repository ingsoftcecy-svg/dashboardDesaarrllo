/**
 * Script para comprimir fotos y logos del dashboard.
 * - Respalda originales en carpetas _originales
 * - Convierte a WebP con calidad optimizada
 * - Redimensiona fotos a max 400x400
 * - Redimensiona logos a max 600x600
 */
import sharp from 'sharp';
import { readdirSync, mkdirSync, copyFileSync, statSync, existsSync, unlinkSync } from 'fs';
import { join, basename, extname } from 'path';

const FOTO_DIR = 'public/fotos';
const LOGO_DIR = 'public/logos';
const FOTO_BACKUP = 'public/fotos_originales';
const LOGO_BACKUP = 'public/logos_originales';

async function compressImages(srcDir, backupDir, maxSize, quality, label) {
  // Create backup dir
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
  
  const files = readdirSync(srcDir).filter(f => !statSync(join(srcDir, f)).isDirectory());
  let totalBefore = 0;
  let totalAfter = 0;
  
  console.log(`\n📸 ${label}: ${files.length} archivos`);
  
  for (const file of files) {
    const srcPath = join(srcDir, file);
    const fileSize = statSync(srcPath).size;
    totalBefore += fileSize;
    
    // Backup original
    const backupPath = join(backupDir, file);
    if (!existsSync(backupPath)) {
      copyFileSync(srcPath, backupPath);
    }
    
    // Convert to WebP
    const nameNoExt = basename(file, extname(file));
    const outPath = join(srcDir, nameNoExt + '.webp');
    
    try {
      await sharp(srcPath)
        .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toFile(outPath);
      
      const newSize = statSync(outPath).size;
      totalAfter += newSize;
      
      // Remove original if different extension
      if (extname(file).toLowerCase() !== '.webp') {
        unlinkSync(srcPath);
      }
      
      const reduction = ((1 - newSize / fileSize) * 100).toFixed(0);
      console.log(`  ✅ ${file} → ${nameNoExt}.webp (${(fileSize/1024).toFixed(0)}KB → ${(newSize/1024).toFixed(0)}KB, -${reduction}%)`);
    } catch (err) {
      console.error(`  ❌ Error con ${file}:`, err.message);
      totalAfter += fileSize; // count original size
    }
  }
  
  console.log(`\n  📊 ${label} total: ${(totalBefore/1024/1024).toFixed(2)}MB → ${(totalAfter/1024/1024).toFixed(2)}MB (-${((1-totalAfter/totalBefore)*100).toFixed(0)}%)`);
  return { before: totalBefore, after: totalAfter };
}

async function main() {
  console.log('🔧 Compresión de assets del dashboard');
  console.log('=====================================');
  
  const fotos = await compressImages(FOTO_DIR, FOTO_BACKUP, 400, 80, 'Fotos');
  const logos = await compressImages(LOGO_DIR, LOGO_BACKUP, 600, 85, 'Logos');
  
  const totalBefore = fotos.before + logos.before;
  const totalAfter = fotos.after + logos.after;
  
  console.log('\n=====================================');
  console.log(`🎉 TOTAL: ${(totalBefore/1024/1024).toFixed(2)}MB → ${(totalAfter/1024/1024).toFixed(2)}MB (-${((1-totalAfter/totalBefore)*100).toFixed(0)}%)`);
  console.log(`💾 Ahorro: ${((totalBefore-totalAfter)/1024/1024).toFixed(2)}MB`);
  console.log(`\n📁 Originales respaldados en:`);
  console.log(`   ${FOTO_BACKUP}/`);
  console.log(`   ${LOGO_BACKUP}/`);
}

main().catch(console.error);
