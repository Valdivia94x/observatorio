<script lang="ts">
	import './layout.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import VoiceAgent from '$lib/components/VoiceAgent.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { page } from '$app/stores';

	let { children } = $props();

	// Check if current page is a publication detail page
	const isPublicacionSlug = $derived($page.url.pathname.startsWith('/publicaciones/') && $page.url.pathname !== '/publicaciones/');
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/images/favicon.png" />
</svelte:head>

<div class="min-h-screen {themeStore.isDark ? 'bg-slate-800' : 'bg-slate-100'}">
	<Navbar />
	{@render children()}
	<Footer />
</div>

<!-- ElevenLabs Voice Agent (SDK) -->
{#if !isPublicacionSlug}
	<VoiceAgent />
{/if}
