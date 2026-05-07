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
  } catch (e) {
    console.error('❌ Prerender failed:', e);
    process.exit(1);
  }
}

prerender();
