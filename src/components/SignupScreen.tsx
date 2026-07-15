import React, { useState, useEffect, useRef } from 'react';
import { User, Building2, Briefcase, ChevronDown, Check, Search, Sparkles, Building, LogOut, Loader2, X } from 'lucide-react';
import { supabase, HOTELS_URL, HOTELS_KEY } from '../lib/supabase';

interface Hotel {
    id: string;
    name: string;
    location: string;
    code?: string;
    brandClass: string;
    region?: string;
    country?: string;
    stars?: number;
}

const FALLBACK_HOTELS: Hotel[] = [
    { id: 'sbi-ho', name: 'Swiss-Belhotel International', location: 'Corporate Headquarters', code: 'SBI', brandClass: 'Corporate', region: 'Global', country: 'International', stars: 5 },
    { id: '1', name: 'Swiss-Belhotel Seef', location: 'Manama, Bahrain', code: 'SBSE', brandClass: 'Swiss-Belhotel', region: 'Middle East', country: 'Bahrain', stars: 4 },
    { id: '2', name: 'Swiss-Belresidences Juffair', location: 'Juffair, Bahrain', code: 'SBJU', brandClass: 'Swiss-Belresidences', region: 'Middle East', country: 'Bahrain', stars: 4 },
    { id: '3', name: 'Swiss-Belinn Airport Jakarta', location: 'Jakarta, Indonesia', code: 'SBAJ', brandClass: 'Swiss-Belinn', region: 'Asia Pacific', country: 'Indonesia', stars: 3 },
    { id: '4', name: 'Swiss-Belresidences Kalibata', location: 'Jakarta, Indonesia', code: 'SBKA', brandClass: 'Swiss-Belresidences', region: 'Asia Pacific', country: 'Indonesia', stars: 4 },
    { id: '5', name: 'Swiss-Belinn Manyar', location: 'Surabaya, Indonesia', code: 'SBIM', brandClass: 'Swiss-Belinn', region: 'Asia Pacific', country: 'Indonesia', stars: 3 },
    { id: '6', name: 'Swiss-Belhotel Pondok Indah', location: 'Jakarta, Indonesia', code: 'SBPI', brandClass: 'Swiss-Belhotel', region: 'Asia Pacific', country: 'Indonesia', stars: 4 },
    { id: '7', name: 'Swiss-Belhotel Harbour Bay', location: 'Batam, Indonesia', code: 'SBHB', brandClass: 'Swiss-Belhotel', region: 'Asia Pacific', country: 'Indonesia', stars: 4 },
    { id: '8', name: 'Grand Swiss-Belhotel Darmo', location: 'Surabaya, Indonesia', code: 'GSBD', brandClass: 'Grand Swiss-Belhotel', region: 'Asia Pacific', country: 'Indonesia', stars: 5 }
];

const ROLES = [
    'General Manager',
    'GM Secretary',
    'Marcomm/PR',
    'Room Division',
    'Front Office',
    'Sales & Marketing'
];

interface SignupScreenProps {
    onComplete: (profile: any) => void;
    onLogout: () => void;
}

export default function SignupScreen({ onComplete, onLogout }: SignupScreenProps) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('');
    const [isAuditLead, setIsAuditLead] = useState(false);
    
    // Hotel autocomplete state
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [hotelSearch, setHotelSearch] = useState('');
    const [selectedHotels, setSelectedHotels] = useState<Hotel[]>([]);
    const [isHotelDropdownOpen, setIsHotelDropdownOpen] = useState(false);
    const [isLoadingHotels, setIsLoadingHotels] = useState(false);
    
    // UI feedback state
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>('');

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch current user email from active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUserEmail(session.user.email || '');
                setCurrentUserId(session.user.id || '');
                // Try prefilling first/last name if user has a metadata name
                const fullName = session.user.user_metadata?.full_name || '';
                if (fullName) {
                    const parts = fullName.split(' ');
                    setFirstName(parts[0] || '');
                    if (parts.length > 1) {
                        setLastName(parts.slice(1).join(' '));
                    }
                }
            }
        });

        // Load hotels list from Master Database
        const loadHotels = async () => {
            setIsLoadingHotels(true);
            try {
                const response = await fetch(`${HOTELS_URL}hotels?select=*`, {
                    headers: {
                        'apikey': HOTELS_KEY,
                        'Authorization': `Bearer ${HOTELS_KEY}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data) && data.length > 0) {
                        // Map Supabase layout and guard against JavaScript `String(undefined)` returning "undefined"
                        const mapped: Hotel[] = data.map((item: any) => {
                            const rawId = item.id !== undefined && item.id !== null ? String(item.id) : '';
                            const fallbackId = item.hotel_id !== undefined && item.hotel_id !== null ? String(item.hotel_id) : '';
                            const finalId = rawId || fallbackId || item.code || String(item.name || '').replace(/\s+/g, '-').toLowerCase();
                            
                            let country = item.country || '';
                            const parts = (item.location || item.city_country || '').split(',');
                            if (!country && parts.length > 1) {
                                country = parts[parts.length - 1].trim();
                            } else if (!country) {
                                country = 'Indonesia';
                            }

                            let region = item.region || '';
                            if (!region) {
                                const countryLower = country.toLowerCase();
                                if (countryLower.includes('bahrain') || countryLower.includes('uae') || countryLower.includes('kuwait') || countryLower.includes('saudi') || countryLower.includes('qatar') || countryLower.includes('oman') || countryLower.includes('middle east')) {
                                    region = 'Middle East';
                                } else {
                                    region = 'Indonesia';
                                }
                            }

                            return {
                                id: finalId,
                                name: item.name || item.hotel_name || '',
                                location: item.location || item.city_country || 'Indonesia',
                                code: item.code || '',
                                brandClass: item.brandClass || item.brand_class || item.brand || 'Swiss-Belhotel',
                                region: region,
                                country: country,
                                stars: item.stars ? Number(item.stars) : 4
                            };
                        });

                        // Ensure Swiss-Belhotel International is always at the very top
                        const sbiIndex = mapped.findIndex(h => h.name.toLowerCase() === 'swiss-belhotel international');
                        if (sbiIndex > -1) {
                            const [sbi] = mapped.splice(sbiIndex, 1);
                            mapped.unshift(sbi);
                        } else {
                            mapped.unshift({
                                id: 'sbi-ho',
                                name: 'Swiss-Belhotel International',
                                location: 'Corporate Headquarters',
                                code: 'SBI',
                                brandClass: 'Corporate',
                                region: 'Global',
                                country: 'International',
                                stars: 5
                            });
                        }

                        setHotels(mapped);
                    } else {
                        setHotels(FALLBACK_HOTELS);
                    }
                } else {
                    setHotels(FALLBACK_HOTELS);
                }
            } catch (err) {
                console.warn("Failed to load hotels from master database, using fallbacks:", err);
                setHotels(FALLBACK_HOTELS);
            } finally {
                setIsLoadingHotels(false);
            }
        };

        // Fetch audit users to check for existing Brand Audit Leads
        const loadAuditUsers = async () => {
            try {
                const mainUrl = import.meta.env.MAIN_SUPABASE_URL || 'https://gvnwxrejgdkixbszhxkw.supabase.co/rest/v1/';
                const cleanMainUrl = mainUrl.replace(/\/rest\/v1\/?$/, '').trim();
                const mainAnonKey = import.meta.env.MAIN_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bnd4cmVqZ2RraXhic3poeGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTE2ODcsImV4cCI6MjA5NDcyNzY4N30.Pvv9rgR_Vr9McwxLrYfELeSpWYLNH2NPw0nkeGD6ZXo';
                const response = await fetch(`${cleanMainUrl}/rest/v1/audit_users?select=*`, {
                    headers: {
                        'apikey': mainAnonKey,
                        'Authorization': `Bearer ${mainAnonKey}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setAllUsers(data);
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch audit users during onboarding:", err);
            }
        };

        loadHotels();
        loadAuditUsers();
    }, []);

    // Outside click handler to close the dropdown menu
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsHotelDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Autocomplete filter matching
    const filteredHotels = hotelSearch.trim() === ''
        ? hotels
        : hotels.filter(hotel => 
            hotel.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
            (hotel.code && hotel.code.toLowerCase().includes(hotelSearch.toLowerCase())) ||
            (hotel.location && hotel.location.toLowerCase().includes(hotelSearch.toLowerCase()))
        );

    // Check if any of the selected hotels already has a Brand Audit Lead
    const getExistingBrandLeadForSelected = () => {
        if (selectedHotels.length === 0) return null;
        for (const hotel of selectedHotels) {
            // Find another user who is Brand Audit Lead for this hotel
            const lead = allUsers.find(user => {
                if (user.id === currentUserId) return false;
                if (!user.is_brand_audit_lead) return false;
                const hotelIds = (user.hotel_id || '').split(',').map((id: string) => id.trim().toLowerCase());
                return hotelIds.includes(hotel.id.toLowerCase());
            });
            if (lead) {
                return { hotel, lead };
            }
        }
        return null;
    };

    const existingLeadConflict = getExistingBrandLeadForSelected();

    // Auto-disable if conflict arises
    useEffect(() => {
        if (existingLeadConflict) {
            setIsAuditLead(false);
        }
    }, [existingLeadConflict]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { [key: string]: string } = {};

        if (selectedHotels.length === 0) {
            newErrors.hotel = 'Please select at least one assigned hotel from the autocomplete properties list.';
        }
        if (!firstName.trim()) {
            newErrors.firstName = 'First Name is a mandatory requirement.';
        }
        if (!role) {
            newErrors.role = 'Please select your role within the property management team.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            // Scroll to first error
            const firstErrorKey = Object.keys(newErrors)[0];
            const element = document.getElementById(`error-anchor-${firstErrorKey}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                throw new Error("No active Google Session detected.");
            }

            const userId = session.user.id;
            const profileData = {
                id: userId,
                email: userEmail,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                hotel_id: selectedHotels.length > 0 ? selectedHotels.map(h => h.id).join(',') : null,
                hotel_name: selectedHotels.length > 0 ? selectedHotels.map(h => h.name).join(', ') : null,
                hotel_code: selectedHotels.length > 0 ? selectedHotels.map(h => h.code || 'SBI').join(',') : null,
                role: role,
                access_level: (role === 'Admin' || isAuditLead) ? 'admin' : (role === 'Auditor' ? 'auditor' : 'auditee'),
                is_brand_audit_lead: isAuditLead,
                is_approved: userEmail === 'brandaudit@swiss-belhotel.com',
                updated_at: new Date().toISOString()
            };

            // Save locally to represent active state immediately & fallback
            localStorage.setItem(`sbi_profile_${userId}`, JSON.stringify(profileData));

            // Save in main Supabase database 'profiles'
            const mainUrl = import.meta.env.MAIN_SUPABASE_URL || 'https://gvnwxrejgdkixbszhxkw.supabase.co/rest/v1/';
            const cleanMainUrl = mainUrl.replace(/\/rest\/v1\/?$/, '').trim();
            const mainAnonKey = import.meta.env.MAIN_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bnd4cmVqZ2RraXhic3poeGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTE2ODcsImV4cCI6MjA5NDcyNzY4N30.Pvv9rgR_Vr9McwxLrYfELeSpWYLNH2NPw0nkeGD6ZXo';

            try {
                // Upsert profile in Supabase audit_users REST endpoint
                const res = await fetch(`${cleanMainUrl}/rest/v1/audit_users?on_conflict=id`, {
                    method: 'POST',
                    headers: {
                        'apikey': mainAnonKey,
                        'Authorization': `Bearer ${mainAnonKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify(profileData)
                });
                
                if (!res.ok) {
                    console.warn(`Database profiles write returned response status: ${res.status}. Falling back to client sync.`);
                }
            } catch (pErr) {
                console.warn("Table profiles may not exist or permission limit hit. Local registration completed successfully.", pErr);
            }

            // Successfully register onboarding details
            onComplete(profileData);
        } catch (err: any) {
            console.error("Critical onboarding storage error:", err);
            setErrors({ submit: err.message || 'Verification storage failed. Please check connection and try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-50 to-indigo-50/30 overflow-x-hidden font-sans select-none">
            
            {/* Decorative background visualizers */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 -right-40 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-30 pointer-events-none" />

            <main className="relative w-full max-w-[520px] z-10 py-10">
                <div className="bg-white/95 backdrop-blur-md border border-white/80 p-6 sm:p-10 rounded-[32px] shadow-[0_24px_50px_rgba(30,41,59,0.06)]">
                    
                    {/* Header alignment containing core corporate brand */}
                    <div className="text-center mb-8">
                        <img 
                            src="https://i.ibb.co.com/WNB70XBz/sbi-logo.png" 
                            alt="Swiss-Belhotel Logo" 
                            className="h-[52px] object-contain mx-auto mb-5 hover:scale-105 transition-transform" 
                        />
                        <h2 className="text-slate-800 text-2xl font-black tracking-tight leading-none mb-2">
                            Complete Portal Registration
                        </h2>
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest font-extrabold flex items-center justify-center gap-1.5">
                            <Sparkles size={11} className="text-indigo-500" />
                            Onboarding Profile Verification
                        </p>
                        
                        <div className="mt-4 px-3 py-1.5 bg-slate-50 rounded-xl inline-flex items-center gap-1.5 border border-slate-100 max-w-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                            <span className="text-slate-500 text-xs font-semibold truncate" title={userEmail}>
                                Authenticated: <span className="font-bold text-slate-700">{userEmail}</span>
                            </span>
                        </div>
                    </div>

                    {errors.submit && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs font-semibold leading-relaxed">
                            {errors.submit}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Hotel Selection input */}
                        <div id="error-anchor-hotel" className="relative" ref={dropdownRef}>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Building2 size={13} className="text-slate-400" />
                                Assigned Hotel Properties <span className="text-red-500">*</span>
                            </label>
                            
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 text-slate-400">
                                    <Search size={16} />
                                </span>
                                <input 
                                    type="text"
                                    className={`w-full pl-11 pr-10 py-3 bg-slate-50 border ${errors.hotel ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'} hover:border-slate-300 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:ring-2`}
                                    placeholder={isLoadingHotels ? "Loading database properties..." : "Type to assign properties... (e.g. Seef, Jakarta)"}
                                    value={hotelSearch}
                                    onChange={(e) => {
                                        setHotelSearch(e.target.value);
                                        setIsHotelDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsHotelDropdownOpen(true)}
                                    disabled={isLoadingHotels}
                                />
                                <span className="absolute right-4 top-3.5 text-slate-400 pointer-events-none">
                                    <ChevronDown size={16} />
                                </span>
                            </div>

                            {/* Dropdown list popup matching with autocomplete */}
                            {isHotelDropdownOpen && (
                                <div className="absolute w-full mt-2 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 max-h-[220px] overflow-y-auto divide-y divide-slate-100 animate-slideUp">
                                    {filteredHotels.length > 0 ? (
                                        filteredHotels.map((hotel, index) => {
                                            const isAlreadySelected = selectedHotels.some(h => h.id === hotel.id);
                                            return (
                                                <div 
                                                    key={`${hotel.id}-${index}`}
                                                    className={`px-5 py-3.5 hover:bg-indigo-50/40 cursor-pointer flex items-center justify-between transition-colors group ${isAlreadySelected ? 'opacity-50 cursor-default bg-slate-50/50' : ''}`}
                                                    onClick={() => {
                                                        if (isAlreadySelected) return;
                                                        setSelectedHotels([...selectedHotels, hotel]);
                                                        setHotelSearch('');
                                                        setIsHotelDropdownOpen(false);
                                                        // clear error
                                                        if (errors.hotel) {
                                                            const updated = { ...errors };
                                                            delete updated.hotel;
                                                            setErrors(updated);
                                                        }
                                                    }}
                                                >
                                                    <div>
                                                        <p className="text-slate-800 text-xs font-bold group-hover:text-indigo-900 transition-colors">
                                                            {hotel.name}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-extrabold tracking-tight mt-0.5 uppercase">
                                                            {hotel.code || 'N/A'} - {hotel.region || 'Region'} - {hotel.brandClass || 'Brand'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {isAlreadySelected ? (
                                                            <span className="bg-emerald-50 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded uppercase border border-emerald-100">
                                                                Assigned
                                                            </span>
                                                        ) : (
                                                            <span className="bg-slate-100 text-slate-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                                                                {hotel.region || 'AsiaPac'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="px-5 py-6 text-center text-slate-450 text-xs">
                                            No matching hotel properties found. Try a different search input.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* List of currently selected hotels */}
                            {selectedHotels.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Currently Selected Properties:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedHotels.map((hotel) => (
                                            <div 
                                                key={hotel.id}
                                                className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 bg-indigo-50/80 border border-indigo-100/60 rounded-xl text-xs font-bold text-indigo-950 animate-fadeIn shadow-sm"
                                            >
                                                <span>{hotel.name} {hotel.code ? `(${hotel.code})` : ''}</span>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedHotels(selectedHotels.filter(h => h.id !== hotel.id));
                                                    }}
                                                    className="p-0.5 hover:bg-indigo-100 rounded-md text-indigo-400 hover:text-indigo-700 transition-all cursor-pointer"
                                                    title="Remove Property"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {errors.hotel && (
                                <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1.5">
                                    {errors.hotel}
                                </p>
                            )}
                        </div>

                        {/* First name & Last Name side by side */}
                        <div id="error-anchor-firstName" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <User size={13} className="text-slate-400" />
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text"
                                    className={`w-full px-4 py-3 bg-slate-50 border ${errors.firstName ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'} hover:border-slate-300 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all placeholder:text-slate-450 focus:ring-2`}
                                    placeholder="Enter first name"
                                    value={firstName}
                                    onChange={(e) => {
                                        setFirstName(e.target.value);
                                        if (e.target.value.trim() && errors.firstName) {
                                            const updated = { ...errors };
                                            delete updated.firstName;
                                            setErrors(updated);
                                        }
                                    }}
                                />
                                {errors.firstName && (
                                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1.5">
                                        {errors.firstName}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <User size={13} className="text-slate-400" />
                                    Last Name
                                </label>
                                <input 
                                    type="text"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-indigo-100 rounded-xl text-sm text-slate-800 outline-none transition-all placeholder:text-slate-450 focus:ring-2"
                                    placeholder="Enter last name (optional)"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Corporate Role details */}
                        <div id="error-anchor-role">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1 flex-row">
                                <Briefcase size={13} className="text-slate-400" />
                                Property Role <span className="text-red-500">*</span>
                            </label>
                            
                            <div className="relative">
                                <select 
                                    className={`w-full px-4 py-3 bg-slate-50 border ${errors.role ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'} hover:border-slate-300 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all appearance-none cursor-pointer focus:ring-2`}
                                    value={role}
                                    onChange={(e) => {
                                        setRole(e.target.value);
                                        if (e.target.value && errors.role) {
                                            const updated = { ...errors };
                                            delete updated.role;
                                            setErrors(updated);
                                        }
                                    }}
                                >
                                    <option value="">Select your role...</option>
                                    {ROLES.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                                <span className="absolute right-4 top-3.5 text-slate-400 pointer-events-none">
                                    <ChevronDown size={16} />
                                </span>
                            </div>
                            {errors.role && (
                                <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1.5">
                                    {errors.role}
                                </p>
                            )}
                        </div>

                        {/* Toggle Brand Audit Lead */}
                        <div className={`p-5 rounded-2xl flex flex-col gap-4 border transition-colors ${
                            existingLeadConflict 
                                ? 'bg-amber-50/40 border-amber-200/60' 
                                : 'bg-indigo-50/30 border-slate-100/80 hover:bg-indigo-50/50'
                        }`}>
                            <div className="flex items-start justify-between gap-5 select-none">
                                <div className="space-y-1">
                                    <span className={`block text-xs font-black tracking-tight flex items-center gap-1.5 ${
                                        existingLeadConflict ? 'text-slate-800' : 'text-slate-800'
                                    }`}>
                                        Brand Audit Lead
                                    </span>
                                    <span className="block text-[10px] text-slate-450 leading-relaxed font-semibold">
                                        Check this active toggle indicator if you are the main leader executing and managing Brand Audit sessions for this property.
                                    </span>
                                </div>
                                
                                {/* Stylish IOS-style switch */}
                                <button
                                    type="button"
                                    disabled={!!existingLeadConflict}
                                    onClick={() => {
                                        if (!existingLeadConflict) {
                                            setIsAuditLead(!isAuditLead);
                                        }
                                    }}
                                    className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-colors duration-250 shrink-0 ${
                                        existingLeadConflict 
                                            ? 'bg-slate-100 cursor-not-allowed opacity-50' 
                                            : isAuditLead 
                                                ? 'bg-emerald-600 cursor-pointer' 
                                                : 'bg-slate-200 cursor-pointer'
                                    }`}
                                >
                                    <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-250 ${isAuditLead ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {existingLeadConflict && (
                                <div className="p-3.5 bg-amber-50/80 border border-amber-100 rounded-xl text-[11px] text-slate-600 leading-relaxed animate-fadeIn">
                                    <p className="font-bold text-amber-800 mb-1 flex items-center gap-1">
                                        <Sparkles size={12} className="shrink-0 text-amber-600" />
                                        Brand Audit Lead Registered
                                    </p>
                                    <p className="text-slate-600 font-medium">
                                        This hotel property already has an assigned Brand Audit Lead:
                                    </p>
                                    <div className="mt-1.5 bg-white/70 px-2.5 py-1.5 rounded-lg border border-amber-200/50">
                                        <p className="font-extrabold text-slate-800">
                                            {[existingLeadConflict.lead.first_name, existingLeadConflict.lead.last_name].filter(Boolean).join(' ') || 'Registered Lead'}
                                        </p>
                                        <p className="text-[10px] font-semibold text-slate-500 font-mono">
                                            {existingLeadConflict.lead.email}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Core Form Actions */}
                        <div className="pt-2 flex flex-col sm:flex-row gap-3">
                            {/* Sign Out option */}
                            <button
                                type="button"
                                onClick={onLogout}
                                className="order-2 sm:order-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest h-12 rounded-xl transition-all flex items-center justify-center gap-2 max-sm:w-full select-none"
                            >
                                <LogOut size={13} />
                                Sign Out
                            </button>
                            
                            {/* Onboarding Complete submission button */}
                            <button
                                type="submit"
                                disabled={isSubmitting || isLoadingHotels}
                                className="order-1 sm:order-2 flex-grow bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs uppercase tracking-widest h-12 rounded-xl shadow-[0_4px_12px_rgba(15,23,42,0.1)] active:scale-[0.98] hover:-translate-y-0.5 transition-all outline-none duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin" />
                                        Please Wait...
                                    </>
                                ) : (
                                    <>
                                        <Check size={13} />
                                        Complete Registration
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
