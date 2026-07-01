# Dashboard de Autonomía TPM

Este proyecto es un tablero operacional interactivo y de alta seguridad diseñado para visualizar y gestionar el avance de la autonomía de los operarios y equipos de producción en los departamentos de **Cocimientos (Block Warm)**, **Bloque Frío (Block Cold)** y **Mantenimiento**. Permite el seguimiento de la matriz SKAP, el histórico de desempeño de los equipos y perfiles individuales de los operadores con análisis de polivalencia.

---

## 🛠️ Tecnologías y Arquitectura

El sistema está construido sobre una arquitectura moderna basada en las siguientes tecnologías:
* **Core:** React 19 y TypeScript
* **Ruteo y Framework:** [TanStack Router](https://tanstack.com/router) y [TanStack Start](https://tanstack.com/start) con pre-renderizado estático (SSR).
* **Diseño y Estilos:** Tailwind CSS con componentes estructurados mediante Shadcn UI.
* **Animaciones:** Framer Motion y Canvas Confetti.
* **Base de Datos:** Firebase Cloud Firestore (NoSQL) con políticas avanzadas de control de acceso.
* **Hosting:** Firebase Hosting, configurado con cabeceras de seguridad de grado empresarial.
* **Procesamiento de Archivos:** [SheetJS (XLSX)](https://sheetjs.com/) para análisis, importación y procesamiento de archivos Excel.
* **Visualización de Datos:** Recharts para gráficos de tendencias e históricos responsivos.

---

## 🧭 Estructura de Rutas y Funcionalidades

El enrutamiento del sistema cuenta con las siguientes páginas:

### 1. Vista General (Ruta: `/`)
Pantalla de inicio del dashboard. Permite visualizar:
* **Cabecera de Equipos:** Líderes de equipo de la sección seleccionada.
* **Sección de Excelencia:** Podio de excelencia y últimas certificaciones o logros.
* **Ranking de Equipos:** Tabla de ordenamiento por Autonomy Score de los equipos.
* **Autonomy Card:** Gráfica de tendencia por hora del turno y el Autonomy Score global.
* **Promedio por Factor:** Desglose del promedio obtenido en cada uno de los factores evaluados.
* **Matriz SKAP Completa:** Tablero interactivo (Physical Board) que visualiza las habilidades de cada operario. *Nota: La edición directa está restringida a usuarios autenticados con rol de administrador.*

### 2. Análisis Comparativo (Ruta: `/analisis-comparativo`)
Pantalla pública para el análisis histórico y comparativo de datos:
* **Comparador de Excelencia:** Mide el porcentaje de excelencia global entre dos períodos (semanas o meses).
* **Tendencias Históricas:** Gráficos de evolución por departamento (Cocimientos, Bloque Frío y Mantenimiento).
* **Madurez por Niveles:** Análisis de la cantidad y porcentaje de operarios situados en cada uno de los niveles de madurez (Nivel 1 al 4).
* **Evolución por Categoría:** Gráfico interactivo que muestra el promedio de las 8 categorías de habilidades a lo largo del tiempo para los equipos elegibles.

### 3. Configuración Única de Estructura (Ruta: `/configurar-plantilla`)
Módulo crítico de administración para estructurar la base relacional del personal. Permite subir y unificar tres catálogos estáticos en un solo maestro:
1. **Base Equipos Autónomos CCZ:** Mapea la relación oficial entre los equipos y sus áreas/departamentos.
2. **EABF (Personal y Celdas):** Asocia los operarios con sus equipos correspondientes usando su identificador único (Ficha/Sharp).
3. **EAC (Puestos de Trabajo):** Complementa y verifica las áreas de trabajo de cada operador.
*Una vez subidos, el sistema compila la estructura fija y guarda el directorio unificado de operarios en Firestore (`config_estructura/maestro_operarios`).*

### 4. Cargar Datos (Ruta: `/cargar-datos`)
Consola de administración protegida para la actualización periódica del desempeño de la planta:
* **Carga de Reporte General (`DATOS.xlsx`):** Importa y actualiza la matriz de habilidades de los operarios.
* **Carga de Reporte de Desempeño (`BPRE.xlsx`):** Importa el histórico y las métricas operativas semanales de la planta.
* **Ejecución de Scripts de Migración:** Herramientas para consolidar históricos semanales a registros mensuales en Firestore.
* **Consola de Logs:** Terminal en tiempo real que muestra el paso a paso del procesamiento del archivo y control de errores de indexación.

---

## 💬 Modales de Historial e Interconectividad

Dentro del dashboard existen flujos interactivos para profundizar en la información sin perder contexto:
* **Historial de Equipo:** Gráfica mensual con el promedio de autonomía acumulado y listado de sus operarios activos.
* **Historial de Operario (Polivalencia):** Accesible desde el listado del equipo. Muestra el progreso individual y, si el operario ha trabajado en múltiples puestos, **dibuja líneas de diferentes colores para cada puesto de trabajo**, permitiendo analizar el nivel de polivalencia histórica.

---

## ⚡ Automatización e Ingesta de Datos (Scripts)

El proyecto cuenta con scripts locales para optimizar el rendimiento y el desarrollo:

### 1. Pre-procesamiento de Archivos (`scripts/parseExcel.mjs`)
Para evitar la sobrecarga de lectura en el navegador o fallas por falta de conexión, este script se ejecuta automáticamente al iniciar el entorno de desarrollo o durante la compilación.
* Toma los archivos `.xlsx` estáticos de prueba de la carpeta `public/` (como `DATOS.xlsx`, `EABF.xlsx`, `EAC.xlsx`, `BPRE.xlsx`).
* Los parsea en archivos `.json` estructurados (como `datos.json`, `eabf.json`, etc.) para servir como fallback local instantáneo.

### 2. Pre-renderizado SSR Post-build (`scripts/postbuild.mjs`)
Dado que se utiliza **TanStack Start**, al finalizar la compilación (`vite build`), este script de post-procesamiento:
* Levanta el servidor SSR de forma interna en Node.js.
* Realiza una petición simulada a la ruta raíz `/`.
* Captura el HTML generado y escribe el archivo `dist/client/index.html` estático, garantizando un tiempo de carga (FCP) extremadamente rápido y compatibilidad con hosting estático.

---

## 💻 Desarrollo y Despliegue

### Requisitos Previos
* **Node.js** (versión 18 o superior recomendada)
* **npm** como gestor de paquetes (o Bun)

### Pasos para Ejecutar Localmente

1. Instalar las dependencias del proyecto:
   ```bash
   npm install
   ```
2. Iniciar el servidor de desarrollo (ejecuta el parser de Excel y lanza Vite):
   ```bash
   npm run dev
   ```

### Pasos para Compilación y Despliegue

1. Compilar el proyecto para producción (ejecuta el parser de Excel, compila la aplicación y ejecuta el script de prerenderizado post-build):
   ```bash
   npm run build
   ```
2. Realizar pruebas de previsualización local de la compilación:
   ```bash
   npm run preview
   ```
3. Desplegar la aplicación a Firebase Hosting:
   ```bash
   npx firebase deploy --only hosting
   ```

---

## 🔒 Seguridad y Protección de Datos

Este proyecto está diseñado para operar bajo estrictas normas corporativas de ciberseguridad:
1. **Control de Acceso Basado en Roles (RBAC):** Reglas estrictas en Firestore ([firestore.rules](firestore.rules)) que permiten la lectura solo a usuarios autenticados, y la edición de datos únicamente a usuarios con el rol de administrador (`rol === 'admin'`).
2. **Prevención de Fuga de Datos (DLP):** Bloqueo total de la selección de texto, clic derecho y copiado/pegado. Además, el diseño `@media print` deshabilita la exportación a PDF del navegador (renderizando hojas en blanco) para evitar la fuga de información sensible.
3. **Protección de API con Firebase App Check:** Integración con **Google reCAPTCHA v3** para validar que las peticiones provengan exclusivamente del dominio autorizado, bloqueando peticiones maliciosas externas realizadas a través de scripts o Postman.
4. **Bitácora de Auditoría (Audit Logs):** Cada evento de inicio de sesión (`LOGIN`), cierre (`LOGOUT`) o carga de archivos de Excel (`CARGA_DATOS`) se registra en la colección `audit_logs` con la estampa de tiempo del servidor para su posterior auditoría (visible únicamente para administradores).

Para una guía técnica detallada sobre la configuración de las credenciales de seguridad y App Check, consulta el archivo [SECURITY.md](SECURITY.md).

