// Deep audit: check if any UI wrapper is imported by another UI wrapper that IS used
const fs = require('fs');
const path = require('path');

const uiDir = path.join('src', 'components', 'ui');
const uiFiles = fs.readdirSync(uiDir).filter(f => f.endsWith('.tsx'));

// First pass: find which wrappers are imported outside of ui/
function findExternalImporters(componentName) {
  const pattern = `@/components/ui/${componentName}`;
  const results = [];
  function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) {
        if (f !== 'node_modules' && f !== '.git') walk(fp);
      } else if (fp.match(/\.(tsx?|jsx?)$/) && !fp.includes(path.join('components', 'ui'))) {
        const content = fs.readFileSync(fp, 'utf-8');
        if (content.includes(pattern)) results.push(fp);
      }
    }
  }
  walk('src');
  return results;
}

// Second pass: find which wrappers import other wrappers
function findUiDeps(fileName) {
  const fp = path.join(uiDir, fileName);
  const content = fs.readFileSync(fp, 'utf-8');
  const deps = [];
  for (const other of uiFiles) {
    if (other === fileName) continue;
    const otherName = other.replace('.tsx', '');
    if (content.includes(`@/components/ui/${otherName}`) || content.includes(`./${otherName}`)) {
      deps.push(otherName);
    }
  }
  return deps;
}

const directlyUsed = new Set();
const notDirectlyUsed = new Set();

for (const file of uiFiles) {
  const baseName = file.replace('.tsx', '');
  const externalUses = findExternalImporters(baseName);
  if (externalUses.length > 0) {
    directlyUsed.add(baseName);
  } else {
    notDirectlyUsed.add(baseName);
  }
}

// Now check transitive deps: if a used wrapper imports an "unused" one, it's actually used
const transitivelyUsed = new Set();
function markTransitive(name) {
  const deps = findUiDeps(name + '.tsx');
  for (const dep of deps) {
    if (notDirectlyUsed.has(dep) && !transitivelyUsed.has(dep)) {
      transitivelyUsed.add(dep);
      markTransitive(dep); // recurse
    }
  }
}

for (const used of directlyUsed) {
  markTransitive(used);
}

console.log("=== DIRECTLY USED (imported outside ui/) ===");
[...directlyUsed].sort().forEach(n => console.log("  ✅", n));

console.log("\n=== TRANSITIVELY USED (imported by a used wrapper) ===");
[...transitivelyUsed].sort().forEach(n => console.log("  🔗", n));

const safeToDelete = [...notDirectlyUsed].filter(n => !transitivelyUsed.has(n)).sort();
console.log("\n=== SAFE TO DELETE ===");
safeToDelete.forEach(n => console.log("  ❌", n + ".tsx"));
console.log("\nTotal safe to delete:", safeToDelete.length);
