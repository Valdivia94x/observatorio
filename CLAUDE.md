# Observatorio de la Laguna

Monorepo con dos subproyectos principales:

- `observatorio-svelte/`: Frontend público (SvelteKit + TailwindCSS + Chart.js)
- `observatorio-studio/`: Sanity Studio (CMS) con parsers de Excel por indicador

## Regla: cambios acotados por indicador/gráfica

Cuando el usuario pida un ajuste visual o fix sobre las gráficas de un indicador específico, el cambio debe quedar **acotado solo a las gráficas de ese indicador**, sin alterar el comportamiento de otros indicadores ni el render global.

- En `UniversalChart.svelte` (renderer compartido), scope los cambios por **prefijo de título** de la gráfica (ej. listas como `NARROW_TITLE_PREFIXES`, `FULL_SCALE_PERCENT_PREFIXES`, `HORIZONTAL_CATEGORY_LABELS`, `PRESERVE_ORDER_TITLE_PREFIXES`). NO cambies defaults globales para resolver un caso puntual.
- En los parsers (`observatorio-studio/components/IndicadorImporter/parsers/`), el cambio ya está naturalmente acotado al indicador.
- Excepción: si es un **bug real del renderer** que afecta a varias gráficas por igual (no una preferencia visual), corrígelo de forma global pero **avísale al usuario** qué otras gráficas se ven afectadas antes/al aplicarlo.

## Dev Time Tracker - Plane

- **Workspace:** `neurya`
- **Proyecto Plane:** CCI (Aplicaciones web)
- **Project ID:** `06a34d28-b7c8-4fa4-9f38-63f7b7aed046`
- **Member ID (Ale Valdivia):** `b019f1b7-b3e4-46df-8081-fa9dcfbe69be`
