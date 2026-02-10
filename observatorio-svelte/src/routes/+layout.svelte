<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import VoiceAgent from '$lib/components/VoiceAgent.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { voiceAgentStore } from '$lib/stores/voiceAgent.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { children } = $props();

	// Check if current page is a publication detail page
	const isPublicacionSlug = $derived($page.url.pathname.startsWith('/publicaciones/') && $page.url.pathname !== '/publicaciones/');

	// Registrar callback de navegación para el agente de voz
	onMount(() => {
		voiceAgentStore.setNavigateCallback((path: string) => goto(path));
	});

	// Detectar cambios de ruta y actualizar el contexto del agente de voz
	$effect(() => {
		const pathname = $page.url.pathname;

		if (pathname === '/') {
			voiceAgentStore.setPageContext({ type: 'home' });
		} else if (pathname === '/indicadores') {
			// Contexto base para indicadores (la página lo enriquece con filtros y ejes reales)
			voiceAgentStore.setPageContext({
				type: 'indicadores',
				availableEjes: []
			});
		} else if (pathname === '/publicaciones') {
			// Contexto base para publicaciones (la página lo enriquece con datos reales)
			voiceAgentStore.setPageContext({
				type: 'publicaciones',
				publications: []
			});
		} else if (pathname === '/donar') {
			voiceAgentStore.setPageContext({ type: 'donar' });
		} else if (pathname === '/quienes-somos') {
			voiceAgentStore.setPageContext({ type: 'quienes-somos' });
		}

		// Limpiar gráfica activa al cambiar de página (ya no aplica)
		voiceAgentStore.clearActiveGrafica();
	});
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
