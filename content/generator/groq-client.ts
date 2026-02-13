/**
 * Groq Client — lightweight OpenAI-compatible wrapper for Groq's free API.
 * Zero external dependencies. Uses native fetch.
 *
 * This module is part of the content generation subsystem.
 * It is NOT imported by the main app (no build/dev impact).
 */

// ── Types ────────────────────────────────────────

export interface GroqConfig {
    apiKey: string;
    model: string;
    /** Max tokens for the response (default: 8192) */
    maxTokens?: number;
    /** Temperature (default: 0.7) */
    temperature?: number;
    /** Response format — use 'json_object' for structured output */
    responseFormat?: 'text' | 'json_object';
}

interface GroqMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface GroqChoice {
    index: number;
    message: {
        role: string;
        content: string;
    };
    finish_reason: string;
}

interface GroqUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_time: number;
    completion_time: number;
    total_time: number;
}

export interface GroqResponse {
    id: string;
    choices: GroqChoice[];
    usage: GroqUsage;
    model: string;
}

export interface GroqError {
    error: {
        message: string;
        type: string;
        code: string;
    };
}

// ── Constants ────────────────────────────────────

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/** Free-tier rate limits (as of 2026): 30 req/min, 300K tokens/min */
const DEFAULT_RETRY_DELAYS = [2000, 5000, 15000, 30000]; // ms

// ── Client ───────────────────────────────────────

export class GroqClient {
    private config: Required<GroqConfig>;
    private requestCount = 0;
    private lastRequestTime = 0;

    constructor(config: GroqConfig) {
        if (!config.apiKey) {
            throw new Error(
                'GROQ_API_KEY is required. Get a free key at https://console.groq.com/keys'
            );
        }

        this.config = {
            apiKey: config.apiKey,
            model: config.model || 'llama-3.3-70b-versatile',
            maxTokens: config.maxTokens ?? 8192,
            temperature: config.temperature ?? 0.7,
            responseFormat: config.responseFormat ?? 'json_object',
        };
    }

    /**
     * Send a chat completion request to Groq.
     * Automatically handles rate limiting with exponential backoff.
     */
    async chat(messages: GroqMessage[]): Promise<GroqResponse> {
        return this.withRetry(async () => {
            await this.throttle();

            const body: Record<string, unknown> = {
                model: this.config.model,
                messages,
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature,
                stream: false,
            };

            if (this.config.responseFormat === 'json_object') {
                body.response_format = { type: 'json_object' };
            }

            const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            this.requestCount++;
            this.lastRequestTime = Date.now();

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({})) as GroqError;
                const msg = errorBody?.error?.message || response.statusText;

                if (response.status === 429) {
                    throw new RateLimitError(msg);
                }
                if (response.status >= 500) {
                    throw new ServerError(msg);
                }

                throw new Error(`Groq API error (${response.status}): ${msg}`);
            }

            return await response.json() as GroqResponse;
        });
    }

    /**
     * Send a chat request and parse the JSON response content.
     */
    async chatJSON<T = unknown>(messages: GroqMessage[]): Promise<{
        data: T;
        usage: GroqUsage;
        model: string;
    }> {
        const response = await this.chat(messages);
        const content = response.choices[0]?.message?.content;

        if (!content) {
            throw new Error('Empty response from Groq');
        }

        try {
            const data = JSON.parse(content) as T;
            return {
                data,
                usage: response.usage,
                model: response.model,
            };
        } catch {
            throw new Error(
                `Failed to parse JSON response from Groq. Content starts with: ${content.slice(0, 200)}`
            );
        }
    }

    /** Number of API calls made so far */
    get stats() {
        return { requestCount: this.requestCount };
    }

    // ── Rate limiting ────────────────────────────

    /**
     * Simple throttle: ensure at least 2.1s between requests (28 req/min max).
     * Groq free tier is 30 req/min, so we stay under.
     */
    private async throttle(): Promise<void> {
        const elapsed = Date.now() - this.lastRequestTime;
        const minDelay = 2100; // ms between requests
        if (elapsed < minDelay) {
            await sleep(minDelay - elapsed);
        }
    }

    /**
     * Retry with exponential backoff for rate limits and server errors.
     */
    private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
        for (let attempt = 0; attempt <= DEFAULT_RETRY_DELAYS.length; attempt++) {
            try {
                return await fn();
            } catch (error) {
                const isRetryable =
                    error instanceof RateLimitError ||
                    error instanceof ServerError;

                if (!isRetryable || attempt === DEFAULT_RETRY_DELAYS.length) {
                    throw error;
                }

                const delay = DEFAULT_RETRY_DELAYS[attempt];
                console.warn(
                    `⏳ Rate limited / server error. Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${DEFAULT_RETRY_DELAYS.length})`
                );
                await sleep(delay);
            }
        }

        throw new Error('Retry exhausted (should not reach here)');
    }
}

// ── Error classes ────────────────────────────────

class RateLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RateLimitError';
    }
}

class ServerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ServerError';
    }
}

// ── Helpers ──────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
