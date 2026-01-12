<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';

	interface Props {
		min: number;
		max: number;
		valueMin: number;
		valueMax: number;
		onchange?: (values: { min: number; max: number }) => void;
	}

	let { min, max, valueMin = $bindable(), valueMax = $bindable(), onchange }: Props = $props();

	// Ensure values stay within bounds
	function clamp(value: number, minVal: number, maxVal: number): number {
		return Math.min(Math.max(value, minVal), maxVal);
	}

	function handleMinChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const newMin = clamp(parseInt(target.value), min, valueMax);
		valueMin = newMin;
		onchange?.({ min: valueMin, max: valueMax });
	}

	function handleMaxChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const newMax = clamp(parseInt(target.value), valueMin, max);
		valueMax = newMax;
		onchange?.({ min: valueMin, max: valueMax });
	}

	// Calculate position percentages for styling
	const minPercent = $derived(((valueMin - min) / (max - min)) * 100);
	const maxPercent = $derived(((valueMax - min) / (max - min)) * 100);
</script>

<div class="range-slider-container">
	<div class="flex justify-between items-center mb-2">
		<span class="{themeStore.isDark ? 'text-slate-300' : 'text-slate-700'} text-sm font-medium">
			{valueMin}
		</span>
		<span class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-500'} text-xs">
			Rango de años
		</span>
		<span class="{themeStore.isDark ? 'text-slate-300' : 'text-slate-700'} text-sm font-medium">
			{valueMax}
		</span>
	</div>

	<div class="relative h-2 w-full">
		<!-- Track background -->
		<div
			class="absolute inset-0 rounded-full {themeStore.isDark ? 'bg-slate-700' : 'bg-slate-200'}"
		></div>

		<!-- Active track -->
		<div
			class="absolute h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500"
			style="left: {minPercent}%; right: {100 - maxPercent}%"
		></div>

		<!-- Min slider -->
		<input
			type="range"
			{min}
			{max}
			value={valueMin}
			oninput={handleMinChange}
			class="range-input absolute w-full h-full appearance-none bg-transparent pointer-events-none"
			style="z-index: {valueMin > max - 10 ? 5 : 3}"
		/>

		<!-- Max slider -->
		<input
			type="range"
			{min}
			{max}
			value={valueMax}
			oninput={handleMaxChange}
			class="range-input absolute w-full h-full appearance-none bg-transparent pointer-events-none"
			style="z-index: 4"
		/>
	</div>

	<!-- Year labels -->
	<div class="flex justify-between mt-1">
		<span class="{themeStore.isDark ? 'text-slate-500' : 'text-slate-400'} text-xs">{min}</span>
		<span class="{themeStore.isDark ? 'text-slate-500' : 'text-slate-400'} text-xs">{max}</span>
	</div>
</div>

<style>
	.range-input::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		background: linear-gradient(135deg, #f97316, #ec4899);
		border-radius: 50%;
		cursor: pointer;
		pointer-events: auto;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
		border: 2px solid white;
		transition: transform 0.15s ease;
	}

	.range-input::-webkit-slider-thumb:hover {
		transform: scale(1.15);
	}

	.range-input::-moz-range-thumb {
		width: 18px;
		height: 18px;
		background: linear-gradient(135deg, #f97316, #ec4899);
		border-radius: 50%;
		cursor: pointer;
		pointer-events: auto;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
		border: 2px solid white;
		transition: transform 0.15s ease;
	}

	.range-input::-moz-range-thumb:hover {
		transform: scale(1.15);
	}

	.range-input::-moz-range-track {
		background: transparent;
	}
</style>
