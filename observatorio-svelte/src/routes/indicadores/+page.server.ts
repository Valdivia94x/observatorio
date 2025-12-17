import {
	client,
	allIndicadoresWithGraficasQuery,
	allEjesQuery,
	allAniosRangosQuery,
	allAniosEspecificosQuery,
	allUbicacionesQuery,
	obtenerAniosUnicos,
	type Indicador,
	type Eje,
	type UbicacionKey
} from '$lib/sanity';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [indicadores, allEjes, aniosRangos, aniosEspecificos, allUbicaciones] = await Promise.all([
		client.fetch<Indicador[]>(allIndicadoresWithGraficasQuery),
		client.fetch<Eje[]>(allEjesQuery),
		client.fetch<{ anioInicio?: number; anioFin?: number }[]>(allAniosRangosQuery),
		client.fetch<number[]>(allAniosEspecificosQuery),
		client.fetch<UbicacionKey[]>(allUbicacionesQuery)
	]);

	// Calcular años únicos a partir de rangos y específicos
	const allAnios = obtenerAniosUnicos(aniosRangos || [], aniosEspecificos || []);

	return {
		indicadores,
		allEjes,
		allAnios,
		allUbicaciones: allUbicaciones || []
	};
};
