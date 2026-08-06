const fs = require('fs');

const csv = fs.readFileSync('alineacion_dashboard.csv', 'utf8').trim().split('\n');
const existingOps = JSON.parse(fs.readFileSync('public/operators.json', 'utf8'));

const existingMap = {};
existingOps.forEach(op => {
  existingMap[op.id] = op;
});

const newOperators = [];

for (let i = 1; i < csv.length; i++) {
  const parts = csv[i].split(';');
  if (parts.length >= 4) {
    const nombre = parts[0].trim();
    const equipo = parts[1].trim();
    const lider = parts[2].trim();
    const id = parts[3].trim().replace(/\D/g, ''); // Extract only digits for ID

    let puesto = "Operador";
    let area = "Warm Block";
    let roles = [];
    let status = "activo";

    if (existingMap[id]) {
      puesto = existingMap[id].puesto;
      area = existingMap[id].area;
      roles = existingMap[id].roles || [];
      status = existingMap[id].status || "activo";
    } else {
       const byName = existingOps.find(o => o.nombre.toUpperCase() === nombre.toUpperCase());
       if (byName) {
         puesto = byName.puesto;
         area = byName.area;
         roles = byName.roles || [];
         status = byName.status || "activo";
       }
    }

    newOperators.push({
      id: id,
      nombre: nombre,
      puesto: puesto,
      area: area,
      equipoAutonomo: equipo,
      lider: lider,
      roles: roles,
      status: status
    });
  }
}

fs.writeFileSync('public/operators.json', JSON.stringify(newOperators, null, 2));
console.log(`Rebuilt operators.json with ${newOperators.length} operators based on CSV.`);
