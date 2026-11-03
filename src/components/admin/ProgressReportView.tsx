import React from 'react';
import { AuditBatch, AuditGroup } from '../../types';
import { AuditItem, Hotel } from '../../types';
import { AlertCircle, ArrowLeft, ArrowUpDown, Building, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsLeft, ChevronsRight, MapPin, Lock, Percent, RefreshCw, Search, ShieldCheck, Unlock, X } from 'lucide-react';

// Progress report view, moved out of AdminPanelScreen. Values are passed in from the admin screen.
export interface ProgressReportViewProps {
    batches: AuditBatch[];
    getHotelFinalizedInfo: (hotelIdOrHotel: any) => { is_finalized: boolean; is_locked?: boolean; finalized_by?: string; finalized_at?: string; };
    groups: AuditGroup[];
    handleSetAuditLock: (hotel: Hotel, lock: boolean) => Promise<void>;
    handleSetAuditLockForAll: (lock: boolean) => Promise<void>;
    handleUnlockHotel: (hotelId: string) => Promise<void>;
    hotelAssociatedIdsMap: Map<string, Set<string>>;
    hotels: Hotel[];
    includedHotels: Hotel[];
    inspectionScores: Record<string, string | number>;
    isHotelAuditLocked: (hotel: Hotel) => boolean;
    items: AuditItem[];
    onBackToDashboard: () => void;
    profilesList: any[];
    progressBrandFilter: string;
    progressBrandLeadFilter: "all" | "has_lead" | "no_lead";
    progressCountryFilter: string;
    progressPage: number;
    progressPageSize: number;
    progressRegionFilter: string;
    progressSearchQuery: string;
    progressSortDirection: "asc" | "desc";
    progressSortField: "name" | "brand" | "location" | "progress" | "status";
    progressStatusFilter: "all" | "finalized" | "in_progress" | "not_started";
    progressSubmissions: any[];
    setHotelToReset: React.Dispatch<React.SetStateAction<Hotel>>;
    setIsResetPinModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setProgressBrandFilter: React.Dispatch<React.SetStateAction<string>>;
    setProgressBrandLeadFilter: React.Dispatch<React.SetStateAction<"all" | "has_lead" | "no_lead">>;
    setProgressCountryFilter: React.Dispatch<React.SetStateAction<string>>;
    setProgressPage: React.Dispatch<React.SetStateAction<number>>;
    setProgressPageSize: React.Dispatch<React.SetStateAction<number>>;
    setProgressRegionFilter: React.Dispatch<React.SetStateAction<string>>;
    setProgressSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    setProgressSortDirection: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
    setProgressSortField: React.Dispatch<React.SetStateAction<"name" | "brand" | "location" | "progress" | "status">>;
    setProgressStatusFilter: React.Dispatch<React.SetStateAction<"all" | "finalized" | "in_progress" | "not_started">>;
    setResetPinError: React.Dispatch<React.SetStateAction<string>>;
    setResetPinValue: React.Dispatch<React.SetStateAction<string>>;
    setSelectedInspectionHotelId: React.Dispatch<React.SetStateAction<string>>;
    setSubView: React.Dispatch<React.SetStateAction<"dashboard" | "departments" | "hotels" | "batches" | "categories" | "items" | "groups" | "users" | "access" | "inspection" | "inspection_v2" | "auditor_assignment" | "progress_report" | "audit_results">>;
}

export const ProgressReportView: React.FC<ProgressReportViewProps> = (props) => {
    const { batches, getHotelFinalizedInfo, groups, handleSetAuditLock, handleSetAuditLockForAll, handleUnlockHotel, hotelAssociatedIdsMap, hotels, includedHotels, inspectionScores, isHotelAuditLocked, items, onBackToDashboard, profilesList, progressBrandFilter, progressBrandLeadFilter, progressCountryFilter, progressPage, progressPageSize, progressRegionFilter, progressSearchQuery, progressSortDirection, progressSortField, progressStatusFilter, progressSubmissions, setHotelToReset, setIsResetPinModalOpen, setProgressBrandFilter, setProgressBrandLeadFilter, setProgressCountryFilter, setProgressPage, setProgressPageSize, setProgressRegionFilter, setProgressSearchQuery, setProgressSortDirection, setProgressSortField, setProgressStatusFilter, setResetPinError, setResetPinValue, setSelectedInspectionHotelId, setSubView } = props;
    return (
                    <div className="space-y-6 animate-fadeIn">
                        {/* BACK BUTTON & HEADER */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { onBackToDashboard(); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-55/80 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Progress Report</h2>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => handleSetAuditLockForAll(true)}
                                            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 px-3.5 py-2 rounded-xl border border-rose-200/60 active:scale-95 transition-all shadow-2xs"
                                            title="Lock the self-audit for every hotel"
                                        >
                                            <Lock size={12} />
                                            <span>Lock All Audits</span>
                                        </button>
                                        <button
                                            onClick={() => handleSetAuditLockForAll(false)}
                                            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-3.5 py-2 rounded-xl border border-emerald-200/60 active:scale-95 transition-all shadow-2xs"
                                            title="Unlock the self-audit for every hotel"
                                        >
                                            <Unlock size={12} />
                                            <span>Unlock All Audits</span>
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Real-time monitoring of self-audit checklist compliance across all properties.
                                </p>
                            </div>
                        </div>

                        {(() => {
                            // Filter out corporate hotels/properties at the start of progress report calculations
                            const nonCorporateHotels = includedHotels.filter(h => {
                                const bClass = (h.brandClass || '').toLowerCase();
                                const hType = (h as any).type ? String((h as any).type).toLowerCase() : '';
                                return bClass !== 'corporate' && hType !== 'corporate';
                            });

                            // Pre-index Supabase submissions by hotel_id once (O(Submissions) instead of O(Hotels * Submissions))
                            const progressSubmissionsByHotelMap = new Map<string, { submitted: Set<string>; na: Set<string> }>();
                            (progressSubmissions || []).forEach((sub: any) => {
                                if (sub.item_id !== undefined && sub.item_id !== null && sub.hotel_id) {
                                    const isAudited = (sub.score !== undefined && sub.score !== null) || sub.is_na === true || String(sub.is_na) === 'true';
                                    if (isAudited) {
                                        const hKey = String(sub.hotel_id).trim().toLowerCase();
                                        let entry = progressSubmissionsByHotelMap.get(hKey);
                                        if (!entry) {
                                            entry = { submitted: new Set(), na: new Set() };
                                            progressSubmissionsByHotelMap.set(hKey, entry);
                                        }
                                        const itemIdStr = String(sub.item_id);
                                        entry.submitted.add(itemIdStr);
                                        if (sub.is_na === true || String(sub.is_na) === 'true') {
                                            entry.na.add(itemIdStr);
                                        }
                                    }
                                }
                            });

                            // Pre-index valid local storage entries ONCE by hotel_id to avoid O(Hotels * Storage) overhead
                            const progressLocalAuditByHotelMap = new Map<string, { submitted: Set<string>; na: Set<string> }>();
                            try {
                                for (let i = 0; i < localStorage.length; i++) {
                                    const key = localStorage.key(i);
                                    if (key && key.startsWith('sbi_audit_')) {
                                        if (key.includes('_finalized')) continue;
                                        const raw = localStorage.getItem(key);
                                        if (!raw) continue;
                                        
                                        const rest = key.replace('sbi_audit_', '');
                                        const parts = rest.split('_');
                                        if (parts.length >= 2) {
                                            const keyHotelId = parts[0].trim().toLowerCase();
                                            const keyItemId = parts.slice(1).join('_');
                                            try {
                                                const parsed = JSON.parse(raw);
                                                const isAuditedLocal = (parsed.score !== undefined && parsed.score !== null) || parsed.is_na === true || parsed.isAudited === true;
                                                if (isAuditedLocal) {
                                                    let entry = progressLocalAuditByHotelMap.get(keyHotelId);
                                                    if (!entry) {
                                                        entry = { submitted: new Set(), na: new Set() };
                                                        progressLocalAuditByHotelMap.set(keyHotelId, entry);
                                                    }
                                                    entry.submitted.add(String(keyItemId));
                                                    if (parsed.is_na) {
                                                        entry.na.add(String(keyItemId));
                                                    }
                                                }
                                            } catch (e) {}
                                        }
                                    }
                                }
                            } catch (e) {
                                console.warn("Could not pre-scan localStorage:", e);
                            }

                            // Pre-compute hotel assigned items Map for performance and category summary calculations
                            const hotelAssignedItemsMap = new Map<string, AuditItem[]>();
                            const getHotelAssignedItems = (hotel: Hotel) => {
                                if (!hotel) return [];
                                const hKey = String(hotel.id || '').toLowerCase();
                                if (hKey && hotelAssignedItemsMap.has(hKey)) {
                                    return hotelAssignedItemsMap.get(hKey)!;
                                }

                                const hotelIdLower = hotel?.id ? String(hotel.id).trim().toLowerCase() : '';
                                const hotelCodeLower = hotel?.code ? String(hotel.code).trim().toLowerCase() : '';
                                const hotelNameLower = hotel?.name ? String(hotel.name).trim().toLowerCase() : '';
                                const idsSet = hotel?.id ? hotelAssociatedIdsMap.get(String(hotel.id)) : null;

                                const allHotelIdentifiers = new Set<string>();
                                if (hotelIdLower) allHotelIdentifiers.add(hotelIdLower);
                                if (hotelCodeLower) allHotelIdentifiers.add(hotelCodeLower);
                                if (hotelNameLower) allHotelIdentifiers.add(hotelNameLower);
                                if (idsSet) idsSet.forEach(id => allHotelIdentifiers.add(String(id).trim().toLowerCase()));

                                const matchingGroups = (groups || []).filter(g => {
                                    if (!g) return false;
                                    const gHotelIds = (g.hotelIds || (g as any).hotel_ids || []).map((id: any) => String(id).trim().toLowerCase());
                                    return gHotelIds.some((hId: string) => allHotelIdentifiers.has(hId));
                                });

                                let groupCatIds: Set<string> | null = null;
                                let groupItemIds: Set<string> | null = null;

                                if (matchingGroups.length > 0) {
                                    const catSet = new Set<string>();
                                    const itemSet = new Set<string>();
                                    matchingGroups.forEach((g: any) => {
                                        const cids = g.categoryIds || g.category_ids || [];
                                        const iids = g.itemIds || g.item_ids || [];
                                        cids.forEach((id: any) => catSet.add(String(id).trim().toLowerCase()));
                                        iids.forEach((id: any) => itemSet.add(String(id).trim().toLowerCase()));
                                    });
                                    if (catSet.size > 0) groupCatIds = catSet;
                                    if (itemSet.size > 0) groupItemIds = itemSet;
                                }

                                let hotelCatIds: Set<string> | null = null;
                                const directHotelCats = (hotel as any)?.assignedCategoryIds || (hotel as any)?.assigned_category_ids;
                                if (Array.isArray(directHotelCats) && directHotelCats.length > 0) {
                                    hotelCatIds = new Set(directHotelCats.map((id: any) => String(id).trim().toLowerCase()));
                                }

                                let batchCatIds: Set<string> | null = null;
                                const hotelBatchId = (hotel as any)?.batchId || (hotel as any)?.batch_id;
                                if (hotelBatchId && batches && batches.length > 0) {
                                    const matchingBatch = batches.find(b => String(b.id).trim().toLowerCase() === String(hotelBatchId).trim().toLowerCase());
                                    const bCatIds = (matchingBatch as any)?.categoryIds || (matchingBatch as any)?.category_ids;
                                    if (Array.isArray(bCatIds) && bCatIds.length > 0) {
                                        batchCatIds = new Set(bCatIds.map((id: any) => String(id).trim().toLowerCase()));
                                    }
                                }

                                const effectiveCatIds = groupCatIds || hotelCatIds || batchCatIds;

                                const res = items.filter((item: any) => {
                                    const itemCatId = String(item.categoryId || item.category_id || '').trim().toLowerCase();
                                    const itemIdStr = String(item.id).trim().toLowerCase();

                                    if (effectiveCatIds && !effectiveCatIds.has(itemCatId)) {
                                        return false;
                                    }
                                    if (groupItemIds && groupItemIds.size > 0 && !groupItemIds.has(itemIdStr)) {
                                        return false;
                                    }
                                    return true;
                                });

                                if (hKey) {
                                    hotelAssignedItemsMap.set(hKey, res);
                                }
                                return res;
                            };

                            // 1. Helper to calculate progress for a single hotel
                            const getHotelProgress = (hotelId: string) => {
                                const hIdLower = String(hotelId).toLowerCase();
                                const currentHotel = hotels.find(h => 
                                    String(h.id).toLowerCase() === hIdLower || 
                                    (h.code && String(h.code).toLowerCase() === hIdLower) ||
                                    (h.name && String(h.name).toLowerCase() === hIdLower)
                                ) || { id: hotelId } as Hotel;
                                
                                const idsSet = currentHotel?.id ? hotelAssociatedIdsMap.get(String(currentHotel.id)) : null;
                                const possibleIds = idsSet ? Array.from(idsSet) : [hIdLower];

                                const hotelItems = getHotelAssignedItems(currentHotel);

                                const submittedItemIdsForHotel = new Set<string>();
                                const naItemIdsForHotel = new Set<string>();

                                // 1. Fast O(1) Map lookups from pre-indexed Supabase submissions
                                possibleIds.forEach((pid: any) => {
                                    const entry = progressSubmissionsByHotelMap.get(String(pid));
                                    if (entry) {
                                        entry.submitted.forEach((id: string) => submittedItemIdsForHotel.add(id));
                                        entry.na.forEach((id: string) => naItemIdsForHotel.add(id));
                                    }
                                });

                                // 2. Fast O(1) Map lookups from pre-indexed Local Storage
                                possibleIds.forEach((pid: any) => {
                                    const entry = progressLocalAuditByHotelMap.get(String(pid));
                                    if (entry) {
                                        entry.submitted.forEach((id: string) => submittedItemIdsForHotel.add(id));
                                        entry.na.forEach((id: string) => naItemIdsForHotel.add(id));
                                    }
                                });

                                let completedT = 0;
                                let totalT = 0;
                                hotelItems.forEach((item: any) => {
                                    const itemIdStr = String(item.id);
                                    const isSubmitted = submittedItemIdsForHotel.has(itemIdStr);

                                    // Determine if auditor approved N/A or made it N/A themselves
                                    let isAuditorNa = false;
                                    for (const pid of possibleIds) {
                                        if (inspectionScores[`${pid}_${item.id}`] === 'N/A') {
                                            isAuditorNa = true;
                                            break;
                                        }
                                    }
                                    if (currentHotel?.id && inspectionScores[`${currentHotel.id}_${item.id}`] === 'N/A') {
                                        isAuditorNa = true;
                                    }

                                    if (!isAuditorNa) {
                                        totalT++;
                                        if (isSubmitted) {
                                            completedT++;
                                        }
                                    }
                                });

                                const finalInfo = getHotelFinalizedInfo(currentHotel || hotelId);
                                const percentage = totalT > 0 ? Math.round((completedT / totalT) * 100) : (hotelItems.length > 0 && naItemIdsForHotel.size === hotelItems.length ? 100 : 0);

                                return { completed: completedT, total: totalT, percentage, isFinalized: finalInfo.is_finalized };
                            };

                            // Memoized Map cache per render for O(1) repeated lookups
                            const hotelProgressMap = new Map<string, { completed: number; total: number; percentage: number; isFinalized: boolean; statusText: string; statusOrder: number }>();
                            const getHotelProgressCached = (hotelId: string) => {
                                const hKey = String(hotelId).toLowerCase();
                                if (hotelProgressMap.has(hKey)) {
                                    return hotelProgressMap.get(hKey)!;
                                }
                                const res = getHotelProgress(hotelId);
                                const finInfo = getHotelFinalizedInfo(hotelId);
                                const isFin = res.isFinalized || finInfo.is_finalized;

                                let statusText = "Not Started";
                                let statusOrder = 4;
                                if (isFin) {
                                    statusText = "Finalized";
                                    statusOrder = 1;
                                } else if (res.percentage === 100) {
                                    statusText = "Completed";
                                    statusOrder = 2;
                                } else if (res.percentage > 0) {
                                    statusText = "In Progress";
                                    statusOrder = 3;
                                }
                                const fullResult = { ...res, isFinalized: isFin, statusText, statusOrder };
                                hotelProgressMap.set(hKey, fullResult);
                                return fullResult;
                            };

                            // Helper to check if a hotel is completed
                            const isHotelCompleted = (hotelId: string) => {
                                const { percentage, isFinalized } = getHotelProgressCached(hotelId);
                                return isFinalized || percentage === 100;
                            };

                            // 2. Helper to calculate combined average progress across a group of hotels
                            const calculateHotelBasedProgress = (hotelList: Hotel[]) => {
                                const totalHotels = hotelList.length;
                                if (totalHotels === 0) {
                                    return { completedHotels: 0, inProgressHotels: 0, totalHotels: 0, percentage: 0 };
                                }

                                let completedHotels = 0;
                                let inProgressHotels = 0;
                                let sumPercentage = 0;

                                hotelList.forEach(h => {
                                    const { percentage, isFinalized } = getHotelProgressCached(h.id);
                                    const effPct = isFinalized ? 100 : percentage;
                                    
                                    sumPercentage += effPct;
                                    if (isFinalized || effPct === 100) {
                                        completedHotels++;
                                    } else if (effPct > 0) {
                                        inProgressHotels++;
                                    }
                                });

                                const avgPercentage = Math.round(sumPercentage / totalHotels);
                                return { completedHotels, inProgressHotels, totalHotels, percentage: avgPercentage };
                            };

                            // Unique categories for filtering / summary cards (excluding corporate assets)
                            const uniqueRegions = Array.from(new Set(nonCorporateHotels.map(h => h.region).filter(Boolean))) as string[];
                            const uniqueCountries = Array.from(new Set(nonCorporateHotels.map(h => h.country).filter(Boolean))) as string[];
                            const uniqueBrands = Array.from(new Set(nonCorporateHotels.map(h => h.brandClass).filter(Boolean))) as string[];

                            // Summaries
                            const regionProgresses = uniqueRegions.map(region => {
                                const regionHotels = nonCorporateHotels.filter(h => h.region === region);
                                const prog = calculateHotelBasedProgress(regionHotels);
                                return { name: region, ...prog };
                            });
                            const countryProgresses = uniqueCountries.map(country => {
                                const countryHotels = nonCorporateHotels.filter(h => h.country === country);
                                const prog = calculateHotelBasedProgress(countryHotels);
                                return { name: country, ...prog };
                            });
                            const brandProgresses = uniqueBrands.map(brand => {
                                const brandHotels = nonCorporateHotels.filter(h => h.brandClass === brand);
                                const prog = calculateHotelBasedProgress(brandHotels);
                                return { name: brand, ...prog };
                            });

                            // Helper to find Brand Leads for a hotel
                            const brandLeadsMap = new Map<string, any[]>();
                            const getBrandLeadsForHotel = (hotel: any) => {
                                const hKey = String(hotel.id).toLowerCase();
                                if (brandLeadsMap.has(hKey)) {
                                    return brandLeadsMap.get(hKey)!;
                                }
                                if (!profilesList || !Array.isArray(profilesList)) return [];
                                const res = profilesList.filter(p => {
                                    if (!p.is_brand_audit_lead) return false;
                                    if (!p.hotel_id) return false;
                                    const ids = String(p.hotel_id).split(',').map(id => id.trim());
                                    const codes = p.hotel_code ? String(p.hotel_code).split(',').map(c => c.trim().toLowerCase()) : [];
                                    const names = p.hotel_name ? String(p.hotel_name).split(',').map(n => n.trim().toLowerCase()) : [];
                                    
                                    return ids.includes(String(hotel.id)) || 
                                           (hotel.code && codes.includes(String(hotel.code).toLowerCase())) || 
                                           (hotel.name && names.includes(String(hotel.name).toLowerCase()));
                                });
                                brandLeadsMap.set(hKey, res);
                                return res;
                            };

                            // Filtered Hotels
                            const filteredHotels = nonCorporateHotels.filter(h => {
                                const matchesRegion = !progressRegionFilter || h.region === progressRegionFilter;
                                const matchesCountry = !progressCountryFilter || h.country === progressCountryFilter;
                                const matchesBrand = !progressBrandFilter || h.brandClass === progressBrandFilter;
                                
                                const brandLeads = getBrandLeadsForHotel(h);
                                const matchesBrandLead = progressBrandLeadFilter === 'all' || 
                                    (progressBrandLeadFilter === 'has_lead' && brandLeads.length > 0) ||
                                    (progressBrandLeadFilter === 'no_lead' && brandLeads.length === 0);
                                
                                const q = progressSearchQuery.toLowerCase().trim();
                                const matchesSearch = !q || 
                                    (h.name || '').toLowerCase().includes(q) || 
                                    (h.code || '').toLowerCase().includes(q);

                                let matchesStatus = true;
                                if (progressStatusFilter !== 'all') {
                                    const progInfo = getHotelProgressCached(h.id);
                                    if (progressStatusFilter === 'finalized') {
                                        matchesStatus = progInfo.isFinalized;
                                    } else if (progressStatusFilter === 'in_progress') {
                                        matchesStatus = !progInfo.isFinalized && progInfo.percentage > 0;
                                    } else if (progressStatusFilter === 'not_started') {
                                        matchesStatus = !progInfo.isFinalized && progInfo.percentage === 0;
                                    }
                                }

                                return matchesRegion && matchesCountry && matchesBrand && matchesBrandLead && matchesSearch && matchesStatus;
                            });

                            // Sorting logic optimized for audit report
                            const sortedHotels = [...filteredHotels].sort((a, b) => {
                                let comparison = 0;
                                if (progressSortField === 'name') {
                                    const nameA = (a.name || '').toLowerCase();
                                    const nameB = (b.name || '').toLowerCase();
                                    comparison = nameA.localeCompare(nameB);
                                } else if (progressSortField === 'brand') {
                                    const brandA = (a.brandClass || '').toLowerCase();
                                    const brandB = (b.brandClass || '').toLowerCase();
                                    comparison = brandA.localeCompare(brandB);
                                } else if (progressSortField === 'location') {
                                    const locA = `${a.country || ''} ${a.region || ''}`.toLowerCase();
                                    const locB = `${b.country || ''} ${b.region || ''}`.toLowerCase();
                                    comparison = locA.localeCompare(locB);
                                } else if (progressSortField === 'progress') {
                                    const progA = getHotelProgressCached(a.id);
                                    const progB = getHotelProgressCached(b.id);
                                    comparison = progA.percentage - progB.percentage;
                                    if (comparison === 0) {
                                        comparison = progA.completed - progB.completed;
                                    }
                                } else if (progressSortField === 'status') {
                                    const progA = getHotelProgressCached(a.id);
                                    const progB = getHotelProgressCached(b.id);
                                    comparison = progA.statusOrder - progB.statusOrder;
                                }

                                if (comparison === 0) {
                                    comparison = (a.name || '').localeCompare(b.name || '');
                                }

                                return progressSortDirection === 'asc' ? comparison : -comparison;
                            });

                            // Pagination calculations
                            const totalHotelsCount = sortedHotels.length;
                            const totalPages = Math.max(1, Math.ceil(totalHotelsCount / progressPageSize));
                            const safePage = Math.min(Math.max(1, progressPage), totalPages);
                            const startIndex = (safePage - 1) * progressPageSize;
                            const endIndex = Math.min(startIndex + progressPageSize, totalHotelsCount);
                            const paginatedHotels = sortedHotels.slice(startIndex, endIndex);

                            const handleSortToggle = (field: 'name' | 'brand' | 'location' | 'progress' | 'status') => {
                                if (progressSortField === field) {
                                    setProgressSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                } else {
                                    setProgressSortField(field);
                                    setProgressSortDirection('asc');
                                }
                                setProgressPage(1);
                            };

                            return (
                                <div className="space-y-6">
                                    {/* PROGRESS CARDS ROW (Region, Country, Brand) */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Region Progress Column */}
                                        <div className="bg-slate-50/60 p-5 rounded-3xl border border-slate-150/50 shadow-[0_4px_20px_rgba(15,23,42,0.01)] flex flex-col h-[320px]">
                                            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-4 flex items-center gap-1.5 shrink-0">
                                                <Percent size={14} className="text-indigo-600" />
                                                Region Progress Summary
                                            </h3>
                                            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                                                {regionProgresses.map((rp, i) => (
                                                    <div 
                                                        key={rp.name || i}
                                                        onClick={() => setProgressRegionFilter(progressRegionFilter === rp.name ? '' : rp.name)}
                                                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.015] active:scale-[0.99] duration-200 ${
                                                            progressRegionFilter === rp.name 
                                                                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-600 shadow-md shadow-indigo-600/10' 
                                                                : 'bg-white hover:bg-slate-50 border-slate-150/60 text-slate-800'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center text-xs font-bold mb-2">
                                                            <span className="truncate max-w-[170px] tracking-tight">{rp.name}</span>
                                                            <span className={progressRegionFilter === rp.name ? 'text-white' : 'text-indigo-600'}>{rp.percentage}%</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-100/80 rounded-full overflow-hidden border border-slate-200/10">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-300 ${progressRegionFilter === rp.name ? 'bg-white' : 'bg-indigo-600'}`}
                                                                style={{ width: `${rp.percentage}%` }}
                                                            />
                                                        </div>
                                                        <p className={`text-[10px] font-medium mt-1.5 flex justify-between items-center ${progressRegionFilter === rp.name ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                            <span>
                                                                {rp.completedHotels > 0 ? `${rp.completedHotels} done • ` : ''}
                                                                {rp.inProgressHotels} in progress ({rp.totalHotels} {rp.totalHotels === 1 ? 'hotel' : 'hotels'})
                                                            </span>
                                                            {progressRegionFilter === rp.name && <span className="text-[9px] font-black uppercase bg-indigo-500/50 px-1.5 py-0.5 rounded">Active Filter</span>}
                                                        </p>
                                                    </div>
                                                ))}
                                                {regionProgresses.length === 0 && (
                                                    <p className="text-xs text-slate-400 text-center py-10 font-bold">No region data available</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Country Progress Column */}
                                        <div className="bg-slate-50/60 p-5 rounded-3xl border border-slate-150/50 shadow-[0_4px_20px_rgba(15,23,42,0.01)] flex flex-col h-[320px]">
                                            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-4 flex items-center gap-1.5 shrink-0">
                                                <MapPin size={14} className="text-emerald-600" />
                                                Country Progress Summary
                                            </h3>
                                            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                                                {countryProgresses.map((cp, i) => (
                                                    <div 
                                                        key={cp.name || i}
                                                        onClick={() => setProgressCountryFilter(progressCountryFilter === cp.name ? '' : cp.name)}
                                                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.015] active:scale-[0.99] duration-200 ${
                                                            progressCountryFilter === cp.name 
                                                                ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-600/10' 
                                                                : 'bg-white hover:bg-slate-50 border-slate-150/60 text-slate-800'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center text-xs font-bold mb-2">
                                                            <span className="truncate max-w-[170px] tracking-tight">{cp.name}</span>
                                                            <span className={progressCountryFilter === cp.name ? 'text-white' : 'text-emerald-600'}>{cp.percentage}%</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-100/80 rounded-full overflow-hidden border border-slate-200/10">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-300 ${progressCountryFilter === cp.name ? 'bg-white' : 'bg-emerald-600'}`}
                                                                style={{ width: `${cp.percentage}%` }}
                                                            />
                                                        </div>
                                                        <p className={`text-[10px] font-medium mt-1.5 flex justify-between items-center ${progressCountryFilter === cp.name ? 'text-emerald-200' : 'text-slate-400'}`}>
                                                            <span>
                                                                {cp.completedHotels > 0 ? `${cp.completedHotels} done • ` : ''}
                                                                {cp.inProgressHotels} in progress ({cp.totalHotels} {cp.totalHotels === 1 ? 'hotel' : 'hotels'})
                                                            </span>
                                                            {progressCountryFilter === cp.name && <span className="text-[9px] font-black uppercase bg-emerald-500/50 px-1.5 py-0.5 rounded">Active Filter</span>}
                                                        </p>
                                                    </div>
                                                ))}
                                                {countryProgresses.length === 0 && (
                                                    <p className="text-xs text-slate-400 text-center py-10 font-bold">No country data available</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Brand Progress Column */}
                                        <div className="bg-slate-50/60 p-5 rounded-3xl border border-slate-150/50 shadow-[0_4px_20px_rgba(15,23,42,0.01)] flex flex-col h-[320px]">
                                            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-4 flex items-center gap-1.5 shrink-0">
                                                <Building size={14} className="text-amber-600" />
                                                Brand Progress Summary
                                            </h3>
                                            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                                                {brandProgresses.map((bp, i) => (
                                                    <div 
                                                        key={bp.name || i}
                                                        onClick={() => setProgressBrandFilter(progressBrandFilter === bp.name ? '' : bp.name)}
                                                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.015] active:scale-[0.99] duration-200 ${
                                                            progressBrandFilter === bp.name 
                                                                ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white border-amber-600 shadow-md shadow-amber-600/10' 
                                                                : 'bg-white hover:bg-slate-50 border-slate-150/60 text-slate-800'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center text-xs font-bold mb-2">
                                                            <span className="truncate max-w-[170px] tracking-tight">{bp.name}</span>
                                                            <span className={progressBrandFilter === bp.name ? 'text-white' : 'text-amber-600'}>{bp.percentage}%</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-100/80 rounded-full overflow-hidden border border-slate-200/10">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-300 ${progressBrandFilter === bp.name ? 'bg-white' : 'bg-amber-600'}`}
                                                                style={{ width: `${bp.percentage}%` }}
                                                            />
                                                        </div>
                                                        <p className={`text-[10px] font-medium mt-1.5 flex justify-between items-center ${progressBrandFilter === bp.name ? 'text-amber-200' : 'text-slate-400'}`}>
                                                            <span>
                                                                {bp.completedHotels > 0 ? `${bp.completedHotels} done • ` : ''}
                                                                {bp.inProgressHotels} in progress ({bp.totalHotels} {bp.totalHotels === 1 ? 'hotel' : 'hotels'})
                                                            </span>
                                                            {progressBrandFilter === bp.name && <span className="text-[9px] font-black uppercase bg-amber-500/50 px-1.5 py-0.5 rounded">Active Filter</span>}
                                                        </p>
                                                    </div>
                                                ))}
                                                {brandProgresses.length === 0 && (
                                                    <p className="text-xs text-slate-400 text-center py-10 font-bold">No brand data available</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* SEARCH & FILTERS BAR */}
                                    <div className="bg-white p-5 rounded-3xl border border-slate-150/80 shadow-[0_12px_40px_rgba(15,23,42,0.015)]">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            {/* Search box */}
                                            <div className="relative flex-1">
                                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                                    <Search size={16} />
                                                </div>
                                                <input
                                                    type="text"
                                                    className="w-full pl-10 pr-8 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium transition-all"
                                                    placeholder="Search registered hotel properties by name or code..."
                                                    value={progressSearchQuery}
                                                    onChange={(e) => {
                                                        setProgressSearchQuery(e.target.value);
                                                        setProgressPage(1);
                                                    }}
                                                />
                                                {progressSearchQuery && (
                                                    <button 
                                                        onClick={() => {
                                                            setProgressSearchQuery('');
                                                            setProgressPage(1);
                                                        }}
                                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Dropdowns */}
                                            <div className="flex flex-wrap items-center gap-3">
                                                {/* Region Filter */}
                                                <div className="w-full sm:w-[150px]">
                                                    <select
                                                        className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 font-bold transition-all text-slate-700"
                                                        value={progressRegionFilter}
                                                        onChange={(e) => {
                                                            setProgressRegionFilter(e.target.value);
                                                            setProgressPage(1);
                                                        }}
                                                    >
                                                        <option value="">All Regions</option>
                                                        {uniqueRegions.map(r => (
                                                             <option key={r} value={r}>{r}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Country Filter */}
                                                <div className="w-full sm:w-[150px]">
                                                    <select
                                                        className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 font-bold transition-all text-slate-700"
                                                        value={progressCountryFilter}
                                                        onChange={(e) => {
                                                            setProgressCountryFilter(e.target.value);
                                                            setProgressPage(1);
                                                        }}
                                                    >
                                                        <option value="">All Countries</option>
                                                        {uniqueCountries.map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Brand Filter */}
                                                <div className="w-full sm:w-[150px]">
                                                    <select
                                                        className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 font-bold transition-all text-slate-700"
                                                        value={progressBrandFilter}
                                                        onChange={(e) => {
                                                            setProgressBrandFilter(e.target.value);
                                                            setProgressPage(1);
                                                        }}
                                                    >
                                                        <option value="">All Brands</option>
                                                        {uniqueBrands.map(b => (
                                                            <option key={b} value={b}>{b}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Brand Lead Filter */}
                                                <div className="w-full sm:w-[170px]">
                                                    <select
                                                        className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 font-bold transition-all text-slate-700"
                                                        value={progressBrandLeadFilter}
                                                        onChange={(e) => {
                                                            setProgressBrandLeadFilter(e.target.value as any);
                                                            setProgressPage(1);
                                                        }}
                                                    >
                                                        <option value="all">All Representation</option>
                                                        <option value="has_lead">Has Brand Lead</option>
                                                        <option value="no_lead">No Brand Lead</option>
                                                    </select>
                                                </div>

                                                {/* Audit Status Filter */}
                                                <div className="w-full sm:w-[180px]">
                                                    <select
                                                        className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 font-bold transition-all text-slate-700"
                                                        value={progressStatusFilter}
                                                        onChange={(e) => {
                                                            setProgressStatusFilter(e.target.value as any);
                                                            setProgressPage(1);
                                                        }}
                                                    >
                                                        <option value="all">All Audit Statuses</option>
                                                        <option value="finalized">Finalised & Submitted</option>
                                                        <option value="in_progress">In Progress</option>
                                                        <option value="not_started">Not Started</option>
                                                    </select>
                                                </div>

                                                {/* Clear filters trigger */}
                                                {(progressRegionFilter || progressCountryFilter || progressBrandFilter || progressSearchQuery || progressBrandLeadFilter !== 'all' || progressStatusFilter !== 'all') && (
                                                    <button
                                                        onClick={() => {
                                                            setProgressRegionFilter('');
                                                            setProgressCountryFilter('');
                                                            setProgressBrandFilter('');
                                                            setProgressSearchQuery('');
                                                            setProgressBrandLeadFilter('all');
                                                            setProgressStatusFilter('all');
                                                            setProgressPage(1);
                                                        }}
                                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-2.5 hover:bg-indigo-50 rounded-xl transition-all"
                                                    >
                                                        <X size={12} /> Reset Filters
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* LIST TABLE CONTAINING ALL HOTELS AND THEIR PROGRESS */}
                                    <div className="bg-white border border-slate-150/80 rounded-3xl overflow-hidden shadow-[0_12px_40px_rgba(15,23,42,0.015)]">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/70 border-b border-slate-150/50 text-[10px] font-black uppercase text-slate-500 tracking-widest select-none">
                                                        <th 
                                                            onClick={() => handleSortToggle('name')}
                                                            className="px-6 py-4.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                                            title="Click to sort by Hotel Name"
                                                        >
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <span>Hotel Property</span>
                                                                {progressSortField === 'name' ? (
                                                                    progressSortDirection === 'asc' ? <ChevronUp size={13} className="text-indigo-600 shrink-0" /> : <ChevronDown size={13} className="text-indigo-600 shrink-0" />
                                                                ) : (
                                                                    <ArrowUpDown size={12} className="text-slate-300 opacity-60 shrink-0" />
                                                                )}
                                                            </div>
                                                        </th>
                                                        <th 
                                                            onClick={() => handleSortToggle('brand')}
                                                            className="px-6 py-4.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                                            title="Click to sort by Brand"
                                                        >
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <span>Brand</span>
                                                                {progressSortField === 'brand' ? (
                                                                    progressSortDirection === 'asc' ? <ChevronUp size={13} className="text-indigo-600 shrink-0" /> : <ChevronDown size={13} className="text-indigo-600 shrink-0" />
                                                                ) : (
                                                                    <ArrowUpDown size={12} className="text-slate-300 opacity-60 shrink-0" />
                                                                )}
                                                            </div>
                                                        </th>
                                                        <th 
                                                            onClick={() => handleSortToggle('location')}
                                                            className="px-6 py-4.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                                            title="Click to sort by Location"
                                                        >
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <span>Location</span>
                                                                {progressSortField === 'location' ? (
                                                                    progressSortDirection === 'asc' ? <ChevronUp size={13} className="text-indigo-600 shrink-0" /> : <ChevronDown size={13} className="text-indigo-600 shrink-0" />
                                                                ) : (
                                                                    <ArrowUpDown size={12} className="text-slate-300 opacity-60 shrink-0" />
                                                                )}
                                                            </div>
                                                        </th>
                                                        <th 
                                                            onClick={() => handleSortToggle('progress')}
                                                            className="px-6 py-4.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                                            title="Click to sort by Audit Progress"
                                                        >
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <span>Audit Progress</span>
                                                                {progressSortField === 'progress' ? (
                                                                    progressSortDirection === 'asc' ? <ChevronUp size={13} className="text-indigo-600 shrink-0" /> : <ChevronDown size={13} className="text-indigo-600 shrink-0" />
                                                                ) : (
                                                                    <ArrowUpDown size={12} className="text-slate-300 opacity-60 shrink-0" />
                                                                )}
                                                            </div>
                                                        </th>
                                                        <th 
                                                            onClick={() => handleSortToggle('status')}
                                                            className="px-6 py-4.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                                            title="Click to sort by Status"
                                                        >
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <span>Status</span>
                                                                {progressSortField === 'status' ? (
                                                                    progressSortDirection === 'asc' ? <ChevronUp size={13} className="text-indigo-600 shrink-0" /> : <ChevronDown size={13} className="text-indigo-600 shrink-0" />
                                                                ) : (
                                                                    <ArrowUpDown size={12} className="text-slate-300 opacity-60 shrink-0" />
                                                                )}
                                                            </div>
                                                        </th>
                                                        <th className="px-6 py-4.5 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                                    {paginatedHotels.length > 0 ? (
                                                        paginatedHotels.map((h, i) => {
                                                            const effProg = getHotelProgressCached(h.id);
                                                            const { completed, total, percentage, statusText } = effProg;
                                                            const finalInfo = getHotelFinalizedInfo(h);
                                                            
                                                            let statusStyle = "bg-slate-50 text-slate-600 border-slate-200/50";
                                                            
                                                            if (statusText === 'Finalized') {
                                                                statusStyle = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
                                                            } else if (statusText === 'Completed') {
                                                                statusStyle = "bg-indigo-50 text-indigo-700 border-indigo-200/60";
                                                            } else if (statusText === 'In Progress') {
                                                                statusStyle = "bg-amber-50 text-amber-700 border-amber-200/60";
                                                            }

                                                            return (
                                                                <tr key={h.id || i} className="hover:bg-slate-50/40 transition-colors group">
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-9 h-9 rounded-xl bg-indigo-50/80 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 transition-all">
                                                                                {(h.name || '?').charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <div>
                                                                                <span className="font-extrabold text-slate-900 block tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">{h.name}</span>
                                                                                {h.code && (
                                                                                    <span className="text-[10px] text-slate-400 font-bold font-mono">ID: {h.code}</span>
                                                                                )}
                                                                                {(() => {
                                                                                    const leads = getBrandLeadsForHotel(h);
                                                                                    if (leads.length === 0) return null;
                                                                                    return (
                                                                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                                                                            {leads.map(bl => (
                                                                                                <span key={bl.id} className="inline-flex items-center gap-1 text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100/50 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider shadow-2xs">
                                                                                                    <ShieldCheck size={10} className="text-indigo-600 shrink-0" />
                                                                                                    Brand Lead: {bl.display_name || `${bl.first_name || ''} ${bl.last_name || ''}`.trim() || bl.email.split('@')[0]}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 font-extrabold text-slate-600">
                                                                        {h.brandClass}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-slate-500 font-medium">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-slate-800">{h.country || 'Unknown Country'}</span>
                                                                            <span className="text-[10px] text-slate-400 font-bold">{h.region || 'Unknown Region'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="w-[190px]">
                                                                            <div className="flex items-center justify-between text-[10px] font-black text-slate-500 mb-1">
                                                                                <span>{completed} / {total} Tasks</span>
                                                                                <span className="text-indigo-600 font-extrabold">{percentage}%</span>
                                                                            </div>
                                                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/20">
                                                                                <div 
                                                                                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                                                                                        percentage === 100 ? 'bg-indigo-600' : 'bg-emerald-500'
                                                                                    }`}
                                                                                    style={{ width: `${percentage}%` }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${statusStyle}`}>
                                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                                statusText === 'Finalized' ? 'bg-emerald-500 animate-pulse' :
                                                                                statusText === 'Completed' ? 'bg-indigo-500' :
                                                                                statusText === 'In Progress' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
                                                                            }`} />
                                                                            {statusText}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            {isHotelAuditLocked(h) ? (
                                                                                <button
                                                                                    onClick={() => handleSetAuditLock(h, false)}
                                                                                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 px-3 py-2 rounded-xl border border-rose-200/60 active:scale-95 transition-all shadow-2xs"
                                                                                    title="Audit is locked: the hotel cannot upload evidence or continue. Click to unlock."
                                                                                >
                                                                                    <Lock size={11} />
                                                                                    <span>Locked</span>
                                                                                </button>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => handleSetAuditLock(h, true)}
                                                                                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100/80 px-3 py-2 rounded-xl border border-slate-200/60 active:scale-95 transition-all shadow-2xs"
                                                                                    title="Lock audit: the hotel's Continue button is disabled and no new evidence can be uploaded."
                                                                                >
                                                                                    <Lock size={11} />
                                                                                    <span>Lock Audit</span>
                                                                                </button>
                                                                            )}
                                                                            {finalInfo.is_finalized && (
                                                                                <button
                                                                                    onClick={() => handleUnlockHotel(h.id)}
                                                                                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-2 rounded-xl border border-emerald-200/60 active:scale-95 transition-all shadow-2xs"
                                                                                    title={`Finalised by ${finalInfo.finalized_by || 'Representative'} on ${finalInfo.finalized_at ? new Date(finalInfo.finalized_at).toLocaleDateString() : ''}. Click to unlock.`}
                                                                                >
                                                                                    <Unlock size={11} />
                                                                                    <span>Unlock Audit</span>
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={() => {
                                                                                    setHotelToReset(h);
                                                                                    setIsResetPinModalOpen(true);
                                                                                    setResetPinValue('');
                                                                                    setResetPinError('');
                                                                                }}
                                                                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 px-3 py-2 rounded-xl border border-rose-100/60 active:scale-95 transition-all shadow-2xs"
                                                                                title="Reset all progress made by this hotel"
                                                                            >
                                                                                <RefreshCw size={11} />
                                                                                <span>Reset Progress</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    const targetCode = h.code || h.id;
                                                                                    setSelectedInspectionHotelId(targetCode);
                                                                                    localStorage.setItem('sbi_audit_v2_selected_hotel', targetCode);
                                                                                    setSubView('inspection_v2');
                                                                                }}
                                                                                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-100/80 px-3.5 py-2 rounded-xl border border-indigo-100/60 active:scale-95 transition-all shadow-2xs"
                                                                            >
                                                                                <span>Review</span>
                                                                                <ChevronRight size={12} />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={6} className="text-center py-16 text-slate-400 font-extrabold text-sm bg-slate-50/20">
                                                                <AlertCircle className="mx-auto text-slate-300 mb-2" size={24} />
                                                                No hotel properties match the filter criteria.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* PAGINATION FOOTER BAR */}
                                        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-150/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                                                <span>
                                                    Showing <strong className="text-slate-800 font-bold">{totalHotelsCount === 0 ? 0 : startIndex + 1}</strong> to <strong className="text-slate-800 font-bold">{endIndex}</strong> of <strong className="text-slate-800 font-bold">{totalHotelsCount}</strong> properties
                                                </span>
                                                <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                                                    <span className="text-[11px] font-bold text-slate-400">Rows per page:</span>
                                                    <select
                                                        value={progressPageSize}
                                                        onChange={(e) => {
                                                            setProgressPageSize(Number(e.target.value));
                                                            setProgressPage(1);
                                                        }}
                                                        className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                                                    >
                                                        <option value={10}>10</option>
                                                        <option value={25}>25</option>
                                                        <option value={50}>50</option>
                                                        <option value={100}>100</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Navigation buttons */}
                                            {totalPages > 1 && (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => setProgressPage(1)}
                                                        disabled={safePage === 1}
                                                        className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                                                        title="First Page"
                                                    >
                                                        <ChevronsLeft size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setProgressPage(p => Math.max(1, p - 1))}
                                                        disabled={safePage === 1}
                                                        className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                                                        title="Previous Page"
                                                    >
                                                        <ChevronLeft size={14} />
                                                    </button>

                                                    {/* Numeric page buttons */}
                                                    {(() => {
                                                        const pages: number[] = [];
                                                        const maxButtons = 5;
                                                        let startP = Math.max(1, safePage - 2);
                                                        let endP = Math.min(totalPages, startP + maxButtons - 1);
                                                        if (endP - startP + 1 < maxButtons) {
                                                            startP = Math.max(1, endP - maxButtons + 1);
                                                        }
                                                        for (let p = startP; p <= endP; p++) {
                                                            pages.push(p);
                                                        }

                                                        return pages.map(pageNum => (
                                                            <button
                                                                key={pageNum}
                                                                onClick={() => setProgressPage(pageNum)}
                                                                className={`px-3 py-1 text-xs font-extrabold rounded-lg border transition-all ${
                                                                    pageNum === safePage
                                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs'
                                                                }`}
                                                            >
                                                                {pageNum}
                                                            </button>
                                                        ));
                                                    })()}

                                                    <button
                                                        onClick={() => setProgressPage(p => Math.min(totalPages, p + 1))}
                                                        disabled={safePage === totalPages}
                                                        className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                                                        title="Next Page"
                                                    >
                                                        <ChevronRight size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setProgressPage(totalPages)}
                                                        disabled={safePage === totalPages}
                                                        className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                                                        title="Last Page"
                                                    >
                                                        <ChevronsRight size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
    );
};
