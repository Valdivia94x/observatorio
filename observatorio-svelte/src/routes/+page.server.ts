import { client, datosMapaQuery, type DatosMapa } from '$lib/sanity';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const datosMapa = await client.fetch<DatosMapa | null>(datosMapaQuery);

	return {
		datosMapa
	};
};
