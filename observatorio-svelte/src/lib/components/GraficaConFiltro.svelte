<script lang="ts">
	import UniversalChart from './UniversalChart.svelte';
	import type { GraficaWidget, ParsedGraficaData } from '$lib/sanity';
	import { parseGraficaData, filtrarPorRangoAnios } from '$lib/sanity';

	interface Props {
		grafica: GraficaWidget;
		anioInicio?: number | null;
		anioFin?: number | null;
	}

	let { grafica, anioInicio = null, anioFin = null }: Props = $props();

	// Parse the data to get available years
	const parsedData = $derived<ParsedGraficaData | null>(parseGraficaData(grafica.tablaDatos));

	// Check if this chart has year-based headers that can be filtered
	const hasYearHeaders = $derived(parsedData !== null && parsedData.aniosDisponibles.length >= 2);

	// Get min/max from available years in this specific chart
	const minYear = $derived(parsedData ? Math.min(...parsedData.aniosDisponibles) : 2000);
	const maxYear = $derived(parsedData ? Math.max(...parsedData.aniosDisponibles) : 2024);

	// Effective range: use external props if provided, otherwise use chart's full range
	const effectiveAnioInicio = $derived(anioInicio ?? minYear);
	const effectiveAnioFin = $derived(anioFin ?? maxYear);

	// Create filtered grafica object for the chart
	const graficaFiltrada = $derived.by(() => {
		if (!parsedData || !hasYearHeaders) {
			return grafica;
		}

		// Only filter if there's an actual range restriction
		const shouldFilter = anioInicio !== null || anioFin !== null;
		if (!shouldFilter) {
			return grafica;
		}

		const filteredData = filtrarPorRangoAnios(parsedData, effectiveAnioInicio, effectiveAnioFin);

		// Reconstruct tablaDatos with filtered data
		const newRows = [
			// Header row
			{
				_key: 'header',
				_type: 'tableRow' as const,
				cells: ['', ...filteredData.labels]
			},
			// Data rows
			...filteredData.datasets.map((dataset, idx) => ({
				_key: `row-${idx}`,
				_type: 'tableRow' as const,
				cells: [dataset.label, ...dataset.data.map((v) => v.toString())]
			}))
		];

		return {
			...grafica,
			tablaDatos: {
				rows: newRows
			}
		};
	});
</script>

<div class="grafica-con-filtro">
	<!-- Chart -->
	{#key `${grafica._key}-${effectiveAnioInicio}-${effectiveAnioFin}`}
		<UniversalChart bloqueGrafica={graficaFiltrada} />
	{/key}
</div>
