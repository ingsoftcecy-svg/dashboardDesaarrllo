# Dashboard de Autonomía TPM, Cursos y Guías Técnicas

Este proyecto es un tablero operacional interactivo y de alta seguridad diseñado para visualizar y gestionar el avance de la autonomía de los operarios y equipos de producción en los departamentos de **Cocimientos (Block Warm)**, **Bloque Frío (Block Cold)** y **Mantenimiento**. Permite el seguimiento en tiempo real de la **Matriz SKAP**, el histórico de desempeño de los equipos, el avance en **Capacitación por Cursos** y la **Habilitación Técnica (Guías L6, L7 y L8)**.

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

## 🎯 Modos de Visualización (Métricas Globales)

El dashboard cuenta con un selector global en la cabecera que conmuta toda la interfaz entre 3 modos de análisis:

1. **Promedio de Habilidades (Autonomía):**
   * Visualiza el nivel de autonomía (Escala 1 a 4) de cada operador y equipo.
   * Muestra las tarjetas de **Promedio por Factor** (Dinámica, Liderazgo, SKAP, Avanzado, ATO, QUAS, Multihabilidad).
   * Despliega la **Matriz SKAP interactiva** completa.
   * Genera una **Radiografía de Equipo (Diagnóstico Colectivo)** con gráficos apilados por nivel (Básico, Intermedio, Avanzado) e identifica automáticamente a los **Operadores Foco** (top 2 con mayores áreas de oportunidad).

2. **Cursos (Capacitación):**
   * Visualiza el porcentaje de cumplimiento y horas aprobadas de capacitación.
   * Muestra la tarjeta de detalle de cursos por equipo e integrante.
   * Permite inspeccionar los cursos individuales aprobados y pendientes por operador.

3. **Guías Técnicas (Habilitación):**
   * Seguimiento de habilitación en niveles **L6 (Básico)**, **L7 (Autónomo)** y **L8 (Técnico)**.
   * Permite la edición en lote de las guías evaluadas por operador.
   * Muestra los promedios de habilitación por nivel y por equipo.

---

## 🧭 Estructura de Rutas y Funcionalidades

El enrutamiento del sistema cuenta con las siguientes páginas:

### 1. Vista General (Ruta: `/`)
Pantalla de inicio del dashboard. Permite visualizar:
* **Cabecera de Equipos:** Líderes de equipo y métrica destacada de la sección seleccionada.
* **Sección de Excelencia:** Podio de excelencia y últimas certificaciones o logros adaptados al modo activo.
* **Ranking de Equipos:** Tabla de ordenamiento con alturas adaptativas según el modo seleccionado.
* **Autonomy Card / Details Card:** Gráfica de tendencia o resumen según la métrica activa.
* **Promedio por Factor:** Desglose del promedio obtenido en cada uno de los factores evaluados.
* **Matriz SKAP Completa:** Tablero interactivo (Physical Board) que visualiza las habilidades de cada operario. *Nota: La edición directa está restringida a usuarios autenticados con rol de administrador.*

### 2. Análisis Comparativo (Ruta: `/analisis-comparativo`)
Pantalla pública para el análisis histórico y comparativo de datos:
* **Comparador de Excelencia:** Mide el porcentaje de excelencia global entre dos períodos (semanas o meses).
* **Tendencias Históricas:** Gráficos de evolución por departamento (Cocimientos, Bloque Frío y Mantenimiento).
* **Madurez por Niveles:** Análisis de la cantidad y porcentaje de operarios situados en cada uno de los niveles de madurez (Nivel 1 al 4).
* **Evolución por Categoría:** Gráfico interactivo que muestra el promedio de las 8 categorías de habilidades a lo largo del tiempo.

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
* **Carga de Cursos (`Cursos.xlsx`):** Actualiza el catálogo y avance de capacitación.
* **Carga de Guías Técnicas (`Guias_Tecnicas.xlsx`):** Importa la habilitación de niveles L6, L7 y L8.
* **Ejecución de Scripts de Migración:** Herramientas para consolidar históricos semanales a registros mensuales en Firestore.
* **Consola de Logs:** Terminal en tiempo real que muestra el paso a paso del procesamiento del archivo y control de errores de indexación.

---

## 💬 Modales de Historial e Interconectividad

Dentro del dashboard existen flujos interactivos adaptativos según la métrica activa:
* **Historial de Equipo:**
  * En modo **Promedio de Habilidades**: Muestra el gráfico histórico mensual y una **Radiografía de Equipo** inteligente que calcula automáticamente las fortalezas y debilidades del equipo por pilar. Además, lista a los **Operadores Foco** con sus avatares fotográficos interactivos.
  * En modo **Cursos**: Muestra la lista de integrantes con su progreso de capacitación y acceso clickeable a sus cursos individuales.
  * En modo **Guías Técnicas**: Muestra tarjetas KPI con promedios L6/L7/L8 del equipo y tabla de habilitación individual.
* **Ficha de Operario:** 
  * En modo **Promedio de Habilidades**: Muestra el progreso individual y la polivalencia histórica por puesto.
  * En modo **Cursos**: Despliega el listado de cursos aprobados y pendientes (`OperatorCoursesDialog`).
  * En modo **Guías Técnicas**: Permite visualizar y editar la habilitación en los niveles L6, L7 y L8 (`OperatorHistoryDialog` / `GuiasEditorDialog`).

---

## ⚡ Automatización e Ingesta de Datos (Scripts)

El proyecto cuenta con scripts locales para optimizar el rendimiento y el desarrollo:

### 1. Pre-procesamiento de Archivos (`scripts/parseExcel.mjs`)
Para evitar la sobrecarga de lectura en el navegador o fallas por falta de conexión, este script se ejecuta automáticamente al iniciar el entorno de desarrollo o durante la compilación.
* Toma los archivos `.xlsx` estáticos de prueba de la carpeta `public/` (como `DATOS.xlsx`, `EABF.xlsx`, `EAC.xlsx`, `BPRE.xlsx`, `Cursos.xlsx`, `26_Guías-Técnicas...xlsx`).
* Los parsea en archivos `.json` estructurados y optimizados (`datos.json`, `cursos.json`, `cursos_resumen.json`, `guias_tecnicas.json`, etc.) para servir como fallback local instantáneo.

### 2. Pre-renderizado SSR Post-build (`scripts/postbuild.mjs`)
Dado que se utiliza **TanStack Start**, al finalizar la compilación (`vite build`), este script de post-procesamiento:
* Levanta el servidor SSR de forma interna en Node.js.
* Realiza una petición simulada a la ruta raíz `/`.
* Captura el HTML generado y escribe el archivo `dist/client/index.html` estático, garantizando un tiempo de carga (FCP) extremadamente rápido y compatibilidad con hosting estático.

---

## 💻 Desarrollo y Despliegue

### Requisitos Previos
* **Node.js** (versión 18 o superior recomendada)
* **npm** como gestor de paquetes

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
4. **Bitácora de Auditoría (Audit Logs):** Cada evento de inicio de sesión (`LOGIN`), cierre (`LOGOUT`), modificación de operadores (`GESTION_OPERADORES`), actualización de cursos (`CARGA_CURSOS` / `EDITAR_CURSOS_OPERADOR`) o carga de archivos de Excel (`CARGA_DATOS`) se registra en la colección `audit_logs` con la estampa de tiempo del servidor para su posterior auditoría.

Para una guía técnica detallada sobre la configuración de las credenciales de seguridad y App Check, consulta el archivo [SECURITY.md](SECURITY.md).
