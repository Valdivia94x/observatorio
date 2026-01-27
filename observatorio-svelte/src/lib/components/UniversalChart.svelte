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
	}

	interface BloqueGrafica {
		titulo?: string;
		tipo: 'bar' | 'line' | 'doughnut' | 'radar' | 'horizontalBar' | 'pie';
		tablaDatos: TableData;
		series?: SerieConfig[];
		colores?: string[];
		unidadMedida?: UnidadMedidaKey;
		unidadMedidaPersonalizada?: string;
	}

	interface Props {
		bloqueGrafica: BloqueGrafica;
	}

	let { bloqueGrafica }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chartInstance: import('chart.js').Chart | null = null;
	let error = $state<string | null>(null);

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

	// Check if this is a combo chart
	function isComboChart(): boolean {
		const { series, tipo } = bloqueGrafica;
		return (series?.length ?? 0) > 0 && (tipo === 'bar' || tipo === 'line');
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
					// No mostrar labels en series de línea (se superponen)
					datalabels: serieType === 'line' ? { display: false } : undefined,
				};
			}

			// Normal chart: use colores[] or default palette
			const color = colores?.[index]
				? { bg: hexToRgba(colores[index], 0.7), border: colores[index] }
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

		return { labels, datasets };
	}

	function getChartType(): 'bar' | 'line' | 'doughnut' | 'radar' | 'pie' {
		if (bloqueGrafica.tipo === 'horizontalBar') {
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

		const baseOptions: Record<string, unknown> = {
			responsive: true,
			maintainAspectRatio: true,
			plugins: {
				legend: {
					display: shouldShowLegend(),
					position: 'top' as const,
					labels: {
						color: textColor,
						font: {
							size: 10,
							weight: 500
						},
						padding: 6,
						usePointStyle: true,
					}
				},
				title: {
					display: !!bloqueGrafica.titulo,
					text: bloqueGrafica.titulo || '',
					color: textColor,
					font: {
						size: 24,
						weight: 'bold'
					},
					padding: {
						bottom: 10
					}
				},
				tooltip: {
					backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
					titleColor: isDark ? '#fff' : '#1e293b',
					bodyColor: isDark ? '#cbd5e1' : '#475569',
					borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
					borderWidth: 1,
					cornerRadius: 8,
					padding: 12,
				},
				datalabels: {
					// No mostrar labels en gráficas de líneas (se superponen) ni en radar
					display: bloqueGrafica.tipo !== 'radar' && bloqueGrafica.tipo !== 'line',
					anchor: (context: { datasetIndex: number; dataset: { type?: string } }) => {
						if (bloqueGrafica.tipo === 'doughnut' || bloqueGrafica.tipo === 'pie') return 'center';
						return 'end';
					},
					align: (context: { datasetIndex: number; dataset: { type?: string } }) => {
						if (bloqueGrafica.tipo === 'doughnut' || bloqueGrafica.tipo === 'pie') return 'center';
						return 'top';
					},
					offset: (bloqueGrafica.tipo === 'doughnut' || bloqueGrafica.tipo === 'pie') ? 0 : 6,
					color: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
					font: {
						size: 10,
						weight: 600
					},
					// Prevención de colisiones - ocultar etiquetas que sigan chocando
					clamp: true,
					clip: false,
					formatter: (value: number) => {
						if (value === 0) return '';
						// Format large numbers with commas
						return value.toLocaleString('es-MX');
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

			baseOptions.scales = {
				x: {
					title: {
						display: true,
						text: isHorizontalBar ? unidadLabel : 'Período',
						color: textColor,
						font: {
							size: 14,
							weight: 'bold' as const
						}
					},
					grid: {
						color: gridColor,
					},
					ticks: {
						color: textColor,
						font: {
							size: 15
						}
					}
				},
				y: {
					title: {
						display: true,
						text: isHorizontalBar ? 'Período' : unidadLabel,
						color: textColor,
						font: {
							size: 14,
							weight: 'bold' as const
						}
					},
					grid: {
						color: gridColor,
					},
					ticks: {
						color: textColor,
						font: {
							size: 15
						}
					},
					beginAtZero: true,
				}
			};

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
			chartInstance = new Chart(ctx, {
				type: getChartType(),
				data: { labels, datasets },
				options: getChartOptions() as Record<string, unknown>
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
		loadChartJS();

		return () => {
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

<div class="w-full">
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
	<div class="min-h-[250px] relative" class:hidden={!chartModulesLoaded || !!error}>
		<canvas bind:this={canvas}></canvas>
	</div>
</div>
