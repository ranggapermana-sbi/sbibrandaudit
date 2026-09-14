import React, { useState, useMemo } from 'react';
import { 
    ParsedLinkInfo, 
    extractAllUrlsFromText, 
    parseEvidenceUrls 
} from '../../lib/evidenceUtils';
import { 
    ExternalLink, 
    Eye, 
    Copy, 
    Check, 
    FileText, 
    Folder, 
    Image as ImageIcon, 
    FileSpreadsheet, 
    Presentation, 
    Globe, 
    X,
    FileCheck
} from 'lucide-react';

interface EvidenceMediaViewerProps {
    rawEvidence: any;
    itemName?: string;
    hotelName?: string;
    onEnlarge?: (url: string) => void;
}

export const EvidenceMediaViewer: React.FC<EvidenceMediaViewerProps> = ({
    rawEvidence,
    itemName,
    hotelName,
    onEnlarge
}) => {
    const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
    const [localLightboxUrl, setLocalLightboxUrl] = useState<string | null>(null);

    const rawString = useMemo(() => {
        if (!rawEvidence) return '';
        if (typeof rawEvidence === 'object') {
            try {
                return JSON.stringify(rawEvidence, null, 2);
            } catch (e) {
                return String(rawEvidence);
            }
        }
        return String(rawEvidence).trim();
    }, [rawEvidence]);

    // Clean text by stripping out massive base64 image data strings so remarks remain readable
    const cleanDisplayString = useMemo(() => {
        if (!rawString) return '';
        if (rawString.startsWith('data:image/')) return '';
        // Replace base64 data URIs inside text with empty string
        return rawString.replace(/data:image\/[a-zA-Z0-9+\-.]+;base64,[a-zA-Z0-9+/=\s\r\n\t\\]+/gi, '').trim();
    }, [rawString]);

    // Parse direct image URLs (including base64 and standard image uploads)
    const directImageUrls = useMemo<string[]>(() => {
        return parseEvidenceUrls(rawEvidence);
    }, [rawEvidence]);

    // Parse all web links (Google Drive, Docs, Sheets, external websites, etc. Excludes base64)
    const parsedLinks = useMemo<ParsedLinkInfo[]>(() => {
        const links = extractAllUrlsFromText(rawEvidence);
        // Exclude direct image files if they are already rendered in the Photo Evidence gallery
        return links.filter(link => {
            if (link.type.startsWith('google-') || link.type === 'pdf' || link.type === 'web') {
                return true;
            }
            return !directImageUrls.includes(link.directViewUrl);
        });
    }, [rawEvidence, directImageUrls]);

    const handleCopy = (url: string, id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(url);
        setCopiedIndex(id);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleOpenLightbox = (url: string) => {
        if (onEnlarge) {
            onEnlarge(url);
        } else {
            setLocalLightboxUrl(url);
        }
    };

    if (!cleanDisplayString && directImageUrls.length === 0 && parsedLinks.length === 0) {
        return (
            <div className="p-3 bg-slate-100/70 rounded-xl text-slate-400 text-xs italic">
                No evidence submitted by property.
            </div>
        );
    }

    // Helper to render text with live clickable web URLs (strictly HTTP/HTTPS, excluding base64)
    const renderTextWithClickableLinks = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s"'<>]+)/gi;
        const parts = text.split(urlRegex);

        return parts.map((part, i) => {
            if (!part) return null;
            if (part.match(urlRegex)) {
                const clean = part.replace(/[,\.;\)>\]'"]+$/g, '').trim();
                const isDrive = clean.includes('drive.google.com') || clean.includes('docs.google.com');
                return (
                    <a
                        key={i}
                        href={clean}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className={`inline-flex items-center gap-1 font-semibold underline break-all px-1.5 py-0.5 rounded transition-colors ${
                            isDrive 
                                ? 'text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100' 
                                : 'text-blue-600 hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100'
                        }`}
                        title="Open link in new tab"
                    >
                        <span>{clean.length > 55 ? `${clean.slice(0, 50)}...` : clean}</span>
                        <ExternalLink size={12} className="shrink-0" />
                    </a>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    // Determine if the raw text is JUST a single URL (avoid duplicating text box)
    const isSingleRawUrl = parsedLinks.length === 1 && (
        cleanDisplayString.trim() === parsedLinks[0].originalUrl || 
        cleanDisplayString.trim() === parsedLinks[0].cleanUrl
    );

    return (
        <div className="space-y-3">
            {/* 1. Formatted Text Display (if there is descriptive text) */}
            {cleanDisplayString && !isSingleRawUrl && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-800 whitespace-pre-wrap break-words leading-relaxed shadow-xs">
                    {renderTextWithClickableLinks(cleanDisplayString)}
                </div>
            )}

            {/* 2. Direct Image Galleries (for uploaded photos or base64) */}
            {directImageUrls.length > 0 && (
                <div className="space-y-2.5">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                        <ImageIcon size={13} className="text-indigo-600" />
                        <span>Submitted Photo Evidence ({directImageUrls.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {directImageUrls.map((imgUrl, imgIdx) => (
                            <div 
                                key={imgIdx} 
                                className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 aspect-video flex items-center justify-center shadow-xs"
                            >
                                <img
                                    src={imgUrl}
                                    alt={`${itemName || 'Audit Evidence'} #${imgIdx + 1}`}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                    referrerPolicy={imgUrl.startsWith('data:') || imgUrl.startsWith('blob:') ? undefined : 'no-referrer'}
                                />
                                
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                    <div className="flex justify-end gap-1.5">
                                        {!imgUrl.startsWith('data:') && (
                                            <a
                                                href={imgUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg text-xs font-bold transition-transform hover:scale-105 shadow-sm"
                                                title="Open in new tab"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenLightbox(imgUrl)}
                                        className="w-full py-2 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                    >
                                        <Eye size={14} />
                                        <span>Click to Enlarge</span>
                                    </button>
                                </div>

                                <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded group-hover:opacity-0 transition-opacity">
                                    Photo {imgIdx + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Clean Cards for Google Drive Links and External Web Documents */}
            {parsedLinks.length > 0 && (
                <div className="space-y-2.5">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                        <FileCheck size={13} className="text-emerald-600" />
                        <span>Attached Links ({parsedLinks.length})</span>
                    </div>

                    <div className="space-y-2.5">
                        {parsedLinks.map((link, idx) => {
                            const linkId = `link_${idx}_${link.fileId || link.cleanUrl}`;
                            const isGoogleDrive = link.type.startsWith('google-');

                            return (
                                <div 
                                    key={linkId} 
                                    className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                                            isGoogleDrive 
                                                ? 'bg-amber-50 text-amber-600 border border-amber-200/80' 
                                                : link.type === 'pdf'
                                                ? 'bg-red-50 text-red-600 border border-red-200/80'
                                                : 'bg-indigo-50 text-indigo-600 border border-indigo-200/80'
                                        }`}>
                                            {link.type === 'google-drive-folder' ? (
                                                <Folder size={18} />
                                            ) : link.type === 'google-sheet' ? (
                                                <FileSpreadsheet size={18} />
                                            ) : link.type === 'google-slide' ? (
                                                <Presentation size={18} />
                                            ) : link.type === 'pdf' ? (
                                                <FileText size={18} />
                                            ) : link.type === 'image' ? (
                                                <ImageIcon size={18} />
                                            ) : (
                                                <Globe size={18} />
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                                    isGoogleDrive 
                                                        ? 'bg-amber-100 text-amber-800' 
                                                        : 'bg-indigo-100 text-indigo-800'
                                                }`}>
                                                    {link.title}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    {link.domain}
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-800 truncate mt-0.5 max-w-sm sm:max-w-md" title={link.cleanUrl}>
                                                {link.cleanUrl}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        <button
                                            type="button"
                                            onClick={(e) => handleCopy(link.directViewUrl, linkId, e)}
                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors border border-slate-200/80 cursor-pointer"
                                            title="Copy Link"
                                        >
                                            {copiedIndex === linkId ? (
                                                <Check size={14} className="text-emerald-600" />
                                            ) : (
                                                <Copy size={14} />
                                            )}
                                        </button>

                                        <a
                                            href={link.directViewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all hover:shadow-xs active:scale-95 cursor-pointer ${
                                                isGoogleDrive
                                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                            }`}
                                        >
                                            <span>Open Link</span>
                                            <ExternalLink size={13} />
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* In-App Lightbox Modal for Zooming Photos */}
            {localLightboxUrl && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
                    onClick={() => setLocalLightboxUrl(null)}
                >
                    <div className="w-full max-w-5xl flex items-center justify-between text-white pb-3">
                        <div className="text-sm font-bold truncate">
                            {itemName || 'Evidence Inspection View'} {hotelName ? `• ${hotelName}` : ''}
                        </div>
                        <div className="flex items-center gap-3">
                            <a
                                href={localLightboxUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                            >
                                <span>Open Full Resolution</span>
                                <ExternalLink size={14} />
                            </a>
                            <button
                                type="button"
                                onClick={() => setLocalLightboxUrl(null)}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="relative max-h-[85vh] max-w-full overflow-hidden flex items-center justify-center">
                        <img
                            src={localLightboxUrl}
                            alt="Audit Evidence Fullscreen"
                            className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
