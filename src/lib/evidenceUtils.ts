/**
 * Utility functions for parsing, cleaning, and formatting audit evidence image URLs and base64 payloads.
 */

export const formatDirectImageUrl = (url: any): string => {
    if (!url || typeof url !== 'string') return '';
    let trimmed = url.trim();

    // Convert Google Drive view/open URLs into direct image render URLs
    const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^\/]+)/i) || trimmed.match(/drive\.google\.com\/open\?id=([^\&]+)/i);
    if (driveMatch && driveMatch[1]) {
        return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    }

    return trimmed;
};

/**
 * Sanitizes base64 Data URLs by removing linebreaks (\n, \r), tabs, quotes, backslashes, and URL-encoded spaces
 * that corrupt the image payload in HTML <img> tags.
 */
export const sanitizeImageDataUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return '';
    let str = url.trim();

    // Strip surrounding quotes, brackets, and backslashes
    str = str.replace(/^["'\\\[]+|["'\\\]]+$/g, '').trim();

    // Clean base64 Data URL
    if (str.startsWith('data:image/')) {
        const commaIdx = str.indexOf(',');
        if (commaIdx !== -1) {
            const header = str.slice(0, commaIdx + 1); // e.g. "data:image/jpeg;base64,"
            let body = str.slice(commaIdx + 1);
            // Remove all linebreaks (\n, \r), tabs (\t), spaces, quotes, backslashes, and %20
            body = body.replace(/[\s\r\n\t"'\\]+/g, '').replace(/%20/g, '');
            return header + body;
        }
    }

    return formatDirectImageUrl(str);
};

/**
 * Extracts clean, renderable image URLs from various evidence submission formats
 * (JSON arrays, JSON objects, raw multiline base64 strings, comma-separated URLs).
 */
export const parseEvidenceUrls = (rawInput: any): string[] => {
    if (!rawInput) return [];

    let str = typeof rawInput === 'object' ? JSON.stringify(rawInput) : String(rawInput).trim();
    if (!str || str === 'null' || str === 'undefined' || str === '{}' || str === '[]') return [];

    // 1. Unescape JSON string if it's double-encoded like "\"data:image...\""
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
        try {
            const unescaped = JSON.parse(str);
            if (typeof unescaped === 'string') {
                str = unescaped.trim();
            }
        } catch (e) {
            str = str.slice(1, -1).trim();
        }
    }

    // 2. Parse JSON array or object
    if ((str.startsWith('[') && str.endsWith(']')) || (str.startsWith('{') && str.endsWith('}'))) {
        try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed)) {
                return parsed.flatMap(item => parseEvidenceUrls(item)).filter(Boolean);
            }
            if (parsed && typeof parsed === 'object') {
                const keys = ['url', 'urls', 'image', 'photo', 'path', 'value', 'file'];
                for (const k of keys) {
                    if (parsed[k]) return parseEvidenceUrls(parsed[k]);
                }
            }
        } catch (e) {
            // Fall through to regex extraction
        }
    }

    // 3. Check for data:image/ base64 URLs
    if (str.includes('data:image/')) {
        // Match all data:image/... occurrences
        const dataUrlRegex = /data:image\/[a-zA-Z0-9+\-.]+;base64,[a-zA-Z0-9+/=\s\r\n\t\\]+/g;
        const matches = str.match(dataUrlRegex);
        if (matches && matches.length > 0) {
            return matches.map(m => sanitizeImageDataUrl(m)).filter(Boolean);
        }

        // Fallback split if regex didn't catch due to surrounding text
        const parts = str.split(/(?=(?:data:image\/|https?:\/\/))/g);
        const results: string[] = [];
        for (let p of parts) {
            p = p.trim().replace(/^[,;\s"'\\]+|[,;\s"'\\]+$/g, '');
            if (p && p.startsWith('data:image/')) {
                results.push(sanitizeImageDataUrl(p));
            } else if (p && (p.startsWith('http://') || p.startsWith('https://'))) {
                results.push(sanitizeImageDataUrl(p));
            }
        }
        if (results.length > 0) return results;
    }

    // 4. Split standard HTTP/HTTPS/Blob/Relative URLs by newlines, commas, or semicolons
    const rawParts = str.split(/[\n\r,;]+/);
    const urls: string[] = [];
    for (let part of rawParts) {
        part = part.trim().replace(/^["'\\]+|["'\\]+$/g, '');
        if (part && (part.startsWith('http://') || part.startsWith('https://') || part.startsWith('blob:') || part.startsWith('/') || part.includes('.'))) {
            urls.push(sanitizeImageDataUrl(part));
        }
    }

    if (urls.length > 0) return urls;

    // Fallback single string check
    const cleaned = sanitizeImageDataUrl(str);
    if (cleaned.startsWith('data:image/') || cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('blob:')) {
        return [cleaned];
    }

    return [];
};

/**
 * Helper to determine if a string or parsed URL is an image.
 */
export const isImageEvidence = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    const clean = sanitizeImageDataUrl(url);
    if (clean.startsWith('data:image/')) return true;
    if (clean.startsWith('blob:')) return true;
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
        if (/\.(pdf|doc|docx|xls|xlsx|csv|zip|rar)$/i.test(clean)) return false;
        return true;
    }
    return false;
};
