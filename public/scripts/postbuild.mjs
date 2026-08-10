import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.join(__dirname, '..', 'dist', 'client');
const serverIndex = path.join(__dirname, '..', 'dist', 'server', 'index.js');

async function prerender() {
  console.log('🔄 Starting SSR prerender...');
  try {
    // Import the built SSR server using a valid file:// URL for Windows
    const serverIndexUrl = pathToFileURL(serverIndex).href;
    const server = await import(serverIndexUrl);
    
    // Create a mock request to the root URL
    const req = new Request('http://localhost/');
    
    // Call the server fetch handler
    const res = await server.default.fetch(req);
    
    if (!res.ok) {
      throw new Error(`Server returned ${res.status} ${res.statusText}`);
    }
    
    // Get the fully rendered HTML string
    const html = await res.text();
    
    // Save to dist/client/index.html
    fs.writeFileSync(path.join(clientDir, 'index.html'), html);
    console.log('✅ Generated true SSR index.html successfully!');
    // Clean up unnecessary files from dist/client to reduce bundle size
    console.log('🧹 Cleaning up dist/client...');
    const distFiles = fs.readdirSync(clientDir);
    distFiles.forEach(file => {
      const fullPath = path.join(clientDir, file);
      if (file.endsWith('.xlsx')) {
        fs.unlinkSync(fullPath);
        console.log(`  🗑️ Removed ${file}`);
      } else if (file === 'fotos_originales' || file === 'logos_originales') {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`  🗑️ Removed directory ${file}/`);
      }
    });

    // Copy scripts folder to dist/client/scripts for direct web portal download
    const scriptsSrc = path.join(__dirname, '..', 'scripts');
    const scriptsDst = path.join(clientDir, 'scripts');
    if (!fs.existsSync(scriptsDst)) {
      fs.mkdirSync(scriptsDst, { recursive: true });
    }
    const scriptFiles = fs.readdirSync(scriptsSrc);
    scriptFiles.forEach(f => {
      const srcFile = path.join(scriptsSrc, f);
      const dstFile = path.join(scriptsDst, f);
      if (fs.statSync(srcFile).isFile()) {
        fs.copyFileSync(srcFile, dstFile);
      }
    });
    console.log('✅ Copied all scripts (.bat, .ps1) to dist/client/scripts for Portal Secreto.');

  } catch (e) {
    console.error('❌ Prerender failed:', e);
    process.exit(1);
  }
}

prerender();
