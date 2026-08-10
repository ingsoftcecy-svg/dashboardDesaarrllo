import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { removeBackground } from '@imgly/background-removal-node';

const inputDir = path.resolve('./public/fotos');
const outputDir = path.resolve('./public/fotos_procesadas');

// Create output dir if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate the SVG gradient background
const getGradientSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" style="stop-color:#01273F;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#022038;stop-opacity:1" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad1)" />
</svg>
`;

async function processImages() {
  const files = fs.readdirSync(inputDir).filter(f => f.startsWith('WhatsApp') && !f.endsWith('.webp'));
  console.log(`Found ${files.length} images to process.`);

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputName = path.basename(file, path.extname(file)) + '.webp';
    const outputPath = path.join(outputDir, outputName);
    
    console.log(`Processing: ${file}`);
    try {
      // 1. Remove background using @imgly/background-removal-node
      // It expects a file path and returns a Blob. We can convert Blob to ArrayBuffer to Buffer.
      const fileUri = 'file:///' + inputPath.replace(/\\/g, '/');
      const blob = await removeBackground(fileUri);
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 2. Crop to 1:1, resize to a standard size (e.g. 512x512) and Composite with gradient
      const targetSize = 512;
      
      const svgBuffer = Buffer.from(getGradientSVG(targetSize));

      await sharp(buffer)
        .resize(targetSize, targetSize, {
          fit: 'cover',
          position: 'attention' // Smart crop focusing on the subject
        })
        .toBuffer()
        .then(async (croppedSubject) => {
          await sharp(svgBuffer)
            .composite([
              { input: croppedSubject, blend: 'over' }
            ])
            .webp({ quality: 90 })
            .toFile(outputPath);
        });

      console.log(`✅ Success: ${outputName}`);
    } catch (err) {
      console.error(`❌ Failed: ${file}`, err);
    }
  }
}

processImages();
