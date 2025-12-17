<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen {themeStore.isDark ? 'bg-slate-800' : 'bg-slate-100'}">
	<Navbar />
	{@render children()}
	<Footer />
</div>
