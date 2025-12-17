import LinkMark from './LinkMark.svelte';
import type { PortableTextComponents } from '@portabletext/svelte';

export const portableTextComponents: PortableTextComponents = {
	marks: {
		link: LinkMark
	}
};
