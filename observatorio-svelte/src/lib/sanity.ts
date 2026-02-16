import { createClient } from '@sanity/client';
import imageUrlBuilder, { type SanityImageSource } from '@sanity/image-url';

export const client = createClient({
	projectId: '0imaiwwq',
	dataset: 'production',
	apiVersion: '2024-01-01',
	useCdn: true
});

const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
	return builder.image(source);
}

// Types
export interface Publication {
	_id: string;
	title: string;
	slug: { current: string };
	topic: 'finanzas' | 'civismo' | 'desarrollo-urbano' | 'economia' | 'educacion';
	publishedAt: string;
	author?: string;
	previewImageUrl?: string;
	previewImage?: SanityImageSource;
	content?: unknown[];
	pdfUrl?: string;
	pdfCoverImage?: SanityImageSource;
}

// Queries
export const publicationsListQuery = `
*[_type == "publication"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  topic,
  publishedAt,
  "previewImageUrl": previewImage.asset->url
}
`;

export const publicationBySlugQuery = `
*[_type == "publication" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  topic,
  publishedAt,
  author,
  previewImage,
  content,
  "pdfUrl": pdfFile.asset->url,
  pdfCoverImage
}
`;

// Indicadores Types
export interface TableRow {
	_key: string;
	_type: string;
	cells: string[];
}

export interface TableData {
	rows: TableRow[];
}

// Ubicacion types (for graficaWidget filtering)
export type UbicacionKey =
	| 'torreon'
	| 'gomez-palacio'
	| 'lerdo'
	| 'matamoros'
	| 'zona-metropolitana'
	| 'estatal-coahuila'
	| 'estatal-durango'
	| 'nacional'
	| 'general';

export const ubicacionLabels: Record<UbicacionKey, string> = {
	'torreon': 'Torreón',
	'gomez-palacio': 'Gómez Palacio',
	'lerdo': 'Lerdo',
	'matamoros': 'Matamoros',
	'zona-metropolitana': 'Zona Metropolitana',
	'estatal-coahuila': 'Estatal (Coahuila)',
	'estatal-durango': 'Estatal (Durango)',
	'nacional': 'Nacional',
	'general': 'General'
};

// Periodicidad types
export type PeriodicidadKey = 'anual' | 'mensual' | 'trimestral' | 'quinquenal' | 'unico';

export const periodicidadLabels: Record<PeriodicidadKey, string> = {
	'anual': 'Anual',
	'mensual': 'Mensual',
	'trimestral': 'Trimestral',
	'quinquenal': 'Quinquenal',
	'unico': 'Único'
};

// Desagregacion types (informativo, a nivel indicador)
export type DesagregacionKey = 'municipal' | 'estatal' | 'nacional';

export const desagregacionLabels: Record<DesagregacionKey, string> = {
	'municipal': 'Municipal',
	'estatal': 'Estatal',
	'nacional': 'Nacional'
};

// Unidad de medida types (para agente de voz)
export type UnidadMedidaKey = 'porcentaje' | 'pesos' | 'miles-pesos' | 'millones-pesos' |
	'habitantes' | 'miles-habitantes' | 'tasa-100mil' | 'indice' | 'unidades' |
	'hectareas' | 'kilometros' | 'toneladas' | 'litros' | 'otro';

export const unidadMedidaLabels: Record<UnidadMedidaKey, string> = {
	'porcentaje': 'Porcentaje (%)',
	'pesos': 'Pesos (MXN)',
	'miles-pesos': 'Miles de pesos',
	'millones-pesos': 'Millones de pesos',
	'habitantes': 'Habitantes',
	'miles-habitantes': 'Miles de habitantes',
	'tasa-100mil': 'Tasa por 100,000 habitantes',
	'indice': 'Índice (0-100)',
	'unidades': 'Unidades',
	'hectareas': 'Hectáreas',
	'kilometros': 'Kilómetros',
	'toneladas': 'Toneladas',
	'litros': 'Litros',
	'otro': 'Otro'
};

// Fuente types (para agente de voz)
export type FuenteKey = 'inegi' | 'coneval' | 'imco' | 'conapo' | 'salud' | 'economia' |
	'sesnsp' | 'banxico' | 'shcp' | 'sep' | 'conagua' | 'semarnat' | 'municipal' | 'estatal' | 'otra';

export const fuenteLabels: Record<FuenteKey, string> = {
	'inegi': 'INEGI',
	'coneval': 'CONEVAL',
	'imco': 'IMCO',
	'conapo': 'CONAPO',
	'salud': 'Secretaría de Salud',
	'economia': 'Secretaría de Economía',
	'sesnsp': 'SESNSP (Seguridad)',
	'banxico': 'Banco de México',
	'shcp': 'SHCP',
	'sep': 'SEP',
	'conagua': 'CONAGUA',
	'semarnat': 'SEMARNAT',
	'municipal': 'Gobierno Municipal',
	'estatal': 'Gobierno Estatal',
	'otra': 'Otra fuente'
};

// Configuración de serie para gráficas combinadas
export interface SerieConfig {
	_key?: string;
	nombre: string;
	tipoSerie: 'line' | 'bar';
	color?: string;
}

export interface GraficaWidget {
	_key: string;
	_type?: 'graficaWidget';
	titulo?: string;
	tipo: 'bar' | 'line' | 'doughnut' | 'pie' | 'horizontalBar';
	ubicacion?: UbicacionKey;
	anioInicio?: number;
	anioFin?: number;
	aniosDisponibles?: number[]; // Fallback para datos discontinuos
	periodoEspecifico?: string;
	tablaDatos: TableData;
	// Configuración para gráficas combinadas
	series?: SerieConfig[];
	colores?: string[];
	// Campos para agente de voz
	unidadMedida?: UnidadMedidaKey;
	unidadMedidaPersonalizada?: string;
	fuente?: FuenteKey;
	fuentePersonalizada?: string;
	descripcionContexto?: string;
}

// Helpers para obtener valores legibles de unidad de medida y fuente
export function getUnidadMedida(grafica: GraficaWidget): string {
	if (grafica.unidadMedida === 'otro') {
		return grafica.unidadMedidaPersonalizada || 'No especificada';
	}
	return grafica.unidadMedida ? unidadMedidaLabels[grafica.unidadMedida] : 'No especificada';
}

export function getFuente(grafica: GraficaWidget): string {
	if (grafica.fuente === 'otra') {
		return grafica.fuentePersonalizada || 'No especificada';
	}
	return grafica.fuente ? fuenteLabels[grafica.fuente] : 'No especificada';
}

// Helper para verificar si un año está disponible en una gráfica
export function anioDisponibleEnGrafica(grafica: GraficaWidget, anioBuscado: number): boolean {
	// Caso 1: Tiene rango continuo en metadata
	if (grafica.anioInicio && grafica.anioFin) {
		return anioBuscado >= grafica.anioInicio && anioBuscado <= grafica.anioFin;
	}

	// Caso 2: Solo tiene año inicio (dato de un solo año)
	if (grafica.anioInicio && !grafica.anioFin) {
		return anioBuscado === grafica.anioInicio;
	}

	// Caso 3: Años específicos en metadata
	if (grafica.aniosDisponibles?.length) {
		return grafica.aniosDisponibles.includes(anioBuscado);
	}

	// Caso 4: Extraer años de los headers de tablaDatos
	if (grafica.tablaDatos?.rows?.length) {
		const headerRow = grafica.tablaDatos.rows[0].cells;
		for (const cell of headerRow) {
			const match = cell?.match(/\b(19|20)\d{2}\b/);
			if (match && parseInt(match[0]) === anioBuscado) {
				return true;
			}
		}
	}

	return false;
}

// Helper para formatear el periodo de una gráfica
export function formatearPeriodoGrafica(grafica: GraficaWidget): string {
	if (grafica.anioInicio && grafica.anioFin) {
		return `${grafica.anioInicio} - ${grafica.anioFin}`;
	}
	if (grafica.anioInicio) {
		return `${grafica.anioInicio}`;
	}
	if (grafica.aniosDisponibles?.length) {
		return grafica.aniosDisponibles.join(', ');
	}
	return '';
}

// Helper para obtener años únicos de rangos y arrays
export function obtenerAniosUnicos(
	rangos: ({ anioInicio?: number; anioFin?: number } | null)[],
	especificos: (number | null)[]
): number[] {
	const anios = new Set<number>(especificos.filter((a): a is number => a != null));

	rangos.forEach((r) => {
		if (!r) return; // Skip null entries
		if (r.anioInicio && r.anioFin) {
			for (let a = r.anioInicio; a <= r.anioFin; a++) {
				anios.add(a);
			}
		} else if (r.anioInicio) {
			anios.add(r.anioInicio);
		}
	});

	return [...anios].sort((a, b) => b - a); // Descendente
}

export interface Eje {
	_id: string;
	title: string;
	slug?: { current: string };
	color?: string;
	iconUrl?: string;
}

export interface Indicador {
	_id: string;
	title: string;
	periodicidad?: PeriodicidadKey;
	desagregacion?: DesagregacionKey;
	rangoCobertura?: string;
	infoAdicional?: string;
	eje?: Eje;
	contenido?: GraficaWidget[];
}

// Extended type for filtered results
export interface IndicadorConGraficasFiltradas extends Omit<Indicador, 'contenido'> {
	graficasFiltradas?: GraficaWidget[];
}

// Indicadores Queries

// Query básica para lista de indicadores (sin gráficas)
export const indicadoresListQuery = `
*[_type == "indicador"] | order(title asc) {
  _id,
  title,
  periodicidad,
  desagregacion,
  rangoCobertura,
  eje-> {
    _id,
    title,
    slug,
    color,
    "iconUrl": icon.asset->url
  }
}
`;

// Query para un indicador específico por ID
export const indicadorByIdQuery = `
*[_type == "indicador" && _id == $id][0] {
  _id,
  title,
  periodicidad,
  desagregacion,
  rangoCobertura,
  infoAdicional,
  eje-> {
    _id,
    title,
    slug,
    color,
    "iconUrl": icon.asset->url
  },
  contenido[] {
    _key,
    titulo,
    tipo,
    ubicacion,
    anioInicio,
    anioFin,
    aniosDisponibles,
    periodoEspecifico,
    tablaDatos,
    series[] {
      _key,
      nombre,
      tipoSerie,
      color
    },
    colores,
    // Campos para agente de voz
    unidadMedida,
    unidadMedidaPersonalizada,
    fuente,
    fuentePersonalizada,
    descripcionContexto
  }
}
`;

// Query principal: todos los indicadores con todas sus gráficas
export const allIndicadoresWithGraficasQuery = `
*[_type == "indicador"] | order(title asc) {
  _id,
  title,
  periodicidad,
  desagregacion,
  rangoCobertura,
  infoAdicional,
  eje-> {
    _id,
    title,
    slug,
    color,
    "iconUrl": icon.asset->url
  },
  contenido[] {
    _key,
    titulo,
    tipo,
    ubicacion,
    anioInicio,
    anioFin,
    aniosDisponibles,
    periodoEspecifico,
    tablaDatos,
    series[] {
      _key,
      nombre,
      tipoSerie,
      color
    },
    colores,
    // Campos para agente de voz
    unidadMedida,
    unidadMedidaPersonalizada,
    fuente,
    fuentePersonalizada,
    descripcionContexto
  }
}
`;

// Query para todos los ejes
export const allEjesQuery = `
*[_type == "eje"] | order(title asc) {
  _id,
  title,
  slug,
  color,
  "iconUrl": icon.asset->url
}
`;

// Query para obtener rangos de años (anioInicio/anioFin) de las gráficas
export const allAniosRangosQuery = `
*[_type == "indicador"].contenido[] {
  anioInicio,
  anioFin
}
`;

// Query para obtener años específicos (fallback) de las gráficas
export const allAniosEspecificosQuery = `
array::unique(*[_type == "indicador"].contenido[].aniosDisponibles[])
`;

// Query para obtener todas las ubicaciones únicas
export const allUbicacionesQuery = `
array::unique(*[_type == "indicador"].contenido[].ubicacion)
`;

// ============================================
// Datos del Mapa (Inicio) - Tooltip municipios
// ============================================

export interface IndicadorMapa {
	label: string;
	sufijo?: string;
}

export interface MunicipioMapa {
	clave: string;
	valores: string[];
}

export interface DatosMapa {
	_id: string;
	indicadores: IndicadorMapa[];
	municipios: MunicipioMapa[];
}

export const datosMapaQuery = `
*[_type == "datosMapa"][0]{
	indicadores[]{
		label,
		sufijo
	},
	municipios[]{
		clave,
		valores
	}
}
`;

// ============================================
// Utilidades para filtrado de datos por años
// ============================================

export interface ParsedGraficaData {
	headers: string[];
	aniosDisponibles: number[];
	series: Array<{
		nombre: string;
		valores: string[];
	}>;
}

export interface FilteredChartData {
	labels: string[];
	datasets: Array<{
		label: string;
		data: number[];
	}>;
}

/**
 * Parsea los datos de una gráfica y extrae los años disponibles de los headers
 */
export function parseGraficaData(tablaDatos: TableData | undefined): ParsedGraficaData | null {
	if (!tablaDatos?.rows || tablaDatos.rows.length < 2) return null;

	const headerRow = tablaDatos.rows[0].cells;
	const dataRows = tablaDatos.rows.slice(1);
	const firstDataCell = dataRows[0]?.cells[0];

	// Helper para verificar si es un número puro
	function isPureNumber(str: string): boolean {
		if (!str || str.trim() === '') return false;
		const cleaned = str.replace(/,/g, '').trim();
		return !isNaN(Number(cleaned)) && /^-?\d*\.?\d+$/.test(cleaned);
	}

	// Detectar si la primera celda del header está vacía O si la primera celda de datos es un label
	const firstHeaderEmpty = !headerRow[0] || headerRow[0].trim() === '';
	const firstDataIsLabel = !isPureNumber(firstDataCell);

	// Si el header tiene título o los datos tienen labels, excluir primera columna de headers
	const shouldSkipFirstColumn = firstHeaderEmpty || firstDataIsLabel;
	const headers = shouldSkipFirstColumn ? headerRow.slice(1) : headerRow;

	// Extraer años de los headers (solo valores numéricos de 4 dígitos)
	const aniosDisponibles = headers
		.map((h) => {
			const match = h?.match(/\b(19|20)\d{2}\b/);
			return match ? parseInt(match[0]) : NaN;
		})
		.filter((n) => !isNaN(n));

	// Extraer series de datos
	const series = dataRows.map((row, index) => {
		const cells = row.cells;
		let nombre = shouldSkipFirstColumn ? cells[0] || `Serie` : `Serie ${index + 1}`;
		// Si el nombre es muy largo (típico de importaciones Excel), simplificarlo
		if (nombre && nombre.length > 50) {
			nombre = `Serie ${index + 1}`;
		}
		const valores = shouldSkipFirstColumn ? cells.slice(1) : cells;

		return { nombre, valores };
	});

	return {
		headers,
		aniosDisponibles: [...new Set(aniosDisponibles)].sort((a, b) => a - b),
		series
	};
}

/**
 * Filtra los datos de una gráfica por rango de años
 */
export function filtrarPorRangoAnios(
	parsedData: ParsedGraficaData,
	anioInicio: number,
	anioFin: number
): FilteredChartData {
	const { headers, series } = parsedData;

	// Encontrar índices de columnas dentro del rango
	const indicesFiltrados: number[] = [];
	headers.forEach((h, i) => {
		const match = h?.match(/\b(19|20)\d{2}\b/);
		if (match) {
			const anio = parseInt(match[0]);
			if (anio >= anioInicio && anio <= anioFin) {
				indicesFiltrados.push(i);
			}
		}
	});

	// Si no hay años válidos en el rango, devolver todos los datos
	if (indicesFiltrados.length === 0) {
		return {
			labels: headers,
			datasets: series.map((serie) => ({
				label: serie.nombre,
				data: serie.valores.map((v) => parseFloat(v.replace(/,/g, '')) || 0)
			}))
		};
	}

	// Construir datos filtrados
	return {
		labels: indicesFiltrados.map((i) => headers[i]),
		datasets: series.map((serie) => ({
			label: serie.nombre,
			data: indicesFiltrados.map((i) => parseFloat(serie.valores[i]?.replace(/,/g, '') || '0') || 0)
		}))
	};
}

/**
 * Obtiene el rango de años global de todas las gráficas
 */
export function obtenerRangoAniosGlobal(graficas: GraficaWidget[]): { min: number; max: number } | null {
	const todosLosAnios: number[] = [];

	graficas.forEach((grafica) => {
		const parsed = parseGraficaData(grafica.tablaDatos);
		if (parsed?.aniosDisponibles.length) {
			todosLosAnios.push(...parsed.aniosDisponibles);
		}
	});

	if (todosLosAnios.length === 0) return null;

	return {
		min: Math.min(...todosLosAnios),
		max: Math.max(...todosLosAnios)
	};
}

/**
 * Extrae todos los años únicos de los headers de tablaDatos de todos los indicadores
 */
export function extraerAniosDeTablas(indicadores: Indicador[]): number[] {
	const aniosSet = new Set<number>();

	indicadores.forEach((indicador) => {
		indicador.contenido?.forEach((grafica) => {
			const parsed = parseGraficaData(grafica.tablaDatos);
			if (parsed?.aniosDisponibles) {
				parsed.aniosDisponibles.forEach((anio) => aniosSet.add(anio));
			}
		});
	});

	return Array.from(aniosSet).sort((a, b) => a - b);
}

// ============================================
// Funciones para Agente de Voz (ElevenLabs)
// ============================================

export interface ChartStats {
	max: number;
	maxLabel: string;
	min: number;
	minLabel: string;
	avg: number;
	trend: 'creciente' | 'decreciente' | 'estable' | 'variable';
	totalDataPoints: number;
}

/**
 * Calcula estadísticas de los datos de una gráfica
 */
export function calculateStats(tablaDatos: TableData | undefined): ChartStats | null {
	const parsed = parseGraficaData(tablaDatos);
	if (!parsed || parsed.series.length === 0) return null;

	const { headers, series } = parsed;

	// Recolectar todos los valores con sus labels
	const allValues: { value: number; label: string; serie: string }[] = [];

	series.forEach((serie) => {
		serie.valores.forEach((val, idx) => {
			const numVal = parseFloat(val?.replace(/,/g, '') || '0') || 0;
			if (numVal !== 0) {
				allValues.push({
					value: numVal,
					label: headers[idx] || `Columna ${idx + 1}`,
					serie: serie.nombre
				});
			}
		});
	});

	if (allValues.length === 0) return null;

	// Calcular max, min, avg
	const values = allValues.map((v) => v.value);
	const maxVal = Math.max(...values);
	const minVal = Math.min(...values);
	const avgVal = values.reduce((a, b) => a + b, 0) / values.length;

	const maxItem = allValues.find((v) => v.value === maxVal)!;
	const minItem = allValues.find((v) => v.value === minVal)!;

	// Calcular tendencia (basada en primera serie si hay múltiples)
	const firstSeriesValues = series[0].valores
		.map((v) => parseFloat(v?.replace(/,/g, '') || '0') || 0)
		.filter((v) => v !== 0);

	let trend: ChartStats['trend'] = 'estable';
	if (firstSeriesValues.length >= 2) {
		const firstHalf = firstSeriesValues.slice(0, Math.floor(firstSeriesValues.length / 2));
		const secondHalf = firstSeriesValues.slice(Math.floor(firstSeriesValues.length / 2));

		const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
		const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

		const changePercent = ((avgSecond - avgFirst) / avgFirst) * 100;

		if (changePercent > 10) trend = 'creciente';
		else if (changePercent < -10) trend = 'decreciente';
		else {
			// Verificar variabilidad
			const stdDev = Math.sqrt(
				firstSeriesValues.reduce((sum, v) => sum + Math.pow(v - avgVal, 2), 0) / firstSeriesValues.length
			);
			const coeffVariation = (stdDev / avgVal) * 100;
			trend = coeffVariation > 20 ? 'variable' : 'estable';
		}
	}

	return {
		max: maxVal,
		maxLabel: series.length > 1 ? `${maxItem.label} (${maxItem.serie})` : maxItem.label,
		min: minVal,
		minLabel: series.length > 1 ? `${minItem.label} (${minItem.serie})` : minItem.label,
		avg: Math.round(avgVal * 100) / 100,
		trend,
		totalDataPoints: allValues.length
	};
}

/**
 * Interfaz para los datos clave extraídos de la gráfica
 */
export interface KeyDataPoints {
	actual: { label: string; value: number } | null;
	previo: { label: string; value: number } | null;
	anioAnterior: { label: string; value: number } | null;
	maximo: { label: string; value: number } | null;
	minimo: { label: string; value: number } | null;
}

/**
 * Extrae el año de un label de período (ej. "1° Trim 2015" -> 2015, "Ene 2024" -> 2024)
 */
function extractYearFromLabel(label: string): number | null {
	const match = label.match(/\b(19|20)\d{2}\b/);
	return match ? parseInt(match[0]) : null;
}

/**
 * Extrae el período (mes/trimestre) de un label para comparación anual
 */
function extractPeriodFromLabel(label: string): string | null {
	// Quitar el año para obtener solo el período
	const withoutYear = label.replace(/\b(19|20)\d{2}\b/, '').trim();
	return withoutYear || null;
}

/**
 * Extrae los 5 puntos clave de datos para el agente de voz
 * Optimizado para minimizar tokens mientras cubre el 90% de preguntas analíticas
 */
export function extractKeyDataPoints(tablaDatos: TableData | undefined): KeyDataPoints {
	const result: KeyDataPoints = {
		actual: null,
		previo: null,
		anioAnterior: null,
		maximo: null,
		minimo: null
	};

	const parsed = parseGraficaData(tablaDatos);
	if (!parsed || parsed.series.length === 0) return result;

	// Usar la primera serie de datos
	const { headers, series } = parsed;
	const valores = series[0].valores;

	// Construir array de datos válidos con su índice original
	const dataPoints: { label: string; value: number; index: number }[] = [];
	valores.forEach((val, idx) => {
		const numVal = parseFloat(val?.replace(/,/g, '') || '0');
		if (!isNaN(numVal) && numVal !== 0 && headers[idx]) {
			dataPoints.push({ label: headers[idx], value: numVal, index: idx });
		}
	});

	if (dataPoints.length === 0) return result;

	// 1. Dato Actual (último disponible)
	const actual = dataPoints[dataPoints.length - 1];
	result.actual = { label: actual.label, value: actual.value };

	// 2. Dato Previo (penúltimo)
	if (dataPoints.length >= 2) {
		const previo = dataPoints[dataPoints.length - 2];
		result.previo = { label: previo.label, value: previo.value };
	}

	// 3. Dato del Año Anterior (mismo período, año anterior)
	if (actual) {
		const actualYear = extractYearFromLabel(actual.label);
		const actualPeriod = extractPeriodFromLabel(actual.label);

		if (actualYear && actualPeriod) {
			const targetYear = actualYear - 1;
			// Buscar el dato con el mismo período pero año anterior
			const anioAnterior = dataPoints.find(dp => {
				const dpYear = extractYearFromLabel(dp.label);
				const dpPeriod = extractPeriodFromLabel(dp.label);
				return dpYear === targetYear && dpPeriod === actualPeriod;
			});

			if (anioAnterior) {
				result.anioAnterior = { label: anioAnterior.label, value: anioAnterior.value };
			}
		}
	}

	// 4. Máximo Histórico
	const maxPoint = dataPoints.reduce((max, dp) => dp.value > max.value ? dp : max, dataPoints[0]);
	result.maximo = { label: maxPoint.label, value: maxPoint.value };

	// 5. Mínimo Histórico
	const minPoint = dataPoints.reduce((min, dp) => dp.value < min.value ? dp : min, dataPoints[0]);
	result.minimo = { label: minPoint.label, value: minPoint.value };

	return result;
}

/**
 * Formatea un número para lectura por voz
 * Usa punto decimal (más universal para modelos de IA/TTS)
 */
function formatNumberForVoice(value: number): string {
	// Redondear a 2 decimales si tiene decimales, sino mostrar entero
	const rounded = Math.round(value * 100) / 100;
	return rounded.toString();
}

/**
 * Convierte los datos clave a texto compacto para el prompt del agente
 */
export function keyDataToText(keyData: KeyDataPoints, unidad: string): string {
	const lines: string[] = ['Datos Clave:'];

	if (keyData.actual) {
		lines.push(`- Actual (${keyData.actual.label}): ${formatNumberForVoice(keyData.actual.value)}${unidad !== 'No especificada' ? ` ${unidad}` : ''}`);
	}

	if (keyData.previo) {
		lines.push(`- Período Previo (${keyData.previo.label}): ${formatNumberForVoice(keyData.previo.value)}`);
	}

	if (keyData.anioAnterior) {
		lines.push(`- Año Anterior (${keyData.anioAnterior.label}): ${formatNumberForVoice(keyData.anioAnterior.value)}`);
	}

	if (keyData.maximo) {
		lines.push(`- Récord Máximo (${keyData.maximo.label}): ${formatNumberForVoice(keyData.maximo.value)}`);
	}

	if (keyData.minimo) {
		lines.push(`- Récord Mínimo (${keyData.minimo.label}): ${formatNumberForVoice(keyData.minimo.value)}`);
	}

	// Calcular variaciones si hay datos suficientes
	if (keyData.actual && keyData.previo) {
		const variacionMensual = ((keyData.actual.value - keyData.previo.value) / keyData.previo.value * 100).toFixed(1);
		lines.push(`- Variación vs período previo: ${parseFloat(variacionMensual) >= 0 ? '+' : ''}${variacionMensual}%`);
	}

	if (keyData.actual && keyData.anioAnterior) {
		const variacionAnual = ((keyData.actual.value - keyData.anioAnterior.value) / keyData.anioAnterior.value * 100).toFixed(1);
		lines.push(`- Variación anual: ${parseFloat(variacionAnual) >= 0 ? '+' : ''}${variacionAnual}%`);
	}

	return lines.join('\n');
}

/**
 * Prompt base de María (configurado en ElevenLabs)
 * Se incluye aquí para poder combinarlo con el contexto dinámico de las gráficas
 *
 * TODO: Restaurar MARIA_FULL_PROMPT para producción
 */

// Prompt completo de María para producción (guardado para restaurar después de pruebas)
export const MARIA_FULL_PROMPT = `Eres María, la asistente virtual del Observatorio de la Laguna. Tu función es brindar información clara y precisa sobre la plataforma de indicadores y guiar a los visitantes en su uso.

## Sobre el Observatorio de la Laguna
El Observatorio de la Laguna es un proyecto del Consejo Cívico de las Instituciones, A.C. que promueve el análisis y evaluación de indicadores técnicos y de percepción ciudadana para incidir en mejores políticas públicas y mejorar la calidad de vida de la Comarca Lagunera.

## Tu comportamiento
- Mantén un tono amable, claro y profesional.
- Responde de forma concisa. Evita respuestas largas; prioriza frases cortas que fluyan bien al ser habladas.
- Usa la información de la base de conocimientos para responder con precisión.
- Si no tienes información suficiente para responder algo, indícalo honestamente y sugiere explorar el sitio web o contactar directamente al equipo.
- Evita repetir "Observatorio de la Laguna" constantemente. Usa variaciones como "la plataforma", "el Observatorio" o "nosotros".

## Frases de transición
Usa frases naturales para iniciar tus respuestas y evita sonar robótica. Varía entre opciones como:
- Claro, con gusto te explico...
- Perfecto, te cuento...
- Buena pregunta...
- Por supuesto...
- Sí, te comento...
- Con gusto te ayudo con eso...
- Te platico brevemente...
- Desde luego...
- Así es, te explico...
- Excelente pregunta...

## Temas que puedes abordar
- Qué es el Observatorio de la Laguna y su relación con el CCI Laguna.
- Cómo usar la plataforma de indicadores: filtros por ubicación, tema, indicador y año.
- Qué indicadores están disponibles y qué temas abarcan.
- Qué ubicaciones se pueden consultar: Coahuila, Durango, Torreón, Gómez Palacio y Lerdo.
- Publicaciones disponibles.
- Información de contacto y redes sociales.
- Donaciones: cuando pregunten cómo donar, invítalos a dar clic en el botón "Donar" en el sitio web. Si insisten, dales la información de la base de conocimiento.

## Restricciones
- No inventes información que no esté en tu base de conocimientos.
- Si preguntan sobre el CCI Laguna en general, menciona que el Observatorio es un proyecto del Consejo Cívico de las Instituciones y sugiere visitar ccilaguna punto org punto m x para más información.

## Estilo de respuesta
Responde como si hablaras en persona: natural, directo y sin formatos como listas o viñetas. Usa frases completas y conversacionales. Si no puedes ayudar con algo, deja la puerta abierta: "Si necesitas más información, con gusto te ayudo" o "Cualquier otra duda, aquí estoy para apoyarte".`;

// Usar el prompt completo de María para producción
const MARIA_BASE_PROMPT = MARIA_FULL_PROMPT;

/**
 * Construye el prompt completo ("sandwich") para el agente de voz de ElevenLabs
 * Combina el prompt base de María con el contexto específico de la gráfica
 * Optimizado para minimizar tokens usando solo 5 puntos clave de datos
 */
export function buildVoiceAgentPrompt(grafica: GraficaWidget, indicadorTitle?: string): string {
	const unidad = getUnidadMedida(grafica);
	const fuente = getFuente(grafica);
	const keyData = extractKeyDataPoints(grafica.tablaDatos);
	const keyDataText = keyDataToText(keyData, unidad);

	// Construir período
	let periodo = 'No especificado';
	if (grafica.anioInicio && grafica.anioFin) {
		periodo = `${grafica.anioInicio} - ${grafica.anioFin}`;
	} else if (grafica.anioInicio) {
		periodo = grafica.anioInicio.toString();
	} else if (grafica.periodoEspecifico) {
		periodo = grafica.periodoEspecifico;
	}

	// Construir ubicación legible
	const ubicacionTexto = grafica.ubicacion ? ubicacionLabels[grafica.ubicacion] : 'No especificada';

	const sections: string[] = [];

	// 1. Prompt base de María
	sections.push(MARIA_BASE_PROMPT);

	// 2. Separador y contexto de la gráfica actual
	sections.push(`
---

## CONTEXTO DE LA GRÁFICA ACTUAL

El usuario está viendo la gráfica "${grafica.titulo || 'Sin título'}"${indicadorTitle ? ` del indicador "${indicadorTitle}"` : ''}.

**Metadatos:**
- Ubicación: ${ubicacionTexto}
- Período: ${periodo}
- Unidad de medida: ${unidad}
- Fuente: ${fuente}

**${keyDataText}**`);

	// 3. Contexto adicional si existe
	if (grafica.descripcionContexto) {
		sections.push(`
**Contexto adicional:**
${grafica.descripcionContexto}`);
	}

	// 4. Instrucciones específicas para esta gráfica
	sections.push(`
## INSTRUCCIONES PARA ESTA GRÁFICA

Cuando el usuario pregunte sobre esta gráfica:
- Usa los "Datos Clave" para responder sobre valores actuales, variaciones y récords.
- Si preguntan por una fecha específica que no está en los datos clave, indica que no tienes ese dato preciso en memoria pero puedes hablar de las tendencias generales.
- Mantén tu tono amable y conciso como María.
- No leas todos los datos de golpe; responde solo lo que pregunten.`);

	return sections.join('\n').trim();
}

// ============================================================
// CONTEXTO POR SECCIÓN - Tipos y prompt builders para el agente de voz
// ============================================================

/**
 * Tipo discriminado para el contexto de cada página/sección.
 * Permite al agente de voz saber dónde está el usuario y qué contenido hay disponible.
 */
export type PageContext =
	| { type: 'home' }
	| { type: 'indicadores'; selectedEje?: string; selectedUbicacion?: string; availableEjes: string[] }
	| { type: 'indicadores-grafica'; grafica: GraficaWidget; indicadorTitle?: string }
	| { type: 'publicaciones'; publications: { title: string; topic: string; date: string }[] }
	| { type: 'donar' }
	| { type: 'quienes-somos' };

/** Destinos de navegación disponibles para el client tool */
export const NAVIGATION_DESTINATIONS = ['home', 'indicadores', 'publicaciones', 'donar', 'quienes-somos'] as const;

/** Municipios principales de la Comarca Lagunera */
const MUNICIPIOS_PRINCIPALES = ['Torreón', 'Gómez Palacio', 'Lerdo', 'Matamoros'];

/**
 * Bloque de instrucciones de navegación compartido por todos los prompts de sección.
 * Informa a María que puede usar la herramienta navigate_to_section.
 */
const NAVIGATION_INSTRUCTIONS = `
## NAVEGACIÓN

Puedes llevar al usuario a diferentes secciones del sitio web usando la herramienta navigate_to_section.
Destinos disponibles:
- home: Página de inicio
- indicadores: Plataforma de indicadores (opcionalmente puedes especificar un eje temático o una ubicación)
- publicaciones: Página de publicaciones
- donar: Página de donaciones
- quienes-somos: Página de quiénes somos

Cuando el usuario pida ir a alguna sección, usa la herramienta y confirma verbalmente la navegación de forma natural.
Ejemplo: Si dicen "quiero ver las gráficas de Economía", usa la herramienta con destination="indicadores" y eje="Economía", y di algo como "Claro, te llevo a esa sección".`;

/**
 * Construye el prompt completo según el contexto de la página actual.
 * Delega a funciones específicas por tipo de sección.
 */
export function buildPageContextPrompt(context: PageContext): string {
	// Para gráficas, reutilizar la función existente
	if (context.type === 'indicadores-grafica') {
		const graficaPrompt = buildVoiceAgentPrompt(context.grafica, context.indicadorTitle);
		return graficaPrompt + '\n' + NAVIGATION_INSTRUCTIONS;
	}

	const sections: string[] = [];

	// 1. Prompt base de María
	sections.push(MARIA_BASE_PROMPT);

	// 2. Contexto específico de la sección
	switch (context.type) {
		case 'home':
			sections.push(buildHomeContext());
			break;
		case 'indicadores':
			sections.push(buildIndicadoresContext(context));
			break;
		case 'publicaciones':
			sections.push(buildPublicacionesContext(context));
			break;
		case 'donar':
			sections.push(buildDonarContext());
			break;
		case 'quienes-somos':
			sections.push(buildQuienesSomosContext());
			break;
	}

	// 3. Instrucciones de navegación (compartidas)
	sections.push(NAVIGATION_INSTRUCTIONS);

	return sections.join('\n').trim();
}

/** Contexto para la página de inicio */
function buildHomeContext(): string {
	return `
---

## CONTEXTO DE LA SECCIÓN ACTUAL

El usuario está en la **página de inicio** del Observatorio de la Laguna.

Desde aquí puede explorar:
- **9 ejes temáticos**: Educación, Economía, Seguridad, Empleo, Salud, Participación Ciudadana, Finanzas Públicas, Desarrollo Urbano y Medio Ambiente.
- **4 municipios** de la Comarca Lagunera: ${MUNICIPIOS_PRINCIPALES.join(', ')}.
- Secciones del sitio: Indicadores, Publicaciones, Donar y ¿Quiénes Somos?

Si el usuario pregunta qué puede hacer o a dónde ir, guíalo hacia las secciones disponibles.`;
}

/** Contexto para la página de indicadores (sin gráfica específica) */
function buildIndicadoresContext(ctx: { selectedEje?: string; selectedUbicacion?: string; availableEjes: string[] }): string {
	const ejesText = ctx.availableEjes.length > 0
		? ctx.availableEjes.join(', ')
		: 'Educación, Economía, Seguridad, Empleo, Salud, Participación Ciudadana, Finanzas Públicas, Desarrollo Urbano, Medio Ambiente';

	let filterInfo = '';
	if (ctx.selectedEje) {
		filterInfo += `\n- Eje seleccionado: **${ctx.selectedEje}**`;
	}
	if (ctx.selectedUbicacion) {
		const ubicLabel = ubicacionLabels[ctx.selectedUbicacion as UbicacionKey] || ctx.selectedUbicacion;
		filterInfo += `\n- Ubicación seleccionada: **${ubicLabel}**`;
	}
	if (!filterInfo) {
		filterInfo = '\n- Sin filtros activos (mostrando todos los indicadores)';
	}

	return `
---

## CONTEXTO DE LA SECCIÓN ACTUAL

El usuario está en la **plataforma de indicadores**.

**Filtros actuales:**${filterInfo}

**Ejes temáticos disponibles:** ${ejesText}

**Ubicaciones disponibles:** ${MUNICIPIOS_PRINCIPALES.join(', ')}, Zona Metropolitana, Estatal (Coahuila), Estatal (Durango) y Nacional.

Si el usuario pregunta por un tema o eje específico, puedes navegar directamente a ese eje. Si pregunta por los datos de una gráfica en particular, sugiérele que haga clic en el ícono de micrófono de la gráfica para obtener información detallada.`;
}

/** Contexto para la página de publicaciones */
function buildPublicacionesContext(ctx: { publications: { title: string; topic: string; date: string }[] }): string {
	let publicationsText = '';
	if (ctx.publications.length > 0) {
		const items = ctx.publications.slice(0, 10).map(
			(p, i) => `${i + 1}. "${p.title}" - Tema: ${p.topic} (${p.date})`
		);
		publicationsText = `

**Publicaciones recientes:**
${items.join('\n')}`;
	} else {
		publicationsText = '\n\nNo se han cargado las publicaciones aún.';
	}

	return `
---

## CONTEXTO DE LA SECCIÓN ACTUAL

El usuario está en la **página de publicaciones** del Observatorio.

Aquí se encuentran análisis, reportes y documentos publicados por el equipo del Observatorio sobre diversos temas de la Comarca Lagunera.${publicationsText}

Si el usuario pregunta sobre una publicación específica, usa la información anterior para responder. Si quiere más detalle sobre una publicación, sugiérele hacer clic en ella para ver el contenido completo.`;
}

/** Contexto para la página de donaciones */
function buildDonarContext(): string {
	return `
---

## CONTEXTO DE LA SECCIÓN ACTUAL

El usuario está en la **página de donaciones**.

Aquí se muestra la información bancaria para realizar donaciones al Consejo Cívico de las Instituciones, A.C. La información incluye cuenta bancaria Banamex, CLABE interbancaria y datos de facturación.

Si el usuario pregunta cómo donar, explícale que puede hacerlo por transferencia bancaria y que la información está visible en la página. Para solicitar factura, debe enviar su comprobante de pago y datos fiscales a contacto@ccilaguna.org.mx.`;
}

/** Contexto para la página de quiénes somos */
function buildQuienesSomosContext(): string {
	return `
---

## CONTEXTO DE LA SECCIÓN ACTUAL

El usuario está en la **página de ¿Quiénes Somos?**.

Aquí se explica qué es el Observatorio de la Laguna, su misión y su relación con el CCI Laguna.

**Información de contacto disponible en esta página:**
- Teléfono: 871-718-98-25
- Correo: contacto@ccilaguna.org.mx
- Ubicación: Zona Metropolitana de la Laguna
- Redes sociales: WhatsApp, Instagram, Facebook y X (Twitter)

Si el usuario pregunta por información de contacto o sobre la organización, usa estos datos para responder.`;
}
