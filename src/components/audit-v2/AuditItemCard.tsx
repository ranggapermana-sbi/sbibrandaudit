import React, { useState } from 'react';
import { AuditItem } from '../../types';
import { AuditSubmissionV2, AuditSubmissionOriginal, isSubmissionChanged } from './types';
import { EvidenceMediaViewer } from '../common/EvidenceMediaViewer';
import { CheckCircle2, XCircle, MinusCircle, ShieldCheck, Clock, FileText, User, Calendar, Image as ImageIcon, X, ChevronDown, ChevronUp } from 'lucide-react';

function formatSubmissionTimestamp(isoString?: string | null): string {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return String(isoString);
        const day = d.getDate();
        const monthShort = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day} ${monthShort} ${year}, ${hours}:${mins}`;
    } catch {
        return String(isoString);
    }
}

function getAuditorVerdict(sub?: { score?: number | null; is_na?: boolean | null } | null): 'Pass' | 'Fail' | 'N/A' | 'Not scored' {
    if (!sub) return 'Not scored';
    if (sub.is_na === true || String(sub.is_na) === 'true') {
        return 'N/A';
    }
    if (sub.score !== undefined && sub.score !== null) {
        const num = Number(sub.score);
        if (!isNaN(num)) {
            return num > 0 ? 'Pass' : 'Fail';
        }
    }
    return 'Not scored';
}

interface AuditItemCardProps {
    item: AuditItem;
    categoryName?: string;
    submission?: AuditSubmissionV2;
    original?: AuditSubmissionOriginal;
    onUpdateScore: (itemId: string, score: number | 'N/A' | null) => void;
    onUpdateComment: (itemId: string, comment: string) => void;
    onSaveAudit: (itemId: string) => Promise<void>;
    isSaving?: boolean;
}

export const AuditItemCard: React.FC<AuditItemCardProps> = ({
    item,
    categoryName,
    submission,
    original,
    onUpdateScore,
    onUpdateComment,
    onSaveAudit,
    isSaving
}) => {
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    const maxPoints = item.points ?? 5;
    const score = submission?.score;
    const isNA = submission?.is_na === true;

    // Derived states
    const isPass = !isNA && score !== undefined && score !== null && Number(score) > 0;
    const isFail = !isNA && score !== undefined && score !== null && Number(score) === 0;
    const isAudited = isPass || isFail || isNA;
    const isChanged = isSubmissionChanged(original, submission);

    // Evidence values
    const rawEvidenceValue = submission?.value || submission?.photo_url || submission?.evidence_url || submission?.file_url || submission?.image_url || '';
    const rawOriginalEvidenceValue = original?.value || '';

    // Original verdict and remarks at unlock
    const originalVerdict = getAuditorVerdict(original);
    const origAuditorRemarks = (original?.auditor_notes || original?.auditor_remarks || '').trim();

    // Unified evidence rendering helper ensuring SAME logic for current and original
    const renderEvidenceContent = (
        data: {
            value?: string | null;
            is_na?: boolean | null;
            na_reason?: string | null;
            notes?: string | null;
            photo_url?: string;
            evidence_url?: string;
            file_url?: string;
            image_url?: string;
        } | undefined | null,
        isOriginal: boolean = false
    ) => {
        const isItemNA = data?.is_na === true || String(data?.is_na) === 'true';
        const naReason = data?.na_reason || data?.notes || '';
        const rawVal = data?.value || (!isOriginal ? (data?.photo_url || data?.evidence_url || data?.file_url || data?.image_url) : '') || '';

        if (isItemNA) {
            return (
                <div className="p-3.5 bg-amber-50/90 rounded-xl border border-amber-200 mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                        <MinusCircle size={15} className="text-amber-600" />
                        <span>N/A</span>
                    </div>
                    {naReason ? (
                        <p className="text-xs text-amber-900/90 mt-1.5 leading-relaxed">
                            <span className="font-bold">Reason:</span> {naReason}
                        </p>
                    ) : (
                        <p className="text-[11px] text-amber-800/80 mt-1 italic">No reason provided.</p>
                    )}
                </div>
            );
        }

        if (!rawVal && item.inputType !== 'checkbox') {
            return (
                <div className={`p-6 text-center border-2 border-dashed rounded-xl my-2 ${isOriginal ? 'border-slate-300/80' : 'border-slate-200'}`}>
                    <ImageIcon size={28} className={`mx-auto mb-1.5 ${isOriginal ? 'text-slate-400' : 'text-slate-300'}`} />
                    <div className={`text-xs font-bold ${isOriginal ? 'text-slate-500' : 'text-slate-400'}`}>
                        {isOriginal ? 'No Original Evidence' : 'No Evidence Uploaded'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                        {isOriginal ? 'Item had no evidence prior to unlock.' : 'Property has not submitted evidence for this item yet.'}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {/* Checkbox input evidence */}
                {item.inputType === 'checkbox' && (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Submitted Value</span>
                            <p className={`text-sm font-black leading-none ${String(rawVal).toLowerCase() === 'true' ? 'text-emerald-700' : 'text-red-700'}`}>
                                {String(rawVal).toLowerCase() === 'true' ? 'YES / COMPLIANT' : 'NO / NON-COMPLIANT'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Numeric input evidence */}
                {item.inputType === 'numeric' && rawVal && (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Submitted Value</span>
                            <p className="text-sm font-black text-slate-900 leading-none">{rawVal}</p>
                        </div>
                        {item.min_value !== undefined && (
                            <div className="text-right">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Min. Required</span>
                                <p className="text-sm font-black text-indigo-600 leading-none">{item.min_value}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Photos, Document Links, Drive Links, and Text via EvidenceMediaViewer */}
                {rawVal && item.inputType !== 'checkbox' && (
                    <EvidenceMediaViewer 
                        rawEvidence={rawVal}
                        itemName={isOriginal ? `${item.name} (Original)` : item.name}
                        onEnlarge={(url) => setLightboxUrl(url)}
                    />
                )}
            </div>
        );
    };

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
                            <span>PASSED (+{maxPoints} PTS)</span>
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
                <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {item.name}
                    </h3>
                    {isChanged && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Updated after unlock
                        </span>
                    )}
                </div>
                {item.description && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {item.description}
                    </p>
                )}
            </div>

            {/* Split Content: Either side-by-side comparison on lg + scoring, or standard 2-column grid */}
            {isExpanded && isChanged ? (
                <div className="space-y-5">
                    {/* On screens >=1024px, show Current and Original side by side with those headings; on smaller screens stack them */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        
                        {/* Left: Current submission */}
                        <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <FileText size={14} className="text-indigo-600" />
                                        <span>Current submission</span>
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                                        Current
                                    </span>
                                </div>

                                {/* Current Evidence Rendering */}
                                {renderEvidenceContent(submission, false)}

                                {/* Submitter Metadata */}
                                {(submission?.submitted_by_name || submission?.updated_at) && (
                                    <div className="text-[11px] text-slate-500 space-y-1 pt-3 border-t border-slate-200/60 mt-3">
                                        {submission?.submitted_by_name && (
                                            <div className="flex items-center gap-1.5">
                                                <User size={12} className="text-slate-400" />
                                                <span>Submitted by: <strong>{submission.submitted_by_name}</strong></span>
                                            </div>
                                        )}
                                        {submission?.updated_at && (
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={12} className="text-slate-400" />
                                                <span>Updated: {formatSubmissionTimestamp(submission.updated_at)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Toggle button to collapse */}
                            <div className="pt-3 border-t border-slate-200/60 mt-3">
                                <button
                                    type="button"
                                    id={`btn-toggle-original-${item.id}`}
                                    onClick={() => setIsExpanded(false)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                    <ChevronUp size={14} className="text-slate-500" />
                                    <span>Hide original submission</span>
                                </button>
                            </div>
                        </div>

                        {/* Right: Original submission panel (muted grey background, amber left border) */}
                        <div className="bg-slate-100/90 border-l-4 border-amber-500 rounded-r-xl border-y border-r border-slate-200/80 p-4 flex flex-col justify-between">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-amber-950 mb-3 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 font-black">
                                        <FileText size={14} className="text-amber-600" />
                                        <span>Original submission</span>
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 text-[10px] font-bold">
                                        Original
                                    </span>
                                </div>

                                {/* Original Evidence Rendering (same component/logic: EvidenceMediaViewer, text/doc/num/checkbox, or N/A + reason) */}
                                {renderEvidenceContent(original, true)}
                            </div>

                            {/* Original Metadata, Verdict & Caption */}
                            <div className="space-y-2.5 pt-3 border-t border-slate-200/80 mt-3">
                                {/* Submitter & timestamp */}
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                    <User size={12} className="text-slate-400 shrink-0" />
                                    <span>
                                        Submitted by {original?.submitted_by_name || 'Property'}
                                        {original?.submitted_at && ` · ${formatSubmissionTimestamp(original.submitted_at)}`}
                                    </span>
                                </div>

                                {/* Auditor verdict at unlock */}
                                <div className="p-2.5 bg-white/90 rounded-lg border border-slate-200 text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-700">Auditor verdict at unlock:</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                            originalVerdict === 'Pass' ? 'bg-emerald-100 text-emerald-800' :
                                            originalVerdict === 'Fail' ? 'bg-red-100 text-red-800' :
                                            originalVerdict === 'N/A' ? 'bg-amber-100 text-amber-800' :
                                            'bg-slate-200 text-slate-700'
                                        }`}>
                                            {originalVerdict}
                                        </span>
                                    </div>
                                    {origAuditorRemarks && (
                                        <p className="text-slate-600 mt-1 italic pl-1.5 border-l-2 border-amber-300">
                                            "{origAuditorRemarks}"
                                        </p>
                                    )}
                                </div>

                                {/* Caption: Original saved */}
                                {(original?.captured_at || original?.submitted_at) && (
                                    <div className="text-[10px] text-slate-500 font-medium">
                                        Original saved {formatSubmissionTimestamp(original?.captured_at || original?.submitted_at)}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Auditor Evaluation Scoring Panel (display-only original does not affect controls) */}
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
                                ) : submission?.is_saved_in_db ? (
                                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                        <CheckCircle2 size={11} /> DB Synced
                                    </span>
                                ) : (score !== undefined && score !== null) || isNA ? (
                                    <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 animate-pulse">
                                        <Clock size={11} /> Pending DB Save
                                    </span>
                                ) : null}
                            </div>

                            {/* Pass / Fail / N/A Action Buttons */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                
                                {/* PASS Button */}
                                <button
                                    type="button"
                                    id={`btn-audit-pass-${item.id}`}
                                    onClick={() => onUpdateScore(item.id, isPass ? null : (maxPoints > 0 ? maxPoints : 1))}
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
                                    className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                                        isSaving
                                            ? 'bg-indigo-600 text-white'
                                            : !submission?.is_saved_in_db && ((score !== undefined && score !== null) || isNA)
                                            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-200 ring-2 ring-amber-400/50'
                                            : submission?.is_saved_in_db
                                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'
                                    }`}
                                >
                                    {isSaving ? (
                                        <>
                                            <Clock size={15} className="animate-spin" />
                                            <span>Saving to Supabase DB...</span>
                                        </>
                                    ) : !submission?.is_saved_in_db && ((score !== undefined && score !== null) || isNA) ? (
                                        <>
                                            <ShieldCheck size={15} />
                                            <span>Save Audit to DB</span>
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck size={15} />
                                            <span>{submission?.is_saved_in_db ? 'Saved to DB' : 'Save Audit to DB'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    
                    {/* Left: Property Evidence */}
                    <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                                <FileText size={14} className="text-indigo-600" />
                                <span>Property Submitted Evidence</span>
                            </div>

                            {/* Property Submitted Evidence */}
                            {renderEvidenceContent(submission, false)}

                            {/* Submitter Metadata */}
                            {(submission?.submitted_by_name || submission?.updated_at) && (
                                <div className="text-[11px] text-slate-500 space-y-1 pt-3 border-t border-slate-200/60 mt-3">
                                    {submission?.submitted_by_name && (
                                        <div className="flex items-center gap-1.5">
                                            <User size={12} className="text-slate-400" />
                                            <span>Submitted by: <strong>{submission.submitted_by_name}</strong></span>
                                        </div>
                                    )}
                                    {submission?.updated_at && (
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={12} className="text-slate-400" />
                                            <span>Updated: {formatSubmissionTimestamp(submission.updated_at)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Collapsed toggle below current evidence if item is changed */}
                        {isChanged && (
                            <div className="pt-3 border-t border-slate-200/60 mt-3">
                                <button
                                    type="button"
                                    id={`btn-toggle-original-${item.id}`}
                                    onClick={() => setIsExpanded(true)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-850 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                    <ChevronDown size={14} className="text-amber-700" />
                                    <span>View original submission</span>
                                </button>
                            </div>
                        )}
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
                                ) : submission?.is_saved_in_db ? (
                                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                        <CheckCircle2 size={11} /> DB Synced
                                    </span>
                                ) : (score !== undefined && score !== null) || isNA ? (
                                    <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 animate-pulse">
                                        <Clock size={11} /> Pending DB Save
                                    </span>
                                ) : null}
                            </div>

                            {/* Pass / Fail / N/A Action Buttons */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                
                                {/* PASS Button */}
                                <button
                                    type="button"
                                    id={`btn-audit-pass-${item.id}`}
                                    onClick={() => onUpdateScore(item.id, isPass ? null : (maxPoints > 0 ? maxPoints : 1))}
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
                                    className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                                        isSaving
                                            ? 'bg-indigo-600 text-white'
                                            : !submission?.is_saved_in_db && ((score !== undefined && score !== null) || isNA)
                                            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-200 ring-2 ring-amber-400/50'
                                            : submission?.is_saved_in_db
                                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'
                                    }`}
                                >
                                    {isSaving ? (
                                        <>
                                            <Clock size={15} className="animate-spin" />
                                            <span>Saving to Supabase DB...</span>
                                        </>
                                    ) : !submission?.is_saved_in_db && ((score !== undefined && score !== null) || isNA) ? (
                                        <>
                                            <ShieldCheck size={15} />
                                            <span>Save Audit to DB</span>
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck size={15} />
                                            <span>{submission?.is_saved_in_db ? 'Saved to DB' : 'Save Audit to DB'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            )}

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
