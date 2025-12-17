<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import UniversalChart from '$lib/components/UniversalChart.svelte';
	import InteractiveMap from '$lib/components/InteractiveMap.svelte';
	import type { Indicador, Eje, UbicacionKey, PeriodicidadKey, GraficaWidget } from '$lib/sanity';
	import { ubicacionLabels, periodicidadLabels, anioDisponibleEnGrafica, formatearPeriodoGrafica } from '$lib/sanity';
	import type { MunicipioKey } from '$lib/data/municipiosMap';

	let { data } = $props();

	const indicadores: Indicador[] = data.indicadores;
	const allEjes: Eje[] = data.allEjes;
	const allAnios: number[] = data.allAnios || [];
	const allUbicaciones: UbicacionKey[] = data.allUbicaciones || [];

	// Filter states
	// Nivel padre (indicador): filtro por eje
	let selectedEje = $state<string>('todos');
	// Nivel hijo (gráfica): filtros por ubicación y año
	let selectedUbicacion = $state<string>('todos');
	let selectedAnio = $state<string>('todos');
	// Filtro adicional por nombre de indicador
	let selectedIndicador = $state<string>('todos');

	// Read query params on mount
	onMount(() => {
		const ejeParam = $page.url.searchParams.get('eje');
		if (ejeParam) {
			selectedEje = ejeParam;
		}
	});

	// Map MunicipioKey to ubicacion values (for interactive map)
	const municipioKeyToUbicacion: Record<MunicipioKey, UbicacionKey> = {
		'torreon': 'torreon',
		'gomezPalacio': 'gomez-palacio',
		'lerdo': 'lerdo',
		'matamoros': 'matamoros'
	};

	// Reverse mapping for showing selected on map
	const ubicacionToMunicipioKey: Record<string, MunicipioKey> = {
		'torreon': 'torreon',
		'gomez-palacio': 'gomezPalacio',
		'lerdo': 'lerdo',
		'matamoros': 'matamoros'
	};

	function handleMapClick(key: MunicipioKey) {
		const ubicacionValue = municipioKeyToUbicacion[key];
		// Toggle: if already selected, deselect
		if (selectedUbicacion === ubicacionValue) {
			selectedUbicacion = 'todos';
		} else {
			selectedUbicacion = ubicacionValue;
		}
	}

	// Get map key for highlighting
	const selectedMapKey = $derived(() => {
		if (selectedUbicacion === 'todos') return null;
		return ubicacionToMunicipioKey[selectedUbicacion] || null;
	});

	// Use all ejes from Sanity
	const ejes = $derived(() => {
		return allEjes.map(eje => eje.title).sort();
	});

	// Available ubicaciones from server data
	const ubicaciones = $derived(() => {
		return allUbicaciones.filter(u => u).sort();
	});

	// Available años from server data (sorted descending)
	const anios = $derived(() => {
		return allAnios.filter(a => a).sort((a, b) => b - a);
	});

	// Filter graficas within an indicador based on ubicacion and año
	function filterGraficas(graficas: GraficaWidget[] | undefined): GraficaWidget[] {
		if (!graficas) return [];

		return graficas.filter(grafica => {
			// Filter by ubicacion (nivel gráfica)
			if (selectedUbicacion !== 'todos') {
				if (grafica.ubicacion !== selectedUbicacion) return false;
			}
			// Filter by año (nivel gráfica) - usando la nueva lógica con rangos
			if (selectedAnio !== 'todos') {
				const anio = parseInt(selectedAnio);
				if (!anioDisponibleEnGrafica(grafica, anio)) return false;
			}
			return true;
		});
	}

	// Step 1: Filter indicadores by eje (nivel padre)
	const indicadoresByEje = $derived(() => {
		return indicadores.filter(ind => {
			if (selectedEje !== 'todos' && ind.eje?.title !== selectedEje) return false;
			return true;
		});
	});

	// Step 2: For each indicador, filter its graficas and only keep indicadores with graficas
	const indicadoresConGraficasFiltradas = $derived(() => {
		return indicadoresByEje()
			.map(ind => ({
				...ind,
				graficasFiltradas: filterGraficas(ind.contenido)
			}))
			.filter(ind => {
				// Only show indicadores that have graficas to display
				if (selectedUbicacion === 'todos' && selectedAnio === 'todos') {
					// No filters: show only if has any graficas
					return (ind.contenido?.length ?? 0) > 0;
				}
				// With filters: show only if has matching graficas
				return ind.graficasFiltradas.length > 0;
			});
	});

	// Filtered indicadores names (depends on eje filter)
	const indicadorNames = $derived(() => {
		const unique = new Set<string>();
		indicadoresConGraficasFiltradas().forEach(ind => {
			if (ind.title) unique.add(ind.title);
		});
		return Array.from(unique).sort();
	});

	// Final filtered list (including indicador name filter)
	const finalFilteredIndicadores = $derived(() => {
		if (selectedIndicador === 'todos') return indicadoresConGraficasFiltradas();
		return indicadoresConGraficasFiltradas().filter(ind => ind.title === selectedIndicador);
	});

	// Group filtered indicadores by eje title
	const groupedIndicadores = $derived(() => {
		const groups: Record<string, { color?: string; iconUrl?: string; items: (Indicador & { graficasFiltradas: GraficaWidget[] })[] }> = {};

		finalFilteredIndicadores().forEach((indicador) => {
			const ejeTitle = indicador.eje?.title || 'General';
			if (!groups[ejeTitle]) {
				groups[ejeTitle] = {
					color: indicador.eje?.color,
					iconUrl: indicador.eje?.iconUrl,
					items: []
				};
			}
			groups[ejeTitle].items.push(indicador);
		});

		return groups;
	});

	// Reset indicador filter when other filters change
	$effect(() => {
		void selectedUbicacion;
		void selectedEje;
		void selectedAnio;
		selectedIndicador = 'todos';
	});

	function getUbicacionLabel(key?: UbicacionKey): string {
		if (!key) return 'Sin especificar';
		return ubicacionLabels[key] || key;
	}

	function getPeriodicidadLabel(key?: PeriodicidadKey): string {
		if (!key) return 'Sin especificar';
		return periodicidadLabels[key] || key;
	}

	// Helper to get graficas to show (filtered or all)
	function getGraficasToShow(indicador: Indicador & { graficasFiltradas: GraficaWidget[] }): GraficaWidget[] {
		if (selectedUbicacion !== 'todos' || selectedAnio !== 'todos') {
			return indicador.graficasFiltradas || [];
		}
		return indicador.contenido || [];
	}

	function clearFilters() {
		selectedUbicacion = 'todos';
		selectedEje = 'todos';
		selectedIndicador = 'todos';
		selectedAnio = 'todos';
	}

	const hasActiveFilters = $derived(() => {
		return selectedUbicacion !== 'todos' || selectedEje !== 'todos' || selectedIndicador !== 'todos' || selectedAnio !== 'todos';
	});
</script>

<main>
	<!-- Header Section -->
	<div class="max-w-7xl mx-auto px-6 py-2">
		<h1 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-4xl md:text-4xl font-bold mb-4 text-center">
			Plataforma de Indicadores
		</h1>
	</div>

	<!-- Filters Section - Full Width -->
	<div class="{themeStore.isDark ? 'bg-slate-900/40' : 'bg-white'} py-4 mb-6 shadow-lg">
		<div class="max-w-7xl mx-auto px-6">
			<div class="flex flex-wrap items-center gap-4">
			<!-- Ubicación Filter (nivel gráfica) -->
			<div class="flex-1 min-w-[180px]">
				<label class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-sm font-medium mb-1 block">
					Ubicación
				</label>
				<div class="h-px {themeStore.isDark ? 'bg-slate-600' : 'bg-slate-300'}"></div>
				<select
					bind:value={selectedUbicacion}
					class="{themeStore.isDark
						? 'bg-slate-800 text-white border-slate-800 focus:border-[#d0005f]'
						: 'bg-slate-50 text-slate-800 border-slate-200 focus:border-orange-500'}
						w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-colors"
				>
					<option value="todos">Todas las ubicaciones</option>
					{#each ubicaciones() as ubicacion}
						<option value={ubicacion}>{getUbicacionLabel(ubicacion)}</option>
					{/each}
				</select>
			</div>

			<!-- Eje/Tema Filter (nivel indicador) -->
			<div class="flex-1 min-w-[180px]">
				<label class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-sm font-medium mb-1 block">
					Tema/Eje
				</label>
				<div class="h-px {themeStore.isDark ? 'bg-slate-600' : 'bg-slate-300'}"></div>
				<select
					bind:value={selectedEje}
					class="{themeStore.isDark
						? 'bg-slate-800 text-white border-slate-800 focus:border-[#d0005f]'
						: 'bg-slate-50 text-slate-800 border-slate-200 focus:border-orange-500'}
						w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-colors"
				>
					<option value="todos">Todos los ejes</option>
					{#each ejes() as eje}
						<option value={eje}>{eje}</option>
					{/each}
				</select>
			</div>

			<!-- Indicador Filter -->
			<div class="flex-1 min-w-[200px]">
				<label class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-sm font-medium mb-1 block">
					Indicador
				</label>
				<div class="h-px {themeStore.isDark ? 'bg-slate-600' : 'bg-slate-300'}"></div>
				<select
					bind:value={selectedIndicador}
					class="{themeStore.isDark
						? 'bg-slate-800 text-white border-slate-800 focus:border-[#d0005f]'
						: 'bg-slate-50 text-slate-800 border-slate-200 focus:border-orange-500'}
						w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-colors"
				>
					<option value="todos">Todos los indicadores</option>
					{#each indicadorNames() as nombre}
						<option value={nombre}>{nombre}</option>
					{/each}
				</select>
			</div>

			<!-- Año Filter (nivel gráfica) -->
			<div class="flex-1 min-w-[120px]">
				<label class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-sm font-medium mb-1 block">
					Año
				</label>
				<div class="h-px {themeStore.isDark ? 'bg-slate-600' : 'bg-slate-300'}"></div>
				<select
					bind:value={selectedAnio}
					class="{themeStore.isDark
						? 'bg-slate-800 text-white border-slate-800 focus:border-[#d0005f]'
						: 'bg-slate-50 text-slate-800 border-slate-200 focus:border-orange-500'}
						w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-colors"
				>
					<option value="todos">Todos los años</option>
					{#each anios() as anio}
						<option value={anio.toString()}>{anio}</option>
					{/each}
				</select>
			</div>

			<!-- Clear Filters Button -->
			{#if hasActiveFilters()}
				<div class="flex items-end">
					<button
						onclick={clearFilters}
						class="px-4 py-2 text-sm font-medium text-orange-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
					>
						Limpiar filtros
					</button>
				</div>
			{/if}
			</div>
		</div>
	</div>

	<!-- Two-column layout: Map on left, Charts on right -->
	<div class="max-w-7xl mx-auto px-6">
	<div class="flex flex-col lg:flex-row gap-8">
		<!-- Left column: Interactive Map (sticky on desktop) -->
		<div class="lg:w-1/3 lg:sticky lg:top-24 lg:self-start space-y-4">
			<!-- Indicador y Eje seleccionado -->
			<div class="{themeStore.isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-4 shadow-lg">
				<p class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} font-bold text-lg">
					{selectedIndicador !== 'todos' ? selectedIndicador : 'Todos los indicadores'}
				</p>
				<p class="{themeStore.isDark ? 'text-[#03bdcf]' : 'text-slate-500'} text-lg">
					{selectedEje !== 'todos' ? selectedEje : 'Todos los ejes'}{selectedIndicador !== 'todos' ? ` / ${selectedIndicador}` : ''}
				</p>
			</div>

			<!-- Mapa interactivo -->
			<div class="{themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl p-6 shadow-lg">
				<h1 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-2xl font-bold mb-1">
					ENTIDAD/MUNICIPIO
				</h1>
				<div class="h-px {themeStore.isDark ? 'bg-slate-600' : 'bg-slate-300'}"></div>
				<h2 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-lg font-bold mb-4">
					Selecciona un área
				</h2>
				<InteractiveMap
					onMunicipioClick={handleMapClick}
					selectedMunicipio={selectedMapKey()}
					showTooltip={true}
					compact={true}
				/>
				{#if selectedUbicacion !== 'todos' && ubicacionToMunicipioKey[selectedUbicacion]}
					<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-sm text-center mt-4">
						Mostrando gráficas de <span class="font-semibold text-orange-500">{getUbicacionLabel(selectedUbicacion as UbicacionKey)}</span>
					</p>
					<button
						onclick={() => selectedUbicacion = 'todos'}
						class="w-full mt-2 px-4 py-2 text-sm font-medium text-orange-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
					>
						Ver todas las ubicaciones
					</button>
				{:else}
					<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-sm text-center mt-4">
						Haz clic en un municipio para filtrar
					</p>
				{/if}
			</div>
		</div>

		<!-- Right column: Charts -->
		<div class="lg:w-2/3">
			{#if finalFilteredIndicadores().length === 0}
				<div class="text-center py-16">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto mb-4 {themeStore.isDark ? 'text-slate-600' : 'text-slate-300'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-lg mb-2">
						{#if hasActiveFilters()}
							No se encontraron indicadores con los filtros seleccionados.
						{:else}
							No hay indicadores disponibles por el momento.
						{/if}
					</p>
					{#if hasActiveFilters()}
						<button
							onclick={clearFilters}
							class="text-orange-500 hover:text-orange-400 text-sm font-medium"
						>
							Limpiar filtros
						</button>
					{/if}
				</div>
			{:else}
				{#each Object.entries(groupedIndicadores()) as [categoria, ejeData]}
					<section class="mb-12">
						<!-- Indicadores Grid (single column within right section) -->
						<div class="space-y-6">
							{#each ejeData.items as indicador}
								<div class="{themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl px-6 py-3 shadow-lg">
									<!-- Indicador Title -->
									<h3 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-xl font-bold mb-2">
										{indicador.title}
									</h3>

									<!-- Metadata -->
									<div class="flex flex-wrap gap-2 mb-4">
										{#if indicador.rangoCobertura}
											<span class="{themeStore.isDark ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-700'} text-xs px-2 py-1 rounded-full">
												{indicador.rangoCobertura}
											</span>
										{/if}
										{#if indicador.periodicidad}
											<span class="{themeStore.isDark ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-700'} text-xs px-2 py-1 rounded-full">
												{getPeriodicidadLabel(indicador.periodicidad)}
											</span>
										{/if}
									</div>

									<!-- Info Adicional -->
									{#if indicador.infoAdicional}
										<div class="{themeStore.isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-amber-50 border-amber-200'} border rounded-lg p-3 mb-4">
											<p class="{themeStore.isDark ? 'text-slate-300' : 'text-amber-900'} text-sm">
												{indicador.infoAdicional}
											</p>
										</div>
									{/if}

									<!-- Charts (using graficasFiltradas) -->
									{#if getGraficasToShow(indicador).length > 0}
										<div class="space-y-6">
											{#each getGraficasToShow(indicador) as grafica (grafica._key)}
												<div class="{themeStore.isDark ? 'bg-slate-800/50' : 'bg-slate-50'} rounded-xl px-4 py-2">
													<div class="flex flex-wrap gap-2 mb-1">
														{#if grafica.ubicacion}
															<span class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-500'} text-xs">
																{getUbicacionLabel(grafica.ubicacion)}
															</span>
														{/if}
														{#if formatearPeriodoGrafica(grafica)}
															<span class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-500'} text-xs">
																• {formatearPeriodoGrafica(grafica)}
															</span>
														{/if}
														{#if grafica.periodoEspecifico}
															<span class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-500'} text-xs">
																• {grafica.periodoEspecifico}
															</span>
														{/if}
													</div>
													<UniversalChart bloqueGrafica={grafica} />
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</section>
				{/each}
			{/if}
		</div>
	</div>
	</div>
</main>
