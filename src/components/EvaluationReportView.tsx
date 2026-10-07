import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    ArrowLeft, 
    Search, 
    CheckCircle2, 
    AlertCircle, 
    ChevronRight, 
    ChevronsLeft, 
    ChevronLeft, 
    ChevronsRight, 
    ArrowUpDown, 
    Filter, 
    ClipboardCheck, 
    Building2, 
    Layers, 
    Briefcase,
    X,
    Eye,
    TrendingUp,
    ShieldAlert,
    Clock
} from 'lucide-react';
import { Department, Hotel, AuditCategory, AuditItem, AuditGroup, AuditBatch } from '../types';
import { supabase } from '../lib/supabase';

interface EvaluationReportViewProps {
    hotels: Hotel[];
    departments: Department[];
    categories: AuditCategory[];
    items: AuditItem[];
    groups?: AuditGroup[];
    batches?: AuditBatch[];
    allSubmissions: any[];
    onBack: () => void;
    onInspectHotel?: (hotelId: string, categoryId?: string) => void;
}

export const EvaluationReportView: React.FC<EvaluationReportViewProps> = ({
    hotels,
    departments,
    categories,
    items,
    groups = [],
    batches = [],
    allSubmissions,
    onBack,
    onInspectHotel
}) => {
    // Dynamic Filter states
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
    const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('all');
    const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
    const [evaluationStatusFilter, setEvaluationStatusFilter] = useState<'all' | 'fully_evaluated' | 'partially_evaluated' | 'not_evaluated'>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    
    // Sort & Pagination
    const [sortField, setSortField] = useState<'name' | 'brand' | 'location' | 'evaluated' | 'percentage'>('percentage');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(25);

    // Selected hotel for detailed modal breakdown
    const [selectedHotelForDetail, setSelectedHotelForDetail] = useState<Hotel | null>(null);

    // Live fetched groups state
    const [loadedGroups, setLoadedGroups] = useState<AuditGroup[]>([]);

    useEffect(() => {
        let isMounted = true;
        const fetchGroups = async () => {
            try {
                const { data: groupsData } = await supabase
                    .from('audit_checklist_groups')
                    .select('*');

                const { data: groupHotelsData } = await supabase
                    .from('audit_group_hotels')
                    .select('*');

                if (groupsData && isMounted) {
                    const mapped: AuditGroup[] = groupsData.map((g: any) => {
                        const hotelIds = (groupHotelsData || [])
                            .filter((gh: any) => String(gh.group_id) === String(g.id))
                            .map((gh: any) => String(gh.hotel_id));

                        return {
                            id: String(g.id),
                            name: g.name,
                            description: g.description || '',
                            hotelIds,
                            categoryIds: g.category_ids || [],
                            itemIds: g.item_ids || []
                        };
                    });
                    setLoadedGroups(mapped);
                }
            } catch (e) {
                console.warn("EvaluationReportView: Exception fetching checklist groups from Supabase:", e);
            }
        };
        fetchGroups();
        return () => { isMounted = false; };
    }, []);

    const effectiveGroups = useMemo(() => {
        return loadedGroups.length > 0 ? loadedGroups : (groups || []);
    }, [loadedGroups, groups]);

    // Filter non-corporate hotels
    const operationalHotels = useMemo(() => {
        return hotels.filter(h => {
            const bClass = (h.brandClass || '').toLowerCase();
            const hType = (h as any).type ? String((h as any).type).toLowerCase() : '';
            const hName = (h.name || '').toLowerCase();
            const hLoc = (h.location || '').toLowerCase();
            return bClass !== 'corporate' && 
                   hType !== 'corporate' && 
                   !hName.includes('corporate') && 
                   !hName.includes('regional') && 
                   !hLoc.includes('corporate');
        });
    }, [hotels]);

    // Distinct filter options derived from operational hotels
    const availableRegions = useMemo(() => {
        const set = new Set<string>();
        operationalHotels.forEach(h => {
            if (h.region) set.add(h.region);
        });
        return Array.from(set).sort();
    }, [operationalHotels]);

    const availableBrands = useMemo(() => {
        const set = new Set<string>();
        operationalHotels.forEach(h => {
            if (h.brandClass) set.add(h.brandClass);
        });
        return Array.from(set).sort();
    }, [operationalHotels]);

    // Available categories filtered by selected department
    const filteredCategories = useMemo(() => {
        if (selectedDepartmentId === 'all') {
            return categories;
        }
        return categories.filter(c => {
            const deptId = c.departmentId || (c as any).department_id;
            return deptId === selectedDepartmentId;
        });
    }, [categories, selectedDepartmentId]);

    // Reset category selection if selected department changes and category is no longer valid
    useEffect(() => {
        if (selectedCategoryId !== 'all') {
            const exists = filteredCategories.some(c => c.id === selectedCategoryId);
            if (!exists) {
                setSelectedCategoryId('all');
            }
        }
    }, [selectedDepartmentId, filteredCategories, selectedCategoryId]);

    // Target Audit Items based on Department & Category Filters
    const targetItems = useMemo(() => {
        return items.filter(it => {
            const itemDeptId = it.departmentId || (it as any).department_id;
            const itemCatId = it.categoryId || (it as any).category_id;

            // Department filter check
            if (selectedDepartmentId !== 'all') {
                if (itemDeptId && itemDeptId !== selectedDepartmentId) {
                    // check if its category belongs to this department
                    const parentCat = categories.find(c => c.id === itemCatId);
                    const catDeptId = parentCat?.departmentId || (parentCat as any)?.department_id;
                    if (catDeptId !== selectedDepartmentId) {
                        return false;
                    }
                }
            }

            // Category filter check
            if (selectedCategoryId !== 'all') {
                if (itemCatId !== selectedCategoryId) {
                    return false;
                }
            }

            return true;
        });
    }, [items, categories, selectedDepartmentId, selectedCategoryId]);

    const targetItemIdsSet = useMemo(() => {
        return new Set(targetItems.map(it => String(it.id)));
    }, [targetItems]);

    // Fast indexed submissions evaluation map: hotel_id (lowercase) -> Set of evaluated target item_ids
    const evaluatedSubmissionsByHotel = useMemo(() => {
        const map = new Map<string, { evaluatedItemIds: Set<string>; naItemIds: Set<string> }>();

        (allSubmissions || []).forEach(sub => {
            if (!sub || !sub.item_id || !sub.hotel_id) return;
            const itemIdStr = String(sub.item_id);

            // Only count if this item matches the filtered target items
            if (!targetItemIdsSet.has(itemIdStr)) return;

            // An item is considered evaluated/scored by auditor if it has a score or non-empty value or is_na is true
            const hasScore = sub.score !== null && sub.score !== undefined;
            const hasValue = sub.value !== null && sub.value !== undefined && String(sub.value).trim() !== '';
            const isNa = sub.is_na === true || String(sub.is_na) === 'true';

            if (hasScore || hasValue || isNa) {
                const hKey = String(sub.hotel_id).trim().toLowerCase();
                let entry = map.get(hKey);
                if (!entry) {
                    entry = { evaluatedItemIds: new Set(), naItemIds: new Set() };
                    map.set(hKey, entry);
                }
                entry.evaluatedItemIds.add(itemIdStr);
                if (isNa) {
                    entry.naItemIds.add(itemIdStr);
                }
            }
        });

        return map;
    }, [allSubmissions, targetItemIdsSet]);

    // Helper function to calculate assigned items for a specific hotel
    const getHotelAssignedTargetItems = useCallback((hotel: Hotel) => {
        if (!hotel) return targetItems;

        const hotelIdentifiers = new Set<string>();
        if (hotel.id) hotelIdentifiers.add(String(hotel.id).trim().toLowerCase());
        if (hotel.code) hotelIdentifiers.add(String(hotel.code).trim().toLowerCase());
        if (hotel.name) hotelIdentifiers.add(String(hotel.name).trim().toLowerCase());

        // 1. Find matching checklist groups for this hotel
        const matchingGroups = effectiveGroups.filter(g => {
            if (!g) return false;
            const gHotelIds = (g.hotelIds || (g as any).hotel_ids || []).map((id: any) => String(id).trim().toLowerCase());
            return gHotelIds.some((hId: string) => hotelIdentifiers.has(hId));
        });

        let groupCatIds: Set<string> | null = null;
        let groupItemIds: Set<string> | null = null;

        if (matchingGroups.length > 0) {
            const catSet = new Set<string>();
            const itemSet = new Set<string>();
            matchingGroups.forEach(g => {
                const cIds = g.categoryIds || (g as any).category_ids || [];
                const iIds = g.itemIds || (g as any).item_ids || [];
                cIds.forEach((cid: any) => catSet.add(String(cid).trim()));
                iIds.forEach((iid: any) => itemSet.add(String(iid).trim()));
            });
            if (catSet.size > 0) groupCatIds = catSet;
            if (itemSet.size > 0) groupItemIds = itemSet;
        }

        // 2. Direct hotel assigned category IDs
        let hotelCatIds: Set<string> | null = null;
        const directHotelCats = (hotel as any)?.assignedCategoryIds || (hotel as any)?.assigned_category_ids;
        if (Array.isArray(directHotelCats) && directHotelCats.length > 0) {
            hotelCatIds = new Set(directHotelCats.map((id: any) => String(id).trim()));
        }

        // 3. Batch assigned category IDs
        let batchCatIds: Set<string> | null = null;
        const hotelBatchId = (hotel as any)?.batchId || (hotel as any)?.batch_id;
        if (hotelBatchId && batches && batches.length > 0) {
            const matchingBatch = batches.find(b => String(b.id).trim().toLowerCase() === String(hotelBatchId).trim().toLowerCase());
            const bCatIds = (matchingBatch as any)?.categoryIds || (matchingBatch as any)?.category_ids;
            if (Array.isArray(bCatIds) && bCatIds.length > 0) {
                batchCatIds = new Set(bCatIds.map((id: any) => String(id).trim()));
            }
        }

        const effectiveCatIds: Set<string> | null = groupCatIds || hotelCatIds || batchCatIds;

        // Check items this hotel has actually submitted evaluations for
        const hKey = String(hotel.id).trim().toLowerCase();
        const hCodeKey = hotel.code ? String(hotel.code).trim().toLowerCase() : '';
        const evaluatedItemIds = new Set<string>();
        (allSubmissions || []).forEach(s => {
            if (!s || !s.item_id || !s.hotel_id) return;
            const subHId = String(s.hotel_id).trim().toLowerCase();
            if (subHId === hKey || (hCodeKey && subHId === hCodeKey)) {
                const hasScore = s.score !== null && s.score !== undefined;
                const hasVal = s.value !== null && s.value !== undefined && String(s.value).trim() !== '';
                if (hasScore || hasVal || s.is_na === true || String(s.is_na) === 'true') {
                    evaluatedItemIds.add(String(s.item_id).trim());
                }
            }
        });

        // If no explicit group or category assignment restriction exists for this hotel, return targetItems
        if (!effectiveCatIds && (!groupItemIds || groupItemIds.size === 0)) {
            return targetItems;
        }

        return targetItems.filter(item => {
            const itemCatId = String(item.categoryId || (item as any).category_id || '').trim();
            const itemIdStr = String(item.id).trim();

            // Always include if this hotel has evaluated this item
            if (evaluatedItemIds.has(itemIdStr)) {
                return true;
            }

            if (effectiveCatIds && !effectiveCatIds.has(itemCatId)) {
                return false;
            }

            if (groupItemIds && groupItemIds.size > 0 && !groupItemIds.has(itemIdStr)) {
                return false;
            }

            return true;
        });
    }, [targetItems, effectiveGroups, batches, allSubmissions]);

    // Build evaluations stats per hotel based on assigned items
    const hotelEvaluationStats = useMemo(() => {
        return operationalHotels.map(hotel => {
            const assignedTargetItems = getHotelAssignedTargetItems(hotel);
            const totalTargetItemsCount = assignedTargetItems.length;
            const assignedTargetItemIdsSet = new Set(assignedTargetItems.map(it => String(it.id)));

            const hKey = String(hotel.id).trim().toLowerCase();
            const hCodeKey = hotel.code ? String(hotel.code).trim().toLowerCase() : '';

            // Combine submissions by hotel ID or code
            const entry1 = evaluatedSubmissionsByHotel.get(hKey);
            const entry2 = hCodeKey ? evaluatedSubmissionsByHotel.get(hCodeKey) : null;

            const evaluatedSet = new Set<string>();
            const naSet = new Set<string>();

            if (entry1) {
                entry1.evaluatedItemIds.forEach(id => {
                    if (assignedTargetItemIdsSet.has(id)) evaluatedSet.add(id);
                });
                entry1.naItemIds.forEach(id => {
                    if (assignedTargetItemIdsSet.has(id)) naSet.add(id);
                });
            }
            if (entry2) {
                entry2.evaluatedItemIds.forEach(id => {
                    if (assignedTargetItemIdsSet.has(id)) evaluatedSet.add(id);
                });
                entry2.naItemIds.forEach(id => {
                    if (assignedTargetItemIdsSet.has(id)) naSet.add(id);
                });
            }

            const evaluatedCount = evaluatedSet.size;
            const percentage = totalTargetItemsCount > 0 
                ? Math.round((evaluatedCount / totalTargetItemsCount) * 100) 
                : 0;

            let status: 'fully_evaluated' | 'partially_evaluated' | 'not_evaluated' = 'not_evaluated';
            if (totalTargetItemsCount > 0) {
                if (evaluatedCount >= totalTargetItemsCount) {
                    status = 'fully_evaluated';
                } else if (evaluatedCount > 0) {
                    status = 'partially_evaluated';
                }
            }

            return {
                hotel,
                evaluatedCount,
                totalTargetItemsCount,
                percentage,
                status,
                naCount: naSet.size,
                evaluatedSet,
                assignedTargetItems
            };
        });
    }, [operationalHotels, getHotelAssignedTargetItems, evaluatedSubmissionsByHotel]);

    // Apply Filters & Search
    const filteredHotelStats = useMemo(() => {
        return hotelEvaluationStats.filter(({ hotel, status }) => {
            // Region filter
            if (selectedRegionFilter !== 'all' && hotel.region !== selectedRegionFilter) {
                return false;
            }

            // Brand filter
            if (selectedBrandFilter !== 'all' && hotel.brandClass !== selectedBrandFilter) {
                return false;
            }

            // Status filter
            if (evaluationStatusFilter !== 'all' && status !== evaluationStatusFilter) {
                return false;
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesName = (hotel.name || '').toLowerCase().includes(q);
                const matchesCode = (hotel.code || '').toLowerCase().includes(q);
                const matchesLoc = (hotel.location || '').toLowerCase().includes(q);
                const matchesBrand = (hotel.brandClass || '').toLowerCase().includes(q);
                if (!matchesName && !matchesCode && !matchesLoc && !matchesBrand) {
                    return false;
                }
            }

            return true;
        });
    }, [hotelEvaluationStats, selectedRegionFilter, selectedBrandFilter, evaluationStatusFilter, searchQuery]);

    // Sort hotel stats
    const sortedHotelStats = useMemo(() => {
        return [...filteredHotelStats].sort((a, b) => {
            let comparison = 0;
            if (sortField === 'name') {
                comparison = (a.hotel.name || '').localeCompare(b.hotel.name || '');
            } else if (sortField === 'brand') {
                comparison = (a.hotel.brandClass || '').localeCompare(b.hotel.brandClass || '');
            } else if (sortField === 'location') {
                comparison = (a.hotel.location || '').localeCompare(b.hotel.location || '');
            } else if (sortField === 'evaluated') {
                comparison = a.evaluatedCount - b.evaluatedCount;
            } else if (sortField === 'percentage') {
                comparison = a.percentage - b.percentage;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [filteredHotelStats, sortField, sortDirection]);

    // Overall summary metrics across all operational hotels (given current scope filter)
    const overallMetrics = useMemo(() => {
        const totalProperties = operationalHotels.length;
        const totalEvaluationsAcrossHotels = hotelEvaluationStats.reduce((acc, h) => acc + h.evaluatedCount, 0);
        const maxPossibleEvaluations = hotelEvaluationStats.reduce((acc, h) => acc + h.totalTargetItemsCount, 0);
        const overallRate = maxPossibleEvaluations > 0 
            ? Math.round((totalEvaluationsAcrossHotels / maxPossibleEvaluations) * 100) 
            : 0;

        const fullyCount = hotelEvaluationStats.filter(h => h.status === 'fully_evaluated').length;
        const partialCount = hotelEvaluationStats.filter(h => h.status === 'partially_evaluated').length;
        const notStartedCount = hotelEvaluationStats.filter(h => h.status === 'not_evaluated').length;

        return {
            totalProperties,
            totalTargetItems: targetItems.length,
            totalEvaluationsAcrossHotels,
            overallRate,
            fullyCount,
            partialCount,
            notStartedCount
        };
    }, [operationalHotels.length, hotelEvaluationStats, targetItems.length]);

    // Pagination slice
    const totalPages = Math.max(1, Math.ceil(sortedHotelStats.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginatedStats = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return sortedHotelStats.slice(start, start + pageSize);
    }, [sortedHotelStats, safePage, pageSize]);

    const handleSort = (field: 'name' | 'brand' | 'location' | 'evaluated' | 'percentage') => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection(field === 'name' || field === 'brand' || field === 'location' ? 'asc' : 'desc');
        }
        setPage(1);
    };

    const selectedDepartmentObj = departments.find(d => d.id === selectedDepartmentId);
    const selectedCategoryObj = categories.find(c => c.id === selectedCategoryId);

    return (
        <div className="space-y-6 animate-fadeIn pb-16">
            {/* Header & Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <button 
                        onClick={onBack} 
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100 px-3.5 py-1.5 rounded-full border border-indigo-100/80 mb-3 hover:shadow-xs active:scale-95 transition-all outline-none"
                    >
                        <ArrowLeft size={13} /> Back to Dashboard
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                            <ClipboardCheck size={22} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Evaluation Report</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Real-time breakdown of items evaluated by auditors across all properties.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Scope pill indicator */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                        <Briefcase size={14} className="text-indigo-600" />
                        <span>Dept: <strong className="text-slate-900">{selectedDepartmentId === 'all' ? 'All Departments' : (selectedDepartmentObj?.name || selectedDepartmentId)}</strong></span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-100">
                        <Layers size={14} className="text-indigo-600" />
                        <span>Category: <strong className="text-indigo-950">{selectedCategoryId === 'all' ? 'All Categories' : (selectedCategoryObj?.name || selectedCategoryId)}</strong></span>
                    </span>
                </div>
            </div>

            {/* Overview Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-[22px] border border-slate-150/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)] flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Items in Scope</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h3 className="text-2xl font-black text-slate-900">{targetItems.length}</h3>
                            <span className="text-xs text-slate-500 font-medium">audit items</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            {selectedDepartmentId !== 'all' ? `${filteredCategories.length} categories active` : `${categories.length} total categories`}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Layers size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[22px] border border-slate-150/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)] flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Evaluations</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h3 className="text-2xl font-black text-indigo-600">{overallMetrics.totalEvaluationsAcrossHotels.toLocaleString()}</h3>
                            <span className="text-xs text-slate-500 font-medium">scores</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            {overallMetrics.overallRate}% overall audit depth
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <TrendingUp size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[22px] border border-slate-150/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)] flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">100% Evaluated</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h3 className="text-2xl font-black text-emerald-600">{overallMetrics.fullyCount}</h3>
                            <span className="text-xs text-slate-500 font-medium">/ {overallMetrics.totalProperties} properties</span>
                        </div>
                        <p className="text-[11px] text-emerald-600 font-bold mt-1">
                            {Math.round((overallMetrics.fullyCount / (overallMetrics.totalProperties || 1)) * 100)}% of properties complete
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[22px] border border-slate-150/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)] flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">In Progress / Pending</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h3 className="text-2xl font-black text-amber-600">{overallMetrics.partialCount}</h3>
                            <span className="text-xs text-slate-500 font-medium">+ {overallMetrics.notStartedCount} unstarted</span>
                        </div>
                        <p className="text-[11px] text-amber-600 font-bold mt-1">
                            Active evaluation underway
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock size={22} />
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-6 rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.02)] space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-indigo-600" />
                        <h3 className="text-sm font-bold text-slate-800">Dynamic Evaluation Filters</h3>
                    </div>
                    {(selectedDepartmentId !== 'all' || selectedCategoryId !== 'all' || selectedRegionFilter !== 'all' || selectedBrandFilter !== 'all' || evaluationStatusFilter !== 'all' || searchQuery) && (
                        <button
                            onClick={() => {
                                setSelectedDepartmentId('all');
                                setSelectedCategoryId('all');
                                setSelectedRegionFilter('all');
                                setSelectedBrandFilter('all');
                                setEvaluationStatusFilter('all');
                                setSearchQuery('');
                                setPage(1);
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                        >
                            <X size={13} /> Reset Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    {/* Department filter */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Department
                        </label>
                        <select
                            value={selectedDepartmentId}
                            onChange={(e) => {
                                setSelectedDepartmentId(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                        >
                            <option value="all">All Departments ({departments.length})</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Category filter */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Audit Category
                        </label>
                        <select
                            value={selectedCategoryId}
                            onChange={(e) => {
                                setSelectedCategoryId(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                        >
                            <option value="all">All Categories ({filteredCategories.length})</option>
                            {filteredCategories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Region filter */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Region
                        </label>
                        <select
                            value={selectedRegionFilter}
                            onChange={(e) => {
                                setSelectedRegionFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                        >
                            <option value="all">All Regions ({availableRegions.length})</option>
                            {availableRegions.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Brand filter */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Brand
                        </label>
                        <select
                            value={selectedBrandFilter}
                            onChange={(e) => {
                                setSelectedBrandFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                        >
                            <option value="all">All Brands ({availableBrands.length})</option>
                            {availableBrands.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    {/* Evaluation Status */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Evaluation Status
                        </label>
                        <select
                            value={evaluationStatusFilter}
                            onChange={(e) => {
                                setEvaluationStatusFilter(e.target.value as any);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            <option value="fully_evaluated">Fully Evaluated (100%)</option>
                            <option value="partially_evaluated">In Progress (1-99%)</option>
                            <option value="not_evaluated">Not Evaluated (0%)</option>
                        </select>
                    </div>
                </div>

                {/* Search input */}
                <div className="relative pt-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search hotel property name, code, brand, or location..."
                        className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50/90 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => { setSearchQuery(''); setPage(1); }}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Hotel Progress Table */}
            <div className="bg-white rounded-[24px] border border-slate-150/80 shadow-[0_12px_40px_rgba(15,23,42,0.02)] overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
                    <div className="flex items-center gap-2">
                        <Building2 size={18} className="text-indigo-600" />
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                            Hotel Evaluation Status
                        </h3>
                        <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {filteredHotelStats.length} properties
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                        Showing scope: <span className="font-bold text-slate-800">{targetItems.length} total items</span> per property
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-150/70 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider select-none">
                                <th 
                                    onClick={() => handleSort('name')}
                                    className="py-3.5 px-6 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>Property Name</span>
                                        <ArrowUpDown size={12} className={sortField === 'name' ? 'text-indigo-600' : 'text-slate-300'} />
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleSort('brand')}
                                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>Brand / Region</span>
                                        <ArrowUpDown size={12} className={sortField === 'brand' ? 'text-indigo-600' : 'text-slate-300'} />
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleSort('location')}
                                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors hidden md:table-cell"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>Location</span>
                                        <ArrowUpDown size={12} className={sortField === 'location' ? 'text-indigo-600' : 'text-slate-300'} />
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleSort('evaluated')}
                                    className="py-3.5 px-6 cursor-pointer hover:bg-slate-100/80 transition-colors text-right"
                                >
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span>Evaluated Items</span>
                                        <ArrowUpDown size={12} className={sortField === 'evaluated' ? 'text-indigo-600' : 'text-slate-300'} />
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleSort('percentage')}
                                    className="py-3.5 px-6 cursor-pointer hover:bg-slate-100/80 transition-colors min-w-[200px]"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>Evaluation Progress</span>
                                        <ArrowUpDown size={12} className={sortField === 'percentage' ? 'text-indigo-600' : 'text-slate-300'} />
                                    </div>
                                </th>
                                <th className="py-3.5 px-6 text-center">
                                    <span>Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/90 text-xs">
                            {paginatedStats.length > 0 ? (
                                paginatedStats.map(({ hotel, evaluatedCount, totalTargetItemsCount, percentage, status, naCount }) => {
                                    const isComplete = status === 'fully_evaluated';
                                    const isPartial = status === 'partially_evaluated';

                                    return (
                                        <tr 
                                            key={hotel.id}
                                            className="hover:bg-indigo-50/30 transition-colors group"
                                        >
                                            <td className="py-4 px-6 font-bold text-slate-900">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-[11px] shadow-2xs ${
                                                        isComplete 
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                            : isPartial 
                                                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                    }`}>
                                                        {hotel.code || hotel.name.substring(0, 3).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                            {hotel.name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 font-normal">
                                                            Code: <span className="font-mono font-bold text-slate-600">{hotel.code || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 font-semibold text-slate-700">
                                                <div className="font-bold text-slate-800">{hotel.brandClass || 'Swiss-Belhotel'}</div>
                                                <div className="text-[11px] text-slate-400">{hotel.region || 'Asia Pacific'}</div>
                                            </td>
                                            <td className="py-4 px-4 text-slate-600 font-medium hidden md:table-cell">
                                                {hotel.location || 'Indonesia'}
                                            </td>
                                            <td className="py-4 px-6 text-right font-mono">
                                                <div className="font-black text-sm text-slate-900">
                                                    {evaluatedCount} <span className="text-slate-400 font-normal">/ {totalTargetItemsCount}</span>
                                                </div>
                                                {naCount > 0 && (
                                                    <div className="text-[10px] text-slate-400 font-medium">
                                                        ({naCount} N/A)
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className={`font-black ${
                                                            isComplete ? 'text-emerald-600' : isPartial ? 'text-amber-600' : 'text-slate-400'
                                                        }`}>
                                                            {percentage}% Evaluated
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                            isComplete 
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                                : isPartial 
                                                                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                        }`}>
                                                            {isComplete ? 'Complete' : isPartial ? 'In Progress' : 'Not Started'}
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                isComplete 
                                                                    ? 'bg-emerald-500' 
                                                                    : isPartial 
                                                                    ? 'bg-amber-500' 
                                                                    : 'bg-slate-300'
                                                            }`}
                                                            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => setSelectedHotelForDetail(hotel)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shadow-2xs"
                                                        title="View category breakdown"
                                                    >
                                                        <Eye size={13} />
                                                        <span>Breakdown</span>
                                                    </button>
                                                    {onInspectHotel && (
                                                        <button
                                                            onClick={() => onInspectHotel(hotel.id, selectedCategoryId !== 'all' ? selectedCategoryId : undefined)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors border border-indigo-100 shadow-2xs"
                                                            title="Jump to Audit Inspection tool"
                                                        >
                                                            <span>Inspect</span>
                                                            <ChevronRight size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-slate-400 font-bold bg-slate-50/40">
                                        <AlertCircle size={28} className="mx-auto mb-2 text-slate-300" />
                                        No hotels match your filter and search criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-150/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                        <span>
                            Showing <strong className="text-slate-800 font-bold">{filteredHotelStats.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</strong> to <strong className="text-slate-800 font-bold">{Math.min(filteredHotelStats.length, safePage * pageSize)}</strong> of <strong className="text-slate-800 font-bold">{filteredHotelStats.length}</strong> properties
                        </span>
                        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                            <span className="text-[11px] font-bold text-slate-400">Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(1)}
                                disabled={safePage === 1}
                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronsLeft size={14} />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={14} />
                            </button>

                            <span className="px-3 py-1 text-xs font-extrabold rounded-lg bg-indigo-600 text-white shadow-2xs">
                                {safePage} / {totalPages}
                            </span>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={14} />
                            </button>
                            <button
                                onClick={() => setPage(totalPages)}
                                disabled={safePage === totalPages}
                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronsRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Detail Breakdown for a Single Hotel */}
            {selectedHotelForDetail && (() => {
                const hotelAssignedItems = getHotelAssignedTargetItems(selectedHotelForDetail);

                return (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-white rounded-[28px] border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                                        Hotel Evaluation Breakdown
                                    </span>
                                    <h3 className="text-xl font-black text-slate-900 mt-1">
                                        {selectedHotelForDetail.name}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Code: {selectedHotelForDetail.code || 'N/A'} • {selectedHotelForDetail.brandClass} • {selectedHotelForDetail.location}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedHotelForDetail(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-4">
                                {filteredCategories.map(cat => {
                                    const catItems = hotelAssignedItems.filter(it => (it.categoryId || (it as any).category_id) === cat.id);
                                    if (catItems.length === 0) return null;

                                    const hotelKey = String(selectedHotelForDetail.id).trim().toLowerCase();
                                    const hotelCodeKey = selectedHotelForDetail.code ? String(selectedHotelForDetail.code).trim().toLowerCase() : '';

                                    const hSubs = (allSubmissions || []).filter(s => {
                                        const subHId = String(s.hotel_id || '').trim().toLowerCase();
                                        return subHId === hotelKey || (hotelCodeKey && subHId === hotelCodeKey);
                                    });

                                    const evaluatedCatItems = catItems.filter(it => {
                                        const sub = hSubs.find(s => String(s.item_id) === String(it.id));
                                        if (!sub) return false;
                                        const hasScore = sub.score !== null && sub.score !== undefined;
                                        const hasVal = sub.value !== null && sub.value !== undefined && String(sub.value).trim() !== '';
                                        return hasScore || hasVal || sub.is_na === true || String(sub.is_na) === 'true';
                                    });

                                    const catProgress = catItems.length > 0 ? Math.round((evaluatedCatItems.length / catItems.length) * 100) : 0;

                                    return (
                                        <div key={cat.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-150/70 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{cat.name}</h4>
                                                    <p className="text-[11px] text-slate-500">
                                                        {evaluatedCatItems.length} of {catItems.length} items evaluated ({catProgress}%)
                                                    </p>
                                                </div>
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                                                    catProgress === 100 
                                                        ? 'bg-emerald-100 text-emerald-800' 
                                                        : catProgress > 0 
                                                        ? 'bg-amber-100 text-amber-800' 
                                                        : 'bg-slate-200 text-slate-600'
                                                }`}>
                                                    {catProgress === 100 ? 'Completed' : catProgress > 0 ? 'In Progress' : 'Not Started'}
                                                </span>
                                            </div>

                                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all ${
                                                        catProgress === 100 ? 'bg-emerald-500' : catProgress > 0 ? 'bg-amber-500' : 'bg-slate-300'
                                                    }`}
                                                    style={{ width: `${catProgress}%` }}
                                                />
                                            </div>

                                            <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                                                {catItems.map((it, idx) => {
                                                    const sub = hSubs.find(s => String(s.item_id) === String(it.id));
                                                    const isEval = sub && ((sub.score !== null && sub.score !== undefined) || (sub.value !== null && sub.value !== undefined && String(sub.value).trim() !== '') || sub.is_na === true || String(sub.is_na) === 'true');

                                                    return (
                                                        <div key={it.id} className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-150/50">
                                                            <span className="text-slate-700 font-medium truncate pr-2">
                                                                {idx + 1}. {it.name}
                                                            </span>
                                                            <span className={`shrink-0 font-bold ${isEval ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                {isEval ? '✓ Evaluated' : 'Pending'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-150/80 flex justify-end">
                                <button
                                    onClick={() => setSelectedHotelForDetail(null)}
                                    className="px-5 py-2 rounded-full bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
