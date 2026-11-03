// Retries a data request when the failure is temporary: a dropped connection, a rate limit (429) or a server error (5xx).
// Other failures, such as a rejected request or bad data, are thrown straight away.

export const isTemporaryFailure = (error: any): boolean => {
    if (error instanceof TypeError) return true; // fetch() itself failed: network dropped or changed
    const status = typeof error?.status === 'number' ? error.status : undefined;
    if (status !== undefined) return status === 429 || status >= 500;
    return /network|failed to fetch|timeout|timed out|connection/i.test(String(error?.message || ''));
};

export const withRetry = async <T>(
    operation: () => Promise<T>,
    options: { attempts?: number; baseDelayMs?: number } = {}
): Promise<T> => {
    const attempts = options.attempts ?? 3;
    const baseDelayMs = options.baseDelayMs ?? 800;
    let lastError: any;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt === attempts || !isTemporaryFailure(error)) break;
            await new Promise(resolve => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)));
        }
    }
    throw lastError;
};
