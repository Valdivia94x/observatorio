<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';

	const donationData = {
		bankInfo: {
			bank: 'Banamex',
			accountName: 'Consejo Cívico de las Instituciones, A.C.',
			accountNumber: '70036183924',
			clabe: '002060700361839245',
			concept: 'Aportación CCI Laguna'
		},
		invoicing: {
			email: 'contacto@ccilaguna.org.mx',
			rfc: 'CCI-120210-LK7'
		}
	};

	let copiedField = $state<string | null>(null);

	function copyToClipboard(text: string, field: string) {
		navigator.clipboard.writeText(text);
		copiedField = field;
		setTimeout(() => copiedField = null, 2000);
	}
</script>

<svelte:head>
	<title>Donar | Observatorio de la Laguna</title>
	<meta name="description" content="Apoya al Observatorio de la Laguna con tu donativo. Tu contribución es deducible de impuestos." />
</svelte:head>

<main class="max-w-5xl mx-auto px-6 py-12">
	<!-- Hero Section -->
	<section class="text-center mb-16">
		<h1 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-4xl md:text-5xl font-bold mb-4">
			DONAR
		</h1>
		<p class="{themeStore.isDark ? 'text-white' : 'text-slate-600'} text-lg max-w-2xl mx-auto leading-relaxed">
			Con tu ayuda podemos construir un futuro más justo y más seguro, con ciudadanos informados y
			comprometidos, a través de la participación ciudadana.
		</p>
	</section>

	<!-- Información Bancaria -->
	<section class="mb-16">
		<h2 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-2xl md:text-4xl font-bold text-center mb-6">
			INFORMACIÓN BANCARIA
		</h2>

		<!-- Cards Grid - Horizontal -->
		<div class="flex flex-col md:flex-row justify-center gap-4 mb-4 max-w-2xl mx-auto"
			style="max-width: 1200px;"
		>
			<!-- Banco -->
			<div class="flex-1 {themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl p-6 text-center shadow-lg">
				<div
					class="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full shadow-md"
					style="background-color: {themeStore.isDark ? '#60a5fa' : '#2563eb'};"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 512 512" fill="white">
						<path d="M243.4 2.6l-224 96c-14 6-21.8 21-18.7 35.8S16.8 160 32 160v8c0 13.3 10.7 24 24 24H456c13.3 0 24-10.7 24-24v-8c15.2 0 28.3-10.7 31.3-25.6s-4.8-29.9-18.7-35.8l-224-96c-8-3.4-17.2-3.4-25.2 0zM128 224H64V420.3c-.6 .3-1.2 .7-1.8 1.1l-48 32c-11.7 7.8-17 22.4-12.9 35.9S17.9 512 32 512H480c14.1 0 26.5-9.2 30.6-22.7s-1.1-28.1-12.9-35.9l-48-32c-.6-.4-1.2-.7-1.8-1.1V224H384V416H344V224H280V416H232V224H168V416H128V224zM256 64a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/>
					</svg>
				</div>
				<p class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-sm font-medium uppercase tracking-wider mb-4">
					BANCO
				</p>
				<div class="{themeStore.isDark ? 'bg-slate-600' : 'bg-slate-100'} rounded-lg py-2 px-3">
					<p class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-sm font-semibold" style="font-family: 'Courier New', monospace;">
						{donationData.bankInfo.bank}
					</p>
				</div>
			</div>

			<!-- Número de Cuenta -->
			<div class="flex-1 {themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl p-6 text-center shadow-lg">
				<div
					class="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full shadow-md"
					style="background-color: {themeStore.isDark ? '#60a5fa' : '#2563eb'};"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 576 512" fill="white">
						<path d="M64 32C28.7 32 0 60.7 0 96v32H576V96c0-35.3-28.7-64-64-64H64zM576 224H0V416c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V224zM112 352h64c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm112 16c0-8.8 7.2-16 16-16H368c8.8 0 16 7.2 16 16s-7.2 16-16 16H240c-8.8 0-16-7.2-16-16z"/>
					</svg>
				</div>
				<p class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-sm font-medium uppercase tracking-wider mb-4">
					NÚMERO DE CUENTA
				</p>
				<button
					onclick={() => copyToClipboard(donationData.bankInfo.accountNumber, 'account')}
					class="{themeStore.isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-100 hover:bg-slate-200'} rounded-lg py-2 px-3 w-full transition-colors group"
					title="Clic para copiar"
				>
					<p class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-sm font-semibold" style="font-family: 'Courier New', monospace;">
						{#if copiedField === 'account'}
							¡Copiado!
						{:else}
							{donationData.bankInfo.accountNumber}
						{/if}
					</p>
				</button>
			</div>

			<!-- CLABE -->
			<div class="flex-1 {themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl p-6 text-center shadow-lg">
				<div
					class="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full shadow-md"
					style="background-color: {themeStore.isDark ? '#60a5fa' : '#2563eb'};"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 448 512" fill="white">
						<path d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm64 192c17.7 0 32 14.3 32 32v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V256c0-17.7 14.3-32 32-32zm64-64c0-17.7 14.3-32 32-32s32 14.3 32 32V352c0 17.7-14.3 32-32 32s-32-14.3-32-32V160zM320 288c17.7 0 32 14.3 32 32v32c0 17.7-14.3 32-32 32s-32-14.3-32-32V320c0-17.7 14.3-32 32-32z"/>
					</svg>
				</div>
				<p class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-sm font-medium uppercase tracking-wider mb-4">
					CLABE INTERBANCARIA
				</p>
				<button
					onclick={() => copyToClipboard(donationData.bankInfo.clabe, 'clabe')}
					class="{themeStore.isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-100 hover:bg-slate-200'} rounded-lg py-2 px-3 w-full transition-colors group"
					title="Clic para copiar"
				>
					<p class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-sm font-semibold" style="font-family: 'Courier New', monospace;">
						{#if copiedField === 'clabe'}
							¡Copiado!
						{:else}
							{donationData.bankInfo.clabe}
						{/if}
					</p>
				</button>
			</div>
		</div>

		<!-- Concepto de Pago -->
		<div class="{themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl p-6 shadow-lg text-center max-w-2xl mx-auto"
		style="max-width: 1200px;"
		>
			<div
				class="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full shadow-md"
				style="background-color: {themeStore.isDark ? '#60a5fa' : '#2563eb'};"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 512 512" fill="white">
					<path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"/>
				</svg>
			</div>
			<p class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-sm font-medium uppercase tracking-wider mb-4">
				CONCEPTO DE PAGO
			</p>
			<button
				onclick={() => copyToClipboard(donationData.bankInfo.concept, 'concept')}
				class="{themeStore.isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-100 hover:bg-slate-200'} rounded-lg py-2 px-3 w-full transition-colors"
				title="Clic para copiar"
			>
				<p class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-sm font-semibold" style="font-family: 'Courier New', monospace;">
					{#if copiedField === 'concept'}
						¡Copiado!
					{:else}
						{donationData.bankInfo.concept}
					{/if}
				</p>
			</button>
		</div>
	</section>

	<!-- Información de Facturación -->
	<section class="mb-12">
		<h2 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-2xl md:text-4xl font-bold text-center mb-6">
			FACTURACIÓN
		</h2>

		<div class="flex flex-col md:flex-row gap-4 mb-6 max-w-2xl mx-auto"
		style="max-width: 1000px;"
		>
			<!-- Correo -->
			<div class="flex-1 {themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl p-6 shadow-lg">
				<div class="flex items-start gap-4">
					<div
						class="w-14 h-14 shrink-0 flex items-center justify-center rounded-full shadow-md"
						style="background-color: {themeStore.isDark ? '#60a5fa' : '#2563eb'};"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" viewBox="0 0 512 512" fill="white">
							<path d="M64 112c-8.8 0-16 7.2-16 16v22.1L220.5 291.7c20.7 17 50.4 17 71.1 0L464 150.1V128c0-8.8-7.2-16-16-16H64zM48 212.2V384c0 8.8 7.2 16 16 16H448c8.8 0 16-7.2 16-16V212.2L322 328.8c-38.4 31.5-93.7 31.5-132 0L48 212.2zM0 128C0 92.7 28.7 64 64 64H448c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128z"/>
						</svg>
					</div>
					<div>
						<h3 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-lg font-bold uppercase mb-1">
							CORREO DE FACTURACIÓN
						</h3>
						<a href="mailto:{donationData.invoicing.email}" class="text-orange-400 hover:text-orange-300 font-medium transition-colors">
							{donationData.invoicing.email}
						</a>
						<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-500'} text-sm mt-2">
							Envía tu comprobante de pago y tus datos fiscales a este correo para recibir tu factura.
						</p>
					</div>
				</div>
			</div>

			<!-- RFC -->
			<div class="flex-1 {themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl p-6 shadow-lg">
				<div class="flex items-start gap-4">
					<div
						class="w-14 h-14 shrink-0 flex items-center justify-center rounded-full shadow-md"
						style="background-color: {themeStore.isDark ? '#60a5fa' : '#2563eb'};"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" viewBox="0 0 384 512" fill="white">
							<path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM80 64h64c8.8 0 16 7.2 16 16s-7.2 16-16 16H80c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64h64c8.8 0 16 7.2 16 16s-7.2 16-16 16H80c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/>
						</svg>
					</div>
					<div>
						<h3 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} text-lg font-bold uppercase mb-1">
							RFC
						</h3>
						<p class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} font-mono font-semibold">
							{donationData.invoicing.rfc}
						</p>
						<p class="{themeStore.isDark ? 'text-slate-400' : 'text-slate-500'} text-sm mt-2">
							Razón Social: {donationData.bankInfo.accountName}
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Importante -->
		<div 
			class="{themeStore.isDark ? 'bg-slate-700/50' : 'bg-white'} rounded-2xl p-6 shadow-lg mx-auto border-l-4 border-orange-400 w-full"
			style="max-width: 800px;"
		>
			<div class="flex items-start gap-4">
				<div
					class="w-10 h-10 shrink-0 flex items-center justify-center rounded-full shadow-md"
					style="background-color: #fb923c;"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 512 512" fill="white">
						<path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/>
					</svg>
				</div>
				<div>
					<h4 class="{themeStore.isDark ? 'text-white' : 'text-slate-800'} font-bold uppercase mb-1">IMPORTANTE</h4>
					<p class="{themeStore.isDark ? 'text-slate-300' : 'text-slate-600'} text-sm leading-relaxed">
						Para obtener tu recibo deducible de impuestos, por favor envía el comprobante de pago junto con tus datos fiscales completos (RFC, razón social, código postal, régimen fiscal y uso de CFDI) al correo de facturación.
					</p>
				</div>
			</div>
		</div>
	</section>
</main>
