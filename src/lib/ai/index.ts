import type { AIProvider, AIModelConfig } from './types';
import { openRouterProvider } from './providers/openrouter';
import { replicateProvider } from './providers/replicate';
import { sunoProvider } from './providers/suno';
import { removeWebSearchSuffix } from '@/src/lib/constants/web-search';

export const AI_PROVIDERS: AIProvider[] = [
	openRouterProvider,
	replicateProvider,
	sunoProvider
];

export function getAllModels(): AIModelConfig[] {
	return AI_PROVIDERS.flatMap(provider => provider.models);
}

export function getProvider(providerName: string): AIProvider | undefined {
	return AI_PROVIDERS.find(provider => provider.name === providerName);
}

export function getModelProvider(modelName: string): AIProvider | undefined {
	// Handle OpenRouter web search suffix (:online) by checking base model name
	const baseModelName = removeWebSearchSuffix(modelName);
	return AI_PROVIDERS.find(provider =>
		provider.models.some(model => model.name === baseModelName)
	);
}

export * from './types';
export { openRouterProvider } from './providers/openrouter';
export { replicateProvider } from './providers/replicate';
export { sunoProvider } from './providers/suno';
export { ELEVENLABS_VOICES } from '@/src/lib/constants/elevenlabs';

