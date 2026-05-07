import { readdirSync } from 'fs';
const files = readdirSync('public/fotos');
const erika = files.find(f => f.includes('ERIKA'));
if (erika) {
    console.log(`Found file: "${erika}"`);
    console.log('Char codes for file:');
    for (let i = 0; i < erika.length; i++) {
        console.log(erika[i], erika.charCodeAt(i));
    }
} else {
    console.log('Erika not found in files');
}

const erikaDatos = "ERIKA IVOONE IBARRA";
console.log(`\nTarget from DATOS.xlsx: "${erikaDatos}"`);
console.log('Char codes for target:');
for (let i = 0; i < erikaDatos.length; i++) {
    console.log(erikaDatos[i], erikaDatos.charCodeAt(i));
}
