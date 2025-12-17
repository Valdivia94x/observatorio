<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
	import { urlFor, type Publication } from '$lib/sanity';
	import { PortableText } from '@portabletext/svelte';
	import { portableTextComponents } from '$lib/components/portable-text';

	let { data } = $props();

	const publication: Publication = data.publication;

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
		'educacion': 'Educación'
	};

	const topicColors: Record<string, string> = {
		'finanzas': 'bg-green-500',
		'civismo': 'bg-blue-500',
		'desarrollo-urbano': 'bg-purple-500',
		'economia': 'bg-yellow-500',
		'educacion': 'bg-red-500'
	};
</script>

<main class="max-w-4xl mx-auto px-6 py-12">
	<!-- Back Link -->
	<a
		href="/publicaciones"
		class="{themeStore.isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-800'} inline-flex items-center gap-2 mb-8 transition-colors"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
		Volver a publicaciones
	</a>

	<!-- Preview Image -->
	{#if publication.previewImage}
		<div class="rounded-2xl overflow-hidden mb-8 shadow-lg">
			<img
				src={urlFor(publication.previewImage).width(1200).url()}
				alt={publication.title}
				class="w-full h-auto object-cover"
			/>
		</div>
	{/if}

	<!-- Topic Badge -->
	{#if publication.topic}
		<span class="{topicColors[publication.topic]} text-white text-sm font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider">
			{topicLabels[publication.topic] || publication.topic}
		</span>
	{/if}

	<!-- Title -->
	<h1 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-3xl md:text-4xl font-bold mt-4 mb-2">
		{publication.title}
	</h1>

	<!-- Author -->
	{#if publication.author}
		<p class="{themeStore.isDark ? 'text-slate-300' : 'text-slate-700'} text-base mb-2">
			Por <span class="font-semibold">{publication.author}</span>
		</p>
	{/if}

	<!-- Date -->
	<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-500'} text-base mb-8">
		Publicado el {formatDate(publication.publishedAt)}
	</p>

	<!-- Content -->
	{#if publication.content}
		<div class="{themeStore.isDark ? 'prose-invert' : ''} prose prose-lg max-w-none mb-12
			prose-headings:font-bold
			prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4
			prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3
			prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-2
			prose-p:leading-relaxed prose-p:mb-4
			prose-a:text-orange-400 prose-a:no-underline hover:prose-a:underline
			prose-blockquote:border-l-4 prose-blockquote:border-orange-400 prose-blockquote:pl-4 prose-blockquote:italic
			prose-ul:list-disc prose-ul:pl-6
			prose-ol:list-decimal prose-ol:pl-6
			prose-li:mb-1
			{themeStore.isDark ? 'prose-p:text-slate-300 prose-headings:text-white prose-blockquote:text-slate-400 prose-li:text-slate-300' : 'prose-p:text-slate-600 prose-headings:text-slate-800 prose-blockquote:text-slate-500 prose-li:text-slate-600'}
		">
			<PortableText value={publication.content} components={portableTextComponents} />
		</div>
	{/if}

	<!-- PDF Download Section -->
	{#if publication.pdfUrl}
		<div class="{themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl p-6 shadow-lg">
			<h2 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-xl font-bold mb-4">
				Descargar documento
			</h2>

			<div class="flex flex-col sm:flex-row gap-6 items-start">
				<!-- PDF Cover Image -->
				{#if publication.pdfCoverImage}
					<div class="w-full sm:w-48 shrink-0">
						<img
							src={urlFor(publication.pdfCoverImage).width(400).url()}
							alt="Portada del PDF"
							class="w-full h-auto rounded-lg shadow-md"
						/>
					</div>
				{/if}

				<!-- Download Info -->
				<div class="flex-1">
					<p class="{themeStore.isDark ? 'text-slate-300' : 'text-slate-600'} mb-4">
						Descarga el documento completo en formato PDF para acceder a toda la información detallada.
					</p>

					<a
						href={publication.pdfUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold rounded-full shadow-lg hover:from-orange-500 hover:to-amber-600 transition-all duration-300"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						Descargar PDF
					</a>
				</div>
			</div>
		</div>
	{/if}
</main>
