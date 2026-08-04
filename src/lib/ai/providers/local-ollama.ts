import type { AIProvider, AIResponse, AIStreamChunk, ChatCompletionParams } from '../types.js';

const BASE_URL = 'http://127.0.0.1:11434';
const LOCAL_MODEL = 'nemotron-3-nano:30b';
export const LOCAL_CHAT_MODEL_ID = 'nvidia/nemotron-3-nano-30b-a3b:free';

type OllamaChunk = {
	message?: { content?: string };
	done?: boolean;
	done_reason?: string;
	prompt_eval_count?: number;
	eval_count?: number;
};

function requestBody(params: ChatCompletionParams, stream: boolean) {
	return {
		model: LOCAL_MODEL,
		messages: params.messages
			.filter((message) => message.role !== 'tool')
			.map((message) => ({ role: message.role, content: message.content || '' })),
		stream,
		// Keep private reasoning internal and return the user-facing answer promptly.
		think: false,
		keep_alive: '30m',
		options: {
			temperature: params.temperature ?? 0.7,
			// Keep local 30B responses practical on consumer hardware and prevent
			// one verbose request from blocking every subsequent chat message.
			num_predict: Math.min(params.maxTokens ?? 1024, 1024),
			num_ctx: 4096
		}
	};
}

async function ensureResponse(response: Response): Promise<Response> {
	if (response.ok) return response;
	const detail = await response.text().catch(() => '');
	throw new Error(`Local chat service error (${response.status}): ${detail.slice(0, 300)}`);
}

async function* streamChat(params: ChatCompletionParams): AsyncIterableIterator<AIStreamChunk> {
	const response = await ensureResponse(await fetch(`${BASE_URL}/api/chat`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(requestBody(params, true)),
		signal: AbortSignal.timeout(30 * 60_000)
	}));
	if (!response.body) throw new Error('The local chat service returned no stream');

	const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
	let pending = '';
	while (true) {
		const { value, done } = await reader.read();
		pending += value || '';
		const lines = pending.split('\n');
		pending = lines.pop() || '';
		for (const line of lines) {
			if (!line.trim()) continue;
			const chunk = JSON.parse(line) as OllamaChunk;
			if (chunk.message?.content) yield { content: chunk.message.content, done: false, type: 'text' };
			if (chunk.done) {
				yield {
					content: '',
					done: true,
					type: 'finish',
					finishReason: chunk.done_reason || 'stop',
					usage: {
						promptTokens: chunk.prompt_eval_count || 0,
						completionTokens: chunk.eval_count || 0,
						totalTokens: (chunk.prompt_eval_count || 0) + (chunk.eval_count || 0)
					}
				};
				return;
			}
		}
	}
}

export const localOllamaProvider: AIProvider = {
	name: 'Local',
	models: [{
		name: LOCAL_CHAT_MODEL_ID,
		displayName: 'Qamuz Local Chat',
		provider: 'local',
		maxTokens: 32768,
		supportsStreaming: true,
		supportsFunctions: false,
		supportsTextInput: true,
		supportsTextGeneration: true
	}],
	async chat(params: ChatCompletionParams): Promise<AIResponse | AsyncIterableIterator<AIStreamChunk>> {
		if (params.stream) return streamChat(params);
		const response = await ensureResponse(await fetch(`${BASE_URL}/api/chat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody(params, false)),
			signal: AbortSignal.timeout(30 * 60_000)
		}));
		const result = await response.json() as OllamaChunk;
		return {
			content: result.message?.content || '',
			model: LOCAL_CHAT_MODEL_ID,
			finishReason: 'stop',
			usage: {
				promptTokens: result.prompt_eval_count || 0,
				completionTokens: result.eval_count || 0,
				totalTokens: (result.prompt_eval_count || 0) + (result.eval_count || 0)
			}
		};
	}
};
