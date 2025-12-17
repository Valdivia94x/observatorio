<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
</script>

<!-- Sticky Navbar -->
<div class="sticky top-0 z-50">
	<header class="flex items-center justify-between px-4 lg:px-8 xl:px-12 py-4 backdrop-blur-xl backdrop-saturate-180 {themeStore.isDark ? 'bg-slate-800/70 border-slate-700/50' : 'bg-slate-100/70 border-slate-300/50'} border-b shadow-lg transition-all duration-300">
		<!-- Logo -->
		<a href="/" class="flex items-center gap-3 ml-2 lg:ml-4 xl:ml-8 shrink-0">
			<img
				src="/images/{themeStore.isDark ? 'logoOscuro' : 'logo'}.png"
				alt="Observatorio de la Laguna"
				class="h-12 lg:h-14 xl:h-16 w-auto"
			/>
		</a>

		<!-- Mobile Menu Button -->
		<button
			onclick={toggleMobileMenu}
			aria-label="Abrir menú"
			class="lg:hidden p-2 rounded-lg {themeStore.isDark ? 'text-white hover:bg-slate-700' : 'text-slate-800 hover:bg-slate-200'} transition-colors"
		>
			{#if mobileMenuOpen}
				<!-- X Icon -->
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			{:else}
				<!-- Hamburger Icon -->
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			{/if}
		</button>

		<!-- Desktop Navigation -->
		<nav class="hidden lg:flex items-center gap-4 xl:gap-6">
			<a href="/" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400 font-medium tracking-wide text-sm xl:text-base whitespace-nowrap">
				INICIO
			</a>
			<span class="{themeStore.isDark ? 'text-slate-500' : 'text-slate-400'}">|</span>
			<a href="/quienes-somos" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400 font-medium tracking-wide text-sm xl:text-base whitespace-nowrap">
				¿QUIÉNES SOMOS?
			</a>
			<span class="{themeStore.isDark ? 'text-slate-500' : 'text-slate-400'}">|</span>
			<a href="/indicadores" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400 font-medium tracking-wide text-sm xl:text-base whitespace-nowrap">
				INDICADORES
			</a>
			<span class="{themeStore.isDark ? 'text-slate-500' : 'text-slate-400'}">|</span>
			<a href="/publicaciones" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400 font-medium tracking-wide text-sm xl:text-base whitespace-nowrap">
				PUBLICACIONES
			</a>

			<!-- Social Icons -->
			<div class="flex items-center gap-2 xl:gap-3 ml-2 xl:ml-4">
				<a href="https://wa.me/528717189825" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400">
					<img src="/images/icons/whatsapp.svg" alt="WhatsApp" class="w-6 h-6 xl:w-7 xl:h-7 {themeStore.isDark ? 'invert' : ''}" />
				</a>
				<a href="https://instagram.com/observatorio_laguna" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400">
					<img src="/images/icons/instagram.svg" alt="Instagram" class="w-6 h-6 xl:w-7 xl:h-7 {themeStore.isDark ? 'invert' : ''}" />
				</a>
				<a href="https://facebook.com/observatoriodelaLaguna" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400">
					<img src="/images/icons/facebook.svg" alt="Facebook" class="w-6 h-6 xl:w-7 xl:h-7 {themeStore.isDark ? 'invert' : ''}" />
				</a>
				<a href="https://x.com/ObservatorioLag" target="_blank" rel="noopener noreferrer" aria-label="X" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400">
					<img src="/images/icons/X.svg" alt="X" class="w-6 h-6 xl:w-7 xl:h-7 {themeStore.isDark ? 'invert' : ''}" />
				</a>
			</div>

			<!-- Donate Button -->
			<a
				href="/donar"
				class="ml-2 xl:ml-4 px-4 xl:px-6 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold tracking-wide text-sm xl:text-base rounded-full shadow-lg hover:from-orange-500 hover:to-amber-600 transition-all duration-300 whitespace-nowrap"
			>
				DONAR
			</a>
		</nav>
	</header>

	<!-- Mobile Menu Dropdown -->
	{#if mobileMenuOpen}
		<nav class="lg:hidden {themeStore.isDark ? 'bg-slate-800/95' : 'bg-slate-100/95'} backdrop-blur-lg border-b {themeStore.isDark ? 'border-slate-700' : 'border-slate-300'} px-4 py-4">
			<div class="flex flex-col gap-4">
				<a
					href="/"
					onclick={() => mobileMenuOpen = false}
					class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400 font-medium tracking-wide py-2"
				>
					INICIO
				</a>
				<a
					href="/quienes-somos"
					onclick={() => mobileMenuOpen = false}
					class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400 font-medium tracking-wide py-2"
				>
					¿QUIÉNES SOMOS?
				</a>
				<a
					href="/indicadores"
					onclick={() => mobileMenuOpen = false}
					class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400 font-medium tracking-wide py-2"
				>
					INDICADORES
				</a>
				<a
					href="/publicaciones"
					onclick={() => mobileMenuOpen = false}
					class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400 font-medium tracking-wide py-2"
				>
					PUBLICACIONES
				</a>

				<!-- Donate Button Mobile -->
				<a
					href="/donar"
					onclick={() => mobileMenuOpen = false}
					class="text-center px-6 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold tracking-wide rounded-full shadow-lg hover:from-orange-500 hover:to-amber-600 transition-all duration-300"
				>
					DONAR
				</a>

				<!-- Social Icons & Dark Mode Toggle -->
				<div class="flex items-center justify-between pt-4 border-t {themeStore.isDark ? 'border-slate-700' : 'border-slate-300'}">
					<div class="flex items-center gap-4">
						<a href="https://wa.me/528717189825" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400">
							<img src="/images/icons/whatsapp.svg" alt="WhatsApp" class="w-7 h-7 {themeStore.isDark ? 'invert' : ''}" />
						</a>
						<a href="https://instagram.com/caboratoriodelaLaguna" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400">
							<img src="/images/icons/instagram.svg" alt="Instagram" class="w-7 h-7 {themeStore.isDark ? 'invert' : ''}" />
						</a>
						<a href="https://facebook.com/observatoriodelaLaguna" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400">
							<img src="/images/icons/facebook.svg" alt="Facebook" class="w-7 h-7 {themeStore.isDark ? 'invert' : ''}" />
						</a>
						<a href="https://x.com/observaborioLaguna" target="_blank" rel="noopener noreferrer" aria-label="X" class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} hover:text-orange-400">
							<img src="/images/icons/X.svg" alt="X" class="w-7 h-7 {themeStore.isDark ? 'invert' : ''}" />
						</a>
					</div>

					<!-- Mobile Dark Mode Toggle -->
					<div class="flex items-center gap-2">
						<span class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-xs">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
						</span>
						<button
							onclick={() => themeStore.toggle()}
							aria-label="Cambiar modo de color"
							class="relative w-12 h-6 rounded-full transition-colors {themeStore.isDark ? 'bg-slate-600' : 'bg-slate-300'}"
						>
							<span
								class="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform {themeStore.isDark ? 'left-7' : 'left-1'}"
							></span>
						</button>
						<span class="{themeStore.isDark ? 'text-white' : 'text-slate-600'} text-xs">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
							</svg>
						</span>
					</div>
				</div>
			</div>
		</nav>
	{/if}

	<!-- Dark Mode Toggle - debajo del navbar, sin efecto glass -->
	<div class="hidden md:flex justify-end px-12 py-2">
		<div class="flex items-center gap-3 {themeStore.isDark ? 'bg-slate-700/50' : 'bg-slate-200/70'} rounded-full px-4 py-1.5">
			<span class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-xs font-medium">MODO CLARO</span>
			<button
				onclick={() => themeStore.toggle()}
				aria-label="Cambiar modo de color"
				class="relative w-14 h-7 rounded-full transition-colors {themeStore.isDark ? 'bg-slate-600' : 'bg-slate-300'}"
			>
				<span
					class="absolute top-1 w-5 h-5 rounded-full bg-white transition-transform {themeStore.isDark ? 'left-8' : 'left-1'}"
				></span>
			</button>
			<span class="{themeStore.isDark ? 'text-white' : 'text-slate-600'} text-xs font-medium">MODO OSCURO</span>
		</div>
	</div>
</div>
