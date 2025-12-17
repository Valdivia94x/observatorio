import { client, publicationsListQuery, type Publication } from '$lib/sanity';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const publications: Publication[] = await client.fetch(publicationsListQuery);

	return {
		publications
	};
};
