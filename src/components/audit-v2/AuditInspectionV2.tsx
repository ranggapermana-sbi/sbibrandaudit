import React, { useState, useMemo } from 'react';
import { Hotel, AuditCategory, AuditItem, AuditBatch, AuditGroup } from '../../types';
import { useAuditInspectionV2 } from './useAuditInspectionV2';
import { AuditHotelSelector } from './AuditHotelSelector';
import { AuditSummaryHeader } from './AuditSummaryHeader';
import { AuditCategoryProgress } from './AuditCategoryProgress';
import { AuditItemCard } from './AuditItemCard';
import { AuditItemFilter } from './types';
import { ShieldAlert, Sparkles, Building2, Layers } from 'lucide-react';

interface AuditInspectionV2Props {
    hotels: Hotel[];
    categories: AuditCategory[];
    items: AuditItem[];
    userProfile?: any;
    batches?: AuditBatch[];
    groups?: AuditGroup[];
    auditorCategoryAssignments?: any[];
    initialHotelCode?: string;
}

export const AuditInspectionV2: React.FC<AuditInspectionV2Props> = ({
    hotels,
    categories,
    items,
    userProfile,
    batches,
    groups,
    auditorCategoryAssignments,
    initialHotelCode = ''
}) => {
    // Hotel selection state
    const [selectedHotelCode, setSelectedHotelCode] = useState<string>(() => {
        return initialHotelCode || localStorage.getItem('sbi_audit_v2_selected_hotel') || (hotels[0]?.code || hotels[0]?.id || '');
    });

    const handleSelectHotelCode = (code: string) => {
        setSelectedHotelCode(code);
        localStorage.setItem('sbi_audit_v2_selected_hotel', code);
    };

    // Filter states
    const [activeFilter, setActiveFilter] = useState<AuditItemFilter>('all');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Custom hook for efficient Supabase state & sync
    const {
        currentHotel,
        canonicalHotelCode,
        submissionsMap,
        isLoading,
        isSavingMap,
        lastSyncedAt,
        loadSubmissions,
        updateItemScore,
        updateItemComment,
        categoryStats,
        overallStats,
        relevantCategories,
        relevantItems
    } = useAuditInspectionV2(
        selectedHotelCode,
        hotels,
        categories,
        items,
        userProfile,
        batches,
        groups,
        auditorCategoryAssignments
    );

    // Map categories by ID for quick category name lookup
    const categoryNameMap = useMemo(() => {
        const map = new Map<string, string>();
        relevantCategories.forEach(c => map.set(c.id, c.name));
        return map;
    }, [relevantCategories]);

    // Filter checklist items
    const filteredItems = useMemo(() => {
        return relevantItems.filter(item => {
            const itemCatId = String(item.categoryId || (item as any).category_id);

            // Category filter
            if (selectedCategoryId !== 'all' && itemCatId !== String(selectedCategoryId)) {
                return false;
            }

            // Search query filter
            const q = searchQuery.trim().toLowerCase();
            if (q) {
                const matchesName = item.name && item.name.toLowerCase().includes(q);
                const matchesDesc = item.description && item.description.toLowerCase().includes(q);
                const matchesCat = categoryNameMap.get(itemCatId)?.toLowerCase().includes(q);
                if (!matchesName && !matchesDesc && !matchesCat) return false;
            }

            // Status filter
            const sub = submissionsMap[item.id];
            const isNA = sub?.is_na === true;
            const hasScore = sub?.score !== undefined && sub?.score !== null;
            const isPass = !isNA && hasScore && Number(sub.score) > 0;
            const isFail = !isNA && hasScore && Number(sub.score) === 0;
            const isAudited = isPass || isFail || isNA;

            if (activeFilter === 'unscored') return !isAudited;
            if (activeFilter === 'audited') return isAudited;
            if (activeFilter === 'pass') return isPass;
            if (activeFilter === 'fail') return isFail;
            if (activeFilter === 'na') return isNA;

            return true;
        });
    }, [relevantItems, selectedCategoryId, searchQuery, submissionsMap, activeFilter, categoryNameMap]);

    return (
        <div id="audit-inspection-v2-container" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
            
            {/* Header Title Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">
                            V2 ENGINE
                        </span>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">
                            Audit Inspection v2
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        High-performance direct Supabase synchronization engine with real-time audit scoring and auto-persistence.
                    </p>
                </div>

                {currentHotel && (
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 text-indigo-900">
                        <Building2 size={16} className="text-indigo-600 shrink-0" />
                        <div className="text-xs font-bold truncate">
                            {currentHotel.name} ({canonicalHotelCode})
                        </div>
                    </div>
                )}
            </div>

            {/* Hotel Selector Component */}
            <AuditHotelSelector
                hotels={hotels}
                selectedHotelCode={selectedHotelCode}
                onSelectHotelCode={handleSelectHotelCode}
                isLoading={isLoading}
                onRefresh={loadSubmissions}
                lastSyncedAt={lastSyncedAt}
            />

            {/* Overall Audit Summary Stats */}
            <AuditSummaryHeader
                stats={overallStats}
                activeFilter={activeFilter}
                onSelectFilter={setActiveFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            {/* Category Progress Tabs */}
            <AuditCategoryProgress
                categories={relevantCategories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategoryId={setSelectedCategoryId}
                categoryStats={categoryStats}
            />

            {/* Audit Items Checklist List */}
            <div id="audit-v2-items-list" className="space-y-4">
                {isLoading ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3"></div>
                        <div className="text-sm font-bold text-slate-700">Loading Inspection Submissions...</div>
                        <div className="text-xs text-slate-400 mt-1">Fetching latest DB records for {canonicalHotelCode}</div>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <ShieldAlert size={36} className="mx-auto text-slate-300 mb-2" />
                        <h3 className="text-sm font-bold text-slate-700">No Checklist Items Found</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Try adjusting your category selection, filter pills, or search query.
                        </p>
                    </div>
                ) : (
                    filteredItems.map(item => (
                        <AuditItemCard
                            key={item.id}
                            item={item}
                            categoryName={categoryNameMap.get(item.categoryId)}
                            submission={submissionsMap[item.id]}
                            onUpdateScore={updateItemScore}
                            onUpdateComment={updateItemComment}
                            isSaving={isSavingMap[item.id]}
                        />
                    ))
                )}
            </div>

        </div>
    );
};
