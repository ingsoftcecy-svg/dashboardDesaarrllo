import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  apiKey: "AIzaSyB7mdxoIdv04sA_2aoVKkzp-1k_TLj8Hw0",
  authDomain: "preview-bbe71.firebaseapp.com",
  projectId: "preview-bbe71",
  storageBucket: "preview-bbe71.firebasestorage.app",
  messagingSenderId: "171653395226",
  appId: "1:171653395226:web:8c54c619d7ce9aa1bcf2a3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Todas las keys de los prerequisitos
const ALL_KEYS = [
  "MANGYVER", "WVD", "CORREO", "SAP", "WORKPLACE", 
  "CONECTA", "MY LEARNING", "SAM (ACTIVOS)", "PPM"
];

const normalize = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
};

// Nombres para "TODO MENOS MANGYVER" (primer grupo)
const menosMangyverNames = [
  "VICTOR HUGO ZAPATA DOMINGUEZ",
  "JESUS EDUARDO BRICEÑO MONTELONGO",
  "JOSE LEANDRO MARTINEZ SANDOVAL",
  "MIGUEL ANGEL SANCHEZ FLORES",
  "RICARDO ESPARZA DOMINGUEZ",
  "LUIS FERNANDO ZAPATA CARDONA",
  "GUILLERMO GERARDO GONZALEZ ULLOA",
  "EDGAR RENE DIAZ SANCHEZ",
  "OSCAR RODRIGUEZ CODALLOS",
  "SHERLYN GARCIA PEREZ",
  "CARLOS EDUARDO ORNEDO ESQUEDA",
  "ANA PAOLA PERERA MARIN",
  "ARIADNNE MAGDALENA TORRES RODRIGUEZ",
  "SOLORZANO ISAI"
].map(normalize);

// Nombres para "TODO MENOS WVD, CORREO Y SAP" (segundo grupo)
const menosWvdCorreoSapNames = [
  "Claudia Alexandra Alvarez Barba",
  "JOSE REFUGIO LOPEZ MARTINEZ",
  "NESTOR MONTOYA DUEÑAS",
  "LUIS RICARDO VALDES SANCHEZ",
  "GERMAN RUEDAS SANCHEZ",
  "ALDO ERNESTO SILVA VARELA",
  "JESUS CALDERON ALFARO",
  "JESUS MENCHACA DEL VILLAR",
  "PEDRO MALDONADO MARQUEZ",
  "MANUEL DE JESUS FALCON ARROYO",
  "JUAN MANUEL RODARTE MARTINEZ",
  "MIGUEL ANGEL NAVARRO ESCOBEDO",
  "OSWALDO DELGADILLO GONZALEZ",
  "OSCAR EDUARDO VALDEZ MUÑOZ",
  "MARIO ALBERTO REYES HERNANDEZ",
  "JORGE LUIS RODRIGUEZ BERMUDEZ",
  "ERON GUARDADO ROBLES",
  "JORGE ALBERTO ORTIZ HERNANDEZ",
  "JOSE EDUARDO ALVARADO CEBALLOS",
  "JOSE GUADALUPE VALLE ACUÑA",
  "RICARDO ESTEBAN JARAMILLO ROBLES",
  "LUIS ADOLFO MALDONADO DOMINGUEZ",
  "BENITO VALLE VELAZQUEZ",
  "GUSTAVO MELENCIANO MARTINEZ",
  "JUAN FRANCISCO GARCIA CARRILLO",
  "WILMAR YOEL GONZALEZ LARA",
  "VICTOR HUGO ASCENCIO LEYVA",
  "PEDRO ANTONIO URIBE ARANDA",
  "RODOLFO CABRERA CASTRO",
  "EFREN GONZALEZ CONTRERAS",
  "PEDRO LUIS RODRIGUEZ GAMEZ",
  "ARTURO SAUCEDO CABRERA",
  "JUAN CARLOS MORALES ORTIZ",
  "JUAN GABRIEL HERNANDEZ GUARDADO",
  "RODOLFO ESPARZA GONZALEZ",
  "HUMBERTO RODARTE MARTINEZ",
  "JAIME CID VEYNA",
  "LUIS MANUEL DOMINGUEZ GARCIA",
  "RAFAEL MARTINEZ MARES",
  "VICTOR SOTO LIZARDO",
  "ARMANDO RAYZOLA ROLDAN",
  "FRANCISCO JAVIER VARELA RODRIGUEZ",
  "PEDRO PALOS JARA",
  "RAFAEL CHAVEZ REVELES",
  "HECTOR MANUEL DE LA ROSA AGÜERO",
  "ENRIQUE MEDINA GARCIA",
  "JUAN MANUEL HUERTA DE LA",
  "MAURICIO ARELLANO TREJO",
  "OSCAR CAMPOS GUERRERO",
  "SERGIO MIGUEL PARRA VAZQUEZ",
  "CARLOS ADRIAN ROBLES MONTENEGRO",
  "HELMER DEL REAL PEREZ",
  "LUIS ARMANDO REYES DEL REAL"
].map(normalize);

async function updatePrereqs() {
  const operatorsPath = path.join(__dirname, '..', 'public', 'operators.json');
  const operators = JSON.parse(fs.readFileSync(operatorsPath, 'utf-8'));

  let matched = 0;
  
  for (const op of operators) {
    const nameUpper = normalize(op.nombre);
    
    // Check if skip
    if (nameUpper.includes("RODRIGO REGALADO") || nameUpper.includes("VICTOR REYES") || nameUpper.includes("VICTOR MANUEL REYES")) {
      console.log(`⏩ Skipping ${op.nombre}`);
      continue;
    }

    let isMangyverRule = menosMangyverNames.includes(nameUpper) || menosMangyverNames.some(n => nameUpper.includes(n) || n.includes(nameUpper));
    let isWvdRule = menosWvdCorreoSapNames.includes(nameUpper) || menosWvdCorreoSapNames.some(n => nameUpper.includes(n) || n.includes(nameUpper));

    if (isMangyverRule || isWvdRule) {
      matched++;
      const payload = {
        operatorName: op.nombre,
        teamName: op.equipoAutonomo || "Sin equipo"
      };

      for (const key of ALL_KEYS) {
        if (isMangyverRule) {
          payload[key] = (key !== "MANGYVER");
        } else if (isWvdRule) {
          payload[key] = !(key === "WVD" || key === "CORREO" || key === "SAP");
        }
      }

      console.log(`✅ Updating ${op.nombre} (${isMangyverRule ? 'Menos MANGYVER' : 'Menos WVD'})`);
      const docRef = doc(db, 'prerequisitos', op.id);
      await setDoc(docRef, payload, { merge: true });
    }
  }

  console.log(`\n🎉 Done! Updated ${matched} operators.`);
  process.exit(0);
}

updatePrereqs().catch(console.error);
