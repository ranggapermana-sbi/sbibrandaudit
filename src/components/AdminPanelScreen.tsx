import React, { useState, useEffect } from 'react';
import { Download, ArrowLeft, CheckCircle, Clock, Building, BarChart3, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, ArrowUpDown, Plus, Trash2, Edit, Search, X, AlertCircle, MapPin, Settings2, Calendar, Star, Briefcase, ClipboardList, FileCheck, Layers, Package, Camera, ImageIcon, FileText, Hash, Type, CheckSquare, Users, ShieldCheck, Percent, GripVertical, ChevronUp, ChevronDown, Eye, User, RefreshCw, CheckCircle2, Maximize2, ExternalLink, ZoomIn, Database, Copy, Check, Lock, Unlock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiCache } from '../lib/cache';
import { fetchHotelsWithFallback } from '../lib/hotelService';

import { Department, Hotel, AuditBatch, AuditCategory, AuditItem, AuditGroup } from '../types';
import { DEFAULT_DEPARTMENTS, DEFAULT_CATEGORIES, DEFAULT_HOTELS, DEFAULT_BATCHES, DEFAULT_GROUPS, DEFAULT_OFFLINE_ITEMS, HARDCODED_TEST_HOTELS } from '../lib/constants';
import AuditorEvidenceForm from './AuditorEvidenceForm';

const isImageInput = (type: string) => {
    const t = (type || '').toLowerCase().trim();
    return ['camera', 'image', 'photo', 'picture', 'img', 'gallery'].includes(t);
};

const splitEvidenceUrls = (value: string): string[] => {
    if (!value) return [];
    const urls: string[] = [];
    const parts = value.split(',');
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part.startsWith('data:image/') && part.includes(';base64')) {
            let fullBase64 = parts[i];
            if (i + 1 < parts.length) {
                fullBase64 += ',' + parts[i + 1];
                i++;
            }
            urls.push(fullBase64.trim());
        } else if (part) {
            urls.push(part);
        }
    }
    return urls;
};

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
    'MAUA',
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
    const [subView, setSubView] = useState<'dashboard' | 'departments' | 'hotels' | 'batches' | 'categories' | 'items' | 'groups' | 'users' | 'access' | 'inspection' | 'auditor_assignment' | 'progress_report'>('dashboard');
    const [progressRegionFilter, setProgressRegionFilter] = useState<string>('');
    const [progressCountryFilter, setProgressCountryFilter] = useState<string>('');
    const [progressBrandFilter, setProgressBrandFilter] = useState<string>('');
    const [progressBrandLeadFilter, setProgressBrandLeadFilter] = useState<'all' | 'has_lead' | 'no_lead'>('all');
    const [progressStatusFilter, setProgressStatusFilter] = useState<'all' | 'finalized' | 'in_progress' | 'not_started'>('all');
    const [progressSearchQuery, setProgressSearchQuery] = useState<string>('');
    const [progressSortField, setProgressSortField] = useState<'name' | 'brand' | 'location' | 'progress' | 'status'>('name');
    const [progressSortDirection, setProgressSortDirection] = useState<'asc' | 'desc'>('asc');
    const [progressPage, setProgressPage] = useState<number>(1);
    const [progressPageSize, setProgressPageSize] = useState<number>(10);
    const [auditorAccess, setAuditorAccess] = useState<Record<string, boolean>>({});
    const [auditorAssignments, setAuditorAssignments] = useState<any[]>(() => {
        try {
            const stored = localStorage.getItem('sbi_auditor_assignments');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    });
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
    const [selectedCategoryBatchIds, setSelectedCategoryBatchIds] = useState<Set<string>>(new Set());
    const [categoryDeptFilter, setCategoryDeptFilter] = useState<string>('all');
    const [groupByDept, setGroupByDept] = useState<boolean>(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [groupAssignmentTab, setGroupAssignmentTab] = useState<'categories' | 'items'>('categories');
    const [groupSearchQuery, setGroupSearchQuery] = useState('');
    const [showSqlModal, setShowSqlModal] = useState(false);
    const [sqlModalTab, setSqlModalTab] = useState<'auditor' | 'checklist' | 'finalize' | 'photolock' | 'indexes'>('checklist');
    const [groupExpandedCats, setGroupExpandedCats] = useState<Record<string, boolean>>({});
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
    const [expandedInspectionItems, setExpandedInspectionItems] = useState<Record<string, boolean>>({});
    const [enlargedImage, setEnlargedImage] = useState<{ url: string; title?: string } | null>(null);

    const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

    const handleCopyDocLink = (text: string, id: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedDocId(id);
            setTimeout(() => setCopiedDocId(null), 2000);
        }).catch(err => {
            console.error("Failed to copy:", err);
            alert("Could not copy automatically. Link: " + text.substring(0, 100) + "...");
        });
    };

    const handleDocumentDownload = (val: string, itemName: string) => {
        if (!val) return;
        try {
            if (val.startsWith('data:')) {
                const mimeMatch = val.match(/^data:([^;]+);/);
                let ext = '.bin';
                if (mimeMatch) {
                    const mime = mimeMatch[1];
                    if (mime.includes('pdf')) ext = '.pdf';
                    else if (mime.includes('wordprocessingml.document') || mime.includes('docx')) ext = '.docx';
                    else if (mime.includes('msword') || mime.includes('doc')) ext = '.doc';
                    else if (mime.includes('spreadsheetml.sheet') || mime.includes('xlsx')) ext = '.xlsx';
                    else if (mime.includes('ms-excel') || mime.includes('xls')) ext = '.xls';
                    else if (mime.includes('png')) ext = '.png';
                    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
                    else if (mime.includes('zip')) ext = '.zip';
                }
                
                const link = document.createElement('a');
                link.href = val;
                const cleanedName = (itemName || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
                link.download = `Evidence_${cleanedName}${ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                const link = document.createElement('a');
                link.href = val;
                link.target = '_blank';
                link.rel = 'noreferrer';
                if (val.startsWith('blob:')) {
                    link.download = `Evidence_${(itemName || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                }
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (e) {
            console.error("Error opening/downloading document:", e);
            window.open(val, '_blank');
        }
    };

    // Active Properties stats modal
    const [statsModalType, setStatsModalType] = useState<'auditees' | 'brand_leads' | null>(null);
    const [statsModalCopied, setStatsModalCopied] = useState(false);

    // Reset Progress PIN Modal States
    const [isResetPinModalOpen, setIsResetPinModalOpen] = useState(false);
    const [resetPinValue, setResetPinValue] = useState('');
    const [resetPinError, setResetPinError] = useState('');
    const [hotelToReset, setHotelToReset] = useState<Hotel | null>(null);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setEnlargedImage(null);
                setShowSqlModal(false);
                setIsResetPinModalOpen(false);
                setStatsModalType(null);
                setResetPinValue('');
                setResetPinError('');
                setHotelToReset(null);
                return;
            }

            if (isResetPinModalOpen) {
                if (e.key >= '0' && e.key <= '9') {
                    setResetPinValue(prev => prev.length < 6 ? prev + e.key : prev);
                    setResetPinError('');
                } else if (e.key === 'Backspace') {
                    setResetPinValue(prev => prev.slice(0, -1));
                    setResetPinError('');
                } else if (e.key === 'Enter') {
                    handleVerifyResetPin();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isResetPinModalOpen, resetPinValue, hotelToReset]);

    const handleVerifyResetPin = async () => {
        if (resetPinValue !== '230987') {
            setResetPinError('Incorrect Super Admin PIN. Access Denied.');
            setResetPinValue('');
            return;
        }

        if (!hotelToReset) return;

        setIsResetting(true);
        try {
            const hId = hotelToReset.id;

            // 1. Delete from Supabase 'audit_submissions'
            const { error: subError } = await supabase
                .from('audit_submissions')
                .delete()
                .eq('hotel_id', hId);

            if (subError) {
                console.error("Error deleting submissions from Supabase:", subError);
            }

            // 2. Delete from Supabase 'hotel_audit_status'
            const { error: statusError } = await supabase
                .from('hotel_audit_status')
                .delete()
                .eq('hotel_id', hId);

            if (statusError) {
                console.error("Error deleting audit status from Supabase:", statusError);
            }

            // 3. Clear localStorage fallbacks
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key) {
                    if (key.startsWith(`sbi_audit_${hId}_`) || key.startsWith(`sbi_audit_finalized_${hId}`)) {
                        localStorage.removeItem(key);
                    }
                    if (key.startsWith(`sbi_audit_finalized_by_${hId}`) || key.startsWith(`sbi_audit_finalized_at_${hId}`)) {
                        localStorage.removeItem(key);
                    }
                }
            }

            // 4. Update local states so that UI updates instantly
            setAllSubmissions(prev => prev.filter(sub => String(sub.hotel_id).toLowerCase() !== String(hId).toLowerCase()));
            setFinalizedStatuses(prev => {
                const updated = { ...prev };
                delete updated[hId];
                return updated;
            });

            // Show success alert
            alert(`Successfully reset all audit progress for ${hotelToReset.name}!`);
            
            // Close modal & reset states
            setIsResetPinModalOpen(false);
            setResetPinValue('');
            setResetPinError('');
            setHotelToReset(null);
        } catch (error) {
            console.error("Error resetting progress:", error);
            alert("An error occurred while resetting the hotel's progress. Please try again.");
        } finally {
            setIsResetting(false);
        }
    };

    useEffect(() => {
        const fetchAuditorAssignments = async () => {
            // Hotel assignments
            try {
                const { data, error } = await supabase
                    .from('auditor_assignments')
                    .select('*');
                if (data) {
                    const localSaved = localStorage.getItem('sbi_auditor_assignments');
                    let localList: any[] = [];
                    if (localSaved) {
                        try { localList = JSON.parse(localSaved); } catch (e) {}
                    }
                    const map = new Map<string, any>();
                    data.forEach((item: any) => map.set(`${item.user_id}_${item.hotel_id}`, item));
                    localList.forEach((item: any) => {
                        const key = `${item.user_id}_${item.hotel_id}`;
                        if (!map.has(key)) map.set(key, item);
                    });
                    const merged = Array.from(map.values());
                    setAuditorAssignments(merged);
                    localStorage.setItem('sbi_auditor_assignments', JSON.stringify(merged));
                }
            } catch (err) {
                console.warn('Could not fetch auditor assignments from Supabase:', err);
            }

            // Category assignments
            try {
                const { data: catData } = await supabase
                    .from('auditor_category_assignments')
                    .select('*');
                
                if (catData && Array.isArray(catData)) {
                    setAuditorCategoryAssignments(catData);
                    localStorage.setItem('sbi_auditor_category_assignments', JSON.stringify(catData));
                } else {
                    const localCatSaved = localStorage.getItem('sbi_auditor_category_assignments');
                    if (localCatSaved) {
                        try {
                            const localCatList = JSON.parse(localCatSaved);
                            if (Array.isArray(localCatList)) {
                                setAuditorCategoryAssignments(localCatList);
                            }
                        } catch (e) {}
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
                'Recent Activity': 'dashboard',
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

    const fetchProfilesFromSupabase = async (forceRefresh = false) => {
        setIsProfilesTableMissing(false);
        try {
            const data = await apiCache.getOrFetch<any[]>('audit_users_profiles', async () => {
                const response = await fetch(`${MAIN_URL}audit_users?select=*&order=created_at.desc`, {
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`
                    }
                });
                if (response.ok) {
                    const res = await response.json();
                    if (Array.isArray(res)) return res;
                }
                if (response.status === 404 || response.status === 400) {
                    setIsProfilesTableMissing(true);
                }
                throw new Error(`Profiles fetch returned status: ${response.status}`);
            }, { forceRefresh });

            if (Array.isArray(data)) {
                setProfilesList(data);
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

    const executeApprovalStatusChange = async (userId: string, isApproved: boolean) => {
        const adminName = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.display_name || userProfile.email : 'Admin';
        const approvalDate = new Date().toISOString();
        const targetUser = profilesList.find(p => p.id === userId);

        try {
            const updatedList = profilesList.map(p => {
                if (p.id === userId) {
                    const updatedUser = { 
                        ...p, 
                        is_approved: isApproved, 
                        approved_by_name: isApproved ? adminName : null,
                        approved_at: isApproved ? approvalDate : null,
                        updated_at: approvalDate 
                    };
                    localStorage.setItem(`sbi_profile_${userId}`, JSON.stringify(updatedUser));
                    return updatedUser;
                }
                return p;
            });
            setProfilesList(updatedList);
            setToastMessage(`Updated approval status to ${isApproved ? 'Approved' : 'Pending'} locally.`);

            // Try to update with full details first
            let response = await fetch(`${MAIN_URL}audit_users?id=eq.${userId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': MAIN_KEY,
                    'Authorization': `Bearer ${MAIN_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ 
                    is_approved: isApproved,
                    approved_by_name: isApproved ? adminName : null,
                    approved_at: isApproved ? approvalDate : null,
                    updated_at: approvalDate
                })
            });

            if (!response.ok) {
                console.warn("Failed with full fields. Attempting core fields fallback...");
                // Core fields fallback
                response = await fetch(`${MAIN_URL}audit_users?id=eq.${userId}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({ 
                        is_approved: isApproved,
                        updated_at: approvalDate
                    })
                });
            }

            if (response.ok) {
                fetchProfilesFromSupabase();
                setToastMessage(`Successfully saved approval status to cloud database.`);
            } else {
                console.warn("Failed to sync approval status update with Supabase, kept local copy.");
            }

            // Trigger Zapier Webhook if approved and a webhookUrl exists
            if (isApproved && targetUser && webhookUrl) {
                setIsSendingWebhook(true);
                try {
                    const userDisplayName = targetUser.display_name || `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() || targetUser.email.split('@')[0];
                    const userRole = targetUser.role || 'General Manager';
                    const userAccessLevel = targetUser.access_level || 'auditee';
                    const userHotelName = targetUser.hotel_name || 'Swiss-Belhotel International';
                    const formattedDate = new Date(approvalDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                    });

                    // Build a stunningly polished, responsive HTML email that matches the app's executive styling
                    const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Account Approved - Swiss-Belhotel International</title>
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 20px;">
                            <tr>
                                <td align="center">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.08);">
                                        
                                        <!-- Header Block -->
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 40px; text-align: center;">
                                                <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 14px; padding: 10px; margin-bottom: 20px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);">
                                                    <span style="font-size: 28px; line-height: 1;"></span>
                                                </div>
                                                <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.025em;">Account Approved</h1>
                                                <p style="margin: 8px 0 0 0; font-size: 14px; color: #c7d2fe; font-weight: 500;">SBI Brand Audit 2026 Portal</p>
                                            </td>
                                        </tr>

                                        <!-- Content Body -->
                                        <tr>
                                            <td style="padding: 40px; color: #334155;">
                                                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; font-weight: 500; color: #1e293b;">Hello <strong>${userDisplayName}</strong>,</p>
                                                <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                                                    Your account registration request has been successfully verified and <strong>approved</strong>. You now have full access to perform audits and view compliance logs configured for your property level.
                                                </p>

                                                <!-- Metadata Table -->
                                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: separate; border-spacing: 0; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 28px;">
                                                    <tr>
                                                        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; width: 40%; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Email Address</td>
                                                        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #334155; font-family: 'SFMono-Regular', Consolas, Monaco, monospace;">${targetUser.email}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Property Role</td>
                                                        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 800; color: #1e293b;">${userRole}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Access Level</td>
                                                        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
                                                            <span style="display: inline-block; background-color: #e0e7ff; color: #4338ca; border: 1px solid rgba(67, 56, 202, 0.15); font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 6px;">${userAccessLevel}</span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Assigned Property</td>
                                                        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 800; color: #1e293b;">${userHotelName}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 16px 20px; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Approved By</td>
                                                        <td style="padding: 16px 20px; font-size: 13px; font-weight: 600; color: #475569;">${adminName} (${formattedDate})</td>
                                                    </tr>
                                                </table>

                                                <!-- Call to Action Button -->
                                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                    <tr>
                                                        <td align="center" style="padding-bottom: 10px;">
                                                            <a href="https://sbibrandaudit.vercel.app" target="_blank" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 30px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); transition: background-color 0.2s;">
                                                                Access Audit Dashboard
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>

                                        <!-- Footer Block -->
                                        <tr>
                                            <td style="background-color: #f1f5f9; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #94a3b8; font-weight: 500;">
                                                    This is an automated administrative notification. Please do not reply directly to this email.
                                                </p>
                                                <p style="margin: 8px 0 0 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                                                    Swiss-Belhotel International Hotels & Resorts
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                    `;

                    const payload = {
                        event_type: 'user_approved',
                        user_id: targetUser.id,
                        email: targetUser.email,
                        first_name: targetUser.first_name || '',
                        last_name: targetUser.last_name || '',
                        display_name: userDisplayName,
                        role: userRole,
                        access_level: userAccessLevel,
                        hotel_name: userHotelName,
                        hotel_code: targetUser.hotel_code || 'SBI',
                        approved_by: adminName,
                        approved_at: approvalDate,
                        app_url: window.location.origin,
                        email_html: emailHtml
                    };

                    // To bypass CORS preflight blocks or sandbox constraints within the preview iFrame,
                    // we dispatch the webhook request as a 'no-cors' simple request with a text/plain body.
                    // This guarantees that the browser successfully issues the POST request and Zapier receives it,
                    // as Zapier catch hooks automatically parse standard JSON strings from plain text request bodies.
                    await fetch(webhookUrl, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: {
                            'Content-Type': 'text/plain'
                        },
                        body: JSON.stringify(payload)
                    });
                    
                    setToastMessage(`User approved and Zapier webhook triggered successfully!`);
                } catch (err) {
                    console.error("Failed to send Zapier webhook:", err);
                    setToastMessage(`User approved, but Zapier webhook request failed.`);
                } finally {
                    setIsSendingWebhook(false);
                }
            }
        } catch (e) {
            console.warn("Network error or table missing while updating approval status, kept local copy.", e);
        }
    };

    const updateApprovalStatus = async (userId: string, isApproved: boolean) => {
        if (isApproved) {
            const userToApprove = profilesList.find(p => p.id === userId);
            if (userToApprove) {
                setConfirmApprovalUser(userToApprove);
                return;
            }
        }
        await executeApprovalStatusChange(userId, isApproved);
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
        setUserFormHotelIds([]);
        setAdminHotelSearch('');
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
        const ids = user.hotel_id ? String(user.hotel_id).split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        setUserFormHotelIds(ids);
        setAdminHotelSearch('');
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

        const selectedHotelsList = hotels.filter(h => userFormHotelIds.includes(h.id));
        const adminName = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.display_name || userProfile.email : 'Admin';
        const currentDate = new Date().toISOString();

        const payload: any = {
            id: editingUser ? editingUser.id : crypto.randomUUID(),
            email: userFormEmail.trim(),
            first_name: userFormFirstName.trim(),
            last_name: userFormLastName.trim(),
            display_name: userFormDisplayName.trim() || `${userFormFirstName.trim()} ${userFormLastName.trim()}`.trim() || userFormEmail.split('@')[0],
            role: userFormRole,
            access_level: userFormAccessLevel,
            hotel_id: userFormHotelIds.length > 0 ? userFormHotelIds.join(',') : null,
            hotel_name: selectedHotelsList.length > 0 ? selectedHotelsList.map(h => h.name).join(', ') : null,
            hotel_code: selectedHotelsList.length > 0 ? selectedHotelsList.map(h => h.code || 'SBI').join(',') : null,
            is_brand_audit_lead: userFormIsBrandAuditLead,
            is_approved: userFormIsApproved,
            updated_at: currentDate
        };

        if (userFormIsApproved) {
            payload.approved_by_name = editingUser?.approved_by_name || adminName;
            payload.approved_at = editingUser?.approved_at || currentDate;
        } else {
            payload.approved_by_name = null;
            payload.approved_at = null;
        }

        try {
            setIsSupabaseLoading(true);
            
            // 1. Save locally to localStorage
            localStorage.setItem(`sbi_profile_${payload.id}`, JSON.stringify(payload));

            // 2. Write to Supabase REST endpoint
            let res;
            if (editingUser) {
                // UPDATE / PATCH
                res = await fetch(`${MAIN_URL}audit_users?id=eq.${payload.id}`, {
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
                    console.warn("Full PATCH failed. Retrying without approval details...");
                    const fallbackPayload = { ...payload };
                    delete fallbackPayload.approved_by_name;
                    delete fallbackPayload.approved_at;
                    res = await fetch(`${MAIN_URL}audit_users?id=eq.${payload.id}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': MAIN_KEY,
                            'Authorization': `Bearer ${MAIN_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(fallbackPayload)
                    });
                }

                if (!res.ok) {
                    throw new Error(`Database profiles update returned status: ${res.status}`);
                }
                setToastMessage('User profile updated successfully!');
            } else {
                // CREATE / POST
                const fullPayload = {
                    ...payload,
                    created_at: currentDate
                };
                res = await fetch(`${MAIN_URL}audit_users`, {
                    method: 'POST',
                    headers: {
                        'apikey': MAIN_KEY,
                        'Authorization': `Bearer ${MAIN_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(fullPayload)
                });

                if (!res.ok) {
                    console.warn("Full POST failed. Retrying without approval details...");
                    const fallbackPayload = { ...fullPayload };
                    delete fallbackPayload.approved_by_name;
                    delete fallbackPayload.approved_at;
                    res = await fetch(`${MAIN_URL}audit_users`, {
                        method: 'POST',
                        headers: {
                            'apikey': MAIN_KEY,
                            'Authorization': `Bearer ${MAIN_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(fallbackPayload)
                    });
                }

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
    const [allSubmissions, setAllSubmissions] = useState<any[]>([]);

    useEffect(() => {
        if (subView !== 'inspection' && subView !== 'progress_report') return;

        let active = true;
        const fetchAllSubmissions = async () => {
            try {
                const { data, error } = await supabase
                    .from('audit_submissions')
                    .select('hotel_id, item_id, is_na, value, evidence_urls, notes, evidence_url, remark, score')
                    .limit(50000);
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

        // Background fallback polling interval set to 120 seconds (real-time channels handle instant sync)
        const interval = setInterval(() => {
            fetchAllSubmissions();
        }, 120000);

        return () => {
            active = false;
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [subView]);

    const fetchCategoriesFromSupabase = async (forceRefresh = false) => {
        setIsSupabaseLoading(true);
        setSupabaseErrorMsg(null);
        try {
            const mapped = await apiCache.getOrFetch<AuditCategory[]>('audit_categories', async () => {
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
                
                return data.map((item: any) => ({
                    id: String(item.id),
                    name: item.name,
                    totalTasks: item.total_tasks || 5, // Map to DB column
                    completed: item.completed || 0,
                    departmentId: item.department_id ? String(item.department_id) : undefined,
                    sort_order: item.sort_order !== undefined && item.sort_order !== null ? Number(item.sort_order) : undefined
                }));
            }, { forceRefresh });
            
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

    const fetchGroupsFromSupabase = async (forceRefresh = false) => {
        try {
            const mapped = await apiCache.getOrFetch<AuditGroup[]>('audit_checklist_groups', async () => {
                // Fetch checklist groups
                const { data: groupsData, error: groupsError } = await supabase
                    .from('audit_checklist_groups')
                    .select('*')
                    .order('name', { ascending: true });

                if (groupsError) {
                    throw groupsError;
                }

                // Fetch join table associations
                const { data: groupHotels } = await supabase
                    .from('audit_group_hotels')
                    .select('*');

                return (groupsData || []).map((g: any) => {
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
            }, { forceRefresh });

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

    const fetchItemsFromSupabase = async (forceRefresh = false) => {
        setIsSupabaseLoading(true);
        setSupabaseErrorMsg(null);
        try {
            const mapped = await apiCache.getOrFetch<AuditItem[]>('audit_items', async () => {
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
                
                return data.map((item: any) => ({
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
            }, { forceRefresh });
            
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
    const fetchDepartmentsFromSupabase = async (forceRefresh = false) => {
        setIsSupabaseLoading(true);
        setSupabaseErrorMsg(null);
        try {
            const mapped = await apiCache.getOrFetch<Department[]>('audit_departments', async () => {
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
                
                return data.map((item: any) => ({
                    id: String(item.id),
                    name: item.name,
                    head: item.head
                }));
            }, { forceRefresh });
            
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
        let parsed: Hotel[] = [];
        if (saved) {
            try {
                parsed = JSON.parse(saved);
            } catch (e) {
                console.error("Error parsing hotels", e);
            }
        }
        if (!parsed || parsed.length === 0) {
            parsed = DEFAULT_HOTELS;
        }
        const baseHotels = parsed.filter(h => h.id !== 'sbi-test' && h.id !== 'sbi-dummy');
        return [...baseHotels, ...HARDCODED_TEST_HOTELS];
    });

    const [finalizedStatuses, setFinalizedStatuses] = useState<Record<string, { is_finalized: boolean, finalized_by?: string, finalized_at?: string }>>({});

    const fetchFinalizedStatuses = async () => {
        try {
            const { data, error } = await supabase
                .from('hotel_audit_status')
                .select('*');
            
            if (error) {
                console.warn("Could not fetch finalized statuses:", error);
                const localStatuses: Record<string, any> = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('sbi_audit_finalized_') && !key.includes('_by_') && !key.includes('_at_')) {
                        const hId = key.replace('sbi_audit_finalized_', '');
                        const isFinal = localStorage.getItem(key) === 'true';
                        if (isFinal) {
                            localStatuses[hId] = {
                                is_finalized: true,
                                finalized_by: localStorage.getItem(`sbi_audit_finalized_by_${hId}`) || 'Self',
                                finalized_at: localStorage.getItem(`sbi_audit_finalized_at_${hId}`) || new Date().toISOString()
                            };
                        }
                    }
                }
                setFinalizedStatuses(localStatuses);
            } else if (data) {
                const statusesMap: Record<string, any> = {};
                data.forEach((row: any) => {
                    const info = {
                        is_finalized: !!row.is_finalized,
                        finalized_by: row.finalized_by,
                        finalized_at: row.finalized_at
                    };
                    if (row.hotel_id) {
                        const rawId = String(row.hotel_id).trim();
                        statusesMap[rawId] = info;
                        statusesMap[rawId.toLowerCase()] = info;

                        // Also associate with matching hotel code or name from hotels list
                        const matchedHotel = hotels.find(h => 
                            String(h.id).toLowerCase() === rawId.toLowerCase() ||
                            (h.code && String(h.code).toLowerCase() === rawId.toLowerCase()) ||
                            (h.name && String(h.name).toLowerCase() === rawId.toLowerCase())
                        );
                        if (matchedHotel) {
                            if (matchedHotel.id) {
                                statusesMap[matchedHotel.id] = info;
                                statusesMap[String(matchedHotel.id).toLowerCase()] = info;
                            }
                            if (matchedHotel.code) {
                                statusesMap[matchedHotel.code] = info;
                                statusesMap[String(matchedHotel.code).toLowerCase()] = info;
                            }
                            if (matchedHotel.name) {
                                statusesMap[matchedHotel.name] = info;
                                statusesMap[String(matchedHotel.name).toLowerCase()] = info;
                            }
                        }
                    }
                });
                setFinalizedStatuses(statusesMap);
            }
        } catch (err) {
            console.warn("Error fetching finalized statuses:", err);
        }
    };

    const handleUnlockHotel = async (hotelId: string) => {
        try {
            const { error } = await supabase
                .from('hotel_audit_status')
                .upsert({
                    hotel_id: hotelId,
                    is_finalized: false,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'hotel_id' });

            if (error) {
                console.warn("Could not save unlock to database:", error);
            }

            localStorage.setItem(`sbi_audit_finalized_${hotelId}`, 'false');
            localStorage.removeItem(`sbi_audit_finalized_by_${hotelId}`);
            localStorage.removeItem(`sbi_audit_finalized_at_${hotelId}`);

            setFinalizedStatuses(prev => ({
                ...prev,
                [hotelId]: { is_finalized: false }
            }));
            
            setToastMessage("Hotel's self-audit successfully unlocked!");
            setTimeout(() => setToastMessage(null), 3000);
        } catch (err) {
            console.error("Error unlocking hotel:", err);
            setToastMessage("An error occurred while unlocking.");
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    // Fetch hotels function
    const fetchHotelsFromSupabase = async (forceRefresh = false) => {
        setIsSupabaseLoading(true);
        setSupabaseErrorMsg(null);
        try {
            const finalHotels = await fetchHotelsWithFallback();
            setHotels(finalHotels);
            localStorage.setItem('sbi_audit_hotels_v2', JSON.stringify(finalHotels));
            setSupabaseConnected(true);
            setSupabaseErrorMsg(null);
        } catch (err: any) {
            console.warn("Supabase fetch error, using fallback:", err);
            setSupabaseConnected(false);
            setSupabaseErrorMsg(null);
            
            const saved = localStorage.setItem ? localStorage.getItem('sbi_audit_hotels_v2') : null;
            let parsed: Hotel[] = [];
            if (saved) {
                try {
                    parsed = JSON.parse(saved);
                } catch (e) {
                    parsed = DEFAULT_HOTELS;
                }
            } else {
                parsed = DEFAULT_HOTELS;
            }
            const baseHotels = parsed.filter(h => h.id !== 'sbi-test' && h.id !== 'sbi-dummy');
            setHotels([...baseHotels, ...HARDCODED_TEST_HOTELS]);
        } finally {
            setIsSupabaseLoading(false);
        }
    };

    // Fetch batches function
    const fetchBatchesFromSupabase = async (forceRefresh = false) => {
        setIsSupabaseLoading(true);
        setSupabaseErrorMsg(null);
        try {
            const mappedBatches = await apiCache.getOrFetch<AuditBatch[]>('audit_batches', async () => {
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
                return batchesData.map((b: any) => {
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
            }, { forceRefresh });

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
                fetchGroupsFromSupabase(),
                fetchFinalizedStatuses(),
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

    // Recent activity logs states
    const [recentActivityEvents, setRecentActivityEvents] = useState<any[]>([]);
    const [activityCurrentPage, setActivityCurrentPage] = useState<number>(1);
    const [isActivityLoading, setIsActivityLoading] = useState<boolean>(false);

    const formatActivityTimestamp = (dateStr: any) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${day}-${month}-${year} (${hours}:${minutes})`;
        } catch (e) {
            return '';
        }
    };

    const fetchRecentActivity = async () => {
        // Disabled to prevent unnecessary heavy queries against Supabase
        return;
    };

    useEffect(() => {
        // Disabled Recent Activity background polling
    }, []);

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
        if (subView === 'hotels' || subView === 'progress_report' || subView === 'inspection') {
            fetchFinalizedStatuses();
        }
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
        } else if (subView === 'progress_report' || subView === 'inspection') {
            fetchHotelsFromSupabase();
            fetchItemsFromSupabase();
            fetchCategoriesFromSupabase();
            fetchGroupsFromSupabase();
            fetchProfilesFromSupabase();
        }
    }, [subView]);

    // Toast and Dialog states
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [hotelFilterBrand, setHotelFilterBrand] = useState('All');
    const [hotelFilterStars, setHotelFilterStars] = useState('All');
    const [hotelPage, setHotelPage] = useState<number>(1);
    const [hotelPageSize, setHotelPageSize] = useState<number>(10);
    const [inspectionPage, setInspectionPage] = useState<number>(1);
    const [inspectionPageSize, setInspectionPageSize] = useState<number>(10);
    const [inspectionStatusFilter, setInspectionStatusFilter] = useState<'all' | 'finalized' | 'in_progress' | 'not_started'>('finalized');

    // Reset hotel pagination when search or filters change
    useEffect(() => {
        setHotelPage(1);
    }, [searchQuery, hotelFilterBrand, hotelFilterStars]);

    // Reset inspection pagination when search query, status filter or subview changes
    useEffect(() => {
        setInspectionPage(1);
    }, [searchQuery, inspectionStatusFilter, subView]);

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
    const [userFormHotelIds, setUserFormHotelIds] = useState<string[]>([]);
    const [adminHotelSearch, setAdminHotelSearch] = useState('');
    const [userFormIsBrandAuditLead, setUserFormIsBrandAuditLead] = useState(false);
    const [userFormIsApproved, setUserFormIsApproved] = useState(true);
    const [userFormError, setUserFormError] = useState('');
    const [confirmUserDeleteId, setConfirmUserDeleteId] = useState<string | null>(null);

    // Zapier webhook & approval confirmation states
    const [confirmApprovalUser, setConfirmApprovalUser] = useState<any | null>(null);
    const [isSendingWebhook, setIsSendingWebhook] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState<string>(() => {
        return localStorage.getItem('sbi_zapier_webhook_url') || import.meta.env.VITE_ZAPIER_WEBHOOK_URL || '';
    });
    const [isEditingWebhookUrl, setIsEditingWebhookUrl] = useState(false);

    // Auditor scoring & inspection states
    const [selectedInspectionHotelId, setSelectedInspectionHotelId] = useState<string>('');
    const [selectedAuditorId, setSelectedAuditorId] = useState<string>('');
    const [hotelAssignmentSearch, setHotelAssignmentSearch] = useState<string>('');
    const [hotelCountryFilter, setHotelCountryFilter] = useState<string>('all');
    const [groupByCountry, setGroupByCountry] = useState<boolean>(true);
    const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});
    const [selectedInspectionCategoryId, setSelectedInspectionCategoryId] = useState<string>('');
    const [hotelSubmissions, setHotelSubmissions] = useState<Record<string, any>>({});
    const [inspectionScores, setInspectionScores] = useState<Record<string, number | string>>(() => {
        const stored = localStorage.getItem('sbi_inspection_scores');
        return stored ? JSON.parse(stored) : {};
    });
    const [inspectionComments, setInspectionComments] = useState<Record<string, string>>(() => {
        const stored = localStorage.getItem('sbi_inspection_comments');
        return stored ? JSON.parse(stored) : {};
    });

    const isSubmissionForHotel = (submissionHotelId: string, hotel: Hotel) => {
        if (!submissionHotelId || !hotel) return false;
        
        const subIdLower = String(submissionHotelId).trim().toLowerCase();
        const hotelIdLower = String(hotel.id || '').trim().toLowerCase();
        
        if (subIdLower === hotelIdLower) return true;
        if (hotel.code && subIdLower === String(hotel.code).trim().toLowerCase()) return true;
        if (hotel.name && subIdLower === String(hotel.name).trim().toLowerCase()) return true;
        
        const associatedIds = new Set<string>();
        if (hotel.id) associatedIds.add(String(hotel.id).trim().toLowerCase());
        if (hotel.code) associatedIds.add(String(hotel.code).trim().toLowerCase());
        if (hotel.name) associatedIds.add(String(hotel.name).trim().toLowerCase());

        (profilesList || []).forEach(p => {
            const matchesCode = p.hotel_code && hotel.code && String(p.hotel_code).trim().toLowerCase() === String(hotel.code).trim().toLowerCase();
            const matchesName = p.hotel_name && hotel.name && String(p.hotel_name).trim().toLowerCase() === String(hotel.name).trim().toLowerCase();
            const matchesId = p.hotel_id && hotel.id && String(p.hotel_id).trim().toLowerCase() === String(hotel.id).trim().toLowerCase();
            if (matchesCode || matchesName || matchesId) {
                if (p.hotel_id) associatedIds.add(String(p.hotel_id).trim().toLowerCase());
                if (p.hotel_code) associatedIds.add(String(p.hotel_code).trim().toLowerCase());
                if (p.hotel_name) associatedIds.add(String(p.hotel_name).trim().toLowerCase());
                if (p.id) associatedIds.add(String(p.id).trim().toLowerCase());
            }
        });
        
        if (associatedIds.has(subIdLower)) return true;
        if (hotel.name && subIdLower.length > 3 && (subIdLower.includes(String(hotel.name).trim().toLowerCase()) || String(hotel.name).trim().toLowerCase().includes(subIdLower))) return true;
        if (hotel.code && hotel.code.length >= 2 && (subIdLower.includes(String(hotel.code).trim().toLowerCase()) || String(hotel.code).trim().toLowerCase().includes(subIdLower))) return true;
        return false;
    };

    const getHotelItems = (hotel: Hotel): AuditItem[] => {
        if (!hotel || !items || items.length === 0) return items || [];

        const possibleHotelIds = new Set<string>();
        if (hotel.id) possibleHotelIds.add(String(hotel.id).trim().toLowerCase());
        if (hotel.code) possibleHotelIds.add(String(hotel.code).trim().toLowerCase());
        if (hotel.name) possibleHotelIds.add(String(hotel.name).trim().toLowerCase());

        const matchedGroups = (groups || []).filter(g => {
            if (!g.hotelIds || g.hotelIds.length === 0) return false;
            return g.hotelIds.some(hid => possibleHotelIds.has(String(hid).trim().toLowerCase()));
        });

        if (matchedGroups.length > 0) {
            const assignedItemIds = new Set<string>();
            matchedGroups.forEach(g => {
                const itemIdsList = g.itemIds || (g as any).item_ids || [];
                itemIdsList.forEach((id: any) => assignedItemIds.add(String(id)));
            });
            const filtered = items.filter(item => assignedItemIds.has(String(item.id)));
            if (filtered.length > 0) {
                return filtered;
            }
        }

        return items;
    };

    const getHotelFinalizedInfo = (hotelIdOrHotel: any): { is_finalized: boolean, finalized_by?: string, finalized_at?: string } => {
        if (!hotelIdOrHotel) return { is_finalized: false };

        let currentHotel: Hotel | undefined;
        if (typeof hotelIdOrHotel === 'object' && hotelIdOrHotel !== null) {
            currentHotel = hotelIdOrHotel as Hotel;
        } else {
            const hIdLower = String(hotelIdOrHotel).trim().toLowerCase();
            currentHotel = hotels.find(h => 
                String(h.id).toLowerCase() === hIdLower || 
                (h.code && String(h.code).toLowerCase() === hIdLower) ||
                (h.name && String(h.name).toLowerCase() === hIdLower)
            );
        }

        const possibleIds = new Set<string>();
        if (typeof hotelIdOrHotel === 'string') possibleIds.add(hotelIdOrHotel.trim().toLowerCase());
        if (currentHotel) {
            if (currentHotel.id) possibleIds.add(String(currentHotel.id).trim().toLowerCase());
            if (currentHotel.code) possibleIds.add(String(currentHotel.code).trim().toLowerCase());
            if (currentHotel.name) possibleIds.add(String(currentHotel.name).trim().toLowerCase());

            (profilesList || []).forEach(p => {
                const matchesCode = p.hotel_code && currentHotel?.code && String(p.hotel_code).trim().toLowerCase() === String(currentHotel.code).trim().toLowerCase();
                const matchesName = p.hotel_name && currentHotel?.name && String(p.hotel_name).trim().toLowerCase() === String(currentHotel.name).trim().toLowerCase();
                const matchesId = p.hotel_id && currentHotel?.id && String(p.hotel_id).trim().toLowerCase() === String(currentHotel.id).trim().toLowerCase();
                if (matchesCode || matchesName || matchesId) {
                    if (p.hotel_id) possibleIds.add(String(p.hotel_id).trim().toLowerCase());
                    if (p.hotel_code) possibleIds.add(String(p.hotel_code).trim().toLowerCase());
                    if (p.hotel_name) possibleIds.add(String(p.hotel_name).trim().toLowerCase());
                    if (p.id) possibleIds.add(String(p.id).trim().toLowerCase());
                }
            });
        }

        for (const pid of Array.from(possibleIds)) {
            if (finalizedStatuses[pid]?.is_finalized) {
                return finalizedStatuses[pid];
            }
            for (const [key, val] of Object.entries(finalizedStatuses)) {
                const statusVal = val as { is_finalized?: boolean; finalized_by?: string; finalized_at?: string } | undefined;
                if (key.toLowerCase() === pid && statusVal?.is_finalized) {
                    return {
                        is_finalized: true,
                        finalized_by: statusVal.finalized_by,
                        finalized_at: statusVal.finalized_at
                    };
                }
            }
            if (localStorage.getItem(`sbi_audit_finalized_${pid}`) === 'true') {
                return {
                    is_finalized: true,
                    finalized_by: localStorage.getItem(`sbi_audit_finalized_by_${pid}`) || 'Representative',
                    finalized_at: localStorage.getItem(`sbi_audit_finalized_at_${pid}`) || new Date().toISOString()
                };
            }
        }
        return { is_finalized: false };
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

    const fetchHotelSubmissionsForAuditor = async () => {
        if (!selectedInspectionHotelId) {
            setHotelSubmissions({});
            return;
        }
        try {
            const hotel = hotels.find(h => h.id === selectedInspectionHotelId) || hotels.find(h => isSubmissionForHotel(selectedInspectionHotelId, h));
            const currentHotel = hotel || (selectedInspectionHotelId ? { id: selectedInspectionHotelId, code: selectedInspectionHotelId, name: selectedInspectionHotelId } as Hotel : undefined);

            const associatedIds = new Set<string>();
            if (currentHotel) {
                if (currentHotel.id) {
                    associatedIds.add(String(currentHotel.id));
                    associatedIds.add(String(currentHotel.id).toLowerCase());
                    associatedIds.add(String(currentHotel.id).toUpperCase());
                }
                if (currentHotel.code) {
                    associatedIds.add(String(currentHotel.code));
                    associatedIds.add(String(currentHotel.code).toLowerCase());
                    associatedIds.add(String(currentHotel.code).toUpperCase());
                }
                if (currentHotel.name) {
                    associatedIds.add(String(currentHotel.name));
                }
                
                profilesList.forEach(p => {
                    const matchesCode = p.hotel_code && currentHotel.code && String(p.hotel_code).trim().toLowerCase() === String(currentHotel.code).trim().toLowerCase();
                    const matchesName = p.hotel_name && currentHotel.name && String(p.hotel_name).trim().toLowerCase() === String(currentHotel.name).trim().toLowerCase();
                    const matchesId = p.hotel_id && currentHotel.id && String(p.hotel_id).trim().toLowerCase() === String(currentHotel.id).trim().toLowerCase();
                    if (matchesCode || matchesName || matchesId) {
                        if (p.hotel_id) {
                            associatedIds.add(String(p.hotel_id));
                            associatedIds.add(String(p.hotel_id).toLowerCase());
                        }
                        if (p.hotel_code) {
                            associatedIds.add(String(p.hotel_code));
                            associatedIds.add(String(p.hotel_code).toLowerCase());
                        }
                        if (p.hotel_name) {
                            associatedIds.add(String(p.hotel_name));
                        }
                        if (p.id) {
                            associatedIds.add(String(p.id));
                        }
                    }
                });
            } else {
                associatedIds.add(String(selectedInspectionHotelId));
                associatedIds.add(String(selectedInspectionHotelId).toLowerCase());
            }

            const idList = Array.from(associatedIds).filter(id => id && String(id).trim().length > 0);
            let subsData: any[] | null = null;

            if (idList.length > 0) {
                const { data, error } = await supabase
                    .from('audit_submissions')
                    .select('*')
                    .in('hotel_id', idList);
                if (!error && data && data.length > 0) {
                    subsData = data;
                }
            }

            // Fallback 1: Query specifically by target IDs if .in returned 0 items
            if ((!subsData || subsData.length === 0) && (currentHotel?.id || currentHotel?.code || selectedInspectionHotelId)) {
                const targetIds = [currentHotel?.id, currentHotel?.code, selectedInspectionHotelId].filter(Boolean) as string[];
                for (const tid of targetIds) {
                    const { data, error } = await supabase
                        .from('audit_submissions')
                        .select('*')
                        .eq('hotel_id', tid);
                    if (!error && data && data.length > 0) {
                        subsData = data;
                        break;
                    }
                }
            }

            // Fallback 2: Select all submissions and filter using isSubmissionForHotel
            if (!subsData || subsData.length === 0) {
                const { data, error } = await supabase
                    .from('audit_submissions')
                    .select('*');
                if (!error && data && data.length > 0) {
                    if (currentHotel) {
                        subsData = data.filter(s => isSubmissionForHotel(s.hotel_id, currentHotel));
                    } else {
                        subsData = data.filter(s => String(s.hotel_id).toLowerCase() === String(selectedInspectionHotelId).toLowerCase());
                    }
                }
            }

            // Fallback 3: Filter from existing allSubmissions state
            if ((!subsData || subsData.length === 0) && allSubmissions && allSubmissions.length > 0) {
                if (currentHotel) {
                    subsData = allSubmissions.filter(s => isSubmissionForHotel(s.hotel_id, currentHotel));
                }
            }

            const submissionsMap: Record<string, any> = {};
            (subsData || []).forEach(sub => {
                if (sub && sub.item_id !== undefined && sub.item_id !== null) {
                    submissionsMap[sub.item_id] = sub;
                }
            });

            // ALSO check localStorage for any client-side saved property submissions
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('sbi_audit_') && !key.startsWith('sbi_audit_finalized_')) {
                        const parts = key.replace('sbi_audit_', '').split('_');
                        if (parts.length >= 2) {
                            const item_id = parts.pop();
                            const hId = parts.join('_');
                            if (currentHotel && isSubmissionForHotel(hId, currentHotel) && item_id) {
                                if (!submissionsMap[item_id]) {
                                    try {
                                        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
                                        if (parsed && (parsed.value !== undefined || parsed.is_na || parsed.evidence_urls)) {
                                            submissionsMap[item_id] = {
                                                item_id,
                                                hotel_id: hId,
                                                value: parsed.value || '',
                                                is_na: !!parsed.is_na,
                                                evidence_urls: parsed.evidence_urls || [],
                                                score: parsed.score,
                                                remarks: parsed.remarks || ''
                                            };
                                        }
                                    } catch (e) {}
                                }
                            }
                        }
                    }
                }
            } catch (lsErr) {}

            setHotelSubmissions(submissionsMap);
        } catch (err) {
            console.warn("Could not fetch audit submissions for auditor, using state fallback:", err);
            const hotel = hotels.find(h => h.id === selectedInspectionHotelId);
            if (allSubmissions && allSubmissions.length > 0) {
                const submissionsMap: Record<string, any> = {};
                allSubmissions.filter(s => hotel ? isSubmissionForHotel(s.hotel_id, hotel) : String(s.hotel_id) === String(selectedInspectionHotelId)).forEach(sub => {
                    if (sub && sub.item_id !== undefined && sub.item_id !== null) {
                        submissionsMap[sub.item_id] = sub;
                    }
                });
                setHotelSubmissions(submissionsMap);
            }
        }
    };

    useEffect(() => {
        let active = true;
        const fetchSubmissionsLocal = async () => {
            if (!selectedInspectionHotelId) {
                if (active) setHotelSubmissions({});
                return;
            }
            await fetchHotelSubmissionsForAuditor();
        };
        fetchSubmissionsLocal();

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
                fetchSubmissionsLocal();
            })
            .subscribe();

        // 120-second background polling interval to conserve Supabase database resources
        const interval = setInterval(() => {
            fetchSubmissionsLocal();
        }, 120000);

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

    const saveInspectionScore = (hotelId: string, itemId: string, score: number | string | undefined) => {
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
                    return g;
                }));

                setToastMessage("Hotel assigned to group successfully!");
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
                return g;
            }));
            setToastMessage(isAssigned ? "Hotel unassigned locally" : "Hotel assigned locally");
        }
    };

    const handleGroupAssignAllHotels = async (groupId: string) => {
        if (!groupId) return;
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        try {
            // Delete associations for THIS group first so we don't violate UNIQUE constraint on group_id, hotel_id
            const { error: deleteError } = await supabase
                .from('audit_group_hotels')
                .delete()
                .eq('group_id', groupId);
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
                return g;
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
                return g;
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

        const auditorIdStr = String(auditorId).trim().toLowerCase();
        const categoryIdStr = String(categoryId).trim();

        const isAssignedToSelected = auditorCategoryAssignments.some(
            a => String(a.user_id).trim().toLowerCase() === auditorIdStr && String(a.category_id).trim() === categoryIdStr
        );

        let updated = [...auditorCategoryAssignments];
        if (isAssignedToSelected) {
            updated = updated.filter(a => !(String(a.user_id).trim().toLowerCase() === auditorIdStr && String(a.category_id).trim() === categoryIdStr));
        } else {
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
                const { error: insErr } = await supabase
                    .from('auditor_category_assignments')
                    .upsert({ user_id: auditorId, category_id: categoryId }, { onConflict: 'user_id,category_id' });

                if (insErr) {
                    const { error: fallbackErr } = await supabase
                        .from('auditor_assignments')
                        .upsert({ user_id: auditorId, category_id: categoryId });
                    
                    if (fallbackErr) {
                        console.log('Category assignment saved locally in state.');
                    }
                }
            }

            const { data: refetchCat } = await supabase.from('auditor_category_assignments').select('*');
            if (refetchCat && Array.isArray(refetchCat)) {
                const catMap = new Map<string, any>();
                refetchCat.forEach((item: any) => {
                    const key = `${String(item.user_id).trim().toLowerCase()}_${String(item.category_id).trim()}`;
                    catMap.set(key, item);
                });
                updated.forEach((item: any) => {
                    const key = `${String(item.user_id).trim().toLowerCase()}_${String(item.category_id).trim()}`;
                    if (!catMap.has(key)) {
                        catMap.set(key, item);
                    }
                });
                if (isAssignedToSelected) {
                    catMap.delete(`${auditorIdStr}_${categoryIdStr}`);
                }
                const merged = Array.from(catMap.values());
                setAuditorCategoryAssignments(merged);
                localStorage.setItem('sbi_auditor_category_assignments', JSON.stringify(merged));
            }
        } catch (err) {
            console.error('Category assignment sync error:', err);
        }
    };

    const handleBatchAssignCategories = async (auditorId: string, categoryIds: string[], assign: boolean) => {
        if (!auditorId || categoryIds.length === 0) return;

        const auditorIdStr = String(auditorId).trim().toLowerCase();
        const catIdSet = new Set(categoryIds.map(id => String(id).trim()));
        let updated = [...auditorCategoryAssignments];

        if (assign) {
            categoryIds.forEach(cId => {
                const cIdStr = String(cId).trim();
                if (!updated.some(a => String(a.user_id).trim().toLowerCase() === auditorIdStr && String(a.category_id).trim() === cIdStr)) {
                    updated.push({ user_id: auditorId, category_id: cId });
                }
            });
        } else {
            updated = updated.filter(a => !(String(a.user_id).trim().toLowerCase() === auditorIdStr && catIdSet.has(String(a.category_id).trim())));
        }

        setAuditorCategoryAssignments(updated);
        localStorage.setItem('sbi_auditor_category_assignments', JSON.stringify(updated));

        try {
            if (assign) {
                const rowsToInsert = categoryIds.map(cId => ({ user_id: auditorId, category_id: cId }));
                await supabase.from('auditor_category_assignments').upsert(rowsToInsert, { onConflict: 'user_id,category_id' });
            } else {
                await supabase.from('auditor_category_assignments')
                    .delete()
                    .eq('user_id', auditorId)
                    .in('category_id', categoryIds);
            }

            const { data: refetchCat } = await supabase.from('auditor_category_assignments').select('*');
            if (refetchCat && Array.isArray(refetchCat)) {
                const catMap = new Map<string, any>();
                refetchCat.forEach((item: any) => {
                    const key = `${String(item.user_id).trim().toLowerCase()}_${String(item.category_id).trim()}`;
                    catMap.set(key, item);
                });
                updated.forEach((item: any) => {
                    const key = `${String(item.user_id).trim().toLowerCase()}_${String(item.category_id).trim()}`;
                    if (!catMap.has(key)) {
                        catMap.set(key, item);
                    }
                });
                if (!assign) {
                    categoryIds.forEach(cId => {
                        const key = `${auditorIdStr}_${String(cId).trim()}`;
                        catMap.delete(key);
                    });
                }
                const merged = Array.from(catMap.values());
                setAuditorCategoryAssignments(merged);
                localStorage.setItem('sbi_auditor_category_assignments', JSON.stringify(merged));
            }
        } catch (err) {
            console.error('Batch category assignment error:', err);
        }
    };

    const handleAssignDepartmentCategories = async (auditorId: string, departmentId: string, assign: boolean) => {
        const deptCatIds = catList.filter(c => c.departmentId === departmentId).map(c => c.id);
        await handleBatchAssignCategories(auditorId, deptCatIds, assign);
    };

    const handleAssignAllCategories = async (auditorId: string) => {
        if (!auditorId) return;
        const allCatIds = catList.map(cat => cat.id);
        await handleBatchAssignCategories(auditorId, allCatIds, true);
    };

    const handleClearAllCategories = async (auditorId: string) => {
        if (!auditorId) return;
        const allCatIds = catList.map(cat => cat.id);
        await handleBatchAssignCategories(auditorId, allCatIds, false);
    };

    const handleBatchAssignHotels = async (auditorId: string, hotelIds: string[], assign: boolean) => {
        if (!auditorId || hotelIds.length === 0) return;

        const auditorIdStr = String(auditorId).trim().toLowerCase();
        const hotelIdSet = new Set(hotelIds.map(id => String(id).trim()));
        
        // 1. Calculate updated list immediately and persist to local state + localStorage
        const currentList = [...auditorAssignments];
        let updated: any[] = [];

        if (assign) {
            updated = [...currentList];
            hotelIds.forEach(hId => {
                const hIdStr = String(hId).trim();
                if (!updated.some(a => String(a.user_id).trim().toLowerCase() === auditorIdStr && String(a.hotel_id).trim() === hIdStr)) {
                    updated.push({ user_id: auditorId, hotel_id: hId });
                }
            });
        } else {
            updated = currentList.filter(a => !(String(a.user_id).trim().toLowerCase() === auditorIdStr && hotelIdSet.has(String(a.hotel_id).trim())));
        }

        setAuditorAssignments(updated);
        localStorage.setItem('sbi_auditor_assignments', JSON.stringify(updated));

        try {
            if (assign) {
                // Determine missing hotel IDs based on current state before operation
                const existingAssignments = currentList.filter(a => String(a.user_id).trim().toLowerCase() === auditorIdStr);
                const existingHotelIds = new Set(existingAssignments.map(a => String(a.hotel_id).trim()));
                const missingHotelIds = hotelIds.filter(hId => !existingHotelIds.has(String(hId).trim()));

                if (missingHotelIds.length > 0) {
                    const rowsToInsert = missingHotelIds.map(hId => ({ user_id: auditorId, hotel_id: hId }));
                    
                    // Attempt upsert first using user_id,hotel_id composite key
                    let { error: upsertErr } = await supabase
                        .from('auditor_assignments')
                        .upsert(rowsToInsert, { onConflict: 'user_id,hotel_id' });

                    if (upsertErr) {
                        // Delete ONLY this auditor's missing hotel_ids first, then insert
                        await supabase
                            .from('auditor_assignments')
                            .delete()
                            .eq('user_id', auditorId)
                            .in('hotel_id', missingHotelIds);

                        await supabase
                            .from('auditor_assignments')
                            .insert(rowsToInsert);
                    }
                }
            } else {
                const { error: delErr } = await supabase.from('auditor_assignments')
                    .delete()
                    .eq('user_id', auditorId)
                    .in('hotel_id', hotelIds);
                if (delErr) {
                    console.warn('Supabase delete warning:', delErr);
                }
            }

            // Refetch from DB and safely MERGE with updated local state so other users' items are never dropped
            const { data: refetch } = await supabase.from('auditor_assignments').select('*');
            if (refetch && Array.isArray(refetch)) {
                const map = new Map<string, any>();
                refetch.forEach((item: any) => {
                    const key = `${String(item.user_id).trim().toLowerCase()}_${String(item.hotel_id).trim()}`;
                    map.set(key, item);
                });

                // Merge with updated state
                updated.forEach((item: any) => {
                    const key = `${String(item.user_id).trim().toLowerCase()}_${String(item.hotel_id).trim()}`;
                    if (!map.has(key)) {
                        map.set(key, item);
                    }
                });

                // Ensure explicitly unassigned items for THIS auditor are removed from map
                if (!assign) {
                    hotelIds.forEach(hId => {
                        const key = `${auditorIdStr}_${String(hId).trim()}`;
                        map.delete(key);
                    });
                }

                const merged = Array.from(map.values());
                setAuditorAssignments(merged);
                localStorage.setItem('sbi_auditor_assignments', JSON.stringify(merged));
            }
        } catch (err) {
            console.error('Batch hotel assignment error:', err);
        }
    };

    const handleAssignAllHotels = async (auditorId: string, targetHotels?: any[]) => {
        if (!auditorId) return;
        const listToAssign = targetHotels || hotels;
        const allHotelIds = listToAssign.map(h => h.id);
        await handleBatchAssignHotels(auditorId, allHotelIds, true);
    };

    const handleClearAllHotels = async (auditorId: string) => {
        if (!auditorId) return;
        const allHotelIds = hotels.map(h => h.id);
        await handleBatchAssignHotels(auditorId, allHotelIds, false);
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

    const totalMasterHotelsCount = filteredHotels.length;
    const totalMasterHotelPages = Math.max(1, Math.ceil(totalMasterHotelsCount / hotelPageSize));
    const safeMasterHotelPage = Math.min(Math.max(1, hotelPage), totalMasterHotelPages);
    const masterHotelStartIndex = (safeMasterHotelPage - 1) * hotelPageSize;
    const masterHotelEndIndex = Math.min(masterHotelStartIndex + hotelPageSize, totalMasterHotelsCount);
    const paginatedHotels = filteredHotels.slice(masterHotelStartIndex, masterHotelEndIndex);

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
                    {subView !== 'dashboard' && (
                        <button 
                            onClick={() => { setSubView('dashboard'); setSearchQuery(''); }} 
                            className="p-2.5 hover:bg-slate-100 rounded-full text-slate-700 active:scale-95 transition-all outline-none"
                            aria-label="Back"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight ml-3">
                        {subView === 'departments' ? 'Audit Departments' : subView === 'hotels' ? 'Master Hotel List' : subView === 'batches' ? 'Audit Batch' : subView === 'categories' ? 'Audit Category' : subView === 'items' ? 'Audit Items' : subView === 'groups' ? 'Audit Groups' : subView === 'users' ? 'User Management' : subView === 'inspection' ? 'Audit Inspection' : subView === 'progress_report' ? 'Audit Progress Report' : 'Admin Dashboard'}
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
                    <React.Fragment>
                        {/* Stats Row */}
                        {(userProfile?.access_level === 'admin' || userProfile?.access_level === 'auditor') && (
                            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {(() => {
                                    const activeHotels = hotels.filter(h => h.id !== 'sbi-test' && h.id !== 'sbi-dummy');
                                    const hotelsWithoutAuditees = activeHotels.filter(hotel => {
                                        const hasAuditee = profilesList.some(p => {
                                            const isAuditee = p.access_level !== 'admin' && p.access_level !== 'auditor';
                                            if (!isAuditee) return false;

                                            const hotelIdLower = String(hotel.id).toLowerCase();
                                            const hotelCodeLower = hotel.code ? String(hotel.code).toLowerCase() : '';
                                            const hotelNameLower = hotel.name ? String(hotel.name).toLowerCase() : '';

                                            const pIdLower = p.hotel_id ? String(p.hotel_id).toLowerCase() : '';
                                            const pCodeLower = p.hotel_code ? String(p.hotel_code).toLowerCase() : '';
                                            const pNameLower = p.hotel_name ? String(p.hotel_name).toLowerCase() : '';

                                            const pIds = p.hotel_id ? String(p.hotel_id).split(',').map((s: string) => s.trim().toLowerCase()) : [];

                                            const matchesId = pIds.includes(hotelIdLower) || pIdLower === hotelIdLower;
                                            const matchesCode = hotelCodeLower && pCodeLower === hotelCodeLower;
                                            const matchesName = hotelNameLower && pNameLower === hotelNameLower;

                                            return matchesId || matchesCode || matchesName;
                                        });
                                        return !hasAuditee;
                                    }).length;

                                    const hotelsWithoutBrandLeads = activeHotels.filter(hotel => {
                                        const hasBrandLead = profilesList.some(p => {
                                            const isBrandLead = !!p.is_brand_audit_lead;
                                            if (!isBrandLead) return false;

                                            const hotelIdLower = String(hotel.id).toLowerCase();
                                            const hotelCodeLower = hotel.code ? String(hotel.code).toLowerCase() : '';
                                            const hotelNameLower = hotel.name ? String(hotel.name).toLowerCase() : '';

                                            const pIdLower = p.hotel_id ? String(p.hotel_id).toLowerCase() : '';
                                            const pCodeLower = p.hotel_code ? String(p.hotel_code).toLowerCase() : '';
                                            const pNameLower = p.hotel_name ? String(p.hotel_name).toLowerCase() : '';

                                            const pIds = p.hotel_id ? String(p.hotel_id).split(',').map((s: string) => s.trim().toLowerCase()) : [];

                                            const matchesId = pIds.includes(hotelIdLower) || pIdLower === hotelIdLower;
                                            const matchesCode = hotelCodeLower && pCodeLower === hotelCodeLower;
                                            const matchesName = hotelNameLower && pNameLower === hotelNameLower;

                                            return matchesId || matchesCode || matchesName;
                                        });
                                        return !hasBrandLead;
                                    }).length;

                                    return stats.map((stat, i) => {
                                        const Icon = stat.icon;
                                        const isProperties = stat.title === 'Active Properties';
                                        const displayValue = isProperties ? activeHotels.length : (stat.title === 'Total Submissions' && allSubmissions.length > 0 ? allSubmissions.length : stat.value);
                                        return (
                                            <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center justify-between hover:shadow-[0_8px_32px_rgba(15,23,42,0.03)] hover:scale-[1.01] transition-all duration-300">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                                                    <p className="text-3xl font-extrabold text-slate-900 mt-1 font-sans tracking-tight">
                                                        {displayValue}
                                                    </p>
                                                    {isProperties && (
                                                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2.5 text-[11px] font-bold text-slate-500">
                                                            <span 
                                                                onClick={() => {
                                                                    setStatsModalType('auditees');
                                                                    setStatsModalCopied(false);
                                                                }}
                                                                className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 active:scale-98 transition-all" 
                                                                title="Click to view hotels with no registered auditee users"
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block animate-pulse"></span>
                                                                No Auditees: <strong className="text-slate-800 hover:text-indigo-700 underline decoration-dotted decoration-slate-300 hover:decoration-indigo-400 underline-offset-2">{hotelsWithoutAuditees}</strong>
                                                            </span>
                                                            <span className="text-slate-300"></span>
                                                            <span 
                                                                onClick={() => {
                                                                    setStatsModalType('brand_leads');
                                                                    setStatsModalCopied(false);
                                                                }}
                                                                className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 active:scale-98 transition-all" 
                                                                title="Click to view hotels with no Brand Lead assigned"
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
                                                                No Brand Leads: <strong className="text-slate-800 hover:text-indigo-700 underline decoration-dotted decoration-slate-300 hover:decoration-indigo-400 underline-offset-2">{hotelsWithoutBrandLeads}</strong>
                                                            </span>
                                                        </div>
                                                    )}
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
                                    });
                                })()}

                                {/* ENROLLED USERS CARD */}
                                {(() => {
                                    const totalPending = profilesList.filter(p => !p.is_approved).length;
                                    const totalApproved = profilesList.filter(p => p.is_approved).length;
                                    const totalBrandLeads = profilesList.filter(p => p.is_brand_audit_lead).length;
                                    return (
                                        <div className="bg-white p-6 rounded-[24px] border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center justify-between hover:shadow-[0_8px_32px_rgba(15,23,42,0.03)] hover:scale-[1.01] transition-all duration-300">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrolled Users</p>
                                                <p className="text-3xl font-extrabold text-slate-900 mt-1 font-sans tracking-tight">
                                                    {totalApproved} <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded ml-1.5 inline-block align-middle">Onboarded</span>
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2.5 text-[11px] font-bold text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                                                        Pending: <strong className="text-slate-800">{totalPending}</strong>
                                                    </span>
                                                    <span className="text-slate-300"></span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                                        Approved: <strong className="text-slate-800">{totalApproved}</strong>
                                                    </span>
                                                    <span className="text-slate-300"></span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>
                                                        Brand Leads: <strong className="text-slate-800">{totalBrandLeads}</strong>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center shrink-0">
                                                <Users size={24} />
                                            </div>
                                        </div>
                                    );
                                })()}
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
                                <span className="tracking-tight font-bold">Audit Report & Inspection</span>
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                                        
                                        {/* Audit Progress Report */}
                                        <div 
                                            onClick={() => { setSubView('progress_report'); setProgressSearchQuery(''); }}
                                            className="flex items-center justify-between p-5 bg-white hover:bg-slate-50/80 rounded-[20px] border border-slate-150/80 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group shadow-[0_4px_24px_rgba(15,23,42,0.01)] hover:shadow-[0_8px_32px_rgba(15,23,42,0.02)]"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                    <Percent size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Progress Report</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Real-time completion monitoring and analytics</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
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
                        </React.Fragment>
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
                                                 We have automatically saved your onboarding information locally in your browser. To finalize cloud storage sync, please copy the script inside the <strong className="text-slate-800">/supabase-onboarding.sql</strong> file and execute it within your Supabase SQL Editor.
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
                                    if (!isoString) return '';
                                    try {
                                        const d = new Date(isoString);
                                        if (isNaN(d.getTime())) return '';
                                        const day = String(d.getUTCDate()).padStart(2, '0');
                                        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                                        const year = d.getUTCFullYear();
                                        const hours = String(d.getUTCHours()).padStart(2, '0');
                                        const minutes = String(d.getUTCMinutes()).padStart(2, '0');
                                        const seconds = String(d.getUTCSeconds()).padStart(2, '0');
                                        return `${day}-${month}-${year} ${hours}:${minutes}:${seconds} (UTC)`;
                                    } catch {
                                        return '';
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
                                                        const isOnboardingFinished = p.access_level === 'admin' || !!(p.first_name && p.role && (p.hotel_id || p.hotel_name));
                                                        return (
                                                            <tr key={p.id || index} className={`${roleStyles.bg} hover:opacity-95 transition-colors`}>
                                                                <td className="px-6 py-4 text-xs font-semibold text-slate-800 flex items-center gap-2">
                                                                    <span className={roleStyles.text}>{roleStyles.icon}</span>
                                                                    <div>
                                                                        <div className="font-bold flex items-center gap-1.5 flex-wrap">
                                                                            <span>{p.display_name || ''}</span>
                                                                            {!isOnboardingFinished && (
                                                                                <span 
                                                                                    className="inline-flex items-center gap-1 text-[9px] bg-amber-50 text-amber-700 border border-amber-150/60 px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider animate-pulse animate-infinite"
                                                                                    title="User has not completed the onboarding process"
                                                                                >
                                                                                    <RefreshCw size={8} className="animate-spin" /> In Progress
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {(p.first_name || p.last_name) && (
                                                                            <div className="text-[10px] text-slate-400 font-medium">({p.first_name || ''} {p.last_name || ''})</div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-slate-600">{p.email || ''}</td>
                                                                <td className="px-6 py-4 text-xs">
                                                                    {p.hotel_name ? (
                                                                        <div>
                                                                             <span className="font-bold text-slate-800">{p.hotel_name}</span>
                                                                             {p.hotel_code && <span className="ml-1.5 font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">#{p.hotel_code}</span>}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-400 font-medium"></span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-slate-600">
                                                                    <div>{p.role || ''}</div>
                                                                    {p.is_brand_audit_lead && (
                                                                        <span className="mt-1 inline-flex items-center text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">Brand Lead</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs">
                                                                    <select 
                                                                        value={p.access_level || 'auditee'} 
                                                                        disabled={!isOnboardingFinished}
                                                                        onChange={(e) => updateAccessLevel(p.id, e.target.value)}
                                                                        className={`text-xs font-bold rounded-lg px-2 py-1 outline-none shadow-sm border transition-all ${
                                                                            !isOnboardingFinished 
                                                                                ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                                                                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 cursor-pointer'
                                                                        }`}
                                                                        title={!isOnboardingFinished ? "Locked: Onboarding in progress" : ""}
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
                                                                            disabled={!isOnboardingFinished}
                                                                            onChange={(e) => updateApprovalStatus(p.id, e.target.value === 'approved')}
                                                                            className={`text-xs font-bold rounded-lg px-2 py-1 outline-none border transition-all shadow-sm ${
                                                                                !isOnboardingFinished 
                                                                                    ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                                                                                    : p.is_approved 
                                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300 cursor-pointer' 
                                                                                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300 cursor-pointer'
                                                                            }`}
                                                                            title={!isOnboardingFinished ? "Locked: Onboarding in progress" : ""}
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
                                                                        {isOnboardingFinished ? (
                                                                            <button 
                                                                                onClick={() => handleOpenEditUser(p)}
                                                                                className="p-1.5 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg border border-indigo-100/50 transition-all"
                                                                                title="Edit Profile"
                                                                            >
                                                                                <Edit size={13} />
                                                                            </button>
                                                                        ) : (
                                                                            <button 
                                                                                disabled
                                                                                className="p-1.5 text-slate-400 bg-slate-50 rounded-lg border border-slate-200 cursor-not-allowed"
                                                                                title="Editing locked: Onboarding in progress"
                                                                            >
                                                                                <Lock size={13} />
                                                                            </button>
                                                                        )}
                                                                        {userProfile?.email === 'brandaudit@swiss-belhotel.com' && (
                                                                            isOnboardingFinished ? (
                                                                                <button 
                                                                                    onClick={() => setConfirmUserDeleteId(p.id)}
                                                                                    className="p-1.5 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-lg border border-red-100/50 transition-all"
                                                                                    title="Delete Profile"
                                                                                >
                                                                                    <Trash2 size={13} />
                                                                                </button>
                                                                            ) : (
                                                                                <button 
                                                                                    disabled
                                                                                    className="p-1.5 text-slate-300 bg-slate-50 rounded-lg border border-slate-100 cursor-not-allowed animate-pulse"
                                                                                    title="Deleting locked: Onboarding in progress"
                                                                                >
                                                                                    <Trash2 size={13} />
                                                                                </button>
                                                                            )
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
                                            { parent: 'Audit & Reporting', children: ['Audit Report & Inspection', 'Recent Activity'] },
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
                                                    const assignedGroups = groups.filter(g => (g.hotelIds || []).includes(hotel.id));
                                                    const otherGroups = assignedGroups.filter(g => g.id !== selectedGroupId);
                                                    const isAssignedToOther = otherGroups.length > 0;

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
                                                                             : 'bg-white border-slate-300 hover:border-slate-400'
                                                                     }`}>
                                                                         {isAssigned && <Check size={11} className="text-white stroke-[3.5px]" />}
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
                                                                         {otherGroups.length > 0 && (
                                                                             <span className="bg-slate-100 text-slate-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                                                                                 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                                                 Also in: {otherGroups.map(g => g.name).join(', ')}
                                                                             </span>
                                                                         )}
                                                                         {assignedGroups.length === 0 && (
                                                                             <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                                 <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                                                 Unassigned
                                                                             </span>
                                                                         )}
                                                                     </div>
                                                                     <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{hotel.location}  {hotel.brandClass}</p>
                                                                 </div>
                                                             </div>

                                                             {hotel.stars && (
                                                                 <span className="text-[10px] text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 shrink-0">
                                                                     {''.repeat(hotel.stars)}
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
                                                    const filtered = hotels.filter(h => {
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
                                                            const availableCountries = Array.from(new Set(hotels.map(h => h.country || 'Unspecified Country'))).sort();
                                                            return (
                                                                <select
                                                                    value={hotelCountryFilter}
                                                                    onChange={(e) => setHotelCountryFilter(e.target.value)}
                                                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all shrink-0 cursor-pointer"
                                                                >
                                                                    <option value="all">All Countries ({availableCountries.length})</option>
                                                                    {availableCountries.map(c => {
                                                                        const count = hotels.filter(h => (h.country || 'Unspecified Country') === c).length;
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
                                                    const filteredHotels = hotels.filter(hotel => {
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
                                                                                                        <span>{hotel.brandClass}  {hotel.region || 'Region Unspecified'}</span>
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
                                                                                <span>{hotel.brandClass}  {hotel.country || 'Indonesia'}  {hotel.region || 'Region Unspecified'}</span>
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
                                                                                                             Assigned to {totalAssignedCatAuditors} {totalAssignedCatAuditors === 1 ? 'auditor' : 'auditors'}
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
                                                                                             Assigned to {totalAssignedCatAuditors} {totalAssignedCatAuditors === 1 ? 'auditor' : 'auditors'}
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
                                        const inspectionHotelsFiltered = hotels.filter(h => {
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
                                                    const hotelSubs = allSubmissions.filter(s => isSubmissionForHotel(s.hotel_id, h));
                                                    isMatchStatus = hotelSubs.length > 0;
                                                }
                                            } else if (inspectionStatusFilter === 'not_started') {
                                                if (isFin) {
                                                    isMatchStatus = false;
                                                } else {
                                                    const hotelSubs = allSubmissions.filter(s => isSubmissionForHotel(s.hotel_id, h));
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
                                                                const itemCatId = String(item.categoryId || item.category_id || '');
                                                                const matchesGroup = !assignedItemIds || assignedItemIds.length === 0 || assignedItemIds.includes(String(item.id));
                                                                const matchesAuditor = !auditorAssignedCatIds || auditorAssignedCatIds.includes(itemCatId);
                                                                return matchesGroup && matchesAuditor;
                                                            });
                                                            const totalItems = allHotelItems.length;

                                                            // Hotel's actual filled items & progress
                                                            const hotelSubs = allSubmissions.filter(s => isSubmissionForHotel(s.hotel_id, hotel));
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
                                                                        const itemCatId = String(item.categoryId || item.category_id || '').trim();
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
                                    const itemCatId = String(item.categoryId || item.category_id || '');
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
                                    const scoreVal = inspectionScores[`${hotel.id}_${item.id}`];
                                    if (scoreVal === 'N/A') return true;
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
                                    const hasItems = allHotelItems.some(item => String(item.categoryId || item.category_id || '') === catIdStr);
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
                                                                {hotel.location || 'Swiss-Belhotel Property'}  {hotel.brand || 'Luxury Standards'}
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
                                                const catItems = allHotelItems.filter(i => String(i.categoryId || i.category_id || '') === String(cat.id));
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
                                                                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{catItems.length} Inspection Points</p>
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

                                                        {/* INSPECTION CARDS */}
                                                        <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                                            {catItems.map((item) => {
                                                                const scoreKey = `${hotel.id}_${item.id}`;
                                                                const currentScore = inspectionScores[scoreKey];
                                                                const currentComment = inspectionComments[scoreKey] || '';
                                                                const submission = hotelSubmissions[item.id];
                                                                const hasSubmission = !!submission;
                                                                const itemMaxPoints = item.points ?? 5;
                                                                const isPass = currentScore !== undefined && (
                                                                    currentScore === 'PASS' ||
                                                                    (itemMaxPoints > 0 && currentScore === itemMaxPoints) ||
                                                                    (itemMaxPoints === 0 && currentScore === 'PASS')
                                                                );
                                                                const isFail = currentScore !== undefined && (
                                                                    currentScore === 'FAIL' ||
                                                                    (itemMaxPoints > 0 && currentScore === 0)
                                                                );
                                                                const isNA = currentScore !== undefined && currentScore === 'N/A';
                                                                const isSelfAudit = item.filled_by_hotel !== false && item.filled_by_hotel !== 'false';

                                                                const rawAuditor = submission?.submitted_by_name || submission?.submitted_by || '';
                                                                const cleanAuditorName = rawAuditor.replace(/^Auditor:\s*/i, '').trim();
                                                                const auditAuthor = (cleanAuditorName && cleanAuditorName.toLowerCase() !== 'auditor')
                                                                    ? cleanAuditorName
                                                                    : (assignedAuditorName !== 'Unassigned' && assignedAuditorName !== 'All Hotel Auditors' ? assignedAuditorName : (userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email : 'Auditor'));
                                                                const auditTimestamp = safeFormatDateTime(submission?.updated_at || submission?.created_at);

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
                                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                                        <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded-md uppercase tracking-wider">
                                                                                            {item.points ?? 5} Points Max
                                                                                        </span>
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
                                                                                        onSaved={fetchHotelSubmissionsForAuditor}
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
                                                                                                    <span className="text-slate-400 text-[10px]">Submitted by <strong className="text-slate-700 font-bold">{getSubmitterName(submission, hotel)}</strong>  {safeFormatDateTime(submission.created_at)}</span>
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
                                                                                                                                                                                                                 {(isImageInput(item.inputType) || (submission.value && (String(submission.value).startsWith('http') || String(submission.value).startsWith('data:image/') || String(submission.value).includes('imgbb.com')))) && submission.value && (
                                                                                                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                                                                                 {splitEvidenceUrls(String(submission.value)).map((url, urlIdx) => (
                                                                                                                     <div 
                                                                                                                         key={urlIdx}
                                                                                                                         className="group/img relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900/5 flex items-center justify-center aspect-square cursor-zoom-in transition-all hover:border-indigo-300 hover:shadow-sm"
                                                                                                                         onClick={() => setEnlargedImage({ url: url, title: `${item.name}  Photo ${urlIdx + 1}  ${hotel.name}` })}
                                                                                                                     >
                                                                                                                         <img loading="lazy" decoding="async" 
                                                                                                                             src={url} 
                                                                                                                             alt={`Submission Photo ${urlIdx + 1}`} 
                                                                                                                             referrerPolicy={url?.startsWith('blob:') || url?.startsWith('data:') ? undefined : 'no-referrer'} 
                                                                                                                             className="w-full h-full object-cover" 
                                                                                                                         />
                                                                                                                         <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center text-white font-black text-[10px] uppercase tracking-wider text-center p-2 gap-1">
                                                                                                                             <Maximize2 size={14} />
                                                                                                                             <span>Enlarge</span>
                                                                                                                         </div>
                                                                                                                         <div className="absolute bottom-1.5 right-1.5 bg-slate-900/80 backdrop-blur-md text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded opacity-90 group-hover/img:opacity-0 transition-opacity flex items-center gap-1">
                                                                                                                             <Eye size={10} /> Photo {urlIdx + 1}
                                                                                                                         </div>
                                                                                                                     </div>
                                                                                                                 ))}
                                                                                                             </div>
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
                                                                                                {currentScore !== undefined ? (isPass ? 'PASS' : isFail ? 'FAIL' : isNA ? 'N/A' : currentScore) : ''}
                                                                                            </span>
                                                                                            <span className="text-[10px] font-black text-slate-400">({item.points ?? 5} PTS)</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* PASS / FAIL / N/A CONTROLS */}
                                                                                    <div className="space-y-2">
                                                                                        <div className="grid grid-cols-3 gap-2">
                                       xúÏ=ks€∂≤ﬂÛ+POZQç)YJ“4>∂3≤„¥ûÎÿæñ”sœ‰fJÑ,ûP$KR±uU˝˜ª>@R"ï4sÃô8,¿>Å≈ÇêûÉ—‹˜mÎ—&u◊y¸ÖCwxc;[oÕ–óüFæ•:öÁ©èóÜOgC_}ZmΩi€:1çÒÁ√•“&áGdπıÒ1&D1º+Ël˚+µàèß}°gñÁ–±oÿ÷plªTô⁄>5a®wI0ÊªdnÈtbXToˇ„´†∂"‘ÙËﬂo¸ÙVªø≤À˜»Ÿ#ØHÚ›>i]Ü√V˚k’÷[Y5”ƒÿ⁄æ–f¯zb“{6nû:¶ñO]ÚÔπÁìE¯ıVs‘^Á9qjü8˜ÍS‚⁄HÑ∫jﬁíëÌÍP∆ß˜æzÔëâm˘Í»6u‚ªöÂ8É™fö‰qsÙ√9≥—°~EZ£[ïŒ®´ô∫˙ÀﬁÔ–›∆%Ëb‚Wo™ÈˆùÍÕ¬O·è˝ΩΩV£òÌ3Ã8"'œ‘|™æ $º¯hòLÌ/‘›á‚¸’ÛÜPiBÃ5Ç…¡…îé?œ¯? ‹ﬁ≥È6ÖDm@]ÆéÎ£‘§—º°Õ0õ7∂¶πRH7≠‘ø°‚ﬁärÆÿüΩ&˚—å§z–éÑì¯¥£Keö1¸%£Òáçòˇ4§ˇßym¯fpv˛†+>ë6¥¥ÔN^4aÒS±?≠ãÓ†ı†ˇñ⁄b∞]®ÕF†gÚµa¸[FÚü4b˛”êFò‘ıOwl“Êu#0˙ﬂD5tu„ÀÊ ÇÍõ◊áÍÇhÿq|µøS≥G¶6¢¶îÛ˚ﬁûsˇ!ê¶˛ø@„œÄ§ÁéC›±¬‰»¯≥a/(hF¶•g#µW3|s›mó\”ôÊ~Æ∑¸t–e]≠9\8öKµ⁄]sÌ;ÔpŸØœ¡_4s¸6ûª.®É{6ÉˇÍÉ3h™Y∑ Y°ÃJ™Â†ù<≈L;0B∑‘Ô0Ã⁄ıQqÄ Ètuw∫N¥Ä,&îÍ#$N¯l"^ß”©oa
ºpßNÊ†CÂÈ®}P≥YÂö¯ëfòÿ„π∑oœ},/’≤≠ïã”øñn‹⁄†ˆ8€Õ®nÃgbÁ˜ì<XØß5ds)∏a’™≠Yeç‚lŒU	’ó¥VsN„È∆RµÖØPy’V†¯A˜öjcøÛ∆’nëçè±ó¨`Lo>˙√†w‰ê¥◊æu©Á}t©cª~Ã1ÖÅK´#œRUÍ/D≥åRÈD”Af¥Å®®ñ›ü…Ò‡‰ø»ÒªõõÀÚ˘˝t˙Ùö¸‹çªíÜŒÃ`¸£émìx≥}ˆƒ(~Œ5èG‘ø£‘bˆÒ≥ò'@0‰·˜˝g®Á$|‹˝5≤'ÔΩî:;»ù¢¿o&πsWŸ≥Ù®?‰3†¥tÕõélÕ’ã|®pÃ“êjÓx˙ﬂsÍ.îñ¨éƒKMN)≥µí)∑X,∆f/îÒÖÓ{cÕ§ÍÀÁi#)3>MËƒ‰8*q3h‡Éi—œäæ|n9∏@ Át‚áVÈ/R´ÙòY96yxvr•6‰¡¥ü1°˙˜¶ƒ~zâ.Lh5˘∆Ì‘óåhâup¨π†ü]ˇi¶›@è¿PÌùÓÀ;Õ,“ÿY»·9üˆs:Ìd⁄ÁÕ£3#=w®ÿfæ‘,Åd¬`Ã(ôŸjwbOH∞4˝–∏9QôÊ'c{Êò)ã∏ ⁄€ç,oÃ+zæÊœÒΩ•«4K3æ1ˆ:9=téäÑ({ï'ê≤sñ”ø¢’¥îP÷x`ö}fXØ5_S|WjCâÏzé˘ˇ	vMqp?Ùùc¶˙ﬁ,_"ê3m$$”B†2£^”	P‡Ù‰Æ‹}¬õu¥˙»≈Úÿ∂<üÓ‰êº/TÔ[ø£aLNlù∂vIÁ
øù¿†˚Ó?√Î¯!pu„)ùsÊê—1{9Õﬂß:9√¿W7∂ØôÒWV¬Ûê+~ ∂Ç&TKºá¢§=˘ ◊8ÃÓ˜:€=’∆SeZæT GobXg÷ƒÜÅç ÿÊ\«˜ ¥ƒ∫‚P¶–Wú† ∏◊ÄçaU*"cxÒ/oló5•xÜ˜GtS¶e*ASXÅçùÄ3˚^W@ Ñ·? Öà’ò9∞…ˆÍ[:ÔÊ–GyCæÑ~µôÕº5¿´Ü„RÓZ‰á†ç‚“´v«§÷≠?≠“sü—g¢„º2˘Î/“´π˚ " õé·}úÑÙv( ∏}ÚVÛß&»%Ì.oºM~∆2ïÊ…„l"ù'#π$ÌΩˇÙx9≈}áèèó€¯@~Ä±è◊Ÿ◊*÷8Ô™ÿõ ßzö¡∏$Bf?$
ËAËıŒ¯f‡˝á6'$G $ßì¢!%P≠ù/QY*k{%@LæÍê>ÚohB~¥@""∏÷;+ƒ∏U‹Ω¬Q6wúπ7Uä≈3>”ŒÑ3kºµ[°tÑj•“c.‚´W°"®Z<5ªÂ$¸”äÑo¯(‡‘◊ø-¥Ò«÷ÖÕ‘ë*®Ü¡‘sêÌ Â9ùóﬁ„≤aı„ß ¿97UÑ0$¿/,˛°ÄWøq.{_N¿⁄¶Wœ◊ÿOﬁˇcÊ=¯uás¢˛∫€"O8uœ4G°»sî}S0Ã‡€ßù«K˛ÖëPªŒ:Æ)›ùÓ-(˝ùùV{µÛ©›˘∑mXJk∑’?˛ØU‰Yr<©Öº¢øsA_ﬁ]ü)1˙•¿ı˚uu{<G“ªL–Sì≤UƒñVÑ÷Ì¿P|òG0‰®“ö∫t∂Lå◊z’¡XµL[C√Î„°è!©‰.»tãﬁ°ïIïv«∑œÜóµ;XãTŸ€ÌÌµWÇOmG˝Ÿ˙¢£9µÙì©aÍ
bUÜÙÌR•2xóŒ¿ﬁ/_¡˘Ωâÿüå›â‡›ã‰^\£æƒLﬂÿóxÃnπ+qzèìMNÜ»]ﬂ<ó"â-±æıˆÙÊ˙ÏdH.ˇ8Ω˛„ÏÙü‰dp˝zòX·Z*yÁó/ ñufkz°Iô#ÃÿF• Ïçñ72TpÇ˝˘Èß‘k}>õ-“¨%gQBsπVx€$RÃ}ÅJ{Ÿ2Ü2RA!ÀˆERPà·«]fã]~¡`_≥†ïZqd“lÒDy±´%ÓK‰≤∏+	ïöe∏-˚+)√®Ë]l≈£(ˆ"
<åÅˆeq1I∫{Ú$6C·pBF.E¢ÚÎß®7∑æå÷Û%ÂT˝$«©í∑zBN€æs#c\¿Y@%Y-•Õ<˜åDë≈ç‘§ÁóO]±xË9Åªó'œ$@Uh-wÙ≥mÀ˙‹ïCI¢î¿)`$%´åR+ê∑.{¸É["û⁄√ùê¯küò∑¬◊g|D∂†ú-Ïñ<vK˙UwK$
^÷|
wjØO¶¯'ló‘G¬N)I-xÁ4ö
ïÚ¶ ∆>´{©> `>JÇéÁ`]±fæ¥^ÂR∂œW∫Áòì 8£ó
Œ¢1ía…‡åù#ædx≈WƒÍUÿˆÃE°xscÊ´{∏u±XpµiSâPî¸=÷ÿÄYã¡é¢C7ﬂe-
‘˘û8%<!≤äxújS^	aT`vr(ˆΩÒKdÌëxQæQ¶g$bõ§*[ëœ—,Èf[ö)04‰HYä sıc˚†ã@éöÂ¬\ÏS÷
å∆<∞$G2é[›î9Ñ*Ã»ÛæO6÷õdæxÙ#‚MY˜€◊Zwö·3{"Ú˛x‰ãaÉW1Iµó *∞…pjPSœº~oÃn˘ƒ¡öMÚå0”d‹ß’è€Ên»ä[€µŸ¶¬k¡IÁÅtâ%ø7gÁ7ß◊CÚûÆO~''ó7◊óÁ√¬∏6	#VéK#aÿ]öıäË¿7åË8Cy>8û„)˛RN˜4áçpÇéã˝ï°„RËZÏYX–èg¬∑⁄»≥Õ9ùI'æ˙£«lGÌu˚DeÀÕlºÏE >í1ÙÅa9ÛÏ*p¯£lK|ƒc;Ÿx<yLh&ÿ∫8(@Óó
º.ﬁG`\i∑TÈmd…1Oƒfs≈÷ò‚∞´—Ç‡ﬁÈ.¡Ωö]fà∆B∑@D±Mœ¬†Ìl0∂cÇËôÄßÁi°=…v&¢8µç‚¥Û±ñPVA‡Ç}vï'|™ú¡\˚∞‚∫ë¢í∫•$ÉO…Y∏<Fv1R}ZïèÉ©TÑ®√TÑ¥Ì≠TÒpoÒÅ¢úà=ôqkÚ˙˙ÚÍıÂ?/Üïh,œÔ\Õ©â6xr˘T”ø¬ÜÛöcMz‘¢™¨‚⁄ﬁ∞ÖÂmHªDﬂDﬁ%wIü6(ÇRÅôJ§"∂&ä˘<ÓÄÌhbÃ"2[‰?ÀÎ/Æ´-:◊û)∏_>§¡â ßlT±0Ìp«·ÿR≥⁄Ìv«≥]_iÛH,,óÜ"∫üÈ‚p9^EGüVGØ€∂$éˆ†À…\‚9±”
◊Éã◊s˝‹Ø‡8e;ú¬Ü∏16a∆P	ìå÷díQƒ$#`í—vôdx3∏y7lòKxÙˆÿDÑü‚¢yD≥ÏRõ]4”‰#FµWQ0)8—ö∂∞2ø6√˙◊ŒëÂ∏6 Àˆ?z|±0µDY®åëî<G·ØøHÆë%˛ |ÒµH‡<2f£’˛~}è§∏nmQ-Æ[7!+¯0~KØ)ñí˝†0GTêHÍπ¡áﬂ{)Èëà–€‘∫¶–a¬«H~`SÔ©‡U^ﬁ’ıÂo◊ß√!πüüVæ„*ò∆ﬂe…√èX¯›a2*x1˘:à „<&öÈ—,Md^tª$X`˘˘&∑˝Ÿ—[~¶¥e·Pº«B'sÎ⁄ÁˆuO4è≈¡2H˘‰À·‡Bœ[Wq0‚ò˘v
îaçÕπN=ÂœBx∏d$¿ã#ˆ7Ög¯|≠âìE	Ö¿ˇ°2KPÄ)úX"R≈Ò¥Ä‘ˇ!Tˆ-˛õ–!|„RF∞´¨Bí§u¿SÖDõ‘l,ò5M‘[π≈“HÂ°¿D~D öÁ/6.©“4◊U⁄ñ©È"Æ≠ôÉŸ‡à€W8ÜW˜Ù‹÷NÕïüñ+9%'Â”\Z`jcü”A¶d—≤≈‹XS∞ÉTå†D!9îŸk◊oF∞íÛö9™–Héd	*‡ÈËíPR‰Bp†afØì:û˚ÿä∂KFc√Ã¡ÓÏ£Kà4/(∑,∆AÈ„∞Ù(Q∫X &opöAR9Ä1dë?IàC§∞§I-¡'‹æ)CÈ”„•ñTÜ+¬^E*wı©S 0 ï (Ô@DÛ•≤u ÆZu·
Öé•pF’·Ä∞Ò5e≠÷.LqK«5[ï¥	‰W‰%{xﬁoPHl8S5é+I$	÷ÏÉ…ëL^.èò‡§¢ycÃv£ˆ†°úÛ ƒ£u!"@5b `Ø\§Å+	TÉÄs¸vF¸ß]ﬁ¨µ–Eı¬S»cjòä ¨uãÅd€9GπÀòÁ#√Ç!∏ôa)"Ä]°…‹3JLmúÅzèv∞Q%=†O£ìƒ·#%xsi—œŒÛ≈mÌäÌ>…vy”h˝(–cì Ù€'&|û∫N-i–á¨q.qFjQUﬂQ¿5Õ¶õÒfÅ‡“,Å’sßàœ¢ë Y£,c
]	°ÌÌÇ≈áÈ”ÍQj•ã™œJÉ ÜS˚c¸LÉC$	JC©∞∑⁄^FÏRHâª£∑Wò,GäÇÓ7@Q‰Ω™Õ}ªàl|mdRY^=å›	âlõ¶Êx¥,HœüRM/œ÷v‡ª	‰çårÛıÖÎÏ›A‘a6fÂºRƒÇN$tÅãy˜»–úÃJ^t˝i]àÁaÃÕO‹nff8r4SÃ|#ƒ√6ál…baŒÍC÷Z1rÖüBµS*îrK(Ω[Å‘|<˛-‚¨
î®.H!ŒH≥
4∫L)Œ0wÛ£Ä•],Îa≤∞J€:öu∏LÜ˙¡h˜ÇuÓ@a§x0!û◊L={a'c÷@{ <P“dÜ_(∫ˆ‹2vAsπÜñM#&ÌX◊Ø ÆÇíOVˇÙ$F˚Õ’”}7ì∏)Ò´$q ivÛÑNY`Lﬂ≤ 9l+'; ¬Âã#2¿Î•è Bﬂb*)Ò©ûVJ|*¶òü57>j±Qr)aV∫iàS4≠ãS|x¯Î’.F)àÍÙ§,9U√£ÆmhPDIM€˛<w÷≈> WÖæcSI¨÷√d¢¶+ûÇkÛl\qØíÈ¥÷a©øZÙ†%Õä•âä9s∑˙≠©d/∑@1ŒÈ‡q˜˜Àõ”s‹»Ω:Ωæ˘ó4™®y=m∏·mh∫Âû3yYÍ–I[™î"4Ôƒ¶-‹©/…˛	˚¯≈'‰cw¶Ù,UË˘÷=4_ˆ,Éç›WAN∂(√yä€ùÔ–Ì‚€ùòá¢µyN˘∫78‘™BHêàÑI∏∫¬òG›ÖŸ¯Ïf€ª~…w›´\\’å[,]¡¥ß˚—º‚b=^÷SßoëwÌˆç‰÷˘Â…‡Êå%7Á¡√€ê\yK≥“+<0VGf•èØÁ“¸Øπ«;YV∞∫wúº’ú+√
œuÙWŸEÃ“ÉaUü•T¬h~ó≥Aºç≈ﬁ÷‡våøππô:_YŸ€‚Æ¯‡ßö2ºõZ=¶&3üêŸ7«ÙÎ≥Î‡›Î≥õÀk2œ~ª8mö]7§‡•ƒ~¨∫˙íã‰∆iÃÎ¥rßæ ;ÂEÚÅ»jåÙ]xkJHw’lNæ‹7$Ô8WÌ´ÿ6ÈßmdÇ¡ªºÕ∆≠µ](*Ÿ)øä+ä•É◊ÑMíáßÅóëì.
 0§3Õ0±òæôÅS}E0∑·¥V0,v:@¢èQ§ı˘ÖÉΩ‰Ö©”˙ŸÎB“Á˚k2mú6˙õh‘.∑™°£ÜßÁoT¶®»›Ò€3PU`_˛-ïÏ* LË:”Ó’;ò¯_k
Èr≈ïŒTêÕ§Qü‚ñí’¬Õô/Í_ÆiVú≤ã≥cÏ‘7†*ŸÃ]h6wèH¥Ë_øª5-Y|⁄Q÷raÚhçÌ©BsÁ£0€†8ıI-BDL›ÃÉpnÈo3€Úî>Á#õ8o’ ˛5Õ∂ƒ_$ñ›¿
IÏ?`™úö.]˝%≠úÿå)ì›ÚÀøRIM∏µ…Gº5y…ïh}Ó≤@à¨u“–˝«≤ã…˜Zrπ’J§\o˜ÛIx⁄ƒ%∆M‹Ï˘yIÓ›üÓ◊1àD˝©ÓMÿﬂÊ~JV]Ó^‘à+{ñiz∫ƒóLﬂÑ7†’2{ø£≈‘puÊÏbxuz¬ñUá'ó◊gø=òø_◊¸ÕWtAR∏â5√Ì,Ê2$≤I˙≥à'Ñ´È√◊∑&äÃÅóis ≥œ˛`DH4hÏL£EG!áaU˚†˛µ“9:3gÊÙÊöœ2ÜR®7)¶n–˛sÙ&”ï˘ÈƒJõïÔ=äØõçDÖÙEœ⁄©'äºmôe‰¿H∆0∂äGÍ<ÏgΩ∞∑<¯·mŒqVï‘≤ßÜà»IëÍ/sÆy˙%ˇö'Û∂¸ö'È≈∞§xÖy3qªπ$	&~s© ∂»◊∂ÆŸmŒïÇ+LèQ\≥j§±PcçÌäTªíüæâ 1†ÖQÌE	Ÿ±íı≤∞ƒ ÉﬂŒ.x|∆õÀÀ¬tUôÉTœ¬ (?yê§.	Ê^R_~C˝ô≥%{∂?¶∂a÷âçg¶Î—5^rÏ \Gª•˚UÃ—≤¥^·ìJÔûe*óhk¶¯
üT˙lKπòc‚˜tVºä§Ωn>|*Ï§`Óßˆ÷*‰ˇ «eπøämÖ#,âîXÀﬁﬁÍ®∑WûIKRΩˇ|u‘æqıÁ–˙ÛÕ[FÏ+àÛx…K»Ö˚ΩWó9ÃUm©ÙEÛ)2fa«¸‹°vØÙvâ√ŸVX◊±~∏Lú˘=<$Ωı»ûY"Y\∆©¿!F˚∂£a4∏Ò;@“≥] ~-˚éÍ$√\9>Ë,∞ŒÒ®cú…ºƒ8®fdñ"≥ÆTT0ﬁŸTäÛ*xWÏ‹vôØ†8ß_√Rbëêü‘%‰™˝≈Á?ä¢ˆn$ΩùkÑr∏QiÕMsıË†;”@%¸·èVè˝?   ˇˇ µ 