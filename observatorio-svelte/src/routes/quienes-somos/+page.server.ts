import { client, carouselSlidesQuery, type CarouselSlide } from '$lib/sanity';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const slides = await client.fetch<CarouselSlide[]>(carouselSlidesQuery);

	return {
		slides: slides ?? []
	};
};
