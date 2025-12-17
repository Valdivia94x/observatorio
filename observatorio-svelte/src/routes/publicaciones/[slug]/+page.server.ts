import { client, publicationBySlugQuery, type Publication } from '$lib/sanity';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const publication: Publication | null = await client.fetch(publicationBySlugQuery, {
		slug: params.slug
	});

	if (!publication) {
		throw error(404, 'Publicación no encontrada');
	}

	return {
		publication
	};
};
