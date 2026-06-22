# Dashboard de Autonomia

Este proyecto es un tablero operacional interactivo para visualizar el avance de la autonomia de operarios y equipos (TPM - Block Warm y Block Cold). Permite consultar la matriz SKAP, el historico de desempeño de los equipos y perfiles individuales de los operadores.

## Tecnologias

El proyecto esta construido con las siguientes tecnologias:
* Core: React y TypeScript
* Enrutamiento: TanStack Router y TanStack Start
* Estilos: Tailwind CSS
* Base de Datos: Firebase Firestore
* Alojamiento y Despliegue: Firebase Hosting
* Graficas: Recharts
* Manipulacion de archivos: XLSX (SheetJS)

## Rutas del Proyecto

El enrutamiento del sistema cuenta con las siguientes paginas:

### 1. Vista General (Ruta: `/`)
Es la pantalla de inicio publica del dashboard. Muestra:
* Encabezados con lideres de equipo.
* Podio de excelencia y ultimos logros.
* Ranking de equipos.
* Indicador de Autonomy Score global.
* Grafico de promedio de factores.
* Matriz SKAP completa de operarios (solo visible para edicion por usuarios autenticados).

### 2. Analisis Comparativo (Ruta: `/analisis-comparativo`)
Pantalla publica que permite:
* Comparar el porcentaje de excelencia global de dos periodos diferentes (semanas o meses).
* Visualizar tendencias historicas globales por departamento (Cocimientos, Bloque Frio y Mantenimiento).
* Analizar la madurez acumulada de operarios por niveles (Nivel 1 al 4).
* Evaluar la evolucion historica del promedio de las 8 categorias de habilidades en equipos seleccionados.

### 3. Cargar Datos (Ruta: `/cargar-datos`)
Panel de administracion protegido por autenticacion para la carga de reportes operacionales:
* Carga de Reporte General (DATOS.xlsx) e indexado automatico.
* Carga de Reporte de Desempeño (BPRE.xlsx).
* Carga de bases fijas (EAC, EABF, Base Equipos).
* Ejecucion de scripts de migracion de historicos semanales a mensuales.
* Consola de logs de procesamiento en tiempo real.

## Modales de Historial e Interconectividad

Dentro de la Matriz SKAP y el Dashboard, existen dos modales interactivos para el seguimiento del historico de datos:

### Historial de Equipo
Muestra una grafica mensual con el promedio de autonomia acumulado del equipo seleccionado y una tabla con el listado de sus integrantes activos.

### Historial Individual de Operario
Accesible al hacer clic en el nombre de un operador dentro del modal de equipo:
* Muestra el progreso mensual de autonomia del trabajador.
* Si el operador ha sido evaluado en mas de un puesto de trabajo en el historico, la grafica dibuja una linea independiente de color diferente por cada puesto, facilitando el analisis de polivalencia.
* Incluye una leyenda en la grafica identificando cada puesto y un tooltip detallado.
* Muestra una tabla detallada con la fecha exacta, puesto evaluado, score de autonomia final, nivel y el evaluador.

## Despliegue en Firebase

Para realizar pruebas locales y despliegue del proyecto, sigue los siguientes pasos:

### Ejecucion en Desarrollo
```bash
npm run dev
```

### Compilacion de Produccion
```bash
npm run build
```

### Despliegue a Firebase Hosting
```bash
npx firebase deploy --only hosting
```
