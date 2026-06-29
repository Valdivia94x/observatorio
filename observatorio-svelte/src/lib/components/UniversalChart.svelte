<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { unidadMedidaLabels, type UnidadMedidaKey } from '$lib/sanity';

	// Dynamic import for Chart.js (client-side only)
	let Chart: typeof import('chart.js').Chart;
	let chartModulesLoaded = $state(false);

	async function loadChartJS() {
		if (!browser) return;

		const [chartjs, { default: ChartDataLabels }] = await Promise.all([
			import('chart.js'),
			import('chartjs-plugin-datalabels')
		]);

		Chart = chartjs.Chart;

		// Register ALL Chart.js components (controllers, elements, scales, plugins)
		chartjs.Chart.register(
			// Controllers (required for each chart type)
			chartjs.BarController,
			chartjs.LineController,
			chartjs.DoughnutController,
			chartjs.RadarController,
			chartjs.PieController,
			// Elements
			chartjs.BarElement,
			chartjs.PointElement,
			chartjs.LineElement,
			chartjs.ArcElement,
			// Scales
			chartjs.CategoryScale,
			chartjs.LinearScale,
			chartjs.RadialLinearScale,
			// Plugins
			chartjs.Title,
			chartjs.SubTitle,
			chartjs.Tooltip,
			chartjs.Legend,
			chartjs.Filler,
			ChartDataLabels
		);

		chartModulesLoaded = true;
	}

	// Types
	interface TableRow {
		cells: string[];
	}

	interface TableData {
		rows: TableRow[];
	}

	interface SerieConfig {
		_key?: string;
		nombre: string;
		tipoSerie: 'line' | 'bar';
		color?: string;
		ejeSecundario?: boolean;
	}

	interface BloqueGrafica {
		titulo?: string;
		tipo: 'bar' | 'stackedBar' | 'line' | 'doughnut' | 'radar' | 'horizontalBar' | 'pyramid' | 'pie' | 'table';
		tablaDatos: TableData;
		series?: SerieConfig[];
		colores?: string[];
		unidadMedida?: UnidadMedidaKey;
		unidadMedidaPersonalizada?: string;
		ocultarValores?: boolean;
	}

	interface Props {
		bloqueGrafica: BloqueGrafica;
		fillHeight?: boolean;
	}

	let { bloqueGrafica, fillHeight = false }: Props = $props();

	// Table mode: render HTML table instead of Chart.js
	const isTable = $derived(bloqueGrafica.tipo === 'table');

	let canvas: HTMLCanvasElement;
	let chartInstance: import('chart.js').Chart | null = null;
	let error = $state<string | null>(null);

	// Mobile detection
	const MOBILE_BREAKPOINT = 768;
	let isMobile = $state(browser ? window.innerWidth < MOBILE_BREAKPOINT : false);

	function handleResize() {
		const wasMobile = isMobile;
		isMobile = window.innerWidth < MOBILE_BREAKPOINT;
		if (wasMobile !== isMobile && chartInstance && chartCreated) {
			updateChart();
		}
	}

	// Beautiful color palette
	const colorPalette = [
		{ bg: 'rgba(208, 0, 95, 0.7)', border: 'rgb(208, 0, 95)' },        // #d0005f - Magenta/Pink
		{ bg: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' },    // Blue
		{ bg: 'rgba(34, 197, 94, 0.7)', border: 'rgb(34, 197, 94)' },      // Green
		{ bg: 'rgba(168, 85, 247, 0.7)', border: 'rgb(168, 85, 247)' },    // Purple
		{ bg: 'rgba(251, 146, 60, 0.7)', border: 'rgb(251, 146, 60)' },    // Orange
		{ bg: 'rgba(234, 179, 8, 0.7)', border: 'rgb(234, 179, 8)' },      // Yellow
		{ bg: 'rgba(20, 184, 166, 0.7)', border: 'rgb(20, 184, 166)' },    // Teal
		{ bg: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' },      // Red
		{ bg: 'rgba(99, 102, 241, 0.7)', border: 'rgb(99, 102, 241)' },    // Indigo
		{ bg: 'rgba(107, 114, 128, 0.7)', border: 'rgb(107, 114, 128)' },  // Gray
	];

	// Títulos cuyo eje de valores (porcentaje) debe topar en 100% aunque no sean apiladas
	const FULL_SCALE_PERCENT_PREFIXES = ['Jefatura del Hogar por Género', 'Carencias Sociales de la Población'];

	// Títulos cuyas etiquetas de categoría usan mayor ancho de envoltura (más espacio, barras más cortas)
	const WIDE_LABEL_PREFIXES = ['Carencias Sociales de la Población'];

	// Override del máximo del eje de valores por título (tiene prioridad sobre el tope de 100%)
	const VALUE_AXIS_MAX: {prefix: string; max: number}[] = [
		{prefix: 'Carencias Sociales de la Población', max: 80},
	];

	// Títulos con barras más gruesas (mayor ocupación de la categoría), eje categórico con todas
	// las etiquetas visibles (autoSkip false) y mayor altura del contenedor.
	const THICK_BARS_PREFIXES = ['Carencias Sociales de la Población', 'Salario por Actividad Económica', 'Principales Causas de Mortalidad'];

	// Títulos donde una celda vacía/ND debe representarse como hueco (null) en vez de 0,
	// para que la línea/barra no caiga a cero donde no hay dato.
	const NULL_GAP_TITLE_PREFIXES = ['Extracción de Agua', 'Pozos de Agua Registrados', 'Tratamiento de Aguas Residuales'];

	// Etiqueta del eje categórico en gráficas horizontales, por título (default: 'Período')
	const HORIZONTAL_CATEGORY_LABELS: {prefix: string; label: string}[] = [
		{prefix: 'Carencias Sociales de la Población', label: 'Indicador'},
		{prefix: 'Organizaciones de la Sociedad Civil', label: 'Organización'},
	];

	// Etiqueta del eje categórico X en gráficas de barras verticales, por título (default: 'Período')
	const VERTICAL_CATEGORY_LABELS: {prefix: string; label: string}[] = [
		{prefix: 'Tecnologías de la Información en las Viviendas', label: 'Tecnología'},
		{prefix: 'Medio de Transporte de', label: 'Medio'},
	];

	// Etiqueta del eje de VALORES por título (Y en verticales, X en horizontales).
	// Sobre-escribe la etiqueta derivada de la unidad de medida.
	const VALUE_AXIS_LABELS: {prefix: string; label: string}[] = [
		{prefix: 'Accidentes de Tránsito Registrados', label: 'Accidentes'},
		{prefix: 'Créditos para la Vivienda por Institución', label: 'Créditos'},
		{prefix: 'Condiciones Sociales de la Población', label: 'Porcentaje de la población'},
		{prefix: 'Tecnologías de la Información en las Viviendas', label: 'Porcentaje de la población'},
		{prefix: 'Vehículos de Motor Registrados', label: 'Vehículos'},
		{prefix: 'Población Ocupada por Género', label: 'Ocupados'},
		{prefix: 'Patrones Afiliados en el IMSS', label: 'Patrones'},
		{prefix: 'Casos de Depresión Registrados', label: 'Personas'},
		{prefix: 'Suicidios Registrados', label: 'Personas'},
	];

	// Títulos cuyas etiquetas de eje (categorías/ticks) se muestran más grandes
	const LARGE_TICK_PREFIXES = ['Medio de Transporte de'];

	// Helper to convert hex color to rgba
	function hexToRgba(hex: string, alpha: number): string {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		if (result) {
			const r = parseInt(result[1], 16);
			const g = parseInt(result[2], 16);
			const b = parseInt(result[3], 16);
			return `rgba(${r}, ${g}, ${b}, ${alpha})`;
		}
		return hex;
	}

	// Wrap a long label into multiple lines of max `maxWidth` chars
	function wrapLabel(label: string, maxWidth: number): string[] {
		if (label.length <= maxWidth) return [label];
		const words = label.split(/\s+/);
		const lines: string[] = [];
		let current = '';
		for (const word of words) {
			if (current && (current + ' ' + word).length > maxWidth) {
				lines.push(current);
				current = word;
			} else {
				current = current ? current + ' ' + word : word;
			}
		}
		if (current) lines.push(current);
		return lines;
	}

	// Determine if labels are "short" (should rotate) or "long" (should wrap)
	// Many labels (>15) always rotate regardless of length
	function hasLongLabels(labels: string[]): boolean {
		if (labels.length > 15) return false;
		const avgLength = labels.reduce((sum, l) => sum + l.length, 0) / (labels.length || 1);
		return avgLength > 10;
	}

	// Check if this is a combo chart
	function isComboChart(): boolean {
		const { series, tipo } = bloqueGrafica;
		return (series?.length ?? 0) > 0 && (tipo === 'bar' || tipo === 'line');
	}

	// Check if any series uses the secondary axis
	function hasSecondaryAxis(): boolean {
		return bloqueGrafica.series?.some(s => s.ejeSecundario === true) ?? false;
	}

	// Devuelve el subtítulo de unidad (escala/personalizada) o null cuando es redundante
	function getUnitSubtitle(): string | null {
		const u = bloqueGrafica.unidadMedida;
		if (u === 'otro') {
			const custom = bloqueGrafica.unidadMedidaPersonalizada?.trim();
			return custom ? custom : null;
		}
		switch (u) {
			case 'miles-pesos': return 'Miles de pesos';
			case 'millones-pesos': return 'Millones de pesos';
			case 'miles-dolares': return 'Miles de dólares';
			case 'millones-dolares': return 'Millones de dólares';
			case 'miles-habitantes': return 'Miles de habitantes';
			case 'tasa-100mil': return 'Tasa por 100,000 habitantes';
			case 'hectareas': return 'Hectáreas';
			case 'kilometros': return 'Kilómetros';
			case 'toneladas': return 'Toneladas';
			case 'litros': return 'Litros';
			default: return null;
		}
	}

	// Formatea una celda de tabla: si es numérica, aplica el símbolo de la unidad
	function formatTableCell(cell: string, rowLabel: string, columnHeader?: string): string {
		if (cell === null || cell === undefined || cell === '') return cell;
		const num = Number(cell);
		if (isNaN(num)) return cell;
		const labelHasPercent = typeof rowLabel === 'string' && rowLabel.includes('%');
		// El encabezado de columna puede forzar la unidad por columna (ej. "Financiamiento (pesos)" → $),
		// útil en tablas con columnas de distintas unidades.
		const headerLow = (columnHeader || '').toLowerCase();
		const colUnidad = labelHasPercent || headerLow.includes('%')
			? 'porcentaje'
			: /(d[oó]lar|usd)/.test(headerLow)
				? 'dolares'
				: (headerLow.includes('peso') || columnHeader?.includes('$'))
					? 'pesos'
					: undefined;
		const unidad = colUnidad ?? (labelHasPercent ? 'porcentaje' : bloqueGrafica.unidadMedida);
		return formatValueWithUnit(num, unidad);
	}

	// Formatea un valor numérico con el símbolo/etiqueta de su unidad
	function formatValueWithUnit(value: number, unidad?: string): string {
		if (value === null || value === undefined || isNaN(value)) return '';
		const formatted = value.toLocaleString('es-MX');
		switch (unidad) {
			case 'pesos':
			case 'miles-pesos':
			case 'millones-pesos':
				return `$${formatted}`;
			case 'dolares':
			case 'miles-dolares':
			case 'millones-dolares':
				return `$${formatted} USD`;
			case 'porcentaje':
				return `${formatted}%`;
			case 'habitantes':
			case 'miles-habitantes':
				return `${formatted} hab.`;
			case 'tasa-100mil':
				return `${formatted} por 100k hab.`;
			case 'hectareas':
				return `${formatted} ha`;
			case 'kilometros':
				return `${formatted} km`;
			case 'toneladas':
				return `${formatted} t`;
			case 'litros':
				return `${formatted} L`;
			case 'unidades':
				return formatted;
			case 'indice':
			default:
				return formatted;
		}
	}

	// Get the color of the first series assigned to a given axis
	function getAxisColor(secondary: boolean): string | undefined {
		const { series } = bloqueGrafica;
		if (!series) return undefined;
		const match = series.find(s => (s.ejeSecundario === true) === secondary);
		return match?.color;
	}

	function transformData() {
		const rows = bloqueGrafica.tablaDatos?.rows || [];
		const { series, colores, tipo } = bloqueGrafica;

		if (rows.length < 2) {
			return { labels: [], datasets: [] };
		}

		const headerRow = rows[0].cells;
		const dataRow = rows[1].cells;

		// Helper to check if a string is purely numeric (not "1° Trim", "1 Trim", etc.)
		function isPureNumber(str: string): boolean {
			if (!str || str.trim() === '') return false;
			// Remove commas (thousand separators) and check if result is a valid number
			const cleaned = str.replace(/,/g, '').trim();
			// Must be a valid number AND the string shouldn't have non-numeric characters after cleaning
			return !isNaN(Number(cleaned)) && /^-?\d*\.?\d+$/.test(cleaned);
		}

		// Detect if first cell of header is empty OR if first cell of data row is a label (not a number)
		const firstHeaderEmpty = headerRow[0] === '' || headerRow[0] === null || headerRow[0] === undefined;
		const firstDataIsLabel = !isPureNumber(dataRow[0]);

		let labels: string[];
		let dataStartIndex: number;

		if (firstHeaderEmpty) {
			labels = headerRow.slice(1);
			dataStartIndex = 1;
		} else if (firstDataIsLabel) {
			// La primera celda del header es un título de columna (ej: "Indicador"), excluirla
			labels = headerRow.slice(1);
			dataStartIndex = 1;
		} else {
			labels = headerRow;
			dataStartIndex = 0;
		}

		// Wrap long labels into multiline arrays for Chart.js.
		// Para títulos en WIDE_LABEL_PREFIXES se usa un ancho de envoltura mayor: las etiquetas
		// ocupan más espacio horizontal y, al crecer el eje, las barras se achican.
		const wrapWidth = WIDE_LABEL_PREFIXES.some(p => bloqueGrafica.titulo?.startsWith(p))
			? (isMobile ? 20 : 34)
			: (isMobile ? 12 : 16);
		// Una etiqueta con saltos de línea explícitos ("\n") se divide en líneas (ej. "2024\nTipo de elección").
		// Cada parte se envuelve si sigue siendo larga. El resto usa el wrap por ancho habitual.
		const hasExplicitBreaks = labels.some(l => typeof l === 'string' && l.includes('\n'));
		const processedLabels: (string | string[])[] = hasExplicitBreaks
			? labels.map(l => l.split('\n').flatMap(part => wrapLabel(part, wrapWidth)))
			: hasLongLabels(labels)
				? labels.map(l => wrapLabel(l, wrapWidth))
				: labels;

		const isPieOrDoughnut = tipo === 'doughnut' || tipo === 'pie';
		const comboChart = isComboChart();

		// Row 1+: Datasets
		const datasets = rows.slice(1).map((row, index) => {
			// Si el header tiene la primera celda vacía o la primera celda de datos es texto,
			// la primera columna son etiquetas de serie (puede ser un año numérico como "2015").
			let seriesLabel = (firstHeaderEmpty || firstDataIsLabel) ? row.cells[0] : `Serie ${index + 1}`;
			// Si el label es muy largo (típico de importaciones Excel), simplificarlo
			if (seriesLabel && seriesLabel.length > 50) {
				seriesLabel = `Serie ${index + 1}`;
			}
			// Celda vacía → 0 por defecto, o null (hueco) para títulos en NULL_GAP_TITLE_PREFIXES,
			// donde un 0 sería engañoso (representa "sin dato", no un valor real de cero).
			const useNullGap = NULL_GAP_TITLE_PREFIXES.some(p => bloqueGrafica.titulo?.startsWith(p));
			const emptyValue: number | null = useNullGap ? null : 0;
			const rawData = row.cells.slice(dataStartIndex).map(cell => {
				const n = parseFloat(cell);
				return isNaN(n) ? emptyValue : n;
			});

			// Pad data at the beginning if there are fewer values than labels
			const data = rawData.length < labels.length
				? [...Array(labels.length - rawData.length).fill(emptyValue), ...rawData]
				: rawData;

			// Pie/Doughnut: colors per segment
			if (isPieOrDoughnut) {
				const segmentColors = data.map((_, i) => {
					if (colores?.[i]) return hexToRgba(colores[i], 0.7);
					return colorPalette[i % colorPalette.length].bg;
				});
				const segmentBorders = data.map((_, i) => {
					if (colores?.[i]) return colores[i];
					return colorPalette[i % colorPalette.length].border;
				});

				return {
					label: seriesLabel,
					data,
					backgroundColor: segmentColors,
					borderColor: segmentBorders,
					borderWidth: 2,
				};
			}

			// Combo chart: find series config by name
			if (comboChart && series) {
				const config = series.find(s => s.nombre?.toLowerCase() === seriesLabel.toLowerCase()) || series[index];
				const serieType = config?.tipoSerie || 'bar';
				const color = config?.color || colorPalette[index % colorPalette.length].border;
				const useSecondaryAxis = config?.ejeSecundario === true;

				return {
					type: serieType as 'line' | 'bar',
					label: seriesLabel,
					data,
					backgroundColor: serieType === 'line' ? 'transparent' : hexToRgba(color, 0.7),
					borderColor: color,
					borderWidth: 2,
					fill: false,
					tension: 0.3,
					pointRadius: serieType === 'line' ? 4 : 0,
					pointBackgroundColor: color,
					pointBorderColor: '#fff',
					pointHoverBackgroundColor: '#fff',
					pointHoverBorderColor: color,
					order: serieType === 'line' ? 0 : 1, // Lines render on top of bars
					yAxisID: useSecondaryAxis ? 'y1' : 'y',
					datalabels: serieType === 'line'
						? { display: false }
						: hasSecondaryAxis()
							? { anchor: 'end' as const, align: 'top' as const, offset: -2, font: { size: 10, weight: 600 as const } }
							: undefined,
				};
			}

			// Normal chart: use colores[] or default palette
			const color = colores?.[index]
				? { bg: hexToRgba(colores[index], 0.95), border: colores[index] }
				: colorPalette[index % colorPalette.length];

			// Pirámide: la primera serie (ej. Hombre) se dibuja a la izquierda con valores negativos
			const finalData = tipo === 'pyramid' && index === 0 ? data.map(v => -Math.abs(v)) : data;

			// Barras más gruesas para títulos en THICK_BARS_PREFIXES
			const thickBars = THICK_BARS_PREFIXES.some(p => bloqueGrafica.titulo?.startsWith(p));

			return {
				label: seriesLabel,
				data: finalData,
				backgroundColor: tipo === 'line' ? color.border : color.bg,
				borderColor: color.border,
				borderWidth: 2,
				tension: 0.3,
				fill: tipo === 'radar',
				pointBackgroundColor: color.border,
				pointBorderColor: '#fff',
				pointHoverBackgroundColor: '#fff',
				pointHoverBorderColor: color.border,
				...(thickBars ? { categoryPercentage: 0.98, barPercentage: 0.98 } : {}),
			};
		});

		return { labels: processedLabels, datasets };
	}

	function getChartType(): 'bar' | 'line' | 'doughnut' | 'radar' | 'pie' {
		if (bloqueGrafica.tipo === 'horizontalBar' || bloqueGrafica.tipo === 'stackedBar' || bloqueGrafica.tipo === 'pyramid') {
			return 'bar';
		}
		return bloqueGrafica.tipo;
	}

	function shouldShowLegend(): boolean {
		const rows = bloqueGrafica.tablaDatos?.rows || [];
		// Solo mostrar leyenda si hay más de una serie de datos
		if (rows.length <= 2) return false;
		// O si hay múltiples series con nombres significativos
		return true;
	}

	function getChartOptions() {
		const isDark = themeStore.isDark;
		const textColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';
		const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

		// Abrevia números grandes solo a partir del millón: 12345678 → "$12.35M"; valores menores se muestran completos con coma de miles
		function formatCurrencyShort(value: number | string): string {
			const n = Number(value);
			if (!isFinite(n)) return `$${value}`;
			const abs = Math.abs(n);
			const sign = n < 0 ? '-' : '';
			if (abs >= 1e12) return `${sign}$${(abs / 1e12).toLocaleString('es-MX', {maximumFractionDigits: 2})}B`;
			if (abs >= 1e9) return `${sign}$${(abs / 1e9).toLocaleString('es-MX', {maximumFractionDigits: 2})}MM`;
			if (abs >= 1e6) return `${sign}$${(abs / 1e6).toLocaleString('es-MX', {maximumFractionDigits: 2})}M`;
			return `${sign}$${abs.toLocaleString('es-MX')}`;
		}

		// Detecta si la unidadMedida del bloque es monetaria
		function isCurrencyUnit(): boolean {
			const u = bloqueGrafica.unidadMedida;
			return u === 'pesos' || u === 'miles-pesos' || u === 'millones-pesos' ||
				u === 'dolares' || u === 'miles-dolares' || u === 'millones-dolares';
		}

		// Oculta la etiqueta del 0 en el eje de valores (mantiene el resto de ticks).
		// Si hay callback original, lo usa para los valores != 0; si no, formatea con toLocaleString.
		function hideZeroLabel(
			originalCallback?: (value: number | string) => string,
		): (value: number | string) => string {
			return (value: number | string) => {
				const num = typeof value === 'number' ? value : Number(value);
				if (num === 0) return '';
				if (originalCallback) return originalCallback(value);
				return typeof value === 'number' ? value.toLocaleString('es-MX') : String(value);
			};
		}

		// Extract symbol (% or $) from axis title and move to ticks.
		// fallbackToChartUnit: si true, también usa la unidadMedida del chart para inferir moneda.
		// Para el eje secundario lo pasamos como false: solo formatea moneda si el LABEL del eje
		// indica $ o pesos/dólares (la unidad global puede ser pesos pero la serie del eje 2 no).
		function extractAxisSymbol(
			label: string,
			fallbackToChartUnit: boolean = true,
		): { cleanLabel: string; tickCallback?: (value: number | string) => string } {
			if (label.includes('%') || label.toLowerCase().includes('porcentaje')) {
				const cleanLabel = label.replace(/\s*\(%?\)\s*|\s*%\s*/g, '').replace(/porcentaje/i, 'Porcentaje').trim();
				return {
					cleanLabel,
					tickCallback: (value: number | string) => `${value}%`,
				};
			}
			const labelHintsCurrency =
				label.includes('$') ||
				label.toLowerCase().includes('pesos') ||
				label.toLowerCase().includes('dólares') ||
				label.toLowerCase().includes('dolares');
			if (labelHintsCurrency || (fallbackToChartUnit && isCurrencyUnit())) {
				const cleanLabel = label.replace(/\s*\(\$?\)\s*|\s*\$\s*/g, '').trim();
				return {
					cleanLabel,
					tickCallback: (value: number | string) => formatCurrencyShort(value),
				};
			}
			return { cleanLabel: label };
		}

		// Check if X-axis labels are long (for rotation vs wrap decision)
		const rawLabels = bloqueGrafica.tablaDatos?.rows?.[0]?.cells?.slice(1) || [];
		const labelsAreLong = hasLongLabels(rawLabels);
		const shouldRotate = !labelsAreLong && rawLabels.length > 10;

		const baseOptions: Record<string, unknown> = {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: shouldShowLegend(),
					position: isMobile ? 'bottom' as const : 'top' as const,
					labels: {
						color: textColor,
						font: {
							size: isMobile ? 9 : 10,
							weight: 500
						},
						padding: isMobile ? 4 : 6,
						usePointStyle: true,
						boxWidth: isMobile ? 8 : 40,
					}
				},
				title: {
					display: !!bloqueGrafica.titulo,
					text: bloqueGrafica.titulo || '',
					color: textColor,
					font: {
						size: isMobile ? 16 : 24,
						weight: 'bold'
					},
					padding: {
						bottom: getUnitSubtitle() ? 2 : (isMobile ? 12 : 20)
					}
				},
				subtitle: {
					display: !!getUnitSubtitle(),
					text: getUnitSubtitle() || '',
					color: isDark ? 'rgba(203, 213, 225, 0.85)' : 'rgba(71, 85, 105, 0.85)',
					font: {
						size: isMobile ? 11 : 13,
						weight: 'normal',
						style: 'italic'
					},
					padding: {
						bottom: isMobile ? 12 : 20
					}
				},
				tooltip: {
					backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
					titleColor: isDark ? '#fff' : '#1e293b',
					bodyColor: isDark ? '#cbd5e1' : '#475569',
					borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
					borderWidth: 1,
					cornerRadius: 8,
					padding: isMobile ? 8 : 12,
					callbacks: {
						label: (context: { dataset: { label?: string; yAxisID?: string }; parsed: any }) => {
							const label = context.dataset.label || '';
							const isHorizontal = bloqueGrafica.tipo === 'horizontalBar' || bloqueGrafica.tipo === 'pyramid';
							const isPie = bloqueGrafica.tipo === 'doughnut' || bloqueGrafica.tipo === 'pie';
							let rawValue: number;
							if (isPie) {
								rawValue = typeof context.parsed === 'number' ? context.parsed : (context.parsed?.y ?? 0);
							} else if (isHorizontal) {
								rawValue = context.parsed?.x ?? 0;
							} else {
								rawValue = context.parsed?.y ?? 0;
							}
							// Pirámide: los valores de la serie izquierda son negativos → mostrar absoluto
							if (bloqueGrafica.tipo === 'pyramid') rawValue = Math.abs(rawValue);
							// Si la serie es del eje secundario, inferir su unidad propia desde el nombre.
							// Si el nombre no sugiere moneda/porcentaje, tratarla como "unidades" para
							// que no herede la unidad global del chart (ej: pesos).
							const isSecondary = context.dataset.yAxisID === 'y1';
							const labelLower = label.toLowerCase();
							const labelHintsPercentage = label.includes('%') || labelLower.includes('porcentaje');
							const labelHintsCurrency =
								label.includes('$') ||
								labelLower.includes('pesos') ||
								labelLower.includes('dólares') ||
								labelLower.includes('dolares');
							let unidad = bloqueGrafica.unidadMedida;
							if (isSecondary) {
								if (labelHintsPercentage) unidad = 'porcentaje';
								else if (labelHintsCurrency) unidad = bloqueGrafica.unidadMedida;
								else unidad = 'unidades';
							}
							const formatted = formatValueWithUnit(rawValue, unidad);
							const axis = hasSecondaryAxis() && isSecondary ? ' (eje der.)' : '';
							return label ? `${label}: ${formatted}${axis}` : formatted;
						}
					},
				},
				datalabels: {
					// Ocultar data labels en móvil para evitar superposición
					display: bloqueGrafica.ocultarValores ? false : (isMobile ? false : (bloqueGrafica.tipo !== 'radar' && bloqueGrafica.tipo !== 'line')),
					anchor: (context: { datasetIndex: number; dataset: { type?: string } }) => {
						if (bloqueGrafica.tipo === 'doughnut' || bloqueGrafica.tipo === 'pie') return 'center';
						if (bloqueGrafica.tipo === 'stackedBar') return 'center';
						return 'end';
					},
					align: (context: { datasetIndex: number; dataset: { type?: string } }) => {
						if (bloqueGrafica.tipo === 'doughnut' || bloqueGrafica.tipo === 'pie') return 'center';
						if (bloqueGrafica.tipo === 'stackedBar') return 'center';
						if (bloqueGrafica.tipo === 'horizontalBar') return 'end';
						return 'top';
					},
					offset: (bloqueGrafica.tipo === 'doughnut' || bloqueGrafica.tipo === 'pie' || bloqueGrafica.tipo === 'stackedBar') ? 0 : -2,
					color: bloqueGrafica.tipo === 'stackedBar' ? '#fff' : (isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)'),
					font: {
						size: 10,
						weight: 600
					},
					// Valores verticales solo en esta gráfica (muchas barras juntas en Torreón)
					rotation: bloqueGrafica.titulo === 'Recursos para la Salud en Torreón' ? -90 : 0,
					// Prevención de colisiones - ocultar etiquetas que sigan chocando
					clamp: true,
					clip: false,
					formatter: (value: number | null) => {
						// null/NaN = sin dato (hueco) → sin etiqueta
						if (value === null || value === undefined || isNaN(value as number) || value === 0) return '';
						const formatted = value.toLocaleString('es-MX');
						if (bloqueGrafica.unidadMedida === 'pesos' || bloqueGrafica.unidadMedida === 'miles-pesos' || bloqueGrafica.unidadMedida === 'millones-pesos') return `$${formatted}`;
						if (bloqueGrafica.unidadMedida === 'dolares' || bloqueGrafica.unidadMedida === 'miles-dolares' || bloqueGrafica.unidadMedida === 'millones-dolares') return `$${formatted}`;
						if (bloqueGrafica.unidadMedida === 'porcentaje') return `${formatted}%`;
						return formatted;
					}
				}
			}
		};

		// Add scales for non-circular charts
		if (bloqueGrafica.tipo !== 'doughnut' && bloqueGrafica.tipo !== 'pie' && bloqueGrafica.tipo !== 'radar') {
			// Obtener etiqueta de unidad de medida
			let unidadLabel = 'Valor';
			if (bloqueGrafica.unidadMedida === 'otro') {
				unidadLabel = bloqueGrafica.unidadMedidaPersonalizada || 'Valor';
			} else if (bloqueGrafica.unidadMedida) {
				unidadLabel = unidadMedidaLabels[bloqueGrafica.unidadMedida] || 'Valor';
			}
			const isHorizontalBar = bloqueGrafica.tipo === 'horizontalBar';
			const isPyramid = bloqueGrafica.tipo === 'pyramid';
			const isHorizontalLike = isHorizontalBar || isPyramid;

			const dualAxis = hasSecondaryAxis();
			const primaryColor = dualAxis ? getAxisColor(false) : undefined;
			const secondaryColor = dualAxis ? getAxisColor(true) : undefined;
			// Use primary series name as left axis label when dual-axis
			const primarySerieLabel = dualAxis
				? bloqueGrafica.series?.find(s => !s.ejeSecundario)?.nombre
				: undefined;

			const isStacked = bloqueGrafica.tipo === 'stackedBar' || isPyramid;

			// El eje de valores (Y en vertical, X en horizontal) topa en 100% para apiladas
			// porcentuales y para títulos en FULL_SCALE_PERCENT_PREFIXES.
			const capValueAt100 = bloqueGrafica.unidadMedida === 'porcentaje' &&
				(isStacked || FULL_SCALE_PERCENT_PREFIXES.some((p) => bloqueGrafica.titulo?.startsWith(p)));
			// Override explícito del máximo por título (prioridad sobre el tope de 100%)
			const customMax = VALUE_AXIS_MAX.find((e) => bloqueGrafica.titulo?.startsWith(e.prefix))?.max;
			const valueAxisMax = customMax ?? (capValueAt100 ? 100 : undefined);

			const horizontalCatLabel = HORIZONTAL_CATEGORY_LABELS.find((e) => bloqueGrafica.titulo?.startsWith(e.prefix))?.label ?? 'Período';
			const verticalCatLabel = VERTICAL_CATEGORY_LABELS.find((e) => bloqueGrafica.titulo?.startsWith(e.prefix))?.label ?? 'Período';
			// Override de la etiqueta del eje de valores por título (Y vertical / X horizontal)
			const valueAxisLabel = VALUE_AXIS_LABELS.find((e) => bloqueGrafica.titulo?.startsWith(e.prefix))?.label;
			const valueLabel = valueAxisLabel ?? primarySerieLabel ?? unidadLabel;
			const yLabel = isHorizontalLike ? (isPyramid ? 'Grupo de edad' : horizontalCatLabel) : valueLabel;
			const yAxis = extractAxisSymbol(yLabel);
			// Texto del eje X: en horizontales es el eje de valores; en verticales es la categoría
			const xAxisText = isHorizontalLike ? (valueAxisLabel ?? unidadLabel) : verticalCatLabel;
			// Tamaño de fuente de los ticks de categoría (mayor para títulos en LARGE_TICK_PREFIXES)
			const largeTicks = LARGE_TICK_PREFIXES.some((p) => bloqueGrafica.titulo?.startsWith(p));

			const scales: Record<string, unknown> = {
				x: {
					stacked: isStacked,
					title: {
						display: !isMobile,
						text: xAxisText,
						color: textColor,
						font: {
							size: 14,
							weight: 'bold' as const
						},
						padding: {top: 15}
					},
					grid: {
						color: gridColor,
					},
					ticks: {
						color: textColor,
						font: {
							size: largeTicks ? (isMobile ? 11 : 15) : (labelsAreLong ? (isMobile ? 7 : 9) : (isMobile ? 9 : 12))
						},
						maxRotation: shouldRotate ? 90 : 0,
						minRotation: shouldRotate ? 90 : 0,
						autoSkip: isMobile,
						maxTicksLimit: isMobile ? 8 : undefined,
						// Pirámide: eje X de valores divergente → mostrar valor absoluto (sin negativos).
						// horizontalBar: eje X de valores → ocultar el 0.
						// El resto es categórico (años): se omite callback para usar el render por defecto.
						...(isPyramid
							? {callback: (v: number | string) => { const n = Math.abs(Number(v)); return n === 0 ? '' : n.toLocaleString('es-MX'); }}
							: isHorizontalBar
								? {callback: hideZeroLabel()}
								: {}),
					},
					// En horizontal el eje X es el de valores → aplicar tope/override cuando corresponde
					max: isHorizontalLike ? valueAxisMax : undefined,
				},
				y: {
					stacked: isStacked,
					position: 'left',
					// Pirámide: invertir el eje categórico para que el grupo de edad mayor quede arriba
					reverse: isPyramid,
					title: {
						display: !isMobile,
						text: yAxis.cleanLabel,
						color: primaryColor || textColor,
						font: {
							size: 14,
							weight: 'bold' as const
						}
					},
					grid: {
						color: gridColor,
					},
					ticks: {
						color: primaryColor || textColor,
						font: {
							size: isMobile ? 10 : 15
						},
						// Mostrar TODAS las etiquetas de categoría (no saltar ninguna) para títulos con barras gruesas
						...(THICK_BARS_PREFIXES.some(p => bloqueGrafica.titulo?.startsWith(p)) ? {autoSkip: false} : {}),
						// En horizontalBar/pirámide el eje Y es categórico (etiquetas) → se omite callback
						// para usar el render por defecto. En el resto, ocultar la etiqueta del 0.
						...(isHorizontalLike ? {} : {callback: hideZeroLabel(yAxis.tickCallback)}),
					},
					beginAtZero: true,
					max: !isHorizontalLike ? valueAxisMax : undefined,
				}
			};

			// Add secondary Y axis if any series uses it
			if (dualAxis) {
				// Find the name of the secondary series to use as axis label
				const secondarySerie = bloqueGrafica.series?.find(s => s.ejeSecundario);
				const secondaryLabel = secondarySerie?.nombre || 'Eje secundario';
				const y1Axis = extractAxisSymbol(secondaryLabel, false);

				// Calculate max for secondary axis (double the max value so line stays at mid-height)
				const rows = bloqueGrafica.tablaDatos?.rows || [];
				const seriesNames = bloqueGrafica.series?.filter(s => s.ejeSecundario).map(s => s.nombre.toLowerCase()) || [];
				let secondaryMax: number | undefined;
				for (const row of rows.slice(1)) {
					if (seriesNames.includes(row.cells[0]?.toLowerCase())) {
						for (const val of row.cells.slice(1)) {
							const num = parseFloat(val);
							if (!isNaN(num) && (secondaryMax === undefined || num > secondaryMax)) {
								secondaryMax = num;
							}
						}
					}
				}

				scales.y1 = {
					position: 'right',
					title: {
						display: !isMobile,
						text: y1Axis.cleanLabel,
						color: secondaryColor || textColor,
						font: {
							size: 14,
							weight: 'bold' as const
						}
					},
					grid: {
						drawOnChartArea: false,
					},
					ticks: {
						color: secondaryColor || textColor,
						font: {
							size: isMobile ? 10 : 15
						},
						callback: hideZeroLabel(y1Axis.tickCallback),
					},
					beginAtZero: true,
					max: secondaryMax !== undefined ? Math.ceil(secondaryMax * 2) : undefined,
				};
			}

			baseOptions.scales = scales;

			// Horizontal bar / pirámide configuration (barras horizontales)
			if (isHorizontalLike) {
				baseOptions.indexAxis = 'y';
			}
		}

		// Radar specific options
		if (bloqueGrafica.tipo === 'radar') {
			baseOptions.scales = {
				r: {
					grid: {
						color: gridColor,
					},
					angleLines: {
						color: gridColor,
					},
					pointLabels: {
						color: textColor,
					},
					ticks: {
						color: textColor,
						backdropColor: 'transparent',
					}
				}
			};
		}

		return baseOptions;
	}

	function createChart() {
		if (!canvas || !Chart) return;

		// Destroy existing chart
		if (chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
		}

		const { labels, datasets } = transformData();

		if (labels.length === 0 || datasets.length === 0) {
			error = 'No hay datos suficientes para mostrar la gráfica';
			return;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			error = 'No se pudo obtener el contexto del canvas';
			return;
		}

		try {
			// Plugin to add spacing between legend and chart area
			const legendSpacingPlugin = {
				id: 'legendSpacing',
				beforeInit(chart: any) {
					const originalFit = chart.legend.fit;
					chart.legend.fit = function fit() {
						originalFit.call(this);
						this.height += isMobile ? 16 : 30;
					};
				}
			};

			// Plugin: dibuja "ND" cerca del eje X en las categorías sin dato (hueco/null).
			// Acotado a títulos en NULL_GAP_TITLE_PREFIXES (ej. Extracción de Agua).
			const ndMarkerPlugin = {
				id: 'ndMarker',
				afterDatasetsDraw(chart: any) {
					if (!NULL_GAP_TITLE_PREFIXES.some(p => bloqueGrafica.titulo?.startsWith(p))) return;
					const ds = chart.data.datasets?.[0];
					const meta = chart.getDatasetMeta(0);
					if (!ds || !meta) return;
					const {ctx: c, chartArea} = chart;
					c.save();
					c.font = '600 10px sans-serif';
					c.fillStyle = themeStore.isDark ? 'rgba(203,213,225,0.85)' : 'rgba(100,116,139,0.95)';
					c.textAlign = 'center';
					c.textBaseline = 'bottom';
					ds.data.forEach((v: number | null, i: number) => {
						if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) {
							const x = meta.data[i]?.x;
							if (x == null) return;
							c.fillText('ND', x, chartArea.bottom - 6);
						}
					});
					c.restore();
				}
			};

			chartInstance = new Chart(ctx, {
				type: getChartType(),
				data: { labels, datasets },
				options: getChartOptions() as Record<string, unknown>,
				plugins: [legendSpacingPlugin, ndMarkerPlugin]
			});
			error = null;
		} catch (e) {
			error = `Error al crear gráfica: ${e}`;
		}
	}

	function updateChart() {
		if (chartInstance) {
			const { labels, datasets } = transformData();
			chartInstance.data.labels = labels;
			chartInstance.data.datasets = datasets;
			chartInstance.options = getChartOptions() as Record<string, unknown>;
			chartInstance.update();
		} else {
			createChart();
		}
	}

	let chartCreated = false;

	onMount(() => {
		if (!isTable) loadChartJS();
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			if (chartInstance) {
				chartInstance.destroy();
				chartInstance = null;
			}
			chartCreated = false;
		};
	});

	// Create chart ONCE when modules are loaded and canvas is available
	$effect(() => {
		if (chartModulesLoaded && canvas && !chartCreated) {
			chartCreated = true;
			setTimeout(() => createChart(), 50);
		}
	});

	// React to theme changes
	$effect(() => {
		// Access isDark to create dependency
		void themeStore.isDark;
		if (chartModulesLoaded && chartInstance && chartCreated) {
			updateChart();
		}
	});
</script>

<div class="w-full {fillHeight ? 'h-full' : ''}">
	{#if isTable}
		{@const rows = bloqueGrafica.tablaDatos?.rows || []}
		{#if rows.length < 2}
			<div class="min-h-[200px] flex items-center justify-center bg-red-500/10 rounded-lg">
				<p class="text-red-400 text-sm">No hay datos suficientes para mostrar la tabla</p>
			</div>
		{:else}
			{#if bloqueGrafica.titulo}
				<h3 class="text-lg md:text-xl font-bold {fillHeight ? '' : ''} {getUnitSubtitle() ? 'mb-0' : 'mb-3'} {themeStore.isDark ? 'text-white' : 'text-slate-800'}">{bloqueGrafica.titulo}</h3>
			{/if}
			{#if getUnitSubtitle()}
				<p class="text-xs md:text-sm italic mb-3 {themeStore.isDark ? 'text-slate-300' : 'text-slate-500'}">{getUnitSubtitle()}</p>
			{/if}
			{@const isRankHeader = (idx: number) => typeof rows[0].cells[idx] === 'string' && rows[0].cells[idx].trim() === '#'}
		{@const hasRankColumn = isRankHeader(0)}
		{@const rankColStyle = 'width: 5rem; min-width: 5rem; max-width: 5rem;'}
		{@const colCount = rows[0].cells.length}
		{@const fixedColStyle = (i: number) => {
			if (!hasRankColumn) return '';
			if (i === 0) return rankColStyle;
			if (colCount === 3) return i === 1 ? 'width: 65%;' : 'width: 30%;';
			return '';
		}}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-sm" style={hasRankColumn ? 'table-layout: fixed;' : ''}>
					{#if hasRankColumn}
						<colgroup>
							{#each rows[0].cells as _, i}
								<col style={fixedColStyle(i)} />
							{/each}
						</colgroup>
					{/if}
					<thead>
						<tr>
							{#each rows[0].cells as cell, i}
								<th
									class="py-3 font-semibold border-b-2 {isRankHeader(i) ? 'px-1' : 'px-4'} {themeStore.isDark ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-300 bg-slate-100 text-slate-900'}"
									style={isRankHeader(i) ? rankColStyle : ''}
									class:text-left={(i === 0 && !isRankHeader(i)) || (hasRankColumn && i === 1)}
									class:text-center={isRankHeader(i)}
									class:text-right={i > 0 && !(hasRankColumn && i === 1)}
								>
									{cell}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each rows.slice(1) as row, rowIdx}
							{@const isTotalRow = row.cells.some(c => typeof c === 'string' && c.trim().toLowerCase().startsWith('total '))}
							<tr class="{rowIdx % 2 === 1 ? (themeStore.isDark ? 'bg-slate-800/50' : 'bg-slate-50') : ''} {isTotalRow ? 'font-bold ' + (themeStore.isDark ? 'bg-slate-700/70' : 'bg-slate-100') : ''}">
								{#each row.cells as cell, i}
									<td
										class="py-2.5 border-b {isRankHeader(i) ? 'px-1' : 'px-4'} {themeStore.isDark ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-900'} {isTotalRow ? 'border-t-2 ' + (themeStore.isDark ? 'border-t-slate-500' : 'border-t-slate-400') : ''}"
										style={isRankHeader(i) ? rankColStyle : ''}
										class:text-left={(i === 0 && !isRankHeader(i)) || (hasRankColumn && i === 1)}
										class:text-center={isRankHeader(i)}
										class:text-right={i > 0 && !(hasRankColumn && i === 1)}
										class:font-medium={i === 0 && !isRankHeader(i)}
									>
										{i === 0 ? cell : formatTableCell(cell, row.cells[0], rows[0].cells[i])}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{:else}
		{#if error}
			<div class="min-h-[200px] flex items-center justify-center bg-red-500/10 rounded-lg">
				<p class="text-red-400 text-sm">{error}</p>
			</div>
		{/if}

		{#if !chartModulesLoaded && !error}
			<div class="min-h-[200px] flex items-center justify-center">
				<p class="text-slate-400 text-sm">Cargando gráfica...</p>
			</div>
		{/if}

		<!-- Canvas siempre presente pero oculto hasta que cargue -->
		<div
			class="relative"
			class:hidden={!chartModulesLoaded || !!error}
			style="{fillHeight ? 'height: 100%;' : 'min-height: ' + (THICK_BARS_PREFIXES.some(p => bloqueGrafica.titulo?.startsWith(p)) ? (isMobile ? '560px' : '720px') : (bloqueGrafica.tipo === 'horizontalBar' || bloqueGrafica.tipo === 'pyramid' ? (isMobile ? '400px' : '500px') : (isMobile ? '350px' : '400px'))) + ';'}"
		>
			<canvas bind:this={canvas}></canvas>
		</div>
	{/if}
</div>
