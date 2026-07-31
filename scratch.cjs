const fs = require('fs');

const datos = JSON.parse(fs.readFileSync('./public/datos.json', 'utf-8'));
const fotos = fs.readdirSync('./public/fotos').map(f => f.toUpperCase());

const get_fallbacks = (name) => {
    const clean = name.trim().toUpperCase();
    if (!clean) return [];
    
    const parts = clean.split(/\s+/);
    const list = [];

    // 1. Full name
    list.push(`${clean}.JPEG`);
    list.push(`${clean}.PNG`);
    list.push(`${clean}.JPG`);

    if (parts.length >= 3) {
      // 2. Omit second surname (last word)
      const omitLast = parts.slice(0, -1).join(" ");
      list.push(`${omitLast}.JPEG`);
      list.push(`${omitLast}.PNG`);
      list.push(`${omitLast}.JPG`);
    }

    if (parts.length >= 4) {
      // 3. First name + First surname
      const firstAndThird = `${parts[0]} ${parts[2]}`;
      list.push(`${firstAndThird}.JPEG`);
      list.push(`${firstAndThird}.PNG`);
      list.push(`${firstAndThird}.JPG`);
    }

    if (parts.length >= 2) {
      // 4. First name + Second word
      const firstTwo = `${parts[0]} ${parts[1]}`;
      list.push(`${firstTwo}.JPEG`);
      list.push(`${firstTwo}.PNG`);
      list.push(`${firstTwo}.JPG`);
      
      // 5. First + Last
      const firstAndLast = `${parts[0]} ${parts[parts.length - 1]}`;
      list.push(`${firstAndLast}.JPEG`);
      list.push(`${firstAndLast}.PNG`);
      list.push(`${firstAndLast}.JPG`);
    }
    return list;
};

const missing = new Set();
const found = new Set();

// Check datos.json
datos.forEach(row => {
    let area = (row.Area || "").toLowerCase();
    if (area.includes('warm block') || area.includes('cocimientos')) {
        let emp = row.Employee || "";
        let match = emp.match(/\[\d+\]\s+(.*)/);
        let name = match ? match[1] : emp;
        if (!name) return;
        
        name = name.trim().toUpperCase();
        let fallbacks = get_fallbacks(name);
        let isFound = fallbacks.some(fb => fotos.includes(fb));
        
        if (isFound) found.add(name);
        else missing.add(name);
    }
});

// Check base.json
const base = JSON.parse(fs.readFileSync('./public/base.json', 'utf-8'));
base.forEach(row => {
    let area = (row["Área"] || row["Area"] || "").toLowerCase();
    if (area.includes('warm block') || area.includes('cocimientos')) {
        let name = row["Nombre del integrante "] || row["Nombre"] || "";
        if (!name) return;
        name = name.trim().toUpperCase();
        
        let fallbacks = get_fallbacks(name);
        let isFound = fallbacks.some(fb => fotos.includes(fb));
        
        if (isFound) {
            missing.delete(name);
            found.add(name);
        }
        else if (!found.has(name)) {
            missing.add(name);
        }
    }
});

console.log("TOTAL FOUND:", found.size);
console.log("TOTAL MISSING:", missing.size);
console.log("MISSING PEOPLE:");
Array.from(missing).sort().forEach(m => console.log("- " + m));
