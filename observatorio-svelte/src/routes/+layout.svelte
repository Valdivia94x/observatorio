<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { page } from '$app/stores';

	let { children } = $props();

	// Check if current page is a publication detail page
	const isPublicacionSlug = $derived($page.url.pathname.startsWith('/publicaciones/') && $page.url.pathname !== '/publicaciones/');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{#if !isPublicacionSlug}
		<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async></script>
	{/if}
</svelte:head>

<div class="min-h-screen {themeStore.isDark ? 'bg-slate-800' : 'bg-slate-100'}">
	<Navbar />
	{@render children()}
	<Footer />
</div>

<!-- ElevenLabs Voice Agent Widget -->
{#if !isPublicacionSlug}
	<elevenlabs-convai agent-id="agent_3101kcvrzjkcfqgb77rbdj3acpp4"></elevenlabs-convai>
{/if}
