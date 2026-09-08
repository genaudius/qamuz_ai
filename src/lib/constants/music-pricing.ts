/**
 * User-facing music pricing (must stay aligned with
 * `src/lib/server/ai/cost-calculator.ts`).
 *
 * Kie Generate Music = 12 provider credits ($0.06) → 2 songs.
 * QAMUZ charges Kie floor + 50% markup.
 */
export const KIE_GENERATE_MUSIC_PROVIDER_CREDITS = 12;
export const MUSIC_PRICING_MARKUP_PERCENT = 50;
export const SUNO_GENERATE_USER_CREDITS = Math.ceil(
	KIE_GENERATE_MUSIC_PROVIDER_CREDITS * (1 + MUSIC_PRICING_MARKUP_PERCENT / 100)
); // 18
export const LOCAL_GENERATE_USER_CREDITS = 6;
export const SUNO_VOCAL_STEMS_USER_CREDITS = Math.ceil(10 * (1 + MUSIC_PRICING_MARKUP_PERCENT / 100)); // 15
