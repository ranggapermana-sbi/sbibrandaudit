import React, { useState, useMemo } from 'react';
import { AuditItem } from '../../types';
import { AuditSubmissionV2 } from './types';
import { parseEvidenceUrls, isImageEvidence } from '../../lib/evidenceUtils';
import { CheckCircle2, XCircle, MinusCircle, ShieldCheck, Clock, ExternalLink, Image as ImageIcon, FileText, User, Calendar, Eye, X } from 'lucide-react';

interface AuditItemCardProps {
    item: AuditItem;
    categoryName?: string;
    submission?: AuditSubmissionV2;
    onUpdateScore: (itemId: string, score: number | 'N/A' | null) => void;
    onUpdateComment: (itemId: string, comment: string) => void;
    onSaveAudit: (itemId: string) => Promise<void>;
    isSaving?: boolean;
}

export const AuditItemCard: React.FC<AuditItemCardProps> = ({
    item,
    categoryName,
    submission,
    onUpdateScore,
    onUpdateComment,
    onSaveAudit,
    isSaving
}) => {
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const maxPoints = item.points ?? 5;
    const score = submission?.score;
    const isNA = submission?.is_na === true;

    // Derived states
    const isPass = !isNA && score !== undefined && score !== null && score > 0;
    const isFail = !isNA && score !== undefined && score !== null && score === 0;
    const isAudited = isPass || isFail || isNA;

    // Evidence value & parsed image URLs
    const rawEvidenceValue = submission?.value || submission?.photo_url || submission?.evidence_url || submission?.file_url || submission?.image_url || '';
    const parsedImageUrls = useMemo(() => parseEvidenceUrls(rawEvidenceValue), [rawEvidenceValue]);
    const hasImageEvidence = parsedImageUrls.length > 0;

    return (
        <div id={`audit-item-card-${item.id}`} className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-4 sm:p-6 mb-4">
            
            {/* Top Item Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                        {categoryName || 'Audit Item'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                        Max: {maxPoints} pts
                    </span>
                    <span className="text-xs text-slate-400 font-mono">ID: {item.id.slice(0, 8)}</span>
                </div>

                {/* Audit Status Badge */}
                <div className="shrink-0">
                    {isPass && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            <span>PASSED (+{score} PTS)</span>
                        </span>
                    )}
                    {isFail && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-black">
                            <XCircle size={14} className="text-red-600" />
                            <span>FAILED (0 PTS)</span>
                        </span>
                    )}
                    {isNA && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                            <MinusCircle size={14} className="text-amber-600" />
                            <span>N/A EXEMPT</span>
                        </span>
                    )}
                    {!isAudited && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                            <Clock size={14} />
                            <span>UNSCORED</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Item Title & Description */}
            <div className="mb-5">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {item.name}
                </h3>
                {item.description && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {item.description}
                    </p>
                )}
            </div>

            {/* Split Content: Left = Property Evidence, Right = Auditor Scoring Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Left: Property Evidence */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                            <FileText size={14} className="text-indigo-600" />
                            <span>Property Submitted Evidence</span>
                        </div>

                        {rawEvidenceValue ? (
                            <div>
                                {hasImageEvidence ? (
                                    <div className="space-y-3 mb-3">
                                        {parsedImageUrls.map((imgUrl, imgIdx) => (
                                            <div key={imgIdx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-black/5 aspect-video">
                                                <img
                                                    src={imgUrl}
                                                    alt={`Property Audit Evidence ${imgIdx + 1}`}
                                                    className="w-full h-full object-cover"
                                                    referrerPolicy={imgUrl.startsWith('data:') || imgUrl.startsWith('blob:') ? undefined : 'no-referrer'}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setLightboxUrl(imgUrl)}
                                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5 cursor-zoom-in"
                                                >
                                                    <Eye size={16} />
                                                    <span>Enlarge Evidence {parsedImageUrls.length > 1 ? `#${imgIdx + 1}` : ''}</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-800 mb-3 whitespace-pre-wrap break-words">
                                        {rawEvidenceValue}
                                    </div>
                                )}

                                {/* Submitter Metadata */}
                                <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-200/60">
                                    {submission?.submitted_by_name && (
                                        <div className="flex items-center gap-1.5">
                                            <User size={12} className="text-slate-400" />
                                            <span>Submitted by: <strong>{submission.submitted_by_name}</strong></span>
                                        </div>
                                    )}
                                    {submission?.updated_at && (
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={12} className="text-slate-400" />
                                            <span>Updated: {new Date(submission.updated_at).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl my-2">
                                <ImageIcon size={28} className="mx-auto text-slate-300 mb-1.5" />
                                <div className="text-xs font-bold text-slate-400">No Evidence Uploaded</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">Property has not submitted evidence for this item yet.</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Auditor Scoring Panel */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck size={14} className="text-indigo-600" />
                                <span>Auditor Evaluation</span>
                            </span>
                            {isSaving ? (
                                <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 animate-pulse">
                                    <Clock size={11} /> Saving to DB...
                                </span>
                            ) : (
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 size={11} /> DB Synced
                                </span>
                            )}
                        </div>

                        {/* Pass / Fail / N/A Action Buttons */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            
                            {/* PASS Button */}
                            <button
                                type="button"
                                id={`btn-audit-pass-${item.id}`}
                                onClick={() => onUpdateScore(item.id, isPass ? null : maxPoints)}
                                className={`py-2.5 px-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all border ${
                                    isPass 
                                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/30' 
                                        : 'bg-white hover:bg-emerald-50 text-emerald-800 border-slate-200 hover:border-emerald-300'
                                }`}
                            >
                                <CheckCircle2 size={16} />
                                <span>PASS (+{maxPoints})</span>
                            </button>

                            {/* FAIL Button */}
                            <button
                                type="button"
                                id={`btn-audit-fail-${item.id}`}
                                onClick={() => onUpdateScore(item.id, isFail ? null : 0)}
                                className={`py-2.5 px-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all border ${
                                    isFail 
                                        ? 'bg-red-600 text-white border-red-700 shadow-sm ring-2 ring-red-500/30' 
                                        : 'bg-white hover:bg-red-50 text-red-800 border-slate-200 hover:border-red-300'
                                }`}
                            >
                                <XCircle size={16} />
                                <span>FAIL (0 PTS)</span>
                            </button>

                            {/* N/A Button */}
                            <button
                                type="button"
                                id={`btn-audit-na-${item.id}`}
                                onClick={() => onUpdateScore(item.id, isNA ? null : 'N/A')}
                                className={`py-2.5 px-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all border ${
                                    isNA 
                                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-500/30' 
                                        : 'bg-white hover:bg-amber-50 text-amber-800 border-slate-200 hover:border-amber-300'
                                }`}
                            >
                                <MinusCircle size={16} />
                                <span>N/A (EXEMPT)</span>
                            </button>

                        </div>

                        {/* Auditor Remarks / Notes Input */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                Auditor Notes / Remarks
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Enter audit observations, comments, or corrective actions required..."
                                value={submission?.auditor_notes || submission?.auditor_remarks || ''}
                                onChange={e => onUpdateComment(item.id, e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                        </div>

                        {/* Save Audit to DB Button */}
                        <div className="mt-3">
                            <button
                                type="button"
                                id={`btn-save-audit-v2-${item.id}`}
                                onClick={() => onSaveAudit(item.id)}
                                disabled={isSaving}
                                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-indigo-100 transition-all cursor-pointer disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <Clock size={15} className="animate-spin" />
                                        <span>Saving to Supabase DB...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={15} />
                                        <span>Save Audit to DB</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Lightbox Modal */}
            {lightboxUrl && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="relative max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setLightboxUrl(null)}
                            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center z-10 transition-colors"
                        >
                            <X size={18} />
                        </button>
                        <img
                            src={lightboxUrl}
                            alt="Audit Evidence Lightbox"
                            className="max-w-full max-h-[85vh] object-contain mx-auto"
                            referrerPolicy={lightboxUrl.startsWith('data:') || lightboxUrl.startsWith('blob:') ? undefined : 'no-referrer'}
                        />
                    </div>
                </div>
            )}

        </div>
    );
};
