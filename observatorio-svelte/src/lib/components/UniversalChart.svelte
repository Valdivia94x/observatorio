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
		tipo: 'bar' | 'stackedBar' | 'line' | 'doughnut' | 'radar' | 'horizontalBar' | 'pie' | 'table';
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

		// Wrap long labels into multiline arrays for Chart.js
		const processedLabels: (string | string[])[] = hasLongLabels(labels)
			? labels.map(l => wrapLabel(l, isMobile ? 12 : 16))
			: labels;

		const isPieOrDoughnut = tipo === 'doughnut' || tipo === 'pie';
		const comboChart = isComboChart();

		// Row 1+: Datasets
		const datasets = rows.slice(1).map((row, index) => {
			let seriesLabel = firstDataIsLabel ? row.cells[0] : `Serie ${index + 1}`;
			// Si el label es muy largo (típico de importaciones Excel), simplificarlo
			if (seriesLabel && seriesLabel.length > 50) {
				seriesLabel = `Serie ${index + 1}`;
			}
			const rawData = row.cells.slice(dataStartIndex).map(cell => parseFloat(cell) || 0);

			// Pad data with zeros at the beginning if there are fewer values than labels
			const data = rawData.length < labels.length
				? [...Array(labels.length - rawData.length).fill(0), ...rawData]
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

			return {
				label: seriesLabel,
				data,
				backgroundColor: tipo === 'line' ? color.border : color.bg,
				borderColor: color.border,
				borderWidth: 2,
				tension: 0.3,
				fill: tipo === 'radar',
				pointBackgroundColor: color.border,
				pointBorderColor: '#fff',
				pointHoverBackgroundColor: '#fff',
				pointHoverBorderColor: color.border,
			};
		});

		return { labels: processedLabels, datasets };
	}

	function getChartType(): 'bar' | 'line' | 'doughnut' | 'radar' | 'pie' {
		if (bloqueGrafica.tipo === 'horizontalBar' || bloqueGrafica.tipo === 'stackedBar') {
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

		// Extract symbol (% or $) from axis title and move to ticks
		function extractAxisSymbol(label: string): { cleanLabel: string; tickCallback?: (value: number | string) => string } {
			if (label.includes('%') || label.toLowerCase().includes('porcentaje')) {
				const cleanLabel = label.replace(/\s*\(%?\)\s*|\s*%\s*/g, '').replace(/porcentaje/i, 'Porcentaje').trim();
				return {
					cleanLabel,
					tickCallback: (value: number | string) => `${value}%`,
				};
			}
			if (label.includes('$') || label.toLowerCase().includes('pesos')) {
				const cleanLabel = label.replace(/\s*\(\$?\)\s*|\s*\$\s*/g, '').trim();
				return {
					cleanLabel,
					tickCallback: (value: number | string) => `$${Number(value).toLocaleString('es-MX')}`,
				};
			}
			return { cleanLabel: label };
		}

		// Check if X-axis labels are long (for rotation vs wrap decision)
		const rawLabels = bloqueGrafica.tablaDatos?.rows?.[0]?.cells?.slice(1) || [];
		const labelsAreLong = hasLongLabels(rawLabels);

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
					callbacks: hasSecondaryAxis() ? {
						label: (context: { dataset: { label?: string; yAxisID?: string }; parsed: { y: number } }) => {
							const label = context.dataset.label || '';
							const value = context.parsed.y?.toLocaleString('es-MX') ?? '';
							const axis = context.dataset.yAxisID === 'y1' ? ' (eje der.)' : '';
							return `${label}: ${value}${axis}`;
						}
					} : undefined,
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
					// Prevención de colisiones - ocultar etiquetas que sigan chocando
					clamp: true,
					clip: false,
					formatter: (value: number) => {
						if (value === 0) return '';
						const formatted = value.toLocaleString('es-MX');
						if (bloqueGrafica.unidadMedida === 'pesos' || bloqueGrafica.unidadMedida === 'miles-pesos' || bloqueGrafica.unidadMedida === 'millones-pesos') return `$${formatted}`;
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

			const dualAxis = hasSecondaryAxis();
			const primaryColor = dualAxis ? getAxisColor(false) : undefined;
			const secondaryColor = dualAxis ? getAxisColor(true) : undefined;
			// Use primary series name as left axis label when dual-axis
			const primarySerieLabel = dualAxis
				? bloqueGrafica.series?.find(s => !s.ejeSecundario)?.nombre
				: undefined;

			const isStacked = bloqueGrafica.tipo === 'stackedBar';

			const yLabel = isHorizontalBar ? 'Período' : (primarySerieLabel || unidadLabel);
			const yAxis = extractAxisSymbol(yLabel);

			const scales: Record<string, unknown> = {
				x: {
					stacked: isStacked,
					title: {
						display: !isMobile,
						text: isHorizontalBar ? unidadLabel : 'Período',
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
							size: labelsAreLong ? (isMobile ? 7 : 9) : (isMobile ? 9 : 12)
						},
						maxRotation: labelsAreLong ? 0 : 90,
						minRotation: labelsAreLong ? 0 : 90,
						autoSkip: isMobile,
						maxTicksLimit: isMobile ? 8 : undefined,
					}
				},
				y: {
					stacked: isStacked,
					position: 'left',
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
						callback: yAxis.tickCallback,
					},
					beginAtZero: true,
				}
			};

			// Add secondary Y axis if any series uses it
			if (dualAxis) {
				// Find the name of the secondary series to use as axis label
				const secondarySerie = bloqueGrafica.series?.find(s => s.ejeSecundario);
				const secondaryLabel = secondarySerie?.nombre || 'Eje secundario';
				const y1Axis = extractAxisSymbol(secondaryLabel);

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
						callback: y1Axis.tickCallback,
					},
					beginAtZero: true,
					max: secondaryMax !== undefined ? Math.ceil(secondaryMax * 2) : undefined,
				};
			}

			baseOptions.scales = scales;

			// Horizontal bar configuration
			if (isHorizontalBar) {
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

			chartInstance = new Chart(ctx, {
				type: getChartType(),
				data: { labels, datasets },
				options: getChartOptions() as Record<string, unknown>,
				plugins: [legendSpacingPlugin]
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
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-sm">
					<thead>
						<tr>
							{#each rows[0].cells as cell, i}
								<th
									class="px-4 py-3 font-semibold border-b-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
									class:text-left={i === 0}
									class:text-right={i > 0}
								>
									{cell}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each rows.slice(1) as row, rowIdx}
							<tr class={rowIdx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-800/50' : ''}>
								{#each row.cells as cell, i}
									<td
										class="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
										class:text-left={i === 0}
										class:text-right={i > 0}
										class:font-medium={i === 0}
									>
										{cell}
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
			style="{fillHeight ? 'height: 100%;' : 'min-height: ' + (bloqueGrafica.tipo === 'horizontalBar' ? (isMobile ? '400px' : '500px') : (isMobile ? '350px' : '400px')) + ';'}"
		>
			<canvas bind:this={canvas}></canvas>
		</div>
	{/if}
</div>
