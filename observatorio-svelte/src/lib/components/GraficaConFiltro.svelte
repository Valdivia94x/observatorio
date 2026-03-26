<script lang="ts">
	import UniversalChart from './UniversalChart.svelte';
	import type { GraficaWidget } from '$lib/sanity';
	import { getFuente } from '$lib/sanity';

	interface Props {
		grafica: GraficaWidget;
	}

	let { grafica }: Props = $props();
</script>

<div class="grafica-con-filtro">
	<!-- Chart -->
	{#key grafica._key}
		<UniversalChart bloqueGrafica={grafica} />
	{/key}

	<!-- Descripción y Fuente -->
	{#if grafica.descripcionContexto || grafica.fuente}
		<div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
			{#if grafica.descripcionContexto}
				<p class="text-sm text-slate-600 dark:text-slate-400 mb-2">
					{grafica.descripcionContexto}
				</p>
			{/if}
			{#if grafica.fuente}
				<p class="text-xs text-slate-500 dark:text-slate-500">
					Fuente: {getFuente(grafica)}
				</p>
			{/if}
		</div>
	{/if}
</div>
