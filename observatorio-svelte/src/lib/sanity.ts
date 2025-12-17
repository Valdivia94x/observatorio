import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

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
}

// Helper para verificar si un año está disponible en una gráfica
export function anioDisponibleEnGrafica(grafica: GraficaWidget, anioBuscado: number): boolean {
	// Caso 1: Tiene rango continuo
	if (grafica.anioInicio && grafica.anioFin) {
		return anioBuscado >= grafica.anioInicio && anioBuscado <= grafica.anioFin;
	}

	// Caso 2: Solo tiene año inicio (dato de un solo año)
	if (grafica.anioInicio && !grafica.anioFin) {
		return anioBuscado === grafica.anioInicio;
	}

	// Caso 3: Fallback a años específicos (datos discontinuos)
	if (grafica.aniosDisponibles?.length) {
		return grafica.aniosDisponibles.includes(anioBuscado);
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
    colores
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
    colores
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
