import React from 'react';
import { ArrowLeft, AlertCircle, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsLeft, ChevronsRight, FileText, Loader2, RefreshCw, Search } from 'lucide-react';
import { AuditItem, AuditCategory, Department } from '../../types';
import { AUDIT_PASS_THRESHOLD, AuditResult } from '../../lib/auditResults';

type AuditSortField = 'name' | 'code' | 'status' | 'percentage';
type AuditSortDirection = 'asc' | 'desc';
const AUDIT_STATUS_ORDER: Record<AuditResult['status'], number> = { passed: 0, failed: 1, not_audited: 2 };

const compareAuditResults = (field: AuditSortField, direction: AuditSortDirection) => (a: AuditResult, b: AuditResult): number => {
    let result = 0;
    if (field === 'name') result = a.name.localeCompare(b.name);
    else if (field === 'code') result = a.code.localeCompare(b.code);
    else if (field === 'status') result = AUDIT_STATUS_ORDER[a.status] - AUDIT_STATUS_ORDER[b.status];
    else result = (a.percentage ?? -1) - (b.percentage ?? -1);
    return direction === 'asc' ? result : -result;
};

export interface AuditResultsViewProps {
    auditResults: AuditResult[];
    departments: Department[];
    items: AuditItem[];
    catList: AuditCategory[];
    isSupabaseLoading: boolean;
    selectedAuditResultId: string | null;
    setSelectedAuditResultId: (id: string | null) => void;
    auditResultsSearch: string;
    setAuditResultsSearch: (value: string) => void;
    collapsedAuditDepartments: Record<string, boolean>;
    setCollapsedAuditDepartments: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    progressDataLoaded: boolean;
    progressDataLoading: boolean;
    progressDataError: string | null;
    fetchProgressSubmissions: (forceFull?: boolean) => Promise<void> | void;
    handleDownloadCertificate: (result: AuditResult) => Promise<void> | void;
    onBackToReport: () => void;
}

export const AuditResultsView: React.FC<AuditResultsViewProps> = (props) => {
    const {
        auditResults, departments, items, catList, isSupabaseLoading,
        selectedAuditResultId, setSelectedAuditResultId, auditResultsSearch, setAuditResultsSearch,
        collapsedAuditDepartments, setCollapsedAuditDepartments,
        progressDataLoaded, progressDataLoading, progressDataError, fetchProgressSubmissions,
        handleDownloadCertificate, onBackToReport
    } = props;

    const [sortField, setSortField] = React.useState<AuditSortField>('name');
    const [sortDirection, setSortDirection] = React.useState<AuditSortDirection>('asc');
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(10);

    const toggleSort = (field: AuditSortField) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setPage(1);
    };

    // Department columns in the list: each shows the department's score and its bonus
    const DEPARTMENT_COLUMNS = [
        { name: 'Branding & Marketing', label: 'Branding Marketing (%)' },
        { name: 'Digital Marketing', label: 'Digital Marketing (%)' },
        { name: 'Online Reputation', label: 'Online Reputation (%)' },
        { name: 'CRM & Loyalty', label: 'CRM & Loyalty (%)' },
    ];
    const HEAD_CLASS = 'px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500';
    const departmentScore = (r: AuditResult, departmentName: string): number | null => {
        const department = props.departments.find(d => d.name === departmentName);
        if (!department) return null;
        const rows = r.categories.filter(c => !c.isBonus && c.departmentId === String(department.id));
        const earned = rows.reduce((sum, c) => sum + c.earned, 0);
        const max = rows.reduce((sum, c) => sum + c.max, 0);
        return max > 0 ? Math.round((earned / max) * 100) : null;
    };
    const departmentBonus = (r: AuditResult, departmentName: string): number =>
        r.bonusRows.find(row => row.label === departmentName)?.points ?? 0;

    const renderSortHeader = (field: AuditSortField, label: string, alignRight: boolean, rowSpan?: number) => (
        <th rowSpan={rowSpan} className={`px-6 py-3 ${alignRight ? 'text-right' : ''}`}>
            <button
                type="button"
                onClick={() => toggleSort(field)}
                className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 ${alignRight ? 'justify-end w-full' : ''}`}
            >
                <span>{label}</span>
                {sortField === field
                    ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                    : <ArrowUpDown size={11} className="opacity-40" />}
            </button>
        </th>
    );

    return (
                    (() => {
                        const statusBadge = (status: 'passed' | 'failed' | 'not_audited') => {
                            if (status === 'passed') {
                                return <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">Passed</span>;
                            }
                            if (status === 'failed') {
                                return <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider">Failed</span>;
                            }
                            return <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-black uppercase tracking-wider">Not Audited</span>;
                        };

                        const selectedResult = selectedAuditResultId ? auditResults.find(r => r.hotelId === selectedAuditResultId) : undefined;

                        if (selectedResult) {
                            return (
                                <div className="space-y-6 animate-fadeIn">
                                    <div>
                                        <button
                                            onClick={() => setSelectedAuditResultId(null)}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/60 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                        >
                                            <ArrowLeft size={12} /> Back to Audit Results
                                        </button>
                                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{selectedResult.name}</h2>
                                        <p className="text-xs text-slate-500 mt-1">{selectedResult.code ? `${selectedResult.code} · ` : ''}Percentage for each audit category</p>
                                    </div>

                                    <div className="bg-white p-6 rounded-[20px] border border-slate-150/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Overall result</p>
                                            <div className="mt-2 flex items-center gap-3">
                                                {statusBadge(selectedResult.status)}
                                                <span className="text-2xl font-black text-slate-900">{selectedResult.percentage !== null ? `${selectedResult.percentage}%` : '—'}</span>
                                                {selectedResult.bonusTotal > 0 && (
                                                    <span className="text-xs font-bold text-emerald-700">
                                                        incl. +{selectedResult.bonusTotal}% bonus ({selectedResult.basePercentage}% audit)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4">
                                            {selectedResult.deductionTotal > 0 && (
                                            <span
                                                className="text-xs font-bold text-rose-700"
                                                title={selectedResult.deductions.map(d => `-${d.percentage}%: ${d.reason}`).join('\n')}
                                            >
                                                -{selectedResult.deductionTotal}% deduction
                                            </span>
                                        )}
                                        <p className="text-xs text-slate-500">Pass mark: {selectedResult.passMark}%</p>
                                            <button
                                                onClick={() => handleDownloadCertificate(selectedResult)}
                                                disabled={selectedResult.status === 'not_audited'}
                                                title={selectedResult.status === 'not_audited' ? 'Available once the hotel has audited items' : 'Download the brand excellence certificate'}
                                                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100/80 px-3.5 py-2 rounded-xl border border-indigo-200/60 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                                            >
                                                <FileText size={11} />
                                                <span>Download Certificate</span>
                                            </button>
                                        </div>
                                    </div>

                                    {selectedResult.categories.length === 0 ? (
                                        <div className="bg-white p-6 rounded-[20px] border border-slate-150/80 shadow-sm">
                                            <p className="text-sm text-slate-500">No scored items yet for this hotel.</p>
                                        </div>
                                    ) : (() => {
                                        // Group categories by department, keeping the department name from the admin's department list
                                        const groupMap = new Map<string, { key: string; name: string; categories: typeof selectedResult.categories }>();
                                        selectedResult.categories.forEach(cat => {
                                            const key = cat.departmentId || 'unassigned';
                                            const existing = groupMap.get(key);
                                            if (existing) {
                                                existing.categories.push(cat);
                                            } else {
                                                groupMap.set(key, {
                                                    key,
                                                    name: departments.find(d => String(d.id) === cat.departmentId)?.name || 'Unassigned',
                                                    categories: [cat]
                                                });
                                            }
                                        });
                                        const groups = Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name));
                                        const groupKeys = groups.map(g => `${selectedResult.hotelId}|${g.key}`);
                                        const setAllGroups = (collapsed: boolean) => setCollapsedAuditDepartments(prev => {
                                            const next = { ...prev };
                                            groupKeys.forEach(k => { next[k] = collapsed; });
                                            return next;
                                        });

                                        return (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setAllGroups(false)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-100/70 px-3 py-1.5 rounded-lg border border-indigo-100/60 transition-all active:scale-95"
                                                    >
                                                        Expand all
                                                    </button>
                                                    <button
                                                        onClick={() => setAllGroups(true)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60 transition-all active:scale-95"
                                                    >
                                                        Collapse all
                                                    </button>
                                                </div>

                                                {groups.map(group => {
                                                    const groupKey = `${selectedResult.hotelId}|${group.key}`;
                                                    // Departments start collapsed; only an explicit expand opens one
                                                    const isOpen = collapsedAuditDepartments[groupKey] === false;
                                                    const scoredCategories = group.categories.filter(c => !c.isBonus);
                                                    const deptEarned = scoredCategories.reduce((sum, c) => sum + c.earned, 0);
                                                    const deptMax = scoredCategories.reduce((sum, c) => sum + c.max, 0);
                                                    const deptPercentage = deptMax > 0 ? Math.round((deptEarned / deptMax) * 100) : null;

                                                    return (
                                                        <div key={groupKey} className="bg-white rounded-[20px] border border-slate-150/80 shadow-sm overflow-hidden">
                                                            <button
                                                                onClick={() => setCollapsedAuditDepartments(prev => ({ ...prev, [groupKey]: isOpen }))}
                                                                className="w-full flex items-center justify-between gap-4 px-6 py-4 bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
                                                                aria-expanded={isOpen}
                                                            >
                                                                <span className="flex items-center gap-2.5">
                                                                    <ChevronDown size={16} className={`text-slate-500 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
                                                                    <span className="text-sm font-bold text-slate-800">{group.name}</span>
                                                                    <span className="text-[10px] font-bold text-slate-400">
                                                                        {group.categories.length} {group.categories.length === 1 ? 'category' : 'categories'}
                                                                    </span>
                                                                </span>
                                                                <span className="text-xs font-black text-slate-700">
                                                                    {deptPercentage !== null ? `${deptPercentage}%` : 'Bonus'}
                                                                </span>
                                                            </button>

                                                            {isOpen && (
                                                                <div className="p-6 space-y-5">
                                                                    {group.categories.map(cat => (
                                                                        <div key={cat.id} className="space-y-1.5">
                                                                            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                                                                <span>{cat.name}</span>
                                                                                <span>
                                                                                    {cat.isBonus ? (
                                                                                        <span className={cat.bonusStatus === 'passed' ? 'text-emerald-700' : 'text-rose-700'}>
                                                                                            {cat.bonusStatus === 'passed' ? 'Passed' : 'Failed'} <span className="text-slate-400 font-semibold">(bonus +{cat.bonusPoints}%)</span>
                                                                                        </span>
                                                                                    ) : (
                                                                                        <>{cat.percentage}% <span className="text-slate-400 font-semibold">({cat.earned}/{cat.max} pts)</span></>
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className={`h-full rounded-full transition-all duration-500 ${(cat.isBonus ? cat.bonusStatus === 'passed' : cat.percentage >= AUDIT_PASS_THRESHOLD) ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                                                    style={{ width: `${cat.isBonus ? 100 : cat.percentage}%` }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        }

                        // Until the submissions and the checklist (categories and items) are loaded, results would show every hotel as Not Audited
                        const referenceDataReady = items.length > 0 && catList.length > 0;
                        if (!progressDataLoaded || (!referenceDataReady && isSupabaseLoading)) {
                            const failed = !!progressDataError && !progressDataLoaded;
                            return (
                                <div className="space-y-6 animate-fadeIn">
                                    <div>
                                        <button
                                            onClick={() => { onBackToReport(); }}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/60 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                        >
                                            <ArrowLeft size={12} /> Back to Audit Report & Inspection
                                        </button>
                                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Results</h2>
                                    </div>
                                    <div className="bg-white p-10 rounded-[20px] border border-slate-150/80 shadow-sm flex flex-col items-center justify-center text-center gap-3">
                                        {failed ? (
                                            <>
                                                <AlertCircle size={32} className="text-rose-500" />
                                                <p className="text-sm font-bold text-slate-800">Audit data could not be loaded</p>
                                                <p className="text-xs text-slate-500 max-w-md">{progressDataError}</p>
                                                <button
                                                    onClick={() => fetchProgressSubmissions(true)}
                                                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-full shadow-sm active:scale-95 transition-all"
                                                >
                                                    <RefreshCw size={12} /> Try again
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <Loader2 size={32} className="text-indigo-600 animate-spin" />
                                                <p className="text-sm font-bold text-slate-800">Loading audit data from the database…</p>
                                                <p className="text-xs text-slate-500">Results appear once the submissions and the checklist have loaded.</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        }

                        const query = auditResultsSearch.trim().toLowerCase();
                        const filtered = auditResults.filter(r =>
                            !query || r.name.toLowerCase().includes(query) || r.code.toLowerCase().includes(query)
                        );
                        const sorted = [...filtered].sort(compareAuditResults(sortField, sortDirection));
                        const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
                        const currentPage = Math.min(page, totalPages);
                        const rows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
                        const counts: Record<'passed' | 'failed' | 'not_audited', number> = { passed: 0, failed: 0, not_audited: 0 };
                        auditResults.forEach(r => { counts[r.status] += 1; });

                        return (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <button
                                        onClick={() => { onBackToReport(); }}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/60 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                    >
                                        <ArrowLeft size={12} /> Back to Audit Report & Inspection
                                    </button>
                                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Results</h2>
                                    <p className="text-xs text-slate-500 mt-1">
                                        A hotel passes at {AUDIT_PASS_THRESHOLD}% or more across its audited items. Click a hotel to see the percentage for each category.
                                        {progressDataLoading && (
                                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-600">
                                                <Loader2 size={10} className="animate-spin" /> Syncing…
                                            </span>
                                        )}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white p-5 rounded-[20px] border border-emerald-200/70 shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Passed</p>
                                        <p className="text-3xl font-black text-slate-900 mt-1">{counts.passed}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-[20px] border border-rose-200/70 shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Failed</p>
                                        <p className="text-3xl font-black text-slate-900 mt-1">{counts.failed}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-[20px] border border-slate-200/70 shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Not Audited</p>
                                        <p className="text-3xl font-black text-slate-900 mt-1">{counts.not_audited}</p>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-slate-150/80 shadow-sm flex items-center gap-3">
                                    <Search className="text-slate-400 shrink-0" size={18} />
                                    <input
                                        type="text"
                                        value={auditResultsSearch}
                                        onChange={(e) => { setAuditResultsSearch(e.target.value); setPage(1); }}
                                        placeholder="Search hotels by name or code..."
                                        className="w-full bg-transparent outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="bg-white rounded-[20px] border border-slate-150/80 shadow-sm overflow-hidden">
                                    <table className="w-[calc(100%-2rem)] mx-4 text-left">
                                        <thead className="bg-slate-50/80 border-b border-slate-100">
                                            <tr>
                                                {renderSortHeader('name', 'Hotel', false, 2)}
                                                {renderSortHeader('code', 'Code', false, 2)}
                                                <th rowSpan={2} className={HEAD_CLASS}>Region</th>
                                                <th rowSpan={2} className={HEAD_CLASS}>Country</th>
                                                <th rowSpan={2} className={HEAD_CLASS}>Brand</th>
                                                <th rowSpan={2} className={`${HEAD_CLASS} text-center`}>Star Rating</th>
                                                {DEPARTMENT_COLUMNS.map(d => (
                                                    <th key={d.name} colSpan={2} className={`${HEAD_CLASS} text-center border-l border-slate-100`}>{d.label}</th>
                                                ))}
                                                {renderSortHeader('status', 'Status', false, 2)}
                                                {renderSortHeader('percentage', 'Final Score', true, 2)}
                                                <th rowSpan={2} className={`${HEAD_CLASS} text-right`}><span className="sr-only">Certificate</span></th>
                                            </tr>
                                            <tr>
                                                {DEPARTMENT_COLUMNS.map(d => (
                                                    <React.Fragment key={d.name}>
                                                        <th className="px-1.5 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center border-l border-slate-100">Score</th>
                                                        <th className="px-1.5 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Bonus</th>
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {rows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={17} className="px-1.5 py-10 text-center text-sm text-slate-400">No hotels match your search.</td>
                                                </tr>
                                            ) : (
                                                rows.map(r => (
                                                    <tr
                                                        key={r.hotelId}
                                                        onClick={() => setSelectedAuditResultId(r.hotelId)}
                                                        className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                                                    >
                                                        <td className="px-1.5 py-3.5 text-sm font-bold text-slate-800">{r.name}</td>
                                                        <td className="px-1.5 py-3.5 text-xs font-mono font-bold text-slate-500">{r.code}</td>
                                                        <td className="px-1.5 py-3.5 text-xs font-bold text-slate-600">{r.region || '—'}</td>
                                                        <td className="px-1.5 py-3.5 text-xs font-bold text-slate-600">{r.country || '—'}</td>
                                                        <td className="px-1.5 py-3.5 text-xs font-bold text-slate-600">{r.brand || '—'}</td>
                                                        <td className="px-1.5 py-3.5 text-xs font-bold text-slate-600 text-center tabular-nums">{r.stars ?? '—'}</td>
                                                        {DEPARTMENT_COLUMNS.map(d => {
                                                            const score = departmentScore(r, d.name);
                                                            const bonus = departmentBonus(r, d.name);
                                                            return (
                                                                <React.Fragment key={d.name}>
                                                                    <td className="px-1.5 py-3.5 text-sm font-black text-slate-900 text-center tabular-nums border-l border-slate-100">{score !== null ? `${score}%` : '—'}</td>
                                                                    <td className={`px-1.5 py-3.5 text-sm font-bold text-center tabular-nums ${bonus > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>+{bonus}%</td>
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                        <td className="px-1.5 py-3.5">{statusBadge(r.status)}</td>
                                                        <td className="px-1.5 py-3.5 text-sm font-black text-slate-900 text-right tabular-nums">{r.percentage !== null ? `${r.percentage}%` : '—'}</td>
                                                        <td className="px-1.5 py-3.5 text-right">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDownloadCertificate(r); }}
                                                                disabled={r.status === 'not_audited'}
                                                                title={r.status === 'not_audited' ? 'Available once the hotel has audited items' : 'Download the brand excellence certificate'}
                                                                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100/80 px-1.5 py-2 rounded-xl border border-indigo-200/60 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                                                            >
                                                                <FileText size={11} />
                                                                <span className="sr-only">Certificate</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-t border-slate-100 text-xs font-bold text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <span>Rows per page</span>
                                            <select
                                                value={pageSize}
                                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                                            >
                                                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                            <span>
                                                {sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={() => setPage(1)} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronsLeft size={14} /></button>
                                            <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={14} /></button>
                                            <span className="px-2">Page {currentPage} of {totalPages}</span>
                                            <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight size={14} /></button>
                                            <button type="button" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronsRight size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()
    );
};
