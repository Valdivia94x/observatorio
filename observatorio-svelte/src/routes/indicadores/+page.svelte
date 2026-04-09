<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
	import { page } from '$app/stores';
	import { onMount, untrack } from 'svelte';
	import GraficaConFiltro from '$lib/components/GraficaConFiltro.svelte';
	import InteractiveMap from '$lib/components/InteractiveMap.svelte';
	import type { Indicador, Eje, UbicacionKey, PeriodicidadKey, GraficaWidget } from '$lib/sanity';
	import { ubicacionLabels, periodicidadLabels, formatearPeriodoGrafica } from '$lib/sanity';
	import type { MunicipioKey } from '$lib/data/municipiosMap';
	import { voiceAgentStore } from '$lib/stores/voiceAgent.svelte';

	let { data } = $props();

	const indicadores: Indicador[] = data.indicadores;
	const allEjes: Eje[] = data.allEjes;
	const allUbicaciones: UbicacionKey[] = data.allUbicaciones || [];

	// Filter states
	// Nivel padre (indicador): filtro por eje
	let selectedEje = $state<string>('todos');
	// Nivel hijo (gráfica): filtro por ubicación
	let selectedUbicacion = $state<string>('todos');
	// Filtro adicional por nombre de indicador
	let selectedIndicador = $state<string>('todos');
	// Flag para evitar que el $effect resetee indicador durante la inicialización desde query params
	let initialized = $state(false);

	// Defaults
	const DEFAULT_EJE = 'Desarrollo Urbano';
	const DEFAULT_INDICADOR = 'Crecimiento poblacional';

	// Read query params on mount (fallback to defaults)
	onMount(() => {
		const ejeParam = $page.url.searchParams.get('eje');
		selectedEje = ejeParam || DEFAULT_EJE;

		const ubicacionParam = $page.url.searchParams.get('ubicacion');
		if (ubicacionParam) {
			// Convertir MunicipioKey a UbicacionKey si viene del mapa de home
			const ubicacionValue = municipioKeyToUbicacion[ubicacionParam as MunicipioKey];
			if (ubicacionValue) {
				selectedUbicacion = ubicacionValue;
			} else if (allUbicaciones.includes(ubicacionParam as UbicacionKey)) {
				// Si ya es una UbicacionKey válida, usarla directamente
				selectedUbicacion = ubicacionParam;
			}
		}

		const indicadorParam = $page.url.searchParams.get('indicador');
		const indicadorValue = indicadorParam || DEFAULT_INDICADOR;
		requestAnimationFrame(() => {
			selectedIndicador = indicadorValue;
			setTimeout(() => { initialized = true; }, 0);
		});
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

	// Filter graficas within an indicador based on ubicacion
	function filterGraficas(graficas: GraficaWidget[] | undefined): GraficaWidget[] {
		if (!graficas) return [];

		return graficas.filter(grafica => {
			if (selectedUbicacion !== 'todos') {
				if (!grafica.ubicacion?.includes(selectedUbicacion as UbicacionKey)) return false;
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
				if (selectedUbicacion === 'todos') {
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

		// Sort: indicators with only estatal charts go last within each group
		for (const group of Object.values(groups)) {
			group.items.sort((a, b) => {
				const aAllEstatal = getGraficasToShow(a).length > 0 && getGraficasToShow(a).every(g => isEstatalGrafica(g)) ? 1 : 0;
				const bAllEstatal = getGraficasToShow(b).length > 0 && getGraficasToShow(b).every(g => isEstatalGrafica(g)) ? 1 : 0;
				return aAllEstatal - bAllEstatal;
			});
		}

		return groups;
	});

	// Select first indicador when eje changes (skip during init from query params)
	$effect(() => {
		void selectedEje;
		if (untrack(() => initialized)) {
			const names = indicadorNames();
			selectedIndicador = names.length > 0 ? names[0] : '';
		}
	});

	function getUbicacionLabel(key?: UbicacionKey): string {
		if (!key) return 'Sin especificar';
		return ubicacionLabels[key] || key;
	}

	function getPeriodicidadLabel(key?: PeriodicidadKey): string {
		if (!key) return 'Sin especificar';
		return periodicidadLabels[key] || key;
	}

	// Check if a grafica is ZML (has all 4 municipalities)
	function isZmlGrafica(grafica: GraficaWidget): boolean {
		const ub = grafica.ubicacion || [];
		return ub.length >= 4 &&
			ub.includes('torreon') && ub.includes('gomez-palacio') &&
			ub.includes('lerdo') && ub.includes('matamoros');
	}

	// Helper to get graficas to show (filtered or all), estatal charts always last
	function getGraficasToShow(indicador: Indicador & { graficasFiltradas: GraficaWidget[] }): GraficaWidget[] {
		const graficas = selectedUbicacion !== 'todos'
			? (indicador.graficasFiltradas || [])
			: (indicador.contenido || []);

		// Hide ZML charts when municipal charts exist for the same indicator
		const hasMunicipal = graficas.some(g => !isZmlGrafica(g) && !isEstatalGrafica(g));
		const filtered = hasMunicipal
			? graficas.filter(g => !isZmlGrafica(g))
			: graficas;

		return [...filtered].sort((a, b) => {
			const aEstatal = isEstatalGrafica(a) ? 1 : 0;
			const bEstatal = isEstatalGrafica(b) ? 1 : 0;
			return aEstatal - bEstatal;
		});
	}


	// Voice agent: inicia conversación directamente con el contexto de la gráfica
	function askAboutGrafica(grafica: GraficaWidget, indicadorTitle: string) {
		voiceAgentStore.startWithGrafica(grafica, indicadorTitle);
	}

	// Check if a grafica is the active one for voice agent
	const isActiveForVoice = $derived((grafica: GraficaWidget) => {
		return voiceAgentStore.activeGrafica?._key === grafica._key;
	});

	// Check if voice agent is loading or connected
	const isVoiceLoading = $derived(voiceAgentStore.isLoading);
	const isVoiceConnected = $derived(voiceAgentStore.isConnected);

	// Helper para generar IDs de sección a partir del nombre del eje
	function slugify(text: string): string {
		return text
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '') // quitar acentos
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '');
	}

	// Detectar si una gráfica es estatal (ranking de estado completo)
	function isEstatalGrafica(grafica: GraficaWidget): boolean {
		return grafica.tipo === 'horizontalBar' &&
			(grafica.ubicacion?.some(u => u.startsWith('estatal-')) ?? false);
	}

	// Detectar si un indicador tiene al menos una gráfica estatal visible
	function hasEstatalGrafica(indicador: any): boolean {
		return getGraficasToShow(indicador).some((g: GraficaWidget) => isEstatalGrafica(g));
	}

	// Detectar si TODAS las gráficas visibles son estatales (para cambiar layout)
	const allGraficasAreEstatal = $derived(() => {
		const allGraficas = finalFilteredIndicadores().flatMap(ind => getGraficasToShow(ind));
		return allGraficas.length > 0 && allGraficas.every(g => isEstatalGrafica(g));
	});

	// Enriquecer el contexto del agente de voz con los filtros e ejes disponibles
	$effect(() => {
		// Solo actualizar contexto de página si no hay gráfica activa
		if (!voiceAgentStore.activeGrafica) {
			const ejeNames = allEjes.map(e => e.title);
			voiceAgentStore.setPageContext({
				type: 'indicadores',
				selectedEje: selectedEje !== 'todos' ? selectedEje : undefined,
				selectedUbicacion: selectedUbicacion !== 'todos' ? selectedUbicacion : undefined,
				availableEjes: ejeNames
			});
		}
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
					{#each indicadorNames() as nombre}
						<option value={nombre}>{nombre}</option>
					{/each}
				</select>
			</div>

			</div>
		</div>
	</div>

	<!-- Layout: side-by-side (default) or stacked (all estatal) -->
	<div class="max-w-7xl mx-auto px-6">
	<div class="{allGraficasAreEstatal() ? 'flex flex-col items-center gap-8' : 'flex flex-col lg:flex-row gap-8'}">
		<!-- Map column -->
		<div class="{allGraficasAreEstatal() ? 'w-full max-w-sm space-y-4' : 'lg:w-1/3 lg:self-start space-y-4'}">
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

		<!-- Charts column -->
		<div class="{allGraficasAreEstatal() ? 'w-full' : 'lg:w-2/3'}">
			{#if finalFilteredIndicadores().length === 0}
				<div class="text-center py-16">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto mb-4 {themeStore.isDark ? 'text-slate-600' : 'text-slate-300'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-lg mb-2">
						No hay indicadores disponibles por el momento.
					</p>
				</div>
			{:else}
				{#each Object.entries(groupedIndicadores()) as [categoria, ejeData]}
					<section class="mb-12" id="eje-{slugify(categoria)}">
						<!-- Indicadores Grid (single column within right section) -->
						<div class="space-y-6">
							{#each ejeData.items as indicador}
								<!-- Indicador Header -->
								<div class="mb-2">
									<h3 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-xl font-bold mb-2">
										{indicador.title}
									</h3>

									<div class="flex flex-wrap gap-2">
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

									{#if indicador.infoAdicional}
										<div class="{themeStore.isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-amber-50 border-amber-200'} border rounded-lg p-3 mt-3">
											<p class="{themeStore.isDark ? 'text-slate-300' : 'text-amber-900'} text-sm">
												{indicador.infoAdicional}
											</p>
										</div>
									{/if}
								</div>

								<!-- Individual Chart Cards -->
								{#if getGraficasToShow(indicador).length > 0}
									{#each getGraficasToShow(indicador) as grafica (grafica._key)}
										<div class="{themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl px-6 py-4 shadow-lg relative group {isEstatalGrafica(grafica) && !allGraficasAreEstatal() ? 'estatal-full-bleed' : ''}">
											<!-- Voice button -->
											<button
												onclick={() => askAboutGrafica(grafica, indicador.title || '')}
												disabled={isVoiceLoading && isActiveForVoice(grafica)}
												class="absolute top-3 right-3 p-2 rounded-full transition-all duration-200 z-10
													{isActiveForVoice(grafica) && isVoiceConnected
														? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg ring-2 ring-green-400/50'
														: isActiveForVoice(grafica) && isVoiceLoading
															? 'bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg animate-pulse'
															: themeStore.isDark
																? 'bg-slate-700 text-slate-400 hover:bg-gradient-to-br hover:from-orange-500 hover:to-pink-500 hover:text-white opacity-0 group-hover:opacity-100'
																: 'bg-slate-200 text-slate-500 hover:bg-gradient-to-br hover:from-orange-500 hover:to-pink-500 hover:text-white opacity-0 group-hover:opacity-100'}"
												title={isActiveForVoice(grafica) && isVoiceConnected
													? 'Conversación activa'
													: isActiveForVoice(grafica) && isVoiceLoading
														? 'Conectando...'
														: 'Preguntar sobre esta gráfica'}
											>
												{#if isActiveForVoice(grafica) && isVoiceLoading}
													<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
														<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
														<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
													</svg>
												{:else if isActiveForVoice(grafica) && isVoiceConnected}
													<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
														<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
													</svg>
												{:else}
													<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
														<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 2.76 2.24 5 5 5s5-2.24 5-5h2c0 4.08-3.06 7.44-7 7.93V19h4v2H8v-2h4v-3.07z"/>
													</svg>
												{/if}
											</button>

											<div class="flex flex-wrap gap-2 mb-1">
												{#if grafica.ubicacion?.length}
													<span class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-500'} text-xs">
														{grafica.ubicacion.map(u => getUbicacionLabel(u)).join(', ')}
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
											<GraficaConFiltro
												grafica={grafica}
											/>
										</div>
									{/each}
								{/if}
							{/each}
						</div>
					</section>
				{/each}
			{/if}
		</div>
	</div>
	</div>
</main>

<style>
	@media (min-width: 1024px) {
		:global(.estatal-full-bleed) {
			margin-left: calc(-50% - 2rem);
			width: calc(150% + 2rem);
			position: relative;
			z-index: 10;
		}
		:global(.estatal-full-bleed.bg-slate-700\/50) {
			background-color: rgb(51 65 85) !important;
		}
	}
</style>
