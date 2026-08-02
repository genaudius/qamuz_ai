export type ResourceType = 'text' | 'image' | 'video' | 'audio' | 'credit';

export interface CostCalculationResult {
	credits: number;
	resourceType: ResourceType;
}

/**
 * Calculador de costos para centralizar el precio (en créditos internos)
 * de cada operación de IA, protegiendo el margen de ganancia de QAMUZ AI.
 */
export class CreditCostCalculator {
	/**
	 * OpenRouter: Calcula el costo basado en max_tokens y el modelo.
	 * Asumimos un factor multiplicador según la inteligencia del modelo.
	 */
	static getOpenRouterCost(modelName: string, requestedMaxTokens: number): CostCalculationResult {
		// Modelos premium (Claude 3 Opus, GPT-4) vs modelos estándar (Llama, Claude Haiku)
		const isPremium = modelName.includes('opus') || modelName.includes('gpt-4');
		const costPer1000 = isPremium ? 10 : 2; // Créditos por cada 1000 tokens
		
		const credits = Math.ceil((requestedMaxTokens / 1000) * costPer1000);
		
		return {
			credits: Math.max(1, credits), // Siempre cobra al menos 1 crédito
			resourceType: 'text'
		};
	}

	/**
	 * Replicate: Costo fijo por ejecución basado en tiempo de GPU estimado.
	 * Ej: Generación de video cuesta mucho más que generación de imágenes simples.
	 */
	static getReplicateCost(modelName: string, type: 'image' | 'video' | 'audio'): CostCalculationResult {
		let credits = 5; // Default fallback

		if (type === 'video') {
			credits = 20; // Los videos consumen mucha GPU (ej. minimax, kluing)
		} else if (type === 'image') {
			credits = 3; // Imágenes estándar (SDXL, flux)
		} else if (type === 'audio') {
			credits = 5;
		}

		return {
			credits,
			resourceType: type
		};
	}

	/**
	 * ElevenLabs: Calcula costo según la longitud exacta del texto.
	 */
	static getElevenLabsCost(textLength: number): CostCalculationResult {
		// Asumimos 1 crédito por cada 100 caracteres
		const credits = Math.ceil(textLength / 100);
		
		return {
			credits: Math.max(1, credits),
			resourceType: 'audio'
		};
	}

	/**
	 * Suno / MusicGPT: Costos muy altos por ser procesos largos.
	 */
	static getMusicCost(): CostCalculationResult {
		// Costo base por generación de música. Keep this intentionally lower so retries and
		// background completion do not burn credits too aggressively.
		return {
			credits: 5,
			resourceType: 'audio'
		};
	}
}
