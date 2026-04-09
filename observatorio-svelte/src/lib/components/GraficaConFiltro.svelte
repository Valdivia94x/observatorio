<script lang="ts">
	import UniversalChart from './UniversalChart.svelte';
	import ChartModal from './ChartModal.svelte';
	import type { GraficaWidget } from '$lib/sanity';
	import { getFuente } from '$lib/sanity';

	interface Props {
		grafica: GraficaWidget;
	}

	let { grafica }: Props = $props();

	let showModal = $state(false);
</script>

<div class="grafica-con-filtro">
	<!-- Chart (clickable) -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="cursor-pointer transition-opacity hover:opacity-80"
		onclick={() => showModal = true}
		title="Click para ampliar"
	>
		{#key grafica._key}
			<UniversalChart bloqueGrafica={grafica} />
		{/key}
	</div>

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

<!-- Modal -->
{#if showModal}
	<ChartModal grafica={grafica} onClose={() => showModal = false} />
{/if}
