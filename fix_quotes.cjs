const fs=require('fs'); 
const data=JSON.parse(fs.readFileSync('public/operators.json')); 
data.forEach(d=>{ 
  d.nombre=d.nombre.replace(/^\"|\"$/g, ''); 
  d.equipoAutonomo=d.equipoAutonomo.replace(/^\"|\"$/g, ''); 
  d.lider=d.lider.replace(/^\"|\"$/g, ''); 
}); 
fs.writeFileSync('public/operators.json', JSON.stringify(data, null, 2));
