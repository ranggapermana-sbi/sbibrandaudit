import React from 'react';
import { AuditCategory, AuditItem, Department } from '../../types';
import { Hotel } from '../../types';
import { ArrowLeft, Building, Check, CheckCircle2, ChevronDown, ChevronRight, Database, Layers, MapPin, Plus, Search, Users, X } from 'lucide-react';


// Moved out of AdminPanelScreen (sub-view 'auditor_assignment'). Values are passed in from the admin screen.
export interface AuditorAssignmentViewProps {
    onBackToDashboard: () => void;
    assignmentTab: "hotels" | "categories";
    auditorAssignments: any[];
    auditorCategoryAssignments: any[];
    catList: AuditCategory[];
    categoryAssignmentSearch: string;
    categoryDeptFilter: string;
    departments: Department[];
    expandedCountries: Record<string, boolean>;
    groupByCountry: boolean;
    groupByDept: boolean;
    handleAssignAllCategories: (auditorId: string) => Promise<void>;
    handleAssignAllHotels: (auditorId: string, targetHotels?: any[]) => Promise<void>;
    handleAssignDepartmentCategories: (auditorId: string, departmentId: string, assign: boolean) => Promise<void>;
    handleBatchAssignCategories: (auditorId: string, categoryIds: string[], assign: boolean) => Promise<void>;
    handleBatchAssignHotels: (auditorId: string, hotelIds: string[], assign: boolean) => Promise<void>;
    handleClearAllCategories: (auditorId: string) => Promise<void>;
    handleClearAllHotels: (auditorId: string) => Promise<void>;
    handleToggleCategoryAssignment: (auditorId: string, categoryId: string) => Promise<void>;
    hotelAssignmentSearch: string;
    hotelCountryFilter: string;
    hotels: Hotel[];
    includedHotels: Hotel[];
    items: AuditItem[];
    profilesList: any[];
    selectedAuditorId: string;
    selectedCategoryBatchIds: Set<string>;
    setAssignmentTab: React.Dispatch<React.SetStateAction<"hotels" | "categories">>;
    setCategoryAssignmentSearch: React.Dispatch<React.SetStateAction<string>>;
    setCategoryDeptFilter: React.Dispatch<React.SetStateAction<string>>;
    setExpandedCountries: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    setGroupByCountry: React.Dispatch<React.SetStateAction<boolean>>;
    setGroupByDept: React.Dispatch<React.SetStateAction<boolean>>;
    setHotelAssignmentSearch: React.Dispatch<React.SetStateAction<string>>;
    setHotelCountryFilter: React.Dispatch<React.SetStateAction<string>>;
    setSelectedAuditorId: React.Dispatch<React.SetStateAction<string>>;
    setSelectedCategoryBatchIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setShowSqlModal: React.Dispatch<React.SetStateAction<boolean>>;
    setSubView: React.Dispatch<React.SetStateAction<"dashboard" | "departments" | "hotels" | "batches" | "categories" | "items" | "groups" | "users" | "access" | "inspection" | "inspection_v2" | "auditor_assignment" | "progress_report" | "audit_results">>;
}

export const AuditorAssignmentView: React.FC<AuditorAssignmentViewProps> = (props) => {
    const { assignmentTab, auditorAssignments, auditorCategoryAssignments, catList, categoryAssignmentSearch, categoryDeptFilter, departments, expandedCountries, groupByCountry, groupByDept, handleAssignAllCategories, handleAssignAllHotels, handleAssignDepartmentCategories, handleBatchAssignCategories, handleBatchAssignHotels, handleClearAllCategories, handleClearAllHotels, handleToggleCategoryAssignment, hotelAssignmentSearch, hotelCountryFilter, hotels, includedHotels, items, profilesList, selectedAuditorId, selectedCategoryBatchIds, setAssignmentTab, setCategoryAssignmentSearch, setCategoryDeptFilter, setExpandedCountries, setGroupByCountry, setGroupByDept, setHotelAssignmentSearch, setHotelCountryFilter, setSelectedAuditorId, setSelectedCategoryBatchIds, setShowSqlModal, setSubView, onBackToDashboard } = props;
    return (
                    <div className="space-y-6 animate-fadeIn">
                        {/* HEADER & CONTROLS */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { setSubView('dashboard'); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-slate-100 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Auditor Assignment</h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    Assign specific hotels and audit categories to auditors for targeted scope auditing.
                                </p>
                            </div>

                            <button 
                                onClick={() => setShowSqlModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 shrink-0"
                            >
                                <Database size={14} className="text-emerald-400" />
                                <span>Supabase SQL Migration</span>
                            </button>
                        </div>

                        {/* MAIN AUDITOR ASSIGNMENT GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* LEFT COLUMN: AUDITOR SELECTOR */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs col-span-1 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                        <Users size={16} className="text-indigo-600" />
                                        <span>Auditors</span>
                                    </h3>
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                        {profilesList.filter(p => p.access_level === 'auditor').length} Active
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {profilesList.filter(p => p.access_level === 'auditor').length === 0 ? (
                                        <div className="text-center py-8 text-xs font-bold text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                            No auditors found in profile directory.
                                        </div>
                                    ) : (
                                        profilesList.filter(p => p.access_level === 'auditor' || p.role === 'auditor').map(auditor => {
                                            const auditorIdStr = String(auditor.id).trim().toLowerCase();
                                            const assignedHotelsCount = auditorAssignments.filter(a => String(a.user_id).trim().toLowerCase() === auditorIdStr).length;
                                            const assignedCatsCount = auditorCategoryAssignments.filter(a => String(a.user_id).trim().toLowerCase() === auditorIdStr).length;
                                            const isSelected = selectedAuditorId === auditor.id;

                                            return (
                                                <button 
                                                    key={auditor.id}
                                                    onClick={() => setSelectedAuditorId(auditor.id)}
                                                    className={`w-full text-left p-3.5 rounded-xl transition-all border ${
                                                        isSelected 
                                                            ? 'bg-indigo-50/90 border-indigo-200 text-indigo-900 shadow-2xs' 
                                                            : 'bg-white border-slate-100 hover:bg-slate-50/80 text-slate-700'
                                                    }`}
                                                >
                                                    <div className="font-bold text-sm text-slate-800">
                                                        {auditor.display_name || `${auditor.first_name} ${auditor.last_name}`}
                                                    </div>
                                                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
                                                        {auditor.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                                            assignedHotelsCount > 0 ? 'bg-indigo-100/70 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                                        }`}>
                                                            {assignedHotelsCount} {assignedHotelsCount === 1 ? 'Hotel' : 'Hotels'}
                                                        </span>
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                                            assignedCatsCount > 0 ? 'bg-emerald-100/70 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                                        }`}>
                                                            {assignedCatsCount} {assignedCatsCount === 1 ? 'Category' : 'Categories'}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* RIGHT COLUMN: ASSIGNMENT PANELS (HOTELS & CATEGORIES TABS) */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 space-y-6">
                                {/* TABS HEADER */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl">
                                        <button
                                            onClick={() => setAssignmentTab('hotels')}
                                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
                                                assignmentTab === 'hotels'
                                                    ? 'bg-white text-indigo-700 shadow-2xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <Building size={14} />
                                            <span>Assigned Hotels</span>
                                            {selectedAuditorId && (
                                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded-md font-bold">
                                                    {auditorAssignments.filter(a => String(a.user_id).trim().toLowerCase() === String(selectedAuditorId).trim().toLowerCase()).length}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setAssignmentTab('categories')}
                                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
                                                assignmentTab === 'categories'
                                                    ? 'bg-white text-indigo-700 shadow-2xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <Layers size={14} />
                                            <span>Assigned Categories</span>
                                            {selectedAuditorId && (
                                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded-md font-bold">
                                                    {auditorCategoryAssignments.filter(a => String(a.user_id).trim().toLowerCase() === String(selectedAuditorId).trim().toLowerCase()).length}
                                                </span>
                                            )}
                                        </button>
                                    </div>

                                    {selectedAuditorId && assignmentTab === 'hotels' && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    const filtered = includedHotels.filter(h => {
                                                        if (!hotelAssignmentSearch) return true;
                                                        const term = hotelAssignmentSearch.toLowerCase();
                                                        return (
                                                            h.name.toLowerCase().includes(term) ||
                                                            (h.code && h.code.toLowerCase().includes(term)) ||
                                                            (h.brandClass && h.brandClass.toLowerCase().includes(term)) ||
                                                            (h.region && h.region.toLowerCase().includes(term))
                                                        );
                                                    });
                                                    handleAssignAllHotels(selectedAuditorId, filtered);
                                                }}
                                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-lg transition-all border border-indigo-200 active:scale-95 flex items-center gap-1 cursor-pointer"
                                            >
                                                <CheckCircle2 size={12} />
                                                <span>Assign All</span>
                                            </button>
                                            <button
                                                onClick={() => handleClearAllHotels(selectedAuditorId)}
                                                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-extrabold rounded-lg transition-all border border-slate-200 active:scale-95 flex items-center gap-1 cursor-pointer"
                                            >
                                                <X size={12} />
                                                <span>Clear All</span>
                                            </button>
                                        </div>
                                    )}

                                    {selectedAuditorId && assignmentTab === 'categories' && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleAssignAllCategories(selectedAuditorId)}
                                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-extrabold rounded-lg transition-all border border-emerald-200 active:scale-95"
                                            >
                                                Assign All
                                            </button>
                                            <button
                                                onClick={() => handleClearAllCategories(selectedAuditorId)}
                                                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-extrabold rounded-lg transition-all border border-slate-200 active:scale-95"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {selectedAuditorId ? (
                                    <div>
                                        {/* TAB 1: HOTEL ASSIGNMENTS */}
                                        {assignmentTab === 'hotels' && (
                                            <div className="space-y-4">
                                                {/* AUDITOR ASSIGNED HOTELS SCOPE SUMMARY BANNER */}
                                                {(() => {
                                                    const selectedAuditor = profilesList.find(p => String(p.id).trim().toLowerCase() === String(selectedAuditorId).trim().toLowerCase());
                                                    const assignedHotelIds = auditorAssignments
                                                        .filter(a => String(a.user_id).trim().toLowerCase() === String(selectedAuditorId).trim().toLowerCase())
                                                        .map(a => a.hotel_id);
                                                    const assignedCount = assignedHotelIds.length;
                                                    const totalCount = hotels.length;
                                                    const coveragePct = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0;

                                                    return (
                                                        <div className="bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-slate-50 border border-indigo-200/80 rounded-xl p-4 space-y-2.5">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                <div>
                                                                    <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                                                                        <Building size={15} className="text-indigo-600" />
                                                                        <span>Hotel Scope for <strong className="text-indigo-800">{selectedAuditor?.display_name || 'Selected Auditor'}</strong></span>
                                                                    </div>
                                                                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                                                        {assignedCount} of {totalCount} properties assigned to this auditor
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    <span className="text-xs font-black text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                                                                        {coveragePct}% Assigned
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Progress bar */}
                                                            <div className="w-full h-1.5 bg-indigo-100/60 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                                                                    style={{ width: `${coveragePct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* HOTEL SEARCH, COUNTRY FILTER & GROUPING CONTROLS */}
                                                <div className="space-y-3">
                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                                                        {/* SEARCH INPUT */}
                                                        <div className="relative flex-1">
                                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search properties by name, code, brand, country, or region..."
                                                                value={hotelAssignmentSearch}
                                                                onChange={(e) => setHotelAssignmentSearch(e.target.value)}
                                                                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                                                            />
                                                            {hotelAssignmentSearch && (
                                                                <button 
                                                                    onClick={() => setHotelAssignmentSearch('')}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* COUNTRY FILTER DROPDOWN */}
                                                        {(() => {
                                                            const availableCountries = Array.from(new Set(includedHotels.map(h => h.country || 'Unspecified Country'))).sort();
                                                            return (
                                                                <select
                                                                    value={hotelCountryFilter}
                                                                    onChange={(e) => setHotelCountryFilter(e.target.value)}
                                                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all shrink-0 cursor-pointer"
                                                                >
                                                                    <option value="all">All Countries ({availableCountries.length})</option>
                                                                    {availableCountries.map(c => {
                                                                        const count = includedHotels.filter(h => (h.country || 'Unspecified Country') === c).length;
                                                                        return (
                                                                            <option key={c} value={c}>{c} ({count})</option>
                                                                        );
                                                                    })}
                                                                </select>
                                                            );
                                                        })()}

                                                        {/* GROUP BY COUNTRY TOGGLE */}
                                                        <button
                                                            onClick={() => setGroupByCountry(!groupByCountry)}
                                                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                                                groupByCountry 
                                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                            title="Toggle grouping hotels by country"
                                                        >
                                                            <MapPin size={13} />
                                                            <span>{groupByCountry ? 'Grouped by Country' : 'Flat View'}</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* HOTEL LIST / ACCORDION DISPLAY */}
                                                {(() => {
                                                    const filteredHotels = includedHotels.filter(hotel => {
                                                        const hotelCountry = hotel.country || 'Unspecified Country';
                                                        if (hotelCountryFilter !== 'all' && hotelCountry !== hotelCountryFilter) return false;
                                                        if (!hotelAssignmentSearch) return true;
                                                        const term = hotelAssignmentSearch.toLowerCase();
                                                        return (
                                                            hotel.name.toLowerCase().includes(term) ||
                                                            (hotel.code && hotel.code.toLowerCase().includes(term)) ||
                                                            (hotel.brandClass && hotel.brandClass.toLowerCase().includes(term)) ||
                                                            (hotel.region && hotel.region.toLowerCase().includes(term)) ||
                                                            hotelCountry.toLowerCase().includes(term)
                                                        );
                                                    });

                                                    if (filteredHotels.length === 0) {
                                                        return (
                                                            <div className="text-center py-12 text-slate-400 font-bold text-xs border border-dashed border-slate-200 rounded-xl">
                                                                No properties match your search / country filter.
                                                            </div>
                                                        );
                                                    }

                                                    if (groupByCountry) {
                                                        const countryGroupsMap = new Map<string, typeof hotels>();
                                                        filteredHotels.forEach(hotel => {
                                                            const cName = hotel.country || 'Unspecified Country';
                                                            if (!countryGroupsMap.has(cName)) {
                                                                countryGroupsMap.set(cName, []);
                                                            }
                                                            countryGroupsMap.get(cName)!.push(hotel);
                                                        });

                                                        const sortedCountries = Array.from(countryGroupsMap.keys()).sort();

                                                        return (
                                                            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                                                                {sortedCountries.map(countryName => {
                                                                    const countryHotels = countryGroupsMap.get(countryName)!;
                                                                    const countryHotelIds = countryHotels.map(h => h.id);
                                                                    const selectedAuditorIdStr = String(selectedAuditorId).trim().toLowerCase();

                                                                    const assignedInCountryCount = countryHotels.filter(h => 
                                                                        auditorAssignments.some(a => String(a.user_id).trim().toLowerCase() === selectedAuditorIdStr && String(a.hotel_id).trim() === String(h.id).trim())
                                                                    ).length;

                                                                    const allInCountryAssigned = assignedInCountryCount === countryHotels.length;
                                                                    const isExpanded = hotelAssignmentSearch.trim().length > 0 ? true : (expandedCountries[countryName] ?? true);

                                                                    return (
                                                                        <div key={countryName} className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3.5 space-y-3">
                                                                            {/* ACCORDION HEADER */}
                                                                            <div 
                                                                                onClick={() => {
                                                                                    setExpandedCountries(prev => ({
                                                                                        ...prev,
                                                                                        [countryName]: !isExpanded
                                                                                    }));
                                                                                }}
                                                                                className="flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none pb-1"
                                                                            >
                                                                                <div className="flex items-center gap-2.5">
                                                                                    <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                                                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                                    </button>
                                                                                    <div className="p-1.5 bg-indigo-100/70 text-indigo-700 rounded-lg">
                                                                                        <MapPin size={14} />
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-xs sm:text-sm font-extrabold text-slate-800">{countryName}</span>
                                                                                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[10px] font-extrabold rounded-md">
                                                                                                {assignedInCountryCount} / {countryHotels.length} assigned
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* COUNTRY LEVEL BATCH ASSIGN / UNASSIGN BUTTON */}
                                                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            handleBatchAssignHotels(selectedAuditorId, countryHotelIds, !allInCountryAssigned);
                                                                                        }}
                                                                                        className={`px-3 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
                                                                                            allInCountryAssigned
                                                                                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                                                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-500/20'
                                                                                        }`}
                                                                                    >
                                                                                        {allInCountryAssigned ? (
                                                                                            <>
                                                                                                <X size={12} />
                                                                                                <span>Unassign All ({countryHotels.length})</span>
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <CheckCircle2 size={12} />
                                                                                                <span>Assign All ({countryHotels.length})</span>
                                                                                            </>
                                                                                        )}
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            {/* ACCORDION CONTENT: HOTELS IN COUNTRY */}
                                                                            {isExpanded && (
                                                                                <div className="space-y-2 pt-1 border-t border-slate-200/60">
                                                                                    {countryHotels.map(hotel => {
                                                                                        const hotelIdStr = String(hotel.id).trim();
                                                                                        const isAssignedToSelected = auditorAssignments.some(
                                                                                            a => String(a.user_id).trim().toLowerCase() === selectedAuditorIdStr && String(a.hotel_id).trim() === hotelIdStr
                                                                                        );
                                                                                        const totalAssignedAuditors = auditorAssignments.filter(
                                                                                            a => String(a.hotel_id).trim() === hotelIdStr
                                                                                        ).length;

                                                                                        return (
                                                                                            <div 
                                                                                                key={hotel.id} 
                                                                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                                                                                    isAssignedToSelected
                                                                                                        ? 'bg-indigo-50/60 border-indigo-200 shadow-2xs'
                                                                                                        : 'bg-white hover:bg-slate-100/60 border-slate-200/70'
                                                                                                }`}
                                                                                            >
                                                                                                <div className="space-y-1 pr-2">
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <span className="text-xs sm:text-sm font-bold text-slate-800">{hotel.name}</span>
                                                                                                        {hotel.code && (
                                                                                                            <span className="px-1.5 py-0.5 bg-slate-200/70 text-slate-700 text-[9px] font-black rounded uppercase">
                                                                                                                {hotel.code}
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                                                                        <span>{hotel.brandClass} • {hotel.region || 'Region Unspecified'}</span>
                                                                                                        {totalAssignedAuditors > 0 && (
                                                                                                            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold normal-case">
                                                                                                                Assigned to {totalAssignedAuditors} {totalAssignedAuditors === 1 ? 'auditor' : 'auditors'}
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                                <button 
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        handleBatchAssignHotels(selectedAuditorId, [hotel.id], !isAssignedToSelected);
                                                                                                    }}
                                                                                                    className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                                                                                                        isAssignedToSelected 
                                                                                                            ? 'bg-indigo-600 text-white shadow-2xs hover:bg-indigo-700 ring-2 ring-indigo-500/20' 
                                                                                                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                                                                                                    }`}
                                                                                                >
                                                                                                    {isAssignedToSelected ? (
                                                                                                        <>
                                                                                                            <CheckCircle2 size={13} />
                                                                                                            <span>Assigned</span>
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        <>
                                                                                                            <Plus size={13} />
                                                                                                            <span>Assign</span>
                                                                                                        </>
                                                                                                    )}
                                                                                                </button>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    }

                                                    // Flat View
                                                    return (
                                                        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                                                            {filteredHotels.map(hotel => {
                                                                const selectedAuditorIdStr = String(selectedAuditorId).trim().toLowerCase();
                                                                const hotelIdStr = String(hotel.id).trim();
                                                                const isAssignedToSelected = auditorAssignments.some(
                                                                    a => String(a.user_id).trim().toLowerCase() === selectedAuditorIdStr && String(a.hotel_id).trim() === hotelIdStr
                                                                );
                                                                const totalAssignedAuditors = auditorAssignments.filter(
                                                                    a => String(a.hotel_id).trim() === hotelIdStr
                                                                ).length;

                                                                return (
                                                                    <div 
                                                                        key={hotel.id} 
                                                                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                                                            isAssignedToSelected
                                                                                ? 'bg-indigo-50/50 border-indigo-200/90 shadow-2xs'
                                                                                : 'bg-slate-50/80 hover:bg-slate-100/60 border-slate-200/60'
                                                                        }`}
                                                                    >
                                                                        <div className="space-y-1 pr-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm font-bold text-slate-800">{hotel.name}</span>
                                                                                {hotel.code && (
                                                                                    <span className="px-1.5 py-0.5 bg-slate-200/70 text-slate-700 text-[9px] font-black rounded uppercase">
                                                                                        {hotel.code}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                                                <span>{hotel.brandClass} • {hotel.country || 'Indonesia'} • {hotel.region || 'Region Unspecified'}</span>
                                                                                {totalAssignedAuditors > 0 && (
                                                                                    <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold normal-case">
                                                                                        Assigned to {totalAssignedAuditors} {totalAssignedAuditors === 1 ? 'auditor' : 'auditors'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleBatchAssignHotels(selectedAuditorId, [hotel.id], !isAssignedToSelected);
                                                                            }}
                                                                            className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                                                                                isAssignedToSelected 
                                                                                    ? 'bg-indigo-600 text-white shadow-2xs hover:bg-indigo-700 ring-2 ring-indigo-500/20' 
                                                                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                                                                            }`}
                                                                        >
                                                                            {isAssignedToSelected ? (
                                                                                <>
                                                                                    <CheckCircle2 size={13} />
                                                                                    <span>Assigned</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Plus size={13} />
                                                                                    <span>Assign</span>
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {/* TAB 2: AUDIT CATEGORY ASSIGNMENTS */}
                                        {assignmentTab === 'categories' && (
                                            <div className="space-y-4">
                                                {/* AUDITOR ASSIGNED SCOPE SUMMARY BANNER */}
                                                {(() => {
                                                    const selectedAuditor = profilesList.find(p => String(p.id).trim().toLowerCase() === String(selectedAuditorId).trim().toLowerCase());
                                                    const auditorCatIds = auditorCategoryAssignments
                                                        .filter(a => String(a.user_id).trim().toLowerCase() === String(selectedAuditorId).trim().toLowerCase())
                                                        .map(a => String(a.category_id).trim());
                                                    const assignedCount = auditorCatIds.length;
                                                    const totalCount = catList.length;
                                                    const totalAssignedItems = items.filter(i => auditorCatIds.includes(i.categoryId)).length;
                                                    const coveragePct = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0;

                                                    return (
                                                        <div className="bg-linear-to-r from-emerald-50/80 via-teal-50/40 to-slate-50 border border-emerald-200/80 rounded-xl p-4 space-y-2.5">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                <div>
                                                                    <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                                                                        <Layers size={15} className="text-emerald-600" />
                                                                        <span>Category Assignment Scope for <strong className="text-emerald-800">{selectedAuditor?.display_name || 'Selected Auditor'}</strong></span>
                                                                    </div>
                                                                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                                                        {assignedCount} of {totalCount} categories assigned ({totalAssignedItems} checklist items in scope)
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    <span className="text-xs font-black text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                                                                        {coveragePct}% Coverage
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Progress bar */}
                                                            <div className="w-full h-1.5 bg-emerald-100/60 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                                                    style={{ width: `${coveragePct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* SEARCH, DEPARTMENT FILTER & CONTROLS */}
                                                <div className="space-y-3">
                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                                        {/* SEARCH INPUT */}
                                                        <div className="relative flex-1">
                                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                value={categoryAssignmentSearch}
                                                                onChange={(e) => setCategoryAssignmentSearch(e.target.value)}
                                                                placeholder="Search category or department..."
                                                                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all"
                                                            />
                                                            {categoryAssignmentSearch && (
                                                                <button onClick={() => setCategoryAssignmentSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                                    <X size={12} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* DEPARTMENT FILTER DROPDOWN */}
                                                        <select
                                                            value={categoryDeptFilter}
                                                            onChange={(e) => setCategoryDeptFilter(e.target.value)}
                                                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all shrink-0"
                                                        >
                                                            <option value="all">All Departments ({departments.length})</option>
                                                            {departments.map(d => (
                                                                <option key={d.id} value={d.id}>{d.name}</option>
                                                            ))}
                                                        </select>

                                                        {/* GROUP BY DEPT TOGGLE */}
                                                        <button
                                                            onClick={() => setGroupByDept(!groupByDept)}
                                                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                                                                groupByDept 
                                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                            title="Toggle grouping categories by department"
                                                        >
                                                            <Layers size={13} />
                                                            <span>{groupByDept ? 'Grouped by Dept' : 'Flat View'}</span>
                                                        </button>
                                                    </div>

                                                    {/* MULTI-SELECT BATCH ACTION BAR (IF BATCH SELECTED) */}
                                                    {(() => {
                                                        const filteredCatList = catList.filter(cat => {
                                                            if (categoryDeptFilter !== 'all' && cat.departmentId !== categoryDeptFilter) return false;
                                                            if (categoryAssignmentSearch) {
                                                                const query = categoryAssignmentSearch.toLowerCase();
                                                                const deptName = departments.find(d => d.id === cat.departmentId)?.name || '';
                                                                return cat.name.toLowerCase().includes(query) || deptName.toLowerCase().includes(query);
                                                            }
                                                            return true;
                                                        });

                                                        const filteredCatIds = filteredCatList.map(c => c.id);
                                                        const allFilteredSelectedForBatch = filteredCatIds.length > 0 && filteredCatIds.every(id => selectedCategoryBatchIds.has(id));

                                                        return (
                                                            <div className="flex items-center justify-between gap-2 p-2 bg-slate-100/70 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200/50">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={allFilteredSelectedForBatch}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedCategoryBatchIds(new Set([...selectedCategoryBatchIds, ...filteredCatIds]));
                                                                            } else {
                                                                                const newSet = new Set(selectedCategoryBatchIds);
                                                                                filteredCatIds.forEach(id => newSet.delete(id));
                                                                                setSelectedCategoryBatchIds(newSet);
                                                                            }
                                                                        }}
                                                                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                                                        id="select-all-cat-batch"
                                                                    />
                                                                    <label htmlFor="select-all-cat-batch" className="cursor-pointer font-bold text-slate-700">
                                                                        Select All ({filteredCatList.length})
                                                                    </label>
                                                                    {selectedCategoryBatchIds.size > 0 && (
                                                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md">
                                                                            {selectedCategoryBatchIds.size} checked
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {selectedCategoryBatchIds.size > 0 ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => {
                                                                                handleBatchAssignCategories(selectedAuditorId, Array.from(selectedCategoryBatchIds), true);
                                                                                setSelectedCategoryBatchIds(new Set());
                                                                            }}
                                                                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg transition-all shadow-2xs active:scale-95"
                                                                        >
                                                                            Assign ({selectedCategoryBatchIds.size}) to Auditor
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                handleBatchAssignCategories(selectedAuditorId, Array.from(selectedCategoryBatchIds), false);
                                                                                setSelectedCategoryBatchIds(new Set());
                                                                            }}
                                                                            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[11px] rounded-lg transition-all active:scale-95"
                                                                        >
                                                                            Unassign ({selectedCategoryBatchIds.size})
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setSelectedCategoryBatchIds(new Set())}
                                                                            className="text-slate-400 hover:text-slate-600 p-1"
                                                                            title="Clear selection"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[11px] text-slate-400 font-medium">
                                                                        Check boxes to assign/unassign multiple categories in bulk
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* CATEGORY LIST RENDER */}
                                                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                                                    {(() => {
                                                        const filteredCatList = catList.filter(cat => {
                                                            if (categoryDeptFilter !== 'all' && cat.departmentId !== categoryDeptFilter) return false;
                                                            if (categoryAssignmentSearch) {
                                                                const query = categoryAssignmentSearch.toLowerCase();
                                                                const deptName = departments.find(d => d.id === cat.departmentId)?.name || '';
                                                                return cat.name.toLowerCase().includes(query) || deptName.toLowerCase().includes(query);
                                                            }
                                                            return true;
                                                        });

                                                        if (filteredCatList.length === 0) {
                                                            return (
                                                                <div className="text-center py-12 text-slate-400 font-bold text-xs border border-dashed border-slate-200 rounded-xl">
                                                                    No categories match your search / department filter.
                                                                </div>
                                                            );
                                                        }

                                                        if (groupByDept) {
                                                            // Group by department
                                                            const deptsWithCatsMap = new Map<string, typeof catList>();
                                                            filteredCatList.forEach(cat => {
                                                                const dId = cat.departmentId || 'unassigned';
                                                                if (!deptsWithCatsMap.has(dId)) {
                                                                    deptsWithCatsMap.set(dId, []);
                                                                }
                                                                deptsWithCatsMap.get(dId)!.push(cat);
                                                            });

                                                            return Array.from(deptsWithCatsMap.entries()).map(([deptId, deptCats]) => {
                                                                const deptObj = departments.find(d => d.id === deptId);
                                                                const deptName = deptObj?.name || 'Unassigned Department';
                                                                const deptCatIds = deptCats.map(c => c.id);
                                                                
                                                                const selectedAuditorIdStr = String(selectedAuditorId).trim().toLowerCase();
                                                                const assignedInDeptCount = deptCatIds.filter(cId => 
                                                                    auditorCategoryAssignments.some(a => String(a.user_id).trim().toLowerCase() === selectedAuditorIdStr && String(a.category_id).trim() === String(cId).trim())
                                                                ).length;

                                                                const allInDeptAssigned = assignedInDeptCount === deptCats.length;

                                                                return (
                                                                    <div key={deptId} className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-3.5 space-y-2.5">
                                                                        {/* DEPARTMENT HEADER BAR */}
                                                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{deptName}</span>
                                                                                <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 text-[10px] font-bold rounded-md">
                                                                                    {assignedInDeptCount} / {deptCats.length} assigned
                                                                                </span>
                                                                            </div>

                                                                            <div className="flex items-center gap-1.5">
                                                                                <button
                                                                                    onClick={() => handleAssignDepartmentCategories(selectedAuditorId, deptId, !allInDeptAssigned)}
                                                                                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all border ${
                                                                                        allInDeptAssigned
                                                                                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                                                                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                                    }`}
                                                                                >
                                                                                    {allInDeptAssigned ? 'Unassign All Dept' : `Assign All ${deptName}`}
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {/* CATEGORIES IN DEPT */}
                                                                        <div className="space-y-1.5">
                                                                            {deptCats.map(cat => {
                                                                                const catIdStr = String(cat.id).trim();
                                                                                const isAssignedToSelected = auditorCategoryAssignments.some(
                                                                                    a => String(a.user_id).trim().toLowerCase() === selectedAuditorIdStr && String(a.category_id).trim() === catIdStr
                                                                                );
                                                                                const isBatchChecked = selectedCategoryBatchIds.has(cat.id);
                                                                                const itemCount = items.filter(i => String(i.categoryId).trim() === catIdStr).length;

                                                                                // Check if assigned to other auditors as well
                                                                                const totalAssignedCatAuditors = auditorCategoryAssignments.filter(
                                                                                    a => String(a.category_id).trim() === catIdStr
                                                                                ).length;

                                                                                return (
                                                                                    <div 
                                                                                        key={cat.id} 
                                                                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                                                                            isAssignedToSelected 
                                                                                                ? 'bg-emerald-50/60 border-emerald-200/90 shadow-2xs' 
                                                                                                : 'bg-white border-slate-200/70 hover:bg-slate-50'
                                                                                        }`}
                                                                                    >
                                                                                        <div className="flex items-center gap-3">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={isBatchChecked}
                                                                                                onChange={(e) => {
                                                                                                    const newSet = new Set(selectedCategoryBatchIds);
                                                                                                    if (e.target.checked) newSet.add(cat.id);
                                                                                                    else newSet.delete(cat.id);
                                                                                                    setSelectedCategoryBatchIds(newSet);
                                                                                                }}
                                                                                                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                                                                            />

                                                                                            <div className="space-y-0.5">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                                                                                                    {isAssignedToSelected && (
                                                                                                        <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-md flex items-center gap-1 shadow-2xs">
                                                                                                            <Check size={10} /> Assigned
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-2">
                                                                                                    <span>{itemCount} checklist items</span>
                                                                                                    {totalAssignedCatAuditors > 0 && (
                                                                                                        <span className="text-amber-600 font-bold">
                                                                                                            • Assigned to {totalAssignedCatAuditors} {totalAssignedCatAuditors === 1 ? 'auditor' : 'auditors'}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        <button
                                                                                            onClick={() => handleToggleCategoryAssignment(selectedAuditorId, cat.id)}
                                                                                            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                                                                                                isAssignedToSelected 
                                                                                                    ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700' 
                                                                                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-indigo-300'
                                                                                            }`}
                                                                                        >
                                                                                            {isAssignedToSelected ? 'Assigned' : 'Assign'}
                                                                                        </button>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            });
                                                        } else {
                                                            // Flat list
                                                            return filteredCatList.map(cat => {
                                                                const selectedAuditorIdStr = String(selectedAuditorId).trim().toLowerCase();
                                                                const catIdStr = String(cat.id).trim();
                                                                const isAssignedToSelected = auditorCategoryAssignments.some(
                                                                    a => String(a.user_id).trim().toLowerCase() === selectedAuditorIdStr && String(a.category_id).trim() === catIdStr
                                                                );
                                                                const isBatchChecked = selectedCategoryBatchIds.has(cat.id);
                                                                const dept = departments.find(d => d.id === cat.departmentId);
                                                                const itemCount = items.filter(i => String(i.categoryId).trim() === catIdStr).length;

                                                                const totalAssignedCatAuditors = auditorCategoryAssignments.filter(
                                                                    a => String(a.category_id).trim() === catIdStr
                                                                ).length;

                                                                return (
                                                                    <div 
                                                                        key={cat.id} 
                                                                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                                                            isAssignedToSelected 
                                                                                ? 'bg-emerald-50/60 border-emerald-200/90 shadow-2xs' 
                                                                                : 'bg-slate-50/80 border-slate-200/60 hover:bg-slate-100/60'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isBatchChecked}
                                                                                onChange={(e) => {
                                                                                    const newSet = new Set(selectedCategoryBatchIds);
                                                                                    if (e.target.checked) newSet.add(cat.id);
                                                                                    else newSet.delete(cat.id);
                                                                                    setSelectedCategoryBatchIds(newSet);
                                                                                }}
                                                                                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                                                            />

                                                                            <div className="space-y-0.5">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-sm font-bold text-slate-800">{cat.name}</span>
                                                                                    {dept && (
                                                                                        <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 text-[9px] font-black uppercase rounded-md">
                                                                                            {dept.name}
                                                                                        </span>
                                                                                    )}
                                                                                    {isAssignedToSelected && (
                                                                                        <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-md flex items-center gap-1 shadow-2xs">
                                                                                            <Check size={10} /> Assigned
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-2">
                                                                                    <span>{itemCount} checklist items</span>
                                                                                    {totalAssignedCatAuditors > 0 && (
                                                                                        <span className="text-amber-600 font-bold">
                                                                                            • Assigned to {totalAssignedCatAuditors} {totalAssignedCatAuditors === 1 ? 'auditor' : 'auditors'}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <button
                                                                            onClick={() => handleToggleCategoryAssignment(selectedAuditorId, cat.id)}
                                                                            className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all ${
                                                                                isAssignedToSelected 
                                                                                    ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700' 
                                                                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                                                            }`}
                                                                        >
                                                                            {isAssignedToSelected ? 'Assigned' : 'Assign Category'}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            });
                                                        }
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-slate-400 font-bold text-xs">
                                        Select an auditor from the left panel to manage their assigned hotels and audit categories
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
    );
};
