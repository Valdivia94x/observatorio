<script lang="ts">
	import type { MarkComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		portableText: MarkComponentProps<{
			href?: string;
		}>;
		children: Snippet;
	}

	let { portableText, children }: Props = $props();

	let href = $derived(portableText.value?.href || '#');
	let isExternal = $derived(href.startsWith('http'));
</script>

{#if href}
	<a
		{href}
		target={isExternal ? '_blank' : undefined}
		rel={isExternal ? 'noopener noreferrer' : undefined}
		class="text-orange-400 hover:text-orange-300 underline transition-colors"
	>
		{@render children()}
	</a>
{:else}
	{@render children()}
{/if}
