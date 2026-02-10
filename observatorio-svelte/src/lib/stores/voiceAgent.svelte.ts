import { browser } from '$app/environment';
import type { GraficaWidget, PageContext } from '$lib/sanity';
import { buildVoiceAgentPrompt, buildPageContextPrompt } from '$lib/sanity';

const AGENT_ID = 'agent_3101kcvrzjkcfqgb77rbdj3acpp4';

// Store para el contexto del agente de voz
class VoiceAgentStore {
	// Gráfica actualmente seleccionada para el agente
	activeGrafica = $state<GraficaWidget | null>(null);
	// Título del indicador (opcional, para contexto adicional)
	indicadorTitle = $state<string | undefined>(undefined);
	// Contexto de la página/sección actual
	pageContext = $state<PageContext | null>(null);
	// Estado de la conversación
	isConnected = $state(false);
	isSpeaking = $state(false);
	isListening = $state(false);
	isLoading = $state(false);
	error = $state<string | null>(null);

	// Referencia a la conversación activa
	private conversation: any = null;
	// Referencia al módulo de ElevenLabs (cargado dinámicamente)
	private elevenLabsModule: any = null;
	// Callback de navegación (recibe goto desde el layout)
	private navigateCallback: ((path: string) => void) | null = null;

	/**
	 * Registra el callback de navegación (goto de SvelteKit).
	 * Se llama una vez desde el layout al montar el componente.
	 */
	setNavigateCallback(cb: (path: string) => void) {
		this.navigateCallback = cb;
	}

	/**
	 * Actualiza el contexto de la página/sección actual.
	 * No reinicia la conversación activa; el contexto se usa al iniciar la siguiente.
	 */
	setPageContext(context: PageContext) {
		this.pageContext = context;
	}

	/**
	 * Inicia una conversación con el contexto de una gráfica específica.
	 * Si ya hay una conversación activa, la reinicia con el nuevo contexto.
	 */
	async startWithGrafica(grafica: GraficaWidget, indicadorTitle?: string) {
		if (!browser) return;

		// Actualizar el contexto
		this.activeGrafica = grafica;
		this.indicadorTitle = indicadorTitle;
		this.error = null;

		// Si ya hay una conversación, terminarla primero
		if (this.conversation) {
			await this.endConversation();
		}

		// Iniciar nueva conversación
		await this.startConversation();
	}

	/**
	 * Construye el prompt dinámico según el contexto disponible.
	 * Prioridad: activeGrafica > pageContext > sin contexto
	 */
	private buildDynamicPrompt(): string | null {
		// Prioridad 1: Gráfica específica (backward compatible)
		if (this.activeGrafica) {
			return buildVoiceAgentPrompt(this.activeGrafica, this.indicadorTitle);
		}

		// Prioridad 2: Contexto de página/sección
		if (this.pageContext) {
			return buildPageContextPrompt(this.pageContext);
		}

		// Sin contexto adicional
		return null;
	}

	/**
	 * Inicia la conversación con ElevenLabs
	 */
	async startConversation() {
		if (!browser || this.isLoading) return;

		this.isLoading = true;
		this.error = null;

		try {
			// Cargar el módulo de ElevenLabs si no está cargado
			if (!this.elevenLabsModule) {
				this.elevenLabsModule = await import('@elevenlabs/client');
			}

			const { Conversation } = this.elevenLabsModule;

			// Solicitar permiso de micrófono
			await navigator.mediaDevices.getUserMedia({ audio: true });

			// Construir el prompt dinámico según el contexto
			let overrides: Record<string, unknown> | undefined = undefined;
			const dynamicPrompt = this.buildDynamicPrompt();

			if (dynamicPrompt) {
				overrides = {
					agent: {
						prompt: {
							prompt: dynamicPrompt
						}
					}
				};
				console.log('Voice Agent - Contexto:', this.activeGrafica ? `Gráfica: ${this.activeGrafica.titulo}` : `Sección: ${this.pageContext?.type}`);
				console.log('Voice Agent - Prompt completo:', dynamicPrompt);
			}

			// Iniciar sesión con ElevenLabs
			this.conversation = await Conversation.startSession({
				agentId: AGENT_ID,
				overrides,
				clientTools: {
					navigate_to_section: async (params: { destination: string; eje?: string; ubicacion?: string }) => {
						if (!this.navigateCallback) return 'Navegación no disponible';

						let path = '/';
						switch (params.destination) {
							case 'indicadores':
								path = '/indicadores';
								if (params.eje) path += `?eje=${encodeURIComponent(params.eje)}`;
								else if (params.ubicacion) path += `?ubicacion=${encodeURIComponent(params.ubicacion)}`;
								break;
							case 'publicaciones':
								path = '/publicaciones';
								break;
							case 'donar':
								path = '/donar';
								break;
							case 'quienes-somos':
								path = '/quienes-somos';
								break;
							case 'home':
								path = '/';
								break;
						}

						console.log('Voice Agent - Navegando a:', path);
						this.navigateCallback(path);
						return `Navegación completada: ${path}`;
					}
				},
				onConnect: () => {
					this.isConnected = true;
					this.isLoading = false;
				},
				onDisconnect: () => {
					this.isConnected = false;
					this.isSpeaking = false;
					this.isListening = false;
					this.conversation = null;
				},
				onError: (message: string, context?: unknown) => {
					console.error('ElevenLabs error:', message, context);
					this.error = message;
					this.isLoading = false;
				},
				onModeChange: (mode: { mode: string }) => {
					this.isSpeaking = mode.mode === 'speaking';
					this.isListening = mode.mode === 'listening';
				},
				onMessage: (props: { message: string; source: string }) => {
					// Log de mensajes para debugging (preparación futura)
					console.log(`Voice Agent [${props.source}]:`, props.message);
				}
			});
		} catch (err) {
			console.error('Failed to start conversation:', err);
			this.error = err instanceof Error ? err.message : 'Error al iniciar conversación';
			this.isLoading = false;
		}
	}

	/**
	 * Termina la conversación activa
	 */
	async endConversation() {
		if (this.conversation) {
			try {
				await this.conversation.endSession();
			} catch (err) {
				console.error('Error ending conversation:', err);
			}
			this.conversation = null;
			this.isConnected = false;
			this.isSpeaking = false;
			this.isListening = false;
		}
	}

	/**
	 * Toggle: inicia o termina la conversación
	 */
	async toggleConversation() {
		if (this.isConnected) {
			await this.endConversation();
		} else {
			await this.startConversation();
		}
	}

	/**
	 * Limpia el contexto de gráfica activa
	 */
	clearActiveGrafica() {
		this.activeGrafica = null;
		this.indicadorTitle = undefined;
	}

	/**
	 * Limpia todo y termina la conversación
	 */
	async cleanup() {
		await this.endConversation();
		this.clearActiveGrafica();
		this.error = null;
	}
}

export const voiceAgentStore = new VoiceAgentStore();
