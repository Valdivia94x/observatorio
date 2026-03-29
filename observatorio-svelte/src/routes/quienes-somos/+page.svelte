<script lang="ts">
	import { onMount } from 'svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let currentSlide = $state(0);
	let slides = $derived(data.slides);
	let intervalId: ReturnType<typeof setInterval>;

	function resetAutoplay() {
		clearInterval(intervalId);
		intervalId = setInterval(nextSlide, 5000);
	}

	function nextSlide() {
		if (slides.length === 0) return;
		currentSlide = (currentSlide + 1) % slides.length;
	}

	function prevSlide() {
		if (slides.length === 0) return;
		currentSlide = (currentSlide - 1 + slides.length) % slides.length;
	}

	function goTo(i: number) {
		currentSlide = i;
		resetAutoplay();
	}

	function handlePrev() {
		prevSlide();
		resetAutoplay();
	}

	function handleNext() {
		nextSlide();
		resetAutoplay();
	}

	onMount(() => {
		intervalId = setInterval(nextSlide, 5000);
		return () => clearInterval(intervalId);
	});
</script>

<!-- Main Content -->
<main class="max-w-4xl mx-auto px-6 py-12">
	<h1 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-4xl md:text-5xl font-bold mb-8 text-center">
		¿QUIÉNES SOMOS?
	</h1>

	<!-- Carousel -->
	{#if slides.length > 0}
		<div class="group relative rounded-3xl overflow-hidden shadow-2xl mb-8 ring-1 ring-white/10">
			<div class="relative aspect-[16/9]">
				{#each slides as slide, i}
					<div
						class="absolute inset-0 transition-all duration-700 ease-in-out {i === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}"
					>
						<img
							src={slide.imageUrl}
							alt={slide.description}
							class="w-full h-full object-cover"
						/>
						<!-- Degradado oscuro -->
						<div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10"></div>
						<!-- Descripción -->
						<div class="absolute bottom-0 left-0 right-0 p-6 md:p-10 transition-all duration-700 {i === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}">
							<p class="text-white text-lg md:text-xl leading-relaxed drop-shadow-lg max-w-2xl">
								{slide.description}
							</p>
						</div>
					</div>
				{/each}
			</div>

			<!-- Controles -->
			{#if slides.length > 1}
				<button
					onclick={handlePrev}
					class="absolute left-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/10 hover:bg-white/25 text-white p-3 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 border border-white/20"
					aria-label="Slide anterior"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<button
					onclick={handleNext}
					class="absolute right-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/10 hover:bg-white/25 text-white p-3 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 border border-white/20"
					aria-label="Siguiente slide"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
					</svg>
				</button>

				<!-- Indicadores con barra de progreso -->
				<div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
					{#each slides as _, i}
						<button
							onclick={() => goTo(i)}
							class="group/dot relative h-1.5 rounded-full transition-all duration-500 overflow-hidden {i === currentSlide ? 'w-8 bg-white' : 'w-3 bg-white/40 hover:bg-white/60'}"
							aria-label="Ir al slide {i + 1}"
						>
							{#if i === currentSlide}
								<span class="absolute inset-0 bg-orange-400 rounded-full animate-[progress_5s_linear]"></span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<div class="{themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl p-8 shadow-lg">
		<p class="{themeStore.isDark ? 'text-slate-300' : 'text-slate-600'} text-lg leading-relaxed mb-8">
			El Observatorio de la Laguna es una plataforma dedicada a recopilar, analizar y difundir indicadores técnicos y de percepción relevantes para la Zona Metropolitana de la Laguna.
		</p>

		<!-- Información de Contacto -->
		<div class="mt-8">
			<h2 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-2xl font-bold mb-6">Información de Contacto</h2>

			<div class="space-y-4">
				<div class="flex items-center gap-4">
					<div class="{themeStore.isDark ? 'bg-orange-400/20' : 'bg-orange-100'} p-3 rounded-full">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
						</svg>
					</div>
					<div>
						<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-500'} text-sm">Teléfono</p>
						<a href="tel:+528717189825" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-lg font-semibold hover:text-orange-400 transition-colors">
							871-718-98-25
						</a>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<div class="{themeStore.isDark ? 'bg-orange-400/20' : 'bg-orange-100'} p-3 rounded-full">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
					</div>
					<div>
						<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-500'} text-sm">Correo electrónico</p>
						<a href="mailto:contacto@ccilaguna.org.mx" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-lg font-semibold hover:text-orange-400 transition-colors">
							contacto@ccilaguna.org.mx
						</a>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<div class="{themeStore.isDark ? 'bg-orange-400/20' : 'bg-orange-100'} p-3 rounded-full">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
					</div>
					<div>
						<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-500'} text-sm">Ubicación</p>
						<p class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-lg font-semibold">
							Zona Metropolitana de la Laguna
						</p>
					</div>
				</div>
			</div>

			<!-- CCI Laguna -->
			<div class="mt-8 pt-6 border-t {themeStore.isDark ? 'border-slate-600' : 'border-slate-200'} flex items-center justify-between gap-4">
				<p class="{themeStore.isDark ? 'text-slate-300' : 'text-slate-600'} text-base">
					Este es un proyecto del <span class="font-bold">Consejo Cívico de las Instituciones de La Laguna</span> <a href="https://ccilaguna-web.vercel.app" target="_blank" rel="noopener noreferrer" class="text-orange-400 hover:text-orange-300 font-semibold transition-colors">(CCI Laguna)</a>.
				</p>
				<a href="https://ccilaguna-web.vercel.app" target="_blank" rel="noopener noreferrer"> <img
						src="/images/{themeStore.isDark ? 'logoOscuroCCI' : 'logoCCI'}.png"
						alt="Logo CCI Laguna"
						class="h-14 w-auto"
					/>
				</a>
			</div>

			<!-- Redes Sociales -->
			<div class="mt-8 pt-6 border-t {themeStore.isDark ? 'border-slate-600' : 'border-slate-200'}">
				<h3 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-lg font-semibold mb-4">Síguenos en redes sociales</h3>
				<div class="flex items-center gap-4">
					<a href="https://wa.me/528717189825" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" class="{themeStore.isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-200 hover:bg-slate-300'} p-3 rounded-full transition-colors">
						<img src="/images/icons/whatsapp.svg" alt="WhatsApp" class="w-6 h-6 {themeStore.isDark ? 'invert' : ''}" />
					</a>
					<a href="https://instagram.com/observatoriodelaLaguna" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="{themeStore.isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-200 hover:bg-slate-300'} p-3 rounded-full transition-colors">
						<img src="/images/icons/instagram.svg" alt="Instagram" class="w-6 h-6 {themeStore.isDark ? 'invert' : ''}" />
					</a>
					<a href="https://facebook.com/observatoriodelaLaguna" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="{themeStore.isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-200 hover:bg-slate-300'} p-3 rounded-full transition-colors">
						<img src="/images/icons/facebook.svg" alt="Facebook" class="w-6 h-6 {themeStore.isDark ? 'invert' : ''}" />
					</a>
					<a href="https://x.com/observatorioLaguna" target="_blank" rel="noopener noreferrer" aria-label="X" class="{themeStore.isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-200 hover:bg-slate-300'} p-3 rounded-full transition-colors">
						<img src="/images/icons/X.svg" alt="X" class="w-6 h-6 {themeStore.isDark ? 'invert' : ''}" />
					</a>
				</div>
			</div>
		</div>
	</div>
</main>

<style>
	@keyframes progress {
		from { width: 0%; }
		to { width: 100%; }
	}
</style>
