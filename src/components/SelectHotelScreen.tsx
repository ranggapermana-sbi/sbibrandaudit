import React, { useState, useEffect } from 'react';
import { supabase, HOTELS_URL, HOTELS_KEY } from '../lib/supabase';
import { Hotel } from '../types';
import { Building, Building2, Search, LogOut, ArrowRight, Sparkles, Loader2, RefreshCw } from 'lucide-react';

interface SelectHotelScreenProps {
    userProfile: any;
    onSelectHotel: (hotel: Hotel) => void;
    onLogout: () => void;
}

export default function SelectHotelScreen({ userProfile, onSelectHotel, onLogout }: SelectHotelScreenProps) {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const assignedHotelIds = userProfile?.hotel_id 
        ? String(userProfile.hotel_id).split(',').map(s => s.trim()).filter(Boolean) 
        : [];

    useEffect(() => {
        const fetchHotels = async () => {
            setIsLoading(true);
            setError('');
            try {
                const response = await fetch(`${HOTELS_URL}hotels?select=*`, {
                    headers: {
                        'apikey': HOTELS_KEY,
                        'Authorization': `Bearer ${HOTELS_KEY}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to load property database: ${response.statusText}`);
                }

                const data = await response.json();
                if (Array.isArray(data)) {
                    const mapped: Hotel[] = data.map((item: any) => {
                        const rawId = item.id !== undefined && item.id !== null ? String(item.id) : '';
                        const fallbackId = item.hotel_id !== undefined && item.hotel_id !== null ? String(item.hotel_id) : '';
                        const finalId = rawId || fallbackId || item.code || String(item.name || '').replace(/\s+/g, '-').toLowerCase();
                        return {
                            id: finalId,
                            name: item.name || item.hotel_name || '',
                            location: item.location || item.city_country || 'Indonesia',
                            code: item.code || '',
                            brandClass: item.brandClass || item.brand_class || 'Swiss-Belhotel',
                            region: item.region || 'Asia Pacific',
                            country: item.country || 'Indonesia',
                            stars: item.stars ? Number(item.stars) : 4
                        };
                    });

                    // Include HQ Corporate if listed or needed
                    const hasSbiHq = assignedHotelIds.includes('sbi-ho');
                    if (hasSbiHq && !mapped.some(h => h.id === 'sbi-ho')) {
                        mapped.unshift({
                            id: 'sbi-ho',
                            name: 'Swiss-Belhotel International',
                            location: 'Corporate Headquarters',
                            code: 'HQ',
                            brandClass: 'Corporate',
                            region: 'Asia Pacific'
                        });
                    }

                    // Filter to only those assigned to current user
                    const filtered = mapped.filter(h => assignedHotelIds.includes(h.id));
                    setHotels(filtered);
                } else {
                    throw new Error('Property query did not return a valid list.');
                }
            } catch (err: any) {
                console.error("Error loading assigned hotels:", err);
                setError(err.message || 'Unable to connect to Swiss-Belhotel database. Please refresh or retry.');
                
                // Fallback using names/codes from profile if remote fails
                if (userProfile?.hotel_name) {
                    const names = String(userProfile.hotel_name).split(',').map(s => s.trim());
                    const codes = userProfile.hotel_code ? String(userProfile.hotel_code).split(',').map(s => s.trim()) : [];
                    const fallbacks: Hotel[] = names.map((name, idx) => ({
                        id: assignedHotelIds[idx] || `fallback-${idx}`,
                        name,
                        location: 'Assigned Property',
                        code: codes[idx] || 'SBI',
                        brandClass: 'Swiss-Belhotel'
                    }));
                    setHotels(fallbacks);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchHotels();
    }, [userProfile]);

    const filteredHotels = hotels.filter(hotel => 
        hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (hotel.code && hotel.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        hotel.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-50 to-indigo-50/30 overflow-x-hidden font-sans select-none">
            {/* Decorative background visualizers */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 -right-40 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-30 pointer-events-none" />

            <div className="relative w-full max-w-xl z-10 py-8">
                <div className="bg-white/95 backdrop-blur-md border border-white/80 p-6 sm:p-10 rounded-[32px] shadow-[0_24px_50px_rgba(30,41,59,0.06)]">
                    
                    {/* Header */}
                    <div className="text-center mb-8">
                        <img 
                            src="https://i.ibb.co.com/WNB70XBz/sbi-logo.png" 
                            alt="Swiss-Belhotel Logo" 
                            className="h-[52px] object-contain mx-auto mb-5 hover:scale-105 transition-transform" 
                        />
                        <h2 className="text-slate-800 text-2xl font-black tracking-tight leading-none mb-2">
                            Select Assigned Property
                        </h2>
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest font-extrabold flex items-center justify-center gap-1.5">
                            <Sparkles size={11} className="text-indigo-500" />
                            Choose hotel property to access audit platform
                        </p>
                        
                        <div className="mt-4 px-3 py-1.5 bg-slate-50 rounded-xl inline-flex items-center gap-1.5 border border-slate-100 max-w-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                            <span className="text-slate-500 text-xs font-semibold truncate">
                                User: <span className="font-bold text-slate-700">{userProfile?.first_name} {userProfile?.last_name || ''}</span>
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl text-xs font-semibold flex items-center justify-between">
                            <span>{error}</span>
                            <button 
                                onClick={() => window.location.reload()} 
                                className="p-1 hover:bg-amber-100 rounded-lg transition-colors shrink-0 text-amber-900"
                            >
                                <RefreshCw size={14} className="animate-spin" />
                            </button>
                        </div>
                    )}

                    {/* Search filter if they have more than 3 properties */}
                    {hotels.length > 3 && (
                        <div className="relative mb-4">
                            <span className="absolute left-4 top-3 text-slate-400">
                                <Search size={15} />
                            </span>
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-xs text-slate-850 outline-none transition-all placeholder:text-slate-400"
                                placeholder="Search among your assigned properties..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Properties List */}
                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            <p className="text-slate-450 text-xs font-bold uppercase tracking-wider">Loading your properties...</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                            {filteredHotels.length > 0 ? (
                                filteredHotels.map((hotel) => (
                                    <button
                                        key={hotel.id}
                                        onClick={() => onSelectHotel(hotel)}
                                        className="w-full text-left p-4 bg-slate-50 hover:bg-indigo-50/40 border border-slate-100 hover:border-indigo-100 rounded-2xl flex items-center justify-between transition-all group duration-200"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="p-3 bg-white border border-slate-100 rounded-xl text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors shrink-0">
                                                <Building2 size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-slate-800 text-sm font-black truncate group-hover:text-indigo-900 transition-colors">
                                                    {hotel.name}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-extrabold tracking-tight uppercase mt-0.5">
                                                    {hotel.code || 'N/A'} - {hotel.region || 'Region'} - {hotel.brandClass || 'Brand'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all shrink-0">
                                            <ArrowRight size={14} />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                    <Building size={28} className="mx-auto text-slate-300 mb-2.5" />
                                    <p className="text-slate-550 text-xs font-bold">No assigned properties found</p>
                                    <p className="text-[10px] text-slate-400 mt-1 max-w-[280px] mx-auto">
                                        Your account has no authorized property assignments. Please contact the administrator.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {hotels.length} assigned {hotels.length === 1 ? 'property' : 'properties'}
                        </span>
                        
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-1.5 text-xs font-black text-slate-550 hover:text-red-600 transition-colors group"
                        >
                            <LogOut size={14} className="group-hover:translate-x-[-1px] transition-transform" />
                            Sign Out Account
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
