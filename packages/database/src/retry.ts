import 'server-only';
export async function withRetry<T>(operation: () => Promise<T>, maxAttempts = 5): Promise<T> {
    for (let attempt = 1;; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            const e = error as {
                code?: string;
                meta?: {
                    code?: string;
                };
                cause?: {
                    code?: string;
                };
            };
            if (![e.code, e.meta?.code, e.cause?.code].some(code => code === '40001' || code === 'P2034') || attempt >= maxAttempts)
                throw error;
            await new Promise(resolve => setTimeout(resolve, Math.min(50 * 2 ** (attempt - 1), 1600) + Math.random() * 50));
        }
    }
}
