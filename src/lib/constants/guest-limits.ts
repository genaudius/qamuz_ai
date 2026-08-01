/**
 * Guest user limitation constants
 * Centralized configuration for non-logged in user restrictions
 */

export const GUEST_MESSAGE_LIMIT = 6;
export const GUEST_ALLOWED_MODELS = [
    "openai/gpt-oss-120b:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "stepfun/step-3.5-flash:free"
];

// Helper function to check if a model is allowed for guests
export function isModelAllowedForGuests(modelName: string): boolean {
    return GUEST_ALLOWED_MODELS.includes(modelName);
}