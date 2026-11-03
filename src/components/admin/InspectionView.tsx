import React from 'react';
import { AuditCategory, AuditGroup, AuditItem, Hotel } from '../../types';
import { AlertCircle, ArrowLeft, Camera, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsLeft, ChevronsRight, Clock, Eye, FileCheck, FileText, Layers, Loader2, MapPin, RefreshCw, Search, ShieldCheck, Unlock, UploadCloud, User, X } from 'lucide-react';


// Moved out of AdminPanelScreen (sub-view 'inspection'). Values are passed in from the admin screen.
export interface InspectionViewProps {
    onBackToDashboard: () => void;
    AuditorEvidenceForm: any;
    EvidenceMediaViewer: any;
    auditorAssignments: any[];
    auditorCategoryAssignments: any[];
    catList: AuditCategory[];
    commitInspectionToDatabase: (hotelOrId: any, itemId: string, overrideScore?: string | number, overrideComment?: string) => Promise<void>;
    copiedDocId: string;
    expandedInspectionItems: Record<string, boolean>;
    fetchFullCategorySubmissions: (itemIds: string[]) => Promise<void>;
    fetchFullItemSubmission: (itemId: string, force?: boolean) => Promise<void>;
    fetchHotelSubmissionsForAuditor: (isInitialLoad?: boolean) => Promise<void>;
    getHotelFinalizedInfo: (hotelIdOrHotel: any) => { is_finalized: boolean; is_locked?: boolean; finalized_by?: string; finalized_at?: string; };
    getSubmissionsForHotel: (hotel: Hotel) => any[];
    getSubmitterName: (sub: any, currentHotel?: any) => any;
    groups: AuditGroup[];
    handleCopyDocLink: (text: string, id: string) => void;
    handleDocumentDownload: (val: string, itemName: string) => void;
    handleUnlockHotel: (hotelId: string) => Promise<void>;
    hotelSubmissions: Record<string, any>;
    hotels: Hotel[];
    includedHotels: Hotel[];
    inspectionComments: Record<string, string>;
    inspectionPage: number;
    inspectionPageSize: number;
    inspectionScores: Record<string, string | number>;
    inspectionStatusFilter: "all" | "finalized" | "in_progress" | "not_started";
    isImageInput: (type: string) => boolean;
    isSubmissionForHotel: (submissionHotelId: string, hotel: Hotel) => boolean;
    items: AuditItem[];
    loadingItemIds: Record<string, boolean>;
    profilesList: any[];
    recentlySavedItemId: string;
    safeFormatDateTime: (dateStr: any) => string;
    saveInspectionComment: (hotelOrId: any, itemId: string, comment: string) => void;
    saveInspectionScore: (hotelOrId: any, itemId: string, score: string | number) => void;
    savingInspectionItemId: string;
    searchQuery: string;
    selectedInspectionCategoryId: string;
    selectedInspectionHotelId: string;
    setEnlargedImage: React.Dispatch<React.SetStateAction<{ url: string; title?: string; }>>;
    setExpandedInspectionItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    setInspectionPage: React.Dispatch<React.SetStateAction<number>>;
    setInspectionPageSize: React.Dispatch<React.SetStateAction<number>>;
    setInspectionStatusFilter: React.Dispatch<React.SetStateAction<"all" | "finalized" | "in_progress" | "not_started">>;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    setSelectedInspectionCategoryId: React.Dispatch<React.SetStateAction<string>>;
    setSelectedInspectionHotelId: React.Dispatch<React.SetStateAction<string>>;
    setToastMessage: React.Dispatch<React.SetStateAction<string>>;
    userProfile: any;
}

export const InspectionView: React.FC<InspectionViewProps> = (props) => {
    const { AuditorEvidenceForm, EvidenceMediaViewer, auditorAssignments, auditorCategoryAssignments, catList, commitInspectionToDatabase, copiedDocId, expandedInspectionItems, fetchFullCategorySubmissions, fetchFullItemSubmission, fetchHotelSubmissionsForAuditor, getHotelFinalizedInfo, getSubmissionsForHotel, getSubmitterName, groups, handleCopyDocLink, handleDocumentDownload, handleUnlockHotel, hotelSubmissions, hotels, includedHotels, inspectionComments, inspectionPage, inspectionPageSize, inspectionScores, inspectionStatusFilter, isImageInput, isSubmissionForHotel, items, loadingItemIds, profilesList, recentlySavedItemId, safeFormatDateTime, saveInspectionComment, saveInspectionScore, savingInspectionItemId, searchQuery, selectedInspectionCategoryId, selectedInspectionHotelId, setEnlargedImage, setExpandedInspectionItems, setInspectionPage, setInspectionPageSize, setInspectionStatusFilter, setSearchQuery, setSelectedInspectionCategoryId, setSelectedInspectionHotelId, setToastMessage, userProfile, onBackToDashboard } = props;
    return (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Audit Inspection Subview */}
                        {/* BACK BUTTON & HEADER */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { onBackToDashboard(); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-55/80 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Perform Audit Inspection</h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    Review hotel submissions and assign compliance scores.
                                </p>
                            </div>
                        </div>

                        {/* STEP 1: SELECT HOTEL */}
                        {!selectedInspectionHotelId ? (
                            <div className="space-y-4">
                                <div className="bg-white p-6 rounded-[28px] border border-slate-150/80 shadow-[0_12px_40px_rgba(15,23,42,0.015)]">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                                        Select a Property to Begin Inspection
                                    </h3>
                                    
                                    {/* Search Bar & Filters for Inspection */}
                                    <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
                                        <div className="relative flex-1 w-full">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                                <Search size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Search registered hotel properties by name or code..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-10 py-3 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-350 rounded-2xl text-slate-800 text-sm outline-none transition-all placeholder:text-slate-400 font-medium"
                                            />
                                            {searchQuery && (
                                                <button 
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="w-full sm:w-[220px]">
                                            <select
                                                value={inspectionStatusFilter}
                                                onChange={(e) => setInspectionStatusFilter(e.target.value as any)}
                                                className="w-full px-3.5 py-3 text-xs border border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-bold transition-all text-slate-700 shadow-2xs"
                                            >
                                                <option value="all">All Audit Statuses</option>
                                                <option value="finalized">Finalised & Submitted</option>
                                                <option value="in_progress">In Progress / Draft</option>
                                                <option value="not_started">Not Started</option>
                                            </select>
                                        </div>

                                        {(searchQuery || inspectionStatusFilter !== 'all') && (
                                            <button
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setInspectionStatusFilter('all');
                                                }}
                                                className="whitespace-nowrap text-xs text-indigo-600 hover:text-indigo-800 font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-3 hover:bg-indigo-50 rounded-2xl transition-all"
                                            >
                                                <X size={14} /> Reset Filters
                                            </button>
                                        )}
                                    </div>

                                    {/* Hotels List */}
                                    {(() => {
                                        const inspectionHotelsFiltered = includedHotels.filter(h => {
                                            const isMatchSearch = !searchQuery || h.name.toLowerCase().includes(searchQuery.toLowerCase()) || (h.code && h.code.toLowerCase().includes(searchQuery.toLowerCase()));
                                            
                                            // Check if finalized & submitted
                                            const isFin = getHotelFinalizedInfo(h).is_finalized;

                                            let isMatchStatus = true;
                                            if (inspectionStatusFilter === 'finalized') {
                                                isMatchStatus = isFin;
                                            } else if (inspectionStatusFilter === 'in_progress') {
                                                if (isFin) {
                                                    isMatchStatus = false;
                                                } else {
                                                    const hotelSubs = getSubmissionsForHotel(h);
                                                    isMatchStatus = hotelSubs.length > 0;
                                                }
                                            } else if (inspectionStatusFilter === 'not_started') {
                                                if (isFin) {
                                                    isMatchStatus = false;
                                                } else {
                                                    const hotelSubs = getSubmissionsForHotel(h);
                                                    isMatchStatus = hotelSubs.length === 0;
                                                }
                                            }

                                            if (userProfile?.access_level === 'auditor') {
                                                const isAssigned = auditorAssignments.some(a => a.user_id === userProfile.id && a.hotel_id === h.id);
                                                return isMatchSearch && isMatchStatus && isAssigned;
                                            }
                                            return isMatchSearch && isMatchStatus;
                                        });

                                        const totalInspectionHotelsCount = inspectionHotelsFiltered.length;
                                        const totalInspectionPages = Math.max(1, Math.ceil(totalInspectionHotelsCount / inspectionPageSize));
                                        const safeInspectionPage = Math.min(Math.max(1, inspectionPage), totalInspectionPages);
                                        const inspectionStartIndex = (safeInspectionPage - 1) * inspectionPageSize;
                                        const inspectionEndIndex = Math.min(inspectionStartIndex + inspectionPageSize, totalInspectionHotelsCount);
                                        const paginatedInspectionHotels = inspectionHotelsFiltered.slice(inspectionStartIndex, inspectionEndIndex);

                                        return (
                                            <div className="overflow-x-auto bg-white rounded-3xl border border-slate-200 shadow-sm">
                                                <table className="w-full text-left text-sm text-slate-700">
                                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                                        <tr>
                                                            <th className="px-6 py-4">Property</th>
                                                            <th className="px-6 py-4">Brand</th>
                                                            <th className="px-6 py-4">Region</th>
                                                            <th className="px-6 py-4">Hotel Audit Progress</th>
                                                            <th className="px-6 py-4">Scoring Progress</th>
                                                            <th className="px-6 py-4">Evidence Received</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {paginatedInspectionHotels.map(hotel => {
                                                            const possibleIds = [
                                                                String(hotel.id).toLowerCase(),
                                                                hotel.code ? String(hotel.code).toLowerCase() : null,
                                                                hotel.name ? String(hotel.name).toLowerCase() : null
                                                            ].filter(Boolean) as string[];

                                                            const hotelGroups = groups.filter(g => 
                                                                g.hotelIds && g.hotelIds.some(hId => 
                                                                    possibleIds.some(phId => String(hId).toLowerCase() === phId)
                                                                )
                                                            );

                                                            let assignedItemIds: string[] | null = null;
                                                            if (hotelGroups.length > 0) {
                                                                const allItemIds = new Set<string>();
                                                                hotelGroups.forEach(g => {
                                                                    if (g.itemIds) {
                                                                        g.itemIds.forEach(id => allItemIds.add(String(id)));
                                                                    }
                                                                });
                                                                assignedItemIds = Array.from(allItemIds);
                                                            }

                                                            const isUserAuditor = userProfile?.access_level === 'auditor' || userProfile?.role === 'auditor';
                                                            const auditorAssignedCatIds = isUserAuditor
                                                                ? auditorCategoryAssignments
                                                                    .filter(a => String(a.user_id).trim().toLowerCase() === String(userProfile?.id || '').trim().toLowerCase())
                                                                    .map(a => String(a.category_id))
                                                                : null;

                                                            const allHotelItems = items.filter(item => {
                                                                const itemCatId = String(item.categoryId || '');
                                                                const matchesGroup = !assignedItemIds || assignedItemIds.length === 0 || assignedItemIds.includes(String(item.id));
                                                                const matchesAuditor = !auditorAssignedCatIds || auditorAssignedCatIds.includes(itemCatId);
                                                                return matchesGroup && matchesAuditor;
                                                            });
                                                            const totalItems = allHotelItems.length;

                                                            // Hotel's actual filled items & progress
                                                            const hotelSubs = getSubmissionsForHotel(hotel);
                                                            const submittedItemIdsSet = new Set(hotelSubs.map(s => String(s.item_id)));
                                                            const hotelFilledCount = allHotelItems.filter(item => submittedItemIdsSet.has(String(item.id))).length;
                                                            const isFinalized = getHotelFinalizedInfo(hotel).is_finalized;
                                                            const hotelProgressPct = isFinalized ? 100 : (totalItems > 0 ? Math.round((hotelFilledCount / totalItems) * 100) : 0);

                                                            // Global auditor scoring progress for this hotel
                                                            const scoredItems = allHotelItems.filter(i => inspectionScores[`${hotel.id}_${i.id}`] !== undefined).length;
                                                            const auditorScoringPercent = totalItems > 0 ? Math.round((scoredItems / totalItems) * 100) : 0;

                                                            // Individual assigned auditor progress calculation
                                                            const hIdStr = String(hotel.id).trim().toLowerCase();
                                                            const hAssignedAuditorIds = (auditorAssignments || [])
                                                                .filter(a => String(a.hotel_id).trim().toLowerCase() === hIdStr)
                                                                .map(a => String(a.user_id).trim().toLowerCase());
                                                            const catAssignedAuditorIds = (auditorCategoryAssignments || [])
                                                                .map(a => String(a.user_id).trim().toLowerCase());
                                                            const uniqueAssignedUserIds = Array.from(new Set([...hAssignedAuditorIds, ...catAssignedAuditorIds]));

                                                            const assignedAuditorProfiles = uniqueAssignedUserIds.map(uId => {
                                                                if (userProfile && String(userProfile.id).trim().toLowerCase() === uId) return userProfile;
                                                                return (profilesList || []).find(p => String(p.id).trim().toLowerCase() === uId);
                                                            }).filter(Boolean);

                                                            const assignedAuditorProgresses = assignedAuditorProfiles.map(u => {
                                                                const uIdLower = String(u.id).trim().toLowerCase();
                                                                const uName = u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Auditor';
                                                                
                                                                const uCatIds = (auditorCategoryAssignments || [])
                                                                    .filter(a => String(a.user_id).trim().toLowerCase() === uIdLower)
                                                                    .map(a => String(a.category_id).trim());
                                                                
                                                                let uItems = allHotelItems;
                                                                let categoriesStr = '';
                                                                
                                                                if (uCatIds.length > 0) {
                                                                    uItems = allHotelItems.filter(item => {
                                                                        const itemCatId = String(item.categoryId || '').trim();
                                                                        return uCatIds.includes(itemCatId);
                                                                    });
                                                                    
                                                                    const assignedCats = (catList || []).filter(c => uCatIds.includes(String(c.id).trim()));
                                                                    categoriesStr = assignedCats.map(c => c.name).join(', ');
                                                                }
                                                                
                                                                const uScoredCount = uItems.filter(i => inspectionScores[`${hotel.id}_${i.id}`] !== undefined).length;
                                                                const uTotalCount = uItems.length;
                                                                const uPercent = uTotalCount > 0 ? Math.round((uScoredCount / uTotalCount) * 100) : 0;
                                                                
                                                                return {
                                                                    user: u,
                                                                    name: uName,
                                                                    scored: uScoredCount,
                                                                    total: uTotalCount,
                                                                    percent: uPercent,
                                                                    categoriesStr
                                                                };
                                                            });

                                                            return (
                                                                <tr 
                                                                    key={hotel.id}
                                                                    onClick={() => { setSelectedInspectionHotelId(hotel.id); setSearchQuery(''); }}
                                                                    className="hover:bg-indigo-50/30 cursor-pointer transition-colors duration-200"
                                                                >
                                                                    <td className="px-6 py-4">
                                                                        <div className="font-bold text-slate-900">{hotel.name}</div>
                                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{hotel.code || 'NO-CODE'}</div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-slate-600 font-medium">{hotel.brandClass}</td>
                                                                    <td className="px-6 py-4 text-slate-600 font-medium">{hotel.region || 'N/A'}</td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex flex-col gap-1.5 w-44">
                                                                            <div className="flex items-center justify-between text-[11px] font-extrabold">
                                                                                <span className="text-slate-700">{hotelFilledCount}/{totalItems} items</span>
                                                                                <span className={hotelProgressPct === 100 ? 'text-emerald-600' : 'text-amber-600'}>
                                                                                    {hotelProgressPct}%
                                                                                </span>
                                                                            </div>
                                                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                                <div 
                                                                                    className={`h-full transition-all duration-300 ${isFinalized ? 'bg-emerald-500' : hotelProgressPct > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} 
                                                                                    style={{ width: `${hotelProgressPct}%` }}
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                {isFinalized ? (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                                        Finalized & Submitted
                                                                                    </span>
                                                                                ) : hotelProgressPct === 100 ? (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                                        100% Filled (Draft)
                                                                                    </span>
                                                                                ) : hotelProgressPct > 0 ? (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                                        In Progress
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                                        Not Started
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex flex-col gap-1.5 w-44">
                                                                            <div className="flex items-center justify-between text-[11px] font-extrabold">
                                                                                <span className="text-slate-700">{scoredItems}/{totalItems} scored</span>
                                                                                <span className={auditorScoringPercent === 100 ? 'text-emerald-600' : 'text-indigo-600'}>
                                                                                    {auditorScoringPercent}%
                                                                                </span>
                                                                            </div>
                                                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                                <div 
                                                                                    className={`h-full transition-all duration-300 ${auditorScoringPercent === 100 ? 'bg-emerald-500' : auditorScoringPercent > 0 ? 'bg-indigo-500' : 'bg-slate-300'}`} 
                                                                                    style={{ width: `${auditorScoringPercent}%` }}
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                {auditorScoringPercent === 100 ? (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                                        Completed (100%)
                                                                                    </span>
                                                                                ) : auditorScoringPercent > 0 ? (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                                        In Progress ({auditorScoringPercent}%)
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                                        Not Started
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 font-bold text-indigo-700">
                                                                        {hotelSubs.length} items
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                                {totalInspectionHotelsCount === 0 && (
                                                    <div className="py-8 text-center text-slate-400 font-bold text-xs">
                                                        No properties matched your search.
                                                    </div>
                                                )}

                                                {/* PAGINATION FOOTER BAR */}
                                                <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-150/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                                                        <span>
                                                            Showing <strong className="text-slate-800 font-bold">{totalInspectionHotelsCount === 0 ? 0 : inspectionStartIndex + 1}</strong> to <strong className="text-slate-800 font-bold">{inspectionEndIndex}</strong> of <strong className="text-slate-800 font-bold">{totalInspectionHotelsCount}</strong> properties
                                                        </span>
                                                        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                                                            <span className="text-[11px] font-bold text-slate-400">Rows per page:</span>
                                                            <select
                                                                value={inspectionPageSize}
                                                                onChange={(e) => {
                                                                    setInspectionPageSize(Number(e.target.value));
                                                                    setInspectionPage(1);
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
                                                    {totalInspectionPages > 1 && (
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => setInspectionPage(1)}
                                                                disabled={safeInspectionPage === 1}
                                                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                                                                title="First Page"
                                                            >
                                                                <ChevronsLeft size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setInspectionPage(p => Math.max(1, p - 1))}
                                                                disabled={safeInspectionPage === 1}
                                                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                                                                title="Previous Page"
                                                            >
                                                                <ChevronLeft size={14} />
                                                            </button>

                                                            {/* Numeric page buttons */}
                                                            {(() => {
                                                                const pages: number[] = [];
                                                                const maxButtons = 5;
                                                                let startP = Math.max(1, safeInspectionPage - 2);
                                                                let endP = Math.min(totalInspectionPages, startP + maxButtons - 1);
                                                                if (endP - startP + 1 < maxButtons) {
                                                                    startP = Math.max(1, endP - maxButtons + 1);
                                                                }
                                                                for (let p = startP; p <= endP; p++) {
                                                                    pages.push(p);
                                                                }

                                                                return pages.map(pageNum => (
                                                                    <button
                                                                        key={pageNum}
                                                                        onClick={() => setInspectionPage(pageNum)}
                                                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                                                            safeInspectionPage === pageNum
                                                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-2xs'
                                                                        }`}
                                                                    >
                                                                        {pageNum}
                                                                    </button>
                                                                ));
                                                            })()}

                                                            <button
                                                                onClick={() => setInspectionPage(p => Math.min(totalInspectionPages, p + 1))}
                                                                disabled={safeInspectionPage === totalInspectionPages}
                                                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                                                                title="Next Page"
                                                            >
                                                                <ChevronRight size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setInspectionPage(totalInspectionPages)}
                                                                disabled={safeInspectionPage === totalInspectionPages}
                                                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                                                                title="Last Page"
                                                            >
                                                                <ChevronsRight size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        ) : (
                            <React.Fragment>
                                {(() => {
                                    const hotel = hotels.find(h => h.id === selectedInspectionHotelId);
                                if (!hotel) return (
                                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-slate-100 shadow-sm">
                                        <AlertCircle size={48} className="text-amber-500 mb-4" />
                                        <h3 className="text-lg font-bold text-slate-800">Hotel Not Found</h3>
                                        <p className="text-slate-400 text-sm mt-1">Please go back and select a property again.</p>
                                        <button onClick={() => setSelectedInspectionHotelId('')} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full font-bold text-xs">Return to Property List</button>
                                    </div>
                                );

                                // Filter items and categories based on the audit groups assigned to this hotel
                                const possibleIds = [
                                    String(hotel.id).toLowerCase(),
                                    hotel.code ? String(hotel.code).toLowerCase() : null,
                                    hotel.name ? String(hotel.name).toLowerCase() : null
                                ].filter(Boolean) as string[];

                                const hotelGroups = groups.filter(g => 
                                    g.hotelIds && g.hotelIds.some(hId => 
                                        possibleIds.some(phId => String(hId).toLowerCase() === phId)
                                    )
                                );

                                let assignedItemIds: string[] | null = null;
                                let assignedCategoryIds: string[] | null = null;

                                if (hotelGroups.length > 0) {
                                    const allCatIds = new Set<string>();
                                    const allItemIds = new Set<string>();
                                    hotelGroups.forEach(g => {
                                        if (g.categoryIds) {
                                            g.categoryIds.forEach(id => allCatIds.add(String(id)));
                                        }
                                        if (g.itemIds) {
                                            g.itemIds.forEach(id => allItemIds.add(String(id)));
                                        }
                                    });
                                    assignedCategoryIds = Array.from(allCatIds);
                                    assignedItemIds = Array.from(allItemIds);
                                }

                                const isUserAuditor = userProfile?.access_level === 'auditor' || userProfile?.role === 'auditor';
                                const auditorAssignedCatIds = isUserAuditor
                                    ? auditorCategoryAssignments
                                        .filter(a => String(a.user_id).trim().toLowerCase() === String(userProfile?.id || '').trim().toLowerCase())
                                        .map(a => String(a.category_id))
                                    : null;

                                const allHotelItems = items.filter(item => {
                                    const itemCatId = String(item.categoryId || '');
                                    const matchesGroup = !assignedItemIds || assignedItemIds.length === 0 || assignedItemIds.includes(String(item.id));
                                    const matchesAuditor = !auditorAssignedCatIds || auditorAssignedCatIds.includes(itemCatId);
                                    return matchesGroup && matchesAuditor;
                                });

                                const scoredItems = allHotelItems.filter(i => inspectionScores[`${hotel.id}_${i.id}`] !== undefined);
                                const totalPointsScored = scoredItems.reduce((sum, i) => {
                                    const scoreVal = inspectionScores[`${hotel.id}_${i.id}`];
                                    if (scoreVal === 'N/A') return sum;
                                    const numVal = Number(scoreVal);
                                    return sum + (isNaN(numVal) ? 0 : numVal);
                                }, 0);
                                const isItemNA = (item: any) => {
                                    const sk1 = `${hotel.id}_${item.id}`;
                                    const sk2 = hotel?.code ? `${hotel.code}_${item.id}` : '';
                                    const scoreVal = inspectionScores[sk1] ?? (sk2 ? inspectionScores[sk2] : undefined) ?? inspectionScores[item.id];
                                    const sub = hotelSubmissions[item.id];
                                    if (scoreVal === 'N/A' || scoreVal === 'na' || scoreVal === 'NA' || scoreVal === 'Na' || sub?.is_na || sub?.score === 'N/A' || sub?.score === 'na' || sub?.score === 'NA') return true;
                                    return false;
                                };

                                const totalPointsMax = allHotelItems.reduce((sum, i) => {
                                    if (isItemNA(i)) return sum;
                                    return sum + (i.points ?? 5);
                                }, 0);
                                
                                const hotelSubs = Object.values(hotelSubmissions).filter((sub: any) => 
                                    allHotelItems.some(item => String(item.id) === String(sub.item_id))
                                );
                                const subCount = hotelSubs.length;

                                const categoriesWithItems = catList.filter(cat => {
                                    const catIdStr = String(cat.id);
                                    const matchesGroupCat = !assignedCategoryIds || assignedCategoryIds.length === 0 || assignedCategoryIds.includes(catIdStr);
                                    const matchesAuditorCat = !auditorAssignedCatIds || auditorAssignedCatIds.includes(catIdStr);
                                    const hasItems = allHotelItems.some(item => String(item.categoryId || '') === catIdStr);
                                    return matchesGroupCat && matchesAuditorCat && hasItems;
                                });

                                const displayedCategories = categoriesWithItems.filter(cat => 
                                    !selectedInspectionCategoryId || String(cat.id) === String(selectedInspectionCategoryId)
                                );

                                // Calculate assigned auditors for this hotel
                                const hotelAssignedAuditors = (auditorAssignments || [])
                                    .filter(a => String(a.hotel_id).trim() === String(hotel.id).trim())
                                    .map(a => {
                                        const uIdStr = String(a.user_id).trim().toLowerCase();
                                        if (userProfile && String(userProfile.id).trim().toLowerCase() === uIdStr) return userProfile;
                                        return (profilesList || []).find(p => String(p.id).trim().toLowerCase() === uIdStr);
                                    })
                                    .filter(Boolean);

                                const uniqueHotelAuditorsMap = new Map();
                                hotelAssignedAuditors.forEach(u => {
                                    if (u && u.id) uniqueHotelAuditorsMap.set(String(u.id).toLowerCase(), u);
                                });
                                const uniqueHotelAuditors = Array.from(uniqueHotelAuditorsMap.values());
                                const hotelAuditorDisplayNames = uniqueHotelAuditors.length > 0
                                    ? uniqueHotelAuditors.map(u => u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Auditor').join(', ')
                                    : (userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.display_name || userProfile.email : 'System Auditor');

                                return (
                                    <div className="flex flex-col gap-6 animate-fadeIn pb-24">
                                        {/* INSPECTION HEADER: PROPERTY & CONTEXT */}
                                        <div className="bg-slate-900 rounded-[32px] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                                            <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
                                            <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
                                            
                                            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-300 border border-white/5">
                                                            {hotel.code || 'AUDIT_ACTIVE'}
                                                        </span>
                                                        <span className="px-3 py-1 bg-amber-500/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-amber-400 border border-amber-500/20">
                                                            Inspection Mode
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h2 className="text-3xl font-black tracking-tight leading-none">{hotel.name}</h2>
                                                        <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest flex items-center gap-2 flex-wrap">
                                                            <span className="flex items-center gap-1">
                                                                <MapPin size={12} className="text-indigo-400" />
                                                                {hotel.location || 'Swiss-Belhotel Property'} • Luxury Standards
                                                            </span>
                                                            <span className="text-slate-600 font-normal select-none">|</span>
                                                            <span className="flex items-center gap-1.5 text-indigo-300">
                                                                <User size={12} className="text-indigo-400" />
                                                                Assigned Auditor: <strong className="font-extrabold text-white">{hotelAuditorDisplayNames}</strong>
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-3">
                                                    {categoriesWithItems.length > 0 && (
                                                        <div className="h-11 px-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all">
                                                            <Layers size={14} className="text-emerald-400 shrink-0" />
                                                            <select
                                                                value={selectedInspectionCategoryId}
                                                                onChange={(e) => setSelectedInspectionCategoryId(e.target.value)}
                                                                className="bg-transparent text-xs font-black text-white focus:outline-none cursor-pointer"
                                                            >
                                                                <option value="" className="bg-slate-900 text-white">All Assigned Categories ({categoriesWithItems.length})</option>
                                                                {categoriesWithItems.map(c => (
                                                                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                    {getHotelFinalizedInfo(hotel).is_finalized && (
                                                        <button 
                                                            onClick={() => handleUnlockHotel(hotel.id)}
                                                            className="h-11 px-5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-400 transition-all active:scale-95"
                                                            title={`Finalised by ${getHotelFinalizedInfo(hotel).finalized_by || 'Representative'} on ${getHotelFinalizedInfo(hotel).finalized_at ? new Date(getHotelFinalizedInfo(hotel).finalized_at!).toLocaleDateString() : ''}. Click to unlock.`}
                                                        >
                                                            <Unlock size={14} className="text-emerald-400" />
                                                            Unlock Audit
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={async () => {
                                                            await fetchHotelSubmissionsForAuditor();
                                                            setToastMessage("Data Sync Successful");
                                                            setTimeout(() => setToastMessage(null), 2000);
                                                        }}
                                                        className="h-11 px-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                                                    >
                                                        <RefreshCw size={14} className="text-indigo-400" />
                                                        Sync Submissions
                                                    </button>
                                                    <button 
                                                        onClick={() => { setSelectedInspectionHotelId(''); setSelectedInspectionCategoryId(''); }}
                                                        className="h-11 px-5 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                                                    >
                                                        <ArrowLeft size={14} />
                                                        Exit Audit
                                                    </button>
                                                </div>
                                            </div>

                                            {/* LIVE ANALYTICS HUD */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/5">
                                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scoring Progress</span>
                                                        <span className="text-xs font-black text-indigo-400">{Math.round((scoredItems.length / allHotelItems.length) * 100) || 0}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                                                            style={{ width: `${(scoredItems.length / allHotelItems.length) * 100 || 0}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-500 mt-2">{scoredItems.length} of {allHotelItems.length} criteria reviewed</p>
                                                </div>

                                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Hotel Submissions</span>
                                                    <div className="flex items-end gap-2">
                                                        <span className="text-2xl font-black text-blue-400 leading-none">{subCount}</span>
                                                        <span className="text-[10px] font-bold text-slate-500 pb-1">items received from property</span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-blue-500/60 mt-1 flex items-center gap-1">
                                                        <CheckCircle size={10} /> Live Linked Data
                                                    </p>
                                                </div>

                                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Live Score Calculation</span>
                                                    <div className="flex items-end gap-2">
                                                        <span className="text-2xl font-black text-emerald-400 leading-none">{totalPointsScored}</span>
                                                        <span className="text-[10px] font-bold text-slate-500 pb-1">/ {totalPointsMax} Points</span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-emerald-500/60 mt-1">Weighted average: {totalPointsMax > 0 ? ((totalPointsScored / totalPointsMax) * 100).toFixed(1) : 0}%</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* AUDIT WORKSPACE: CATEGORIES & CRITERIA */}
                                        <div className="space-y-6">
                                            {isUserAuditor && auditorAssignedCatIds && auditorAssignedCatIds.length === 0 && (
                                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-amber-200 text-xs font-semibold flex items-center gap-3">
                                                    <AlertCircle size={20} className="text-amber-400 shrink-0" />
                                                    <div>
                                                        <strong className="block text-amber-100 font-bold mb-0.5 text-sm">No Audit Categories Assigned</strong>
                                                        Your account is configured as an Auditor, but you have no checklist categories assigned for inspection yet. Please ask an Administrator to assign audit categories to your account in User Management.
                                                    </div>
                                                </div>
                                            )}

                                            {displayedCategories.map((cat, catIdx) => {
                                                const catItems = allHotelItems.filter(i => String(i.categoryId || '') === String(cat.id));
                                                const scoredInCat = catItems.filter(i => inspectionScores[`${hotel.id}_${i.id}`] !== undefined).length;
                                                const isCatComplete = scoredInCat === catItems.length;

                                                const catIdStr = String(cat.id).trim();
                                                const catAssignedAuditors = (auditorCategoryAssignments || [])
                                                    .filter(a => String(a.category_id).trim() === catIdStr)
                                                    .map(a => {
                                                        const uIdStr = String(a.user_id).trim().toLowerCase();
                                                        if (userProfile && String(userProfile.id).trim().toLowerCase() === uIdStr) return userProfile;
                                                        return (profilesList || []).find(p => String(p.id).trim().toLowerCase() === uIdStr);
                                                    })
                                                    .filter(Boolean);

                                                const catAuditorMap = new Map();
                                                catAssignedAuditors.forEach(u => {
                                                    if (u && u.id) catAuditorMap.set(String(u.id).toLowerCase(), u);
                                                });
                                                const uniqueCatAuditors = Array.from(catAuditorMap.values());
                                                const hasGlobalCatAssignments = (auditorCategoryAssignments || []).length > 0;
                                                const effectiveAuditors = uniqueCatAuditors.length > 0
                                                    ? uniqueCatAuditors
                                                    : (hasGlobalCatAssignments ? [] : uniqueHotelAuditors);
                                                const assignedAuditorName = effectiveAuditors.length > 0
                                                    ? effectiveAuditors.map(u => u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Auditor').join(', ')
                                                    : (hasGlobalCatAssignments ? 'Unassigned' : 'All Hotel Auditors');

                                                return (
                                                    <div key={cat.id} className="space-y-3">
                                                        {/* CATEGORY BAR */}
                                                        {(() => {
                                                            return (
                                                                <div className="sticky top-16 z-30 flex items-center justify-between p-3 sm:px-4 sm:py-2.5 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-xl shadow-xs">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-xs ${isCatComplete ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
                                                                            {catIdx + 1}
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <h3 className="text-sm font-black text-slate-800 tracking-tight leading-none">{cat.name}</h3>
                                                                                <span className="px-2 py-0.5 bg-indigo-50/80 text-indigo-700 border border-indigo-200/90 text-[9px] font-black rounded-md flex items-center gap-1 uppercase tracking-wider">
                                                                                    <User size={10} className="text-indigo-600 shrink-0" />
                                                                                    <span>Auditor: {assignedAuditorName}</span>
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                                                                {(() => {
                                                                                    const catApplicable = catItems.filter(i => !isItemNA(i));
                                                                                    const catMax = catApplicable.reduce((s, i) => s + (i.points ?? 5), 0);
                                                                                    const catActual = catApplicable.reduce((sum, item) => {
                                                                                        const sk1 = `${hotel.id}_${item.id}`;
                                                                                        const sk2 = hotel?.code ? `${hotel.code}_${item.id}` : '';
                                                                                        const scoreVal = inspectionScores[sk1] ?? (sk2 ? inspectionScores[sk2] : undefined) ?? inspectionScores[item.id];
                                                                                        const sub = hotelSubmissions[item.id];
                                                                                        const score = scoreVal ?? sub?.score;
                                                                                        const isPass = score === 'PASS' || score === 'pass' || (typeof score === 'number' && score > 0) || (!isNaN(Number(score)) && Number(score) > 0);
                                                                                        const numScore = typeof score === 'number' ? score : (score !== undefined && !isNaN(Number(score)) ? Number(score) : null);
                                                                                        if (isPass) return sum + (item.points ?? 5);
                                                                                        if (numScore !== null && numScore > 0 && score !== 'FAIL' && score !== 'fail') return sum + Math.min(numScore, item.points ?? 5);
                                                                                        return sum;
                                                                                    }, 0);
                                                                                    return `${catApplicable.length} Inspection Points (${catActual}/${catMax} PTS)`;
                                                                                })()}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 sm:gap-3">
                                                                        <div className="hidden sm:flex flex-col items-end mr-1">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(scoredInCat/catItems.length)*100}%` }} />
                                                                                </div>
                                                                                <span className="text-[9px] font-black text-slate-500">{Math.round((scoredInCat/catItems.length)*100)}%</span>
                                                                            </div>
                                                                        </div>
                                                                        <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${isCatComplete ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                                                            {scoredInCat} / {catItems.length} REVIEWED
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const isCatAllExpanded = catItems.length > 0 && catItems.every(i => expandedInspectionItems[i.id]);
                                                                                setExpandedInspectionItems(prev => {
                                                                                    const next = { ...prev };
                                                                                    if (isCatAllExpanded) {
                                                                                        catItems.forEach(i => { delete next[i.id]; });
                                                                                    } else {
                                                                                        catItems.forEach(i => { next[i.id] = true; });
                                                                                    }
                                                                                    return next;
                                                                                });
                                                                                if (!isCatAllExpanded) {
                                                                                    fetchFullCategorySubmissions(catItems.map(i => i.id));
                                                                                }
                                                                            }}
                                                                            className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-2xs"
                                                                            title="Expand or collapse all items in this category"
                                                                        >
                                                                            {catItems.length > 0 && catItems.every(i => expandedInspectionItems[i.id]) ? (
                                                                                <>
                                                                                    <ChevronUp size={12} className="text-slate-500" />
                                                                                    <span>Collapse All</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <ChevronDown size={12} className="text-indigo-600" />
                                                                                    <span>Expand All ({catItems.length})</span>
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                        {getHotelFinalizedInfo(hotel).is_finalized && (
                                                                            <button 
                                                                                onClick={() => handleUnlockHotel(hotel.id)}
                                                                                className="ml-2 inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                                                                                title="Unlock Audit for Re-submission"
                                                                            >
                                                                                <Unlock size={12} className="text-emerald-600" />
                                                                                Unlock Audit
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* INSPECTION CARDS */}
                                                        <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                                            {catItems.map((item) => {
                                                                const rawSubmission = hotelSubmissions[item.id];
                                                                const isSubForThisHotel = rawSubmission && (
                                                                    !rawSubmission.hotel_id ||
                                                                    isSubmissionForHotel(rawSubmission.hotel_id, hotel) ||
                                                                    String(rawSubmission.hotel_id).trim().toLowerCase() === String(hotel.id).trim().toLowerCase() ||
                                                                    (hotel.code && String(rawSubmission.hotel_id).trim().toLowerCase() === String(hotel.code).trim().toLowerCase())
                                                                );
                                                                const submission = isSubForThisHotel ? rawSubmission : undefined;
                                                                const scoreKeysToTry = [
                                                                    `${hotel.id}_${item.id}`,
                                                                    `${String(hotel.id).toLowerCase()}_${item.id}`,
                                                                    `${String(hotel.id).toUpperCase()}_${item.id}`,
                                                                    hotel?.code ? `${hotel.code}_${item.id}` : '',
                                                                    hotel?.code ? `${String(hotel.code).toLowerCase()}_${item.id}` : '',
                                                                    hotel?.code ? `${String(hotel.code).toUpperCase()}_${item.id}` : '',
                                                                    submission?.hotel_id ? `${submission.hotel_id}_${item.id}` : '',
                                                                    submission?.hotel_id ? `${String(submission.hotel_id).toLowerCase()}_${item.id}` : '',
                                                                    submission?.hotel_id ? `${String(submission.hotel_id).toUpperCase()}_${item.id}` : '',
                                                                    item.id
                                                                ].filter(Boolean);

                                                                let currentScore: any = undefined;
                                                                for (const k of scoreKeysToTry) {
                                                                    if (inspectionScores[k] !== undefined) {
                                                                        currentScore = inspectionScores[k];
                                                                        break;
                                                                    }
                                                                }

                                                                if (currentScore === undefined && submission) {
                                                                    if (submission.is_na === true || String(submission.is_na) === 'true') {
                                                                        currentScore = 'N/A';
                                                                    } else if (submission.score !== undefined && submission.score !== null) {
                                                                        currentScore = submission.score;
                                                                    }
                                                                }

                                                                let currentComment: string | undefined = undefined;
                                                                if (inspectionComments[item.id] !== undefined) {
                                                                    currentComment = inspectionComments[item.id];
                                                                } else {
                                                                    for (const k of scoreKeysToTry) {
                                                                        if (inspectionComments[k] !== undefined) {
                                                                            currentComment = inspectionComments[k];
                                                                            break;
                                                                        }
                                                                    }
                                                                }

                                                                if (currentComment === undefined && submission) {
                                                                    if (submission.auditor_notes !== undefined && submission.auditor_notes !== null) {
                                                                        currentComment = String(submission.auditor_notes);
                                                                    } else if (submission.auditor_remarks !== undefined && submission.auditor_remarks !== null) {
                                                                        currentComment = String(submission.auditor_remarks);
                                                                    }
                                                                }

                                                                const displayComment = currentComment !== undefined ? currentComment : '';

                                                                const isSavedToDb = !!submission && (submission.score !== undefined || submission.is_na === true || !!submission.auditor_notes || !!submission.auditor_remarks || !!submission.value);
                                                                const isSaving = savingInspectionItemId === item.id;

                                                                const hasSubmission = !!submission;
                                                                const itemMaxPoints = item.points ?? 5;
                                                                const isNA = currentScore !== undefined && (
                                                                    currentScore === 'N/A' || currentScore === 'na' || currentScore === 'NA' || currentScore === 'Na'
                                                                );
                                                                const isPass = !isNA && currentScore !== undefined && currentScore !== null && (
                                                                    currentScore === 'PASS' ||
                                                                    currentScore === 'pass' ||
                                                                    (typeof currentScore === 'number' && currentScore > 0) ||
                                                                    (!isNaN(Number(currentScore)) && Number(currentScore) > 0)
                                                                );
                                                                const isFail = !isNA && currentScore !== undefined && currentScore !== null && (
                                                                    currentScore === 'FAIL' ||
                                                                    currentScore === 'fail' ||
                                                                    currentScore === 0 ||
                                                                    currentScore === '0'
                                                                );
                                                                const isSelfAudit = item.filled_by_hotel !== false;

                                                                const rawAuditor = submission?.submitted_by_name || submission?.submitted_by || '';
                                                                const cleanAuditorName = rawAuditor.replace(/^Auditor:\s*/i, '').trim();
                                                                const auditAuthor = (cleanAuditorName && cleanAuditorName.toLowerCase() !== 'auditor')
                                                                    ? cleanAuditorName
                                                                    : (assignedAuditorName !== 'Unassigned' && assignedAuditorName !== 'All Hotel Auditors' ? assignedAuditorName : (userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email : 'Auditor'));
                                                                const auditTimestamp = safeFormatDateTime(submission?.updated_at || submission?.created_at);
                                                                const isItemExpanded = !!expandedInspectionItems[item.id];

                                                                return (
                                                                    <div 
                                                                        key={item.id} 
                                                                        className={`group bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                                                                            currentScore !== undefined 
                                                                                ? 'border-slate-200 shadow-2xs opacity-95 bg-slate-50/20' 
                                                                                : 'border-indigo-200 shadow-xs hover:shadow-md ring-2 ring-indigo-50/60'
                                                                        }`}
                                                                    >
                                                                        {!isItemExpanded ? (
                                                                            /* COMPACT LIST ROW VIEW */
                                                                            <div 
                                                                                onClick={() => {
                                                                                    setExpandedInspectionItems(prev => ({ ...prev, [item.id]: true }));
                                                                                    fetchFullItemSubmission(item.id);
                                                                                }}
                                                                                className="p-3.5 sm:px-4 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
                                                                            >
                                                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                                    {/* Score Status Badge */}
                                                                                    {isPass ? (
                                                                                        <span className="shrink-0 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                                                                                            <CheckCircle size={12} className="text-emerald-600" />
                                                                                            <span>PASS ({itemMaxPoints} PTS)</span>
                                                                                        </span>
                                                                                    ) : isFail ? (
                                                                                        <span className="shrink-0 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                                                                                            <X size={12} className="text-red-600" />
                                                                                            <span>FAIL (0 PTS)</span>
                                                                                        </span>
                                                                                    ) : isNA ? (
                                                                                        <span className="shrink-0 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                                                                                            <AlertCircle size={12} className="text-amber-600" />
                                                                                            <span>N/A (EXEMPT)</span>
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="shrink-0 px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1">
                                                                                            <Clock size={12} className="text-slate-400" />
                                                                                            <span>UNSCORED</span>
                                                                                        </span>
                                                                                    )}

                                                                                    <div className="min-w-0 flex-1">
                                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                                            <h4 className="text-sm font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors truncate">
                                                                                                {item.name}
                                                                                            </h4>
                                                                                            <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                                                {itemMaxPoints} Max
                                                                                            </span>
                                                                                            {isSavedToDb && (
                                                                                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                                                    <CheckCircle size={9} /> Saved to DB
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                                                                    {hasSubmission && (
                                                                                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg flex items-center gap-1">
                                                                                            {isImageInput(item.inputType) || (submission.value && String(submission.value).includes('http')) ? (
                                                                                                <>
                                                                                                    <Camera size={12} className="text-indigo-600" />
                                                                                                    <span>Evidence Photos</span>
                                                                                                </>
                                                                                            ) : submission.is_na ? (
                                                                                                <>
                                                                                                    <AlertCircle size={12} className="text-amber-600" />
                                                                                                    <span>Prop N/A</span>
                                                                                                </>
                                                                                            ) : item.inputType === 'document' ? (
                                                                                                <>
                                                                                                    <FileText size={12} className="text-indigo-600" />
                                                                                                    <span>Document</span>
                                                                                                </>
                                                                                            ) : (
                                                                                                <>
                                                                                                    <CheckCircle size={12} className="text-emerald-600" />
                                                                                                    <span>Submitted</span>
                                                                                                </>
                                                                                            )}
                                                                                        </span>
                                                                                    )}

                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setExpandedInspectionItems(prev => ({ ...prev, [item.id]: true }));
                                                                                            fetchFullItemSubmission(item.id);
                                                                                        }}
                                                                                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                                                                                    >
                                                                                        <Eye size={13} />
                                                                                        <span>Inspect & Score</span>
                                                                                        <ChevronDown size={13} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            /* EXPANDED INSPECTION MODAL / DRAWER VIEW */
                                                                            <div className="flex flex-col">
                                                                                {/* Expanded Top Bar */}
                                                                                <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-2 text-xs font-bold border-b border-slate-800">
                                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                                        <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-md font-black uppercase tracking-wider">
                                                                                            Inspecting Item
                                                                                        </span>
                                                                                        <span className="truncate text-slate-100 font-extrabold">{item.name}</span>
                                                                                    </div>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setExpandedInspectionItems(prev => ({ ...prev, [item.id]: false }))}
                                                                                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                                                                                    >
                                                                                        <ChevronUp size={13} />
                                                                                        <span>Collapse Item</span>
                                                                                    </button>
                                                                                </div>

                                                                                {loadingItemIds[item.id] && (
                                                                                    <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold text-indigo-700 animate-pulse">
                                                                                        <Loader2 size={14} className="animate-spin text-indigo-600" />
                                                                                        <span>Loading submission data & evidence photos from database...</span>
                                                                                    </div>
                                                                                )}

                                                                                <div className="flex flex-col lg:flex-row">
                                                                                    {/* LEFT SIDE: CRITERIA & HOTEL DATA */}
                                                                            <div className="flex-1 p-4 sm:p-5 space-y-3">
                                                                                <div className="space-y-1.5">
                                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                                        <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded-md uppercase tracking-wider">
                                                                                            {item.points ?? 5} Points Max
                                                                                        </span>

                                                                                        {/* DB SAVE STATUS BADGE */}
                                                                                        {recentlySavedItemId === item.id ? (
                                                                                            <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded-md uppercase tracking-wider flex items-center gap-1 animate-pulse shadow-xs">
                                                                                                <CheckCircle size={10} className="text-white stroke-[3] shrink-0" />
                                                                                                <span>Saved to DB!</span>
                                                                                            </span>
                                                                                        ) : isSavedToDb ? (
                                                                                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black rounded-md uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                                                                                                <CheckCircle size={10} className="text-emerald-600 shrink-0" />
                                                                                                <span>Saved in DB {hotel?.code ? `(${String(hotel.code).toUpperCase()})` : ''}</span>
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-black rounded-md uppercase tracking-wider flex items-center gap-1">
                                                                                                <Clock size={10} className="text-slate-400 shrink-0" />
                                                                                                <span>Unscored</span>
                                                                                            </span>
                                                                                        )}
                                                                                        {isSelfAudit ? (
                                                                                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider border ${hasSubmission ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                                                {hasSubmission ? 'Submission Received' : 'Awaiting for Property Submission.'}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider border ${hasSubmission ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                                                                                {hasSubmission ? `Audited by ${auditAuthor} - ${auditTimestamp}` : 'Required Auditor-Filled Item'}
                                                                                            </span>
                                                                                        )}
                                                                                        <span className="px-2 py-0.5 bg-indigo-50/90 text-indigo-800 border border-indigo-200/90 text-[9px] font-black rounded-md uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                                                                                            <User size={10} className="text-indigo-600 shrink-0" />
                                                                                            <span>Auditor: {assignedAuditorName}</span>
                                                                                        </span>
                                                                                    </div>
                                                                                    <h4 className="text-base font-black text-slate-800 leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">
                                                                                        {item.name}
                                                                                    </h4>
                                                                                    {item.description && (
                                                                                        <p className="text-xs text-slate-500 font-medium leading-snug">
                                                                                            {item.description}
                                                                                        </p>
                                                                                    )}
                                                                                </div>

                                                                                {/* SUBMISSION BENTO BOX OR AUDITOR EVIDENCE FORM */}
                                                                                {!isSelfAudit ? (
                                                                                    <AuditorEvidenceForm
                                                                                        item={item}
                                                                                        hotel={hotel}
                                                                                        submission={submission}
                                                                                        currentScore={currentScore}
                                                                                        currentComment={currentComment}
                                                                                        onSaved={async () => {
                                                                                            await fetchFullItemSubmission(item.id, true);
                                                                                            await fetchHotelSubmissionsForAuditor();
                                                                                        }}
                                                                                        userProfile={userProfile}
                                                                                    />
                                                                                ) : (
                                                                                    <div className={`rounded-xl border overflow-hidden transition-all ${
                                                                                        hasSubmission 
                                                                                            ? 'bg-slate-50/80 border-slate-200/80' 
                                                                                            : 'bg-amber-50/30 border-amber-100/60 border-dashed py-3'
                                                                                    }`}>
                                                                                        {hasSubmission ? (
                                                                                            <div className="p-3 sm:p-4 space-y-3">
                                                                                                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-bold">
                                                                                                    <div className="flex items-center gap-1.5">
                                                                                                        <div className={`w-2 h-2 rounded-full ${submission._is_demo ? 'bg-amber-500' : 'bg-blue-500 animate-pulse'}`} />
                                                                                                        <span className="font-black text-slate-600 uppercase tracking-wider text-[9px]">
                                                                                                            {submission._is_demo ? 'Demo Pool Evidence' : 'Property Evidence'}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <span className="text-slate-400 text-[10px]">Submitted by <strong className="text-slate-700 font-bold">{getSubmitterName(submission, hotel)}</strong> • {safeFormatDateTime(submission.created_at)}</span>
                                                                                                </div>

                                                                                                {submission.is_na ? (
                                                                                                    <div className="bg-amber-100/50 p-3 rounded-xl border border-amber-200 flex items-start gap-2.5">
                                                                                                        <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                                                                                        <div>
                                                                                                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-tight">Marked as N/A by Property</p>
                                                                                                            <p className="text-xs text-amber-700 mt-0.5 font-medium">{submission.na_reason || submission.notes || "No reason provided."}</p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                     <div className="space-y-3">
                                                                                                        {/* Rich Evidence with Media & Link Previews */}
                                                                                                        {submission.value && (
                                                                                                            <EvidenceMediaViewer 
                                                                                                                rawEvidence={submission.value}
                                                                                                                itemName={item.name}
                                                                                                                hotelName={hotel.name}
                                                                                                                onEnlarge={(u) => setEnlargedImage({ url: u, title: item.name })}
                                                                                                            />
                                                                                                        )}

                                                                                                         {/* Document Evidence */}
                                                                                                        {item.inputType === 'document' && submission.value && (
                                                                                                            <div onClick={() => handleDocumentDownload(submission.value, item.name)} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-xs transition-all group/doc cursor-pointer">
                                                                                                                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover/doc:bg-indigo-600 group-hover/doc:text-white transition-colors shrink-0">
                                                                                                                    <FileText size={20} />
                                                                                                                </div>
                                                                                                                <div className="flex-1 min-w-0">
                                                                                                                    <p className="text-xs font-black text-slate-800 truncate">Inspection Document</p>
                                                                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Click Card to Download / Open Document</p>
                                                                                                                </div>
                                                                                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleCopyDocLink(submission.value, submission.id || item.id); }} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 z-10 cursor-pointer">{copiedDocId === (submission.id || item.id) ? 'Copied!' : 'Copy Link'}</button>
                                                                                                            </div>
                                                                                                        )}

                                                                                                        {/* Text/Numeric/Check Evidence */}
                                                                                                        {['text', 'numeric', 'checkbox'].includes(item.inputType) && (
                                                                                                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                                                                                                                <div>
                                                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Submitted Value</span>
                                                                                                                    <p className="text-base font-black text-slate-900 leading-none">
                                                                                                                        {item.inputType === 'checkbox' 
                                                                                                                            ? (String(submission.value).toLowerCase() === 'true' ? 'YES / COMPLIANT' : 'NO / NON-COMPLIANT')
                                                                                                                            : (submission.value || 'N/A')}
                                                                                                                    </p>
                                                                                                                </div>
                                                                                                                {item.inputType === 'numeric' && item.min_value !== undefined && (
                                                                                                                    <div className="text-right">
                                                                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Min. Required</span>
                                                                                                                        <p className="text-sm font-black text-indigo-600 leading-none">{item.min_value}</p>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )}

                                                                                                        {/* Hotel Remarks / Notes */}
                                                                                                        {(submission.notes || submission.na_reason || submission.remark || submission.comments) && (
                                                                                                            <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100/80 border-l-4 border-l-indigo-500">
                                                                                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider block mb-0.5">Hotel Remarks & Notes</span>
                                                                                                                <p className="text-xs text-slate-700 font-medium leading-relaxed italic">"{submission.notes || submission.na_reason || submission.remark || submission.comments}"</p>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="flex items-center justify-center text-center px-4 py-2 gap-2">
                                                                                                <Clock size={14} className="text-amber-500 shrink-0" />
                                                                                                <span className="text-xs font-black text-amber-800 tracking-tight">Awaiting for Property Submission.</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                                                                                   {/* RIGHT SIDE: AUDITOR CONTROLS */}
                                                                            <div className="lg:w-72 lg:shrink-0 bg-slate-50/70 border-t lg:border-t-0 lg:border-l border-slate-200/80 p-4 flex flex-col justify-between gap-3">
                                                                                <div className="space-y-4">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Auditor Status</label>
                                                                                        <div className="flex items-baseline gap-1">
                                                                                            <span className={`text-xl font-black ${
                                                                                                currentScore !== undefined 
                                                                                                    ? (isPass ? 'text-emerald-600' : isFail ? 'text-red-600' : isNA ? 'text-amber-600' : 'text-slate-900') 
                                                                                                    : 'text-slate-300'
                                                                                            }`}>
                                                                                                {currentScore !== undefined ? (isPass ? 'PASS' : isFail ? 'FAIL' : isNA ? 'N/A' : currentScore) : '—'}
                                                                                            </span>
                                                                                            <span className="text-[10px] font-black text-slate-400">({item.points ?? 5} PTS)</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* PASS / FAIL / N/A CONTROLS */}
                                                                                    <div className="space-y-2">
                                                                                        <div className="grid grid-cols-3 gap-2">
                                                                                            <button
                                                                                                type="button"
                                                                                                id={`btn-pass-${item.id}`}
                                                                                                onClick={() => {
                                                                                                    if (isPass) {
                                                                                                        saveInspectionScore(hotel.id, item.id, undefined);
                                                                                                    } else {
                                                                                                        saveInspectionScore(hotel.id, item.id, itemMaxPoints > 0 ? itemMaxPoints : 'PASS');
                                                                                                    }
                                                                                                }}
                                                                                                className={`py-2.5 px-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                                                                                                    isPass
                                                                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm shadow-emerald-100'
                                                                                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 hover:border-emerald-400'
                                                                                                }`}
                                                                                            >
                                                                                                <span className="text-xs">Pass</span>
                                                                                                <span className={`text-[9px] font-bold ${isPass ? 'text-emerald-100' : 'text-emerald-600'}`}>
                                                                                                    +{itemMaxPoints} pts
                                                                                                </span>
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                id={`btn-fail-${item.id}`}
                                                                                                onClick={() => {
                                                                                                    if (isFail) {
                                                                                                        saveInspectionScore(hotel.id, item.id, undefined);
                                                                                                    } else {
                                                                                                        saveInspectionScore(hotel.id, item.id, itemMaxPoints > 0 ? 0 : 'FAIL');
                                                                                                    }
                                                                                                }}
                                                                                                className={`py-2.5 px-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                                                                                                    isFail
                                                                                                        ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-sm shadow-red-100'
                                                                                                        : 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200 hover:border-red-400'
                                                                                                }`}
                                                                                            >
                                                                                                <span className="text-xs">Fail</span>
                                                                                                <span className={`text-[9px] font-bold ${isFail ? 'text-red-100' : 'text-red-600'}`}>
                                                                                                    0 pts
                                                                                                </span>
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                id={`btn-na-${item.id}`}
                                                                                                onClick={() => {
                                                                                                    if (isNA) {
                                                                                                        saveInspectionScore(hotel.id, item.id, undefined);
                                                                                                    } else {
                                                                                                        saveInspectionScore(hotel.id, item.id, 'N/A');
                                                                                                    }
                                                                                                }}
                                                                                                className={`py-2.5 px-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                                                                                                    isNA
                                                                                                        ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-sm shadow-amber-100 ring-2 ring-amber-500 ring-offset-2'
                                                                                                        : (submission?.is_na && !isPass && !isFail)
                                                                                                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 hover:border-amber-400 animate-pulse'
                                                                                                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 hover:border-amber-400'
                                                                                                }`}
                                                                                            >
                                                                                                <span className="text-xs">{submission?.is_na ? 'Approve N/A' : 'N/A'}</span>
                                                                                                <span className={`text-[9px] font-bold ${isNA ? 'text-amber-100' : 'text-amber-600'}`}>
                                                                                                    Exempt
                                                                                                </span>
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="space-y-1">
                                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">AUDITOR NOTES/REMARKS</label>
                                                                                        <textarea 
                                                                                            value={displayComment}
                                                                                            onChange={(e) => saveInspectionComment(hotel.id, item.id, e.target.value)}
                                                                                            placeholder="Describe non-compliance or specific findings..."
                                                                                            className="w-full h-20 bg-white border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl p-2.5 text-xs text-slate-700 outline-none transition-all resize-none placeholder:text-slate-300"
                                                                                        />
                                                                                    </div>

                                                                                    {/* DB SAVE STATUS & BUTTON (Only rendered for hotel-submitted items where AuditorEvidenceForm is not shown) */}
                                                                                    {isSelfAudit && (
                                                                                        <div className="pt-2 flex flex-col gap-1.5">
                                                                                            {isSaving ? (
                                                                                                <div className="w-full py-2.5 px-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-default animate-pulse">
                                                                                                    <Loader2 size={15} className="animate-spin text-indigo-600" />
                                                                                                    <span>Saving to Supabase DB...</span>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <>
                                                                                                    {(currentScore !== undefined || (currentComment || '').trim() !== '') ? (
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            id={`btn-save-db-${item.id}`}
                                                                                                            onClick={async () => {
                                                                                                                await commitInspectionToDatabase(hotel, item.id);
                                                                                                                await fetchHotelSubmissionsForAuditor();
                                                                                                            }}
                                                                                                            className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-indigo-100 transition-all cursor-pointer"
                                                                                                        >
                                                                                                            <UploadCloud size={15} />
                                                                                                            <span>Save Audit to DB</span>
                                                                                                        </button>
                                                                                                    ) : (
                                                                                                        <div className="w-full py-2 px-3 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
                                                                                                            <Clock size={14} className="text-slate-400" />
                                                                                                            <span>Unscored - Select Pass/Fail/NA</span>
                                                                                                        </div>
                                                                                                    )}

                                                                                                    {recentlySavedItemId === item.id ? (
                                                                                                        <div className="w-full py-2 px-3 bg-emerald-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm animate-pulse">
                                                                                                            <CheckCircle size={15} className="text-white stroke-[3]" />
                                                                                                            <span>Saved to DB! (Hotel: {String(hotel?.code || hotel?.id || '').toUpperCase()})</span>
                                                                                                        </div>
                                                                                                    ) : isSavedToDb ? (
                                                                                                        <div className="w-full py-1.5 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-2xs cursor-default">
                                                                                                            <CheckCircle size={13} className="text-emerald-600" />
                                                                                                            <span>Saved in DB {hotel?.code ? `(${String(hotel.code).toUpperCase()})` : ''}</span>
                                                                                                        </div>
                                                                                                    ) : null}
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            </div>

                                                                            {/* Bottom Collapse Bar */}
                                                                            <div className="bg-slate-50 border-t border-slate-200/80 px-4 py-2 flex items-center justify-between text-xs">
                                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                                    Item ID: {item.id} — Max Points: {itemMaxPoints}
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setExpandedInspectionItems(prev => ({ ...prev, [item.id]: false }))}
                                                                                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                                                                >
                                                                                    <ChevronUp size={12} />
                                                                                    <span>Close Inspection View</span>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* FINALIZE FOOTER */}
                                        <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-8 border border-white/5">
                                            <div className="flex items-center gap-5">
                                                <div className="w-16 h-16 rounded-[22px] bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                                    <ShieldCheck size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black tracking-tight">Finalize Internal Brand Audit</h3>
                                                    <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest">
                                                        Property: {hotel.name} • Total Scored: {scoredItems.length}/{allHotelItems.length} Items
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                                {(() => {
                                                    const isFullyScored = allHotelItems.length > 0 && scoredItems.length === allHotelItems.length;
                                                    const scoringProgressPct = allHotelItems.length > 0 ? Math.round((scoredItems.length / allHotelItems.length) * 100) : 0;
                                                    return (
                                                        <React.Fragment>
                                                            {!isFullyScored && (
                                                                <div className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-2xl flex items-center gap-2">
                                                                    <AlertCircle size={15} className="shrink-0 text-amber-400" />
                                                                    <span>Scoring progress must be 100% to submit ({scoredItems.length}/{allHotelItems.length} scored)</span>
                                                                </div>
                                                            )}
                                                            <button 
                                                                disabled={!isFullyScored}
                                                                onClick={() => {
                                                                    if (!isFullyScored) return;
                                                                    setToastMessage("Audit Finalized Successfully!");
                                                                    setTimeout(() => setToastMessage(null), 3000);
                                                                    setSelectedInspectionHotelId('');
                                                                    setSelectedInspectionCategoryId('');
                                                                }}
                                                                className={`h-16 px-10 rounded-[22px] font-black text-sm uppercase tracking-widest transition-all outline-none flex items-center gap-3 group ${
                                                                    isFullyScored
                                                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 active:scale-95 cursor-pointer'
                                                                        : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60 shadow-none'
                                                                }`}
                                                                title={!isFullyScored ? `Scoring progress is ${scoringProgressPct}%. All items must be scored to submit full report.` : "Submit Full Report"}
                                                            >
                                                                <FileCheck size={20} className={isFullyScored ? "group-hover:scale-110 transition-transform text-white" : "text-slate-500"} />
                                                                Submit Full Report
                                                            </button>
                                                        </React.Fragment>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                            </React.Fragment>
                        )}
                    </div>
    );
};
