import React, { useState, useMemo } from 'react';
import { Building2, Search, MapPin, Globe, Star, ShieldCheck, ChevronDown, RefreshCw } from 'lucide-react';
import { Hotel } from '../../types';

interface AuditHotelSelectorProps {
    hotels: Hotel[];
    selectedHotelCode: string;
    onSelectHotelCode: (code: string) => void;
    isLoading: boolean;
    onRefresh: () => void;
    lastSyncedAt: Date | null;
}

export const AuditHotelSelector: React.FC<AuditHotelSelectorProps> = ({
    hotels,
    selectedHotelCode,
    onSelectHotelCode,
    isLoading,
    onRefresh,
    lastSyncedAt
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Get unique list of countries
    const countries = useMemo(() => {
        const set = new Set<string>();
        hotels.forEach(h => {
            if (h.country) set.add(h.country);
        });
        return Array.from(set).sort();
    }, [hotels]);

    // Filter hotels
    const filteredHotels = useMemo(() => {
        return hotels.filter(h => {
            const matchesCountry = selectedCountry === 'all' || h.country === selectedCountry;
            const q = searchQuery.trim().toLowerCase();
            const matchesSearch = !q || (
                (h.name && h.name.toLowerCase().includes(q)) ||
                (h.code && h.code.toLowerCase().includes(q)) ||
                (h.location && h.location.toLowerCase().includes(q)) ||
                (h.brandClass && h.brandClass.toLowerCase().includes(q))
            );
            return matchesCountry && matchesSearch;
        });
    }, [hotels, selectedCountry, searchQuery]);

    // Selected hotel object
    const selectedHotel = useMemo(() => {
        const q = selectedHotelCode.trim().toUpperCase();
        return hotels.find(h => 
            String(h.code || '').trim().toUpperCase() === q || 
            String(h.id || '').trim().toUpperCase() === q
        ) || null;
    }, [hotels, selectedHotelCode]);

    return (
        <div id="audit-v2-hotel-selector" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 mb-6 relative z-30">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Left: Hotel Selection Trigger */}
                <div className="flex-1 relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                        <Building2 size={14} className="text-indigo-600" />
                        <span>Select Inspection Hotel</span>
                    </label>

                    <div className="relative">
                        <button
                            type="button"
                            id="btn-audit-v2-select-hotel"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-left flex items-center justify-between transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {selectedHotel ? (
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                                        {selectedHotel.code || selectedHotel.id.slice(0, 3).toUpperCase()}
                                    </div>
                                    <div className="truncate">
                                        <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
                                            <span>{selectedHotel.name}</span>
                                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">
                                                {selectedHotel.code || 'NO-CODE'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 truncate flex items-center gap-2 mt-0.5">
                                            {selectedHotel.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={11} className="text-slate-400" />
                                                    {selectedHotel.location}
                                                </span>
                                            )}
                                            {selectedHotel.country && (
                                                <span className="flex items-center gap-1">
                                                    <Globe size={11} className="text-slate-400" />
                                                    {selectedHotel.country}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-slate-400 text-sm font-medium">-- Select Hotel for Audit Inspection --</span>
                            )}
                            <ChevronDown size={18} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Backdrop for Click Outside */}
                        {isDropdownOpen && (
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsDropdownOpen(false)} 
                            />
                        )}

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div id="audit-v2-hotel-dropdown-menu" className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3 max-h-96 overflow-hidden flex flex-col">
                                
                                {/* Filters inside dropdown */}
                                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                                    <div className="relative flex-1">
                                        <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search hotel name or code..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    {countries.length > 0 && (
                                        <select
                                            value={selectedCountry}
                                            onChange={e => setSelectedCountry(e.target.value)}
                                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="all">All Countries ({countries.length})</option>
                                            {countries.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Hotel List */}
                                <div className="overflow-y-auto flex-1 space-y-1 pr-1">
                                    {filteredHotels.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-400">
                                            No hotels found matching criteria.
                                        </div>
                                    ) : (
                                        filteredHotels.map(hotel => {
                                            const code = String(hotel.code || hotel.id).trim().toUpperCase();
                                            const isSelected = selectedHotelCode.trim().toUpperCase() === code;

                                            return (
                                                <button
                                                    key={hotel.id}
                                                    type="button"
                                                    onClick={() => {
                                                        onSelectHotelCode(code);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors ${
                                                        isSelected 
                                                            ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold' 
                                                            : 'hover:bg-slate-50 text-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                                                        }`}>
                                                            {hotel.code || 'HTL'}
                                                        </div>
                                                        <div className="truncate">
                                                            <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                                                                <span>{hotel.name}</span>
                                                            </div>
                                                            <div className="text-[11px] text-slate-400 truncate">
                                                                {hotel.location || hotel.country || 'Swiss-Belhotel International'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <ShieldCheck size={16} className="text-indigo-600 shrink-0 ml-2" />
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Sync Status & Refresh Button */}
                <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {lastSyncedAt && (
                        <div className="text-xs text-slate-500 font-medium">
                            Synced: <span className="text-slate-800 font-semibold">{lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                    )}

                    <button
                        type="button"
                        id="btn-audit-v2-refresh-db"
                        onClick={onRefresh}
                        disabled={isLoading || !selectedHotelCode}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin text-indigo-600' : 'text-slate-600'} />
                        <span>{isLoading ? 'Syncing DB...' : 'Sync Latest'}</span>
                    </button>
                </div>

            </div>
        </div>
    );
};
