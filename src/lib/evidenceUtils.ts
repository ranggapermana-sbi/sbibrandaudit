/**
 * Utility functions for parsing, cleaning, and formatting audit evidence image URLs, Google Drive links, and base64 payloads.
 */

export type LinkEvidenceType = 
    | 'google-drive-file' 
    | 'google-drive-folder' 
    | 'google-doc' 
    | 'google-sheet' 
    | 'google-slide' 
    | 'image' 
    | 'pdf' 
    | 'web';

export interface ParsedLinkInfo {
    originalUrl: string;
    cleanUrl: string;
    type: LinkEvidenceType;
    title: string;
    domain: string;
    fileId?: string;
    previewUrl?: string;       // For iframe embed preview (Google Drive preview, Google Docs, PDF, etc.)
    thumbnailUrl?: string;     // For direct thumbnail rendering (lh3.googleusercontent.com/d/ID or image url)
    directViewUrl: string;     // Direct URL to open in a new tab
}

export const formatDirectImageUrl = (url: any): string => {
    if (!url || typeof url !== 'string') return '';
    let trimmed = url.trim();

    // Convert Google Drive view/open URLs into direct image render URLs
    const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^\/\?#]+)/i) || trimmed.match(/drive\.google\.com\/open\?id=([^\&#]+)/i) || trimmed.match(/drive\.google\.com\/uc\?(?:.*&)?id=([^\&#]+)/i);
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
 * Classifies a URL to determine its specific link type (Google Drive File/Folder/Doc/Sheet/Slide, Image, PDF, Web).
 */
export const classifyLink = (rawUrl: string): ParsedLinkInfo => {
    const originalUrl = (rawUrl || '').trim().replace(/^["'\\\[]+|["'\\\]]+$/g, '');
    let cleanUrl = sanitizeImageDataUrl(originalUrl);

    // Get Domain
    let domain = '';
    try {
        if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
            domain = new URL(originalUrl).hostname.replace(/^www\./, '');
        }
    } catch (e) {
        domain = 'link';
    }

    // 1. Google Drive File (Image/Video/PDF/Zip in Drive)
    const driveFileMatch = originalUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
                           originalUrl.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i) ||
                           originalUrl.match(/drive\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
    if (driveFileMatch && driveFileMatch[1]) {
        const fileId = driveFileMatch[1];
        return {
            originalUrl,
            cleanUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
            type: 'google-drive-file',
            title: 'Google Drive File',
            domain: 'drive.google.com',
            fileId,
            previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
            thumbnailUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
            directViewUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
        };
    }

    // 2. Google Drive Folder
    const driveFolderMatch = originalUrl.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/i) ||
                             originalUrl.match(/drive\.google\.com\/embeddedfolderview\?id=([a-zA-Z0-9_-]+)/i);
    if (driveFolderMatch && driveFolderMatch[1]) {
        const folderId = driveFolderMatch[1];
        return {
            originalUrl,
            cleanUrl: `https://drive.google.com/drive/folders/${folderId}`,
            type: 'google-drive-folder',
            title: 'Google Drive Folder',
            domain: 'drive.google.com',
            fileId: folderId,
            previewUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#list`,
            directViewUrl: `https://drive.google.com/drive/folders/${folderId}`
        };
    }

    // 3. Google Docs
    const docMatch = originalUrl.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i);
    if (docMatch && docMatch[1]) {
        const fileId = docMatch[1];
        return {
            originalUrl,
            cleanUrl: `https://docs.google.com/document/d/${fileId}/edit`,
            type: 'google-doc',
            title: 'Google Document',
            domain: 'docs.google.com',
            fileId,
            previewUrl: `https://docs.google.com/document/d/${fileId}/preview`,
            directViewUrl: `https://docs.google.com/document/d/${fileId}/edit`
        };
    }

    // 4. Google Sheets
    const sheetMatch = originalUrl.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
    if (sheetMatch && sheetMatch[1]) {
        const fileId = sheetMatch[1];
        return {
            originalUrl,
            cleanUrl: `https://docs.google.com/spreadsheets/d/${fileId}/edit`,
            type: 'google-sheet',
            title: 'Google Spreadsheet',
            domain: 'docs.google.com',
            fileId,
            previewUrl: `https://docs.google.com/spreadsheets/d/${fileId}/preview`,
            directViewUrl: `https://docs.google.com/spreadsheets/d/${fileId}/edit`
        };
    }

    // 5. Google Slides
    const slideMatch = originalUrl.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/i);
    if (slideMatch && slideMatch[1]) {
        const fileId = slideMatch[1];
        return {
            originalUrl,
            cleanUrl: `https://docs.google.com/presentation/d/${fileId}/edit`,
            type: 'google-slide',
            title: 'Google Presentation',
            domain: 'docs.google.com',
            fileId,
            previewUrl: `https://docs.google.com/presentation/d/${fileId}/preview`,
            directViewUrl: `https://docs.google.com/presentation/d/${fileId}/edit`
        };
    }

    // 6. Direct Images (Base64, Blob, or direct image file extensions)
    if (
        cleanUrl.startsWith('data:image/') ||
        cleanUrl.startsWith('blob:') ||
        cleanUrl.includes('lh3.googleusercontent.com/d/') ||
        /\.(jpe?g|png|webp|gif|svg|avif|bmp|ico)(\?.*)?$/i.test(originalUrl)
    ) {
        return {
            originalUrl,
            cleanUrl,
            type: 'image',
            title: 'Evidence Image',
            domain: domain || 'image',
            thumbnailUrl: cleanUrl,
            directViewUrl: originalUrl
        };
    }

    // 7. PDF Document
    if (/\.pdf(\?.*)?$/i.test(originalUrl)) {
        return {
            originalUrl,
            cleanUrl: originalUrl,
            type: 'pdf',
            title: 'PDF Document',
            domain: domain || 'pdf',
            previewUrl: originalUrl,
            directViewUrl: originalUrl
        };
    }

    // 8. General Web Link
    return {
        originalUrl,
        cleanUrl: originalUrl,
        type: 'web',
        title: domain ? `${domain} Link` : 'External Link',
        domain: domain || 'link',
        directViewUrl: originalUrl
    };
};

/**
 * Extracts all web URLs (HTTP/HTTPS) embedded in any raw text, JSON object, or string.
 * Explicitly EXCLUDES base64 data URLs.
 */
export const extractAllUrlsFromText = (rawInput: any): ParsedLinkInfo[] => {
    if (!rawInput) return [];

    let str = typeof rawInput === 'object' ? JSON.stringify(rawInput) : String(rawInput).trim();
    if (!str || str === 'null' || str === 'undefined' || str === '{}' || str === '[]') return [];

    // Skip pure base64 strings entirely
    if (str.startsWith('data:image/') || str.startsWith('data:application/')) {
        return [];
    }

    // Check JSON arrays or objects first
    if ((str.startsWith('[') && str.endsWith(']')) || (str.startsWith('{') && str.endsWith('}'))) {
        try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed)) {
                return parsed.flatMap(item => extractAllUrlsFromText(item));
            }
            if (parsed && typeof parsed === 'object') {
                const keys = ['url', 'urls', 'link', 'drive_url', 'evidence_url', 'evidence_urls', 'value', 'document_url', 'file_url', 'notes', 'remark'];
                const results: ParsedLinkInfo[] = [];
                for (const k of keys) {
                    if (parsed[k] && typeof parsed[k] === 'string' && !parsed[k].startsWith('data:')) {
                        results.push(...extractAllUrlsFromText(parsed[k]));
                    }
                }
                if (results.length > 0) return results;
            }
        } catch (e) {}
    }

    // Web URL regex matching strictly http and https links (EXCLUDES data: and base64 URLs)
    const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
    const matches = str.match(urlRegex) || [];

    const uniqueUrls = new Set<string>();
    const parsedList: ParsedLinkInfo[] = [];

    for (let rawMatch of matches) {
        // Clean trailing punctuation like commas, periods, parentheses, brackets, quotes
        let clean = rawMatch.replace(/[,\.;\)>\]'"]+$/g, '').trim();
        clean = clean.replace(/^["'\\\[]+|["'\\\]]+$/g, '').trim();
        
        // Ensure it's a valid HTTP/HTTPS web link and not base64
        if (clean && (clean.startsWith('http://') || clean.startsWith('https://')) && !uniqueUrls.has(clean)) {
            uniqueUrls.add(clean);
            parsedList.push(classifyLink(clean));
        }
    }

    return parsedList;
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
    if (clean.includes('lh3.googleusercontent.com/d/')) return true;
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
        if (/\.(pdf|doc|docx|xls|xlsx|csv|zip|rar)$/i.test(clean)) return false;
        return true;
    }
    return false;
};

