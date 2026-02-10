<script lang="ts">
	import { onMount } from 'svelte';
	import { voiceAgentStore } from '$lib/stores/voiceAgent.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';

	// Mapa de etiquetas para el indicador de contexto de sección
	const pageContextLabels: Record<string, string> = {
		'home': 'Inicio',
		'indicadores': 'Indicadores',
		'indicadores-grafica': 'Gráfica',
		'publicaciones': 'Publicaciones',
		'donar': 'Donar',
		'quienes-somos': '¿Quiénes Somos?'
	};

	// Estados derivados del store
	const isConnected = $derived(voiceAgentStore.isConnected);
	const isSpeaking = $derived(voiceAgentStore.isSpeaking);
	const isListening = $derived(voiceAgentStore.isListening);
	const isLoading = $derived(voiceAgentStore.isLoading);
	const error = $derived(voiceAgentStore.error);

	// Etiqueta de contexto: prioriza gráfica activa, luego contexto de sección
	const contextLabel = $derived.by(() => {
		if (voiceAgentStore.activeGrafica) {
			return voiceAgentStore.activeGrafica.titulo || 'Gráfica seleccionada';
		}
		const ctx = voiceAgentStore.pageContext;
		if (!ctx) return null;

		// Para indicadores con eje seleccionado, mostrar el eje
		if (ctx.type === 'indicadores' && ctx.selectedEje) {
			return `Indicadores: ${ctx.selectedEje}`;
		}

		return pageContextLabels[ctx.type] || null;
	});

	function handleClick() {
		voiceAgentStore.toggleConversation();
	}

	// Limpiar al desmontar
	onMount(() => {
		return () => {
			voiceAgentStore.cleanup();
		};
	});
</script>

<!-- Floating Voice Agent Button -->
<div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
	<!-- Context indicator -->
	{#if contextLabel && !isConnected && !isLoading}
		<div
			class="px-3 py-1.5 rounded-full text-xs font-medium shadow-lg animate-fade-in max-w-[200px] truncate
				{themeStore.isDark ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-700'}"
		>
			{contextLabel}
		</div>
	{/if}

	<!-- Error message -->
	{#if error}
		<div class="px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/90 text-white shadow-lg max-w-[250px]">
			{error}
		</div>
	{/if}

	<!-- Main button -->
	<button
		onclick={handleClick}
		disabled={isLoading}
		class="relative w-14 h-14 rounded-full shadow-xl transition-all duration-300
			flex items-center justify-center
			{isConnected
			? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
			: 'bg-gradient-to-br from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600'}
			{isLoading ? 'opacity-70 cursor-wait' : 'hover:scale-105 active:scale-95'}
			{isSpeaking || isListening ? 'ring-4 ring-offset-2 ring-offset-slate-900' : ''}
			{isSpeaking ? 'ring-orange-400' : ''}
			{isListening ? 'ring-green-400' : ''}"
		aria-label={isConnected ? 'Terminar conversación' : 'Iniciar conversación de voz'}
	>
		{#if isLoading}
			<!-- Loading spinner -->
			<svg class="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{:else if isConnected}
			<!-- Stop icon -->
			<svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
				<rect x="6" y="6" width="12" height="12" rx="2" />
			</svg>
		{:else}
			<!-- Microphone icon -->
			<svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
				<path
					d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 2.76 2.24 5 5 5s5-2.24 5-5h2c0 4.08-3.06 7.44-7 7.93V19h4v2H8v-2h4v-3.07z"
				/>
			</svg>
		{/if}

		<!-- Pulse animation when listening -->
		{#if isListening}
			<span class="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30"></span>
		{/if}

		<!-- Pulse animation when speaking -->
		{#if isSpeaking}
			<span class="absolute inset-0 rounded-full bg-orange-400 animate-pulse opacity-30"></span>
		{/if}
	</button>

	<!-- Status text -->
	{#if isConnected}
		<span
			class="text-xs font-medium px-2 py-0.5 rounded-full
				{isSpeaking ? 'bg-orange-500/20 text-orange-400' : ''}
				{isListening ? 'bg-green-500/20 text-green-400' : ''}
				{!isSpeaking && !isListening ? 'bg-slate-500/20 text-slate-400' : ''}"
		>
			{#if isSpeaking}
				Hablando...
			{:else if isListening}
				Escuchando...
			{:else}
				Conectado
			{/if}
		</span>
	{/if}
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.3s ease-out;
	}
</style>
