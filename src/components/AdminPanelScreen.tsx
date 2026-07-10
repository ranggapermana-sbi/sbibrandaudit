import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Clock, Building, BarChart3, ChevronRight, Plus, Trash2, Edit, Search, X, AlertCircle, MapPin, Settings2, Calendar, Star, Briefcase, ClipboardList, FileCheck, Layers, Package, Camera, ImageIcon, FileText, Hash, Type, CheckSquare, Users, ShieldCheck, Percent, GripVertical, ChevronUp, ChevronDown, Eye, User, RefreshCw, CheckCircle2, Maximize2, ExternalLink, ZoomIn, Database, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

import { Department, Hotel, AuditBatch, AuditCategory, AuditItem, AuditGroup } from '../types';
import { DEFAULT_DEPARTMENTS, DEFAULT_CATEGORIES, DEFAULT_HOTELS, DEFAULT_BATCHES, DEFAULT_GROUPS, DEFAULT_OFFLINE_ITEMS } from '../lib/constants';

const getRoleStyles = (accessLevel: string) => {
    const r = accessLevel?.toLowerCase() || 'auditee';
    if (r === 'admin') return { bg: 'bg-indigo-50/40', text: 'text-indigo-700', icon: <ShieldCheck size={14}/> };
    if (r === 'auditor') return { bg: 'bg-emerald-50/40', text: 'text-emerald-700', icon: <Eye size={14}/> };
    return { bg: 'bg-amber-50/40', text: 'text-amber-700', icon: <User size={14}/> };
};

const stats = [
    { title: 'Total Submissions', value: '142', icon: BarChart3, color: 'text-indigo-600' },
    { title: 'Active Properties', value: '100', icon: Building, color: 'text-emerald-600' },
];

const recentSubmissions = [
    { property: 'Swiss-Belhotel Seef', audit: 'Lobby & Reception', status: 'Pending', date: 'May 20' },
    { property: 'Swiss-Belresidences Juffair', audit: 'Guest Rooms', status: 'Approved', date: 'May 19' },
    { property: 'Swiss-Belinn Airport Jakarta', audit: 'F&B Outlets', status: 'Pending', date: 'May 19' },
];

const HOTEL_BRANDS = [
    'Grand Swiss-Belhotel',
    'Managed by SBI',
    'MĀUA',
    'Swiss-Belboutique',
    'Swiss-Belcourt',
    'Swiss-Belexpress',
    'Swiss-Belhotel',
    'Swiss-Belinn',
    'Swiss-Belresidences',
    'Swiss-Belresort',
    'Swiss-Belsuites',
    'Swiss-Belvillas',
    'Zest'
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

export default function AdminPanelScreen({ userProfile, onBack, onLogout }: { userProfile: any, onBack: () => void, onLogout: () => void }) {
    const [subView, setSubView] = useState<'dashboard' | 'departments' | 'hotels' | 'batches' | 'categories' | 'items' | 'groups' | 'users' | 'access' | 'inspection' | 'auditor_assignment'>('dashboard');
    const [auditorAccess, setAuditorAccess] = useState<Record<string, boolean>>({});
    const [auditorAssignments, setAuditorAssignments] = useState<any[]>([]);
    const [auditorCategoryAssignments, setAuditorCategoryAssignments] = useState<any[]>(() => {
        try {
            const stored = localStorage.getItem('sbi_auditor_category_assignments');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    });
    const [assignmentTab, setAssignmentTab] = useState<'hotels' | 'categories'>('hotels');
    const [categoryAssignmentSearch, setCategoryAssignmentSearch] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [groupAssignmentTab, setGroupAssignmentTab] = useState<'categories' | 'items'>('categories');
    const [groupSearchQuery, setGroupSearchQuery] = useState('');
    const [showSqlModal, setShowSqlModal] = useState(false);
    const [sqlModalTab, setSqlModalTab] = useState<'auditor' | 'checklist'>('checklist');
    const [groupExpandedCats, setGroupExpandedCats] = useState<Record<string, boolean>>({});
    const [enlargedImage, setEnlargedImage] = useState<{ url: string; title?: string } | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setEnlargedImage(null);
                setShowSqlModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const fetchAuditorAssignments = async () => {
            // Hotel assignments
            const { data, error } = await supabase
                .from('auditor_assignments')
                .select('*');
            if (data) setAuditorAssignments(data);

            // Category assignments
            try {
                const { data: catData, error: catErr } = await supabase
                    .from('auditor_category_assignments')
                    .select('*');
                if (catData && catData.length >= 0) {
                    setAuditorCategoryAssignments(catData);
                    localStorage.setItem('sbi_auditor_category_assignments', JSON.stringify(catData));
                } else if (catErr) {
                    // Fallback to auditor_assignments if category_id exists there
                    const { data: altData } = await supabase
                        .from('auditor_assignments')
                        .select('*');
                    if (altData) {
                        const catOnly = altData.filter((a: any) => a.category_id);
                        if (catOnly.length > 0) {
                            setAuditorCategoryAssignments(catOnly);
                            localStorage.setItem('sbi_auditor_category_assignments', JSON.stringify(catOnly));
                        }
                    }
                }
            } catch (e) {
                console.warn('Auditor category assignment fetch warning:', e);
            }
        };
        fetchAuditorAssignments();
    }, []);
    useEffect(() => {
        const fetchAccess = async () => {
            try {
                const response = await fetch(`${MAIN_URL}access_rights?access_level=eq.auditor`, {
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`
                    }
                });
                console.log("Fetch access rights response:", response.status, response.statusText);
                if (response.ok) {
                    const data = await response.json();
                    const newAccess: Record<string, boolean> = {};
                    data.forEach((r: any) => {
                        // Reverse mapping for display
                        const reverseMap: Record<string, string> = {
                            'dashboard': 'Dashboard',
                            'hotels': 'Hotels',
                            'departments': 'Departments',
                            'categories': 'Categories',
                            'items': 'Items',
                            'groups': 'Groups',
                            'batches': 'Batches',
                            'users': 'User Management',
                            'access': 'Access Rights'
                        };
                        const view = reverseMap[r.subview] || r.subview;
                        newAccess[view] = true;
                    });
                    setAuditorAccess(newAccess);
                }
            } catch (e) {
                console.warn("Failed to fetch initial access rights, using offline fallback:", e);
                const fallbackAccess: Record<string, boolean> = {
                    'Dashboard': true,
                    'Hotels': true,
                    'Departments': true,
                    'Categories': true,
                    'Items': true,
                    'Groups': true,
                    'Batches': true,
                    'User Management': true,
                    'Access Rights': true
                };
                setAuditorAccess(fallbackAccess);
            }
        };
        fetchAccess();
    }, []);
    
    const canAccessSubView = (view: string) => {
        if (userProfile?.access_level === 'admin' || userProfile?.access_level === 'auditor') return true;
        return false;
    };

    const handleSetSubView = (view: typeof subView) => {
        if (canAccessSubView(view)) {
            setSubView(view);
        } else {
            console.warn("Access denied for this section");
        }
    };

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state && event.state.subView && canAccessSubView(event.state.subView)) {
                setSubView(event.state.subView);
            }
        };
        window.addEventListener('popstate', handlePopState);
        
        if (window.history.state?.screen === 'adminPanel' && !window.history.state?.subView) {
            window.history.replaceState({ screen: 'adminPanel', subView }, '', `#adminPanel/${subView}`);
        }
        
        return () => window.removeEventListener('popstate', handlePopState);
    }, [userProfile]);

    useEffect(() => {
        if (window.history.state?.screen === 'adminPanel' && window.history.state?.subView !== subView) {
            window.history.pushState({ screen: 'adminPanel', subView }, '', `#adminPanel/${subView}`);
        }
    }, [subView]);
    
    const handleToggleAuditorAccess = (view: string) => {
        setAuditorAccess(prev => ({ ...prev, [view]: !prev[view] }));
    };

    const handleSaveAccess = async () => {
        setIsSupabaseLoading(true);
        try {
            // 1. Delete existing auditor access rules
            const delResponse = await fetch(`${MAIN_URL}access_rights?access_level=eq.auditor`, {
                method: 'DELETE',
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });
            if (!delResponse.ok && delResponse.status !== 404) {
                const err = await delResponse.text();
                throw new Error(`Failed to delete existing access rules: ${err}`);
            }
            
            // Prepare new entries based on normalized keys
            const subviewMap: Record<string, string> = {
                'Dashboard': 'dashboard',
                'Audit Report & Inspection': 'inspection', 
                'Recent Submissions': 'dashboard',
                'Hotels': 'hotels',
                'Departments': 'departments',
                'Categories': 'categories',
                'Items': 'items',
                'Groups': 'groups',
                'Batches': 'batches',
                'User Management': 'users',
                'Access Rights': 'access',
            };

            const enabledViews = Object.entries(auditorAccess)
                .filter(([_, value]) => value)
                .map(([view]) => (subviewMap[view] || view.toLowerCase()));
            
            const uniqueSubviews = Array.from(new Set(enabledViews));

            const newEntries = uniqueSubviews.map(subview => ({
                access_level: 'auditor',
                subview
            }));

            // Insert new entries
            if (newEntries.length > 0) {
                const insResponse = await fetch(`${MAIN_URL}access_rights`, {
                    method: 'POST',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(newEntries)
                });
                if (!insResponse.ok) {
                    const err = await insResponse.text();
                    throw new Error(`Failed to insert new access rules: ${err}`);
                }
            }
            setToastMessage("Access rules updated successfully!");
        } catch (e) {
            console.error("Error saving access rules:", e);
            setToastMessage(`Failed to save access rules: ${e.message}`);
        } finally {
            setIsSupabaseLoading(false);
        }
    };
    const [profilesList, setProfilesList] = useState<any[]>([]);
    const [isProfilesTableMissing, setIsProfilesTableMissing] = useState(false);

    const fetchProfilesFromSupabase = async () => {
        setIsProfilesTableMissing(false);
        try {
            const response = await fetch(`${MAIN_URL}audit_users?select=*&order=created_at.desc`, {
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setProfilesList(data);
                }
            } else {
                if (response.status === 404 || response.status === 400) {
                    setIsProfilesTableMissing(true);
                }
                console.warn(`Profiles fetch returned status: ${response.status}`);
                loadFallbackProfiles();
            }
        } catch (err) {
            console.warn("Failed to fetch profiles:", err);
            loadFallbackProfiles();
        }
    };

    const updateAccessLevel = async (userId: string, newAccessLevel: string) => {
        try {
            // First, update the local state and localStorage so the user gets instant visual feedback and resilience
            const updatedList = profilesList.map(p => {
                if (p.id === userId) {
                    const updatedUser = { 
                        ...p, 
                        access_level: newAccessLevel, 
                        updated_at: new Date().toISOString() 
                    };
                    localStorage.setItem(`sbi_profile_${userId}`, JSON.stringify(updatedUser));
                    return updatedUser;
                }
                return p;
            });
            setProfilesList(updatedList);
            setToastMessage(`Updated access level to ${newAccessLevel} locally.`);

            const response = await fetch(`${MAIN_URL}audit_users?id=eq.${userId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ 
                    access_level: newAccessLevel,
                    updated_at: new Date().toISOString()
                })
            });

            if (response.ok) {
                // Fetch the latest representation to sync
                fetchProfilesFromSupabase();
                setToastMessage(`Successfully saved access level to cloud database.`);
            } else {
                console.warn("Failed to sync access level update with Supabase, kept local copy.");
            }
        } catch (e) {
            console.warn("Network error or table missing while updating access level, kept local copy.", e);
        }
    };

    const updateApprovalStatus = async (userId: string, isApproved: boolean) => {
        try {
            const updatedList = profilesList.map(p => {
                if (p.id === userId) {
                    const updatedUser = { 
                        ...p, 
                        is_approved: isApproved, 
                        updated_at: new Date().toISOString() 
                    };
                    localStorage.setItem(`sbi_profile_${userId}`, JSON.stringify(updatedUser));
                    return updatedUser;
                }
                return p;
            });
            setProfilesList(updatedList);
            setToastMessage(`Updated approval status to ${isApproved ? 'Approved' : 'Pending'} locally.`);

            const response = await fetch(`${MAIN_URL}audit_users?id=eq.${userId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ 
                    is_approved: isApproved,
                    updated_at: new Date().toISOString()
                })
            });

            if (response.ok) {
                fetchProfilesFromSupabase();
                setToastMessage(`Successfully saved approval status to cloud database.`);
            } else {
                console.warn("Failed to sync approval status update with Supabase, kept local copy.");
            }
        } catch (e) {
            console.warn("Network error or table missing while updating approval status, kept local copy.", e);
        }
    };

    const loadFallbackProfiles = () => {
        const cachedProfiles: any[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sbi_profile_')) {
                try {
                    const val = localStorage.getItem(key);
                    if (val) {
                        cachedProfiles.push(JSON.parse(val));
                    }
                } catch (e) {
                    console.error("Local profile read error:", e);
                }
            }
        }
        
        if (cachedProfiles.length === 0) {
            cachedProfiles.push({
                id: 'dummy-uuid-1',
                email: 'ranggapermana@swiss-belhotel.com',
                first_name: 'Rangga',
                last_name: 'Permana',
                display_name: 'Rangga Permana (Google Authenticated)',
                role: 'Sales & Marketing',
                is_brand_audit_lead: true,
                hotel_name: 'Grand Swiss-Belhotel Darmo',
                hotel_code: 'GSBD',
                created_at: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
                last_sign_in_at: new Date().toISOString()
            });
        }
        setProfilesList(cachedProfiles);
    };

    const handleOpenCreateUser = () => {
        setEditingUser(null);
        setUserFormEmail('');
        setUserFormFirstName('');
        setUserFormLastName('');
        setUserFormDisplayName('');
        setUserFormRole('General Manager');
        setUserFormAccessLevel('auditee');
        setUserFormHotelId('');
        setUserFormIsBrandAuditLead(false);
        setUserFormIsApproved(true);
        setUserFormError('');
        setIsUserFormOpen(true);
    };

    const handleOpenEditUser = (user: any) => {
        setEditingUser(user);
        setUserFormEmail(user.email || '');
        setUserFormFirstName(user.first_name || '');
        setUserFormLastName(user.last_name || '');
        setUserFormDisplayName(user.display_name || '');
        setUserFormRole(user.role || 'General Manager');
        setUserFormAccessLevel(user.access_level || 'auditee');
        setUserFormHotelId(user.hotel_id || '');
        setUserFormIsBrandAuditLead(user.is_brand_audit_lead || false);
        setUserFormIsApproved(user.is_approved !== false);
        setUserFormError('');
        setIsUserFormOpen(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserFormError('');

        if (!userFormEmail.trim()) {
            setUserFormError('Email is a mandatory requirement.');
            return;
        }

        const selectedHotel = hotels.find(h => h.id === userFormHotelId);
        
        const payload = {
            id: editingUser ? editingUser.id : crypto.randomUUID(),
            email: userFormEmail.trim(),
            first_name: userFormFirstName.trim(),
            last_name: userFormLastName.trim(),
            display_name: userFormDisplayName.trim() || `${userFormFirstName.trim()} ${userFormLastName.trim()}`.trim() || userFormEmail.split('@')[0],
            role: userFormRole,
            access_level: userFormAccessLevel,
            hotel_id: userFormHotelId || null,
            hotel_name: selectedHotel ? selectedHotel.name : null,
            hotel_code: selectedHotel ? (selectedHotel.code || null) : null,
            is_brand_audit_lead: userFormIsBrandAuditLead,
            is_approved: userFormIsApproved,
            updated_at: new Date().toISOString()
        };

        try {
            setIsSupabaseLoading(true);
            
            // 1. Save locally to localStorage (as fallback or active state representation)
            localStorage.setItem(`sbi_profile_${payload.id}`, JSON.stringify(payload));

            // 2. Write to Supabase REST endpoint
            if (editingUser) {
                // UPDATE / PATCH
                const res = await fetch(`${MAIN_URL}audit_users?id=eq.${payload.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    throw new Error(`Database profiles update returned status: ${res.status}`);
                }
                setToastMessage('User profile updated successfully!');
            } else {
                // CREATE / POST
                const res = await fetch(`${MAIN_URL}audit_users`, {
                    method: 'POST',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        ...payload,
                        created_at: new Date().toISOString()
                    })
                });
                if (!res.ok) {
                    throw new Error(`Database profiles creation returned status: ${res.status}`);
                }
                setToastMessage('New user created successfully!');
            }

            setIsUserFormOpen(false);
            fetchProfilesFromSupabase();
        } catch (err: any) {
            console.warn("Database sync failed, saved user profile locally.", err);
            setToastMessage('Saved user profile locally');
            setIsUserFormOpen(false);
            fetchProfilesFromSupabase();
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (userProfile?.email !== 'brandaudit@swiss-belhotel.com') {
            setToastMessage('Only the Super Admin (brandaudit@swiss-belhotel.com) is authorized to delete user profiles.');
            setConfirmUserDeleteId(null);
            return;
        }
        try {
            setIsSupabaseLoading(true);
            
            // 1. Delete locally from localStorage
            localStorage.removeItem(`sbi_profile_${userId}`);

            // 2. Delete from Supabase REST endpoint
            const res = await fetch(`${MAIN_URL}audit_users?id=eq.${userId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`
                }
            });

            if (!res.ok && res.status !== 404) {
                throw new Error(`Database deletion returned status: ${res.status}`);
            }

            setToastMessage('User deleted successfully!');
            setConfirmUserDeleteId(null);
            fetchProfilesFromSupabase();
        } catch (err: any) {
            console.warn("Database delete failed, deleted locally.", err);
            setToastMessage('Deleted user locally');
            setConfirmUserDeleteId(null);
            fetchProfilesFromSupabase();
        } finally {
            setIsSupabaseLoading(false);
        }
    };

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
    const [catList, setCatList] = useState<AuditCategory[]>(() => {
        const saved = localStorage.getItem('sbi_audit_categories_v2');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Error parsing categories", e);
            }
        }
        return DEFAULT_CATEGORIES;
    });

    // Fetch categories function
    const [recentSubmissionsData, setRecentSubmissionsData] = useState<any[]>([]);
    const [allSubmissions, setAllSubmissions] = useState<any[]>([]);

    useEffect(() => {
        const fetchRecent = async () => {
            const { data, error } = await supabase
                .from('audit_submissions')
                .select('*, hotels(name, code)')
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (!error && data) {
                setRecentSubmissionsData(data);
            }
        };
        fetchRecent();
    }, []);

    useEffect(() => {
        if (subView !== 'inspection') return;

        let active = true;
        const fetchAllSubmissions = async () => {
            try {
                const { data, error } = await supabase
                    .from('audit_submissions')
                    .select('hotel_id, item_id');
                if (!error && data && active) {
                    setAllSubmissions(data);
                }
            } catch (e) {
                console.error("Error fetching all submissions:", e);
            }
        };

        fetchAllSubmissions();

        const channel = supabase
            .channel('all-submissions-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'audit_submissions'
            }, () => {
                fetchAllSubmissions();
            })
            .subscribe();

        const interval = setInterval(() => {
            fetchAllSubmissions();
        }, 3000);

        return () => {
            active = false;
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [subView]);

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
                departmentId: item.department_id ? String(item.department_id) : undefined,
                sort_order: item.sort_order !== undefined && item.sort_order !== null ? Number(item.sort_order) : undefined
            }));
            
            // Build initial categoryOrder from fetched sort_order values
            const initialCategoryOrder: Record<string, string[]> = { ...categoryOrder };
            const deptsWithCats = Array.from(new Set(mapped.map(c => c.departmentId || 'unassigned')));
            deptsWithCats.forEach(deptId => {
                const deptCats = mapped.filter(c => (c.departmentId || 'unassigned') === deptId);
                if (deptCats.some(c => c.sort_order !== undefined)) {
                    const sorted = [...deptCats].sort((a, b) => {
                        const sA = a.sort_order ?? 999999;
                        const sB = b.sort_order ?? 999999;
                        if (sA !== sB) return sA - sB;
                        return a.name.localeCompare(b.name);
                    });
                    initialCategoryOrder[deptId] = sorted.map(c => c.id);
                }
            });
            setCategoryOrder(initialCategoryOrder);
            
            setCatList(mapped);
            localStorage.setItem('sbi_audit_categories_v2', JSON.stringify(mapped));
            setSupabaseConnected(true);
            setSupabaseErrorMsg(null);
        } catch (err: any) {
            console.warn("Supabase fetch categories error, using fallback:", err);
            setSupabaseConnected(false);
            setSupabaseErrorMsg(null);
            
            const saved = localStorage.getItem('sbi_audit_categories_v2');
            if (saved) {
                try {
                    setCatList(JSON.parse(saved));
                } catch (e) {
                    setCatList(DEFAULT_CATEGORIES);
                }
            } else {
                setCatList(DEFAULT_CATEGORIES);
            }
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    const fetchGroupsFromSupabase = async () => {
        try {
            // Fetch checklist groups
            const { data: groupsData, error: groupsError } = await supabase
                .from('audit_checklist_groups')
                .select('*')
                .order('name', { ascending: true });

            if (groupsError) {
                console.warn("Could not fetch groups from Supabase, relying on localStorage fallback:", groupsError);
                return;
            }

            // Fetch join table associations
            const { data: groupHotels, error: ghError } = await supabase
                .from('audit_group_hotels')
                .select('*');

            const mapped: AuditGroup[] = (groupsData || []).map((g: any) => {
                const hotelIds = (groupHotels || [])
                    .filter((gh: any) => gh.group_id === g.id)
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

            setGroups(mapped);
            if (mapped.length > 0 && !selectedGroupId) {
                setSelectedGroupId(mapped[0].id);
            }
        } catch (err) {
            console.warn("Exception fetching groups from Supabase:", err);
        }
    };

    // CRUD state for Items
    const [items, setItems] = useState<AuditItem[]>(() => {
        const saved = localStorage.getItem('sbi_audit_items_v2');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Error parsing items", e);
            }
        }
        return DEFAULT_OFFLINE_ITEMS;
    });
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [itemOrder, setItemOrder] = useState<Record<string, string[]>>({});
    const [expandedDepartments, setExpandedDepartments] = useState<Record<string, boolean>>({});
    const [categoryOrder, setCategoryOrder] = useState<Record<string, string[]>>({});

    useEffect(() => {
        const savedOrder = localStorage.getItem('sbi_item_orders');
        if (savedOrder) {
            try {
                setItemOrder(JSON.parse(savedOrder));
            } catch (e) {}
        }
        
        const savedCatOrder = localStorage.getItem('sbi_category_orders');
        if (savedCatOrder) {
            try {
                setCategoryOrder(JSON.parse(savedCatOrder));
            } catch (e) {}
        }
    }, []);

    const saveItemOrder = (newOrder: Record<string, string[]>) => {
        setItemOrder(newOrder);
        localStorage.setItem('sbi_item_orders', JSON.stringify(newOrder));
    };

    const saveCategoryOrder = (newOrder: Record<string, string[]>) => {
        setCategoryOrder(newOrder);
        localStorage.setItem('sbi_category_orders', JSON.stringify(newOrder));
    };

    const toggleCategoryExpansion = (categoryId: string) => {
        setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
    };

    const toggleDepartmentExpansion = (deptId: string) => {
        setExpandedDepartments(prev => ({ ...prev, [deptId]: !prev[deptId] }));
    };

    const handleMoveCategory = async (category: AuditCategory, direction: 'up' | 'down') => {
        const deptId = category.departmentId || 'unassigned';
        const currentDeptCats = catList.filter(c => (c.departmentId || 'unassigned') === deptId);
        
        const orderArray = categoryOrder[deptId] || [];
        const sortedDeptCats = [...currentDeptCats].sort((a, b) => {
            const idxA = orderArray.indexOf(a.id);
            const idxB = orderArray.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            if (a.sort_order !== undefined && b.sort_order !== undefined) return a.sort_order - b.sort_order;
            return a.name.localeCompare(b.name);
        });

        const currentIndex = sortedDeptCats.findIndex(c => c.id === category.id);
        if (currentIndex === -1) return;

        let targetIndex = -1;
        if (direction === 'up' && currentIndex > 0) {
            targetIndex = currentIndex - 1;
        } else if (direction === 'down' && currentIndex < sortedDeptCats.length - 1) {
            targetIndex = currentIndex + 1;
        }

        if (targetIndex !== -1) {
            const targetCat = sortedDeptCats[targetIndex];
            
            // Swap categories in local array representation
            const newDeptCatsIds = sortedDeptCats.map(c => c.id);
            newDeptCatsIds[currentIndex] = targetCat.id;
            newDeptCatsIds[targetIndex] = category.id;
            
            // Update local state first for instant feedback
            saveCategoryOrder({ ...categoryOrder, [deptId]: newDeptCatsIds });

            // Assign numeric sort_orders and save to Supabase
            try {
                const updates = newDeptCatsIds.map((id, index) => {
                    return fetch(`${MAIN_URL}audit_categories?id=eq.${id}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': MAIN_KEY,
                            'Authorization': `Bearer ${MAIN_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ sort_order: index + 1 })
                    });
                });
                
                await Promise.all(updates);
                
                // Update local catList state
                setCatList(prevCats => {
                    return prevCats.map(c => {
                        const idx = newDeptCatsIds.indexOf(c.id);
                        if (idx !== -1) {
                            return { ...c, sort_order: idx + 1 };
                        }
                        return c;
                    });
                });
                
                setToastMessage('Category order updated in Database successfully!');
            } catch (err: any) {
                console.error("Error updating sort_order for category in database:", err);
                setToastMessage('Saved category order locally (Run SQL script in Supabase to sync to database)');
            }
        }
    };

    const handleMoveItem = async (item: AuditItem, direction: 'up' | 'down') => {
        const catId = item.categoryId;
        const currentCatItems = items.filter(i => i.categoryId === catId);
        
        const orderArray = itemOrder[catId] || [];
        const sortedCatItems = [...currentCatItems].sort((a, b) => {
            const idxA = orderArray.indexOf(a.id);
            const idxB = orderArray.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            if (a.sort_order !== undefined && b.sort_order !== undefined) return a.sort_order - b.sort_order;
            return a.name.localeCompare(b.name);
        });

        const currentIndex = sortedCatItems.findIndex(i => i.id === item.id);
        if (currentIndex === -1) return;

        let targetIndex = -1;
        if (direction === 'up' && currentIndex > 0) {
            targetIndex = currentIndex - 1;
        } else if (direction === 'down' && currentIndex < sortedCatItems.length - 1) {
            targetIndex = currentIndex + 1;
        }

        if (targetIndex !== -1) {
            const targetItem = sortedCatItems[targetIndex];
            
            // Swap items in local array representation
            const newCatItemsIds = sortedCatItems.map(i => i.id);
            newCatItemsIds[currentIndex] = targetItem.id;
            newCatItemsIds[targetIndex] = item.id;
            
            // Update local state first for instant feedback
            saveItemOrder({ ...itemOrder, [catId]: newCatItemsIds });

            // Assign numeric sort_orders and save to Supabase
            try {
                const updates = newCatItemsIds.map((id, index) => {
                    return fetch(`${MAIN_URL}audit_items?id=eq.${id}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': MAIN_KEY,
                            'Authorization': `Bearer ${MAIN_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ sort_order: index + 1 })
                    });
                });
                
                await Promise.all(updates);
                
                // Update local items state
                setItems(prevItems => {
                    return prevItems.map(i => {
                        const idx = newCatItemsIds.indexOf(i.id);
                        if (idx !== -1) {
                            return { ...i, sort_order: idx + 1 };
                        }
                        return i;
                    });
                });
                
                setToastMessage('Item order updated in Database successfully!');
            } catch (err: any) {
                console.error("Error updating sort_order in database:", err);
                setToastMessage('Saved order locally (Run SQL script in Supabase to sync to database)');
            }
        }
    };

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
                description: item.description,
                sort_order: item.sort_order !== undefined && item.sort_order !== null ? Number(item.sort_order) : undefined,
                filled_by_hotel: item.filled_by_hotel !== undefined && item.filled_by_hotel !== null ? Boolean(item.filled_by_hotel) : true,
                min_value: item.min_value !== undefined && item.min_value !== null ? Number(item.min_value) : undefined
            }));
            
            // Build initial itemOrder from fetched sort_order values
            const initialItemOrder: Record<string, string[]> = { ...itemOrder };
            const categoriesWithItems = Array.from(new Set(mapped.map(i => i.categoryId)));
            categoriesWithItems.forEach(catId => {
                const catItems = mapped.filter(i => i.categoryId === catId);
                if (catItems.some(i => i.sort_order !== undefined)) {
                    const sorted = [...catItems].sort((a, b) => {
                        const sA = a.sort_order ?? 999999;
                        const sB = b.sort_order ?? 999999;
                        if (sA !== sB) return sA - sB;
                        return a.name.localeCompare(b.name);
                    });
                    initialItemOrder[catId] = sorted.map(i => i.id);
                }
            });
            setItemOrder(initialItemOrder);
            
            setItems(mapped);
            localStorage.setItem('sbi_audit_items_v2', JSON.stringify(mapped));
            setSupabaseConnected(true);
            setSupabaseErrorMsg(null);
        } catch (err: any) {
            console.warn("Supabase fetch items error, using fallback:", err);
            setSupabaseConnected(false);
            setSupabaseErrorMsg(null);
            
            const saved = localStorage.getItem('sbi_audit_items_v2');
            if (saved) {
                try {
                    setItems(JSON.parse(saved));
                } catch (e) {
                    setItems(DEFAULT_OFFLINE_ITEMS);
                }
            } else {
                setItems(DEFAULT_OFFLINE_ITEMS);
            }
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
            localStorage.setItem('sbi_audit_departments_v2', JSON.stringify(mapped));
            setSupabaseConnected(true);
            setSupabaseErrorMsg(null);
        } catch (err: any) {
            console.warn("Supabase fetch departments error, using fallback:", err);
            setSupabaseConnected(false);
            setSupabaseErrorMsg(null);
            
            const saved = localStorage.getItem('sbi_audit_departments_v2');
            if (saved) {
                try {
                    setDepartments(JSON.parse(saved));
                } catch (e) {
                    setDepartments(DEFAULT_DEPARTMENTS);
                }
            } else {
                setDepartments(DEFAULT_DEPARTMENTS);
            }
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

                const rawId = item.id !== undefined && item.id !== null ? String(item.id) : '';
                const fallbackId = item.hotel_id !== undefined && item.hotel_id !== null ? String(item.hotel_id) : '';
                const finalId = rawId || fallbackId || item.code || String(item.name || '').replace(/\s+/g, '-').toLowerCase();

                return {
                    id: finalId,
                    name: item.name || item.hotel_name || '',
                    location: item.location || item.city_country || '',
                    code: item.code || '',
                    brandClass: item.brandClass || item.brand_class || item.brand || 'Swiss-Belhotel',
                    region: region,
                    country: country,
                    stars: Number(stars) || 4
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
            localStorage.setItem('sbi_audit_hotels_v2', JSON.stringify(mapped));
            setSupabaseConnected(true);
            setSupabaseErrorMsg(null);
        } catch (err: any) {
            console.warn("Supabase fetch error, using fallback:", err);
            setSupabaseConnected(false);
            setSupabaseErrorMsg(null);
            
            const saved = localStorage.getItem('sbi_audit_hotels_v2');
            if (saved) {
                try {
                    setHotels(JSON.parse(saved));
                } catch (e) {
                    setHotels(DEFAULT_HOTELS);
                }
            } else {
                setHotels(DEFAULT_HOTELS);
            }
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
                localStorage.setItem('sbi_audit_batches_v2', JSON.stringify(mappedBatches));
            }
            setSupabaseConnected(true);
            setSupabaseErrorMsg(null);
        } catch (err: any) {
            console.warn("Error fetching batches, using fallback:", err);
            setSupabaseConnected(false);
            setSupabaseErrorMsg(null);
            
            const saved = localStorage.getItem('sbi_audit_batches_v2');
            if (saved) {
                try {
                    setBatches(JSON.parse(saved));
                } catch (e) {
                    setBatches(DEFAULT_BATCHES);
                }
            } else {
                setBatches(DEFAULT_BATCHES);
            }
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    const [isAdminSyncing, setIsAdminSyncing] = useState(false);

    const syncAllAdminData = async (silent = false) => {
        if (!silent) setIsAdminSyncing(true);
        try {
            await Promise.all([
                fetchHotelsFromSupabase(),
                fetchBatchesFromSupabase(),
                fetchDepartmentsFromSupabase(),
                fetchCategoriesFromSupabase(),
                fetchItemsFromSupabase(),
                fetchProfilesFromSupabase()
            ]);
            if (!silent) {
                setToastMessage("All admin database collections synced successfully!");
                setTimeout(() => setToastMessage(null), 3000);
            }
        } catch (err) {
            console.error("Error syncing admin data:", err);
        } finally {
            if (!silent) setIsAdminSyncing(false);
        }
    };

    useEffect(() => {
        localStorage.setItem('sbi_audit_hotels_v2', JSON.stringify(hotels));
    }, [hotels]);

    // Perform database sync on subView transition and initialization
    useEffect(() => {
        syncAllAdminData(true);

        // Subscribe to real-time events to keep admin dashboard always up-to-date with database changes
        const adminRealtimeChannel = supabase
            .channel('admin-realtime-db-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_departments' }, () => {
                console.log('Real-time database update detected for audit_departments.');
                fetchDepartmentsFromSupabase();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_categories' }, () => {
                console.log('Real-time database update detected for audit_categories.');
                fetchCategoriesFromSupabase();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_items' }, () => {
                console.log('Real-time database update detected for audit_items.');
                fetchItemsFromSupabase();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_users' }, () => {
                console.log('Real-time database update detected for audit_users.');
                fetchProfilesFromSupabase();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_batches' }, () => {
                console.log('Real-time database update detected for audit_batches.');
                fetchBatchesFromSupabase();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_batch_hotels' }, () => {
                console.log('Real-time database update detected for audit_batch_hotels.');
                fetchBatchesFromSupabase();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'hotels' }, () => {
                console.log('Real-time database update detected for hotels.');
                fetchHotelsFromSupabase();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(adminRealtimeChannel);
        };
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
        } else if (subView === 'groups') {
            fetchGroupsFromSupabase();
            fetchCategoriesFromSupabase();
            fetchItemsFromSupabase();
        } else if (subView === 'users') {
            fetchProfilesFromSupabase();
        }
    }, [subView]);

    // Toast and Dialog states
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [hotelFilterBrand, setHotelFilterBrand] = useState('All');
    const [hotelFilterStars, setHotelFilterStars] = useState('All');

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
    const [hotelRegion, setHotelRegion] = useState('ANZPAC');
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
    const [itemFilledByHotel, setItemFilledByHotel] = useState<boolean>(true);
    const [itemMinValue, setItemMinValue] = useState<number | ''>('');
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

    // User Management CRUD states
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [userFormEmail, setUserFormEmail] = useState('');
    const [userFormFirstName, setUserFormFirstName] = useState('');
    const [userFormLastName, setUserFormLastName] = useState('');
    const [userFormDisplayName, setUserFormDisplayName] = useState('');
    const [userFormRole, setUserFormRole] = useState('');
    const [userFormAccessLevel, setUserFormAccessLevel] = useState<'admin' | 'auditor' | 'auditee'>('auditee');
    const [userFormHotelId, setUserFormHotelId] = useState('');
    const [userFormIsBrandAuditLead, setUserFormIsBrandAuditLead] = useState(false);
    const [userFormIsApproved, setUserFormIsApproved] = useState(true);
    const [userFormError, setUserFormError] = useState('');
    const [confirmUserDeleteId, setConfirmUserDeleteId] = useState<string | null>(null);

    // Auditor scoring & inspection states
    const [selectedInspectionHotelId, setSelectedInspectionHotelId] = useState<string>('');
    const [selectedAuditorId, setSelectedAuditorId] = useState<string>('');
    const [selectedInspectionCategoryId, setSelectedInspectionCategoryId] = useState<string>('');
    const [hotelSubmissions, setHotelSubmissions] = useState<Record<string, any>>({});
    const [inspectionScores, setInspectionScores] = useState<Record<string, number>>(() => {
        const stored = localStorage.getItem('sbi_inspection_scores');
        return stored ? JSON.parse(stored) : {};
    });
    const [inspectionComments, setInspectionComments] = useState<Record<string, string>>(() => {
        const stored = localStorage.getItem('sbi_inspection_comments');
        return stored ? JSON.parse(stored) : {};
    });

    const isSubmissionForHotel = (submissionHotelId: string, hotel: Hotel) => {
        if (!submissionHotelId || !hotel) return false;
        
        const subIdLower = String(submissionHotelId).toLowerCase();
        const hotelIdLower = String(hotel.id).toLowerCase();
        
        if (subIdLower === hotelIdLower) return true;
        
        if (hotel.code && subIdLower === String(hotel.code).toLowerCase()) return true;
        
        const associatedIds = new Set<string>();
        profilesList.forEach(p => {
            const matchesCode = p.hotel_code && hotel.code && String(p.hotel_code).toLowerCase() === String(hotel.code).toLowerCase();
            const matchesName = p.hotel_name && hotel.name && String(p.hotel_name).toLowerCase() === String(hotel.name).toLowerCase();
            const matchesId = p.hotel_id && hotel.id && String(p.hotel_id).toLowerCase() === String(hotel.id).toLowerCase();
            if (matchesCode || matchesName || matchesId) {
                if (p.hotel_id) associatedIds.add(String(p.hotel_id).toLowerCase());
            }
        });
        
        if (associatedIds.has(subIdLower)) return true;
        
        return false;
    };

    const getSubmitterName = (sub: any, currentHotel?: any) => {
        if (!sub) return 'Property User';
        if (sub.submitted_by) return sub.submitted_by;
        if (sub.submitted_by_name) return sub.submitted_by_name;
        if (sub.user_name) return sub.user_name;

        const uid = sub.user_id || sub.created_by;
        if (uid && profilesList && profilesList.length > 0) {
            const foundUser = profilesList.find(p => p.id === uid || p.email === uid);
            if (foundUser) {
                const name = `${foundUser.first_name || ''} ${foundUser.last_name || ''}`.trim() || foundUser.display_name || foundUser.email;
                if (name) return name;
            }
        }

        const targetHotelId = sub.hotel_id || currentHotel?.id;
        const targetHotelCode = currentHotel?.code;
        const targetHotelName = currentHotel?.name;

        if (profilesList && profilesList.length > 0) {
            const hotelUsers = profilesList.filter(p => {
                if (p.access_level === 'admin' || p.access_level === 'auditor') return false;
                const matchesId = targetHotelId && p.hotel_id && String(p.hotel_id).toLowerCase() === String(targetHotelId).toLowerCase();
                const matchesCode = targetHotelCode && p.hotel_code && String(p.hotel_code).toLowerCase() === String(targetHotelCode).toLowerCase();
                const matchesName = targetHotelName && p.hotel_name && String(p.hotel_name).toLowerCase() === String(targetHotelName).toLowerCase();
                return matchesId || matchesCode || matchesName;
            });

            if (hotelUsers.length > 0) {
                const userNames = hotelUsers.map(p => `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.display_name || p.email).filter(Boolean);
                if (userNames.length > 0) {
                    return userNames.join(', ');
                }
            }
        }

        if (userProfile && userProfile.access_level === 'auditee') {
            const name = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.display_name || userProfile.email;
            if (name) return name;
        }

        const storedUserName = localStorage.getItem('sbi_user_name');
        if (storedUserName) return storedUserName;

        return 'Property User';
    };

    useEffect(() => {
        let active = true;
        const fetchSubmissions = async () => {
            if (!selectedInspectionHotelId) {
                if (active) setHotelSubmissions({});
                return;
            }
            try {
                const hotel = hotels.find(h => h.id === selectedInspectionHotelId);
                const associatedIds = new Set<string>();
                if (hotel) {
                    associatedIds.add(hotel.id);
                    if (hotel.code) associatedIds.add(hotel.code);
                    associatedIds.add(hotel.name);
                    
                    profilesList.forEach(p => {
                        const matchesCode = p.hotel_code && hotel.code && String(p.hotel_code).toLowerCase() === String(hotel.code).toLowerCase();
                        const matchesName = p.hotel_name && hotel.name && String(p.hotel_name).toLowerCase() === String(hotel.name).toLowerCase();
                        const matchesId = p.hotel_id && hotel.id && String(p.hotel_id).toLowerCase() === String(hotel.id).toLowerCase();
                        if (matchesCode || matchesName || matchesId) {
                            if (p.hotel_id) associatedIds.add(String(p.hotel_id));
                        }
                    });
                } else {
                    associatedIds.add(selectedInspectionHotelId);
                }

                const { data, error } = await supabase
                    .from('audit_submissions')
                    .select('*')
                    .in('hotel_id', Array.from(associatedIds));
                
                if (error) throw error;
                
                const submissionsMap: Record<string, any> = {};
                data?.forEach(sub => {
                    submissionsMap[sub.item_id] = sub;
                });
                if (active) setHotelSubmissions(submissionsMap);
            } catch (err) {
                console.error("Error fetching hotel submissions:", err);
            }
        };
        fetchSubmissions();

        if (!selectedInspectionHotelId) return;

        // Set up real-time subscription to update auditor dashboard instantly when auditee submits evidence
        const channel = supabase
            .channel(`submissions-realtime-${selectedInspectionHotelId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'audit_submissions'
            }, (payload) => {
                console.log('Real-time database submission event:', payload);
                fetchSubmissions();
            })
            .subscribe();

        // 3-second background polling interval to guarantee instant updates if WebSocket/real-time replication is disabled
        const interval = setInterval(() => {
            fetchSubmissions();
        }, 3000);

        return () => {
            active = false;
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [selectedInspectionHotelId, profilesList, hotels]);

    const safeFormatDate = (dateStr: any) => {
        if (!dateStr) return 'Recent';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 'Recent';
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
            return 'Recent';
        }
    };

    const safeFormatDateTime = (dateStr: any) => {
        if (!dateStr) return 'Recently synced';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 'Recent';
            return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return 'Recent';
        }
    };

    const saveInspectionScore = (hotelId: string, itemId: string, score: number | undefined) => {
        const updated = { ...inspectionScores };
        if (score === undefined) {
            delete updated[`${hotelId}_${itemId}`];
        } else {
            updated[`${hotelId}_${itemId}`] = score;
        }
        setInspectionScores(updated);
        localStorage.setItem('sbi_inspection_scores', JSON.stringify(updated));
    };

    const saveInspectionComment = (hotelId: string, itemId: string, comment: string) => {
        const updated = {
            ...inspectionComments,
            [`${hotelId}_${itemId}`]: comment
        };
        setInspectionComments(updated);
        localStorage.setItem('sbi_inspection_comments', JSON.stringify(updated));
    };

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

    const handleDeleteGroup = async (id: string) => {
        try {
            const { error } = await supabase
                .from('audit_checklist_groups')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setGroups(prev => prev.filter(g => g.id !== id));
            if (selectedGroupId === id) {
                setSelectedGroupId('');
            }
            setToastMessage("Audit Group deleted successfully!");
        } catch (err: any) {
            console.warn("Database delete failed, deleting locally:", err);
            setGroups(prev => prev.filter(g => g.id !== id));
            if (selectedGroupId === id) {
                setSelectedGroupId('');
            }
            setToastMessage("Audit Group deleted locally");
        } finally {
            setConfirmGroupDeleteId(null);
            fetchGroupsFromSupabase();
        }
    };

    const handleSaveGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName.trim()) {
            setGroupError("Group name is required.");
            return;
        }

        const trimmedName = groupName.trim();
        const trimmedDesc = groupDescription.trim();

        try {
            if (editingGroup) {
                // Update Supabase
                const { error } = await supabase
                    .from('audit_checklist_groups')
                    .update({ 
                        name: trimmedName, 
                        description: trimmedDesc,
                        category_ids: groupCategoryIds,
                        item_ids: groupItemIds
                    })
                    .eq('id', editingGroup.id);

                if (error) {
                    console.warn("DB update failed with category_ids/item_ids, trying without them...", error);
                    const { error: retryError } = await supabase
                        .from('audit_checklist_groups')
                        .update({ name: trimmedName, description: trimmedDesc })
                        .eq('id', editingGroup.id);
                    if (retryError) throw retryError;
                }

                // Update local state
                setGroups(prev => prev.map(g => g.id === editingGroup.id ? { 
                    ...g, 
                    name: trimmedName, 
                    description: trimmedDesc,
                    categoryIds: groupCategoryIds,
                    itemIds: groupItemIds
                } : g));
                setToastMessage("Audit Group updated successfully!");
            } else {
                // Insert Supabase
                let insertedId = '';
                const { data, error } = await supabase
                    .from('audit_checklist_groups')
                    .insert({ 
                        name: trimmedName, 
                        description: trimmedDesc,
                        category_ids: groupCategoryIds,
                        item_ids: groupItemIds
                    })
                    .select();

                if (error) {
                    console.warn("DB insert failed with category_ids/item_ids, trying without them...", error);
                    const { data: retryData, error: retryError } = await supabase
                        .from('audit_checklist_groups')
                        .insert({ name: trimmedName, description: trimmedDesc })
                        .select();
                    if (retryError) throw retryError;
                    insertedId = retryData?.[0]?.id ? String(retryData[0].id) : String(Date.now());
                } else {
                    insertedId = data?.[0]?.id ? String(data[0].id) : String(Date.now());
                }

                // Update local state
                const newGroup: AuditGroup = {
                    id: insertedId,
                    name: trimmedName,
                    description: trimmedDesc,
                    categoryIds: groupCategoryIds,
                    itemIds: groupItemIds
                };
                setGroups(prev => [...prev, newGroup]);
                setSelectedGroupId(insertedId);
                setToastMessage("Audit Group created successfully!");
            }
            setIsGroupFormOpen(false);
            fetchGroupsFromSupabase();
        } catch (err: any) {
            console.warn("Database group save failed, writing locally:", err);
            if (editingGroup) {
                setGroups(prev => prev.map(g => g.id === editingGroup.id ? { 
                    ...g, 
                    name: trimmedName, 
                    description: trimmedDesc,
                    categoryIds: groupCategoryIds,
                    itemIds: groupItemIds
                } : g));
                setToastMessage("Audit Group updated locally!");
            } else {
                const localId = String(Date.now());
                const newGroup: AuditGroup = {
                    id: localId,
                    name: trimmedName,
                    description: trimmedDesc,
                    categoryIds: groupCategoryIds,
                    itemIds: groupItemIds
                };
                setGroups(prev => [...prev, newGroup]);
                setSelectedGroupId(localId);
                setToastMessage("Audit Group created locally!");
            }
            setIsGroupFormOpen(false);
        }
    };

    const handleToggleGroupHotel = async (groupId: string, hotelId: string) => {
        if (!groupId || !hotelId) return;
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        const assignedHotelIds = group.hotelIds || [];
        const isAssigned = assignedHotelIds.includes(hotelId);

        // Find if hotel is already assigned to a different group
        const otherGroup = groups.find(g => g.id !== groupId && (g.hotelIds || []).includes(hotelId));

        try {
            if (isAssigned) {
                const { error } = await supabase
                    .from('audit_group_hotels')
                    .delete()
                    .eq('group_id', groupId)
                    .eq('hotel_id', hotelId);
                if (error) throw error;

                setGroups(prev => prev.map(g => {
                    if (g.id === groupId) {
                        return {
                            ...g,
                            hotelIds: (g.hotelIds || []).filter(id => id !== hotelId)
                        };
                    }
                    return g;
                }));
                setToastMessage("Hotel unassigned from group!");
            } else {
                // One hotel can only be assigned to one group.
                // If it is assigned to another group, first delete that association in database.
                if (otherGroup) {
                    const { error: deleteError } = await supabase
                        .from('audit_group_hotels')
                        .delete()
                        .eq('hotel_id', hotelId);
                    if (deleteError) throw deleteError;
                }

                const { error } = await supabase
                    .from('audit_group_hotels')
                    .insert({ group_id: groupId, hotel_id: hotelId });
                if (error) throw error;

                setGroups(prev => prev.map(g => {
                    if (g.id === groupId) {
                        return {
                            ...g,
                            hotelIds: [...(g.hotelIds || []).filter(id => id !== hotelId), hotelId]
                        };
                    }
                    // Remove from any other group
                    return {
                        ...g,
                        hotelIds: (g.hotelIds || []).filter(id => id !== hotelId)
                    };
                }));

                if (otherGroup) {
                    setToastMessage(`Moved hotel from "${otherGroup.name}" to "${group.name}"!`);
                } else {
                    setToastMessage("Hotel assigned to group successfully!");
                }
            }
        } catch (err: any) {
            console.warn("Database assignment failed, toggling locally:", err);
            setGroups(prev => prev.map(g => {
                if (g.id === groupId) {
                    const exists = (g.hotelIds || []).includes(hotelId);
                    return {
                        ...g,
                        hotelIds: exists 
                            ? (g.hotelIds || []).filter(id => id !== hotelId)
                            : [...(g.hotelIds || []).filter(id => id !== hotelId), hotelId]
                    };
                }
                // For other groups, if we are assigning to groupId, make sure it's removed from them
                if (!isAssigned) {
                    return {
                        ...g,
                        hotelIds: (g.hotelIds || []).filter(id => id !== hotelId)
                    };
                }
                return g;
            }));
            setToastMessage(isAssigned ? "Hotel unassigned locally" : (otherGroup ? `Moved hotel locally from "${otherGroup.name}"` : "Hotel assigned locally"));
        }
    };

    const handleGroupAssignAllHotels = async (groupId: string) => {
        if (!groupId) return;
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        try {
            // Since one hotel can only be assigned to one group, assigning all hotels to this group
            // means we must first clear all other group associations in the database.
            const { error: deleteError } = await supabase
                .from('audit_group_hotels')
                .delete()
                .neq('group_id', '00000000-0000-0000-0000-000000000000');
            if (deleteError) throw deleteError;

            const inserts = hotels.map(hotel => ({ group_id: groupId, hotel_id: hotel.id }));
            const { error } = await supabase
                .from('audit_group_hotels')
                .insert(inserts);
            if (error) throw error;

            setGroups(prev => prev.map(g => {
                if (g.id === groupId) {
                    return {
                        ...g,
                        hotelIds: hotels.map(h => h.id)
                    };
                }
                return {
                    ...g,
                    hotelIds: []
                };
            }));
            setToastMessage(`Assigned all ${hotels.length} hotels to group "${group.name}"!`);
        } catch (err: any) {
            console.warn("DB Batch Insert failed, doing locally:", err);
            setGroups(prev => prev.map(g => {
                if (g.id === groupId) {
                    return {
                        ...g,
                        hotelIds: hotels.map(h => h.id)
                    };
                }
                return {
                    ...g,
                    hotelIds: []
                };
            }));
            setToastMessage("Assigned all hotels locally.");
        }
    };

    const handleGroupClearAllHotels = async (groupId: string) => {
        if (!groupId) return;
        try {
            const { error } = await supabase
                .from('audit_group_hotels')
                .delete()
                .eq('group_id', groupId);
            if (error) throw error;

            setGroups(prev => prev.map(g => {
                if (g.id === groupId) {
                    return { ...g, hotelIds: [] };
                }
                return g;
            }));
            setToastMessage("Cleared all hotels from group!");
        } catch (err: any) {
            console.warn("DB Batch Delete failed, doing locally:", err);
            setGroups(prev => prev.map(g => {
                if (g.id === groupId) {
                    return { ...g, hotelIds: [] };
                }
                return g;
            }));
            setToastMessage("Cleared hotels locally.");
        }
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
        setItemFilledByHotel(true);
        setItemMinValue('');
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
        setItemFilledByHotel(item.filled_by_hotel ?? true);
        setItemMinValue(item.min_value ?? '');
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
                filled_by_hotel: itemFilledByHotel,
                min_value: itemInputType === 'numeric' && itemMinValue !== '' ? Number(itemMinValue) : null,
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
                
                setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...itemData, departmentId: itemDepartmentId, categoryId: itemCategoryId, inputType: itemInputType, points: itemPoints, filled_by_hotel: itemFilledByHotel, min_value: itemInputType === 'numeric' && itemMinValue !== '' ? Number(itemMinValue) : undefined } : i));
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
                
                setItems(prev => [...prev, { id: String(data[0].id), ...itemData, departmentId: itemDepartmentId, categoryId: itemCategoryId, inputType: itemInputType, points: itemPoints, filled_by_hotel: itemFilledByHotel, min_value: itemInputType === 'numeric' && itemMinValue !== '' ? Number(itemMinValue) : undefined }]);
                setToastMessage('New item added to Database!');
            }

            setIsItemFormOpen(false);
            setItemName('');
            setItemDepartmentId('');
            setItemCategoryId('');
            setItemInputType('text');
            setItemPoints(5);
            setItemMinValue('');
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

    const [copiedSql, setCopiedSql] = useState(false);

    const handleToggleCategoryAssignment = async (auditorId: string, categoryId: string) => {
        if (!auditorId || !categoryId) return;

        const existing = auditorCategoryAssignments.find(a => a.category_id === categoryId);
        const isAssignedToSelected = existing?.user_id === auditorId;
        const isAssignedToOther = existing && existing.user_id !== auditorId;

        let updated = [...auditorCategoryAssignments];
        if (isAssignedToSelected) {
            updated = updated.filter(a => !(a.user_id === auditorId && a.category_id === categoryId));
        } else {
            if (isAssignedToOther) {
                updated = updated.filter(a => a.category_id !== categoryId);
            }
            updated.push({ user_id: auditorId, category_id: categoryId });
        }

        setAuditorCategoryAssignments(updated);
        localStorage.setItem('sbi_auditor_category_assignments', JSON.stringify(updated));

        try {
            if (isAssignedToSelected) {
                const { error } = await supabase
                    .from('auditor_category_assignments')
                    .delete()
                    .eq('user_id', auditorId)
                    .eq('category_id', categoryId);
                
                if (error) {
                    await supabase
                        .from('auditor_assignments')
                        .delete()
                        .eq('user_id', auditorId)
                        .eq('category_id', categoryId);
                }
            } else {
                if (isAssignedToOther) {
                    const { error: delErr } = await supabase
                        .from('auditor_category_assignments')
                        .delete()
                        .eq('category_id', categoryId);
                    if (delErr) {
                        await supabase
                            .from('auditor_assignments')
                            .delete()
                            .eq('category_id', categoryId);
                    }
                }

                const { error: insErr } = await supabase
                    .from('auditor_category_assignments')
                    .insert({ user_id: auditorId, category_id: categoryId });

                if (insErr) {
                    const { error: fallbackErr } = await supabase
                        .from('auditor_assignments')
                        .insert({ user_id: auditorId, category_id: categoryId });
                    
                    if (fallbackErr) {
                        console.log('Category assignment saved locally in state.');
                    }
                }
            }

            const { data: refetchCat } = await supabase.from('auditor_category_assignments').select('*');
            if (refetchCat && refetchCat.length >= 0) {
                setAuditorCategoryAssignments(refetchCat);
                localStorage.setItem('sbi_auditor_category_assignments', JSON.stringify(refetchCat));
            }
        } catch (err) {
            console.error('Category assignment sync error:', err);
        }
    };

    const handleAssignAllCategories = async (auditorId: string) => {
        if (!auditorId) return;
        const newAssignments = catList.map(cat => ({ user_id: auditorId, category_id: cat.id }));
        setAuditorCategoryAssignments(newAssignments);
        localStorage.setItem('sbi_auditor_category_assignments', JSON.stringify(newAssignments));

        try {
            await supabase.from('auditor_category_assignments').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('auditor_category_assignments').insert(newAssignments);
        } catch (e) {
            console.warn('Batch assign error:', e);
        }
    };

    const handleClearAllCategories = async (auditorId: string) => {
        if (!auditorId) return;
        const updated = auditorCategoryAssignments.filter(a => a.user_id !== auditorId);
        setAuditorCategoryAssignments(updated);
        localStorage.setItem('sbi_auditor_category_assignments', JSON.stringify(updated));

        try {
            await supabase.from('auditor_category_assignments').delete().eq('user_id', auditorId);
            await supabase.from('auditor_assignments').delete().eq('user_id', auditorId).not('category_id', 'is', null);
        } catch (e) {
            console.warn('Batch clear error:', e);
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
                code: hotelCode.trim().toUpperCase(),
                name: hotelName.trim(),
                brand: hotelBrandClass,
                region: hotelRegion.trim(),
                country: hotelLocation.trim() || hotelCountry.trim() || 'Indonesia',
                star_rating: Number(hotelStars),
                isActive: true
            };

            let savedInSupabase = false;

            try {
                if (editingHotel) {
                    // Update
                    const targetCode = editingHotel.code || editingHotel.id;
                    const response = await fetch(`${HOTELS_URL}hotels?code=eq.${targetCode}`, {
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
                        // Retry fallback with simpler payload if constraints are strict
                        const basicPayload = {
                            code: hotelCode.trim().toUpperCase(),
                            name: hotelName.trim(),
                            brand: hotelBrandClass,
                            country: hotelLocation.trim() || hotelCountry.trim() || 'Indonesia'
                        };
                        const fallbackResponse = await fetch(`${HOTELS_URL}hotels?code=eq.${targetCode}`, {
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
                        // Try fallback if some database restriction occurs
                        const basicPayload = {
                            code: hotelCode.trim().toUpperCase(),
                            name: hotelName.trim(),
                            brand: hotelBrandClass,
                            country: hotelLocation.trim() || hotelCountry.trim() || 'Indonesia'
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
            const response = await fetch(`${HOTELS_URL}hotels?code=eq.${id}`, {
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

    const filteredHotels = hotels.filter(h => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q || 
            h.name.toLowerCase().includes(q) || 
            h.location.toLowerCase().includes(q) ||
            h.brandClass.toLowerCase().includes(q) ||
            (h.code || '').toLowerCase().includes(q) ||
            (h.region || '').toLowerCase().includes(q) ||
            (h.country || '').toLowerCase().includes(q);

        if (!matchesSearch) return false;

        if (hotelFilterBrand !== 'All' && h.brandClass !== hotelFilterBrand) return false;

        if (hotelFilterStars !== 'All' && h.stars !== Number(hotelFilterStars)) return false;

        return true;
    });

    const uniqueBrands = (Array.from(new Set(hotels.map(h => h.brandClass).filter(Boolean))) as string[]).sort();
    const uniqueStars = (Array.from(new Set(hotels.map(h => Number(h.stars) || 4))) as number[]).sort((a, b) => b - a);

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

    const groupedItems = Array.from(new Set(filteredItems.map(i => i.categoryId))).map(catId => {
        const cat = catList.find(c => c.id === catId);
        const catItems = filteredItems.filter(i => i.categoryId === catId);
        
        const orderArray = itemOrder[catId] || [];
        catItems.sort((a, b) => {
            const idxA = orderArray.indexOf(a.id);
            const idxB = orderArray.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            if (a.sort_order !== undefined && b.sort_order !== undefined) return a.sort_order - b.sort_order;
            return a.name.localeCompare(b.name);
        });

        return {
            category: cat || { id: catId, name: 'Unknown Category', totalTasks: 0 },
            items: catItems
        };
    }).sort((a, b) => a.category.name.localeCompare(b.category.name));

    const groupedCategories = Array.from(new Set(filteredCategories.map(c => c.departmentId || 'unassigned'))).map(deptId => {
        const dept = departments.find(d => d.id === deptId);
        const deptCats = filteredCategories.filter(c => (c.departmentId || 'unassigned') === deptId);
        
        const orderArray = categoryOrder[deptId] || [];
        deptCats.sort((a, b) => {
            const idxA = orderArray.indexOf(a.id);
            const idxB = orderArray.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            if (a.sort_order !== undefined && b.sort_order !== undefined) return a.sort_order - b.sort_order;
            return a.name.localeCompare(b.name);
        });

        return {
            department: dept || { id: deptId, name: 'General / Unassigned', head: 'N/A' },
            categories: deptCats
        };
    }).sort((a, b) => a.department.name.localeCompare(b.department.name));

    const filteredGroups = groups.filter(g => 
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-transparent pt-20 pb-12 transition-all duration-300">
            {/* Header */}
            <header className="fixed top-0 z-40 w-full flex items-center justify-between px-6 py-4 bg-white/85 backdrop-blur-md border-b border-slate-100/80 shadow-sm">
                <div className="flex items-center">
                    {userProfile?.access_level !== 'auditor' && (
                        <button 
                            onClick={subView !== 'dashboard' ? () => { setSubView('dashboard'); setSearchQuery(''); } : onBack} 
                            className="p-2.5 hover:bg-slate-100 rounded-full text-slate-700 active:scale-95 transition-all outline-none"
                            aria-label="Back"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight ml-3">
                        {subView === 'departments' ? 'Audit Departments' : subView === 'hotels' ? 'Master Hotel List' : subView === 'batches' ? 'Audit Batch' : subView === 'categories' ? 'Audit Category' : subView === 'items' ? 'Audit Items' : subView === 'groups' ? 'Audit Groups' : subView === 'users' ? 'User Management' : subView === 'inspection' ? 'Audit Inspection' : 'Admin Dashboard'}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => syncAllAdminData(false)}
                        disabled={isAdminSyncing}
                        className={`text-xs px-4 py-2 rounded-full font-bold active:scale-95 transition-all outline-none flex items-center gap-2 border ${
                            isAdminSyncing
                                ? 'bg-indigo-50 text-indigo-500 border-indigo-150/50 cursor-not-allowed'
                                : 'bg-white hover:bg-indigo-50/50 text-indigo-600 border-indigo-150/50 hover:border-indigo-200'
                        }`}
                        title="Sync all admin collections with remote Supabase database"
                    >
                        <RefreshCw size={12} className={isAdminSyncing ? 'animate-spin' : ''} />
                        {isAdminSyncing ? 'Syncing...' : 'Sync DB'}
                    </button>
                    {subView === 'dashboard' && (
                        <button 
                            onClick={onLogout} 
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-full font-bold active:scale-95 transition-all outline-none"
                        >
                            Exit Admin
                        </button>
                    )}
                </div>
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
                        {userProfile?.access_level === 'admin' && (
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
                        )}

                        {/* Config Area */}
                        {userProfile?.access_level === 'admin' && (
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
                                                onClick={() => { handleSetSubView('hotels'); setSearchQuery(''); }}
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
                                                onClick={() => { handleSetSubView('departments'); setSearchQuery(''); }}
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
                                                onClick={() => { handleSetSubView('categories'); setSearchQuery(''); }}
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
                                                onClick={() => handleSetSubView('items')}
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
                                                onClick={() => { handleSetSubView('groups'); setSearchQuery(''); }}
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
                                                onClick={() => { handleSetSubView('batches'); setSearchQuery(''); }}
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
                        )}

                        {/* User & Access Setup Area */}
                        {userProfile?.access_level === 'admin' && (
                            <section className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-150/80 shadow-[0_12px_40px_rgba(15,23,42,0.02)] mt-6">
                                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2.5">
                                    <Users size={20} className="text-indigo-600" />
                                    <span className="tracking-tight">User & Access Setup</span>
                                </h2>
                                <div className="space-y-6">
                                    <div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                                            
                                            {/* Auditor Assignment */}
                                            <div 
                                                onClick={() => { handleSetSubView('auditor_assignment'); setSearchQuery(''); }}
                                                className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                        <Briefcase size={22} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 tracking-tight">Auditor Assignment</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">Assign auditors to hotels</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                            </div>

                                            {/* User Management */}
                                            <div 
                                                onClick={() => { handleSetSubView('users'); setSearchQuery(''); fetchProfilesFromSupabase(); }}
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
                                                onClick={() => handleSetSubView('access')}
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
                        )}

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

                                            <div 
                                                onClick={() => { setSubView('inspection'); setSelectedInspectionHotelId(''); setSelectedInspectionCategoryId(''); setSearchQuery(''); }}
                                                className="flex items-center justify-between p-5 bg-white hover:bg-slate-50/80 rounded-[20px] border border-slate-150/80 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group shadow-[0_4px_24px_rgba(15,23,42,0.01)] hover:shadow-[0_8px_32px_rgba(15,23,42,0.02)]"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                        <Search size={22} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Inspection</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">Review submissions and score all audit criteria</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
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
                                {recentSubmissionsData.length > 0 ? (
                                    recentSubmissionsData.map((sub, i) => (
                                        <div key={sub.id || i} className="group flex items-center justify-between p-5 bg-slate-50/60 rounded-[20px] border border-slate-100/85 hover:bg-white hover:border-indigo-100 hover:shadow-lg transition-all duration-300 cursor-pointer"
                                            onClick={() => {
                                                setSelectedInspectionHotelId(sub.hotel_id);
                                                setSubView('inspection');
                                            }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 font-black text-sm group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                    {(sub.hotels?.name || sub.hotel_id || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 tracking-tight">{sub.hotels?.name || sub.hotel_id || 'Unknown Property'}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{safeFormatDate(sub.created_at)}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                                            {items.find(it => it.id === sub.item_id)?.name.substring(0, 30) || 'Linked Item'}...
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right hidden sm:block">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Audit Sync</span>
                                                    <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        LIVE DATA
                                                    </span>
                                                </div>
                                                <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-16 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                                            <Search size={20} />
                                        </div>
                                        <p className="text-slate-400 text-sm font-black uppercase tracking-widest">No Submissions Found</p>
                                        <p className="text-[11px] text-slate-300 font-bold mt-1">Property data will appear here once submitted.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </>
                ) : subView === 'users' ? (
                    (userProfile?.access_level !== 'admin' && userProfile?.access_level !== 'auditor') ? (
                        <div className="bg-red-50/50 border border-red-100 p-8 rounded-[28px] text-center max-w-lg mx-auto my-12 animate-fadeIn shadow-sm">
                            <ShieldCheck className="text-red-500 mx-auto mb-4" size={48} />
                            <h3 className="text-lg font-bold text-slate-800">Access Restricted</h3>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                Only designated Administrators are authorized to access the User Management portal. Please contact a system administrator if you require authorization.
                            </p>
                            <button 
                                onClick={() => { setSubView('dashboard'); setSearchQuery(''); }}
                                className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-white hover:bg-slate-50 px-4 py-2 rounded-full border border-indigo-100 shadow-sm transition-all"
                            >
                                <ArrowLeft size={12} /> Return to Dashboard
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Users Layout Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <button 
                                        onClick={() => { setSubView('dashboard'); setSearchQuery(''); }} 
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-slate-100 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                    >
                                        <ArrowLeft size={12} /> Back to Dashboard
                                    </button>
                                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Onboarded User Registry</h2>
                                    <p className="text-xs text-slate-500 mt-1">Manage system logins, registration roles, property bindings, and brand audit privileges.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button 
                                        onClick={handleOpenCreateUser}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 justify-center shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                                    >
                                        <Plus size={16} />
                                        <span>Add New User</span>
                                    </button>
                                    <button 
                                        onClick={fetchProfilesFromSupabase}
                                        className="bg-white hover:bg-slate-50 text-slate-750 border border-slate-200 transition-all px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 justify-center shadow-sm active:scale-95 outline-none"
                                    >
                                        <Clock size={16} className={isSupabaseLoading ? 'animate-spin' : ''} />
                                        <span>Sync Profiles</span>
                                    </button>
                                </div>
                            </div>

                            {/* Database Setup Notice if table missing */}
                            {isProfilesTableMissing && (
                                <div className="bg-amber-50 border border-amber-200 p-5 rounded-[20px] animate-fadeIn space-y-3">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-805">Supabase Table Sync Pending</h4>
                                            <p className="text-xs text-slate-650 leading-relaxed mt-1">
                                                The <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-800">public.audit_users</code> table doesn't exist yet on your Supabase instance, or permissions require database provisioning. 
                                            </p>
                                            <p className="text-xs text-slate-650 leading-relaxed mt-2 font-medium">
                                                👉 We have automatically saved your onboarding information locally in your browser. To finalize cloud storage sync, please copy the script inside the <strong className="text-slate-800">/supabase-onboarding.sql</strong> file and execute it within your Supabase SQL Editor.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Search bar */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center gap-3 hover:border-slate-300 focus-within:border-indigo-400 focus-within:shadow-[0_8px_30px_rgba(99,102,241,0.03)] transition-all">
                                <Search className="text-slate-400 shrink-0" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search users by email, name, role, or hotel..." 
                                    className="w-full text-sm text-slate-705 bg-transparent outline-none border-none placeholder-slate-400 focus:ring-0"
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

                            {/* User List */}
                            {(() => {
                                const filteredProfiles = profilesList.filter(p => {
                                    const q = searchQuery.toLowerCase();
                                    return (
                                        (p.email || '').toLowerCase().includes(q) ||
                                        (p.display_name || '').toLowerCase().includes(q) ||
                                        (p.first_name || '').toLowerCase().includes(q) ||
                                        (p.last_name || '').toLowerCase().includes(q) ||
                                        (p.role || '').toLowerCase().includes(q) ||
                                        (p.hotel_name || '').toLowerCase().includes(q) ||
                                        (p.hotel_code || '').toLowerCase().includes(q)
                                    );
                                });

                                const formatSqlTimestamp = (isoString?: string) => {
                                    if (!isoString) return '—';
                                    try {
                                        const d = new Date(isoString);
                                        if (isNaN(d.getTime())) return '—';
                                        const day = String(d.getUTCDate()).padStart(2, '0');
                                        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                                        const year = d.getUTCFullYear();
                                        const hours = String(d.getUTCHours()).padStart(2, '0');
                                        const minutes = String(d.getUTCMinutes()).padStart(2, '0');
                                        const seconds = String(d.getUTCSeconds()).padStart(2, '0');
                                        return `${day}-${month}-${year} ${hours}:${minutes}:${seconds} (UTC)`;
                                    } catch {
                                        return '—';
                                    }
                                };

                                if (filteredProfiles.length === 0) {
                                    return (
                                        <div className="bg-white/40 backdrop-blur-sm p-12 rounded-[24px] border border-dashed border-slate-200 text-center">
                                            <Search size={28} className="text-slate-300 mx-auto mb-3" />
                                            <h3 className="text-sm font-bold text-slate-800">No registered users matched your criteria</h3>
                                            <p className="text-xs text-slate-400 mt-1 font-medium">Try verifying spelling or clear search filters.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="bg-white rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.012)] overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-slate-100 bg-slate-50/50 select-none text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                                                        <th className="px-6 py-4">Display Name</th>
                                                        <th className="px-6 py-4">Email</th>
                                                        <th className="px-6 py-4">Hotel Property</th>
                                                        <th className="px-6 py-4">Role</th>
                                                        <th className="px-6 py-4">Access Level</th>
                                                        <th className="px-6 py-4">Approval</th>
                                                        <th className="px-6 py-4">Created At</th>
                                                        <th className="px-6 py-4 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                                    {filteredProfiles.map((p, index) => {
                                                        const roleStyles = getRoleStyles(p.access_level);
                                                        return (
                                                            <tr key={p.id || index} className={`${roleStyles.bg} hover:opacity-95 transition-colors`}>
                                                                <td className="px-6 py-4 text-xs font-semibold text-slate-800 flex items-center gap-2">
                                                                    <span className={roleStyles.text}>{roleStyles.icon}</span>
                                                                    <div>
                                                                        <div className="font-bold">{p.display_name || '—'}</div>
                                                                        {(p.first_name || p.last_name) && (
                                                                            <div className="text-[10px] text-slate-400 font-medium">({p.first_name || ''} {p.last_name || ''})</div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-slate-600">{p.email || '—'}</td>
                                                                <td className="px-6 py-4 text-xs">
                                                                    {p.hotel_name ? (
                                                                        <div>
                                                                            <span className="font-bold text-slate-800">{p.hotel_name}</span>
                                                                            {p.hotel_code && <span className="ml-1.5 font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">#{p.hotel_code}</span>}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-400 font-medium">—</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-slate-600">
                                                                    <div>{p.role || '—'}</div>
                                                                    {p.is_brand_audit_lead && (
                                                                        <span className="mt-1 inline-flex items-center text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">Brand Lead</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs">
                                                                    <select 
                                                                        value={p.access_level || 'auditee'} 
                                                                        onChange={(e) => updateAccessLevel(p.id, e.target.value)}
                                                                        className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer shadow-sm hover:border-slate-300 transition-all"
                                                                    >
                                                                        <option value="admin">Admin</option>
                                                                        <option value="auditor">Auditor</option>
                                                                        <option value="auditee">Auditee</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs">
                                                                    {p.email === 'brandaudit@swiss-belhotel.com' ? (
                                                                        <span className="text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                            Bypassed (Super)
                                                                        </span>
                                                                    ) : (
                                                                        <select 
                                                                            value={p.is_approved ? 'approved' : 'pending'} 
                                                                            onChange={(e) => updateApprovalStatus(p.id, e.target.value === 'approved')}
                                                                            className={`text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer shadow-sm border transition-all ${
                                                                                p.is_approved 
                                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300' 
                                                                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300'
                                                                            }`}
                                                                        >
                                                                            <option value="approved">Approved</option>
                                                                            <option value="pending">Pending</option>
                                                                        </select>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-[11px] font-mono font-bold text-slate-550">
                                                                    {formatSqlTimestamp(p.created_at)}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <button 
                                                                            onClick={() => handleOpenEditUser(p)}
                                                                            className="p-1.5 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg border border-indigo-100/50 transition-all"
                                                                            title="Edit Profile"
                                                                        >
                                                                            <Edit size={13} />
                                                                        </button>
                                                                        {userProfile?.email === 'brandaudit@swiss-belhotel.com' && (
                                                                            <button 
                                                                                onClick={() => setConfirmUserDeleteId(p.id)}
                                                                                className="p-1.5 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-lg border border-red-100/50 transition-all"
                                                                                title="Delete Profile"
                                                                            >
                                                                                <Trash2 size={13} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )
                ) : subView === 'access' ? (
                    <div className="space-y-6">
                        {/* Access Right Management Layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { setSubView('dashboard'); setSearchQuery(''); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-55/80 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Access Right Management</h2>
                                <p className="text-xs text-slate-500 mt-1">Configure section accessibility by user levels.</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="text-xs uppercase bg-slate-50 text-slate-700">
                                        <tr>
                                            <th className="px-6 py-3">Section</th>
                                            <th className="px-6 py-3">Auditor</th>
                                            <th className="px-6 py-3">Auditee</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {[
                                            { parent: 'Dashboard', children: [] },
                                            { parent: 'Audit & Reporting', children: ['Audit Report & Inspection', 'Recent Submissions'] },
                                            { parent: 'Manage Master Data', children: ['Hotels', 'Departments', 'Categories', 'Items', 'Groups', 'Batches'] },
                                            { parent: 'Access Right Management', children: ['User Management', 'Access Rights'] }
                                        ].map((group) => (
                                            <React.Fragment key={group.parent}>
                                                <tr className="bg-slate-50">
                                                    <td className="px-6 py-3 font-bold text-slate-900">{group.parent}</td>
                                                    <td className="px-6 py-3"></td>
                                                    <td className="px-6 py-3"></td>
                                                </tr>
                                                {(group.children.length > 0 ? group.children : [group.parent]).map((view) => (
                                                    <tr key={view} className="hover:bg-slate-50">
                                                        <td className="px-6 py-4 pl-12 text-slate-700">{view}</td>
                                                        <td className="px-6 py-4">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={!!auditorAccess[view]}
                                                                onChange={() => handleToggleAuditorAccess(view)}
                                                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <input 
                                                                type="checkbox" 
                                                                disabled
                                                                className="w-4 h-4 text-slate-400 border-slate-300 rounded cursor-not-allowed"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={handleSaveAccess}
                                    className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-full hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
                                >
                                    Save Access Rules
                                </button>
                            </div>
                        </div>
                    </div>
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
                                                <th className="px-6 py-4.5">Department</th>
                                                <th className="px-6 py-4.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {groupedCategories.map((group) => {
                                                const isExpanded = expandedDepartments[group.department.id] !== false;
                                                return (
                                                    <React.Fragment key={group.department.id}>
                                                        <tr 
                                                            className="bg-indigo-50/30 cursor-pointer hover:bg-indigo-50/60 transition-colors"
                                                            onClick={() => toggleDepartmentExpansion(group.department.id)}
                                                        >
                                                            <td colSpan={3} className="px-6 py-3 font-bold text-sm text-indigo-900">
                                                                <div className="flex items-center gap-2">
                                                                    {isExpanded ? <ChevronDown size={16} className="text-indigo-500" /> : <ChevronRight size={16} className="text-indigo-400" />}
                                                                    <span>{group.department.name}</span>
                                                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] ml-2">
                                                                        {group.categories.length} categories
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && group.categories.map((cat, index) => (
                                                            <tr key={cat.id} className="hover:bg-slate-50/20 transition-colors">
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex flex-col gap-0.5 text-slate-300">
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleMoveCategory(cat, 'up'); }}
                                                                                disabled={index === 0}
                                                                                className="hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors p-0.5"
                                                                            >
                                                                                <ChevronUp size={14} />
                                                                            </button>
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleMoveCategory(cat, 'down'); }}
                                                                                disabled={index === group.categories.length - 1}
                                                                                className="hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors p-0.5"
                                                                            >
                                                                                <ChevronDown size={14} />
                                                                            </button>
                                                                        </div>
                                                                        <div className="w-9 h-9 rounded-xl bg-indigo-50/80 text-indigo-700 flex items-center justify-center font-black text-xs uppercase shadow-sm shrink-0">
                                                                            C
                                                                        </div>
                                                                        <span className="text-sm font-bold text-slate-800 max-w-xs xl:max-w-md truncate block" title={cat.name}>
                                                                            {cat.name}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                                                                    {group.department.name}
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
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ) : subView === 'groups' ? (
                    <div className="space-y-6">
                        {/* Audit Groups Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { setSubView('dashboard'); setSearchQuery(''); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-slate-100 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Checklist Groups</h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    Manage checklist groups and assign categories or items to them using our real-time selector.
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

                        {/* MAIN WORKSPACE GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* LEFT COLUMN: AUDIT GROUPS SELECTOR */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs col-span-1 space-y-4 flex flex-col max-h-[700px]">
                                <div className="flex items-center justify-between shrink-0">
                                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                        <Layers size={16} className="text-indigo-600" />
                                        <span>Checklist Groups</span>
                                    </h3>
                                    <button 
                                        onClick={handleOpenAddGroup} 
                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                        title="Create Checklist Group"
                                    >
                                        <Plus size={13} />
                                        <span>Create</span>
                                    </button>
                                </div>

                                <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                                    {groups.length === 0 ? (
                                        <div className="text-center py-8 text-xs font-bold text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                            No checklist groups found. Click Create above!
                                        </div>
                                    ) : (
                                        groups.map(group => {
                                            const assignedHotelsCount = group.hotelIds ? group.hotelIds.length : 0;
                                            const isSelected = selectedGroupId === group.id;

                                            return (
                                                <div 
                                                    key={group.id}
                                                    onClick={() => { setSelectedGroupId(group.id); setGroupSearchQuery(''); }}
                                                    className={`w-full text-left p-3.5 rounded-xl transition-all border cursor-pointer select-none relative group ${
                                                        isSelected 
                                                            ? 'bg-indigo-50/90 border-indigo-200 text-indigo-900 shadow-2xs' 
                                                            : 'bg-white border-slate-100 hover:bg-slate-50/80 text-slate-700'
                                                    }`}
                                                >
                                                    <div className="pr-16">
                                                        <div className="font-bold text-sm text-slate-800 truncate">
                                                            {group.name}
                                                        </div>
                                                        <div className="text-[11px] font-semibold text-slate-500 mt-0.5 line-clamp-1 italic">
                                                            {group.description || 'No description provided'}
                                                        </div>
                                                    </div>

                                                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenEditGroup(group);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-md transition-all"
                                                            title="Edit Details"
                                                        >
                                                            <Edit size={11} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmGroupDeleteId(group.id);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-md transition-all"
                                                            title="Delete Group"
                                                        >
                                                            <Trash2 size={11} />
                                                        </button>
                                                    </div>

                                                    {confirmGroupDeleteId === group.id && (
                                                        <div 
                                                            className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-between px-3 z-10 border border-red-200"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <span className="text-[10px] text-red-600 font-bold">Delete group?</span>
                                                            <div className="flex gap-1.5">
                                                                <button 
                                                                    onClick={() => handleDeleteGroup(group.id)}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[9px] font-black"
                                                                >
                                                                    Yes, delete
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmGroupDeleteId(null)}
                                                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-[9px] font-black"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                                            assignedHotelsCount > 0 ? 'bg-indigo-100/70 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                                        }`}>
                                                            {assignedHotelsCount} {assignedHotelsCount === 1 ? 'Hotel Assigned' : 'Hotels Assigned'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* RIGHT COLUMN: ASSIGNMENT PANELS (CATEGORIES & ITEMS TABS) */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 space-y-6 flex flex-col max-h-[700px]">
                                {/* HOTEL HEADER */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 shrink-0">
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                                            <Building size={16} className="text-indigo-600" />
                                            <span>Assign Hotels to Group</span>
                                        </h3>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            Select which hotels are assigned to this audit group.
                                        </p>
                                    </div>

                                    {selectedGroupId && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleGroupAssignAllHotels(selectedGroupId)}
                                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-extrabold rounded-lg transition-all border border-indigo-200 active:scale-95"
                                            >
                                                Assign All Hotels
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleGroupClearAllHotels(selectedGroupId)}
                                                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[9px] font-extrabold rounded-lg transition-all border border-slate-200 active:scale-95"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {selectedGroupId ? (
                                    <>
                                        {/* Search bar */}
                                        <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2 shrink-0 focus-within:border-indigo-300 focus-within:bg-white transition-all select-none">
                                            <Search className="text-slate-400 shrink-0" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Search hotels by name, code, or location..."
                                                className="w-full text-xs text-slate-700 bg-transparent outline-none border-none placeholder-slate-400 p-0 focus:ring-0"
                                                value={groupSearchQuery}
                                                onChange={(e) => setGroupSearchQuery(e.target.value)}
                                            />
                                            {groupSearchQuery && (
                                                <button type="button" onClick={() => setGroupSearchQuery('')} className="p-0.5 text-slate-300 hover:text-slate-500">
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                                            {hotels.filter(h => {
                                                if (!groupSearchQuery) return true;
                                                const q = groupSearchQuery.toLowerCase();
                                                return h.name.toLowerCase().includes(q) ||
                                                       (h.code && h.code.toLowerCase().includes(q)) ||
                                                       h.location.toLowerCase().includes(q);
                                            }).length === 0 ? (
                                                <div className="text-center py-10 text-xs font-bold text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                                    No matching hotels found.
                                                </div>
                                            ) : (
                                                hotels.filter(h => {
                                                    if (!groupSearchQuery) return true;
                                                    const q = groupSearchQuery.toLowerCase();
                                                    return h.name.toLowerCase().includes(q) ||
                                                           (h.code && h.code.toLowerCase().includes(q)) ||
                                                           h.location.toLowerCase().includes(q);
                                                }).map(hotel => {
                                                    const group = groups.find(g => g.id === selectedGroupId);
                                                     const isAssigned = group?.hotelIds?.includes(hotel.id);
                                                     const assignedGroup = groups.find(g => (g.hotelIds || []).includes(hotel.id));
                                                     const isAssignedToOther = assignedGroup && assignedGroup.id !== selectedGroupId;

                                                    return (
                                                         <div 
                                                             key={hotel.id} 
                                                             onClick={() => handleToggleGroupHotel(selectedGroupId, hotel.id)}
                                                             className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                                                                 isAssigned
                                                                     ? 'bg-indigo-50/60 border-indigo-300 hover:bg-indigo-100/50 shadow-sm shadow-indigo-100/30'
                                                                     : isAssignedToOther
                                                                         ? 'bg-slate-50/50 border-slate-200 hover:bg-indigo-50/30 opacity-90'
                                                                         : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                                                             }`}
                                                         >
                                                             <div className="flex items-center gap-3 min-w-0">
                                                                 <div className="relative flex items-center shrink-0">
                                                                     <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all border-2 ${
                                                                         isAssigned
                                                                             ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                                             : isAssignedToOther
                                                                                 ? 'bg-amber-100 border-amber-400 text-amber-700'
                                                                                 : 'bg-white border-slate-300 hover:border-slate-400'
                                                                     }`}>
                                                                         {isAssigned && <Check size={11} className="text-white stroke-[3.5px]" />}
                                                                         {isAssignedToOther && <AlertCircle size={10} className="text-amber-600 stroke-[3px]" />}
                                                                     </div>
                                                                 </div>
                                                                 
                                                                 <div className="min-w-0">
                                                                     <div className="flex flex-wrap items-center gap-1.5">
                                                                         <span className="text-xs font-black text-slate-800 truncate">{hotel.name}</span>
                                                                         {hotel.code && (
                                                                             <span className="bg-indigo-50 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                                                                                 {hotel.code}
                                                                             </span>
                                                                         )}
                                                                         
                                                                         {/* Status indicator badges */}
                                                                         {isAssigned && (
                                                                             <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-0.5">
                                                                                 Current Group
                                                                             </span>
                                                                         )}
                                                                         {isAssignedToOther && (
                                                                             <span className="bg-amber-50 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                                                                 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                                                 Assigned to: {assignedGroup.name}
                                                                             </span>
                                                                         )}
                                                                         {!isAssigned && !isAssignedToOther && (
                                                                             <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                                 <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                                                 Available
                                                                             </span>
                                                                         )}
                                                                     </div>
                                                                     <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{hotel.location} • {hotel.brandClass}</p>
                                                                 </div>
                                                             </div>

                                                             {hotel.stars && (
                                                                 <span className="text-[10px] text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 shrink-0">
                                                                     {'★'.repeat(hotel.stars)}
                                                                 </span>
                                                             )}
                                                         </div>
                                                     );
                                                 })
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        <Layers className="mx-auto text-slate-300 mb-4 animate-pulse" size={40} />
                                        <h3 className="font-extrabold text-slate-800 text-sm">No group selected</h3>
                                        <p className="text-xs text-slate-400 mt-1">Select or create an Audit Group on the left to configure assignments.</p>
                                    </div>
                                )}
                            </div>
                        </div>
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
                                            {groupedItems.map((group) => {
                                                const isExpanded = expandedCategories[group.category.id];
                                                return (
                                                    <React.Fragment key={group.category.id}>
                                                        <tr 
                                                            className="bg-indigo-50/30 cursor-pointer hover:bg-indigo-50/60 transition-colors"
                                                            onClick={() => toggleCategoryExpansion(group.category.id)}
                                                        >
                                                            <td colSpan={5} className="px-6 py-3 font-bold text-sm text-indigo-900">
                                                                <div className="flex items-center gap-2">
                                                                    {isExpanded ? <ChevronDown size={16} className="text-indigo-500" /> : <ChevronRight size={16} className="text-indigo-400" />}
                                                                    <span>{group.category.name}</span>
                                                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] ml-2">
                                                                        {group.items.length} items
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && group.items.map((item, index) => (
                                                            <tr key={item.id} className="hover:bg-slate-50/20 transition-colors">
                                                                <td className="px-6 py-4 font-bold text-sm text-slate-800">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex flex-col gap-0.5 text-slate-300">
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleMoveItem(item, 'up'); }}
                                                                                disabled={index === 0}
                                                                                className="hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors p-0.5"
                                                                            >
                                                                                <ChevronUp size={14} />
                                                                            </button>
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleMoveItem(item, 'down'); }}
                                                                                disabled={index === group.items.length - 1}
                                                                                className="hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors p-0.5"
                                                                            >
                                                                                <ChevronDown size={14} />
                                                                            </button>
                                                                        </div>
                                                                        <span>{item.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-slate-500 font-semibold">
                                                                    <div>{departments.find(d => d.id === item.departmentId)?.name} / {group.category.name}</div>
                                                                    <div className="mt-1 flex items-center">
                                                                        {item.filled_by_hotel !== false ? (
                                                                            <span className="inline-flex items-center text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100/40 px-2 py-0.5 rounded-md font-extrabold tracking-wide uppercase">Filled by Hotel</span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center text-[9px] bg-amber-50 text-amber-700 border border-amber-100/50 px-2 py-0.5 rounded-md font-extrabold tracking-wide uppercase">Auditor Only</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-bold text-indigo-600 uppercase">
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
                                                    </React.Fragment>
                                                );
                                            })}
                                         </tbody>
                                     </table>
                        </div>
                    </div>
                ) : subView === 'auditor_assignment' ? (
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
                                        profilesList.filter(p => p.access_level === 'auditor').map(auditor => {
                                            const assignedHotelsCount = auditorAssignments.filter(a => a.user_id === auditor.id).length;
                                            const assignedCatsCount = auditorCategoryAssignments.filter(a => a.user_id === auditor.id).length;
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
                                                    {auditorAssignments.filter(a => a.user_id === selectedAuditorId).length}
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
                                                    {auditorCategoryAssignments.filter(a => a.user_id === selectedAuditorId).length}
                                                </span>
                                            )}
                                        </button>
                                    </div>

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
                                            <div className="space-y-3">
                                                <div className="text-xs font-bold text-slate-500 mb-2">
                                                    Select which properties <strong className="text-slate-800">{profilesList.find(p => p.id === selectedAuditorId)?.display_name || 'Selected Auditor'}</strong> can perform audits on:
                                                </div>
                                                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                                                    {hotels.map(hotel => {
                                                        const assignment = auditorAssignments.find(a => a.hotel_id === hotel.id);
                                                        const isAssignedToSelected = assignment?.user_id === selectedAuditorId;
                                                        const isAssignedToOther = assignment && assignment.user_id !== selectedAuditorId;
                                                        const assignedUser = isAssignedToOther ? profilesList.find(p => p.id === assignment.user_id) : null;
                                                        
                                                        return (
                                                            <div key={hotel.id} className="flex items-center justify-between p-3.5 bg-slate-50/80 hover:bg-slate-100/60 rounded-xl border border-slate-200/60 transition-all">
                                                                <div>
                                                                    <div className="text-sm font-bold text-slate-800">{hotel.name}</div>
                                                                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                                        {hotel.brandClass} • {hotel.region || 'Region Unspecified'}
                                                                    </div>
                                                                </div>
                                                                <button 
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (isAssignedToSelected) {
                                                                            const { error } = await supabase.from('auditor_assignments').delete().eq('user_id', selectedAuditorId).eq('hotel_id', hotel.id);
                                                                            if (error) console.error('Delete error', error);
                                                                        } else {
                                                                            if (isAssignedToOther) {
                                                                                const { error: delError } = await supabase.from('auditor_assignments').delete().eq('hotel_id', hotel.id);
                                                                                if (delError) console.error('Delete other error', delError);
                                                                            }
                                                                            const { error } = await supabase.from('auditor_assignments').insert({ user_id: selectedAuditorId, hotel_id: hotel.id });
                                                                            if (error) console.error('Insert error details:', error.message, error.details, error.hint);
                                                                        }
                                                                        const { data, error: fetchError } = await supabase.from('auditor_assignments').select('*');
                                                                        if (fetchError) console.error('Fetch error', fetchError);
                                                                        if (data) setAuditorAssignments(data);
                                                                    }}
                                                                    className={`px-3.5 py-1.5 text-xs font-black rounded-lg pointer-events-auto transition-all ${
                                                                        isAssignedToSelected 
                                                                            ? 'bg-indigo-600 text-white shadow-2xs hover:bg-indigo-700' 
                                                                            : isAssignedToOther 
                                                                            ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200' 
                                                                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                                                    }`}
                                                                >
                                                                    {isAssignedToSelected ? 'Assigned' : isAssignedToOther ? `Reassign (${assignedUser?.first_name || 'Other'})` : 'Assign'}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB 2: AUDIT CATEGORY ASSIGNMENTS */}
                                        {assignmentTab === 'categories' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="relative flex-1">
                                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            value={categoryAssignmentSearch}
                                                            onChange={(e) => setCategoryAssignmentSearch(e.target.value)}
                                                            placeholder="Search categories or department..."
                                                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all"
                                                        />
                                                        {categoryAssignmentSearch && (
                                                            <button onClick={() => setCategoryAssignmentSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                                <X size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                                                    {catList
                                                        .filter(cat => {
                                                            if (!categoryAssignmentSearch) return true;
                                                            const query = categoryAssignmentSearch.toLowerCase();
                                                            const dept = departments.find(d => d.id === cat.departmentId)?.name || '';
                                                            return cat.name.toLowerCase().includes(query) || dept.toLowerCase().includes(query);
                                                        })
                                                        .map(cat => {
                                                            const existingAssignment = auditorCategoryAssignments.find(a => a.category_id === cat.id);
                                                            const isAssignedToSelected = existingAssignment?.user_id === selectedAuditorId;
                                                            const isAssignedToOther = existingAssignment && existingAssignment.user_id !== selectedAuditorId;
                                                            const assignedAuditor = isAssignedToOther ? profilesList.find(p => p.id === existingAssignment.user_id) : null;
                                                            const dept = departments.find(d => d.id === cat.departmentId);
                                                            const itemCount = items.filter(i => i.categoryId === cat.id).length;

                                                            return (
                                                                <div key={cat.id} className="flex items-center justify-between p-3.5 bg-slate-50/80 hover:bg-slate-100/60 rounded-xl border border-slate-200/60 transition-all">
                                                                    <div className="space-y-0.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-bold text-slate-800">{cat.name}</span>
                                                                            {dept && (
                                                                                <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 text-[9px] font-black uppercase rounded-md">
                                                                                    {dept.name}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-[10px] font-semibold text-slate-400">
                                                                            {itemCount} checklist items in category
                                                                        </div>
                                                                    </div>

                                                                    <button
                                                                        onClick={() => handleToggleCategoryAssignment(selectedAuditorId, cat.id)}
                                                                        className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all ${
                                                                            isAssignedToSelected 
                                                                                ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700' 
                                                                                : isAssignedToOther 
                                                                                ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200' 
                                                                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                                                        }`}
                                                                    >
                                                                        {isAssignedToSelected ? 'Assigned' : isAssignedToOther ? `Reassign (${assignedAuditor?.first_name || 'Other'})` : 'Assign Category'}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
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
                ) : subView === 'inspection' ? (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Audit Inspection Subview */}
                        {/* BACK BUTTON & HEADER */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { setSubView('dashboard'); setSearchQuery(''); }} 
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
                                    
                                    {/* Search Bar for Inspection */}
                                    <div className="relative mb-6">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                            <Search size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search registered hotel properties by name or code..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-350 rounded-2xl text-slate-800 text-sm outline-none transition-all placeholder:text-slate-400"
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

                                    {/* Hotels List */}
                                    <div className="overflow-x-auto bg-white rounded-3xl border border-slate-200 shadow-sm">
                                        <table className="w-full text-left text-sm text-slate-700">
                                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                                <tr>
                                                    <th className="px-6 py-4">Property</th>
                                                    <th className="px-6 py-4">Brand</th>
                                                    <th className="px-6 py-4">Region</th>
                                                    <th className="px-6 py-4">Assigned Group</th>
                                                    <th className="px-6 py-4">Scoring Progress</th>
                                                    <th className="px-6 py-4">Evidence</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {hotels
                                                    .filter(h => {
                                                        const isMatchSearch = !searchQuery || h.name.toLowerCase().includes(searchQuery.toLowerCase()) || (h.code && h.code.toLowerCase().includes(searchQuery.toLowerCase()));
                                                        if (userProfile?.access_level === 'auditor') {
                                                            const isAssigned = auditorAssignments.some(a => a.user_id === userProfile.id && a.hotel_id === h.id);
                                                            return isMatchSearch && isAssigned;
                                                        }
                                                        return isMatchSearch;
                                                    })
                                                    .map(hotel => {
                                                        const allHotelItems = items;
                                                        const totalItems = allHotelItems.length;
                                                        const scoredItems = allHotelItems.filter(i => inspectionScores[`${hotel.id}_${i.id}`] !== undefined).length;
                                                        const completionPercent = totalItems > 0 ? Math.round((scoredItems / totalItems) * 100) : 0;

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
                                                                <td className="px-6 py-4 text-slate-600 font-medium">{batches.find(b => b.hotelIds?.includes(hotel.id))?.name || 'Unassigned'}</td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-2 font-bold text-[11px]">
                                                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-indigo-500" style={{ width: `${completionPercent}%` }}></div>
                                                                        </div>
                                                                        <span className={completionPercent === 100 ? 'text-emerald-600' : 'text-slate-700'}>
                                                                            {completionPercent}%
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 font-bold text-indigo-700">
                                                                    {allSubmissions.filter(s => isSubmissionForHotel(s.hotel_id, hotel)).length}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                }
                                            </tbody>
                                        </table>
                                        {hotels.filter(h => !searchQuery || h.name.toLowerCase().includes(searchQuery.toLowerCase()) || (h.code && h.code.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 && (
                                            <div className="py-8 text-center text-slate-400 font-bold text-xs">
                                                No properties matched your search.
                                            </div>
                                        )}
                                    </div>
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

                                const allHotelItems = items;
                                const scoredItems = allHotelItems.filter(i => inspectionScores[`${hotel.id}_${i.id}`] !== undefined);
                                const totalPointsScored = scoredItems.reduce((sum, i) => sum + Number(inspectionScores[`${hotel.id}_${i.id}`] || 0), 0);
                                const totalPointsMax = allHotelItems.reduce((sum, i) => sum + (i.points ?? 5), 0);
                                
                                const hotelSubs = Object.values(hotelSubmissions);
                                const subCount = hotelSubs.length;

                                const categoriesWithItems = catList.filter(cat => 
                                    allHotelItems.some(item => item.categoryId === cat.id)
                                );

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
                                                                {hotel.location || 'Swiss-Belhotel Property'} • {hotel.brand || 'Luxury Standards'}
                                                            </span>
                                                            <span className="text-slate-600 font-normal select-none">|</span>
                                                            <span className="flex items-center gap-1.5 text-indigo-300">
                                                                <User size={12} className="text-indigo-400" />
                                                                Auditor: <strong className="font-extrabold text-white">{userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.display_name || userProfile.email : 'System Auditor'}</strong>
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-3">
                                                    <button 
                                                        onClick={async () => {
                                                            const { data: directData, error: e1 } = await supabase
                                                                .from('audit_submissions')
                                                                .select('*')
                                                                .in('hotel_id', [hotel.id, hotel.code || '', ...(profilesList.filter(p => (p.hotel_code && hotel.code && String(p.hotel_code).toLowerCase() === String(hotel.code).toLowerCase()) || (p.hotel_name && hotel.name && String(p.hotel_name).toLowerCase() === String(hotel.name).toLowerCase())).map(p => p.hotel_id).filter(Boolean))]);
                                                            
                                                            if (!e1) {
                                                                const submissionsMap: Record<string, any> = {};
                                                                if (directData) directData.forEach(sub => submissionsMap[sub.item_id] = sub);
                                                                
                                                                setHotelSubmissions(submissionsMap);
                                                                setToastMessage("Data Sync Successful");
                                                                setTimeout(() => setToastMessage(null), 2000);
                                                            }
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
                                            {categoriesWithItems.map((cat, catIdx) => {
                                                const catItems = allHotelItems.filter(i => i.categoryId === cat.id);
                                                const scoredInCat = catItems.filter(i => inspectionScores[`${hotel.id}_${i.id}`] !== undefined).length;
                                                const isCatComplete = scoredInCat === catItems.length;

                                                return (
                                                    <div key={cat.id} className="space-y-3">
                                                        {/* CATEGORY BAR */}
                                                        <div className="sticky top-16 z-30 flex items-center justify-between p-3 sm:px-4 sm:py-2.5 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-xl shadow-xs">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-xs ${isCatComplete ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
                                                                    {catIdx + 1}
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-sm font-black text-slate-800 tracking-tight leading-none">{cat.name}</h3>
                                                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{catItems.length} Inspection Points</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
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
                                                            </div>
                                                        </div>

                                                        {/* INSPECTION CARDS */}
                                                        <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                                            {catItems.map((item) => {
                                                                const scoreKey = `${hotel.id}_${item.id}`;
                                                                const currentScore = inspectionScores[scoreKey];
                                                                const currentComment = inspectionComments[scoreKey] || '';
                                                                const submission = hotelSubmissions[item.id];
                                                                const hasSubmission = !!submission;
                                                                const isPass = currentScore !== undefined && currentScore === (item.points ?? 5);
                                                                const isFail = currentScore !== undefined && currentScore === 0;

                                                                return (
                                                                    <div 
                                                                        key={item.id} 
                                                                        className={`group bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                                                                            currentScore !== undefined 
                                                                                ? 'border-slate-200 shadow-2xs opacity-95 bg-slate-50/20' 
                                                                                : 'border-indigo-200 shadow-xs hover:shadow-md ring-2 ring-indigo-50/60'
                                                                        }`}
                                                                    >
                                                                        <div className="flex flex-col lg:flex-row">
                                                                            {/* LEFT SIDE: CRITERIA & HOTEL DATA */}
                                                                            <div className="flex-1 p-4 sm:p-5 space-y-3">
                                                                                <div className="space-y-1.5">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded-md uppercase tracking-wider">
                                                                                            {item.points ?? 5} Points Max
                                                                                        </span>
                                                                                        {item.filled_by_hotel && (
                                                                                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider border ${hasSubmission ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                                                {hasSubmission ? 'Submission Received' : 'Awaiting for Property Submission.'}
                                                                                            </span>
                                                                                        )}
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

                                                                                {/* SUBMISSION BENTO BOX */}
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
                                                                                                    {/* Visual Evidence with In-App Lightbox */}
                                                                                                    {(item.inputType === 'camera' || item.inputType === 'image') && submission.value && (
                                                                                                        <div 
                                                                                                            className="group/img relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900/5 flex items-center justify-center min-h-[140px] max-h-[280px] cursor-zoom-in transition-all hover:border-indigo-300 hover:shadow-sm"
                                                                                                            onClick={() => setEnlargedImage({ url: submission.value, title: `${item.name} — ${hotel.name}` })}
                                                                                                        >
                                                                                                            <img 
                                                                                                                src={submission.value} 
                                                                                                                alt="Submission" 
                                                                                                                referrerPolicy="no-referrer" 
                                                                                                                className="w-auto h-auto max-h-[280px] object-contain rounded-lg py-1 shadow-2xs" 
                                                                                                            />
                                                                                                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-xs uppercase tracking-wider gap-2">
                                                                                                                <Maximize2 size={16} />
                                                                                                                Click to enlarge in Lightbox
                                                                                                            </div>
                                                                                                            <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md opacity-90 group-hover/img:opacity-0 transition-opacity flex items-center gap-1">
                                                                                                                <Eye size={12} /> Preview
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}

                                                                                                    {/* Document Evidence */}
                                                                                                    {item.inputType === 'document' && submission.value && (
                                                                                                        <a href={submission.value} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-xs transition-all group/doc">
                                                                                                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover/doc:bg-indigo-600 group-hover/doc:text-white transition-colors shrink-0">
                                                                                                                <FileText size={20} />
                                                                                                            </div>
                                                                                                            <div className="flex-1 min-w-0">
                                                                                                                <p className="text-xs font-black text-slate-800 truncate">Inspection Document</p>
                                                                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Click to Open PDF / File</p>
                                                                                                            </div>
                                                                                                            <ChevronRight size={16} className="text-slate-300" />
                                                                                                        </a>
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
                                                                            </div>
                                                                                                                                   {/* RIGHT SIDE: AUDITOR CONTROLS */}
                                                                            <div className="lg:w-72 lg:shrink-0 bg-slate-50/70 border-t lg:border-t-0 lg:border-l border-slate-200/80 p-4 flex flex-col justify-between gap-3">
                                                                                <div className="space-y-4">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Auditor Status</label>
                                                                                        <div className="flex items-baseline gap-1">
                                                                                            <span className={`text-xl font-black ${currentScore !== undefined ? 'text-slate-900' : 'text-slate-300'}`}>
                                                                                                {currentScore !== undefined ? (isPass ? 'PASS' : isFail ? 'FAIL' : currentScore) : '—'}
                                                                                            </span>
                                                                                            <span className="text-[10px] font-black text-slate-400">({item.points ?? 5} PTS)</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* PASS / FAIL CONTROLS */}
                                                                                    <div className="space-y-2">
                                                                                        <div className="grid grid-cols-2 gap-2">
                                                                                            <button
                                                                                                type="button"
                                                                                                id={`btn-pass-${item.id}`}
                                                                                                onClick={() => {
                                                                                                    if (isPass) {
                                                                                                        saveInspectionScore(hotel.id, item.id, undefined);
                                                                                                    } else {
                                                                                                        saveInspectionScore(hotel.id, item.id, item.points ?? 5);
                                                                                                    }
                                                                                                }}
                                                                                                className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                                                                                                    isPass
                                                                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm shadow-emerald-100'
                                                                                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 hover:border-emerald-400'
                                                                                                }`}
                                                                                            >
                                                                                                <span className="text-xs">Pass</span>
                                                                                                <span className={`text-[9px] font-bold ${isPass ? 'text-emerald-100' : 'text-emerald-600'}`}>
                                                                                                    +{item.points ?? 5} pts
                                                                                                </span>
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                id={`btn-fail-${item.id}`}
                                                                                                onClick={() => {
                                                                                                    if (isFail) {
                                                                                                        saveInspectionScore(hotel.id, item.id, undefined);
                                                                                                    } else {
                                                                                                        saveInspectionScore(hotel.id, item.id, 0);
                                                                                                    }
                                                                                                }}
                                                                                                className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
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
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="space-y-1">
                                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">AUDITOR NOTES/REMARKS</label>
                                                                                        <textarea 
                                                                                            value={currentComment}
                                                                                            onChange={(e) => saveInspectionComment(hotel.id, item.id, e.target.value)}
                                                                                            placeholder="Describe non-compliance or specific findings..."
                                                                                            className="w-full h-20 bg-white border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl p-2.5 text-xs text-slate-700 outline-none transition-all resize-none placeholder:text-slate-300"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
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

                                            <div className="flex items-center gap-4">
                                                <button 
                                                    onClick={() => {
                                                        setToastMessage("Audit Finalized Successfully!");
                                                        setTimeout(() => setToastMessage(null), 3000);
                                                        setSelectedInspectionHotelId('');
                                                        setSelectedInspectionCategoryId('');
                                                    }}
                                                    className="h-16 px-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[22px] font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 outline-none flex items-center gap-3 group"
                                                >
                                                    <FileCheck size={20} className="group-hover:scale-110 transition-transform" />
                                                    Submit Full Report
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                            </React.Fragment>
                        )}
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
                                        <option value="ANZPAC">ANZPAC</option>
                                        <option value="Indonesia">Indonesia</option>
                                        <option value="Philippines">Philippines</option>
                                        <option value="Central Asia">Central Asia</option>
                                        <option value="EMEA">EMEA</option>
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
                    <div className="bg-white w-full max-w-4xl p-6 rounded-3xl border border-slate-200 shadow-xl relative animate-scaleUp max-h-[90vh] flex flex-col">
                        <button 
                            onClick={() => setIsItemFormOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all z-10"
                        >
                            <X size={18} />
                        </button>

                        <div className="shrink-0 mb-6 pr-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-1">
                                {editingItem ? 'Edit Audit Item' : 'Create New Audit Item'}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium">
                                {editingItem ? 'Modify the details of your audit checklist item below.' : 'Add a brand-new audit checklist item.'}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 pb-2 scrollbar-thin">
                            <form onSubmit={handleSaveItem} className="flex flex-col h-full">
                                {itemError && (
                                    <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2 text-xs text-red-600 font-bold mb-4 shrink-0">
                                        <AlertCircle size={15} />
                                        <span>{itemError}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                    {/* Left Column */}
                                    <div className="space-y-5">
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

                                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 hover:border-slate-300 p-4 rounded-2xl">
                                            <div className="pr-4">
                                                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-0.5">Filled by Hotel</label>
                                                <p className="text-[10px] text-slate-400 font-bold leading-tight">True if the hotel property fills this checklist item as part of self-audit</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setItemFilledByHotel(!itemFilledByHotel)}
                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                    itemFilledByHotel ? 'bg-indigo-600' : 'bg-slate-300'
                                                }`}
                                            >
                                                <span
                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                        itemFilledByHotel ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Input Type</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { id: 'camera', label: 'Camera', icon: Camera },
                                                    { id: 'image', label: 'Image', icon: ImageIcon },
                                                    { id: 'document', label: 'Document', icon: FileText },
                                                    { id: 'numeric', label: 'Numeric', icon: Hash },
                                                    { id: 'text', label: 'Text', icon: Type },
                                                    { id: 'checkbox', label: 'Checkbox', icon: CheckSquare }
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

                                        {itemInputType === 'numeric' && (
                                            <div className="animate-fadeIn">
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Minimum Value</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="e.g. 10"
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                                    value={itemMinValue}
                                                    onChange={(e) => setItemMinValue(e.target.value === '' ? '' : Number(e.target.value))}
                                                    required
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    The audit will require the inputted number to be at least this minimum value.
                                                </p>
                                            </div>
                                        )}

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

                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Instruction (Optional)</label>
                                            <textarea 
                                                placeholder="Add instruction..."
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                                value={itemInstruction}
                                                onChange={(e) => setItemInstruction(e.target.value)}
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-auto pt-6 border-t border-slate-100 shrink-0">
                                    <button 
                                        type="submit"
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 outline-none"
                                    >
                                        {editingItem ? 'Save Changes' : 'Create Item'}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setIsItemFormOpen(false)}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 rounded-full font-bold text-sm transition-all active:scale-95 outline-none"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
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

            {/* User Form Modal */}
            {isUserFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-lg p-6 sm:p-8 rounded-[28px] border border-slate-200 shadow-2xl relative animate-scaleUp max-h-[90vh] flex flex-col overflow-y-auto">
                        <button 
                            type="button"
                            onClick={() => setIsUserFormOpen(false)}
                            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all outline-none"
                        >
                            <X size={18} />
                        </button>

                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editingUser ? 'Edit User Profile' : 'Create New User Profile'}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                {editingUser ? 'Update role, property bindings, and brand audit privileges.' : 'Manually provision a new user profile with specific access rights.'}
                            </p>
                        </div>

                        <form onSubmit={handleSaveUser} className="space-y-4">
                            {userFormError && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2 text-xs text-red-600 font-bold">
                                    <AlertCircle size={15} />
                                    <span>{userFormError}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">First Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. John"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                        value={userFormFirstName}
                                        onChange={(e) => {
                                            setUserFormFirstName(e.target.value);
                                            if (!userFormDisplayName) {
                                                setUserFormDisplayName(`${e.target.value} ${userFormLastName}`.trim());
                                            }
                                        }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Last Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Doe"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                        value={userFormLastName}
                                        onChange={(e) => {
                                            setUserFormLastName(e.target.value);
                                            if (!userFormDisplayName) {
                                                setUserFormDisplayName(`${userFormFirstName} ${e.target.value}`.trim());
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Display Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. John Doe (Internal)"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                    value={userFormDisplayName}
                                    onChange={(e) => setUserFormDisplayName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                                <input 
                                    type="email" 
                                    placeholder="e.g. johndoe@swiss-belhotel.com"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                    value={userFormEmail}
                                    onChange={(e) => setUserFormEmail(e.target.value)}
                                    disabled={!!editingUser}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Access Level</label>
                                    <select 
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                        value={userFormAccessLevel}
                                        onChange={(e) => setUserFormAccessLevel(e.target.value as any)}
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="auditor">Auditor</option>
                                        <option value="auditee">Auditee</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Role / Title</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                        value={userFormRole}
                                        onChange={(e) => setUserFormRole(e.target.value)}
                                    >
                                        {['General Manager', 'GM Secretary', 'Marcomm/PR', 'Room Division', 'Front Office', 'Sales & Marketing', 'Auditor', 'Director of Finance', 'Executive Housekeeper', 'Admin'].map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assigned Hotel Property</label>
                                <select 
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all focus:ring-1 focus:ring-indigo-100"
                                    value={userFormHotelId}
                                    onChange={(e) => setUserFormHotelId(e.target.value)}
                                >
                                    <option value="">-- No Assigned Hotel / Corporate Office --</option>
                                    {hotels.map(h => (
                                        <option key={h.id} value={h.id}>
                                            {h.name} {h.code ? `(${h.code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2.5 pt-2">
                                <div className="flex items-center gap-2.5">
                                    <input 
                                        type="checkbox" 
                                        id="userFormIsBrandAuditLead"
                                        checked={userFormIsBrandAuditLead}
                                        onChange={(e) => setUserFormIsBrandAuditLead(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="userFormIsBrandAuditLead" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                                        Brand Audit Lead Designation
                                    </label>
                                </div>

                                {(!editingUser || editingUser.email !== 'brandaudit@swiss-belhotel.com') && (
                                    <div className="flex items-center gap-2.5">
                                        <input 
                                            type="checkbox" 
                                            id="userFormIsApproved"
                                            checked={userFormIsApproved}
                                            onChange={(e) => setUserFormIsApproved(e.target.checked)}
                                            className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                        />
                                        <label htmlFor="userFormIsApproved" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                                            Approved and Active (Access Allowed)
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                <button 
                                    type="button"
                                    onClick={() => setIsUserFormOpen(false)}
                                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold text-sm transition-all active:scale-95 outline-none"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                                >
                                    {editingUser ? 'Save Changes' : 'Create Profile'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm User Delete Dialog */}
            {confirmUserDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-sm p-6 rounded-3xl border border-slate-200 shadow-xl relative animate-scaleUp">
                        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete User Profile?</h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
                            Are you absolutely sure you want to permanently delete this user registry profile? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => handleDeleteUser(confirmUserDeleteId)}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-full font-bold text-sm transition-all shadow-md active:scale-95"
                            >
                                Delete User
                            </button>
                            <button 
                                onClick={() => setConfirmUserDeleteId(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-full font-bold text-sm transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ENLARGED IMAGE LIGHTBOX MODAL */}
            {enlargedImage && (
                <div 
                    className="fixed inset-0 z-[999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
                    onClick={() => setEnlargedImage(null)}
                >
                    <div 
                        className="relative max-w-5xl w-full max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                    <Maximize2 size={16} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-black text-white truncate">{enlargedImage.title || "Evidence Photo Preview"}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Click outside or press Esc to close</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <a 
                                    href={enlargedImage.url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700"
                                    title="Open original file in new tab"
                                >
                                    <ExternalLink size={16} />
                                </a>
                                <button 
                                    onClick={() => setEnlargedImage(null)} 
                                    className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700"
                                    title="Close Lightbox"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Large Image View */}
                        <div className="p-4 sm:p-6 flex-1 flex items-center justify-center overflow-auto bg-slate-950/40 min-h-[300px]">
                            <img 
                                src={enlargedImage.url} 
                                alt="Enlarged Evidence" 
                                referrerPolicy="no-referrer" 
                                className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800" 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* SUPABASE SQL MIGRATION MODAL */}
            {showSqlModal && (
                <div 
                    className="fixed inset-0 z-[999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
                    onClick={() => setShowSqlModal(false)}
                >
                    <div 
                        className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-scaleUp text-white flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                                    <Database size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-white">Supabase Schema Migration</h3>
                                    <p className="text-[10px] text-slate-400 font-medium">SQL scripts to align database schemas with feature configurations</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowSqlModal(false)}
                                className="p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-xl transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* TAB CONTROLLERS */}
                        <div className="flex bg-slate-950/40 border-b border-slate-800/80 p-2">
                            <button
                                onClick={() => setSqlModalTab('checklist')}
                                className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all ${
                                    sqlModalTab === 'checklist'
                                        ? 'bg-slate-800 text-white shadow-2xs'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Checklist Groups SQL
                            </button>
                            <button
                                onClick={() => setSqlModalTab('auditor')}
                                className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all ${
                                    sqlModalTab === 'auditor'
                                        ? 'bg-slate-800 text-white shadow-2xs'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Auditor Category Assignments SQL
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4 text-xs">
                            {sqlModalTab === 'checklist' ? (
                                <>
                                    <p className="text-slate-300 font-medium leading-relaxed">
                                        Execute the following SQL script in your <strong className="text-emerald-400">Supabase Dashboard → SQL Editor</strong> to create tables and RLS security policies for <strong className="text-emerald-400">Audit Checklist Groups & Assigned Hotels</strong>:
                                    </p>

                                    <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                                        <button
                                            onClick={() => {
                                                const sqlText = `-- Drop old tables if they exist\nDROP TABLE IF EXISTS audit_group_categories CASCADE;\nDROP TABLE IF EXISTS audit_group_items CASCADE;\nDROP TABLE IF EXISTS audit_group_hotels CASCADE;\n\n-- Create Table for Audit Checklist Groups\nCREATE TABLE IF NOT EXISTS audit_checklist_groups (\n    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n    name VARCHAR(255) NOT NULL,\n    description TEXT,\n    category_ids TEXT[] DEFAULT '{}',\n    item_ids TEXT[] DEFAULT '{}',\n    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL\n);\n\n-- Migration script in case columns are missing on existing tables\nALTER TABLE audit_checklist_groups ADD COLUMN IF NOT EXISTS category_ids TEXT[] DEFAULT '{}';\nALTER TABLE audit_checklist_groups ADD COLUMN IF NOT EXISTS item_ids TEXT[] DEFAULT '{}';\n\n-- Create Table for Audit Checklist Group Hotels association\nCREATE TABLE IF NOT EXISTS audit_group_hotels (\n    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n    group_id UUID NOT NULL REFERENCES audit_checklist_groups(id) ON DELETE CASCADE,\n    hotel_id VARCHAR(100) NOT NULL,\n    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,\n    UNIQUE(group_id, hotel_id)\n);\n\n-- Enable Row Level Security (RLS)\nALTER TABLE audit_checklist_groups ENABLE ROW LEVEL SECURITY;\nALTER TABLE audit_group_hotels ENABLE ROW LEVEL SECURITY;\n\n-- Set Access Policies to Allow All Reads/Inserts/Deletes (Idempotent)\nDROP POLICY IF EXISTS "Allow public select audit_checklist_groups" ON audit_checklist_groups;\nCREATE POLICY "Allow public select audit_checklist_groups" ON audit_checklist_groups FOR SELECT USING (true);\n\nDROP POLICY IF EXISTS "Allow public insert audit_checklist_groups" ON audit_checklist_groups;\nCREATE POLICY "Allow public insert audit_checklist_groups" ON audit_checklist_groups FOR INSERT WITH CHECK (true);\n\nDROP POLICY IF EXISTS "Allow public update audit_checklist_groups" ON audit_checklist_groups;\nCREATE POLICY "Allow public update audit_checklist_groups" ON audit_checklist_groups FOR UPDATE USING (true);\n\nDROP POLICY IF EXISTS "Allow public delete audit_checklist_groups" ON audit_checklist_groups;\nCREATE POLICY "Allow public delete audit_checklist_groups" ON audit_checklist_groups FOR DELETE USING (true);\n\nDROP POLICY IF EXISTS "Allow public select audit_group_hotels" ON audit_group_hotels;\nCREATE POLICY "Allow public select audit_group_hotels" ON audit_group_hotels FOR SELECT USING (true);\n\nDROP POLICY IF EXISTS "Allow public insert audit_group_hotels" ON audit_group_hotels;\nCREATE POLICY "Allow public insert audit_group_hotels" ON audit_group_hotels FOR INSERT WITH CHECK (true);\n\nDROP POLICY IF EXISTS "Allow public delete audit_group_hotels" ON audit_group_hotels;\nCREATE POLICY "Allow public delete audit_group_hotels" ON audit_group_hotels FOR DELETE USING (true);`;
                                                navigator.clipboard.writeText(sqlText);
                                                setCopiedSql(true);
                                                setTimeout(() => setCopiedSql(false), 2500);
                                            }}
                                            className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-sans text-[10px] font-bold flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95"
                                        >
                                            {copiedSql ? (
                                                <>
                                                    <Check size={12} className="text-emerald-400" />
                                                    <span>Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={12} />
                                                    <span>Copy SQL</span>
                                                </>
                                            )}
                                        </button>
                                        <pre className="pt-2">
{`-- Drop old tables if they exist
DROP TABLE IF EXISTS audit_group_categories CASCADE;
DROP TABLE IF EXISTS audit_group_items CASCADE;
DROP TABLE IF EXISTS audit_group_hotels CASCADE;

-- Create Table for Audit Checklist Groups
CREATE TABLE IF NOT EXISTS audit_checklist_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_ids TEXT[] DEFAULT '{}',
    item_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration script in case columns are missing on existing tables
ALTER TABLE audit_checklist_groups ADD COLUMN IF NOT EXISTS category_ids TEXT[] DEFAULT '{}';
ALTER TABLE audit_checklist_groups ADD COLUMN IF NOT EXISTS item_ids TEXT[] DEFAULT '{}';

-- Create Table for Audit Checklist Group Hotels association
CREATE TABLE IF NOT EXISTS audit_group_hotels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES audit_checklist_groups(id) ON DELETE CASCADE,
    hotel_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, hotel_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE audit_checklist_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_group_hotels ENABLE ROW LEVEL SECURITY;

-- Set Access Policies to Allow All Reads/Inserts/Deletes (Idempotent)
DROP POLICY IF EXISTS "Allow public select audit_checklist_groups" ON audit_checklist_groups;
CREATE POLICY "Allow public select audit_checklist_groups" ON audit_checklist_groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert audit_checklist_groups" ON audit_checklist_groups;
CREATE POLICY "Allow public insert audit_checklist_groups" ON audit_checklist_groups FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update audit_checklist_groups" ON audit_checklist_groups;
CREATE POLICY "Allow public update audit_checklist_groups" ON audit_checklist_groups FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete audit_checklist_groups" ON audit_checklist_groups;
CREATE POLICY "Allow public delete audit_checklist_groups" ON audit_checklist_groups FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select audit_group_hotels" ON audit_group_hotels;
CREATE POLICY "Allow public select audit_group_hotels" ON audit_group_hotels FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert audit_group_hotels" ON audit_group_hotels;
CREATE POLICY "Allow public insert audit_group_hotels" ON audit_group_hotels FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete audit_group_hotels" ON audit_group_hotels;
CREATE POLICY "Allow public delete audit_group_hotels" ON audit_group_hotels FOR DELETE USING (true);`}
                                        </pre>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-slate-300 font-medium leading-relaxed">
                                        Execute the following SQL script in your <strong className="text-emerald-400">Supabase Dashboard → SQL Editor</strong> to enable permanent <strong className="text-emerald-400">Auditor Assignments</strong>:
                                    </p>

                                    <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                                        <button
                                            onClick={() => {
                                                const sqlText = `CREATE TABLE IF NOT EXISTS auditor_category_assignments (\n    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n    user_id UUID NOT NULL,\n    category_id UUID NOT NULL,\n    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,\n    UNIQUE(user_id, category_id)\n);\n\nALTER TABLE auditor_category_assignments ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Allow public read auditor_category_assignments" ON auditor_category_assignments FOR SELECT USING (true);\nCREATE POLICY "Allow public insert auditor_category_assignments" ON auditor_category_assignments FOR INSERT WITH CHECK (true);\nCREATE POLICY "Allow public delete auditor_category_assignments" ON auditor_category_assignments FOR DELETE USING (true);`;
                                                navigator.clipboard.writeText(sqlText);
                                                setCopiedSql(true);
                                                setTimeout(() => setCopiedSql(false), 2500);
                                            }}
                                            className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-sans text-[10px] font-bold flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95"
                                        >
                                            {copiedSql ? (
                                                <>
                                                    <Check size={12} className="text-emerald-400" />
                                                    <span>Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={12} />
                                                    <span>Copy SQL</span>
                                                </>
                                            )}
                                        </button>
                                        <pre className="pt-2">
{`-- Create table for auditor category assignments
CREATE TABLE IF NOT EXISTS auditor_category_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    category_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, category_id)
);

-- Enable Row Level Security & set access policies
ALTER TABLE auditor_category_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read auditor_category_assignments" ON auditor_category_assignments FOR SELECT USING (true);
CREATE POLICY "Allow public insert auditor_category_assignments" ON auditor_category_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete auditor_category_assignments" ON auditor_category_assignments FOR DELETE USING (true);`}
                                        </pre>
                                    </div>
                                </>
                            )}

                            <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-4 space-y-1 text-slate-300">
                                <h4 className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                                    <CheckCircle2 size={14} className="text-indigo-400" />
                                    Note on Offline & Local Fallback
                                </h4>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Even before running this SQL script in Supabase, groups and assignments work immediately in local browser storage fallback! Once you execute the SQL script in your Supabase dashboard, all groups and associations will seamlessly synchronize dynamically across your live environment.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex justify-end">
                            <button
                                onClick={() => setShowSqlModal(false)}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all active:scale-95"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
