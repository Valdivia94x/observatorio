<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
	import type { Publication } from '$lib/sanity';

	let { data } = $props();

	const publications: Publication[] = data.publications;
	const ITEMS_PER_PAGE = 12;

	let currentPage = $state(1);

	const totalPages = $derived(Math.ceil(publications.length / ITEMS_PER_PAGE));

	const paginatedPublications = $derived(() => {
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		const endIndex = startIndex + ITEMS_PER_PAGE;
		return publications.slice(startIndex, endIndex);
	});

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('es-MX', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	const topicLabels: Record<string, string> = {
		'finanzas': 'Finanzas',
		'civismo': 'Civismo',
		'desarrollo-urbano': 'Desarrollo Urbano',
		'economia': 'Economía',
		'educacion': 'Educación',
		'seguridad': 'Seguridad',
	};

	const topicColors: Record<string, string> = {
		'finanzas': 'bg-green-500',
		'civismo': 'bg-blue-500',
		'desarrollo-urbano': 'bg-purple-500',
		'economia': 'bg-yellow-500',
		'educacion': 'bg-red-500',
		'seguridad': 'bg-indigo-500',
	};
</script>

<main class="max-w-6xl mx-auto px-6 py-12">
	<h1 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-4xl md:text-5xl font-bold mb-4 text-center">
		PUBLICACIONES
	</h1>
	<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-center mb-12 max-w-2xl mx-auto">
		Explora nuestros análisis, reportes e investigaciones sobre los temas más relevantes de la Zona Metropolitana de la Laguna.
	</p>

	{#if publications.length === 0}
		<div class="text-center py-16">
			<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-lg">
				No hay publicaciones disponibles por el momento.
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each paginatedPublications() as publication}
				<a
					href="/publicaciones/{publication.slug.current}"
					class="{themeStore.isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'} rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
				>
					<!-- Preview Image -->
					<div class="aspect-video overflow-hidden">
						{#if publication.previewImageUrl}
							<img
								src={publication.previewImageUrl}
								alt={publication.title}
								class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
							/>
						{:else}
							<div class="{themeStore.isDark ? 'bg-slate-600' : 'bg-slate-200'} w-full h-full flex items-center justify-center">
								<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 {themeStore.isDark ? 'text-slate-500' : 'text-slate-400'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
								</svg>
							</div>
						{/if}
					</div>

					<!-- Content -->
					<div class="p-5">
						<!-- Topic Badge -->
						{#if publication.topic}
							<span class="{topicColors[publication.topic]} text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
								{topicLabels[publication.topic] || publication.topic}
							</span>
						{/if}

						<!-- Title -->
						<h2 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-lg font-bold mt-3 mb-2 line-clamp-2 group-hover:text-orange-400 transition-colors">
							{publication.title}
						</h2>

						<!-- Date -->
						<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-500'} text-sm">
							{formatDate(publication.publishedAt)}
						</p>
					</div>
				</a>
			{/each}
		</div>

		<!-- Pagination Controls -->
		{#if totalPages > 1}
			<div class="flex justify-center items-center gap-2 mt-12">
				<!-- Previous Button -->
				<button
					onclick={() => goToPage(currentPage - 1)}
					disabled={currentPage === 1}
					class="{themeStore.isDark ? 'bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800' : 'bg-white hover:bg-slate-100 disabled:bg-slate-100'}
						{themeStore.isDark ? 'text-white disabled:text-slate-600' : 'text-slate-700 disabled:text-slate-400'}
						px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed shadow-md"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>

				<!-- Page Numbers -->
				{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
					{#if page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)}
						<button
							onclick={() => goToPage(page)}
							class="{page === currentPage
								? 'bg-orange-500 text-white'
								: themeStore.isDark
									? 'bg-slate-700 hover:bg-slate-600 text-white'
									: 'bg-white hover:bg-slate-100 text-slate-700'}
								w-10 h-10 rounded-lg transition-colors font-semibold shadow-md"
						>
							{page}
						</button>
					{:else if page === currentPage - 2 || page === currentPage + 2}
						<span class="{themeStore.isDark ? 'text-slate-500' : 'text-slate-400'}">...</span>
					{/if}
				{/each}

				<!-- Next Button -->
				<button
					onclick={() => goToPage(currentPage + 1)}
					disabled={currentPage === totalPages}
					class="{themeStore.isDark ? 'bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800' : 'bg-white hover:bg-slate-100 disabled:bg-slate-100'}
						{themeStore.isDark ? 'text-white disabled:text-slate-600' : 'text-slate-700 disabled:text-slate-400'}
						px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed shadow-md"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>

			<!-- Page Info -->
			<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-600'} text-center mt-4 text-sm">
				Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, publications.length)} de {publications.length} publicaciones
			</p>
		{/if}
	{/if}
</main>
