import {
	KIE_GENERATE_MUSIC_PROVIDER_CREDITS,
	LOCAL_GENERATE_USER_CREDITS,
	MUSIC_PRICING_MARKUP_PERCENT,
	SUNO_GENERATE_USER_CREDITS,
	SUNO_VOCAL_STEMS_USER_CREDITS
} from '$lib/constants/music-pricing.js';

export type ResourceType = 'text' | 'image' | 'video' | 'audio' | 'credit';
export type MaestroStudioAction = 'mix' | 'stems' | 'plan' | 'render' | 'edit';
export type MusicBillingProvider = 'suno' | 'musicgpt' | 'local';

export interface CostCalculationResult {
	credits: number;
	resourceType: ResourceType;
}

/**
 * Kie.ai Suno provider card (USD / Gen) — cost floor for QAMUZ user pricing.
 * Generate Music bills **12 Kie credits ($0.06)** and returns **two** clips.
 */
export const KIE_SUNO_COSTS = {
	generateMusic: { kieCredits: KIE_GENERATE_MUSIC_PROVIDER_CREDITS, usd: 0.06 },
	vocalSeparate: { kieCredits: 10, usd: 0.05 },
	advancedSplit: { kieCredits: 20, usd: 0.1 },
	multiStem: { kieCredits: 50, usd: 0.25 },
	mashup: { kieCredits: 12, usd: 0.06 },
	extendOrCover: { kieCredits: 12, usd: 0.06 },
	addInstrumental: { kieCredits: 12, usd: 0.06 },
	replaceSection: { kieCredits: 5, usd: 0.025 },
	createMusicVideo: { kieCredits: 2, usd: 0.01 },
	generateSounds: { kieCredits: 2.5, usd: 0.0125 },
	/** Opt-in only (`KIE_TIMESTAMPED_LYRICS=1`). Auto-prefetch after generate is disabled. */
	timestampedLyrics: { kieCredits: 0.5, usd: 0.0025 },
	boostStyle: { kieCredits: 0.4, usd: 0.002 },
	generateLyrics: { kieCredits: 0.4, usd: 0.002 },
	convertWav: { kieCredits: 0.4, usd: 0.002 }
} as const;

/** @deprecated use MUSIC_PRICING_MARKUP_PERCENT from music-pricing */
export const KIE_USER_MARKUP_PERCENT = MUSIC_PRICING_MARKUP_PERCENT;

/**
 * Calculador de costos para centralizar el precio (en créditos internos)
 * de cada operación de IA, protegiendo el margen de ganancia de QAMUZ AI.
 */
export class CreditCostCalculator {
	/**
	 * OpenRouter: Calcula el costo basado en max_tokens y el modelo.
	 */
	static getOpenRouterCost(modelName: string, requestedMaxTokens: number): CostCalculationResult {
		const isPremium = modelName.includes('opus') || modelName.includes('gpt-4');
		const costPer1000 = isPremium ? 10 : 2;
		const credits = Math.ceil((requestedMaxTokens / 1000) * costPer1000);

		return {
			credits: Math.max(1, credits),
			resourceType: 'text'
		};
	}

	/**
	 * Replicate: Costo fijo por ejecución basado en tiempo de GPU estimado.
	 */
	static getReplicateCost(_modelName: string, type: 'image' | 'video' | 'audio'): CostCalculationResult {
		let credits = 5;

		if (type === 'video') {
			credits = 20;
		} else if (type === 'image') {
			credits = 3;
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
		const credits = Math.ceil(textLength / 100);

		return {
			credits: Math.max(1, credits),
			resourceType: 'audio'
		};
	}

	/**
	 * Music generation billed to the end user.
	 *
	 * Suno via Kie: Generate Music = 12 Kie credits ($0.06) → two songs.
	 * User price = Kie floor + {@link KIE_USER_MARKUP_PERCENT}% so QAMUZ does not lose money.
	 * Local GenAudius stays cheaper (no Kie burn).
	 */
	static getMusicCost(provider: MusicBillingProvider = 'suno'): CostCalculationResult {
		if (provider === 'local') {
			return {
				credits: LOCAL_GENERATE_USER_CREDITS,
				resourceType: 'audio'
			};
		}

		return {
			credits: SUNO_GENERATE_USER_CREDITS,
			resourceType: 'audio'
		};
	}

	/** Credits charged for one Suno/Kie generate (delivers 2 clips). */
	static getSunoGenerateUserCredits(): number {
		return SUNO_GENERATE_USER_CREDITS;
	}

	/**
	 * QAMUZ Studio Maestro actions — floors aligned to Kie when the action
	 * hits a paid Kie endpoint; local-only actions stay light.
	 */
	static getMaestroStudioCost(action: MaestroStudioAction): CostCalculationResult {
		switch (action) {
			case 'render':
				return CreditCostCalculator.getMusicCost('suno');
			case 'stems':
				return {
					credits: SUNO_VOCAL_STEMS_USER_CREDITS,
					resourceType: 'audio'
				};
			case 'edit':
				return { credits: 3, resourceType: 'audio' };
			case 'plan':
				return { credits: 1, resourceType: 'text' };
			case 'mix':
			default:
				return { credits: 1, resourceType: 'audio' };
		}
	}
}
