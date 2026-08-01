import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { auditLogs } from '$lib/server/db/schema.js';

export class QamuzGuardrail {
    private userId: string;
    private ipAddress: string;

    constructor(userId: string, ipAddress: string) {
        this.userId = userId;
        this.ipAddress = ipAddress;
    }

    /**
     * Checks if the text prompt violates Qamuz policies (Violence, Political, Sex, Harassment)
     */
    async verifyText(prompt: string): Promise<{ valid: boolean, reason?: string }> {
        const apiKey = env.OPENROUTER_API_KEY;
        if (!apiKey) {
            console.warn("No OPENROUTER_API_KEY found, skipping guardrail check in dev mode");
            return { valid: true };
        }

        const systemPrompt = `You are the Qamuz Safety Guardrail Agent. 
Your job is to classify the user's music or audio prompt.
You must REJECT prompts that contain:
- Political propaganda or campaigning
- Violence, harm, or incitement to crime
- Explicit sexual content or pornography
- Harassment, doxxing, or mean-spirited memes aimed at real people

Respond in JSON format with exactly this schema:
{ "valid": boolean, "reason": "Short reason if rejected, else empty string" }`;

        try {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "meta-llama/llama-3-8b-instruct", // Fast and cheap classifier
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            if (!res.ok) {
                console.error("Guardrail fetch failed", await res.text());
                return { valid: true }; // Fail open if API is down
            }

            const data = await res.json();
            const content = data.choices[0].message.content;
            const parsed = JSON.parse(content);

            if (!parsed.valid) {
                await this.logViolation('rejected_text', parsed.reason || 'Violated content policy', prompt);
            }

            return {
                valid: !!parsed.valid,
                reason: parsed.reason
            };
        } catch (e) {
            console.error("Guardrail Exception:", e);
            return { valid: true }; // Fallback to let request pass if LLM fails
        }
    }

    private async logViolation(action: string, reason: string, input: string) {
        try {
            await db.insert(auditLogs).values({
                userId: this.userId,
                action,
                ipAddress: this.ipAddress,
                details: { reason, input }
            });
        } catch (e) {
            console.error("Failed to log audit violation", e);
        }
    }
}
