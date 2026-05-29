import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Clock, Building, BarChart3, ChevronRight, Plus, Trash2, Edit, Search, X, AlertCircle, MapPin, Settings2, Calendar, Star, Briefcase, ClipboardList, FileCheck, Layers, Package, Camera, ImageIcon, FileText, Hash, Type, CheckSquare, Users, ShieldCheck, Percent, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface Department {
    id: string;
    name: string;
    head: string;
}

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

interface AuditBatch {
    id: string;
    name: string;
    status: 'Active' | 'Completed' | 'Upcoming';
    hotelIds?: string[];
}

interface AuditCategory {
    id: string;
    name: string;
    totalTasks: number;
    completed: number;
    departmentId?: string;
}

interface AuditItem {
    id: string;
    name: string;
    itemDescription?: string;
    departmentId: string;
    categoryId: string;
    inputType: 'camera' | 'image' | 'document' | 'numeric' | 'text' | 'checkbox' | 'score';
    points?: number;
    description?: string;
}

interface AuditGroup {
    id: string;
    name: string;
    description?: string;
    categoryIds?: string[];
    itemIds: string[];
}

const DEFAULT_GROUPS: AuditGroup[] = [
    { id: '1', name: 'Front Office Excellence Group', description: 'Standard criteria checking reception and guest greeting compliance.', itemIds: ['1', '2'] },
    { id: '2', name: 'Safety & Hygiene Standard Group', description: 'Master check list for public spaces and hygiene protocols.', itemIds: ['3', '4'] },
];

const DEFAULT_BATCHES: AuditBatch[] = [
    { id: '1', name: 'Batch 1', status: 'Active', hotelIds: ['1', '2'] },
    { id: '2', name: 'Batch 2', status: 'Completed', hotelIds: ['3'] },
    { id: '3', name: 'Batch 3', status: 'Upcoming', hotelIds: [] },
    { id: '4', name: 'Batch 4', status: 'Upcoming', hotelIds: ['1', '4'] },
];

const DEFAULT_CATEGORIES: AuditCategory[] = [
    { id: '1', name: "I. BRANDING & PROPERTY IDENTIFICATION", totalTasks: 5, completed: 2 },
    { id: '2', name: "II. BRANDING AT RECEPTION / FRONT OFFICE", totalTasks: 4, completed: 0 },
    { id: '3', name: "III. BRANDING IN GUEST ROOM", totalTasks: 6, completed: 1 },
    { id: '4', name: "SWISS-CARE AMENITIES", totalTasks: 3, completed: 3 },
    { id: '5', name: "IV. BRANDING IN FOOD & BEVERAGE AND BANQUET", totalTasks: 8, completed: 0 },
    { id: '6', name: "V. SALES & MARKETING - PHYSICAL", totalTasks: 4, completed: 2 },
    { id: '7', name: "VI. SALES & MARKETING - DIGITAL", totalTasks: 5, completed: 0 },
    { id: '8', name: "VII. BRANDING AT PUBLIC AREAS", totalTasks: 6, completed: 4 },
    { id: '9', name: "VIII. BRANDING AT BACK OFFICE & STAFF", totalTasks: 3, completed: 0 },
    { id: '10', name: "IX. BONUS", totalTasks: 2, completed: 0 },
];

const stats = [
    { title: 'Total Submissions', value: '142', icon: BarChart3, color: 'text-indigo-600' },
    { title: 'Pending Review', value: '18', icon: Clock, color: 'text-amber-600' },
    { title: 'Active Properties', value: '24', icon: Building, color: 'text-emerald-600' },
];

const recentSubmissions = [
    { property: 'Swiss-Belhotel Seef', audit: 'Lobby & Reception', status: 'Pending', date: 'May 20' },
    { property: 'Swiss-Belresidences Juffair', audit: 'Guest Rooms', status: 'Approved', date: 'May 19' },
    { property: 'Swiss-Belinn Airport Jakarta', audit: 'F&B Outlets', status: 'Pending', date: 'May 19' },
];

const DEFAULT_DEPARTMENTS: Department[] = [
    { id: '1', name: 'Digital Marketing', head: 'Hidayat Jayawardana' },
    { id: '2', name: 'Marcomm & Branding', head: 'Nadya Frederica' },
    { id: '3', name: 'CRM & Loyalty', head: 'Mohammad Jawhar' },
    { id: '4', name: 'Online Reputation', head: 'Rangga Permana' },
];

const DEFAULT_HOTELS: Hotel[] = [
    { 
        id: '1', 
        name: 'Swiss-Belhotel Seef', 
        location: 'Manama, Bahrain', 
        code: 'SBSE',
        brandClass: 'Swiss-Belhotel',
        region: 'Middle East',
        country: 'Bahrain',
        stars: 4
    },
    { 
        id: '2', 
        name: 'Swiss-Belresidences Juffair', 
        location: 'Juffair, Bahrain', 
        code: 'SBJU',
        brandClass: 'Swiss-Belresidences',
        region: 'Middle East',
        country: 'Bahrain',
        stars: 4
    },
    { 
        id: '3', 
        name: 'Swiss-Belinn Airport Jakarta', 
        location: 'Jakarta, Indonesia', 
        code: 'SBAJ',
        brandClass: 'Swiss-Belinn',
        region: 'Asia Pacific',
        country: 'Indonesia',
        stars: 3
    },
    { 
        id: '4', 
        name: 'Swiss-Belresidences Kalibata', 
        location: 'Jakarta, Indonesia', 
        code: 'SBKA',
        brandClass: 'Swiss-Belresidences',
        region: 'Asia Pacific',
        country: 'Indonesia',
        stars: 4
    },
];

const HOTEL_BRANDS = [
    'Swiss-Belhotel',
    'Swiss-Belresidences',
    'Swiss-Belinn',
    'Swiss-Belsuites',
    'Swiss-Belboutique',
    'Swiss-Belresort',
    'Grand Swiss-Belhotel',
    'Swiss-Belexpress'
];

const HOTELS_URL = (import.meta as any).env.HOTELS_SUPABASE_URL || 'https://kjqnkrmmbintlhalubrf.supabase.co/rest/v1/';
const HOTELS_KEY = (import.meta as any).env.HOTELS_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqcW5rcm1tYmludGxoYWx1YnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjcxNzAwMDc2MTAsImV4cCI6MjA4NTU4MzYxMH0.oSMFcsvmx-VLvH3o9iX0Sn1XbZblcFbicOHzs-kTtdc';

const MAIN_URL_RAW = (import.meta as any).env.MAIN_SUPABASE_URL || 'https://gvnwxrejgdkixbszhxkw.supabase.co/rest/v1/';
const MAIN_KEY = (import.meta as any).env.MAIN_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bnd4cmVqZ2RraXhic3poeGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTE2ODcsImV4cCI6MjA5NDcyNzY4N30.Pvv9rgR_Vr9McwxLrYfELeSpWYLNH2NPw0nkeGD6ZXo';

// Align MAIN_URL and MAIN_KEY to prevent mismatched environment URL and Key project references
const getAlignedMainUrl = (rawUrl: string, key: string): string => {
    let url = rawUrl;
    try {
        const parts = key.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload && payload.ref) {
                const keyRef = payload.ref;
                if (!url.includes(keyRef)) {
                    console.warn(`Supabase MAIN_URL and MAIN_KEY project ref mismatch. Correcting project ref to ${keyRef}`);
                    url = `https://${keyRef}.supabase.co/rest/v1/`;
                }
            }
        }
    } catch (e) {
        console.error("Error aligning Supabase URL:", e);
    }
    return url;
};

const MAIN_URL = getAlignedMainUrl(MAIN_URL_RAW, MAIN_KEY);

export default function AdminPanelScreen({ onBack }: { onBack: () => void }) {
    const [subView, setSubView] = useState<'dashboard' | 'departments' | 'hotels' | 'batches' | 'categories' | 'items' | 'groups'>('dashboard');

    // CRUD state for Audit Groups
    const [groups, setGroups] = useState<AuditGroup[]>(() => {
        const saved = localStorage.getItem('sbi_audit_groups_v2');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Error parsing groups", e);
            }
        }
        return DEFAULT_GROUPS;
    });

    useEffect(() => {
        localStorage.setItem('sbi_audit_groups_v2', JSON.stringify(groups));
    }, [groups]);

    // CRUD state for Categories
    const [catList, setCatList] = useState<AuditCategory[]>([]);

    // Fetch categories function
    const fetchCategoriesFromSupabase = async () => {
        setIsSupabaseLoading(true);
        setSupabaseErrorMsg(null);
        try {
            const response = await fetch(`${MAIN_URL}audit_categories?select=*&order=name.asc`, {
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch categories: HTTP ${response.status}`);
            }
            const data = await response.json();
            
            const mapped: AuditCategory[] = data.map((item: any) => ({
                id: String(item.id),
                name: item.name,
                totalTasks: item.total_tasks || 5, // Map to DB column
                completed: item.completed || 0,
                departmentId: item.department_id ? String(item.department_id) : undefined
            }));
            
            setCatList(mapped);
            setSupabaseConnected(true);
        } catch (err: any) {
            console.error("Supabase fetch categories error:", err);
            setSupabaseConnected(false);
            setSupabaseErrorMsg(err.message || 'Verification failed');
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    // CRUD state for Items
    const [items, setItems] = useState<AuditItem[]>([]);

    const fetchItemsFromSupabase = async () => {
        setIsSupabaseLoading(true);
        setSupabaseErrorMsg(null);
        try {
            const response = await fetch(`${MAIN_URL}audit_items?select=*&order=name.asc`, {
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });
            if (!response.ok && response.status !== 404) {
                 throw new Error(`Failed to fetch items: HTTP ${response.status}`);
            }
            const data = response.ok ? await response.json() : [];
            
            const mapped: AuditItem[] = data.map((item: any) => ({
                id: String(item.id),
                name: item.name,
                departmentId: String(item.department_id),
                categoryId: String(item.category_id),
                inputType: item.input_type as AuditItem['inputType'],
                points: item.points !== undefined && item.points !== null ? Number(item.points) : (item.point !== undefined && item.point !== null ? Number(item.point) : 5),
                description: item.description
            }));
            
            setItems(mapped);
            setSupabaseConnected(true);
        } catch (err: any) {
            console.error("Supabase fetch items error:", err);
            setSupabaseConnected(false);
            setSupabaseErrorMsg(err.message || 'Verification failed');
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    // CRUD state for Audit Batches
    const [batches, setBatches] = useState<AuditBatch[]>(() => {
        const saved = localStorage.getItem('sbi_audit_batches_v2');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Error parsing batches", e);
            }
        }
        return DEFAULT_BATCHES;
    });

    useEffect(() => {
        localStorage.setItem('sbi_audit_batches_v2', JSON.stringify(batches));
    }, [batches]);

    // Supabase states
    const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
    const [isSupabaseLoading, setIsSupabaseLoading] = useState(false);
    const [supabaseErrorMsg, setSupabaseErrorMsg] = useState<string | null>(null);

    // CRUD state for Departments
    const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);

    // Fetch departments function
    const fetchDepartmentsFromSupabase = async () => {
        setIsSupabaseLoading(true);
        setSupabaseErrorMsg(null);
        try {
            const response = await fetch(`${MAIN_URL}audit_departments?select=*&order=name.asc`, {
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch departments: HTTP ${response.status}`);
            }
            const data = await response.json();
            
            const mapped: Department[] = data.map((item: any) => ({
                id: String(item.id),
                name: item.name,
                head: item.head
            }));
            
            setDepartments(mapped);
            setSupabaseConnected(true);
        } catch (err: any) {
            console.error("Supabase fetch departments error:", err);
            setSupabaseConnected(false);
            setSupabaseErrorMsg(err.message || 'Verification failed');
            // Retain existing known departments or fallback on error
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    // CRUD state for Hotels (loads cached hotels initially as offline fallback)
    const [hotels, setHotels] = useState<Hotel[]>(() => {
        const saved = localStorage.getItem('sbi_audit_hotels_v2');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Error parsing hotels", e);
            }
        }
        return DEFAULT_HOTELS;
    });

    // Fetch hotels function
    const fetchHotelsFromSupabase = async () => {
        setIsSupabaseLoading(true);
        setSupabaseErrorMsg(null);
        try {
            const response = await fetch(`${HOTELS_URL}hotels?select=*`, {
                headers: {
                    'apikey': HOTELS_KEY,
                    'Authorization': `Bearer ${HOTELS_KEY}`
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch database: HTTP ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            
            // Map Supabase layout to local structure
            const mapped: Hotel[] = data.map((item: any) => {
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
                    } else if (countryLower.includes('indonesia') || countryLower.includes('malaysia') || countryLower.includes('philippines') || countryLower.includes('vietnam') || countryLower.includes('thailand') || countryLower.includes('asia')) {
                        region = 'Asia Pacific';
                    } else if (countryLower.includes('australia') || countryLower.includes('zealand') || countryLower.includes('oceania')) {
                        region = 'Oceania';
                    } else {
                        region = 'Asia Pacific';
                    }
                }

                let stars = item.stars || item.star_rating || item.star_class || item.rating;
                if (!stars) {
                    const nameLower = (item.name || item.hotel_name || '').toLowerCase();
                    if (nameLower.includes('grand') || nameLower.includes('resort') || nameLower.includes('suites') || nameLower.includes('boutique') || nameLower.includes('seef')) {
                        stars = 5;
                    } else if (nameLower.includes('inn') || nameLower.includes('express')) {
                        stars = 3;
                    } else {
                        stars = 4;
                    }
                }

                return {
                    id: item.id ? String(item.id) : Date.now().toString() + Math.random().toString(),
                    name: item.name || item.hotel_name || '',
                    location: item.location || item.city_country || '',
                    code: item.code || '',
                    brandClass: item.brandClass || item.brand_class || item.brand || 'Swiss-Belhotel',
                    region: region,
                    country: country,
                    stars: Number(stars) || 4
                };
            });
            
            setHotels(mapped);
            setSupabaseConnected(true);
            setSupabaseErrorMsg(null);
        } catch (err: any) {
            console.error("Supabase fetch error:", err);
            setSupabaseConnected(false);
            setSupabaseErrorMsg(err.message || 'Verification failed');
            // Retain existing local hotels on error as fallback
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    // Fetch batches function
    const fetchBatchesFromSupabase = async () => {
        setIsSupabaseLoading(true);
        setSupabaseErrorMsg(null);
        try {
            // Fetch batches from Supabase "audit_batches" table
            const responseB = await fetch(`${MAIN_URL}audit_batches?select=*&order=name.asc`, {
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });
            if (!responseB.ok && responseB.status !== 404) {
                throw new Error(`Failed to fetch audit batches: HTTP ${responseB.status}`);
            }
            let batchesData = [];
            if (responseB.ok) {
                batchesData = await responseB.json();
            }

            // Fetch junction Mapping from "audit_batch_hotels" table
            const responseJ = await fetch(`${MAIN_URL}audit_batch_hotels?select=*`, {
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });
            let mappings: any[] = [];
            if (responseJ.ok) {
                mappings = await responseJ.json();
            }

            // Map standard entries
            const mappedBatches: AuditBatch[] = batchesData.map((b: any) => {
                const linked = mappings
                    .filter((m: any) => String(m.batch_id) === String(b.id))
                    .map((m: any) => String(m.hotel_id));
                return {
                    id: String(b.id),
                    name: b.name || '',
                    status: b.status || 'Upcoming',
                    hotelIds: linked
                };
            });

            if (mappedBatches.length > 0) {
                setBatches(mappedBatches);
            }
            setSupabaseConnected(true);
            setSupabaseErrorMsg(null);
        } catch (err: any) {
            console.error("Error fetching batches:", err);
            setSupabaseConnected(false);
            setSupabaseErrorMsg(err.message || 'Verification failed');
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    useEffect(() => {
        localStorage.setItem('sbi_audit_hotels_v2', JSON.stringify(hotels));
    }, [hotels]);

    // Perform database sync on subView transition and initialization
    useEffect(() => {
        fetchHotelsFromSupabase();
        fetchBatchesFromSupabase();
        fetchDepartmentsFromSupabase();
        fetchCategoriesFromSupabase();
        fetchItemsFromSupabase();
    }, []);

    useEffect(() => {
        if (subView === 'hotels') {
            fetchHotelsFromSupabase();
        } else if (subView === 'batches') {
            fetchHotelsFromSupabase();
            fetchBatchesFromSupabase();
        } else if (subView === 'departments') {
            fetchDepartmentsFromSupabase();
        } else if (subView === 'categories') {
            fetchCategoriesFromSupabase();
        } else if (subView === 'items') {
            fetchItemsFromSupabase();
        }
    }, [subView]);

    // Toast and Dialog states
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Department Dialog states
    const [isDeptFormOpen, setIsDeptFormOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [deptName, setDeptName] = useState('');
    const [deptHead, setDeptHead] = useState('');
    const [confirmDeptDeleteId, setConfirmDeptDeleteId] = useState<string | null>(null);
    const [deptError, setDeptError] = useState('');

    // Hotel Dialog states
    const [isHotelFormOpen, setIsHotelFormOpen] = useState(false);
    const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
    const [hotelName, setHotelName] = useState('');
    const [hotelCode, setHotelCode] = useState('');
    const [hotelLocation, setHotelLocation] = useState('');
    const [hotelBrandClass, setHotelBrandClass] = useState('Swiss-Belhotel');
    const [hotelRegion, setHotelRegion] = useState('Asia Pacific');
    const [hotelCountry, setHotelCountry] = useState('Indonesia');
    const [hotelStars, setHotelStars] = useState<number>(4);
    const [confirmHotelDeleteId, setConfirmHotelDeleteId] = useState<string | null>(null);
    const [hotelError, setHotelError] = useState('');

    // Batch Dialog states
    const [isBatchFormOpen, setIsBatchFormOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState<AuditBatch | null>(null);
    const [batchName, setBatchName] = useState('');
    const [batchStatus, setBatchStatus] = useState<'Active' | 'Completed' | 'Upcoming'>('Active');
    const [confirmBatchDeleteId, setConfirmBatchDeleteId] = useState<string | null>(null);
    const [batchError, setBatchError] = useState('');
    
    // Dynamic selection (dual-list box) states for hotels
    const [assignedHotelIds, setAssignedHotelIds] = useState<string[]>([]);
    const [selectedAvailableIds, setSelectedAvailableIds] = useState<string[]>([]);
    const [selectedAssignedIds, setSelectedAssignedIds] = useState<string[]>([]);
    const [availableSearchQuery, setAvailableSearchQuery] = useState('');
    const [assignedSearchQuery, setAssignedSearchQuery] = useState('');

    const toggleAvailableSelected = (id: string) => {
        setSelectedAvailableIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleAssignedSelected = (id: string) => {
        setSelectedAssignedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const getHotelCode = (hotel: Hotel) => {
        if (hotel.code) return hotel.code;
        let clean = hotel.name.toLowerCase();
        clean = clean.replace(/\b(by|and|for|the|at|in|of|hotel|residences|resort|inn|airport)\b/g, '');
        const parts = clean.toUpperCase().split(/[^A-Z]/).filter(Boolean);
        const acronym = parts.map(p => p[0]).join('');
        if (acronym.length >= 2) {
            return acronym.slice(0, 4);
        }
        return hotel.name.slice(0, 4).toUpperCase();
    };

    const moveSelectedToAssigned = () => {
        if (selectedAvailableIds.length === 0) return;
        setAssignedHotelIds(prev => [...new Set([...prev, ...selectedAvailableIds])]);
        setSelectedAvailableIds([]);
    };

    const moveSelectedToAvailable = () => {
        if (selectedAssignedIds.length === 0) return;
        setAssignedHotelIds(prev => prev.filter(id => !selectedAssignedIds.includes(id)));
        setSelectedAssignedIds([]);
    };

    const moveAllToAssigned = () => {
        const availableHotels = hotels.filter(h => !assignedHotelIds.includes(h.id));
        const filteredAvailable = availableHotels.filter(h => 
            h.name.toLowerCase().includes(availableSearchQuery.toLowerCase()) ||
            (h.brandClass && h.brandClass.toLowerCase().includes(availableSearchQuery.toLowerCase()))
        );
        const remainingAvailableIds = filteredAvailable.map(h => h.id);
        setAssignedHotelIds(prev => [...new Set([...prev, ...remainingAvailableIds])]);
        setSelectedAvailableIds([]);
    };

    const moveAllToAvailable = () => {
        const assignedHotels = hotels.filter(h => assignedHotelIds.includes(h.id));
        const filteredAssigned = assignedHotels.filter(h => 
            h.name.toLowerCase().includes(assignedSearchQuery.toLowerCase()) ||
            (h.brandClass && h.brandClass.toLowerCase().includes(assignedSearchQuery.toLowerCase()))
        );
        const activeFilteredAssignedIds = filteredAssigned.map(h => h.id);
        setAssignedHotelIds(prev => prev.filter(id => !activeFilteredAssignedIds.includes(id)));
        setSelectedAssignedIds([]);
    };

    // Category Dialog states
    const [isCatFormOpen, setIsCatFormOpen] = useState(false);
    const [editingCat, setEditingCat] = useState<AuditCategory | null>(null);
    const [catName, setCatName] = useState('');
    const [catTotalTasks, setCatTotalTasks] = useState(5);
    const [catCompleted, setCatCompleted] = useState(0);
    const [catDepartmentId, setCatDepartmentId] = useState('');
    const [confirmCatDeleteId, setConfirmCatDeleteId] = useState<string | null>(null);
    const [catError, setCatError] = useState('');

    // Item Dialog states
    const [isItemFormOpen, setIsItemFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AuditItem | null>(null);
    const [itemName, setItemName] = useState('');
    const [itemDepartmentId, setItemDepartmentId] = useState('');
    const [itemCategoryId, setItemCategoryId] = useState('');
    const [itemInputType, setItemInputType] = useState<AuditItem['inputType']>('text');
    const [itemInstruction, setItemInstruction] = useState('');
    const [itemItemDescription, setItemItemDescription] = useState('');
    const [itemPoints, setItemPoints] = useState<number>(5);
    const [itemError, setItemError] = useState('');
    const [confirmItemDeleteId, setConfirmItemDeleteId] = useState<string | null>(null);

    // Audit Group Dialog states
    const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<AuditGroup | null>(null);
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [groupCategoryIds, setGroupCategoryIds] = useState<string[]>([]);
    const [groupItemIds, setGroupItemIds] = useState<string[]>([]);
    const [confirmGroupDeleteId, setConfirmGroupDeleteId] = useState<string | null>(null);
    const [groupError, setGroupError] = useState('');
    const [dialogSearchQuery, setDialogSearchQuery] = useState('');
    const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);

    // Category Drag-and-drop state parameters
    const [draggedCatId, setDraggedCatId] = useState<string | null>(null);
    const [draggedCatSource, setDraggedCatSource] = useState<'available' | 'assigned' | null>(null);
    const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
    const [isDragOverAssigned, setIsDragOverAssigned] = useState(false);

    const handleOpenAddGroup = () => {
        setEditingGroup(null);
        setGroupName('');
        setGroupDescription('');
        setGroupCategoryIds([]);
        setGroupItemIds([]);
        setGroupError('');
        setDialogSearchQuery('');
        setExpandedCategoryIds([]);
        setIsGroupFormOpen(true);
    };

    const handleOpenEditGroup = (group: AuditGroup) => {
        setEditingGroup(group);
        setGroupName(group.name);
        setGroupDescription(group.description || '');
        
        let initialCatIds = group.categoryIds || [];
        if (initialCatIds.length === 0 && group.itemIds && group.itemIds.length > 0) {
            const derived = group.itemIds
                .map(id => items.find(i => i.id === id)?.categoryId)
                .filter((catId): catId is string => !!catId);
            initialCatIds = Array.from(new Set(derived));
        }

        setGroupCategoryIds(initialCatIds);
        setGroupItemIds(group.itemIds || []);
        setGroupError('');
        setDialogSearchQuery('');
        setExpandedCategoryIds(initialCatIds);
        setIsGroupFormOpen(true);
    };

    const handleDeleteGroup = (id: string) => {
        setGroups(prev => prev.filter(g => g.id !== id));
        setToastMessage("Audit Group deleted successfully!");
        setConfirmGroupDeleteId(null);
    };

    const handleSaveGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName.trim()) {
            setGroupError("Group name is required.");
            return;
        }

        const groupData = {
            name: groupName.trim(),
            description: groupDescription.trim(),
            categoryIds: groupCategoryIds,
            itemIds: groupItemIds
        };

        if (editingGroup) {
            setGroups(prev => prev.map(g => g.id === editingGroup.id ? { ...g, ...groupData } : g));
            setToastMessage("Audit Group updated successfully!");
        } else {
            const newId = String(Date.now());
            setGroups(prev => [...prev, { id: newId, ...groupData }]);
            setToastMessage("Audit Group created successfully!");
        }

        setIsGroupFormOpen(false);
    };

    // Category Drag and Drop helper functions
    const handleDragStartAvailableCat = (e: React.DragEvent, catId: string) => {
        setDraggedCatId(catId);
        setDraggedCatSource('available');
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragStartAssignedCat = (e: React.DragEvent, catId: string, index: number) => {
        setDraggedCatId(catId);
        setDraggedCatSource('assigned');
        setDraggedCatIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDropOnAvailableCatZone = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedCatSource === 'assigned' && draggedCatId) {
            handleQuickRemoveCat(draggedCatId);
        }
        setDraggedCatId(null);
        setDraggedCatSource(null);
        setDraggedCatIndex(null);
    };

    const handleDropOnAssignedCatZone = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOverAssigned(false);
        if (!draggedCatId) return;

        if (draggedCatSource === 'available') {
            if (!groupCategoryIds.includes(draggedCatId)) {
                setGroupCategoryIds(prev => [...prev, draggedCatId]);
                if (!expandedCategoryIds.includes(draggedCatId)) {
                    setExpandedCategoryIds(prev => [...prev, draggedCatId]);
                }
                const catItems = items.filter(it => it.categoryId === draggedCatId).map(it => it.id);
                setGroupItemIds(prev => {
                    const next = [...prev];
                    catItems.forEach(id => {
                        if (!next.includes(id)) next.push(id);
                    });
                    return next;
                });
            }
        }
        setDraggedCatId(null);
        setDraggedCatSource(null);
        setDraggedCatIndex(null);
    };

    const handleDropOnAssignedCatItem = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverAssigned(false);
        if (!draggedCatId) return;

        if (draggedCatSource === 'assigned' && draggedCatIndex !== null) {
            const newIds = [...groupCategoryIds];
            const [removed] = newIds.splice(draggedCatIndex, 1);
            newIds.splice(targetIndex, 0, removed);
            setGroupCategoryIds(newIds);
        } else if (draggedCatSource === 'available') {
            if (!groupCategoryIds.includes(draggedCatId)) {
                const newIds = [...groupCategoryIds];
                newIds.splice(targetIndex, 0, draggedCatId);
                setGroupCategoryIds(newIds);
                if (!expandedCategoryIds.includes(draggedCatId)) {
                    setExpandedCategoryIds(prev => [...prev, draggedCatId]);
                }
                const catItems = items.filter(it => it.categoryId === draggedCatId).map(it => it.id);
                setGroupItemIds(prev => {
                    const next = [...prev];
                    catItems.forEach(id => {
                        if (!next.includes(id)) next.push(id);
                    });
                    return next;
                });
            }
        }

        setDraggedCatId(null);
        setDraggedCatSource(null);
        setDraggedCatIndex(null);
    };

    const handleQuickAddCat = (catId: string) => {
        if (!groupCategoryIds.includes(catId)) {
            setGroupCategoryIds(prev => [...prev, catId]);
            if (!expandedCategoryIds.includes(catId)) {
                setExpandedCategoryIds(prev => [...prev, catId]);
            }
            const catItems = items.filter(it => it.categoryId === catId).map(it => it.id);
            setGroupItemIds(prev => {
                const next = [...prev];
                catItems.forEach(id => {
                    if (!next.includes(id)) next.push(id);
                });
                return next;
            });
        }
    };

    const handleQuickRemoveCat = (catId: string) => {
        setGroupCategoryIds(prev => prev.filter(id => id !== catId));
        const catItemIds = items.filter(it => it.categoryId === catId).map(it => it.id);
        setGroupItemIds(prev => prev.filter(id => !catItemIds.includes(id)));
    };

    const handleMoveCatUp = (index: number) => {
        if (index === 0) return;
        const newIds = [...groupCategoryIds];
        const temp = newIds[index];
        newIds[index] = newIds[index - 1];
        newIds[index - 1] = temp;
        setGroupCategoryIds(newIds);
    };

    const handleMoveCatDown = (index: number) => {
        if (index === groupCategoryIds.length - 1) return;
        const newIds = [...groupCategoryIds];
        const temp = newIds[index];
        newIds[index] = newIds[index + 1];
        newIds[index + 1] = temp;
        setGroupCategoryIds(newIds);
    };

    const toggleExpandCategory = (catId: string) => {
        setExpandedCategoryIds(prev => 
            prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
        );
    };

    const handleToggleItemCheckbox = (itemId: string) => {
        setGroupItemIds(prev => 
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };

    const handleToggleCategoryAllItems = (catId: string, value: boolean) => {
        const catItemIds = items.filter(it => it.categoryId === catId).map(it => it.id);
        if (value) {
            setGroupItemIds(prev => {
                const next = [...prev];
                catItemIds.forEach(id => {
                    if (!next.includes(id)) next.push(id);
                });
                return next;
            });
        } else {
            setGroupItemIds(prev => prev.filter(id => !catItemIds.includes(id)));
        }
    };

    // Toast auto-clear
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => {
                setToastMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // Handlers for Departments
    const handleOpenAddDept = () => {
        setEditingDept(null);
        setDeptName('');
        setDeptHead('');
        setDeptError('');
        setIsDeptFormOpen(true);
    };

    const handleOpenEditDept = (dept: Department) => {
        setEditingDept(dept);
        setDeptName(dept.name);
        setDeptHead(dept.head);
        setDeptError('');
        setIsDeptFormOpen(true);
    };

    const handleSaveDept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deptName.trim() || !deptHead.trim()) {
            setDeptError('Please complete all department fields.');
            return;
        }

        setIsSupabaseLoading(true);
        try {
            if (editingDept) {
                const response = await fetch(`${MAIN_URL}audit_departments?id=eq.${editingDept.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: deptName.trim(), head: deptHead.trim() })
                });
                if (!response.ok) throw new Error('Failed to update department');
                
                setDepartments(prev => prev.map(d => d.id === editingDept.id ? { ...d, name: deptName.trim(), head: deptHead.trim() } : d));
                setToastMessage('Department successfully updated in Database!');
            } else {
                const newDeptData = { name: deptName.trim(), head: deptHead.trim() };
                const response = await fetch(`${MAIN_URL}audit_departments`, {
                    method: 'POST',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(newDeptData)
                });
                if (!response.ok) throw new Error('Failed to create department');
                const data = await response.json();
                
                setDepartments(prev => [...prev, { id: data[0].id, name: data[0].name, head: data[0].head }]);
                setToastMessage('New department created in Database!');
            }
            setIsDeptFormOpen(false);
            setDeptName('');
            setDeptHead('');
            setDeptError('');
        } catch (err: any) {
            console.error("Save department error:", err);
            setDeptError('Database operation failed.');
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    const handleDeleteDept = async (id: string) => {
        setIsSupabaseLoading(true);
        try {
            const response = await fetch(`${MAIN_URL}audit_departments?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });
            if (!response.ok) throw new Error('Failed to delete department');
            
            setDepartments(prev => prev.filter(d => d.id !== id));
            setConfirmDeptDeleteId(null);
            setToastMessage('Department removed from Database.');
        } catch (err: any) {
            console.error("Delete department error:", err);
            setToastMessage('Failed to delete from Database.');
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    // Handlers for Items
    const handleOpenAddItem = () => {
        setEditingItem(null);
        setItemName('');
        setItemDepartmentId('');
        setItemCategoryId('');
        setItemInputType('text');
        setItemPoints(5);
        setItemInstruction('');
        setItemItemDescription('');
        setItemError('');
        setIsItemFormOpen(true);
    };

    const handleOpenEditItem = (item: AuditItem) => {
        setEditingItem(item);
        setItemName(item.name);
        setItemDepartmentId(item.departmentId);
        setItemCategoryId(item.categoryId);
        setItemInputType(item.inputType);
        setItemPoints(item.points ?? 5);
        setItemInstruction(item.description || '');
        setItemItemDescription(item.itemDescription || '');
        setItemError('');
        setIsItemFormOpen(true);
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName.trim() || !itemDepartmentId || !itemCategoryId) {
            setItemError('Please complete all required fields.');
            return;
        }

        setIsSupabaseLoading(true);
        try {
            const itemData = { 
                name: itemName.trim(),
                department_id: itemDepartmentId,
                category_id: itemCategoryId,
                input_type: itemInputType,
                points: itemPoints,
                description: itemInstruction.trim() || null,
                item_description: itemItemDescription.trim() || null
            };

            if (editingItem) {
                const response = await fetch(`${MAIN_URL}audit_items?id=eq.${editingItem.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(itemData)
                });
                if (!response.ok) throw new Error('Failed to update item');
                
                setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...itemData, departmentId: itemDepartmentId, categoryId: itemCategoryId, inputType: itemInputType, points: itemPoints } : i));
                setToastMessage('Item updated successfully in Database!');
            } else {
                const response = await fetch(`${MAIN_URL}audit_items`, {
                    method: 'POST',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(itemData)
                });
                if (!response.ok) throw new Error('Failed to create item');
                const data = await response.json();
                
                setItems(prev => [...prev, { id: String(data[0].id), ...itemData, departmentId: itemDepartmentId, categoryId: itemCategoryId, inputType: itemInputType, points: itemPoints }]);
                setToastMessage('New item added to Database!');
            }

            setIsItemFormOpen(false);
            setItemName('');
            setItemDepartmentId('');
            setItemCategoryId('');
            setItemInputType('text');
            setItemPoints(5);
            setItemInstruction('');
            setItemItemDescription('');
            setItemError('');
        } catch (err: any) {
            console.error("Save item error:", err);
            setItemError('Database operation failed.');
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        setIsSupabaseLoading(true);
        try {
            const response = await fetch(`${MAIN_URL}audit_items?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });
            if (!response.ok) throw new Error('Failed to delete item');
            
            setItems(prev => prev.filter(i => i.id !== id));
            setConfirmItemDeleteId(null);
            setToastMessage('Item removed from Database.');
        } catch (err: any) {
            console.error("Delete item error:", err);
            setToastMessage('Failed to delete from Database.');
        } finally {
            setIsSupabaseLoading(false);
        }
    };
    const handleOpenAddHotel = () => {
        setEditingHotel(null);
        setHotelName('');
        setHotelCode('');
        setHotelLocation('');
        setHotelBrandClass('Swiss-Belhotel');
        setHotelRegion('Asia Pacific');
        setHotelCountry('Indonesia');
        setHotelStars(4);
        setHotelError('');
        setIsHotelFormOpen(true);
    };

    const handleOpenEditHotel = (hotel: Hotel) => {
        setEditingHotel(hotel);
        setHotelName(hotel.name);
        setHotelCode(hotel.code || '');
        setHotelLocation(hotel.location);
        setHotelBrandClass(hotel.brandClass);
        setHotelRegion(hotel.region || 'Asia Pacific');
        setHotelCountry(hotel.country || 'Indonesia');
        setHotelStars(hotel.stars || 4);
        setHotelError('');
        setIsHotelFormOpen(true);
    };

    const handleSaveHotel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hotelName.trim() || !hotelLocation.trim()) {
            setHotelError('Please complete all hotel fields.');
            return;
        }

        setIsSupabaseLoading(true);
        setHotelError('');

        try {
            const payload: any = {
                name: hotelName.trim(),
                location: hotelLocation.trim(),
                brand_class: hotelBrandClass,
                brandClass: hotelBrandClass,
                region: hotelRegion.trim(),
                country: hotelCountry.trim(),
                stars: Number(hotelStars),
                code: hotelCode.trim().toUpperCase()
            };

            let savedInSupabase = false;

            try {
                if (editingHotel) {
                    // Update
                    const response = await fetch(`${HOTELS_URL}hotels?id=eq.${editingHotel.id}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': HOTELS_KEY,
                            'Authorization': `Bearer ${HOTELS_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        savedInSupabase = true;
                    } else {
                        // Fallback retry with basic columns if custom columns are not in schema
                        const basicPayload = {
                            name: hotelName.trim(),
                            location: hotelLocation.trim(),
                            brand_class: hotelBrandClass,
                            brandClass: hotelBrandClass,
                            code: hotelCode.trim().toUpperCase()
                        };
                        const fallbackResponse = await fetch(`${HOTELS_URL}hotels?id=eq.${editingHotel.id}`, {
                            method: 'PATCH',
                            headers: {
                                'apikey': HOTELS_KEY,
                                'Authorization': `Bearer ${HOTELS_KEY}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation'
                            },
                            body: JSON.stringify(basicPayload)
                        });
                        if (fallbackResponse.ok) {
                            savedInSupabase = true;
                        }
                    }
                } else {
                    // Create
                    const response = await fetch(`${HOTELS_URL}hotels`, {
                        method: 'POST',
                        headers: {
                            'apikey': HOTELS_KEY,
                            'Authorization': `Bearer ${HOTELS_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        savedInSupabase = true;
                    } else {
                        // Fallback retry with basic columns or generate random id
                        const basicPayload = {
                            name: hotelName.trim(),
                            location: hotelLocation.trim(),
                            brand_class: hotelBrandClass,
                            brandClass: hotelBrandClass,
                            code: hotelCode.trim().toUpperCase()
                        };
                        const fallbackResponse = await fetch(`${HOTELS_URL}hotels`, {
                            method: 'POST',
                            headers: {
                                'apikey': HOTELS_KEY,
                                'Authorization': `Bearer ${HOTELS_KEY}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation'
                            },
                            body: JSON.stringify(basicPayload)
                        });
                        
                        if (fallbackResponse.ok) {
                            savedInSupabase = true;
                        } else {
                            // Support potential null id columns retry
                            const randomNumericId = Math.floor(Math.random() * 1000000) + 1000;
                            const payloadWithId = {
                                id: randomNumericId,
                                ...basicPayload
                            };
                            const retryResponse = await fetch(`${HOTELS_URL}hotels`, {
                                method: 'POST',
                                headers: {
                                    'apikey': HOTELS_KEY,
                                    'Authorization': `Bearer ${HOTELS_KEY}`,
                                    'Content-Type': 'application/json',
                                    'Prefer': 'return=representation'
                                },
                                body: JSON.stringify(payloadWithId)
                            });
                            if (retryResponse.ok) {
                                savedInSupabase = true;
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn("Supabase writing failed, will do local fallback:", err);
            }

            // Sync or update local state
            if (savedInSupabase) {
                await fetchHotelsFromSupabase();
                // Merge custom fields locally in case they aren't saved in schema
                setHotels(prev => prev.map(h => {
                    const isTarget = editingHotel ? h.id === editingHotel.id : h.name === hotelName.trim();
                    if (isTarget) {
                        return {
                            ...h,
                            region: hotelRegion.trim(),
                            country: hotelCountry.trim(),
                            stars: Number(hotelStars),
                            code: hotelCode.trim().toUpperCase()
                        };
                    }
                    return h;
                }));
                setToastMessage(editingHotel ? 'Hotel successfully updated!' : 'New hotel added!');
            } else {
                // Completely local fallback
                if (editingHotel) {
                    setHotels(prev => prev.map(h => h.id === editingHotel.id ? {
                        ...h,
                        name: hotelName.trim(),
                        location: hotelLocation.trim(),
                        brandClass: hotelBrandClass,
                        region: hotelRegion.trim(),
                        country: hotelCountry.trim(),
                        stars: Number(hotelStars),
                        code: hotelCode.trim().toUpperCase()
                    } : h));
                    setToastMessage('Hotel updated locally (database offline).');
                } else {
                    const newHotel: Hotel = {
                        id: Date.now().toString(),
                        name: hotelName.trim(),
                        location: hotelLocation.trim(),
                        brandClass: hotelBrandClass,
                        region: hotelRegion.trim(),
                        country: hotelCountry.trim(),
                        stars: Number(hotelStars),
                        code: hotelCode.trim().toUpperCase()
                    };
                    setHotels(prev => [...prev, newHotel]);
                    setToastMessage('New hotel added locally (database offline).');
                }
            }

            setIsHotelFormOpen(false);
            setHotelName('');
            setHotelCode('');
            setHotelLocation('');
            setHotelBrandClass('Swiss-Belhotel');
            setHotelError('');
        } catch (err: any) {
            console.error("Save Error:", err);
            setHotelError(`Write Error: ${err.message || 'Operation failed'}`);
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    const handleDeleteHotel = async (id: string) => {
        setIsSupabaseLoading(true);
        try {
            const response = await fetch(`${HOTELS_URL}hotels?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': HOTELS_KEY,
                    'Authorization': `Bearer ${HOTELS_KEY}`
                }
            });

            if (!response.ok) {
                const errorJson = await response.json().catch(() => null);
                throw new Error(errorJson?.message || `Failed to delete from database: HTTP ${response.status}`);
            }

            setToastMessage('Hotel removed from Supabase!');
            await fetchHotelsFromSupabase();
        } catch (err: any) {
            console.error("Supabase Delete Error:", err);
            setToastMessage(`Delete failed: ${err.message}`);
        } finally {
            setIsSupabaseLoading(false);
            setConfirmHotelDeleteId(null);
        }
    };

    // Handlers for Audit Batches
    const handleOpenAddBatch = () => {
        setEditingBatch(null);
        setBatchName('');
        setBatchStatus('Active');
        setAssignedHotelIds([]);
        setSelectedAvailableIds([]);
        setSelectedAssignedIds([]);
        setAvailableSearchQuery('');
        setAssignedSearchQuery('');
        setBatchError('');
        setIsBatchFormOpen(true);
    };

    const handleOpenEditBatch = (batch: AuditBatch) => {
        setEditingBatch(batch);
        setBatchName(batch.name);
        setBatchStatus(batch.status);
        setAssignedHotelIds(batch.hotelIds || []);
        setSelectedAvailableIds([]);
        setSelectedAssignedIds([]);
        setAvailableSearchQuery('');
        setAssignedSearchQuery('');
        setBatchError('');
        setIsBatchFormOpen(true);
    };

    const handleSaveBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!batchName.trim()) {
            setBatchError('Please complete all batch fields.');
            return;
        }

        const batchId = editingBatch ? editingBatch.id : Date.now().toString();
        const batchPayload = {
            id: batchId,
            name: batchName.trim(),
            status: batchStatus
        };

        setIsSupabaseLoading(true);
        try {
            let actualBatchId = batchId;

            // 1. Direct and unambiguous database mutation depending on whether we edit or create
            if (editingBatch) {
                // Update existing batch
                const updateRes = await fetch(`${MAIN_URL}audit_batches?id=eq.${batchId}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({ name: batchPayload.name, status: batchPayload.status })
                });
                if (!updateRes.ok) {
                    throw new Error(`Failed to update batch status in database: HTTP ${updateRes.status}`);
                }
            } else {
                // Create new batch
                const createRes = await fetch(`${MAIN_URL}audit_batches`, {
                    method: 'POST',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(batchPayload)
                });
                if (!createRes.ok) {
                    throw new Error(`Failed to create batch in database: HTTP ${createRes.status}`);
                }
                const resData = await createRes.json();
                if (resData && Array.isArray(resData) && resData[0] && resData[0].id) {
                    actualBatchId = String(resData[0].id);
                }
            }

            // 2. Persist relational junction mappings to "audit_batch_hotels" (delete first, then re-insert current mappings)
            await fetch(`${MAIN_URL}audit_batch_hotels?batch_id=eq.${actualBatchId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });

            if (assignedHotelIds.length > 0) {
                const mappings = assignedHotelIds.map(hId => ({
                    batch_id: actualBatchId,
                    hotel_id: hId
                }));

                await fetch(`${MAIN_URL}audit_batch_hotels`, {
                    method: 'POST',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(mappings)
                });
            }

            // Update state locally on success
            if (editingBatch) {
                setBatches(prev => prev.map(b => b.id === editingBatch.id ? { 
                    ...b, 
                    name: batchName.trim(), 
                    status: batchStatus, 
                    hotelIds: assignedHotelIds
                } : b));
                setToastMessage('Audit Batch successfully updated in Database!');
            } else {
                const newBatch: AuditBatch = {
                    id: actualBatchId,
                    name: batchName.trim(),
                    status: batchStatus,
                    hotelIds: assignedHotelIds
                };
                setBatches(prev => [...prev, newBatch]);
                setToastMessage('New Audit Batch created and saved in Database!');
            }
            setIsBatchFormOpen(false);
            setBatchName('');
            setBatchStatus('Active');
            setAssignedHotelIds([]);
            setSelectedAvailableIds([]);
            setSelectedAssignedIds([]);
            setAvailableSearchQuery('');
            setAssignedSearchQuery('');
            setBatchError('');
        } catch (err: any) {
            console.error("Save batch database operation failed:", err);
            // Fallback gracefully so they can keep working offline/locally
            if (editingBatch) {
                setBatches(prev => prev.map(b => b.id === editingBatch.id ? { 
                    ...b, 
                    name: batchName.trim(), 
                    status: batchStatus, 
                    hotelIds: assignedHotelIds
                } : b));
                setToastMessage('Updated locally (offline mode).');
            } else {
                const newBatch: AuditBatch = {
                    id: batchId,
                    name: batchName.trim(),
                    status: batchStatus,
                    hotelIds: assignedHotelIds
                };
                setBatches(prev => [...prev, newBatch]);
                setToastMessage('Created locally (offline mode).');
            }
            setIsBatchFormOpen(false);
            setBatchName('');
            setBatchStatus('Active');
            setAssignedHotelIds([]);
            setSelectedAvailableIds([]);
            setSelectedAssignedIds([]);
            setAvailableSearchQuery('');
            setAssignedSearchQuery('');
            setBatchError('');
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    const handleDeleteBatch = async (id: string) => {
        setIsSupabaseLoading(true);
        try {
            // First clear its junction links in "audit_batch_hotels"
            await fetch(`${MAIN_URL}audit_batch_hotels?batch_id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });

            // Delete actual record from "audit_batches" table
            await fetch(`${MAIN_URL}audit_batches?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });

            setBatches(prev => prev.filter(b => b.id !== id));
            setConfirmBatchDeleteId(null);
            setToastMessage('Audit Batch and hotel assignments deleted from Database.');
        } catch (err: any) {
            console.error("Delete batch database operation failed:", err);
            // Fallback locally
            setBatches(prev => prev.filter(b => b.id !== id));
            setConfirmBatchDeleteId(null);
            setToastMessage('Deleted locally (offline mode).');
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    // Handlers for Categories
    const handleOpenAddCat = () => {
        setEditingCat(null);
        setCatName('');
        setCatTotalTasks(5);
        setCatCompleted(0);
        setCatDepartmentId('');
        setCatError('');
        setIsCatFormOpen(true);
    };

    const handleOpenEditCat = (cat: AuditCategory) => {
        setEditingCat(cat);
        setCatName(cat.name);
        setCatTotalTasks(cat.totalTasks);
        setCatCompleted(cat.completed);
        setCatDepartmentId(cat.departmentId || '');
        setCatError('');
        setIsCatFormOpen(true);
    };

    const handleSaveCat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!catName.trim()) {
            setCatError('Category name cannot be empty.');
            return;
        }

        setIsSupabaseLoading(true);
        try {
            if (editingCat) {
                // Update
                const response = await fetch(`${MAIN_URL}audit_categories?id=eq.${editingCat.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        name: catName.trim(),
                        total_tasks: Number(catTotalTasks),
                        completed: Number(catCompleted),
                        department_id: catDepartmentId || null // Explicitly handle null if needed
                    })
                });
                if (!response.ok) throw new Error('Failed to update category');
                
                setCatList(prev => prev.map(c => c.id === editingCat.id ? { 
                    ...c, 
                    name: catName.trim(), 
                    totalTasks: Number(catTotalTasks), 
                    completed: Number(catCompleted),
                    departmentId: catDepartmentId || undefined
                } : c));
                setToastMessage('Category updated successfully in Database!');
            } else {
                // Create
                const newCatData = { 
                    name: catName.trim(),
                    total_tasks: Number(catTotalTasks),
                    completed: Number(catCompleted),
                    department_id: catDepartmentId || null
                };
                const response = await fetch(`${MAIN_URL}audit_categories`, {
                    method: 'POST',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(newCatData)
                });
                if (!response.ok) throw new Error('Failed to create category');
                const data = await response.json();
                
                setCatList(prev => [...prev, { 
                    id: String(data[0].id), 
                    name: data[0].name,
                    totalTasks: data[0].total_tasks,
                    completed: data[0].completed,
                    departmentId: data[0].department_id ? String(data[0].department_id) : undefined
                }]);
                setToastMessage('New Category added to Database!');
            }

            setIsCatFormOpen(false);
            setCatName('');
            setCatTotalTasks(5);
            setCatCompleted(0);
            setCatDepartmentId('');
            setCatError('');
        } catch (err: any) {
            console.error("Save category error:", err);
            setCatError('Database operation failed.');
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    const handleDeleteCat = async (id: string) => {
        setIsSupabaseLoading(true);
        try {
            const response = await fetch(`${MAIN_URL}audit_categories?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });
            if (!response.ok) throw new Error('Failed to delete category');
            
            setCatList(prev => prev.filter(c => c.id !== id));
            setConfirmCatDeleteId(null);
            setToastMessage('Category removed from Database.');
        } catch (err: any) {
            console.error("Delete category error:", err);
            setToastMessage('Failed to delete from Database.');
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    const filteredDepts = departments.filter(d => 
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        d.head.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredHotels = hotels.filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        h.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.brandClass.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredBatches = batches.filter(b => 
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        b.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredCategories = catList.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredItems = items.filter(i => 
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.description && i.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const filteredGroups = groups.filter(g => 
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-transparent pt-20 pb-12 transition-all duration-300">
            {/* Header */}
            <header className="fixed top-0 z-40 w-full flex items-center justify-between px-6 py-4 bg-white/85 backdrop-blur-md border-b border-slate-100/80 shadow-sm">
                <div className="flex items-center">
                    <button 
                        onClick={subView !== 'dashboard' ? () => { setSubView('dashboard'); setSearchQuery(''); } : onBack} 
                        className="p-2.5 hover:bg-slate-100 rounded-full text-slate-700 active:scale-95 transition-all outline-none"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight ml-3">
                        {subView === 'departments' ? 'Audit Departments' : subView === 'hotels' ? 'Master Hotel List' : subView === 'batches' ? 'Audit Batch' : subView === 'categories' ? 'Audit Category' : subView === 'items' ? 'Audit Items' : subView === 'groups' ? 'Audit Groups' : 'Admin Dashboard'}
                    </h1>
                </div>
                {subView === 'dashboard' && (
                    <button 
                        onClick={onBack} 
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-full font-bold active:scale-95 transition-all outline-none"
                    >
                        Exit Admin
                    </button>
                )}
            </header>

            {/* Main Content */}
            <main className="max-w-[1500px] w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                {/* TOAST SYSTEM */}
                {toastMessage && (
                    <div className="fixed bottom-6 right-6 z-50 bg-slate-900 font-sans text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 animate-slideIn">
                        <CheckCircle size={18} className="text-emerald-400" />
                        <span className="text-xs font-bold">{toastMessage}</span>
                    </div>
                )}

                {subView === 'dashboard' ? (
                    <>
                        {/* Stats Row */}
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {stats.map((stat, i) => {
                                const Icon = stat.icon;
                                const isProperties = stat.title === 'Active Properties';
                                const displayValue = isProperties ? hotels.length : stat.value;
                                return (
                                    <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center justify-between hover:shadow-[0_8px_32px_rgba(15,23,42,0.03)] hover:scale-[1.01] transition-all duration-300">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                                            <p className="text-3xl font-extrabold text-slate-900 mt-1 font-sans tracking-tight">
                                                {displayValue}
                                            </p>
                                        </div>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                            stat.color.includes('indigo') ? 'bg-indigo-50/80 text-indigo-600' :
                                            stat.color.includes('amber') ? 'bg-amber-50/80 text-amber-600' :
                                            'bg-emerald-50/80 text-emerald-600'
                                        }`}>
                                            <Icon size={24} />
                                        </div>
                                    </div>
                                );
                            })}
                        </section>

                        {/* Config Area */}
                        <section className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-150/80 shadow-[0_12px_40px_rgba(15,23,42,0.02)]">
                            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2.5">
                                    <Settings2 size={20} className="text-indigo-600" />
                                    <span className="tracking-tight">Manage Master Data</span>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full text-xs shrink-0 max-w-full">
                                    <span className={`block h-2.5 w-2.5 rounded-full ${
                                        supabaseConnected === true ? 'bg-emerald-500 animate-pulse' :
                                        supabaseConnected === false ? 'bg-red-500' :
                                        'bg-amber-400'
                                    }`}></span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Main DB:</span>
                                    <span className="text-xs font-semibold text-slate-600 font-mono select-all truncate max-w-[180px] sm:max-w-xs" title={MAIN_URL}>
                                        {MAIN_URL.replace('https://', '').split('/')[0] || 'diqyjjuipouujvhfsmli.supabase.co'}
                                    </span>
                                </div>
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Audit Config</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
                                        
                                        {/* Master Hotel List Action Grid */}
                                        <div 
                                            onClick={() => { setSubView('hotels'); setSearchQuery(''); }}
                                            className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                    <Building size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Hotels</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{hotels.length} registered properties</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                        </div>

                                        {/* Departments Action Grid */}
                                        <div 
                                            onClick={() => { setSubView('departments'); setSearchQuery(''); }}
                                            className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                    <Briefcase size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Department</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{departments.length} registered departments</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                        </div>

                                        {/* Categories Action Grid */}
                                        <div 
                                            onClick={() => { setSubView('categories'); setSearchQuery(''); }}
                                            className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                    <ClipboardList size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Category</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{catList.length} checklist categories</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                        </div>

                                        {/* Audit Item Action Grid */}
                                        <div 
                                            onClick={() => setSubView('items')}
                                            className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                    <FileCheck size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Items</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Manage audit criteria items</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                        </div>

                                        {/* Audit Group Action Grid */}
                                        <div 
                                            onClick={() => { setSubView('groups'); setSearchQuery(''); }}
                                            className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                    <Layers size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Group</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{groups.length} configured groups</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                        </div>

                                        {/* Audit Batch Action Grid */}
                                        <div 
                                            onClick={() => { setSubView('batches'); setSearchQuery(''); }}
                                            className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                    <Package size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Batch</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{batches.length} registered batches</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* User & Access Setup Area */}
                        <section className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-150/80 shadow-[0_12px_40px_rgba(15,23,42,0.02)] mt-6">
                            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2.5">
                                <Users size={20} className="text-indigo-600" />
                                <span className="tracking-tight">User & Access Setup</span>
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                                        
                                        {/* User Management */}
                                        <div 
                                            className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                    <Users size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 tracking-tight">User Management</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Manage system users</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                        </div>

                                        {/* Access Right Management */}
                                        <div 
                                            className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                    <ShieldCheck size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 tracking-tight">Access Right Management</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Define role-based access</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Audit Report & Inspection Area */}
                        <section className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-150/80 shadow-[0_12px_40px_rgba(15,23,42,0.02)] mt-6">
                            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2.5">
                                <FileCheck size={20} className="text-indigo-600" />
                                <span className="tracking-tight font-bold">Audit Report & Inspection <span className="text-xs text-slate-400 font-normal font-sans ml-1">(coming soon)</span></span>
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                                        
                                        {/* Audit Progress Report */}
                                        <div 
                                            className="flex items-center justify-between p-5 bg-slate-50/40 rounded-[20px] border border-slate-150/50 transition-all opacity-75"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-slate-100/70 text-slate-400 flex items-center justify-center shrink-0">
                                                    <Percent size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-600 tracking-tight">Audit Progress Report</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">View monitoring progress</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Audit Inspection */}
                                        <div 
                                            className="flex items-center justify-between p-5 bg-slate-50/40 rounded-[20px] border border-slate-150/50 transition-all opacity-75"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-slate-100/70 text-slate-400 flex items-center justify-center shrink-0">
                                                    <Search size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-600 tracking-tight">Audit Inspection</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Perform audit inspection</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Recent submissions info */}
                        <section className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-150/80 shadow-[0_12px_40px_rgba(15,23,42,0.02)] mt-6">
                            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <CheckCircle size={18} className="text-indigo-600" />
                                <span className="tracking-tight">Recent Submissions</span>
                            </h2>
                            <div className="space-y-4">
                                {recentSubmissions.map((sub, i) => (
                                    <div key={i} className="flex items-center justify-between p-5 bg-slate-50/60 rounded-[20px] border border-slate-100/85 hover:bg-slate-150/30 transition-all duration-200">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 tracking-tight">{sub.property}</p>
                                            <p className="text-xs text-slate-400 mt-0.5 font-medium">{sub.audit} • {sub.date}</p>
                                        </div>
                                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                                            sub.status === 'Approved' 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>
                                            {sub.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                ) : subView === 'departments' ? (
                    <div className="space-y-6">
                        {/* Departments Layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { setSubView('dashboard'); setSearchQuery(''); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-55/80 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Departments</h2>
                                <p className="text-xs text-slate-500 mt-1">Manage organization departments and their designated heads.</p>
                            </div>
                            <button 
                                onClick={handleOpenAddDept} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 justify-center shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                            >
                                <Plus size={16} />
                                <span>Add Department</span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center gap-3 hover:border-slate-300 focus-within:border-indigo-400 focus-within:shadow-[0_8px_30px_rgba(99,102,241,0.03)] transition-all">
                            <Search className="text-slate-400 shrink-0" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search departments or heads..." 
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

                        {/* Departments Grid or Table */}
                        {filteredDepts.length === 0 ? (
                            <div className="bg-white/40 backdrop-blur-sm p-12 rounded-[24px] border border-dashed border-slate-200 text-center">
                                <Search size={28} className="text-slate-300 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-slate-800">No departments match your filter</h3>
                                <p className="text-xs text-slate-400 mt-1">Try resetting the search query or add a brand-new department.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.012)] overflow-hidden animate-fadeIn">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50 select-none text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                                                <th className="px-6 py-4.5">Department Name</th>
                                                <th className="px-6 py-4.5">Department Head</th>
                                                <th className="px-6 py-4.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredDepts.map((dept) => (
                                                <tr key={dept.id} className="hover:bg-slate-50/20 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-indigo-50/80 text-indigo-700 flex items-center justify-center font-black text-xs uppercase shadow-sm shrink-0">
                                                                {dept.name.substring(0, 2)}
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-800">{dept.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-extrabold text-slate-500 uppercase shrink-0">
                                                                {dept.head.charAt(0)}
                                                            </div>
                                                            <span className="text-sm text-slate-600 font-semibold">{dept.head}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                                        {confirmDeptDeleteId === dept.id ? (
                                                            <div className="inline-flex items-center gap-2 bg-red-50/85 px-3 py-1.5 rounded-xl border border-red-105 text-left animate-fadeIn">
                                                                <span className="text-[10px] text-red-600 font-bold whitespace-nowrap">Are you sure?</span>
                                                                <button 
                                                                    onClick={() => handleDeleteDept(dept.id)}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Yes, delete
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmDeptDeleteId(null)}
                                                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex gap-2">
                                                                <button 
                                                                    onClick={() => handleOpenEditDept(dept)}
                                                                    className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-xl transition-all font-bold flex items-center gap-1.5 active:scale-95"
                                                                >
                                                                    <Edit size={13} />
                                                                    <span>Edit</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmDeptDeleteId(dept.id)}
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
                            </div>
                        )}
                    </div>
                ) : subView === 'batches' ? (
                    <div className="space-y-6">
                        {/* Batches Layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { setSubView('dashboard'); setSearchQuery(''); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-55/80 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Batch Cycles</h2>
                                <p className="text-xs text-slate-500 mt-1">Manage master list of Swiss-Belhotel audit batches, cycles, and status tracking.</p>
                            </div>
                            <button 
                                onClick={handleOpenAddBatch} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 justify-center shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                            >
                                <Plus size={16} />
                                <span>Add Audit Batch</span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center gap-3 hover:border-slate-300 focus-within:border-indigo-400 focus-within:shadow-[0_8px_30px_rgba(99,102,241,0.03)] transition-all">
                            <Search className="text-slate-400 shrink-0" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search batches, frequencies, periods..." 
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

                        {/* Batches list */}
                        {filteredBatches.length === 0 ? (
                            <div className="bg-white/40 backdrop-blur-sm p-12 rounded-[24px] border border-dashed border-slate-200 text-center">
                                <Search size={28} className="text-slate-300 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-slate-800">No audit batches match your filter</h3>
                                <p className="text-xs text-slate-400 mt-1">Try resetting the search query or create a new audit batch.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.012)] overflow-hidden animate-fadeIn">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50 select-none text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                                                <th className="px-6 py-4.5">Batch Name</th>
                                                <th className="px-6 py-4.5">Status</th>
                                                <th className="px-6 py-4.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredBatches.map((batch) => (
                                                <tr key={batch.id} className="hover:bg-slate-50/20 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-indigo-50/80 text-indigo-700 flex items-center justify-center font-black text-xs uppercase shadow-sm shrink-0">
                                                                <Calendar size={14} />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm font-bold text-slate-800 truncate">{batch.name}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 font-mono">
                                                                    {(() => {
                                                                        const actualCount = (batch.hotelIds || []).filter(hId => hotels.some(h => String(h.id) === String(hId))).length;
                                                                        return `${actualCount} ${actualCount === 1 ? 'Hotel' : 'Hotels'} Assigned`;
                                                                    })()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold leading-none ${
                                                            batch.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' :
                                                            batch.status === 'Completed' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50' :
                                                            'bg-amber-50 text-amber-700 border border-amber-100/50'
                                                        } border`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                batch.status === 'Active' ? 'bg-emerald-500 animate-pulse' :
                                                                batch.status === 'Completed' ? 'bg-indigo-500' :
                                                                'bg-amber-500'
                                                            }`} />
                                                            {batch.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                                        {confirmBatchDeleteId === batch.id ? (
                                                            <div className="inline-flex items-center gap-2 bg-red-50/85 px-3 py-1.5 rounded-xl border border-red-105 text-left animate-fadeIn">
                                                                <span className="text-[10px] text-red-600 font-bold whitespace-nowrap">Are you sure?</span>
                                                                <button 
                                                                    onClick={() => handleDeleteBatch(batch.id)}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Yes, delete
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmBatchDeleteId(null)}
                                                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex gap-2">
                                                                <button 
                                                                    onClick={() => handleOpenEditBatch(batch)}
                                                                    className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-xl transition-all font-bold flex items-center gap-1.5 active:scale-95"
                                                                >
                                                                    <Edit size={13} />
                                                                    <span>Edit</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmBatchDeleteId(batch.id)}
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
                            </div>
                        )}
                    </div>
                ) : subView === 'categories' ? (
                    <div className="space-y-6">
                        {/* Categories Layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { setSubView('dashboard'); setSearchQuery(''); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-55/80 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Checklist Categories</h2>
                                <p className="text-xs text-slate-500 mt-1">Manage checklist categories, organize them by department, and track task progress.</p>
                            </div>
                            <button 
                                onClick={handleOpenAddCat} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 justify-center shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                            >
                                <Plus size={16} />
                                <span>Add Category</span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center gap-3 hover:border-slate-300 focus-within:border-indigo-400 focus-within:shadow-[0_8px_30px_rgba(99,102,241,0.03)] transition-all">
                            <Search className="text-slate-400 shrink-0" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search categories..." 
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

                        {/* Categories list */}
                        {filteredCategories.length === 0 ? (
                            <div className="bg-white/40 backdrop-blur-sm p-12 rounded-[24px] border border-dashed border-slate-200 text-center">
                                <Search size={28} className="text-slate-300 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-slate-800">No categories match your filter</h3>
                                <p className="text-xs text-slate-400 mt-1">Try resetting the search query or create a new audit category.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.012)] overflow-hidden animate-fadeIn">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50 select-none text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                                                <th className="px-6 py-4.5">Category Group Name</th>
                                                <th className="px-6 py-4.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredCategories.map((cat) => (
                                                <tr key={cat.id} className="hover:bg-slate-50/20 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-indigo-50/80 text-indigo-700 flex items-center justify-center font-black text-xs uppercase shadow-sm shrink-0">
                                                                C
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm font-bold text-slate-800 max-w-xs xl:max-w-md truncate block" title={cat.name}>
                                                                    {cat.name}
                                                                </span>
                                                                {cat.departmentId && departments.find(d => d.id === cat.departmentId) && (
                                                                    <span className="text-xs text-slate-500 font-semibold mt-0.5 truncate max-w-xs xl:max-w-md">
                                                                        {departments.find(d => d.id === cat.departmentId)?.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                                        {confirmCatDeleteId === cat.id ? (
                                                            <div className="inline-flex items-center gap-2 bg-red-50/85 px-3 py-1.5 rounded-xl border border-red-105 text-left animate-fadeIn">
                                                                <span className="text-[10px] text-red-600 font-bold whitespace-nowrap">Are you sure?</span>
                                                                <button 
                                                                    onClick={() => handleDeleteCat(cat.id)}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Yes, delete
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmCatDeleteId(null)}
                                                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex gap-2 justify-end w-full">
                                                                <button 
                                                                    onClick={() => handleOpenEditCat(cat)}
                                                                    className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-xl transition-all font-bold flex items-center gap-1.5 active:scale-95"
                                                                >
                                                                    <Edit size={13} />
                                                                    <span>Edit</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmCatDeleteId(cat.id)}
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
                            </div>
                        )}
                    </div>
                ) : subView === 'groups' ? (
                    <div className="space-y-6">
                        {/* Audit Groups Layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { setSubView('dashboard'); setSearchQuery(''); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-slate-100 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Checklist Groups</h2>
                                <p className="text-xs text-slate-500 mt-1">Group checklist items together and manage assignments in a drag-and-drop workspace.</p>
                            </div>
                            <button 
                                onClick={handleOpenAddGroup} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 justify-center shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                            >
                                <Plus size={16} />
                                <span>Create Group</span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center gap-3 hover:border-slate-300 focus-within:border-indigo-400 focus-within:shadow-[0_8px_30px_rgba(99,102,241,0.03)] transition-all">
                            <Search className="text-slate-400 shrink-0" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search audit groups by name or description..." 
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

                        {/* Groups table list */}
                        {filteredGroups.length === 0 ? (
                            <div className="bg-white/40 backdrop-blur-sm p-12 rounded-[24px] border border-dashed border-slate-200 text-center">
                                <Search size={28} className="text-slate-300 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-slate-800">No audit groups found</h3>
                                <p className="text-xs text-slate-400 mt-1">Create a new group to arrange checklist items together.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.012)] overflow-hidden animate-fadeIn">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50 select-none text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                                                <th className="px-6 py-4.5">Group Title</th>
                                                <th className="px-6 py-4.5">Description</th>
                                                <th className="px-6 py-4.5 text-center">Checklist Items Count</th>
                                                <th className="px-6 py-4.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredGroups.map((group) => (
                                                <tr key={group.id} className="hover:bg-slate-50/20 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-sm text-slate-800 whitespace-nowrap">{group.name}</td>
                                                    <td className="px-6 py-4 text-xs text-slate-500 font-semibold max-w-[320px] truncate">{group.description || <span className="italic text-slate-300">No description provided</span>}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-xs font-extrabold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200">
                                                            {group.itemIds ? group.itemIds.length : 0} items
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                                        {confirmGroupDeleteId === group.id ? (
                                                            <div className="inline-flex items-center gap-2 bg-red-50/85 px-3 py-1.5 rounded-xl border border-red-100 text-left animate-fadeIn">
                                                                <span className="text-[10px] text-red-600 font-bold whitespace-nowrap">Are you sure?</span>
                                                                <button 
                                                                    onClick={() => handleDeleteGroup(group.id)}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Yes, delete
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmGroupDeleteId(null)}
                                                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex gap-2 justify-end w-full">
                                                                <button 
                                                                    onClick={() => handleOpenEditGroup(group)}
                                                                    className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-xl transition-all font-bold flex items-center gap-1.5 active:scale-95"
                                                                >
                                                                    <Edit size={13} />
                                                                    <span>Edit</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmGroupDeleteId(group.id)}
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
                            </div>
                        )}
                    </div>
                ) : subView === 'items' ? (
                    <div className="space-y-6">
                        {/* Audit Items Layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { setSubView('dashboard'); setSearchQuery(''); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-55/80 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Checklist Items</h2>
                                <p className="text-xs text-slate-500 mt-1">Manage checklist items and their input requirements.</p>
                            </div>
                            <button 
                                onClick={handleOpenAddItem} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 justify-center shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                            >
                                <Plus size={16} />
                                <span>Add Item</span>
                            </button>
                        </div>
                        {/* items listing */}
                        <div className="bg-white rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.012)] overflow-hidden animate-fadeIn">
                             <table className="w-full text-left border-collapse">
                                         <thead>
                                             <tr className="border-b border-slate-100 bg-slate-50/50 select-none text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                                                 <th className="px-6 py-4.5">Item Name</th>
                                                 <th className="px-6 py-4.5">Department / Category</th>
                                                 <th className="px-6 py-4.5">Input Type</th>
                                                 <th className="px-6 py-4.5 text-center">Point</th>
                                                 <th className="px-6 py-4.5 text-right">Actions</th>
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-slate-100">
                                            {filteredItems.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50/20 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-sm text-slate-800">{item.name}</td>
                                                    <td className="px-6 py-4 text-xs text-slate-500 font-semibold">
                                                        {departments.find(d => d.id === item.departmentId)?.name} / {catList.find(c => c.id === item.categoryId)?.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-indigo-650 uppercase">
                                                        <span className="bg-indigo-50/80 px-2.5 py-1 rounded-full text-[10px] border border-indigo-100/30">
                                                            {item.inputType}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-700 text-center">
                                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-md text-xs font-extrabold">
                                                            {item.points ?? 5} pts
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                                        {confirmItemDeleteId === item.id ? (
                                                            <div className="inline-flex items-center gap-2 bg-red-50/85 px-3 py-1.5 rounded-xl border border-red-105 text-left animate-fadeIn">
                                                                <span className="text-[10px] text-red-600 font-bold whitespace-nowrap">Are you sure?</span>
                                                                <button 
                                                                    onClick={() => handleDeleteItem(item.id)}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Yes, delete
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmItemDeleteId(null)}
                                                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex gap-2 justify-end w-full">
                                                                <button 
                                                                    onClick={() => handleOpenEditItem(item)}
                                                                    className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-xl transition-all font-bold flex items-center gap-1.5 active:scale-95"
                                                                >
                                                                    <Edit size={13} />
                                                                    <span>Edit</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmItemDeleteId(item.id)}
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
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Hotels Layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { setSubView('dashboard'); setSearchQuery(''); }} 
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
                                    onClick={fetchHotelsFromSupabase}
                                    disabled={isSupabaseLoading}
                                    className={`text-xs font-bold px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-indigo-605 rounded-xl transition-all flex items-center gap-1.5 ${isSupabaseLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Clock size={12} className={isSupabaseLoading ? 'animate-spin' : ''} />
                                    <span>{isSupabaseLoading ? 'Syncing...' : 'Sync Now'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center gap-3 hover:border-slate-300 focus-within:border-indigo-400 focus-within:shadow-[0_8px_30px_rgba(99,102,241,0.03)] transition-all">
                            <Search className="text-slate-400 shrink-0" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search hotels, brands, or locations..." 
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
                                            {filteredHotels.map((hotel) => (
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
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Department Form Dialog */}
            {isDeptFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-xl relative animate-scaleUp">
                        <button 
                            onClick={() => setIsDeptFormOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
                        >
                            <X size={18} />
                        </button>

                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                            {editingDept ? 'Edit Department' : 'Create New Department'}
                        </h3>
                        <p className="text-xs text-slate-500 mb-6 font-medium">
                            {editingDept ? 'Modify the details of your master audit department below.' : 'Add a brand new corporate department to audit.'}
                        </p>

                        <form onSubmit={handleSaveDept} className="space-y-4">
                            {deptError && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2 text-xs text-red-600 font-bold">
                                    <AlertCircle size={15} />
                                    <span>{deptError}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Department Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Front Office / Reception"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                    value={deptName}
                                    onChange={(e) => setDeptName(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Department Head</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Rangga Permana"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                    value={deptHead}
                                    onChange={(e) => setDeptHead(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button 
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                                >
                                    {editingDept ? 'Save Changes' : 'Create Department'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIsDeptFormOpen(false)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-full font-bold text-sm transition-all active:scale-95 outline-none"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Batch Form Dialog */}
            {isBatchFormOpen && (() => {
                const availableHotels = hotels.filter(h => !assignedHotelIds.includes(h.id));
                const assignedHotels = hotels.filter(h => assignedHotelIds.includes(h.id));

                const filteredAvailable = availableHotels.filter(h => 
                    h.name.toLowerCase().includes(availableSearchQuery.toLowerCase()) ||
                    (h.brandClass && h.brandClass.toLowerCase().includes(availableSearchQuery.toLowerCase()))
                );

                const filteredAssigned = assignedHotels.filter(h => 
                    h.name.toLowerCase().includes(assignedSearchQuery.toLowerCase()) ||
                    (h.brandClass && h.brandClass.toLowerCase().includes(assignedSearchQuery.toLowerCase()))
                );

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white w-full max-w-5xl p-6 md:p-8 rounded-3xl border border-slate-200 shadow-2xl relative animate-scaleUp max-h-[90vh] overflow-y-auto">
                            <button 
                                onClick={() => setIsBatchFormOpen(false)}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all z-10"
                            >
                                <X size={18} />
                            </button>

                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                                    <Calendar className="text-indigo-600" size={22} />
                                    <span>{editingBatch ? 'Edit Audit Batch' : 'Create New Audit Batch'}</span>
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {editingBatch ? 'Modify details and assign Swiss-Belhotel properties to this audit batch.' : 'Add a brand new audit batch cycle and assign Swiss-Belhotel properties.'}
                                </p>
                            </div>

                            <form onSubmit={handleSaveBatch} className="space-y-6">
                                {batchError && (
                                    <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-2 text-xs text-red-600 font-bold">
                                        <AlertCircle size={15} />
                                        <span>{batchError}</span>
                                    </div>
                                )}

                                {/* Compact metadata grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50">
                                    <div>
                                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Batch Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Q3 2026 Inspection"
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs text-slate-800 outline-none transition-all font-semibold"
                                            value={batchName}
                                            onChange={(e) => setBatchName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                                        <select 
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs text-slate-800 outline-none transition-all font-semibold"
                                            value={batchStatus}
                                            onChange={(e: any) => setBatchStatus(e.target.value)}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Upcoming">Upcoming</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Dual Transfer List Box */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Assign Hotel Properties</label>
                                    <div className="flex flex-col md:flex-row items-stretch gap-4">
                                        
                                        {/* AVAILABLE COLUMN */}
                                        <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col h-[420px] shadow-sm hover:shadow-md/50 transition-shadow">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-xs font-bold text-slate-700 tracking-wide select-none">
                                                    AVAILABLE HOTELS ({filteredAvailable.length})
                                                </h4>
                                            </div>
                                            <div className="relative mb-3">
                                                <Search className="absolute left-3 top-2.5 text-slate-400 shrink-0" size={14} />
                                                <input 
                                                    type="text" 
                                                    placeholder="Search available..." 
                                                    value={availableSearchQuery}
                                                    onChange={(e) => setAvailableSearchQuery(e.target.value)}
                                                    className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200/80 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-none transition-all placeholder:text-slate-400 font-medium"
                                                />
                                                {availableSearchQuery && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setAvailableSearchQuery('')}
                                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                                                {filteredAvailable.map(hotel => {
                                                    const code = getHotelCode(hotel);
                                                    const isChecked = selectedAvailableIds.includes(hotel.id);
                                                    return (
                                                        <label 
                                                            key={hotel.id} 
                                                            className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                                isChecked 
                                                                ? 'bg-indigo-50/50 border-indigo-200/80' 
                                                                : 'border-slate-100 hover:border-slate-200 bg-slate-50/25 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked}
                                                                onChange={() => toggleAvailableSelected(hotel.id)}
                                                                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                                            />
                                                            <div className="min-w-0 flex-1">
                                                                <span className="block text-xs font-bold text-slate-800 leading-tight">
                                                                    {hotel.name}
                                                                </span>
                                                                <span className="block text-[9px] font-extrabold text-slate-400 tracking-wide font-mono uppercase mt-0.5">
                                                                    {code} • {hotel.brandClass}
                                                                </span>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                                {filteredAvailable.length === 0 && (
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-12">
                                                        <Search size={22} className="mb-2 text-slate-300" />
                                                        <span className="font-semibold">No available hotels match</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* TRANSFER OPERATIONS MIDDLE */}
                                        <div className="flex flex-row md:flex-col justify-center gap-2.5 py-2 shrink-0 md:h-full self-center">
                                            <button 
                                                type="button"
                                                onClick={moveAllToAssigned}
                                                title="Move all filtered to assigned"
                                                className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center font-black border border-slate-200 text-slate-600 hover:border-indigo-600 shadow-xs hover:scale-105 active:scale-95"
                                            >
                                                &gt;&gt;
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={moveSelectedToAssigned}
                                                disabled={selectedAvailableIds.length === 0}
                                                title="Move checked available to assigned"
                                                className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center font-black border shadow-xs ${
                                                    selectedAvailableIds.length === 0 
                                                    ? 'bg-slate-50/50 text-slate-300 border-slate-100 cursor-not-allowed' 
                                                    : 'bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-600 border-slate-200 hover:border-indigo-600 hover:scale-105 active:scale-95'
                                                }`}
                                            >
                                                &gt;
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={moveSelectedToAvailable}
                                                disabled={selectedAssignedIds.length === 0}
                                                title="Remove checked assigned from batch"
                                                className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center font-black border shadow-xs ${
                                                    selectedAssignedIds.length === 0 
                                                    ? 'bg-slate-50/50 text-slate-300 border-slate-100 cursor-not-allowed' 
                                                    : 'bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-600 border-slate-200 hover:border-indigo-600 hover:scale-105 active:scale-95'
                                                }`}
                                            >
                                                &lt;
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={moveAllToAvailable}
                                                title="Remove all filtered from batch"
                                                className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center font-black border border-slate-200 text-slate-600 hover:border-indigo-600 shadow-xs hover:scale-105 active:scale-95"
                                            >
                                                &lt;&lt;
                                            </button>
                                        </div>

                                        {/* ASSIGNED COLUMN */}
                                        <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col h-[420px] shadow-sm hover:shadow-md/50 transition-shadow">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-xs font-bold text-slate-700 tracking-wide select-none">
                                                    ASSIGNED HOTELS ({filteredAssigned.length})
                                                </h4>
                                            </div>
                                            <div className="relative mb-3">
                                                <Search className="absolute left-3 top-2.5 text-slate-400 shrink-0" size={14} />
                                                <input 
                                                    type="text" 
                                                    placeholder="Search assigned..." 
                                                    value={assignedSearchQuery}
                                                    onChange={(e) => setAssignedSearchQuery(e.target.value)}
                                                    className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200/80 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-none transition-all placeholder:text-slate-400 font-medium"
                                                />
                                                {assignedSearchQuery && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setAssignedSearchQuery('')}
                                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                                                {filteredAssigned.map(hotel => {
                                                    const code = getHotelCode(hotel);
                                                    const isChecked = selectedAssignedIds.includes(hotel.id);
                                                    return (
                                                        <label 
                                                            key={hotel.id} 
                                                            className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                                isChecked 
                                                                ? 'bg-indigo-50/50 border-indigo-200/80' 
                                                                : 'border-slate-100 hover:border-slate-200 bg-slate-50/25 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked}
                                                                onChange={() => toggleAssignedSelected(hotel.id)}
                                                                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                                            />
                                                            <div className="min-w-0 flex-1">
                                                                <span className="block text-xs font-bold text-slate-800 leading-tight">
                                                                    {hotel.name}
                                                                </span>
                                                                <span className="block text-[9px] font-extrabold text-slate-400 tracking-wide font-mono uppercase mt-0.5">
                                                                    {code} • {hotel.brandClass}
                                                                </span>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                                {filteredAssigned.length === 0 && (
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center select-none py-12 bg-slate-50/25 border border-dashed border-slate-100 rounded-2xl">
                                                        <div className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-300 mb-2">
                                                            <CheckCircle size={16} />
                                                        </div>
                                                        <span className="text-xs text-slate-400 font-semibold">No hotels assigned</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-5 border-t border-slate-100">
                                    <button 
                                        type="button"
                                        onClick={() => setIsBatchFormOpen(false)}
                                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold text-xs tracking-wider transition-all uppercase outline-none active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-xs tracking-wider transition-all uppercase shadow-lg hover:shadow-indigo-500/10 flex items-center gap-2 outline-none active:scale-95"
                                    >
                                        <CheckCircle size={14} />
                                        <span>Save Changes</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* Hotel Form Dialog */}
            {isHotelFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-xl relative animate-scaleUp">
                        <button 
                            onClick={() => setIsHotelFormOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
                        >
                            <X size={18} />
                        </button>

                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                            {editingHotel ? 'Edit Hotel Property' : 'Create New Hotel Property'}
                        </h3>
                        <p className="text-xs text-slate-500 mb-6 font-medium">
                            {editingHotel ? 'Modify the details of your Swiss-Belhotel brand property below.' : 'Add a brand new Swiss-Belhotel corporate brand property.'}
                        </p>

                        <form onSubmit={handleSaveHotel} className="space-y-4">
                            {hotelError && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2 text-xs text-red-600 font-bold">
                                    <AlertCircle size={15} />
                                    <span>{hotelError}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Hotel Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Swiss-Belhotel Seef"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100 font-semibold"
                                    value={hotelName}
                                    onChange={(e) => setHotelName(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Hotel Code</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. CWS"
                                    maxLength={8}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100 font-mono uppercase font-bold"
                                    value={hotelCode}
                                    onChange={(e) => setHotelCode(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Brand Segment</label>
                                <select 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                    value={hotelBrandClass}
                                    onChange={(e) => setHotelBrandClass(e.target.value)}
                                >
                                    {HOTEL_BRANDS.map((brand) => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Region</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                        value={hotelRegion}
                                        onChange={(e) => setHotelRegion(e.target.value)}
                                    >
                                        <option value="Asia Pacific">Asia Pacific</option>
                                        <option value="Middle East">Middle East</option>
                                        <option value="Europe">Europe</option>
                                        <option value="Africa">Africa</option>
                                        <option value="Americas">Americas</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Country</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Bahrain"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                        value={hotelCountry}
                                        onChange={(e) => setHotelCountry(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Star Rating</label>
                                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 select-none">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                type="button"
                                                key={star}
                                                onClick={() => setHotelStars(star)}
                                                className="p-1 hover:scale-110 transition-transform"
                                            >
                                                <Star 
                                                    size={18} 
                                                    fill={star <= hotelStars ? "currentColor" : "none"} 
                                                    className={star <= hotelStars ? "text-amber-500" : "text-slate-300"} 
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 ml-auto">
                                        {hotelStars} {hotelStars === 1 ? 'Star' : 'Stars'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Location / City & Country</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Manama, Bahrain"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                    value={hotelLocation}
                                    onChange={(e) => setHotelLocation(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button 
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                                >
                                    {editingHotel ? 'Save Changes' : 'Create Property'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIsHotelFormOpen(false)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-full font-bold text-sm transition-all active:scale-95 outline-none"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Category Form Dialog */}
            {isCatFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-xl relative animate-scaleUp">
                        <button 
                            onClick={() => setIsCatFormOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
                        >
                            <X size={18} />
                        </button>

                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                            {editingCat ? 'Edit Audit Category' : 'Create New Audit Category'}
                        </h3>
                        <p className="text-xs text-slate-500 mb-6 font-medium">
                            {editingCat ? 'Modify the details of your master audit category group below.' : 'Add a brand-new master audit checklist category.'}
                        </p>

                        <form onSubmit={handleSaveCat} className="space-y-4">
                            {catError && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2 text-xs text-red-600 font-bold">
                                    <AlertCircle size={15} />
                                    <span>{catError}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. XI. BRAND CUSTOMS & ACCENTS"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                    value={catName}
                                    onChange={(e) => setCatName(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Department Link (Optional)</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                    value={catDepartmentId}
                                    onChange={(e) => setCatDepartmentId(e.target.value)}
                                >
                                    <option value="">-- No specific department --</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name} ({dept.head})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button 
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                                >
                                    {editingCat ? 'Save Changes' : 'Create Category'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIsCatFormOpen(false)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-full font-bold text-sm transition-all active:scale-95 outline-none"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Item Form Dialog */}
            {isItemFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-xl relative animate-scaleUp">
                        <button 
                            onClick={() => setIsItemFormOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
                        >
                            <X size={18} />
                        </button>

                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                            {editingItem ? 'Edit Audit Item' : 'Create New Audit Item'}
                        </h3>
                        <p className="text-xs text-slate-500 mb-6 font-medium">
                            {editingItem ? 'Modify the details of your audit checklist item below.' : 'Add a brand-new audit checklist item.'}
                        </p>

                        <form onSubmit={handleSaveItem} className="space-y-4">
                            {itemError && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2 text-xs text-red-600 font-bold">
                                    <AlertCircle size={15} />
                                    <span>{itemError}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Item Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Ensure logo is visible"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Item Description (Optional)</label>
                                <textarea 
                                    placeholder="Add item description..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                    value={itemItemDescription}
                                    onChange={(e) => setItemItemDescription(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Department</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                        value={itemDepartmentId}
                                        onChange={(e) => setItemDepartmentId(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Select Dept --</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                        value={itemCategoryId}
                                        onChange={(e) => setItemCategoryId(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Select Cat --</option>
                                        {[...catList]
                                            .sort((a, b) => {
                                                const idA = Number(a.id);
                                                const idB = Number(b.id);
                                                if (!isNaN(idA) && !isNaN(idB)) {
                                                    return idA - idB;
                                                }
                                                return a.id.localeCompare(b.id);
                                            })
                                            .map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Input Type</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 'camera', label: 'Camera', icon: Camera },
                                        { id: 'image', label: 'Image', icon: ImageIcon },
                                        { id: 'document', label: 'Document', icon: FileText },
                                        { id: 'numeric', label: 'Numeric', icon: Hash },
                                        { id: 'text', label: 'Text', icon: Type },
                                        { id: 'checkbox', label: 'Checkbox', icon: CheckSquare },
                                        { id: 'score', label: 'Score', icon: Star },
                                    ].map((type) => (
                                        <button
                                            type="button"
                                            key={type.id}
                                            onClick={() => setItemInputType(type.id as AuditItem['inputType'])}
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                                itemInputType === type.id 
                                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}
                                        >
                                            <type.icon size={20} />
                                            <span className="text-[10px] font-bold mt-1 uppercase">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Point (Weight)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    max="1000"
                                    placeholder="e.g. 5"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                    value={itemPoints}
                                    onChange={(e) => setItemPoints(Number(e.target.value))}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Instruction (Optional)</label>
                                <textarea 
                                    placeholder="Add instruction..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                    value={itemInstruction}
                                    onChange={(e) => setItemInstruction(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button 
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                                >
                                    {editingItem ? 'Save Changes' : 'Create Item'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIsItemFormOpen(false)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-full font-bold text-sm transition-all active:scale-95 outline-none"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Audit Group Form Dialog */}
            {isGroupFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-4xl p-6 sm:p-8 rounded-[28px] border border-slate-200 shadow-2xl relative animate-scaleUp max-h-[90vh] flex flex-col overflow-hidden">
                        <button 
                            type="button"
                            onClick={() => setIsGroupFormOpen(false)}
                            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all outline-none"
                        >
                            <X size={18} />
                        </button>

                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editingGroup ? 'Edit Audit Checklist Group' : 'Create New Audit Checklist Group'}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Configure the group information and build your checklist by dragging entire Audit Categories, then check/uncheck individual checklist items.
                            </p>
                        </div>

                        <form onSubmit={handleSaveGroup} className="flex-1 flex flex-col overflow-hidden gap-5">
                            {groupError && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2 text-xs text-red-600 font-bold">
                                    <AlertCircle size={15} />
                                    <span>{groupError}</span>
                                </div>
                            )}

                            {/* Group Information Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-full">
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Group Title</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Front Office SOP Group"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Group Description</label>
                                    <input 
                                        type="text" 
                                        placeholder="Brief summary of the checklist grouped criteria..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                        value={groupDescription}
                                        onChange={(e) => setGroupDescription(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Drag and Drop Workspace */}
                            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                                {/* Left Panel: Available Master Categories */}
                                <div className="flex flex-col bg-slate-50/60 rounded-2xl border border-slate-150 p-4 min-h-0"
                                     onDragOver={(e) => e.preventDefault()}
                                     onDrop={handleDropOnAvailableCatZone}>
                                    <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
                                        <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">Available Audit Categories ({catList.filter(cat => !groupCategoryIds.includes(cat.id)).length})</h4>
                                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full font-bold">Drag card to assign</span>
                                    </div>
                                    
                                    {/* Dialog Search box */}
                                    <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2 mb-3 focus-within:border-indigo-300 transition-all select-none shrink-0">
                                        <Search className="text-slate-400 shrink-0" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Look up categories..."
                                            className="w-full text-xs text-slate-700 bg-transparent outline-none border-none placeholder-slate-400 p-0 focus:ring-0"
                                            value={dialogSearchQuery}
                                            onChange={(e) => setDialogSearchQuery(e.target.value)}
                                        />
                                        {dialogSearchQuery && (
                                            <button type="button" onClick={() => setDialogSearchQuery('')} className="p-0.5 text-slate-300 hover:text-slate-500">
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Draggable available list */}
                                    <div className="flex-grow overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                        {catList.filter(cat => !groupCategoryIds.includes(cat.id) && (
                                            cat.name.toLowerCase().includes(dialogSearchQuery.toLowerCase())
                                        )).length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/50">
                                                <Search size={22} className="text-slate-300 mb-1.5" />
                                                <p className="text-xs font-bold text-slate-700">No categories found</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">All categories assigned or none match query</p>
                                            </div>
                                        ) : (
                                            catList.filter(cat => !groupCategoryIds.includes(cat.id) && (
                                                cat.name.toLowerCase().includes(dialogSearchQuery.toLowerCase())
                                            )).map((cat) => {
                                                const catItemsCount = items.filter(i => i.categoryId === cat.id).length;
                                                return (
                                                    <div 
                                                        key={`available-cat-${cat.id}`}
                                                        draggable
                                                        onDragStart={(e) => handleDragStartAvailableCat(e, cat.id)}
                                                        className="bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-200 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all flex items-center justify-between gap-2.5 group select-none relative"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <div className="w-5 h-5 rounded hover:bg-slate-100 text-slate-400 shrink-0 cursor-grab active:cursor-grabbing flex items-center justify-center pointer-events-none">
                                                                <GripVertical size={13} />
                                                            </div>
                                                            <div className="min-w-0 pr-1 pointer-events-none flex-1">
                                                                <p className="text-xs font-bold text-slate-800 leading-tight block truncate pr-2" title={cat.name}>{cat.name}</p>
                                                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{catItemsCount} checklist items</p>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleQuickAddCat(cat.id)}
                                                            className="p-1.5 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-100 rounded-lg transition-all shadow-sm flex items-center justify-center outline-none shrink-0"
                                                            title="Add Category"
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Right Panel: Assigned checkbox checklist dropzone */}
                                <div className={`flex flex-col rounded-2xl border-2 p-4 min-h-0 transition-all ${
                                         isDragOverAssigned 
                                             ? 'bg-indigo-50/50 border-dashed border-indigo-500 scale-[1.002]' 
                                             : 'bg-indigo-50/10 border-indigo-100/50 border'
                                     }`}
                                     onDragOver={(e) => { e.preventDefault(); setIsDragOverAssigned(true); }}
                                     onDragLeave={() => setIsDragOverAssigned(false)}
                                     onDrop={handleDropOnAssignedCatZone}>
                                    <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-widest">Assigned Categories ({groupCategoryIds.length})</h4>
                                            <span className="text-[10px] bg-indigo-100 text-indigo-700 rounded-md px-1.5 py-0.5 font-extrabold">{groupItemIds.length} items checked</span>
                                        </div>
                                        <span className="text-[10px] text-indigo-500 font-bold bg-indigo-100/50 px-2 py-0.5 rounded-full">Drop cards here</span>
                                    </div>

                                    {/* Draggable assigned category elements */}
                                    <div className="flex-grow overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                                        {groupCategoryIds.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 border border-dashed border-slate-250 rounded-xl bg-white/50 select-none">
                                                <Layers size={26} className="text-slate-300 mb-1.5 animate-bounce" />
                                                <p className="text-xs font-bold text-slate-700">No categories assigned yet</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Drag an Audit Category from the left and drop it here. You can then expand it to select/deselect specific items!</p>
                                            </div>
                                        ) : (
                                            groupCategoryIds.map((catId, index) => {
                                                const catObj = catList.find(c => c.id === catId);
                                                if (!catObj) return null;
                                                
                                                const categoryItems = items.filter(i => i.categoryId === catId);
                                                const selectedCatItemsCount = categoryItems.filter(i => groupItemIds.includes(i.id)).length;
                                                const isExpanded = expandedCategoryIds.includes(catId);
                                                const isAllChecked = categoryItems.length > 0 && categoryItems.every(i => groupItemIds.includes(i.id));
                                                const isSomeChecked = categoryItems.length > 0 && categoryItems.some(i => groupItemIds.includes(i.id)) && !isAllChecked;

                                                return (
                                                    <div 
                                                        key={`assigned-cat-${catId}-${index}`}
                                                        draggable
                                                        onDragStart={(e) => handleDragStartAssignedCat(e, catId, index)}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={(e) => handleDropOnAssignedCatItem(e, index)}
                                                        className="bg-white rounded-xl border border-indigo-100 hover:border-indigo-250 shadow-sm hover:shadow transition-all overflow-hidden flex flex-col"
                                                    >
                                                        {/* Category Card Header */}
                                                        <div className="px-3 py-2.5 bg-slate-50/50 flex items-center justify-between gap-1.5 border-b border-indigo-50/30">
                                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                <div className="w-5 h-5 rounded text-slate-400 shrink-0 cursor-grab active:cursor-grabbing flex items-center justify-center hover:bg-slate-100">
                                                                    <GripVertical size={13} />
                                                                </div>
                                                                
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={isAllChecked}
                                                                    ref={el => {
                                                                        if (el) el.indeterminate = isSomeChecked;
                                                                    }}
                                                                    onChange={(e) => handleToggleCategoryAllItems(catId, e.target.checked)}
                                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer shrink-0"
                                                                    title="Select/Deselect All items in Category"
                                                                />

                                                                <div className="min-w-0 pr-1 cursor-pointer flex-1" onClick={() => toggleExpandCategory(catId)}>
                                                                    <p className="text-xs font-bold text-slate-800 leading-snug truncate hover:text-indigo-600 transition-colors" title={catObj.name}>
                                                                        {catObj.name}
                                                                    </p>
                                                                    <p className="text-[10px] text-indigo-600 font-extrabold mt-0.5">
                                                                        {selectedCatItemsCount} of {categoryItems.length} items checked
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Action buttons */}
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => handleMoveCatUp(index)}
                                                                    disabled={index === 0}
                                                                    className={`p-1 rounded hover:bg-slate-100 ${index === 0 ? 'text-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                                                                    title="Move Up"
                                                                >
                                                                    <ChevronUp size={14} />
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => handleMoveCatDown(index)}
                                                                    disabled={index === groupCategoryIds.length - 1}
                                                                    className={`p-1 rounded hover:bg-slate-100 ${index === groupCategoryIds.length - 1 ? 'text-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                                                                    title="Move Down"
                                                                >
                                                                    <ChevronDown size={14} />
                                                                </button>

                                                                {/* Expansion Control */}
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => toggleExpandCategory(catId)}
                                                                    className="p-1 hover:bg-indigo-50 text-slate-500 rounded transition-all"
                                                                    title={isExpanded ? "Collapse" : "Expand"}
                                                                >
                                                                    {isExpanded ? (
                                                                        <ChevronUp size={15} className="text-indigo-600 font-bold" />
                                                                    ) : (
                                                                        <ChevronDown size={15} />
                                                                    )}
                                                                </button>

                                                                <button 
                                                                    type="button"
                                                                    onClick={() => handleQuickRemoveCat(catId)}
                                                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                    title="Remove category"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Expandable Item Checkbox List */}
                                                        {isExpanded && (
                                                            <div className="p-3 bg-white border-t border-slate-50 space-y-1.5 max-h-52 overflow-y-auto scrollbar-thin divide-y divide-slate-100/40 animate-fadeIn">
                                                                {categoryItems.length === 0 ? (
                                                                    <p className="text-[10px] italic text-slate-400 py-1">No checklist items configured for this category.</p>
                                                                ) : (
                                                                    categoryItems.map((item) => {
                                                                        const isChecked = groupItemIds.includes(item.id);
                                                                        return (
                                                                            <label 
                                                                                key={item.id}
                                                                                className="flex items-start gap-2 py-1.5 cursor-pointer group hover:bg-slate-50/50 rounded transition-colors"
                                                                            >
                                                                                <input 
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    onChange={() => handleToggleItemCheckbox(item.id)}
                                                                                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-450 border-slate-300 mt-0.5 cursor-pointer shrink-0"
                                                                                />
                                                                                <div className="flex-1 min-w-0 ml-1">
                                                                                    <p className="text-xs text-slate-700 font-semibold leading-normal group-hover:text-indigo-600 transition-colors whitespace-normal break-words">
                                                                                        {item.name}
                                                                                    </p>
                                                                                    {item.description && (
                                                                                        <p className="text-[10px] text-slate-400 mt-0.5 block truncate whitespace-normal line-clamp-1 leading-tight">
                                                                                            {item.description}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </label>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Submit Buttons */}
                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 shrink-0">
                                <button 
                                    type="button"
                                    onClick={() => setIsGroupFormOpen(false)}
                                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold text-sm transition-all active:scale-95 outline-none"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                                >
                                    {editingGroup ? 'Save Changes' : 'Create Group'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
