<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
</script>

<main class="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 py-12 overflow-hidden md:-mt-14 md:-mb-10">
	<!-- Background image -->
	<div class="absolute inset-0">
		<img
			src="/images/SSPublicacionesCCI.png"
			alt=""
			class="w-full h-full object-cover object-top"
		/>
		<!-- Gradient overlay -->
		<div class="absolute inset-0 {themeStore.isDark
			? 'bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/75'
			: 'bg-gradient-to-b from-white/50 via-white/30 to-white/60'}">
		</div>
	</div>

	<!-- Content -->
	<div class="relative z-10 max-w-2xl w-full text-center">
		<h1 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-4xl md:text-5xl font-bold mb-12 drop-shadow-sm">
			PUBLICACIONES
		</h1>

		<div class="{themeStore.isDark
				? 'bg-slate-800/60 border-slate-600/50'
				: 'bg-white/70 border-white/50'}
				border rounded-2xl p-10 md:p-14 text-center backdrop-blur-md shadow-2xl">
			<!-- Icon -->
			<div class="mb-6">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-orange-500 drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
				</svg>
			</div>

			<p class="{themeStore.isDark ? 'text-slate-200' : 'text-slate-700'} text-xl md:text-2xl font-semibold mb-8 leading-relaxed">
				A partir de ahora nuestras publicaciones estaran en el portal del CCI
			</p>

			<a
				href="https://www.ccilaguna.org.mx/publicaciones"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
			>
				Click para mas informacion
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
				</svg>
			</a>
		</div>
	</div>
</main>
