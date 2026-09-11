import React from 'react';
import { OverallAuditStats, AuditItemFilter } from './types';
import { CheckCircle2, XCircle, MinusCircle, HelpCircle, Filter, Search, Award } from 'lucide-react';

interface AuditSummaryHeaderProps {
    stats: OverallAuditStats;
    activeFilter: AuditItemFilter;
    onSelectFilter: (filter: AuditItemFilter) => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
}

export const AuditSummaryHeader: React.FC<AuditSummaryHeaderProps> = ({
    stats,
    activeFilter,
    onSelectFilter,
    searchQuery,
    onSearchChange
}) => {
    const percentage = stats.overallPercentage || 0;

    // Badge styling based on score
    const scoreColorClass = percentage >= 85 
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
        : percentage >= 70 
            ? 'text-amber-700 bg-amber-50 border-amber-200' 
            : 'text-red-700 bg-red-50 border-red-200';

    return (
        <div id="audit-v2-summary-header" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 mb-6 relative z-10">
            
            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                
                {/* Score Gauge Card */}
                <div className={`col-span-2 sm:col-span-3 lg:col-span-2 p-4 rounded-xl border flex items-center justify-between ${scoreColorClass}`}>
                    <div>
                        <div className="text-xs font-extrabold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                            <Award size={16} />
                            <span>Overall Compliance Score</span>
                        </div>
                        <div className="text-3xl font-black mt-1">
                            {percentage.toFixed(1)}%
                        </div>
                        <div className="text-[11px] font-semibold opacity-90 mt-0.5">
                            {stats.totalEarnedPoints} earned / {stats.totalMaxPoints} max pts
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black">{stats.auditedCount} / {stats.totalItems}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wide opacity-75">Items Audited</div>
                    </div>
                </div>

                {/* Passed Stat */}
                <button
                    type="button"
                    onClick={() => onSelectFilter('pass')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                        activeFilter === 'pass' 
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' 
                            : 'bg-emerald-50/60 hover:bg-emerald-100/80 border-emerald-200/80 text-emerald-900'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">Passed</span>
                        <CheckCircle2 size={16} className={activeFilter === 'pass' ? 'text-white' : 'text-emerald-600'} />
                    </div>
                    <div className="text-2xl font-black">{stats.passCount}</div>
                </button>

                {/* Failed Stat */}
                <button
                    type="button"
                    onClick={() => onSelectFilter('fail')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                        activeFilter === 'fail' 
                            ? 'bg-red-600 text-white border-red-700 shadow-sm' 
                            : 'bg-red-50/60 hover:bg-red-100/80 border-red-200/80 text-red-900'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">Failed</span>
                        <XCircle size={16} className={activeFilter === 'fail' ? 'text-white' : 'text-red-600'} />
                    </div>
                    <div className="text-2xl font-black">{stats.failCount}</div>
                </button>

                {/* N/A Exempt Stat */}
                <button
                    type="button"
                    onClick={() => onSelectFilter('na')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                        activeFilter === 'na' 
                            ? 'bg-amber-600 text-white border-amber-700 shadow-sm' 
                            : 'bg-amber-50/60 hover:bg-amber-100/80 border-amber-200/80 text-amber-900'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">N/A Exempt</span>
                        <MinusCircle size={16} className={activeFilter === 'na' ? 'text-white' : 'text-amber-600'} />
                    </div>
                    <div className="text-2xl font-black">{stats.naCount}</div>
                </button>

                {/* Unscored Stat */}
                <button
                    type="button"
                    onClick={() => onSelectFilter('unscored')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                        activeFilter === 'unscored' 
                            ? 'bg-slate-800 text-white border-slate-900 shadow-sm' 
                            : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">Unscored</span>
                        <HelpCircle size={16} className={activeFilter === 'unscored' ? 'text-white' : 'text-slate-500'} />
                    </div>
                    <div className="text-2xl font-black">{stats.unscoredCount}</div>
                </button>

            </div>

            {/* Bottom Controls Bar: Filter Pills & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-4 border-t border-slate-100">
                
                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                        <Filter size={13} />
                        Filter:
                    </span>

                    {(['all', 'unscored', 'audited', 'pass', 'fail', 'na'] as AuditItemFilter[]).map(f => {
                        const labels: Record<AuditItemFilter, string> = {
                            all: `All Items (${stats.totalItems})`,
                            unscored: `Unscored (${stats.unscoredCount})`,
                            audited: `Audited (${stats.auditedCount})`,
                            pass: `Pass (${stats.passCount})`,
                            fail: `Fail (${stats.failCount})`,
                            na: `N/A (${stats.naCount})`
                        };

                        const isSelected = activeFilter === f;

                        return (
                            <button
                                key={f}
                                type="button"
                                onClick={() => onSelectFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                                    isSelected
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                }`}
                            >
                                {labels[f]}
                            </button>
                        );
                    })}
                </div>

                {/* Search Field */}
                <div className="relative min-w-[220px]">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search checklist items..."
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

            </div>

        </div>
    );
};
