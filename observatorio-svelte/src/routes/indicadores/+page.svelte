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
	const DEFAULT_INDICADOR = 'Población';

	// Read query params on mount (fallback to defaults)
	onMount(() => {
		const ejeParam = $page.url.searchParams.get('eje');
		selectedEje = ejeParam || DEFAULT_EJE;

		// Pick a default indicador for the eje preferring one with Torreón → Coahuila → cualquiera
		const indicadoresEnEje = indicadores
			.filter(ind => selectedEje === 'todos' || ind.eje?.title === selectedEje)
			.filter(ind => ind.title && (ind.contenido?.length ?? 0) > 0);

		function indicadorTieneUbicacion(ind: Indicador, ubicacion: string): boolean {
			return ind.contenido?.some(g => g.ubicacion?.includes(ubicacion as UbicacionKey)) ?? false;
		}

		const indicadoresOrdenados = [...indicadoresEnEje].sort((a, b) =>
			(a.title || '').localeCompare(b.title || ''),
		);
		const indicadorConTorreon = indicadoresOrdenados.find(ind => indicadorTieneUbicacion(ind, 'torreon'));
		const indicadorConCoahuila = indicadoresOrdenados.find(ind => indicadorTieneUbicacion(ind, 'estatal-coahuila'));
		const fallbackIndicador = indicadoresOrdenados[0];

		// Al entrar al eje por defecto (sin ?eje= en la URL), preferir DEFAULT_INDICADOR si existe.
		const preferido = !ejeParam
			? indicadoresOrdenados.find(ind => ind.title === DEFAULT_INDICADOR)
			: undefined;

		let defaultIndicador: string;
		let defaultUbicacion: string;
		if (preferido) {
			defaultIndicador = preferido.title!;
			defaultUbicacion = indicadorTieneUbicacion(preferido, 'torreon')
				? 'torreon'
				: indicadorTieneUbicacion(preferido, 'estatal-coahuila')
					? 'estatal-coahuila'
					: 'todos';
		} else if (indicadorConTorreon) {
			defaultIndicador = indicadorConTorreon.title!;
			defaultUbicacion = 'torreon';
		} else if (indicadorConCoahuila) {
			defaultIndicador = indicadorConCoahuila.title!;
			defaultUbicacion = 'estatal-coahuila';
		} else {
			defaultIndicador = fallbackIndicador?.title || DEFAULT_INDICADOR;
			defaultUbicacion = 'todos';
		}

		const indicadorParam = $page.url.searchParams.get('indicador');
		const indicadorValue = indicadorParam || defaultIndicador;

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
		} else {
			selectedUbicacion = defaultUbicacion;
		}

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

	// Map municipio to its state
	const municipioToEstado: Record<string, string> = {
		'torreon': 'estatal-coahuila',
		'matamoros': 'estatal-coahuila',
		'gomez-palacio': 'estatal-durango',
		'lerdo': 'estatal-durango',
	};

	// Ejes donde un indicador SOLO estatal se abre desde el municipio de su estado
	// (Torreón/Matamoros→Coahuila, Gómez/Lerdo→Durango). Acotado a estos ejes.
	const EJES_ESTATAL_POR_MUNICIPIO = ['Participación Ciudadana'];

	// Indicadores puntuales (no todo el eje) donde una gráfica estatal se abre desde el municipio
	// de su estado. Ej.: "Años promedio de escolaridad" muestra su gráfica de Coahuila/Durango.
	const INDICADORES_ESTATAL_POR_MUNICIPIO = ['Años promedio de escolaridad'];

	function permiteEstatalPorMunicipio(ejeTitle?: string, indTitle?: string): boolean {
		return (!!ejeTitle && EJES_ESTATAL_POR_MUNICIPIO.includes(ejeTitle)) ||
			(!!indTitle && INDICADORES_ESTATAL_POR_MUNICIPIO.includes(indTitle));
	}

	// Una gráfica es visible para una ubicación municipal si: es de ese municipio, O —cuando el
	// indicador pertenece a un eje en EJES_ESTATAL_POR_MUNICIPIO— es estatal del estado del municipio.
	function graficaVisibleEnUbicacion(grafica: GraficaWidget, ubicacion: string, allowEstatalByState: boolean): boolean {
		if (ubicacion === 'todos') return true;
		if (grafica.ubicacion?.includes(ubicacion as UbicacionKey)) return true;
		if (!allowEstatalByState) return false;
		const estado = municipioToEstado[ubicacion];
		if (estado && isEstatalGrafica(grafica)) {
			return grafica.ubicacion?.includes(estado as UbicacionKey) ?? false;
		}
		return false;
	}

	// Filter graficas within an indicador based on ubicacion
	function filterGraficas(graficas: GraficaWidget[] | undefined, ejeTitle?: string, indTitle?: string): GraficaWidget[] {
		if (!graficas) return [];
		if (selectedUbicacion === 'todos') return graficas;
		const allowEstatalByState = permiteEstatalPorMunicipio(ejeTitle, indTitle);
		return graficas.filter(g => graficaVisibleEnUbicacion(g, selectedUbicacion, allowEstatalByState));
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
				graficasFiltradas: filterGraficas(ind.contenido, ind.eje?.title, ind.title)
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

	// Indicador names depend only on eje filter, not ubicacion
	const indicadorNames = $derived(() => {
		const unique = new Set<string>();
		indicadoresByEje().forEach(ind => {
			if (ind.title && (ind.contenido?.length ?? 0) > 0) unique.add(ind.title);
		});
		return Array.from(unique).sort();
	});

	// Final filtered list (including indicador name filter)
	const finalFilteredIndicadores = $derived(() => {
		if (selectedIndicador === 'todos') return indicadoresConGraficasFiltradas();
		return indicadoresConGraficasFiltradas().filter(ind => ind.title === selectedIndicador);
	});

	// Cuando sólo hay un indicador en la vista, su encabezado va arriba (no inline) para alinear gráfica con mapa
	const singleIndicator = $derived(() => {
		const list = finalFilteredIndicadores();
		return list.length === 1 ? list[0] : null;
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
			const names = untrack(() => indicadorNames());
			selectedIndicador = names.length > 0 ? names[0] : '';
		}
	});

	// Guard defensivo: si selectedIndicador no pertenece al eje actual, resetearlo al primero.
	// Cubre cualquier desincronización (race condition, navegación rápida, hidratación parcial).
	$effect(() => {
		if (!initialized) return;
		const names = indicadorNames();
		if (selectedIndicador !== 'todos' && !names.includes(selectedIndicador)) {
			selectedIndicador = names[0] || 'todos';
		}
	});

	// Soft-hint: indica si un indicador tiene gráficas para la ubicación actual.
	// Usado en el dropdown de Indicador para deshabilitar (gris) los que no aplican.
	function indicadorHasUbicacionData(indicadorName: string): boolean {
		if (selectedUbicacion === 'todos') return true;
		const ind = indicadores.find(i => i.title === indicadorName);
		if (!ind) return false;
		const allow = permiteEstatalPorMunicipio(ind.eje?.title, ind.title);
		return ind.contenido?.some(g => graficaVisibleEnUbicacion(g, selectedUbicacion, allow)) ?? false;
	}

	// Soft-hint: indica si una ubicación tiene gráficas en el contexto actual (eje + indicador).
	function ubicacionHasIndicadorData(ubicacion: UbicacionKey): boolean {
		if (selectedIndicador !== 'todos') {
			const ind = indicadores.find(i => i.title === selectedIndicador);
			if (!ind) return false;
			const allow = permiteEstatalPorMunicipio(ind.eje?.title, ind.title);
			return ind.contenido?.some(g => graficaVisibleEnUbicacion(g, ubicacion, allow)) ?? false;
		}
		// Sin indicador específico: cualquier indicador del eje vigente sirve
		return indicadoresByEje().some(ind => {
			const allow = permiteEstatalPorMunicipio(ind.eje?.title, ind.title);
			return ind.contenido?.some(g => graficaVisibleEnUbicacion(g, ubicacion, allow));
		});
	}

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

		// Indicadores que deben respetar el orden del contenido (ej: Mortalidad → histórico antes que causas)
		const preserveOrder = filtered.some(g =>
			PRESERVE_ORDER_TITLE_PREFIXES.some(p => g.titulo?.startsWith(p)),
		);
		if (preserveOrder) return filtered;

		return [...filtered].sort((a, b) => {
			// Ordenar por "ancho" ascendente: narrow charts → wide charts → tablas
			const aRank = widthRank(a);
			const bRank = widthRank(b);
			if (aRank !== bRank) return aRank - bRank;
			// Dentro de cada grupo, estatales al final
			const aEstatal = isEstatalGrafica(a) ? 1 : 0;
			const bEstatal = isEstatalGrafica(b) ? 1 : 0;
			return aEstatal - bEstatal;
		});
	}

	// Rango de "ancho" de una gráfica (para ordenar de menos a más ancho)
	function widthRank(g: GraficaWidget): number {
		if (g.tipo === 'table') return 2;
		const rows = g.tablaDatos?.rows;
		const cols = (rows?.[0]?.cells?.length || 1) - 1;
		return cols >= 10 ? 1 : 0;
	}

	// Indicadores donde se debe respetar el orden del contenido (no reordenar por ancho).
	// Scoped: solo aplica a las gráficas cuyo título empiece con estos prefijos.
	const PRESERVE_ORDER_TITLE_PREFIXES = ['Mortalidad Registrada', 'Principales Causas de Mortalidad', 'Nacimientos Registrados', 'Nacimientos por Rango de Edad'];


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
		return grafica.ubicacion?.some(u => u.startsWith('estatal-')) ?? false;
	}

	// Detectar si un indicador tiene al menos una gráfica estatal visible
	function hasEstatalGrafica(indicador: any): boolean {
		return getGraficasToShow(indicador).some((g: GraficaWidget) => isEstatalGrafica(g));
	}

	// Una gráfica ocupa el ancho completo si es tabla o tiene 10+ columnas de datos
	// Títulos que se fuerzan a ancho menor (columna junto al mapa) aunque tengan >10 barras
	const NARROW_TITLE_PREFIXES = ['Casos de Depresión Registrados', 'Suicidios Registrados', 'Mortalidad Registrada', 'Nacimientos Registrados', 'Pirámide Poblacional', 'Financiamiento a Partidos Políticos', 'Participación Electoral por Edad y Género', 'Crecimiento Poblacional'];

	function isWideGrafica(grafica: GraficaWidget): boolean {
		if (grafica.tipo === 'table') return true;
		if (NARROW_TITLE_PREFIXES.some((p) => grafica.titulo?.startsWith(p))) return false;
		const rows = grafica.tablaDatos?.rows;
		if (!rows || rows.length === 0) return false;
		const columnCount = (rows[0]?.cells?.length || 1) - 1;
		return columnCount >= 10;
	}

	// Detectar si TODAS las gráficas visibles son anchas (para apilar bajo el mapa)
	const allGraficasAreWide = $derived(() => {
		const allGraficas = finalFilteredIndicadores().flatMap(ind => getGraficasToShow(ind));
		return allGraficas.length > 0 && allGraficas.every(g => isWideGrafica(g));
	});

	// Descripciones extendidas por indicador (se muestran junto al mapa cuando solo hay tablas/gráficas anchas)
	const indicadorDescripciones: Record<string, string> = {
		'Unidades Económicas': `Las <strong>unidades económicas</strong> son los establecimientos donde se realiza la producción de bienes, la comercialización de mercancías o la prestación de servicios. Este indicador, basado en los <strong>Censos Económicos 2024 del INEGI</strong>, dimensiona el tamaño y la composición del aparato productivo de Coahuila, Durango y los municipios de la Región Lagunera.

Se presentan dos vistas complementarias:

<strong>Por tamaño de empresa</strong>: clasifica los establecimientos según el número de personas ocupadas (micro, pequeñas, medianas y grandes). Permite identificar el peso de las MIPYMES en el tejido productivo regional —característica estructural de la economía mexicana— y reconocer en qué municipios se concentran las empresas de mayor escala.

<strong>Por actividad económica</strong>: agrupa las unidades por sector productivo (industrias manufactureras, comercio, servicios, transportes, etc.), revelando la vocación económica de cada localidad. Comparar Torreón, Gómez Palacio, Lerdo y Matamoros con sus entidades respectivas ayuda a entender especializaciones locales y oportunidades de diversificación.`,
		'Inflación': `La <strong>inflación</strong> mide el aumento sostenido y generalizado de los precios de bienes y servicios que consumen los hogares. Este indicador se construye con el <strong>Índice Nacional de Precios al Consumidor (INPC) del INEGI</strong> y permite comparar la dinámica de precios de la <strong>Zona Metropolitana de La Laguna (ZML)</strong> —que incluye Torreón, Gómez Palacio, Lerdo y Matamoros— frente al promedio nacional.

Se presentan dos vistas complementarias:

<strong>Inflación anual: ZML vs Nacional</strong>: muestra la variación porcentual mensual respecto al mismo mes del año anterior. Permite identificar si la región experimenta presiones inflacionarias por encima o por debajo del país, así como detectar puntos de inflexión asociados a choques de oferta, política monetaria o cambios estacionales.

<strong>Inflación por componente</strong>: descompone la tasa anual en los grandes rubros del gasto (alimentos, energéticos, vivienda, transporte, servicios, etc.) y los compara entre la ZML y el nivel nacional. Esta vista es clave para entender qué categorías están encareciendo el costo de vida en la región y diseñar estrategias de mitigación focalizadas.`,
		'Años promedio de escolaridad': `Los <strong>años promedio de escolaridad</strong> miden el nivel educativo alcanzado por la población de 15 años y más, expresado como el número promedio de grados aprobados dentro del Sistema Educativo Nacional. Es uno de los componentes del Índice de Desarrollo Humano y un reflejo directo de la calidad del capital humano disponible para la actividad productiva.

Los datos provienen del <strong>Censo de Población y Vivienda 2020 del INEGI</strong> y se desagregan a nivel municipal para Coahuila y Durango.

<strong>¿Por qué es relevante?</strong>

A nivel nacional el promedio se ubica cerca de los 9.7 años —equivalente a secundaria completa—; comparar cada municipio contra ese referente permite identificar rezagos estructurales. Mayores niveles de escolaridad se asocian con salarios más altos, menor informalidad laboral y mayor productividad. Detectar municipios por debajo del promedio estatal ayuda a focalizar políticas educativas y programas de becas o regularización.

Las gráficas presentan el ranking de municipios de cada entidad para visualizar disparidades intra-estatales y ubicar a la Región Lagunera en el contexto de Coahuila y Durango.`,
		'Indicadores de Desocupación': `Los <strong>indicadores de desocupación</strong> miden a la población en edad de trabajar que, sin estar ocupada, busca activamente un empleo. Se construyen con la <strong>Encuesta Nacional de Ocupación y Empleo (ENOE) del INEGI</strong> y se reportan trimestralmente para la <strong>Zona Metropolitana de La Laguna (ZML)</strong>: Torreón, Gómez Palacio, Lerdo y Matamoros.

Se presentan dos vistas complementarias:

<strong>Población Desocupada en la ZML</strong>: combina el número absoluto de personas desocupadas (barras) con la tasa de desempleo (línea, eje secundario), que expresa el porcentaje que representan respecto a la Población Económicamente Activa (PEA). Su comportamiento trimestral revela el efecto de ciclos económicos, choques externos y patrones estacionales sobre el empleo regional.

<strong>Desocupados por Nivel de Instrucción</strong>: descompone la población desocupada según la escolaridad alcanzada (primaria, secundaria, media superior y superior). Esta vista responde una pregunta crítica para el diseño de política pública: ¿el desempleo regional se concentra en perfiles de baja calificación o también afecta a la población con estudios técnicos y universitarios? Permite distinguir entre desempleo friccional, estructural y por desfase entre la oferta educativa y la demanda productiva.`,
		'Patrones Afiliados en el IMSS': `Los <strong>patrones afiliados al IMSS</strong> son los empleadores —personas físicas o morales— registrados ante el Instituto Mexicano del Seguro Social como responsables de inscribir a sus trabajadores. Constituyen uno de los mejores proxies disponibles del <strong>número de empresas formales</strong> activas en una localidad y, por tanto, un indicador adelantado del dinamismo empresarial regional.

La fuente es el <strong>IMSS</strong>, con datos administrativos actualizados al cierre de cada periodo.

Se presentan dos vistas complementarias:

<strong>Patrones Afiliados en el IMSS</strong> (por ubicación): muestra la evolución anual del número total de patrones registrados en cada municipio de la Región Lagunera y en la ZML agregada. Permite identificar tendencias de creación o cierre de empresas formales, el impacto de la coyuntura económica y la capacidad de la región para atraer nuevas unidades productivas.

<strong>Patrones por Tamaño de Registro Patronal</strong>: clasifica a los patrones según el rango de personas ocupadas que reportan (desde 1 trabajador hasta más de 1,000). Revela la estructura empresarial local —si predominan microempresas o si existe una capa robusta de empresas medianas y grandes— y cómo evoluciona esa composición entre cortes anuales. Es clave para entender la base productiva y la capacidad regional de generación de empleo formal.`,
		'Costo del voto por Partido Político': `El <strong>costo del voto por partido político</strong> relaciona el <strong>financiamiento público</strong> que recibe cada partido con el número de <strong>votos</strong> que obtuvo en la elección, para estimar cuánto cuesta —en pesos de financiamiento— cada voto conseguido. Es una medida de eficiencia del gasto público electoral y de la relación entre recursos asignados y respaldo ciudadano.

Los datos provienen de los <strong>Institutos Electorales locales (IEC de Coahuila e IEPC de Durango)</strong> con base en las estadísticas de sus procesos electorales más recientes.

<strong>¿Cómo se lee?</strong>

Para cada partido se muestran tres cifras: el financiamiento público recibido, los votos obtenidos y el costo por voto resultante (financiamiento ÷ votos). Un costo por voto <strong>alto</strong> indica que el partido recibió mucho financiamiento en relación con los votos que logró; uno <strong>bajo</strong> refleja mayor respaldo ciudadano por cada peso asignado. La fila <strong>Total estatal</strong> resume el promedio de la entidad.

Comparar Coahuila y Durango permite contrastar cómo se distribuye el financiamiento entre fuerzas políticas y qué tan eficiente resulta ese gasto en términos de votos efectivamente captados.`,
		'Organizaciones de la Sociedad Civil': `Las <strong>organizaciones de la sociedad civil (OSC)</strong> son agrupaciones ciudadanas sin fines de lucro que atienden causas de interés público —asistencia social, educación, salud, medio ambiente, derechos humanos, entre otras—. Su número y diversidad son un indicador del <strong>capital social</strong> y de la vitalidad de la participación ciudadana organizada en cada municipio.

Los datos provienen de la <strong>Secretaría del Bienestar</strong> y clasifican a las OSC según su tipo de actividad u objeto social.

<strong>¿Cómo se lee?</strong>

Para cada municipio se presenta la distribución porcentual de las organizaciones por tipo de actividad, ordenada de mayor a menor. El porcentaje indica qué proporción de las OSC del municipio se dedica a cada causa (una misma organización puede registrar más de una actividad, por lo que la suma puede superar el 100%).

Comparar Torreón, Gómez Palacio, Lerdo y Matamoros revela las vocaciones sociales de cada localidad: en qué causas se concentra el trabajo ciudadano, qué temas están subrepresentados y cómo se diversifica el tejido asociativo de la Región Lagunera.`,
	};

	// Indicadores donde NO se muestra el panel "Acerca de este indicador" (junto al mapa)
	const SIN_PANEL_DESCRIPCION = ['Indicadores de Desocupación', 'Patrones Afiliados en el IMSS', 'Costo del voto por Partido Político', 'Organizaciones de la Sociedad Civil'];

	// Indicadores cuyo panel de descripción se oculta al filtrar por un estado (ubicación estatal-*),
	// para dejar solo el ranking (ej. "Años promedio de escolaridad").
	const SIN_PANEL_DESCRIPCION_EN_ESTADO = ['Años promedio de escolaridad'];

	const currentDescripcion = $derived(() => {
		if (selectedIndicador === 'todos') return null;
		if (SIN_PANEL_DESCRIPCION.includes(selectedIndicador)) return null;
		if (SIN_PANEL_DESCRIPCION_EN_ESTADO.includes(selectedIndicador) && selectedUbicacion.startsWith('estatal-')) return null;
		return indicadorDescripciones[selectedIndicador] || null;
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
	<div class="max-w-7xl mx-auto px-6 pb-2 md:-mt-8">
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
						{@const hasData = ubicacionHasIndicadorData(ubicacion)}
						<option value={ubicacion} disabled={!hasData}>
							{getUbicacionLabel(ubicacion)}{!hasData ? ' (sin datos)' : ''}
						</option>
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
						{@const hasData = indicadorHasUbicacionData(nombre)}
						<option value={nombre} disabled={!hasData}>
							{nombre}{!hasData ? ' (sin datos)' : ''}
						</option>
					{/each}
				</select>
			</div>

			</div>
		</div>
	</div>

	{#snippet indicadorInfoCard()}
		<!-- Indicador y Eje seleccionado -->
		<div class="{themeStore.isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-4 shadow-lg">
			<p class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} font-bold text-lg">
				{selectedIndicador !== 'todos' ? selectedIndicador : 'Todos los indicadores'}
			</p>
			<p class="{themeStore.isDark ? 'text-[#03bdcf]' : 'text-slate-500'} text-lg">
				{selectedEje !== 'todos' ? selectedEje : 'Todos los ejes'}{selectedIndicador !== 'todos' ? ` / ${selectedIndicador}` : ''}
			</p>
		</div>
	{/snippet}

	{#snippet mapColumnContent()}
		<!-- Mapa interactivo -->
		<div class="{themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl px-6 py-3 shadow-lg">
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
	{/snippet}

	{#snippet chartCard(indicador: Indicador & { graficasFiltradas: GraficaWidget[] }, grafica: GraficaWidget)}
		<div class="{themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl px-6 py-4 shadow-lg relative group {isEstatalGrafica(grafica) && selectedUbicacion !== 'todos' && !allGraficasAreWide() ? 'mt-12' : ''}">
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
	{/snippet}

	<!-- Layout: side-by-side (default) or stacked (all wide). Map siempre a la izquierda. -->
	<div class="max-w-7xl mx-auto px-6">
	<!-- Fila superior: tarjeta de Indicador/Eje a la izquierda (1/3); título h3 + tags + infoAdicional a la derecha (2/3) cuando hay un solo indicador -->
	<div class="flex flex-col lg:flex-row gap-8 mb-4">
		<div class="lg:w-1/3">
			{@render indicadorInfoCard()}
		</div>
		{#if singleIndicator()}
			<div class="lg:w-2/3 flex flex-col justify-center">
				<h3 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-2xl font-bold mb-2">
					{singleIndicator()?.title}
				</h3>
				{#if singleIndicator()?.rangoCobertura || singleIndicator()?.periodicidad}
					<div class="flex flex-wrap gap-2">
						{#if singleIndicator()?.rangoCobertura}
							<span class="{themeStore.isDark ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-700'} text-xs px-2 py-1 rounded-full">
								{singleIndicator()?.rangoCobertura}
							</span>
						{/if}
						{#if singleIndicator()?.periodicidad}
							<span class="{themeStore.isDark ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-700'} text-xs px-2 py-1 rounded-full">
								{getPeriodicidadLabel(singleIndicator()?.periodicidad)}
							</span>
						{/if}
					</div>
				{/if}
				{#if singleIndicator()?.infoAdicional}
					<div class="{themeStore.isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-amber-50 border-amber-200'} border rounded-lg p-3 mt-3">
						<p class="{themeStore.isDark ? 'text-slate-300' : 'text-amber-900'} text-sm">
							{singleIndicator()?.infoAdicional}
						</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
	<div class="{allGraficasAreWide() ? 'flex flex-col gap-8' : 'flex flex-col lg:flex-row gap-8'}">
		<!-- Map area: cuando está apilado + tiene descripción, mapa y descripción comparten fila -->
		{#if allGraficasAreWide() && currentDescripcion()}
			<div class="flex flex-col lg:flex-row gap-8">
				<div class="lg:w-1/3 space-y-4">
					{@render mapColumnContent()}
				</div>
				<div class="lg:w-2/3">
					<div class="{themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl p-6 shadow-lg h-full">
						<h2 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-xl font-bold mb-3">
							Acerca de este indicador
						</h2>
						<div class="h-px {themeStore.isDark ? 'bg-slate-600' : 'bg-slate-300'} mb-4"></div>
						<div class="{themeStore.isDark ? 'text-slate-300' : 'text-slate-700'} text-sm leading-relaxed space-y-3 whitespace-pre-line">
							{@html currentDescripcion()}
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="{allGraficasAreWide() ? 'lg:w-1/3 space-y-4' : 'lg:w-1/3 lg:self-start space-y-4'}">
				{@render mapColumnContent()}
			</div>
		{/if}

		<!-- Charts column -->
		<div class="{allGraficasAreWide() ? 'w-full' : 'lg:w-2/3'}">
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
								{@const topCharts = getGraficasToShow(indicador).filter(g => allGraficasAreWide() || !isWideGrafica(g))}
								{#if topCharts.length > 0}
									{#if !singleIndicator()}
										<!-- Indicador Header (solo cuando hay múltiples indicadores; el caso de uno solo se renderiza arriba del flex) -->
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
									{/if}

									{#each topCharts as grafica (grafica._key)}
										{@render chartCard(indicador, grafica)}
									{/each}
								{/if}
							{/each}
						</div>
					</section>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Wide charts (tables) section — below the map+narrow row, full width -->
	{#if !allGraficasAreWide()}
		{@const wideByIndicador = Object.entries(groupedIndicadores()).flatMap(([, ejeData]) =>
			ejeData.items
				.map(ind => ({ ind, wide: getGraficasToShow(ind).filter(g => isWideGrafica(g)) }))
				.filter(x => x.wide.length > 0)
		)}
		{#if wideByIndicador.length > 0}
			<div class="mt-8 space-y-8">
				{#each wideByIndicador as {ind, wide}}
					{@const hasNarrow = getGraficasToShow(ind).some(g => !isWideGrafica(g))}
					<div class="space-y-4">
						{#if !hasNarrow}
							<h3 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-xl font-bold">
								{ind.title}
							</h3>
						{/if}
						{#each wide as grafica (grafica._key)}
							{@render chartCard(ind, grafica)}
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
	</div>
</main>

