<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
	import { municipiosMapData, polygonsToPaths, type MunicipioKey } from '$lib/data/municipiosMap';

	interface Props {
		onMunicipioClick?: (municipio: MunicipioKey) => void;
		selectedMunicipio?: string | null;
		showTooltip?: boolean;
		compact?: boolean;
	}

	let { onMunicipioClick, selectedMunicipio = null, showTooltip = true, compact = false }: Props = $props();

	let hoveredMunicipio = $state<MunicipioKey | null>(null);
	let mouseX = $state(0);
	let mouseY = $state(0);
	let containerRef: HTMLDivElement;

	function handleMouseMove(event: MouseEvent) {
		if (containerRef) {
			const rect = containerRef.getBoundingClientRect();
			mouseX = event.clientX - rect.left;
			mouseY = event.clientY - rect.top;
		}
	}

	function handleMunicipioClick(key: MunicipioKey) {
		if (onMunicipioClick) {
			onMunicipioClick(key);
		}
	}

	function handleKeyDown(event: KeyboardEvent, key: MunicipioKey) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleMunicipioClick(key);
		}
	}

	function isSelected(key: string): boolean {
		if (!selectedMunicipio) return false;
		// Normalize both values for comparison
		const normalizedSelected = selectedMunicipio.toLowerCase().replace(/[- ]/g, '');
		const normalizedKey = key.toLowerCase().replace(/[- ]/g, '');
		return normalizedSelected === normalizedKey;
	}
</script>

<div class="relative flex justify-center" bind:this={containerRef} onmousemove={handleMouseMove}>
	<svg viewBox="0 0 100 100" class="w-full {compact ? 'max-w-sm' : 'max-w-lg'} relative z-10">
		{#each Object.entries(municipiosMapData) as [key, muni]}
			{#each polygonsToPaths(muni.clipPath, muni.x, muni.y, muni.width, muni.height) as pathD, i}
				<path
					d={pathD}
					class="cursor-pointer transition-all duration-200 outline-none focus:outline-none
						{hoveredMunicipio === key || isSelected(key) ? muni.hoverColor : muni.color}
						{themeStore.isDark ? 'stroke-white' : 'stroke-slate-800'}
						stroke-[0.2]
						{isSelected(key) ? 'opacity-100' : ''}"
					onmouseenter={() => (hoveredMunicipio = key as MunicipioKey)}
					onmouseleave={() => (hoveredMunicipio = null)}
					onclick={() => handleMunicipioClick(key as MunicipioKey)}
					onkeydown={(e) => handleKeyDown(e, key as MunicipioKey)}
					role="button"
					tabindex={i === 0 ? 0 : -1}
					aria-label={i === 0 ? muni.nombre : `${muni.nombre} parte ${i + 1}`}
				/>
			{/each}
		{/each}
	</svg>

	<!-- Tooltip flotante cerca del cursor -->
	{#if showTooltip && hoveredMunicipio}
		<div
			class="absolute bg-slate-800/95 text-white px-3 py-1.5 rounded-lg shadow-xl pointer-events-none z-20"
			style="left: {mouseX + 12}px; top: {mouseY + 12}px;"
		>
			<span class="font-bold text-sm">{municipiosMapData[hoveredMunicipio].nombre}</span>
		</div>
	{/if}
</div>
