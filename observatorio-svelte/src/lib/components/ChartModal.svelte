<script lang="ts">
	import { browser } from '$app/environment';
	import { themeStore } from '$lib/stores/theme.svelte';
	import UniversalChart from './UniversalChart.svelte';
	import type { GraficaWidget } from '$lib/sanity';
	import { getFuente } from '$lib/sanity';

	interface Props {
		grafica: GraficaWidget;
		onClose: () => void;
	}

	let { grafica, onClose }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm"
	onclick={handleBackdropClick}
>
	<!-- Modal -->
	<div class="{themeStore.isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
		<!-- Header -->
		<div class="flex items-center justify-between px-6 py-4 border-b {themeStore.isDark ? 'border-slate-700' : 'border-slate-200'}">
			<div>
				<h2 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-lg font-bold">
					{grafica.titulo || 'Gráfica'}
				</h2>
				{#if grafica.fuente}
					<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-500'} text-sm">
						Fuente: {getFuente(grafica)}
					</p>
				{/if}
			</div>
			<button
				onclick={onClose}
				class="{themeStore.isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'} p-2 rounded-lg transition-colors"
				aria-label="Cerrar"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Chart -->
		<div class="flex-1 overflow-auto p-6">
			{#key 'modal-' + grafica._key}
				<UniversalChart bloqueGrafica={grafica} />
			{/key}

			{#if grafica.descripcionContexto}
				<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-sm mt-4">
					{grafica.descripcionContexto}
				</p>
			{/if}
		</div>
	</div>
</div>
