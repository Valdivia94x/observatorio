import { browser } from '$app/environment';
import type { GraficaWidget } from '$lib/sanity';
import { buildVoiceAgentPrompt } from '$lib/sanity';

const AGENT_ID = 'agent_3101kcvrzjkcfqgb77rbdj3acpp4';

// Store para el contexto del agente de voz
class VoiceAgentStore {
	// Gráfica actualmente seleccionada para el agente
	activeGrafica = $state<GraficaWidget | null>(null);
	// Título del indicador (opcional, para contexto adicional)
	indicadorTitle = $state<string | undefined>(undefined);
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

			// Construir el prompt dinámico si hay una gráfica activa
			let overrides: Record<string, unknown> | undefined = undefined;

			if (this.activeGrafica) {
				const dynamicPrompt = buildVoiceAgentPrompt(
					this.activeGrafica,
					this.indicadorTitle
				);
				overrides = {
					agent: {
						prompt: {
							prompt: dynamicPrompt
						}
					}
				};
				console.log('Voice Agent - Gráfica activa:', this.activeGrafica.titulo);
				console.log('Voice Agent - Prompt enviado a ElevenLabs');
			}

			// Iniciar sesión con ElevenLabs
			this.conversation = await Conversation.startSession({
				agentId: AGENT_ID,
				overrides,
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
	 * Limpia el contexto activo
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
