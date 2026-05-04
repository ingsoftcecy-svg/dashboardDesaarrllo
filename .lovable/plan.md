# Dashboard TPM ZEUS - Elaboración

A single-page dashboard (Spanish UI, Mexican brewing context) digitalizing the TPM Visual Management board for the Brewing department. Desktop-first, full-height layout, card-based with royal blue + gold accents.

## Routes
Single route: `src/routes/index.tsx` (replaces placeholder).

## Top Navigation Bar (royal blue `bg-blue-900`)
- Left: Logo mark + "ZEUS · Dashboard de Elaboración" (white text, gold accent on "ZEUS").
- Center: Large pill Tabs — **COCIMIENTOS** / **BLOQUE FRÍO**. Active tab uses gold underline/background.
- Right:
  - Live clock (HH:MM:SS, updates every 1s) + date in Spanish (`es-MX`).
  - Shift selector (Select): Mañana / Tarde / Noche.
  - User chip with avatar + name ("J. Hernández — Supervisor").

## Main Layout (inside active tab)
Full-height grid, `p-4 gap-4`, `bg-slate-50`.

### A. Team Header (full width card)
- Team name: "Guardianes Cerveceros" (Cocimientos) / "Sensory Avengers" (Bloque Frío).
- Subtitle: línea, turno actual, fecha.
- Right side: circular gauge (SVG) "Nivel de Autonomía" — value 3.20 / 5.00, gold ring, level label ("Nivel 3 — Mejora Autónoma").
- Mini KPIs row: Asistencia, OEE turno, Cumplimiento IPs, Incidentes 0.

### B. Three-column grid (`grid-cols-12`: 3 / 6 / 3)

**Card 1 — Matriz Multi-Skill & Co-Champions (left, col-span-3)**
- Header with icon + count of operadores.
- Scrollable list, one row per operador (~8 operators with Mexican names: María Pérez, Luis Ramírez, etc.).
- Each row: avatar circle (initials), name, puesto.
- Three thin stacked progress bars labeled B / I / A:
  - Básico (Licencia de manejo) — green
  - Intermedio — yellow
  - Avanzado — blue
- Co-Champion badges (small pills with Lucide icons):
  - Seguridad (red, ShieldAlert)
  - Calidad (sky, BadgeCheck)
  - Ambiental (green, Leaf)
  - Mantenimiento (orange, Wrench)
- Hover: row background lifts to `bg-blue-50`.

**Card 2 — Seguimiento de IPs / Indicadores de Proceso (center, col-span-6)**
- Header with filter chips (Todos / Productividad / Calidad) and search.
- Dense Shadcn-style Table, columns:
  1. Categoría (badge: Productividad blue / Calidad gold).
  2. IP Asignado (metric name + target value, e.g., "Merma de molienda ≤ 1.2%").
  3. Equipos (chips, e.g., Filtro Prensa, Molinos, Tanque de Propagación, Whirlpool, Cocedor).
  4. Sistemas / Pre-requisitos (mini badges: SAP, MES, ACADIA, WVD, MANGYVER).
  5. Valor turno (numeric + tiny sparkline via Recharts).
  6. Estado (Lucide CheckCircle2 verde / AlertTriangle amarillo / XCircle rojo + tooltip).
- Footer: compact Recharts BarChart "Cumplimiento IPs por hora del turno" (8 bars).
- Cocimientos IPs include: Merma de molienda, °Plato del mosto, Tiempo de adición de lúpulo, Temp. de maceración, Rendimiento de cocción.
- Bloque Frío IPs include: pH del mosto frío, Oxígeno disuelto, Temperatura de fermentación, Conteo de levadura, Presión de tanque.

**Card 3 — Brewing Excellence (right, col-span-3)**
- Title: "Los reconocimientos más chingones" with gold Trophy icon.
- Podium (3 columns, center taller): 1° gold Crown, 2° silver Medal, 3° bronze Award.
  - Avatar, nombre, % excelencia operacional (e.g., 98.5%, 96.2%, 94.8%).
- Below: "Logros de la semana" list — rachas, IPs perfectos, kaizens entregados.
- Bottom: Mini Recharts RadialBar "Excelencia del equipo" (92%).

## Tab switching behavior
- State driven (`useState<'cocimientos'|'bloqueFrio'>`).
- Each tab swaps team name, IP rows, equipment list, and podium data. Layout identical.

## Mock data
All in Spanish, realistic for cervecería mexicana. Names, equipos, sistemas, and metric ranges defined in a `src/data/zeus.ts` module so both tabs share structure.

## Components / files
```
src/routes/index.tsx                  -- page composition
src/components/zeus/TopNav.tsx        -- nav, clock, shift, tabs
src/components/zeus/TeamHeader.tsx    -- team + autonomy gauge
src/components/zeus/SkillMatrixCard.tsx
src/components/zeus/IPsTrackingCard.tsx
src/components/zeus/ExcellenceCard.tsx
src/components/zeus/AutonomyGauge.tsx -- SVG circular gauge
src/components/zeus/SystemBadge.tsx   -- SAP / MES / ACADIA / WVD / MANGYVER
src/components/zeus/StatusIcon.tsx
src/data/zeus.ts                      -- mock data for both tabs
```
Reuses existing shadcn primitives: `tabs`, `card`, `table`, `badge`, `select`, `progress`, `tooltip`, `avatar`, `input`, `separator`.

## Tech notes
- Lucide icons: Trophy, Crown, Medal, Award, ShieldAlert, BadgeCheck, Leaf, Wrench, CheckCircle2, AlertTriangle, XCircle, Clock, User, Beer, Factory.
- Recharts: BarChart (compliance per hour), tiny Line sparklines per row, RadialBarChart (team excellence).
- Clock via `useEffect` + `setInterval`, formatted with `Intl.DateTimeFormat('es-MX')`.
- Tailwind only; rounded-xl, shadow-md, hover:shadow-lg, transition-all.
- Desktop-first; below `lg` the 3-column grid stacks.
