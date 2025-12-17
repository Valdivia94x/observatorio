<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
</script>

<!-- Main Content -->
<main class="max-w-4xl mx-auto px-6 py-12">
	<h1 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-4xl md:text-5xl font-bold mb-4 text-center">
		¿QUIÉNES SOMOS?
	</h1>

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
