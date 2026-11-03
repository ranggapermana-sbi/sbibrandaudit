import React from 'react';
import { Hotel } from '../../types';
import { ArrowLeft, Building, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock, Edit, Plus, RefreshCw, Search, Star, Trash2, X } from 'lucide-react';


// Master hotel list, moved out of AdminPanelScreen. Values are passed in from the admin screen.
export interface HotelsViewProps {
    confirmHotelDeleteId: string;
    fetchHotelsFromSupabase: (forceRefresh?: boolean) => Promise<void>;
    filteredHotels: Hotel[];
    handleDeleteHotel: (id: string) => Promise<void>;
    handleOpenAddHotel: () => void;
    handleOpenEditHotel: (hotel: Hotel) => void;
    hotelFilterBrand: string;
    hotelFilterStars: string;
    hotelPageSize: number;
    isSupabaseLoading: boolean;
    masterHotelEndIndex: number;
    masterHotelStartIndex: number;
    onBackToDashboard: () => void;
    paginatedHotels: Hotel[];
    safeMasterHotelPage: number;
    searchQuery: string;
    setConfirmHotelDeleteId: React.Dispatch<React.SetStateAction<string>>;
    setHotelFilterBrand: React.Dispatch<React.SetStateAction<string>>;
    setHotelFilterStars: React.Dispatch<React.SetStateAction<string>>;
    setHotelPage: React.Dispatch<React.SetStateAction<number>>;
    setHotelPageSize: React.Dispatch<React.SetStateAction<number>>;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    supabaseConnected: boolean;
    supabaseErrorMsg: string;
    totalMasterHotelPages: number;
    totalMasterHotelsCount: number;
    uniqueBrands: string[];
    uniqueStars: number[];
}

export const HotelsView: React.FC<HotelsViewProps> = (props) => {
    const { confirmHotelDeleteId, fetchHotelsFromSupabase, filteredHotels, handleDeleteHotel, handleOpenAddHotel, handleOpenEditHotel, hotelFilterBrand, hotelFilterStars, hotelPageSize, isSupabaseLoading, masterHotelEndIndex, masterHotelStartIndex, onBackToDashboard, paginatedHotels, safeMasterHotelPage, searchQuery, setConfirmHotelDeleteId, setHotelFilterBrand, setHotelFilterStars, setHotelPage, setHotelPageSize, setSearchQuery, supabaseConnected, supabaseErrorMsg, totalMasterHotelPages, totalMasterHotelsCount, uniqueBrands, uniqueStars } = props;
    return (
                    <div className="space-y-6">
                        {/* Hotels Layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { onBackToDashboard(); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-55/80 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Master Hotel Properties</h2>
                                <p className="text-xs text-slate-500 mt-1">Manage Swiss-Belhotel brand properties list, brands and locations.</p>
                            </div>
                            <button 
                                onClick={handleOpenAddHotel} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 justify-center shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                            >
                                <Plus size={16} />
                                <span>Add Hotel Property</span>
                            </button>
                        </div>

                        {/* Supabase Connectivity Indicator */}
                        <div className="bg-white p-4.5 rounded-2xl border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none animate-fadeIn">
                            <div className="flex items-center gap-2.5">
                                <div className="relative">
                                    <span className={`block h-3 w-3 rounded-full ${
                                        supabaseConnected === true ? 'bg-emerald-500' :
                                        supabaseConnected === false ? 'bg-red-500' :
                                        'bg-amber-400'
                                    }`}></span>
                                    {supabaseConnected === null && (
                                        <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-75"></span>
                                    )}
                                    {supabaseConnected === true && (
                                        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60"></span>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Database Status</span>
                                        <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">Supabase REST</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                        {supabaseConnected === true ? (
                                            <span className="text-emerald-600 font-bold">Connected to main › public.hotels</span>
                                        ) : supabaseConnected === false ? (
                                            <span className="text-red-500 font-bold">Disconnected/Offline - Utilizing Cached Fallback</span>
                                        ) : (
                                            <span className="text-amber-500 font-bold">Verifying database connectivity...</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                                {supabaseErrorMsg && (
                                    <div className="text-[10px] bg-red-50 border border-red-100 text-red-600 px-2.5 py-1 rounded-lg font-bold max-w-xs truncate animate-pulse" title={supabaseErrorMsg}>
                                        {supabaseErrorMsg}
                                    </div>
                                )}
                                <button 
                                    type="button"
                                    onClick={() => fetchHotelsFromSupabase(true)}
                                    disabled={isSupabaseLoading}
                                    className={`text-xs font-bold px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-indigo-605 rounded-xl transition-all flex items-center gap-1.5 ${isSupabaseLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Clock size={12} className={isSupabaseLoading ? 'animate-spin' : ''} />
                                    <span>{isSupabaseLoading ? 'Syncing...' : 'Sync Now'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                            {/* Search Bar */}
                            <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center gap-3 hover:border-slate-300 focus-within:border-indigo-400 focus-within:shadow-[0_8px_30px_rgba(99,102,241,0.03)] transition-all">
                                <Search className="text-slate-400 shrink-0" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search by name, code, region, city/country..." 
                                    className="w-full text-sm text-slate-700 bg-transparent outline-none border-none placeholder-slate-400 focus:ring-0"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')} 
                                        className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Filters row */}
                            <div className="flex flex-wrap sm:flex-nowrap gap-3">
                                {/* Brand Filter Dropdown */}
                                <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-2xl border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] hover:border-slate-300 focus-within:border-indigo-400 transition-all select-none min-w-[145px] flex-1 sm:flex-none">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap pl-1">Brand:</span>
                                    <select
                                        className="text-xs font-bold text-slate-700 bg-transparent border-none focus:ring-0 p-0 cursor-pointer w-full outline-none"
                                        value={hotelFilterBrand}
                                        onChange={(e) => setHotelFilterBrand(e.target.value)}
                                    >
                                        <option value="All">All Brands</option>
                                        {uniqueBrands.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Star Filter Dropdown */}
                                <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-2xl border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] hover:border-slate-300 focus-within:border-indigo-400 transition-all select-none min-w-[130px] flex-1 sm:flex-none">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap pl-1">Stars:</span>
                                    <select
                                        className="text-xs font-bold text-slate-700 bg-transparent border-none focus:ring-0 p-0 cursor-pointer w-full outline-none"
                                        value={hotelFilterStars}
                                        onChange={(e) => setHotelFilterStars(e.target.value)}
                                    >
                                        <option value="All">All Ratings</option>
                                        {uniqueStars.map(s => (
                                            <option key={s} value={String(s)}>{s} Star{s > 1 ? 's' : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Clear Filters button */}
                                {(hotelFilterBrand !== 'All' || hotelFilterStars !== 'All' || searchQuery) && (
                                    <button
                                        onClick={() => {
                                            setHotelFilterBrand('All');
                                            setHotelFilterStars('All');
                                            setSearchQuery('');
                                        }}
                                        className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all px-3.5 py-2.5 rounded-2xl border border-indigo-100/50 hover:shadow-sm active:scale-95 shrink-0 flex items-center justify-center gap-1 w-full sm:w-auto"
                                    >
                                        <RefreshCw size={12} />
                                        <span>Reset</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Hotels Grid or Table */}
                        {filteredHotels.length === 0 ? (
                            <div className="bg-white/40 backdrop-blur-sm p-12 rounded-[24px] border border-dashed border-slate-200 text-center">
                                <Search size={28} className="text-slate-300 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-slate-800">No hotel properties match your filter</h3>
                                <p className="text-xs text-slate-400 mt-1">Try resetting the search query or add a brand-new hotel property.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.012)] overflow-hidden animate-fadeIn">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50 select-none text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                                                <th className="px-6 py-4.5">Hotel Name</th>
                                                <th className="px-6 py-4.5">Region</th>
                                                <th className="px-6 py-4.5">Country</th>
                                                <th className="px-6 py-4.5">Brand</th>
                                                <th className="px-6 py-4.5">Star Rating</th>
                                                <th className="px-6 py-4.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedHotels.map((hotel) => (
                                                <tr key={hotel.id} className="hover:bg-slate-50/20 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-indigo-50/80 text-indigo-700 flex items-center justify-center font-black text-xs uppercase shadow-sm shrink-0">
                                                                <Building size={14} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-800 leading-tight">{hotel.name}</span>
                                                                {hotel.code && (
                                                                    <span className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider mt-0.5">{hotel.code}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200/50">
                                                            {hotel.region || 'Asia Pacific'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-sm font-bold text-slate-600">
                                                            {hotel.country || 'Indonesia'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50/75 px-2 py-1 rounded-md">
                                                            {hotel.brandClass}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-0.5 text-amber-500">
                                                            {Array.from({ length: hotel.stars || 4 }).map((_, i) => (
                                                                <Star key={i} size={14} fill="currentColor" className="shrink-0" />
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                                        {confirmHotelDeleteId === hotel.id ? (
                                                            <div className="inline-flex items-center gap-2 bg-red-50/85 px-3 py-1.5 rounded-xl border border-red-105 text-left animate-fadeIn">
                                                                <span className="text-[10px] text-red-600 font-bold whitespace-nowrap">Are you sure?</span>
                                                                <button 
                                                                    onClick={() => handleDeleteHotel(hotel.id)}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Yes, delete
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmHotelDeleteId(null)}
                                                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex gap-2">
                                                                <button 
                                                                    onClick={() => handleOpenEditHotel(hotel)}
                                                                    className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-xl transition-all font-bold flex items-center gap-1.5 active:scale-95"
                                                                >
                                                                    <Edit size={13} />
                                                                    <span>Edit</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmHotelDeleteId(hotel.id)}
                                                                    className="px-3 py-1.5 text-slate-600 hover:text-red-800 hover:bg-red-50 border border-slate-200 hover:border-red-100 rounded-xl transition-all font-bold flex items-center gap-1.5 active:scale-95"
                                                                >
                                                                    <Trash2 size={13} />
                                                                    <span>Delete</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* PAGINATION FOOTER BAR */}
                                <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-150/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                                        <span>
                                            Showing <strong className="text-slate-800 font-bold">{totalMasterHotelsCount === 0 ? 0 : masterHotelStartIndex + 1}</strong> to <strong className="text-slate-800 font-bold">{masterHotelEndIndex}</strong> of <strong className="text-slate-800 font-bold">{totalMasterHotelsCount}</strong> properties
                                        </span>
                                        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                                            <span className="text-[11px] font-bold text-slate-400">Rows per page:</span>
                                            <select
                                                value={hotelPageSize}
                                                onChange={(e) => {
                                                    setHotelPageSize(Number(e.target.value));
                                                    setHotelPage(1);
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
                                    {totalMasterHotelPages > 1 && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => setHotelPage(1)}
                                                disabled={safeMasterHotelPage === 1}
                                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                                                title="First Page"
                                            >
                                                <ChevronsLeft size={14} />
                                            </button>
                                            <button
                                                onClick={() => setHotelPage(p => Math.max(1, p - 1))}
                                                disabled={safeMasterHotelPage === 1}
                                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                                                title="Previous Page"
                                            >
                                                <ChevronLeft size={14} />
                                            </button>

                                            {/* Numeric page buttons */}
                                            {(() => {
                                                const pages: number[] = [];
                                                const maxButtons = 5;
                                                let startP = Math.max(1, safeMasterHotelPage - 2);
                                                let endP = Math.min(totalMasterHotelPages, startP + maxButtons - 1);
                                                if (endP - startP + 1 < maxButtons) {
                                                    startP = Math.max(1, endP - maxButtons + 1);
                                                }
                                                for (let p = startP; p <= endP; p++) {
                                                    pages.push(p);
                                                }

                                                return pages.map(pageNum => (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setHotelPage(pageNum)}
                                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                                            safeMasterHotelPage === pageNum
                                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-2xs'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                ));
                                            })()}

                                            <button
                                                onClick={() => setHotelPage(p => Math.min(totalMasterHotelPages, p + 1))}
                                                disabled={safeMasterHotelPage === totalMasterHotelPages}
                                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                                                title="Next Page"
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                            <button
                                                onClick={() => setHotelPage(totalMasterHotelPages)}
                                                disabled={safeMasterHotelPage === totalMasterHotelPages}
                                                className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                                                title="Last Page"
                                            >
                                                <ChevronsRight size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
    );
};
