import React from 'react';
import { AuditCategory } from '../../types';
import { CategoryStats } from './types';
import { FolderCheck, ChevronRight } from 'lucide-react';

interface AuditCategoryProgressProps {
    categories: AuditCategory[];
    selectedCategoryId: string;
    onSelectCategoryId: (id: string) => void;
    categoryStats: Record<string, CategoryStats>;
}

export const AuditCategoryProgress: React.FC<AuditCategoryProgressProps> = ({
    categories,
    selectedCategoryId,
    onSelectCategoryId,
    categoryStats
}) => {
    return (
        <div id="audit-v2-category-progress" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FolderCheck size={15} className="text-indigo-600" />
                    <span>Audit Categories</span>
                </div>
            </div>

            {/* Horizontal Scrollable Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                    type="button"
                    onClick={() => onSelectCategoryId('all')}
                    className={`px-4 py-3 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 border ${
                        selectedCategoryId === 'all'
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                >
                    <span>All Categories</span>
                </button>

                {categories.map(cat => {
                    const stats = categoryStats[cat.id];
                    const isSelected = selectedCategoryId === cat.id;

                    const pct = stats?.percentage || 0;
                    const pctColor = pct >= 85 
                        ? 'text-emerald-600 bg-emerald-50' 
                        : pct >= 70 
                            ? 'text-amber-600 bg-amber-50' 
                            : 'text-red-600 bg-red-50';

                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => onSelectCategoryId(cat.id)}
                            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-2.5 ${
                                isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                        >
                            <span className="truncate max-w-[160px] sm:max-w-[200px]">{cat.name}</span>
                            
                            {stats && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                                        isSelected ? 'bg-indigo-500 text-white' : pctColor
                                    }`}>
                                        {stats.auditedCount}/{stats.totalItems}
                                    </span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
