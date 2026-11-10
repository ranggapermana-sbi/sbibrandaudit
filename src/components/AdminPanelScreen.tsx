import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, CheckCircle, Clock, Building, BarChart3, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, ArrowUpDown, Plus, Trash2, Edit, Search, X, AlertCircle, MapPin, Settings2, Calendar, Star, Briefcase, ClipboardList, FileCheck, Layers, Package, Camera, ImageIcon, FileText, Hash, Type, CheckSquare, Users, ShieldCheck, Percent, GripVertical, ChevronUp, ChevronDown, Eye, User, RefreshCw, CheckCircle2, Maximize2, ExternalLink, ZoomIn, Database, Copy, Check, Lock, Unlock, Upload, UploadCloud, Loader2, Sparkles, FolderCheck, ClipboardCheck } from 'lucide-react';
import { supabase, HOTELS_URL, HOTELS_KEY } from '../lib/supabase';
import { apiCache } from '../lib/cache';
import { withoutExcludedHotels } from '../lib/hotelExclusion';
import { buildCertificateInput, downloadHotelCertificate, CERTIFICATE_WEIGHTS } from '../lib/certificate';
import { BONUS_RULES, bonusRuleForCategory, bonusCategoryAppliesTo } from '../lib/bonusRules';
import { createSubmissionSync } from '../lib/submissionSync';
import { fetchMasterHotels } from '../lib/hotelsService';
import { AUDIT_PASS_THRESHOLD, computeAuditResults } from '../lib/auditResults';
import { AuditResultsView } from './admin/AuditResultsView';
import { ProgressReportView } from './admin/ProgressReportView';
import { InspectionV2View } from './admin/InspectionV2View';
import { HotelsView } from './admin/HotelsView';
import { AccessView } from './admin/AccessView';
import { DashboardView } from './admin/DashboardView';
import { ItemsView } from './admin/ItemsView';
import { GroupsView } from './admin/GroupsView';
import { CategoriesView } from './admin/CategoriesView';
import { BatchesView } from './admin/BatchesView';
import { DepartmentsView } from './admin/DepartmentsView';
import { UsersView } from './admin/UsersView';
import { AuditorAssignmentView } from './admin/AuditorAssignmentView';
import { InspectionView } from './admin/InspectionView';

import { Department, Hotel, AuditBatch, AuditCategory, AuditItem, AuditGroup } from '../types';
import { DEFAULT_DEPARTMENTS, DEFAULT_CATEGORIES, DEFAULT_HOTELS, DEFAULT_BATCHES, DEFAULT_GROUPS, DEFAULT_OFFLINE_ITEMS, HARDCODED_TEST_HOTELS } from '../lib/constants';
import AuditorEvidenceForm from './AuditorEvidenceForm';
import { AuditInspectionV2 } from './audit-v2/AuditInspectionV2';
import { EvidenceMediaViewer } from './common/EvidenceMediaViewer';
import { parseEvidenceUrls, formatDirectImageUrl, sanitizeImageDataUrl } from '../lib/evidenceUtils';

const isImageInput = (type: string) => {
    const t = (type || '').toLowerCase().trim();
    return ['camera', 'image', 'photo', 'picture', 'img', 'gallery', 'upload', 'file', 'single_image', 'multi_image', 'media'].includes(t);
};

const EvidencePhotoThumbnail: React.FC<{
    url: string;
    photoIndex: number;
    itemName?: string;
    hotelName?: string;
    onEnlarge: (url: string, title: string) => void;
}> = ({ url, photoIndex, itemName = '', hotelName = '', onEnlarge }) => {
    const [hasError, setHasError] = useState(false);
    const directUrl = formatDirectImageUrl(url);
    const isHttp = directUrl.startsWith('http://') || directUrl.startsWith('https://');

    if (hasError) {
        if (isHttp) {
            return (
                <a
                    href={directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/img relative rounded-xl border border-indigo-200 overflow-hidden bg-indigo-50/50 p-3 flex flex-col items-center justify-center aspect-square text-center transition-all hover:bg-indigo-100/60 hover:shadow-sm"
                    title="Click to open evidence link in new tab"
                >
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-1.5 group-hover/img:scale-110 transition-transform shadow-xs">
                        <ExternalLink size={17} />
                    </div>
                    <span className="text-[10px] font-black text-indigo-900 line-clamp-1">Photo {photoIndex}</span>
                    <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-tight mt-0.5 flex items-center gap-1">
                        Open Link <ExternalLink size={10} />
                    </span>
                </a>
            );
        }

        return (
            <div className="relative rounded-xl border border-amber-200 bg-amber-50/60 p-3 flex flex-col items-center justify-center aspect-square text-center">
                <AlertCircle size={20} className="text-amber-600 mb-1" />
                <span className="text-[10px] font-black text-amber-900">Photo {photoIndex}</span>
                <span className="text-[9px] font-medium text-amber-700 mt-0.5">Image Unavailable</span>
            </div>
        );
    }

    return (
        <div 
            className="group/img relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900/5 flex items-center justify-center aspect-square cursor-zoom-in transition-all hover:border-indigo-300 hover:shadow-sm"
            onClick={() => onEnlarge(directUrl, `${itemName} — Photo ${photoIndex} — ${hotelName}`)}
        >
            <img 
                loading="lazy" 
                decoding="async" 
                src={directUrl} 
                alt={`Submission Photo ${photoIndex}`} 
                onError={() => setHasError(true)}
                referrerPolicy={directUrl?.startsWith('blob:') || directUrl?.startsWith('data:') ? undefined : 'no-referrer'} 
                className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center text-white font-black text-[10px] uppercase tracking-wider text-center p-2 gap-1">
                <Maximize2 size={14} />
                <span>Enlarge</span>
            </div>
            <div className="absolute bottom-1.5 right-1.5 bg-slate-900/80 backdrop-blur-md text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded opacity-90 group-hover/img:opacity-0 transition-opacity flex items-center gap-1">
                <Eye size={10} /> Photo {photoIndex}
            </div>
        </div>
    );
};

const splitEvidenceUrls = (value: any): string[] => {
    return parseEvidenceUrls(value);
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
    const [subView, setSubView] = useState<'dashboard' | 'departments' | 'hotels' | 'batches' | 'categories' | 'items' | 'groups' | 'users' | 'access' | 'inspection' | 'inspection_v2' | 'auditor_assignment' | 'progress_report' | 'audit_results'>('dashboard');
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
    const [savingInspectionItemId, setSavingInspectionItemId] = useState<string | null>(null);
    const [recentlySavedItemId, setRecentlySavedItemId] = useState<string | null>(null);

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

    // V2 Protection States (Released - PIN disabled)
    const [isV2Unlocked, setIsV2Unlocked] = useState<boolean>(true);
    const [isV2PinModalOpen, setIsV2PinModalOpen] = useState(false);
    const [v2PinValue, setV2PinValue] = useState('');
    const [v2PinError, setV2PinError] = useState('');

    const handleVerifyV2Pin = () => {
        if (v2PinValue === '230987') {
            setIsV2Unlocked(true);
            try { sessionStorage.setItem('v2_unlocked', 'true'); } catch {}
            setIsV2PinModalOpen(false);
            setV2PinValue('');
            setV2PinError('');
            setSubView('inspection_v2');
        } else {
            setV2PinError('Incorrect Super Admin PIN (230987). Access Denied.');
            setV2PinValue('');
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setEnlargedImage(null);
                setShowSqlModal(false);
                setIsResetPinModalOpen(false);
                setIsV2PinModalOpen(false);
                setStatsModalType(null);
                setResetPinValue('');
                setResetPinError('');
                setV2PinValue('');
                setV2PinError('');
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
            } else if (isV2PinModalOpen) {
                if (e.key >= '0' && e.key <= '9') {
                    setV2PinValue(prev => {
                        const next = prev.length < 6 ? prev + e.key : prev;
                        if (next === '230987') {
                            setTimeout(() => {
                                setIsV2Unlocked(true);
                                try { sessionStorage.setItem('v2_unlocked', 'true'); } catch {}
                                setIsV2PinModalOpen(false);
                                setV2PinValue('');
                                setV2PinError('');
                                setSubView('inspection_v2');
                            }, 50);
                        }
                        return next;
                    });
                    setV2PinError('');
                } else if (e.key === 'Backspace') {
                    setV2PinValue(prev => prev.slice(0, -1));
                    setV2PinError('');
                } else if (e.key === 'Enter') {
                    handleVerifyV2Pin();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isResetPinModalOpen, resetPinValue, hotelToReset, isV2PinModalOpen, v2PinValue]);

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
            // Reload from the database so the report shows what was actually deleted, not the local guess
            fetchProgressSubmissions(true);
            fetchAllSubmissions(true);
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
                'Audit Results': 'audit_results',
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
                                                    <span style="font-size: 28px; line-height: 1;">🛡️</span>
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

    // Full rows for the inspection screen, which needs the evidence values. Later syncs download only changed rows.
    const allSubmissionsSync = useMemo(() => createSubmissionSync({
        columns: '*',
        fullReloadMs: 10 * 60 * 1000,
        overlapMs: 60 * 1000
    }), []);

    const fetchAllSubmissions = useCallback(async (forceFull = false) => {
        try {
            setAllSubmissions(await allSubmissionsSync.sync(forceFull));
        } catch (e) {
            // Keep the previous complete data rather than replacing it with a partial load
            console.error("Error fetching all submissions:", e);
        }
    }, [allSubmissionsSync]);

    // Progress report and audit results input. Only the columns they read: full rows carry embedded images in `value`.
    const [progressSubmissions, setProgressSubmissions] = useState<any[]>([]);
    const [progressDataLoaded, setProgressDataLoaded] = useState(false);
    const [progressDataLoading, setProgressDataLoading] = useState(false);
    const [progressDataError, setProgressDataError] = useState<string | null>(null);
    const progressSync = useMemo(() => createSubmissionSync({
        columns: 'hotel_id,item_id,score,is_na,updated_at',
        fullReloadMs: 10 * 60 * 1000,
        overlapMs: 60 * 1000
    }), []);

    const fetchProgressSubmissions = useCallback(async (forceFull = false) => {
        setProgressDataLoading(true);
        try {
            setProgressSubmissions(await progressSync.sync(forceFull));
            setProgressDataError(null);
            setProgressDataLoaded(true);
        } catch (e: any) {
            console.error("Error fetching progress submissions:", e);
            const message = e?.message || 'request failed';
            setProgressDataError(message);
            setSupabaseErrorMsg(`Audit progress data not loaded: ${message}. Showing last loaded values.`);
        } finally {
            setProgressDataLoading(false);
        }
    }, [progressSync]);

    useEffect(() => {
        if (subView !== 'inspection' && subView !== 'progress_report' && subView !== 'audit_results') return;

        // The progress report only needs the light progress columns; inspection still needs full rows
        const refreshSubmissions = subView === 'inspection' ? fetchAllSubmissions : fetchProgressSubmissions;
        refreshSubmissions();

        const channel = supabase
            .channel('all-submissions-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'audit_submissions'
            }, (payload: any) => {
                // Deleted rows can only be removed by a full reload; inserts and updates sync incrementally
                if (payload?.eventType === 'DELETE') {
                    // Deleted rows only disappear on a full reload
                    if (subView === 'inspection') {
                        fetchAllSubmissions(true);
                    } else {
                        fetchProgressSubmissions(true);
                    }
                } else {
                    refreshSubmissions();
                }
            })
            .subscribe();

        // Background fallback polling interval set to 120 seconds (real-time channels handle instant sync).
        // Skipped while the tab is hidden, so a background tab does not download data.
        const interval = setInterval(() => {
            if (!document.hidden) {
                refreshSubmissions();
            }
        }, 120000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [subView, fetchAllSubmissions, fetchProgressSubmissions]);

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
                const { data: groupHotels, error: groupHotelsError } = await supabase
                    .from('audit_group_hotels')
                    .select('*');
                if (groupHotelsError) {
                    throw groupHotelsError;
                }

                return (groupsData || []).map((g: any) => {
                    const joinHotelIds = (groupHotels || [])
                        .filter((gh: any) => String(gh.group_id).trim() === String(g.id).trim())
                        .map((gh: any) => String(gh.hotel_id).trim());
                    const directHotelIds = (g.hotel_ids || g.hotelIds || (g.hotel_id ? [g.hotel_id] : [])).map((id: any) => String(id).trim());
                    const hotelIds = Array.from(new Set([...joinHotelIds, ...directHotelIds]));

                    return {
                        id: String(g.id),
                        name: g.name,
                        description: g.description || '',
                        hotelIds,
                        categoryIds: (g.category_ids || g.categoryIds || []).map((id: any) => String(id)),
                        itemIds: (g.item_ids || g.itemIds || []).map((id: any) => String(id))
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

    const [finalizedStatuses, setFinalizedStatuses] = useState<Record<string, { is_finalized: boolean, is_locked?: boolean, finalized_by?: string, finalized_at?: string }>>({});

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
                        is_locked: row.is_locked === true,
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

    // Audit lock: while locked, the hotel's Self-Audit Continue button is disabled and no new evidence can be uploaded
    const handleSetAuditLock = async (hotel: Hotel, lock: boolean) => {
        try {
            const { error } = await supabase
                .from('hotel_audit_status')
                .upsert({
                    hotel_id: hotel.id,
                    is_locked: lock,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'hotel_id' });

            if (error) {
                throw error;
            }

            await fetchFinalizedStatuses();
            setToastMessage(lock ? 'Audit locked. The hotel can no longer upload evidence.' : 'Audit unlocked. The hotel can upload evidence again.');
        } catch (err) {
            console.error("Error updating audit lock:", err);
            setToastMessage('Could not update the audit lock. Run the is_locked SQL shown in the database setup.');
        }
        setTimeout(() => setToastMessage(null), 4000);
    };

    // Locks or unlocks the audit for every auditable hotel (test and corporate entries are skipped)
    const handleSetAuditLockForAll = async (lock: boolean) => {
        const targetIds = Array.from(new Set(
            hotels
                .filter(h => h.id && h.id !== 'sbi-test' && h.id !== 'sbi-dummy' && h.brandClass !== 'Corporate')
                .map(h => h.id)
        ));
        if (targetIds.length === 0) return;

        const confirmed = window.confirm(
            lock
                ? `Lock the self-audit for all ${targetIds.length} hotels? No hotel will be able to continue or upload evidence.`
                : `Unlock the self-audit for all ${targetIds.length} hotels?`
        );
        if (!confirmed) return;

        try {
            const now = new Date().toISOString();
            const { error } = await supabase
                .from('hotel_audit_status')
                .upsert(targetIds.map(hotelId => ({
                    hotel_id: hotelId,
                    is_locked: lock,
                    updated_at: now
                })), { onConflict: 'hotel_id' });

            if (error) {
                throw error;
            }

            await fetchFinalizedStatuses();
            setToastMessage(lock ? `Audit locked for all ${targetIds.length} hotels.` : `Audit unlocked for all ${targetIds.length} hotels.`);
        } catch (err) {
            console.error("Error updating audit lock for all hotels:", err);
            setToastMessage('Could not update the audit lock. Run the is_locked SQL shown in the database setup.');
        }
        setTimeout(() => setToastMessage(null), 4000);
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

    // Hotels used for auditor assignment, calculations and reports (1-star hotels are excluded).
    // The master hotel list keeps every hotel so an admin can still change a rating.
    const includedHotels = useMemo(() => withoutExcludedHotels(hotels), [hotels]);

    // True once the hotel list has been loaded from the database in this session.
    // Until then, the saved list must not be overwritten by the in-memory state.
    const hotelsSyncedRef = useRef(false);

    // Fetch hotels function
    const fetchHotelsFromSupabase = async (forceRefresh = false) => {
        setIsSupabaseLoading(true);
        setSupabaseErrorMsg(null);
        try {
            const finalHotels = await apiCache.getOrFetch<Hotel[]>('hotels_master', async () => {
                // Shared master hotel list (same mapping for every screen)
                const mapped: Hotel[] = await fetchMasterHotels(forceRefresh);

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

                const filteredMapped = mapped.filter(h => h.id !== 'sbi-test' && h.id !== 'sbi-dummy');
                return [...filteredMapped, ...HARDCODED_TEST_HOTELS];
            }, { forceRefresh });

            hotelsSyncedRef.current = true;
            setHotels(finalHotels);
            localStorage.setItem('sbi_audit_hotels_v2', JSON.stringify(finalHotels));
            setSupabaseConnected(true);
            setSupabaseErrorMsg(null);
        } catch (err: any) {
            console.warn("Supabase fetch error, using fallback:", err);
            setSupabaseConnected(false);
            setSupabaseErrorMsg(`Hotel list not loaded from database: ${err?.message || 'request failed'}. Showing last saved list.`);
            
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
        // Never persist before a successful database load, so a failed fetch cannot replace the saved list
        if (!hotelsSyncedRef.current) return;
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
        if (subView === 'progress_report' || subView === 'audit_results') {
            // Force refresh: the report must not use cached reference data (hotels, groups, items, categories)
            fetchHotelsFromSupabase(true);
            fetchDepartmentsFromSupabase();
            fetchCategoriesFromSupabase(true);
            fetchItemsFromSupabase(true);
            fetchGroupsFromSupabase(true);
        } else if (subView === 'hotels') {
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
        const availableHotels = includedHotels.filter(h => !assignedHotelIds.includes(h.id));
        const filteredAvailable = availableHotels.filter(h => 
            h.name.toLowerCase().includes(availableSearchQuery.toLowerCase()) ||
            (h.brandClass && h.brandClass.toLowerCase().includes(availableSearchQuery.toLowerCase()))
        );
        const remainingAvailableIds = filteredAvailable.map(h => h.id);
        setAssignedHotelIds(prev => [...new Set([...prev, ...remainingAvailableIds])]);
        setSelectedAvailableIds([]);
    };

    const moveAllToAvailable = () => {
        const assignedHotels = includedHotels.filter(h => assignedHotelIds.includes(h.id));
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
    const [inspectionScores, setInspectionScores] = useState<Record<string, number | string>>({});
    const [inspectionComments, setInspectionComments] = useState<Record<string, string>>({});

    const previousInspectionHotelIdRef = useRef<string>('');
    const commentDebounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
    const hotelSubmissionsRef = useRef<Record<string, any>>(hotelSubmissions);
    hotelSubmissionsRef.current = hotelSubmissions;

    // Pre-calculate lowercased associated IDs for each hotel for O(1) lookups
    const hotelAssociatedIdsMap = useMemo(() => {
        const map = new Map<string, Set<string>>();
        (hotels || []).forEach(hotel => {
            const ids = new Set<string>();
            if (hotel.id) ids.add(String(hotel.id).trim().toLowerCase());
            if (hotel.code) ids.add(String(hotel.code).trim().toLowerCase());
            if (hotel.name) ids.add(String(hotel.name).trim().toLowerCase());

            (profilesList || []).forEach(p => {
                const matchesCode = p.hotel_code && hotel.code && String(p.hotel_code).trim().toLowerCase() === String(hotel.code).trim().toLowerCase();
                const matchesName = p.hotel_name && hotel.name && String(p.hotel_name).trim().toLowerCase() === String(hotel.name).trim().toLowerCase();
                const matchesId = p.hotel_id && hotel.id && String(p.hotel_id).trim().toLowerCase() === String(hotel.id).trim().toLowerCase();
                if (matchesCode || matchesName || matchesId) {
                    if (p.hotel_id) ids.add(String(p.hotel_id).trim().toLowerCase());
                    if (p.hotel_code) ids.add(String(p.hotel_code).trim().toLowerCase());
                    if (p.hotel_name) ids.add(String(p.hotel_name).trim().toLowerCase());
                    if (p.id) ids.add(String(p.id).trim().toLowerCase());
                }
            });
            map.set(String(hotel.id), ids);
        });
        return map;
    }, [hotels, profilesList]);

    // Audit results: per hotel, points earned against maximum points for each category.
    // Only scored, non-N/A items count. A hotel passes when its overall percentage reaches AUDIT_PASS_THRESHOLD.
    const [auditResultsSearch, setAuditResultsSearch] = useState('');
    const [selectedAuditResultId, setSelectedAuditResultId] = useState<string | null>(null);
    // Department groups in the hotel breakdown: keyed by hotel and department. false means expanded; missing means collapsed (the default)
    const [collapsedAuditDepartments, setCollapsedAuditDepartments] = useState<Record<string, boolean>>({});

    const auditResults = useMemo(() => computeAuditResults({
        hotels: includedHotels,
        items,
        categories: catList,
        departments,
        submissions: progressSubmissions,
        idsForHotel: hotel => Array.from(hotelAssociatedIdsMap.get(String(hotel.id)) ?? [])
    }), [includedHotels, items, catList, departments, progressSubmissions, hotelAssociatedIdsMap]);

    // Builds and downloads the Brand Excellence certificate for one hotel's audit result
    const handleDownloadCertificate = async (result: {
        name: string;
        code: string;
        status: 'passed' | 'failed' | 'not_audited';
        percentage: number | null;
        basePercentage: number | null;
        bonusRows: { label: string; passed: number; rate: number; points: number }[];
        bonusTotal: number;
        categories: { departmentId: string; earned: number; max: number; isBonus: boolean }[];
    }) => {
        try {
            const input = buildCertificateInput(
                { name: result.name, code: result.code },
                {
                    status: result.status,
                    percentage: result.percentage,
                    basePercentage: result.basePercentage,
                    bonusRows: result.bonusRows,
                    bonusTotal: result.bonusTotal
                },
                result.categories,
                departments
            );
            await downloadHotelCertificate(input);
        } catch (err) {
            console.error("Error creating certificate:", err);
            setToastMessage('Could not create the certificate. Please try again.');
            setTimeout(() => setToastMessage(null), 4000);
        }
    };

    // Pre-index allSubmissions by hotel_id for O(1) submission retrieval per hotel
    const submissionsByHotelMap = useMemo(() => {
        const map = new Map<string, any[]>();
        (allSubmissions || []).forEach((sub: any) => {
            if (!sub || sub.hotel_id === undefined || sub.hotel_id === null) return;
            const subIdLower = String(sub.hotel_id).trim().toLowerCase();
            let list = map.get(subIdLower);
            if (!list) {
                list = [];
                map.set(subIdLower, list);
            }
            list.push(sub);
        });
        return map;
    }, [allSubmissions]);

    // Fast O(1) submission fetcher for a given hotel
    const getSubmissionsForHotel = useCallback((hotel: Hotel): any[] => {
        if (!hotel) return [];
        const idsSet = hotelAssociatedIdsMap.get(String(hotel.id));
        const results: any[] = [];
        const seenSubmissionIds = new Set<string>();

        if (idsSet) {
            idsSet.forEach(id => {
                const subs = submissionsByHotelMap.get(id);
                if (subs) {
                    subs.forEach(s => {
                        const sId = s.id || `${s.hotel_id}_${s.item_id}`;
                        if (!seenSubmissionIds.has(sId)) {
                            seenSubmissionIds.add(sId);
                            results.push(s);
                        }
                    });
                }
            });
        } else {
            const hId = String(hotel.id || '').trim().toLowerCase();
            const subs = submissionsByHotelMap.get(hId);
            if (subs) return subs;
        }
        return results;
    }, [hotelAssociatedIdsMap, submissionsByHotelMap]);

    const isSubmissionForHotel = useCallback((submissionHotelId: string, hotel: Hotel) => {
        if (!submissionHotelId || !hotel) return false;
        const subIdLower = String(submissionHotelId).trim().toLowerCase();
        const idsSet = hotelAssociatedIdsMap.get(String(hotel.id));
        if (idsSet && idsSet.has(subIdLower)) return true;
        if (hotel.id && subIdLower === String(hotel.id).trim().toLowerCase()) return true;
        if (hotel.code && subIdLower === String(hotel.code).trim().toLowerCase()) return true;
        if (hotel.name && subIdLower === String(hotel.name).trim().toLowerCase()) return true;
        if (hotel.name && subIdLower.length > 3 && (subIdLower.includes(String(hotel.name).trim().toLowerCase()) || String(hotel.name).trim().toLowerCase().includes(subIdLower))) return true;
        if (hotel.code && hotel.code.length >= 2 && (subIdLower.includes(String(hotel.code).trim().toLowerCase()) || String(hotel.code).trim().toLowerCase().includes(subIdLower))) return true;
        return false;
    }, [hotelAssociatedIdsMap]);

    const getHotelFinalizedInfo = useCallback((hotelIdOrHotel: any): { is_finalized: boolean, is_locked?: boolean, finalized_by?: string, finalized_at?: string } => {
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

        const idsSet = currentHotel ? hotelAssociatedIdsMap.get(String(currentHotel.id)) : null;
        const possibleIds = idsSet ? Array.from(idsSet) : (typeof hotelIdOrHotel === 'string' ? [hotelIdOrHotel.trim().toLowerCase()] : []);

        for (const pid of possibleIds) {
            if (finalizedStatuses[pid]?.is_finalized) {
                return finalizedStatuses[pid];
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
    }, [hotels, hotelAssociatedIdsMap, finalizedStatuses]);

    const isHotelAuditLocked = useCallback((hotel: Hotel): boolean => {
        const idsSet = hotelAssociatedIdsMap.get(String(hotel.id));
        const possibleIds = idsSet ? Array.from(idsSet) : [String(hotel.id).trim().toLowerCase()];
        return possibleIds.some(pid => finalizedStatuses[pid]?.is_locked === true);
    }, [hotelAssociatedIdsMap, finalizedStatuses]);

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

    const getAssociatedHotelIds = (hotelObj: any, selectedId?: string): string[] => {
        const ids = new Set<string>();
        const targetHotel = hotelObj || (selectedId ? hotels.find(h => h.id === selectedId || isSubmissionForHotel(selectedId, h)) : undefined);
        const h = targetHotel || (selectedId ? { id: selectedId, code: selectedId, name: selectedId } as Hotel : undefined);

        if (h) {
            if (h.id) {
                const s = String(h.id).trim();
                ids.add(s); ids.add(s.toLowerCase()); ids.add(s.toUpperCase());
            }
            if (h.code) {
                const s = String(h.code).trim();
                ids.add(s); ids.add(s.toLowerCase()); ids.add(s.toUpperCase());
            }
            if (h.name) {
                ids.add(String(h.name).trim());
            }
        }
        if (selectedId) {
            const s = String(selectedId).trim();
            ids.add(s); ids.add(s.toLowerCase()); ids.add(s.toUpperCase());
        }

        (profilesList || []).forEach(p => {
            const matchesCode = p.hotel_code && h?.code && String(p.hotel_code).trim().toLowerCase() === String(h.code).trim().toLowerCase();
            const matchesName = p.hotel_name && h?.name && String(p.hotel_name).trim().toLowerCase() === String(h.name).trim().toLowerCase();
            const matchesId = p.hotel_id && h?.id && String(p.hotel_id).trim().toLowerCase() === String(h.id).trim().toLowerCase();
            if (matchesCode || matchesName || matchesId) {
                if (p.hotel_id) {
                    const s = String(p.hotel_id).trim();
                    ids.add(s); ids.add(s.toLowerCase()); ids.add(s.toUpperCase());
                }
                if (p.hotel_code) {
                    const s = String(p.hotel_code).trim();
                    ids.add(s); ids.add(s.toLowerCase()); ids.add(s.toUpperCase());
                }
                if (p.hotel_name) ids.add(String(p.hotel_name).trim());
                if (p.id) ids.add(String(p.id).trim());
            }
        });

        return Array.from(ids).filter(id => id && id.length > 0);
    };

    const fetchHotelSubmissionsForAuditor = async (isInitialLoad = false) => {
        if (!selectedInspectionHotelId) {
            setHotelSubmissions({});
            return;
        }
        try {
            const hotel = hotels.find(h => h.id === selectedInspectionHotelId) || hotels.find(h => isSubmissionForHotel(selectedInspectionHotelId, h));
            const currentHotel = hotel || (selectedInspectionHotelId ? { id: selectedInspectionHotelId, code: selectedInspectionHotelId, name: selectedInspectionHotelId } as Hotel : undefined);

            const idList = getAssociatedHotelIds(currentHotel, selectedInspectionHotelId);
            let subsData: any[] | null = null;

            const LIGHTWEIGHT_COLUMNS = 'id, hotel_id, item_id, input_type, value, is_na, na_reason, score, auditor_notes, auditor_remarks, notes, submitted_by, submitted_by_name, updated_at, created_at';

            if (idList.length > 0) {
                const { data, error } = await supabase
                    .from('audit_submissions')
                    .select(LIGHTWEIGHT_COLUMNS)
                    .in('hotel_id', idList)
                    .order('updated_at', { ascending: true });
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
                        .select(LIGHTWEIGHT_COLUMNS)
                        .eq('hotel_id', tid);
                    if (!error && data && data.length > 0) {
                        subsData = data;
                        break;
                    }
                }
            }

            // Fallback 2: Select all submissions lightweight and filter using isSubmissionForHotel
            if (!subsData || subsData.length === 0) {
                const { data, error } = await supabase
                    .from('audit_submissions')
                    .select(LIGHTWEIGHT_COLUMNS);
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
                    subsData = getSubmissionsForHotel(currentHotel);
                }
            }

            const submissionsMap: Record<string, any> = {};
            const dbScores: Record<string, any> = {};
            const dbComments: Record<string, string> = {};

            (subsData || []).forEach(sub => {
                if (sub && sub.item_id !== undefined && sub.item_id !== null) {
                    const itemIdStr = String(sub.item_id);
                    const hIdStr = String(sub.hotel_id || '');
                    
                    // CRITICAL: Only consider existing state if it actually belongs to the CURRENT hotel
                    const existingInState = hotelSubmissionsRef.current[itemIdStr];
                    const stateBelongsToThisHotel = existingInState && existingInState.hotel_id && (
                        (currentHotel && isSubmissionForHotel(existingInState.hotel_id, currentHotel)) ||
                        idList.some(id => String(id).trim().toLowerCase() === String(existingInState.hotel_id).trim().toLowerCase())
                    );
                    const existing = stateBelongsToThisHotel ? existingInState : (submissionsMap[itemIdStr] || {});

                    // Merge data while preserving full load state and evidence value if available
                    const hasNewValue = sub.value && String(sub.value).trim() !== '' && String(sub.value) !== 'null';
                    const mergedValue = hasNewValue ? sub.value : (stateBelongsToThisHotel ? existing.value : undefined);
                    const mergedFullyLoaded = (stateBelongsToThisHotel && existing._isFullyLoaded) || sub._isFullyLoaded || false;
                    submissionsMap[itemIdStr] = { 
                        ...existing, 
                        ...sub, 
                        value: mergedValue, 
                        _isFullyLoaded: mergedFullyLoaded 
                    };

                    if (sub.is_na === true || String(sub.is_na) === 'true') {
                        dbScores[`${hIdStr}_${itemIdStr}`] = 'N/A';
                        if (currentHotel) {
                            dbScores[`${currentHotel.id}_${itemIdStr}`] = 'N/A';
                            if (currentHotel.code) dbScores[`${currentHotel.code}_${itemIdStr}`] = 'N/A';
                        }
                        dbScores[itemIdStr] = 'N/A';
                    } else if (sub.score !== undefined && sub.score !== null) {
                        dbScores[`${hIdStr}_${itemIdStr}`] = sub.score;
                        if (currentHotel) {
                            dbScores[`${currentHotel.id}_${itemIdStr}`] = sub.score;
                            if (currentHotel.code) dbScores[`${currentHotel.code}_${itemIdStr}`] = sub.score;
                        }
                        dbScores[itemIdStr] = sub.score;
                    }

                    const noteText = (sub.auditor_notes || sub.auditor_remarks || '').trim();
                    if (noteText) {
                        dbComments[`${hIdStr}_${itemIdStr}`] = noteText;
                        if (currentHotel) {
                            dbComments[`${currentHotel.id}_${itemIdStr}`] = noteText;
                            if (currentHotel.code) dbComments[`${currentHotel.code}_${itemIdStr}`] = noteText;
                        }
                        dbComments[itemIdStr] = noteText;
                    }
                }
            });

            setInspectionScores(prev => ({ ...prev, ...dbScores }));
            // CRITICAL: Only populate comments on INITIAL hotel load. Background polling / realtime intervals NEVER overwrite active auditor typing!
            if (isInitialLoad) {
                setInspectionComments(prev => ({ ...prev, ...dbComments }));
            }
            // Safely merge submissionsMap ensuring fresh DB scores take precedence while preserving active typing
            setHotelSubmissions(prev => {
                const next: Record<string, any> = { ...submissionsMap };
                Object.keys(prev).forEach(k => {
                    const prevItem = prev[k];
                    if (prevItem && (prevItem._isFullyLoaded || prevItem.value)) {
                        const belongs = prevItem.hotel_id && (
                            (currentHotel && isSubmissionForHotel(prevItem.hotel_id, currentHotel)) ||
                            idList.some(id => String(id).trim().toLowerCase() === String(prevItem.hotel_id).trim().toLowerCase())
                        );
                        if (belongs) {
                            if (next[k]) {
                                // DB record exists: DB row updates scores/evidence, while preserving in-memory auditor notes
                                next[k] = {
                                    ...prevItem,
                                    ...next[k],
                                    score: next[k].score !== undefined ? next[k].score : prevItem.score,
                                    is_na: next[k].is_na !== undefined ? next[k].is_na : prevItem.is_na,
                                    auditor_notes: prevItem.auditor_notes !== undefined ? prevItem.auditor_notes : (next[k].auditor_notes || next[k].auditor_remarks || '').trim(),
                                    auditor_remarks: prevItem.auditor_remarks !== undefined ? prevItem.auditor_remarks : (next[k].auditor_remarks || next[k].auditor_notes || '').trim(),
                                    value: next[k].value || prevItem.value,
                                    photo_url: next[k].photo_url || prevItem.photo_url,
                                    _isFullyLoaded: prevItem._isFullyLoaded || next[k]._isFullyLoaded || false,
                                };
                            } else {
                                next[k] = prevItem;
                            }
                        }
                    }
                });
                return next;
            });
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
                setHotelSubmissions(prev => ({ ...prev, ...submissionsMap }));
            }
        }
    };

    // States & loaders for ON-DEMAND fetching when clicking [Inspect & Score]
    const [loadingItemIds, setLoadingItemIds] = useState<Record<string, boolean>>({});

    const fetchFullItemSubmission = async (itemId: string, force = true) => {
        if (!selectedInspectionHotelId || !itemId) return;

        try {
            const hotel = hotels.find(h => h.id === selectedInspectionHotelId) || hotels.find(h => isSubmissionForHotel(selectedInspectionHotelId, h));
            const currentHotel = hotel || (selectedInspectionHotelId ? { id: selectedInspectionHotelId, code: selectedInspectionHotelId, name: selectedInspectionHotelId } as Hotel : undefined);
            const idList = getAssociatedHotelIds(currentHotel, selectedInspectionHotelId);

            const existingSub = hotelSubmissions[itemId];
            const isSameHotel = existingSub && existingSub.hotel_id && (
                (currentHotel && isSubmissionForHotel(existingSub.hotel_id, currentHotel)) ||
                idList.some(id => String(id).trim().toLowerCase() === String(existingSub.hotel_id).trim().toLowerCase())
            );

            if (!force && isSameHotel && existingSub?._isFullyLoaded) return;

            setLoadingItemIds(prev => ({ ...prev, [itemId]: true }));

            const { data, error } = await supabase
                .from('audit_submissions')
                .select('*')
                .eq('item_id', itemId)
                .in('hotel_id', idList);

            if (!error && data && data.length > 0) {
                const extractValidValue = (r: any) => {
                    if (!r) return '';
                    const fields = [r.value, r.photo_url, r.evidence_url, r.file_url, r.image_url, r.evidence_urls, r.files];
                    for (const f of fields) {
                        if (f) {
                            const parsedUrls = splitEvidenceUrls(f);
                            if (parsedUrls.length > 0) return f;
                            const str = typeof f === 'object' ? JSON.stringify(f) : String(f).trim();
                            if (str && str !== 'null' && str !== 'undefined' && str !== '{}' && str !== '[]') return str;
                        }
                    }
                    return '';
                };

                const rowWithValue = data.find(r => extractValidValue(r) !== '');
                const extractedVal = rowWithValue ? extractValidValue(rowWithValue) : '';
                const rowWithScore = data.find(r => r && r.score !== undefined && r.score !== null);
                const rowWithNotes = data.find(r => r && (r.auditor_notes || r.auditor_remarks));
                const rowWithNa = data.find(r => r && (r.is_na === true || String(r.is_na) === 'true'));

                const submitters = Array.from(new Set(data.map(r => r.submitted_by_name || r.submitted_by).filter(Boolean)));
                const combinedSubmitter = submitters.join(', ');

                const newestRow = [...data].sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())[0];

                setHotelSubmissions(prev => {
                    const prevSub = prev[itemId] || {};
                    const prevIsSameHotel = prevSub.hotel_id && (
                        (currentHotel && isSubmissionForHotel(prevSub.hotel_id, currentHotel)) ||
                        idList.some(id => String(id).trim().toLowerCase() === String(prevSub.hotel_id).trim().toLowerCase())
                    );
                    const validPrevSub = prevIsSameHotel ? prevSub : {};
                    const prevSubValue = extractValidValue(validPrevSub) || validPrevSub.value || '';
                    const finalValue = extractedVal || extractValidValue(newestRow) || newestRow?.value || (prevIsSameHotel ? prevSubValue : '') || '';
                    const finalScore = rowWithScore?.score !== undefined ? rowWithScore.score : (prevIsSameHotel ? validPrevSub.score : undefined);
                    const finalNa = rowWithScore?.score !== undefined 
                        ? false 
                        : (rowWithNa ? true : (newestRow?.is_na ?? (prevIsSameHotel ? validPrevSub.is_na : undefined)));
                    const dbNotes = (rowWithNotes?.auditor_notes || rowWithNotes?.auditor_remarks || '').trim();
                    const preservedNotes = validPrevSub.auditor_notes !== undefined ? validPrevSub.auditor_notes : dbNotes;

                    return {
                        ...prev,
                        [itemId]: {
                            ...validPrevSub,
                            ...newestRow,
                            hotel_id: newestRow?.hotel_id || currentHotel?.code || currentHotel?.id || selectedInspectionHotelId,
                            value: finalValue,
                            submitted_by_name: combinedSubmitter || newestRow?.submitted_by_name || (prevIsSameHotel ? validPrevSub.submitted_by_name : undefined),
                            score: finalScore,
                            is_na: finalNa,
                            auditor_notes: preservedNotes,
                            auditor_remarks: preservedNotes,
                            _isFullyLoaded: true
                        }
                    };
                });

                const effectiveScore = rowWithScore?.score;
                if (effectiveScore !== undefined && effectiveScore !== null) {
                    setInspectionScores(prev => {
                        const next = { ...prev, [itemId]: effectiveScore };
                        idList.forEach(hId => { next[`${hId}_${itemId}`] = effectiveScore; });
                        return next;
                    });
                } else if (rowWithNa) {
                    setInspectionScores(prev => {
                        const next = { ...prev, [itemId]: 'N/A' };
                        idList.forEach(hId => { next[`${hId}_${itemId}`] = 'N/A'; });
                        return next;
                    });
                }
            } else {
                setHotelSubmissions(prev => {
                    const prevSub = prev[itemId] || {};
                    const prevIsSameHotel = prevSub.hotel_id && (
                        (currentHotel && isSubmissionForHotel(prevSub.hotel_id, currentHotel)) ||
                        idList.some(id => String(id).trim().toLowerCase() === String(prevSub.hotel_id).trim().toLowerCase())
                    );
                    return {
                        ...prev,
                        [itemId]: prevIsSameHotel 
                            ? { ...prevSub, _isFullyLoaded: true } 
                            : { _isFullyLoaded: true, hotel_id: currentHotel?.code || currentHotel?.id || selectedInspectionHotelId, item_id: itemId }
                    };
                });
            }
        } catch (err) {
            console.error("Error fetching item submission details:", err);
        } finally {
            setLoadingItemIds(prev => ({ ...prev, [itemId]: false }));
        }
    };

    const fetchFullCategorySubmissions = async (itemIds: string[]) => {
        if (!selectedInspectionHotelId || !itemIds || itemIds.length === 0) return;
        const toFetch = itemIds.filter(id => !hotelSubmissions[id]?._isFullyLoaded);
        if (toFetch.length === 0) return;

        toFetch.forEach(id => setLoadingItemIds(prev => ({ ...prev, [id]: true })));
        try {
            const hotel = hotels.find(h => h.id === selectedInspectionHotelId) || hotels.find(h => isSubmissionForHotel(selectedInspectionHotelId, h));
            const currentHotel = hotel || (selectedInspectionHotelId ? { id: selectedInspectionHotelId, code: selectedInspectionHotelId, name: selectedInspectionHotelId } as Hotel : undefined);
            const idList = getAssociatedHotelIds(currentHotel, selectedInspectionHotelId);

            const { data, error } = await supabase
                .from('audit_submissions')
                .select('*')
                .in('item_id', toFetch)
                .in('hotel_id', idList);

            if (!error && data) {
                const rowsByItem: Record<string, any[]> = {};
                data.forEach((sub: any) => {
                    if (sub && sub.item_id !== undefined && sub.item_id !== null) {
                        const iId = String(sub.item_id);
                        if (!rowsByItem[iId]) rowsByItem[iId] = [];
                        rowsByItem[iId].push(sub);
                    }
                });

                const extractValidValueCat = (r: any) => {
                    if (!r) return '';
                    const fields = [r.value, r.photo_url, r.evidence_url, r.file_url, r.image_url, r.evidence_urls, r.files];
                    for (const f of fields) {
                        if (f) {
                            const parsedUrls = splitEvidenceUrls(f);
                            if (parsedUrls.length > 0) return f;
                            const str = typeof f === 'object' ? JSON.stringify(f) : String(f).trim();
                            if (str && str !== 'null' && str !== 'undefined' && str !== '{}' && str !== '[]') return str;
                        }
                    }
                    return '';
                };

                setHotelSubmissions(prev => {
                    const next = { ...prev };
                    Object.keys(rowsByItem).forEach(itemId => {
                        const itemRows = rowsByItem[itemId];
                        const prevSub = next[itemId] || {};
                        const prevIsSameHotel = prevSub.hotel_id && (
                            (currentHotel && isSubmissionForHotel(prevSub.hotel_id, currentHotel)) ||
                            idList.some(id => String(id).trim().toLowerCase() === String(prevSub.hotel_id).trim().toLowerCase())
                        );
                        const validPrevSub = prevIsSameHotel ? prevSub : {};

                        const rowWithValue = itemRows.find(r => extractValidValueCat(r) !== '');
                        const extractedVal = rowWithValue ? extractValidValueCat(rowWithValue) : '';
                        const rowWithScore = itemRows.find(r => r && r.score !== undefined && r.score !== null);
                        const rowWithNotes = itemRows.find(r => r && (r.auditor_notes || r.auditor_remarks));
                        const rowWithNa = itemRows.find(r => r && (r.is_na === true || String(r.is_na) === 'true'));
                        const newestRow = [...itemRows].sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())[0];

                        const prevSubValue = extractValidValueCat(validPrevSub) || validPrevSub.value || '';
                        const finalValue = extractedVal || prevSubValue || extractValidValueCat(newestRow) || newestRow?.value || '';
                        const dbNotes = (rowWithNotes?.auditor_notes || rowWithNotes?.auditor_remarks || '').trim();
                        const preservedNotes = validPrevSub.auditor_notes !== undefined ? validPrevSub.auditor_notes : dbNotes;

                        next[itemId] = {
                            ...validPrevSub,
                            ...newestRow,
                            hotel_id: newestRow?.hotel_id || currentHotel?.code || currentHotel?.id || selectedInspectionHotelId,
                            value: finalValue,
                            score: rowWithScore?.score !== undefined ? rowWithScore.score : validPrevSub.score,
                            is_na: rowWithScore?.score !== undefined ? false : (rowWithNa ? true : (newestRow?.is_na || validPrevSub.is_na)),
                            auditor_notes: preservedNotes,
                            auditor_remarks: preservedNotes,
                            _isFullyLoaded: true
                        };

                        if (rowWithScore?.score !== undefined && rowWithScore.score !== null) {
                            const sc = rowWithScore.score;
                            setInspectionScores(s => {
                                const next = { ...s, [itemId]: sc };
                                idList.forEach(hId => { next[`${hId}_${itemId}`] = sc; });
                                return next;
                            });
                        } else if (rowWithNa) {
                            setInspectionScores(s => {
                                const next = { ...s, [itemId]: 'N/A' };
                                idList.forEach(hId => { next[`${hId}_${itemId}`] = 'N/A'; });
                                return next;
                            });
                        }
                    });
                    toFetch.forEach(id => {
                        if (!next[id]) {
                            next[id] = { _isFullyLoaded: true, hotel_id: currentHotel?.code || currentHotel?.id || selectedInspectionHotelId, item_id: id };
                        }
                    });
                    return next;
                });
            }
        } catch (err) {
            console.error("Error fetching category submissions details:", err);
        } finally {
            toFetch.forEach(id => setLoadingItemIds(prev => ({ ...prev, [id]: false })));
        }
    };

    useEffect(() => {
        let active = true;
        
        // Reset inspection-specific states ONLY when switching to a different hotel
        const isSwitchingHotel = previousInspectionHotelIdRef.current !== selectedInspectionHotelId;
        if (isSwitchingHotel) {
            previousInspectionHotelIdRef.current = selectedInspectionHotelId;
            setHotelSubmissions({});
            setExpandedInspectionItems({});
            setLoadingItemIds({});
            setInspectionComments({});
        }

        const fetchSubmissionsLocal = async (isInitial = false) => {
            if (!selectedInspectionHotelId) {
                return;
            }
            await fetchHotelSubmissionsForAuditor(isInitial);
        };
        fetchSubmissionsLocal(isSwitchingHotel);

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
                fetchSubmissionsLocal(false);
            })
            .subscribe();

        // 120-second background polling interval to conserve Supabase database resources
        const interval = setInterval(() => {
            fetchSubmissionsLocal(false);
        }, 120000);

        return () => {
            active = false;
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [selectedInspectionHotelId]);

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

    const saveInspectionScore = (hotelOrId: any, itemId: string, score: number | string | undefined) => {
        const hotelObj = typeof hotelOrId === 'object' ? hotelOrId : hotels.find(h => String(h.id) === String(hotelOrId) || String(h.code).toLowerCase() === String(hotelOrId).toLowerCase());
        const primaryId = typeof hotelOrId === 'string' ? hotelOrId : (hotelOrId?.id || selectedInspectionHotelId);
        const sub = hotelSubmissions[itemId];
        const subHotelId = sub?.hotel_id;

        const canonicalHotelId = String(hotelObj?.code || subHotelId || hotelObj?.id || primaryId || '').trim().toUpperCase();
        if (!canonicalHotelId) return;

        const possibleHotelIds = Array.from(new Set([
            String(primaryId),
            hotelObj?.id ? String(hotelObj.id) : '',
            hotelObj?.code ? String(hotelObj.code) : '',
            subHotelId ? String(subHotelId) : ''
        ].filter(Boolean)));

        const isNA = score === 'N/A' || score === 'na' || score === 'NA' || score === 'Na';
        const targetItem = (items || []).find(i => String(i.id) === String(itemId)) || DEFAULT_OFFLINE_ITEMS.find(i => String(i.id) === String(itemId));
        const targetPoints = targetItem?.points ?? 5;
        const numScore = typeof score === 'number' 
            ? score 
            : (score !== undefined && score !== null && !isNaN(Number(score)) && String(score) !== '' 
                ? Number(score) 
                : (score === 'PASS' || score === 'pass' ? (targetPoints > 0 ? targetPoints : 1) : (score === 'FAIL' || score === 'fail' ? 0 : null)));

        // Update in-memory scores for immediate responsive UI feedback
        const updated = { ...inspectionScores };
        possibleHotelIds.forEach(hId => {
            const k = `${hId}_${itemId}`;
            if (score === undefined) delete updated[k]; else updated[k] = score;
        });
        if (score === undefined) delete updated[itemId]; else updated[itemId] = score;
        setInspectionScores(updated);

        // Update hotelSubmissions state directly in memory
        setHotelSubmissions(prev => ({
            ...prev,
            [itemId]: {
                ...(prev[itemId] || {}),
                hotel_id: canonicalHotelId,
                item_id: String(itemId),
                score: isNA ? null : numScore,
                is_na: isNA,
                updated_at: new Date().toISOString()
            }
        }));

        // Store score in memory - DB save will occur strictly when [SAVE AUDIT TO DB] button is pressed
    };

    const saveInspectionComment = (hotelOrId: any, itemId: string, comment: string) => {
        const hotelObj = typeof hotelOrId === 'object' ? hotelOrId : hotels.find(h => String(h.id) === String(hotelOrId) || String(h.code).toLowerCase() === String(hotelOrId).toLowerCase());
        const primaryId = typeof hotelOrId === 'string' ? hotelOrId : (hotelOrId?.id || selectedInspectionHotelId);
        const sub = hotelSubmissions[itemId];
        const subHotelId = sub?.hotel_id;

        const canonicalHotelId = String(hotelObj?.code || subHotelId || hotelObj?.id || primaryId || '').trim().toUpperCase();
        if (!canonicalHotelId) return;

        const possibleHotelIds = Array.from(new Set([
            String(primaryId),
            hotelObj?.id ? String(hotelObj.id) : '',
            hotelObj?.code ? String(hotelObj.code) : '',
            hotelObj?.code ? String(hotelObj.code).toLowerCase() : '',
            hotelObj?.code ? String(hotelObj.code).toUpperCase() : '',
            subHotelId ? String(subHotelId) : '',
            subHotelId ? String(subHotelId).toLowerCase() : '',
            subHotelId ? String(subHotelId).toUpperCase() : ''
        ].filter(Boolean)));

        const rawComment = comment !== undefined ? comment : '';

        // Store comment directly in local state - never delete the key when typing or clearing so local state stays authorative!
        setInspectionComments(prev => {
            const updated = { ...prev };
            // Update all matching alias keys that end with _itemId
            Object.keys(updated).forEach(k => {
                if (k === itemId || k.endsWith(`_${itemId}`)) {
                    updated[k] = rawComment;
                }
            });
            possibleHotelIds.forEach(hId => {
                updated[`${hId}_${itemId}`] = rawComment;
            });
            updated[itemId] = rawComment;
            return updated;
        });

        // Update hotelSubmissions state directly in memory - DB save occurs strictly on [SAVE AUDIT TO DB] button click
        setHotelSubmissions(prev => ({
            ...prev,
            [itemId]: {
                ...(prev[itemId] || {}),
                hotel_id: canonicalHotelId,
                item_id: String(itemId),
                auditor_notes: rawComment,
                auditor_remarks: rawComment,
                updated_at: new Date().toISOString()
            }
        }));

        if (commentDebounceTimersRef.current[itemId]) {
            clearTimeout(commentDebounceTimersRef.current[itemId]);
            delete commentDebounceTimersRef.current[itemId];
        }
    };

    const commitInspectionToDatabase = async (
        hotelOrId: any, 
        itemId: string, 
        overrideScore?: number | string | null, 
        overrideComment?: string
    ) => {
        const hotelObj = typeof hotelOrId === 'object' ? hotelOrId : hotels.find(h => String(h.id) === String(hotelOrId) || String(h.code).toLowerCase() === String(hotelOrId).toLowerCase());
        const primaryId = typeof hotelOrId === 'string' ? hotelOrId : (hotelOrId?.id || selectedInspectionHotelId);
        const sub = hotelSubmissions[itemId];
        const subHotelId = sub?.hotel_id;

        const canonicalHotelId = String(hotelObj?.code || subHotelId || hotelObj?.id || primaryId || '').trim().toUpperCase();
        if (!canonicalHotelId) return;

        const targetItem = (items || []).find(i => String(i.id) === String(itemId)) || DEFAULT_OFFLINE_ITEMS.find(i => String(i.id) === String(itemId));
        const itemMaxPoints = targetItem?.points ?? 5;

        const keysToTry = [
            `${canonicalHotelId}_${itemId}`,
            `${canonicalHotelId.toLowerCase()}_${itemId}`,
            `${canonicalHotelId.toUpperCase()}_${itemId}`,
            hotelObj?.id ? `${hotelObj.id}_${itemId}` : '',
            hotelObj?.id ? `${String(hotelObj.id).toLowerCase()}_${itemId}` : '',
            hotelObj?.code ? `${hotelObj.code}_${itemId}` : '',
            hotelObj?.code ? `${String(hotelObj.code).toLowerCase()}_${itemId}` : '',
            itemId
        ].filter(Boolean);

        let scoreVal: any = overrideScore !== undefined ? overrideScore : undefined;
        if (scoreVal === undefined) {
            for (const k of keysToTry) {
                if (inspectionScores[k] !== undefined) {
                    scoreVal = inspectionScores[k];
                    break;
                }
            }
        }
        if (scoreVal === undefined) {
            scoreVal = sub?.score ?? (sub?.is_na ? 'N/A' : undefined);
        }

        let commentVal: string | undefined = overrideComment !== undefined ? overrideComment : undefined;
        if (commentVal === undefined) {
            for (const k of keysToTry) {
                if (inspectionComments[k] !== undefined) {
                    commentVal = inspectionComments[k];
                    break;
                }
            }
        }
        if (commentVal === undefined) {
            commentVal = sub?.auditor_notes || sub?.auditor_remarks || '';
        }

        // If scoreVal is explicitly provided (e.g. 0 for Fail, positive for Pass, or 'N/A' for NA), respect the auditor's explicit decision!
        const isNA = scoreVal !== undefined && scoreVal !== null
            ? (scoreVal === 'N/A' || scoreVal === 'na' || scoreVal === 'NA' || scoreVal === 'Na' || scoreVal === 'exempt')
            : (sub?.is_na === true || String(sub?.is_na) === 'true');
        let numScore: number | null = null;
        if (!isNA) {
            if (typeof scoreVal === 'number' && !isNaN(scoreVal)) {
                numScore = scoreVal;
            } else if (scoreVal === 'PASS' || scoreVal === 'pass') {
                numScore = (itemMaxPoints > 0 ? itemMaxPoints : 1);
            } else if (scoreVal === 'FAIL' || scoreVal === 'fail') {
                numScore = 0;
            } else if (scoreVal !== undefined && scoreVal !== null && !isNaN(Number(scoreVal)) && String(scoreVal).trim() !== '' && String(scoreVal).trim().toLowerCase() !== 'null') {
                numScore = Number(scoreVal);
            } else if (sub?.score !== undefined && sub?.score !== null && !isNaN(Number(sub.score))) {
                numScore = Number(sub.score);
            }
        }

        const sanitizedScore = (isNA || numScore === null || isNaN(numScore)) ? null : Number(numScore);

        setSavingInspectionItemId(itemId);
        try {
            const auditorSubmitterName = userProfile 
                ? `Auditor: ${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || `Auditor: ${userProfile.email}`
                : 'Auditor';

            // Preserve existing hotel submitter name if present and not starting with 'Auditor:'
            const existingSubmitter = sub?.submitted_by_name || sub?.submitted_by || hotelSubmissions[itemId]?.submitted_by_name || hotelSubmissions[itemId]?.submitted_by;
            const finalSubmitterName = (existingSubmitter && !existingSubmitter.startsWith('Auditor:'))
                ? existingSubmitter
                : auditorSubmitterName;

            const payload: any = {
                hotel_id: canonicalHotelId,
                item_id: String(itemId),
                score: sanitizedScore,
                is_na: !!isNA,
                auditor_notes: (commentVal || '').trim(),
                auditor_remarks: (commentVal || '').trim(),
                notes: (commentVal || '').trim() || sub?.notes || '',
                submitted_by: finalSubmitterName,
                submitted_by_name: finalSubmitterName,
                updated_at: new Date().toISOString()
            };
            const existingVal = sub?.value || sub?.photo_url || sub?.evidence_url || sub?.file_url || sub?.image_url || hotelSubmissions[itemId]?.value || hotelSubmissions[itemId]?.photo_url || hotelSubmissions[itemId]?.evidence_url;
            if (existingVal) {
                payload.value = existingVal;
            }
            if (sub?.input_type) payload.input_type = sub.input_type;

            const { error } = await supabase.from('audit_submissions').upsert(payload, { onConflict: 'hotel_id,item_id' });
            if (error) {
                console.warn("Commit to DB failed, attempting fallback payload:", error);
                const fallbackPayload: any = {
                    hotel_id: canonicalHotelId,
                    item_id: String(itemId),
                    score: sanitizedScore,
                    is_na: !!isNA,
                    updated_at: new Date().toISOString()
                };
                if (sub?.value) fallbackPayload.value = sub.value;
                if (sub?.input_type) fallbackPayload.input_type = sub.input_type;
                if (commentVal) {
                    fallbackPayload.auditor_notes = (commentVal || '').trim();
                    fallbackPayload.auditor_remarks = (commentVal || '').trim();
                }
                const { error: fallbackError } = await supabase.from('audit_submissions').upsert(fallbackPayload, { onConflict: 'hotel_id,item_id' });
                if (fallbackError) {
                    console.error("Supabase fallback upsert error:", fallbackError);
                }
            }

            // Cleanup non-canonical duplicate rows stored under alternate hotel ID aliases
            const altHotelIds = [hotelObj?.id, hotelObj?.code, primaryId, subHotelId]
                .filter(Boolean)
                .map(id => String(id).trim())
                .filter(id => id && id.toLowerCase() !== canonicalHotelId.toLowerCase() && id !== canonicalHotelId);

            if (altHotelIds.length > 0) {
                await supabase
                    .from('audit_submissions')
                    .delete()
                    .eq('item_id', String(itemId))
                    .in('hotel_id', altHotelIds);
            }

            // Sync state in memory so subsequent re-renders or checks have updated score and is_na
            setHotelSubmissions(prev => ({
                ...prev,
                [itemId]: {
                    ...(prev[itemId] || {}),
                    hotel_id: canonicalHotelId,
                    item_id: String(itemId),
                    score: sanitizedScore,
                    is_na: !!isNA,
                    auditor_notes: (commentVal || '').trim(),
                    auditor_remarks: (commentVal || '').trim(),
                    notes: (commentVal || '').trim() || sub?.notes || '',
                    submitted_by: finalSubmitterName,
                    submitted_by_name: finalSubmitterName,
                    updated_at: payload.updated_at
                }
            }));

            // Sync with local storage caches
            const lsPayload = JSON.stringify({
                ...payload,
                isSubmitted: true
            });
            try {
                if (hotelObj?.id) localStorage.setItem(`sbi_audit_${hotelObj.id}_${itemId}`, lsPayload);
                if (hotelObj?.code) localStorage.setItem(`sbi_audit_${hotelObj.code}_${itemId}`, lsPayload);
                if (canonicalHotelId) localStorage.setItem(`sbi_audit_${canonicalHotelId}_${itemId}`, lsPayload);
            } catch (lsErr) {
                console.warn("LocalStorage save failed:", lsErr);
            }

            // Set visual confirmation indicator
            setRecentlySavedItemId(itemId);
            setTimeout(() => {
                setRecentlySavedItemId(prev => prev === itemId ? null : prev);
            }, 3500);
        } catch (err) {
            console.error("Error committing inspection to DB:", err);
        } finally {
            setSavingInspectionItemId(null);
        }
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
                            country: hotelLocation.trim() || hotelCountry.trim() || 'Indonesia',
                            star_rating: Number(hotelStars)
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
                            country: hotelLocation.trim() || hotelCountry.trim() || 'Indonesia',
                            star_rating: Number(hotelStars)
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
                        {subView === 'departments' ? 'Audit Departments' : subView === 'hotels' ? 'Master Hotel List' : subView === 'batches' ? 'Audit Batch' : subView === 'categories' ? 'Audit Category' : subView === 'items' ? 'Audit Items' : subView === 'groups' ? 'Audit Groups' : subView === 'users' ? 'User Management' : subView === 'inspection_v2' ? 'Audit Inspection v2' : subView === 'inspection' ? 'Audit Inspection (v1)' : subView === 'progress_report' ? 'Audit Progress Report' : 'Admin Dashboard'}
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
                    <DashboardView
                        MAIN_URL={MAIN_URL}
                        allSubmissions={allSubmissions}
                        batches={batches}
                        catList={catList}
                        departments={departments}
                        fetchProfilesFromSupabase={fetchProfilesFromSupabase}
                        groups={groups}
                        handleSetSubView={handleSetSubView}
                        hotels={hotels}
                        includedHotels={includedHotels}
                        profilesList={profilesList}
                        setAuditResultsSearch={setAuditResultsSearch}
                        setProgressSearchQuery={setProgressSearchQuery}
                        setSearchQuery={setSearchQuery}
                        setSelectedAuditResultId={setSelectedAuditResultId}
                        setStatsModalCopied={setStatsModalCopied}
                        setStatsModalType={setStatsModalType}
                        setSubView={setSubView}
                        stats={stats}
                        supabaseConnected={supabaseConnected}
                        userProfile={userProfile}
                        onBackToDashboard={() => { setSubView('dashboard'); setSearchQuery(''); }}
                    />
                ) : subView === 'users' ? (
                    <UsersView
                        fetchProfilesFromSupabase={fetchProfilesFromSupabase}
                        getRoleStyles={getRoleStyles}
                        handleOpenCreateUser={handleOpenCreateUser}
                        handleOpenEditUser={handleOpenEditUser}
                        isProfilesTableMissing={isProfilesTableMissing}
                        isSupabaseLoading={isSupabaseLoading}
                        profilesList={profilesList}
                        searchQuery={searchQuery}
                        setConfirmUserDeleteId={setConfirmUserDeleteId}
                        setSearchQuery={setSearchQuery}
                        updateAccessLevel={updateAccessLevel}
                        updateApprovalStatus={updateApprovalStatus}
                        userProfile={userProfile}
                        onBackToDashboard={() => { setSubView('dashboard'); setSearchQuery(''); }}
                    />
                ) : subView === 'access' ? (
                    <AccessView
                        auditorAccess={auditorAccess}
                        handleSaveAccess={handleSaveAccess}
                        handleToggleAuditorAccess={handleToggleAuditorAccess}
                        onBackToDashboard={() => { setSubView('dashboard'); setSearchQuery(''); }}
                    />
                ) : subView === 'departments' ? (
                    <DepartmentsView
                        confirmDeptDeleteId={confirmDeptDeleteId}
                        filteredDepts={filteredDepts}
                        handleDeleteDept={handleDeleteDept}
                        handleOpenAddDept={handleOpenAddDept}
                        handleOpenEditDept={handleOpenEditDept}
                        searchQuery={searchQuery}
                        setConfirmDeptDeleteId={setConfirmDeptDeleteId}
                        setSearchQuery={setSearchQuery}
                        onBackToDashboard={() => { setSubView('dashboard'); setSearchQuery(''); }}
                    />
                ) : subView === 'batches' ? (
                    <BatchesView
                        confirmBatchDeleteId={confirmBatchDeleteId}
                        filteredBatches={filteredBatches}
                        handleDeleteBatch={handleDeleteBatch}
                        handleOpenAddBatch={handleOpenAddBatch}
                        handleOpenEditBatch={handleOpenEditBatch}
                        hotels={hotels}
                        searchQuery={searchQuery}
                        setConfirmBatchDeleteId={setConfirmBatchDeleteId}
                        setSearchQuery={setSearchQuery}
                        onBackToDashboard={() => { setSubView('dashboard'); setSearchQuery(''); }}
                    />
                ) : subView === 'categories' ? (
                    <CategoriesView
                        confirmCatDeleteId={confirmCatDeleteId}
                        expandedDepartments={expandedDepartments}
                        filteredCategories={filteredCategories}
                        groupedCategories={groupedCategories}
                        handleDeleteCat={handleDeleteCat}
                        handleMoveCategory={handleMoveCategory}
                        handleOpenAddCat={handleOpenAddCat}
                        handleOpenEditCat={handleOpenEditCat}
                        searchQuery={searchQuery}
                        setConfirmCatDeleteId={setConfirmCatDeleteId}
                        setSearchQuery={setSearchQuery}
                        toggleDepartmentExpansion={toggleDepartmentExpansion}
                        onBackToDashboard={() => { setSubView('dashboard'); setSearchQuery(''); }}
                    />
                ) : subView === 'groups' ? (
                    <GroupsView
                        confirmGroupDeleteId={confirmGroupDeleteId}
                        groupSearchQuery={groupSearchQuery}
                        groups={groups}
                        handleDeleteGroup={handleDeleteGroup}
                        handleGroupAssignAllHotels={handleGroupAssignAllHotels}
                        handleGroupClearAllHotels={handleGroupClearAllHotels}
                        handleOpenAddGroup={handleOpenAddGroup}
                        handleOpenEditGroup={handleOpenEditGroup}
                        handleToggleGroupHotel={handleToggleGroupHotel}
                        includedHotels={includedHotels}
                        selectedGroupId={selectedGroupId}
                        setConfirmGroupDeleteId={setConfirmGroupDeleteId}
                        setGroupSearchQuery={setGroupSearchQuery}
                        setSelectedGroupId={setSelectedGroupId}
                        setShowSqlModal={setShowSqlModal}
                        onBackToDashboard={() => { setSubView('dashboard'); setSearchQuery(''); }}
                    />
                ) : subView === 'items' ? (
                    <ItemsView
                        confirmItemDeleteId={confirmItemDeleteId}
                        departments={departments}
                        expandedCategories={expandedCategories}
                        groupedItems={groupedItems}
                        handleDeleteItem={handleDeleteItem}
                        handleMoveItem={handleMoveItem}
                        handleOpenAddItem={handleOpenAddItem}
                        handleOpenEditItem={handleOpenEditItem}
                        setConfirmItemDeleteId={setConfirmItemDeleteId}
                        toggleCategoryExpansion={toggleCategoryExpansion}
                        onBackToDashboard={() => { setSubView('dashboard'); setSearchQuery(''); }}
                    />
                ) : subView === 'auditor_assignment' ? (
                    <AuditorAssignmentView
                        assignmentTab={assignmentTab}
                        auditorAssignments={auditorAssignments}
                        auditorCategoryAssignments={auditorCategoryAssignments}
                        catList={catList}
                        categoryAssignmentSearch={categoryAssignmentSearch}
                        categoryDeptFilter={categoryDeptFilter}
                        departments={departments}
                        expandedCountries={expandedCountries}
                        groupByCountry={groupByCountry}
                        groupByDept={groupByDept}
                        handleAssignAllCategories={handleAssignAllCategories}
                        handleAssignAllHotels={handleAssignAllHotels}
                        handleAssignDepartmentCategories={handleAssignDepartmentCategories}
                        handleBatchAssignCategories={handleBatchAssignCategories}
                        handleBatchAssignHotels={handleBatchAssignHotels}
                        handleClearAllCategories={handleClearAllCategories}
                        handleClearAllHotels={handleClearAllHotels}
                        handleToggleCategoryAssignment={handleToggleCategoryAssignment}
                        hotelAssignmentSearch={hotelAssignmentSearch}
                        hotelCountryFilter={hotelCountryFilter}
                        hotels={hotels}
                        includedHotels={includedHotels}
                        items={items}
                        profilesList={profilesList}
                        selectedAuditorId={selectedAuditorId}
                        selectedCategoryBatchIds={selectedCategoryBatchIds}
                        setAssignmentTab={setAssignmentTab}
                        setCategoryAssignmentSearch={setCategoryAssignmentSearch}
                        setCategoryDeptFilter={setCategoryDeptFilter}
                        setExpandedCountries={setExpandedCountries}
                        setGroupByCountry={setGroupByCountry}
                        setGroupByDept={setGroupByDept}
                        setHotelAssignmentSearch={setHotelAssignmentSearch}
                        setHotelCountryFilter={setHotelCountryFilter}
                        setSelectedAuditorId={setSelectedAuditorId}
                        setSelectedCategoryBatchIds={setSelectedCategoryBatchIds}
                        setShowSqlModal={setShowSqlModal}
                        setSubView={setSubView}
                        onBackToDashboard={() => { setSubView('dashboard'); setSearchQuery(''); }}
                    />
                ) : subView === 'inspection_v2' ? (
                    <InspectionV2View
                        AuditInspectionV2={AuditInspectionV2}
                        auditorCategoryAssignments={auditorCategoryAssignments}
                        batches={batches}
                        catList={catList}
                        groups={groups}
                        hotels={hotels}
                        isV2Unlocked={isV2Unlocked}
                        items={items}
                        setIsV2PinModalOpen={setIsV2PinModalOpen}
                        setIsV2Unlocked={setIsV2Unlocked}
                        setSubView={setSubView}
                        setV2PinError={setV2PinError}
                        setV2PinValue={setV2PinValue}
                        userProfile={userProfile}
                        onBackToDashboard={() => { setSubView('dashboard'); setSearchQuery(''); }}
                    />
                ) : subView === 'inspection' ? (
                    <InspectionView
                        AuditorEvidenceForm={AuditorEvidenceForm}
                        EvidenceMediaViewer={EvidenceMediaViewer}
                        auditorAssignments={auditorAssignments}
                        auditorCategoryAssignments={auditorCategoryAssignments}
                        catList={catList}
                        commitInspectionToDatabase={commitInspectionToDatabase}
                        copiedDocId={copiedDocId}
                        expandedInspectionItems={expandedInspectionItems}
                        fetchFullCategorySubmissions={fetchFullCategorySubmissions}
                        fetchFullItemSubmission={fetchFullItemSubmission}
                        fetchHotelSubmissionsForAuditor={fetchHotelSubmissionsForAuditor}
                        getHotelFinalizedInfo={getHotelFinalizedInfo}
                        getSubmissionsForHotel={getSubmissionsForHotel}
                        getSubmitterName={getSubmitterName}
                        groups={groups}
                        handleCopyDocLink={handleCopyDocLink}
                        handleDocumentDownload={handleDocumentDownload}
                        handleUnlockHotel={handleUnlockHotel}
                        hotelSubmissions={hotelSubmissions}
                        hotels={hotels}
                        includedHotels={includedHotels}
                        inspectionComments={inspectionComments}
                        inspectionPage={inspectionPage}
                        inspectionPageSize={inspectionPageSize}
                        inspectionScores={inspectionScores}
                        inspectionStatusFilter={inspectionStatusFilter}
                        isImageInput={isImageInput}
                        isSubmissionForHotel={isSubmissionForHotel}
                        items={items}
                        loadingItemIds={loadingItemIds}
                        profilesList={profilesList}
                        recentlySavedItemId={recentlySavedItemId}
                        safeFormatDateTime={safeFormatDateTime}
                        saveInspectionComment={saveInspectionComment}
                        saveInspectionScore={saveInspectionScore}
                        savingInspectionItemId={savingInspectionItemId}
                        searchQuery={searchQuery}
                        selectedInspectionCategoryId={selectedInspectionCategoryId}
                        selectedInspectionHotelId={selectedInspectionHotelId}
                        setEnlargedImage={setEnlargedImage}
                        setExpandedInspectionItems={setExpandedInspectionItems}
                        setInspectionPage={setInspectionPage}
                        setInspectionPageSize={setInspectionPageSize}
                        setInspectionStatusFilter={setInspectionStatusFilter}
                        setSearchQuery={setSearchQuery}
                        setSelectedInspectionCategoryId={setSelectedInspectionCategoryId}
                        setSelectedInspectionHotelId={setSelectedInspectionHotelId}
                        setToastMessage={setToastMessage}
                        userProfile={userProfile}
                        onBackToDashboard={() => { setSubView('dashboard'); setSearchQuery(''); }}
                    />
                ) : subView === 'audit_results' ? (
                    <AuditResultsView
                        auditResults={auditResults}
                        departments={departments}
                        items={items}
                        catList={catList}
                        isSupabaseLoading={isSupabaseLoading}
                        selectedAuditResultId={selectedAuditResultId}
                        setSelectedAuditResultId={setSelectedAuditResultId}
                        auditResultsSearch={auditResultsSearch}
                        setAuditResultsSearch={setAuditResultsSearch}
                        collapsedAuditDepartments={collapsedAuditDepartments}
                        setCollapsedAuditDepartments={setCollapsedAuditDepartments}
                        progressDataLoaded={progressDataLoaded}
                        progressDataLoading={progressDataLoading}
                        progressDataError={progressDataError}
                        fetchProgressSubmissions={fetchProgressSubmissions}
                        handleDownloadCertificate={handleDownloadCertificate}
                        onBackToReport={() => { setSubView('inspection'); setSearchQuery(''); }}
                    />
                ) : subView === 'progress_report' ? (
                    <ProgressReportView
                        batches={batches}
                        getHotelFinalizedInfo={getHotelFinalizedInfo}
                        groups={groups}
                        handleSetAuditLock={handleSetAuditLock}
                        handleSetAuditLockForAll={handleSetAuditLockForAll}
                        handleUnlockHotel={handleUnlockHotel}
                        hotelAssociatedIdsMap={hotelAssociatedIdsMap}
                        hotels={hotels}
                        includedHotels={includedHotels}
                        inspectionScores={inspectionScores}
                        isHotelAuditLocked={isHotelAuditLocked}
                        items={items}
                        profilesList={profilesList}
                        progressBrandFilter={progressBrandFilter}
                        progressBrandLeadFilter={progressBrandLeadFilter}
                        progressCountryFilter={progressCountryFilter}
                        progressPage={progressPage}
                        progressPageSize={progressPageSize}
                        progressRegionFilter={progressRegionFilter}
                        progressSearchQuery={progressSearchQuery}
                        progressSortDirection={progressSortDirection}
                        progressSortField={progressSortField}
                        progressStatusFilter={progressStatusFilter}
                        progressSubmissions={progressSubmissions}
                        setHotelToReset={setHotelToReset}
                        setIsResetPinModalOpen={setIsResetPinModalOpen}
                        setProgressBrandFilter={setProgressBrandFilter}
                        setProgressBrandLeadFilter={setProgressBrandLeadFilter}
                        setProgressCountryFilter={setProgressCountryFilter}
                        setProgressPage={setProgressPage}
                        setProgressPageSize={setProgressPageSize}
                        setProgressRegionFilter={setProgressRegionFilter}
                        setProgressSearchQuery={setProgressSearchQuery}
                        setProgressSortDirection={setProgressSortDirection}
                        setProgressSortField={setProgressSortField}
                        setProgressStatusFilter={setProgressStatusFilter}
                        setResetPinError={setResetPinError}
                        setResetPinValue={setResetPinValue}
                        setSelectedInspectionHotelId={setSelectedInspectionHotelId}
                        setSubView={setSubView}
                        onBackToDashboard={() => { setSubView('dashboard'); setSearchQuery(''); }}
                    />
                ) : (
                    <HotelsView
                        confirmHotelDeleteId={confirmHotelDeleteId}
                        fetchHotelsFromSupabase={fetchHotelsFromSupabase}
                        filteredHotels={filteredHotels}
                        handleDeleteHotel={handleDeleteHotel}
                        handleOpenAddHotel={handleOpenAddHotel}
                        handleOpenEditHotel={handleOpenEditHotel}
                        hotelFilterBrand={hotelFilterBrand}
                        hotelFilterStars={hotelFilterStars}
                        hotelPageSize={hotelPageSize}
                        isSupabaseLoading={isSupabaseLoading}
                        masterHotelEndIndex={masterHotelEndIndex}
                        masterHotelStartIndex={masterHotelStartIndex}
                        paginatedHotels={paginatedHotels}
                        safeMasterHotelPage={safeMasterHotelPage}
                        searchQuery={searchQuery}
                        setConfirmHotelDeleteId={setConfirmHotelDeleteId}
                        setHotelFilterBrand={setHotelFilterBrand}
                        setHotelFilterStars={setHotelFilterStars}
                        setHotelPage={setHotelPage}
                        setHotelPageSize={setHotelPageSize}
                        setSearchQuery={setSearchQuery}
                        supabaseConnected={supabaseConnected}
                        supabaseErrorMsg={supabaseErrorMsg}
                        totalMasterHotelPages={totalMasterHotelPages}
                        totalMasterHotelsCount={totalMasterHotelsCount}
                        uniqueBrands={uniqueBrands}
                        uniqueStars={uniqueStars}
                        onBackToDashboard={() => { setSubView('dashboard'); setSearchQuery(''); }}
                    />
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
                const availableHotels = includedHotels.filter(h => !assignedHotelIds.includes(h.id));
                const assignedHotels = includedHotels.filter(h => assignedHotelIds.includes(h.id));

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
                                        {['General Manager', 'Hotel Manager', 'GM Secretary', 'Marcomm/PR', 'Graphic Design', 'Housekeeping', 'Room Division', 'Front Office', 'Sales & Marketing', 'Auditor', 'Director of Finance', 'Executive Housekeeper', 'Admin'].map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                                    <span>Assigned Hotel Properties</span>
                                    <span className="text-[10px] text-indigo-600 font-extrabold normal-case">
                                        {userFormHotelIds.length} properties selected
                                    </span>
                                </label>
                                
                                <div className="space-y-2">
                                    {/* Quick Search */}
                                    <input 
                                        type="text"
                                        placeholder="Filter properties... (e.g. Seef, Zest)"
                                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-lg outline-none transition-all placeholder:text-slate-450"
                                        value={adminHotelSearch}
                                        onChange={(e) => setAdminHotelSearch(e.target.value)}
                                    />
                                    
                                    {/* Scrollable multi-select container */}
                                    <div className="max-h-[160px] overflow-y-auto border border-slate-200 rounded-xl p-2.5 space-y-1 bg-slate-50 divide-y divide-slate-100">
                                        {includedHotels.filter(h => 
                                            h.name.toLowerCase().includes(adminHotelSearch.toLowerCase()) ||
                                            (h.code && h.code.toLowerCase().includes(adminHotelSearch.toLowerCase()))
                                        ).map(h => {
                                            const isChecked = userFormHotelIds.includes(h.id);
                                            return (
                                                <label 
                                                    key={h.id} 
                                                    className="flex items-start gap-2.5 py-2 px-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors"
                                                >
                                                    <input 
                                                        type="checkbox"
                                                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            if (isChecked) {
                                                                setUserFormHotelIds(userFormHotelIds.filter(id => id !== h.id));
                                                            } else {
                                                                setUserFormHotelIds([...userFormHotelIds, h.id]);
                                                            }
                                                        }}
                                                    />
                                                    <div className="min-w-0 leading-none">
                                                        <p className="text-xs font-black text-slate-750 truncate">{h.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                                                            {h.code || 'N/A'} - {h.region || 'Region'} - {h.brandClass || 'Brand'}
                                                        </p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                        {includedHotels.filter(h => 
                                            h.name.toLowerCase().includes(adminHotelSearch.toLowerCase()) ||
                                            (h.code && h.code.toLowerCase().includes(adminHotelSearch.toLowerCase()))
                                        ).length === 0 && (
                                            <p className="text-center py-4 text-slate-400 text-xs font-bold">No property matches search</p>
                                        )}
                                    </div>

                                    {/* Tag pills */}
                                    {userFormHotelIds.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                                            {includedHotels.filter(h => userFormHotelIds.includes(h.id)).map(h => (
                                                <span 
                                                    key={h.id}
                                                    className="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-bold text-indigo-950"
                                                >
                                                    <span>{h.code || h.name.slice(0, 8)}</span>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setUserFormHotelIds(userFormHotelIds.filter(id => id !== h.id))}
                                                        className="p-0.5 hover:bg-indigo-100 rounded text-indigo-500 hover:text-indigo-800 transition-colors"
                                                    >
                                                        <span className="text-[8px] font-black">×</span>
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
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

            {/* Confirm Approval & Send Webhook Modal */}
            {confirmApprovalUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-lg p-6 sm:p-8 rounded-[28px] border border-slate-200 shadow-2xl relative animate-scaleUp max-h-[90vh] flex flex-col overflow-y-auto">
                        <button 
                            onClick={() => setConfirmApprovalUser(null)}
                            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                                <ShieldCheck size={26} />
                            </div>
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">Confirm User Approval</h3>
                                <p className="text-xs text-slate-500 font-medium">Verify credentials and trigger notifications upon approval.</p>
                            </div>
                        </div>

                        {/* User Details */}
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 mb-5 space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">User Details</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                <div>
                                    <p className="text-slate-400 font-bold">Full Name</p>
                                    <p className="text-slate-800 font-black">
                                        {confirmApprovalUser.display_name || `${confirmApprovalUser.first_name || ''} ${confirmApprovalUser.last_name || ''}`.trim() || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-400 font-bold">Email Address</p>
                                    <p className="text-slate-800 font-mono font-bold break-all">{confirmApprovalUser.email}</p>
                                </div>
                                <div className="mt-1">
                                    <p className="text-slate-400 font-bold">Property Role / Level</p>
                                    <p className="text-slate-800 font-black">{confirmApprovalUser.role || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 font-bold">Access Level</p>
                                    <span className="inline-flex items-center px-2 py-0.5 mt-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-150/50">
                                        {confirmApprovalUser.access_level || 'auditee'}
                                    </span>
                                </div>
                                <div className="col-span-2 mt-1">
                                    <p className="text-slate-400 font-bold">Assigned Hotel Property</p>
                                    <p className="text-slate-800 font-black">{confirmApprovalUser.hotel_name || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Zapier Config Section */}
                        <div className="border border-indigo-100 bg-indigo-50/20 rounded-2xl p-4 sm:p-5 mb-6 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                                    <h4 className="text-[10px] font-black uppercase text-indigo-800 tracking-wider">Zapier Webhook Notification</h4>
                                </div>
                                <button 
                                    onClick={() => setIsEditingWebhookUrl(!isEditingWebhookUrl)}
                                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold uppercase tracking-wide flex items-center gap-1"
                                >
                                    {isEditingWebhookUrl ? 'Cancel Edit' : (webhookUrl ? 'Change URL' : 'Configure')}
                                </button>
                            </div>

                            {isEditingWebhookUrl ? (
                                <div className="space-y-2">
                                    <input 
                                        type="url"
                                        placeholder="https://hooks.zapier.com/hooks/catch/..."
                                        value={webhookUrl}
                                        onChange={(e) => {
                                            setWebhookUrl(e.target.value);
                                            localStorage.setItem('sbi_zapier_webhook_url', e.target.value);
                                        }}
                                        className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                                    />
                                    <p className="text-[10px] text-indigo-600 font-medium leading-normal">
                                        Webhook URL is saved automatically to local storage for persistent testing.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {webhookUrl ? (
                                        <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-indigo-100">
                                            <span className="text-[11px] font-mono font-medium text-slate-600 truncate flex-1">
                                                {webhookUrl}
                                            </span>
                                            <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                                                Connected
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 text-xs text-amber-800 flex gap-2">
                                            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-extrabold">No webhook URL configured yet</p>
                                                <p className="text-[11px] text-amber-700/90 leading-relaxed mt-0.5">
                                                    Approval notifications will be skipped. Click <strong className="cursor-pointer underline hover:text-amber-900" onClick={() => setIsEditingWebhookUrl(true)}>Configure</strong> to add your Zapier Catch Hook URL.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="text-[10px] text-slate-500 leading-relaxed">
                                Once approved, a secure JSON payload with the user's role, hotel, and approval metadata is posted to Zapier to automate email notifications.
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-2">
                            <button 
                                onClick={async () => {
                                    const userId = confirmApprovalUser.id;
                                    setConfirmApprovalUser(null);
                                    await executeApprovalStatusChange(userId, true);
                                }}
                                disabled={isSendingWebhook}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-3 rounded-full font-bold text-sm transition-all shadow-lg shadow-emerald-500/10 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSendingWebhook ? 'Processing...' : 'Confirm & Approve'}
                            </button>
                            <button 
                                onClick={() => setConfirmApprovalUser(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-full font-bold text-sm transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RESET PROGRESS SUPER ADMIN PIN MODAL */}
            {isResetPinModalOpen && hotelToReset && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-100 shadow-2xl relative animate-scaleUp">
                        {/* Close button */}
                        <button 
                            onClick={() => {
                                setIsResetPinModalOpen(false);
                                setResetPinValue('');
                                setResetPinError('');
                                setHotelToReset(null);
                            }}
                            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all animate-fadeIn"
                        >
                            <X size={18} />
                        </button>

                        <div className="text-center space-y-2 mb-6">
                            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                                <AlertCircle size={24} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Reset Audit Progress</h3>
                            <p className="text-xs text-rose-600 font-extrabold max-w-sm mx-auto uppercase tracking-wider bg-rose-50/50 py-1 px-3 rounded-lg border border-rose-100/50">
                                Warning: Highly Destructive
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                                This will permanently delete all completed task responses and uploaded evidence files for <span className="text-slate-900 font-extrabold">{hotelToReset.name}</span>.
                            </p>
                            <p className="text-[11px] text-slate-400 font-bold">
                                Please enter the <span className="text-indigo-600">Super Admin PIN</span> to proceed.
                            </p>
                        </div>

                        {/* PIN Entry Display */}
                        <div className="space-y-4">
                            {resetPinError && (
                                <p className="text-rose-500 text-xs text-center font-extrabold bg-rose-50/70 border border-rose-100 py-2 rounded-xl animate-pulse">
                                    {resetPinError}
                                </p>
                            )}

                            <div className="flex justify-center gap-2.5">
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                    <div 
                                        key={i} 
                                        className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                                            resetPinValue[i] 
                                                ? 'border-rose-500 bg-rose-50/40 text-rose-900 scale-105 shadow-xs' 
                                                : 'border-slate-200 bg-slate-50/30'
                                        }`}
                                    >
                                        {resetPinValue[i] ? '•' : ''}
                                    </div>
                                ))}
                            </div>

                            {/* PIN Virtual Keyboard */}
                            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto pt-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                                    <button
                                        key={digit}
                                        type="button"
                                        onClick={() => {
                                            if (resetPinValue.length < 6) {
                                                setResetPinValue(prev => prev + digit.toString());
                                                setResetPinError('');
                                            }
                                        }}
                                        className="h-12 bg-slate-50 hover:bg-slate-100/80 active:scale-95 border border-slate-150/40 text-slate-800 font-extrabold text-base rounded-2xl transition-all shadow-3xs"
                                    >
                                        {digit}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setResetPinValue('');
                                        setResetPinError('');
                                    }}
                                    className="h-12 bg-slate-100/60 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-extrabold text-[10px] uppercase tracking-wider rounded-2xl transition-all active:scale-95"
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (resetPinValue.length < 6) {
                                            setResetPinValue(prev => prev + '0');
                                            setResetPinError('');
                                        }
                                    }}
                                    className="h-12 bg-slate-50 hover:bg-slate-100/80 active:scale-95 border border-slate-150/40 text-slate-800 font-extrabold text-base rounded-2xl transition-all shadow-3xs"
                                >
                                    0
                                </button>
                                <button
                                    type="button"
                                    disabled={resetPinValue.length < 6 || isResetting}
                                    onClick={handleVerifyResetPin}
                                    className={`h-12 font-extrabold text-[10px] uppercase tracking-widest rounded-2xl transition-all active:scale-95 flex items-center justify-center ${
                                        resetPinValue.length === 6 && !isResetting
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    {isResetting ? (
                                        <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        "Confirm"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* V2 PROTECTION SUPER ADMIN PIN MODAL */}
            {isV2PinModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-100 shadow-2xl relative animate-scaleUp">
                        {/* Close button */}
                        <button 
                            onClick={() => {
                                setIsV2PinModalOpen(false);
                                setV2PinValue('');
                                setV2PinError('');
                            }}
                            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                        >
                            <X size={18} />
                        </button>

                        <div className="text-center space-y-2 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-xs">
                                <Lock size={22} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Protected Audit Inspection V2</h3>
                            <p className="text-xs text-indigo-700 font-extrabold max-w-sm mx-auto uppercase tracking-wider bg-indigo-50 py-1 px-3 rounded-lg border border-indigo-100/80">
                                Super Admin PIN Required
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                                Please enter the <span className="text-indigo-600 font-black">Super Admin PIN (230987)</span> to unlock Audit Inspection V2.
                            </p>
                        </div>

                        {/* PIN Entry Display */}
                        <div className="space-y-4">
                            {v2PinError && (
                                <p className="text-rose-500 text-xs text-center font-extrabold bg-rose-50/70 border border-rose-100 py-2 rounded-xl animate-pulse">
                                    {v2PinError}
                                </p>
                            )}

                            <div className="flex justify-center gap-2.5">
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                    <div 
                                        key={i} 
                                        className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                                            v2PinValue[i] 
                                                ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 scale-105 shadow-xs' 
                                                : 'border-slate-200 bg-slate-50/30'
                                        }`}
                                    >
                                        {v2PinValue[i] ? '•' : ''}
                                    </div>
                                ))}
                            </div>

                            {/* PIN Virtual Keyboard */}
                            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto pt-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                                    <button
                                        key={digit}
                                        type="button"
                                        onClick={() => {
                                            if (v2PinValue.length < 6) {
                                                const next = v2PinValue + digit.toString();
                                                setV2PinValue(next);
                                                setV2PinError('');
                                                if (next === '230987') {
                                                    setIsV2Unlocked(true);
                                                    try { sessionStorage.setItem('v2_unlocked', 'true'); } catch {}
                                                    setIsV2PinModalOpen(false);
                                                    setV2PinValue('');
                                                    setV2PinError('');
                                                    setSubView('inspection_v2');
                                                }
                                            }
                                        }}
                                        className="h-12 bg-slate-50 hover:bg-slate-100/80 active:scale-95 border border-slate-150/40 text-slate-800 font-extrabold text-base rounded-2xl transition-all shadow-3xs cursor-pointer"
                                    >
                                        {digit}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setV2PinValue('');
                                        setV2PinError('');
                                    }}
                                    className="h-12 bg-slate-100/60 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-extrabold text-[10px] uppercase tracking-wider rounded-2xl transition-all active:scale-95 cursor-pointer"
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (v2PinValue.length < 6) {
                                            const next = v2PinValue + '0';
                                            setV2PinValue(next);
                                            setV2PinError('');
                                            if (next === '230987') {
                                                setIsV2Unlocked(true);
                                                try { sessionStorage.setItem('v2_unlocked', 'true'); } catch {}
                                                setIsV2PinModalOpen(false);
                                                setV2PinValue('');
                                                setV2PinError('');
                                                setSubView('inspection_v2');
                                            }
                                        }
                                    }}
                                    className="h-12 bg-slate-50 hover:bg-slate-100/80 active:scale-95 border border-slate-150/40 text-slate-800 font-extrabold text-base rounded-2xl transition-all shadow-3xs cursor-pointer"
                                >
                                    0
                                </button>
                                <button
                                    type="button"
                                    disabled={v2PinValue.length < 6}
                                    onClick={handleVerifyV2Pin}
                                    className={`h-12 font-extrabold text-[10px] uppercase tracking-widest rounded-2xl transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                                        v2PinValue.length === 6
                                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    Unlock
                                </button>
                            </div>
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
                                referrerPolicy={enlargedImage.url?.startsWith('blob:') || enlargedImage.url?.startsWith('data:') ? undefined : 'no-referrer'} 
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
                            <button
                                onClick={() => setSqlModalTab('finalize')}
                                className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all ${
                                    sqlModalTab === 'finalize'
                                        ? 'bg-slate-800 text-white shadow-2xs'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Finalise & Submit Lock SQL
                            </button>
                            <button
                                onClick={() => setSqlModalTab('photolock')}
                                className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all ${
                                    sqlModalTab === 'photolock'
                                        ? 'bg-slate-800 text-white shadow-2xs'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Photo Temporary Lock SQL
                            </button>
                            <button
                                onClick={() => setSqlModalTab('indexes')}
                                className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all ${
                                    sqlModalTab === 'indexes'
                                        ? 'bg-emerald-800 text-white shadow-2xs'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Database Indexes & Performance SQL
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
                            ) : sqlModalTab === 'auditor' ? (
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
                            ) : sqlModalTab === 'finalize' ? (
                                <>
                                    <p className="text-slate-300 font-medium leading-relaxed">
                                        Execute the following SQL script in your <strong className="text-emerald-400">Supabase Dashboard → SQL Editor</strong> to enable permanent <strong className="text-emerald-400">Self-Audit Locking & Submission Finalisation</strong>:
                                    </p>

                                    <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                                        <button
                                            onClick={() => {
                                                const sqlText = `CREATE TABLE IF NOT EXISTS hotel_audit_status (\n    hotel_id VARCHAR(100) PRIMARY KEY,\n    is_finalized BOOLEAN DEFAULT false,\n    finalized_by VARCHAR(255),\n    finalized_at TIMESTAMP WITH TIME ZONE,\n    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL\n);\n\nALTER TABLE hotel_audit_status ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE hotel_audit_status ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Allow public read hotel_audit_status" ON hotel_audit_status FOR SELECT USING (true);\nCREATE POLICY "Allow public insert/update hotel_audit_status" ON hotel_audit_status FOR ALL USING (true);`;
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
{`-- Create table for hotel audit status (locking & finalisation)
CREATE TABLE IF NOT EXISTS hotel_audit_status (
    hotel_id VARCHAR(100) PRIMARY KEY,
    is_finalized BOOLEAN DEFAULT false,
    finalized_by VARCHAR(255),
    finalized_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security & set access policies
ALTER TABLE hotel_audit_status ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE hotel_audit_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read hotel_audit_status" ON hotel_audit_status FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update hotel_audit_status" ON hotel_audit_status FOR ALL USING (true);`}
                                        </pre>
                                    </div>
                                </>
                            ) : sqlModalTab === 'photolock' ? (
                                <>
                                    <p className="text-slate-300 font-medium leading-relaxed">
                                        Execute the following SQL script in your <strong className="text-emerald-400">Supabase Dashboard → SQL Editor</strong> to enable real-time <strong className="text-emerald-400">Temporary Photo-Taking Locking</strong>:
                                    </p>

                                    <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                                        <button
                                            onClick={() => {
                                                const sqlText = `CREATE TABLE IF NOT EXISTS audit_item_locks (\n    hotel_id VARCHAR(100) NOT NULL,\n    item_id VARCHAR(100) NOT NULL,\n    locked_by_name VARCHAR(255) NOT NULL,\n    locked_by_email VARCHAR(255) NOT NULL,\n    locked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,\n    PRIMARY KEY (hotel_id, item_id)\n);\n\nALTER TABLE audit_item_locks ENABLE ROW LEVEL SECURITY;\n\nDROP POLICY IF EXISTS "Allow public read audit_item_locks" ON audit_item_locks;\nCREATE POLICY "Allow public read audit_item_locks" ON audit_item_locks FOR SELECT USING (true);\n\nDROP POLICY IF EXISTS "Allow public write audit_item_locks" ON audit_item_locks;\nCREATE POLICY "Allow public write audit_item_locks" ON audit_item_locks FOR ALL USING (true);`;
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
{`-- Create table for temporary photo-taking locks
CREATE TABLE IF NOT EXISTS audit_item_locks (
    hotel_id VARCHAR(100) NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    locked_by_name VARCHAR(255) NOT NULL,
    locked_by_email VARCHAR(255) NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (hotel_id, item_id)
);

-- Enable Row Level Security & set access policies
ALTER TABLE audit_item_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read audit_item_locks" ON audit_item_locks;
CREATE POLICY "Allow public read audit_item_locks" ON audit_item_locks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write audit_item_locks" ON audit_item_locks;
CREATE POLICY "Allow public write audit_item_locks" ON audit_item_locks FOR ALL USING (true);`}
                                        </pre>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-slate-300 font-medium leading-relaxed">
                                        Execute the following SQL script in your <strong className="text-emerald-400">Supabase Dashboard → SQL Editor</strong> to create high-performance database indexes on all primary query columns (WHERE filters, foreign keys, and unique lookups):
                                    </p>

                                    <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                                        <button
                                            onClick={() => {
                                                const sqlText = `-- Complete Performance & Database Indexing Script for Swiss-Belhotel Brand Audit
-- Step 1: Ensure all required system tables and missing columns exist safely

CREATE TABLE IF NOT EXISTS public.audit_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id VARCHAR(100) NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    value TEXT,
    is_na BOOLEAN DEFAULT false,
    score NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(hotel_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.audit_users (
    id UUID PRIMARY KEY,
    email VARCHAR(255),
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'auditor',
    access_level VARCHAR(50) DEFAULT 'single_property',
    hotel_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.auditor_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    hotel_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.auditor_category_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    category_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, category_id)
);

-- Migration / Safeguards for existing tables
ALTER TABLE IF EXISTS public.audit_submissions ADD COLUMN IF NOT EXISTS auditor_notes TEXT;
ALTER TABLE IF EXISTS public.audit_submissions ADD COLUMN IF NOT EXISTS auditor_remarks TEXT;
ALTER TABLE IF EXISTS public.audit_submissions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS public.auditor_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE IF EXISTS public.audit_batch_hotels ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.audit_items ADD COLUMN IF NOT EXISTS options TEXT;

ALTER TABLE public.auditor_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select auditor_assignments" ON public.auditor_assignments;
CREATE POLICY "Allow public select auditor_assignments" ON public.auditor_assignments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert auditor_assignments" ON public.auditor_assignments;
CREATE POLICY "Allow public insert auditor_assignments" ON public.auditor_assignments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete auditor_assignments" ON public.auditor_assignments;
CREATE POLICY "Allow public delete auditor_assignments" ON public.auditor_assignments FOR DELETE USING (true);`;
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
{`-- Step 1: Ensure all required system tables exist safely

CREATE TABLE IF NOT EXISTS public.audit_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id VARCHAR(100) NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    value TEXT,
    is_na BOOLEAN DEFAULT false,
    score NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(hotel_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.audit_users (
    id UUID PRIMARY KEY,
    email VARCHAR(255),
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'auditor',
    access_level VARCHAR(50) DEFAULT 'single_property',
    hotel_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.auditor_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    hotel_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.auditor_category_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    category_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, category_id)
);

-- Enable RLS and add public access policies
ALTER TABLE public.auditor_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select auditor_assignments" ON public.auditor_assignments;
CREATE POLICY "Allow public select auditor_assignments" ON public.auditor_assignments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert auditor_assignments" ON public.auditor_assignments;
CREATE POLICY "Allow public insert auditor_assignments" ON public.auditor_assignments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete auditor_assignments" ON public.auditor_assignments;
CREATE POLICY "Allow public delete auditor_assignments" ON public.auditor_assignments FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.audit_checklist_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_ids TEXT[] DEFAULT '{}',
    item_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_group_hotels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES audit_checklist_groups(id) ON DELETE CASCADE,
    hotel_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, hotel_id)
);

CREATE TABLE IF NOT EXISTS public.audit_item_locks (
    hotel_id VARCHAR(100) NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    locked_by_name VARCHAR(255) NOT NULL,
    locked_by_email VARCHAR(255) NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (hotel_id, item_id)
);

-- Step 2: Create performance indexes on filtered query columns

-- 1. Submissions indexes for fast hotel & item lookups
CREATE INDEX IF NOT EXISTS idx_audit_submissions_hotel_id ON public.audit_submissions(hotel_id);
CREATE INDEX IF NOT EXISTS idx_audit_submissions_item_id ON public.audit_submissions(item_id);
CREATE INDEX IF NOT EXISTS idx_audit_submissions_hotel_item ON public.audit_submissions(hotel_id, item_id);

-- 2. User management & role access indexes
CREATE INDEX IF NOT EXISTS idx_audit_users_email ON public.audit_users(email);
CREATE INDEX IF NOT EXISTS idx_audit_users_access_level ON public.audit_users(access_level);
CREATE INDEX IF NOT EXISTS idx_audit_users_role ON public.audit_users(role);

-- 3. Auditor assignment indexes
CREATE INDEX IF NOT EXISTS idx_auditor_assignments_user_id ON public.auditor_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_auditor_assignments_hotel_id ON public.auditor_assignments(hotel_id);
CREATE INDEX IF NOT EXISTS idx_auditor_category_assignments_user_id ON public.auditor_category_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_auditor_category_assignments_cat_id ON public.auditor_category_assignments(category_id);

-- 4. Checklist groups & hotel junction indexes
CREATE INDEX IF NOT EXISTS idx_audit_group_hotels_group_id ON public.audit_group_hotels(group_id);
CREATE INDEX IF NOT EXISTS idx_audit_group_hotels_hotel_id ON public.audit_group_hotels(hotel_id);

-- 5. Audit item lock indexes
CREATE INDEX IF NOT EXISTS idx_audit_item_locks_hotel_item ON public.audit_item_locks(hotel_id, item_id);`}
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

                            <div className="space-y-3 mt-6 border-t border-slate-800 pt-6">
                                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                                    <span className="bg-emerald-900/50 text-emerald-400 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">3</span>
                                    Document Storage Bucket
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Execute this script to create the <strong className="text-emerald-400">documents</strong> storage bucket, enabling file uploads during the audit.
                                </p>
                                <pre className="bg-slate-900/80 p-4 rounded-xl text-[11px] font-mono text-emerald-300/90 whitespace-pre-wrap border border-slate-800/80 overflow-x-auto shadow-inner leading-relaxed">
{`-- Create 'documents' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'documents' );
CREATE POLICY "Public Uploads" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'documents' );
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'documents' );
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'documents' );`}
                                </pre>
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

            {/* Active Properties stats details modal */}
            {statsModalType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-lg p-6 rounded-3xl border border-slate-200 shadow-xl relative animate-scaleUp">
                        <button 
                            onClick={() => setStatsModalType(null)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
                        >
                            <X size={18} />
                        </button>

                        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${statsModalType === 'auditees' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></span>
                            {statsModalType === 'auditees' ? 'Hotels without Auditees' : 'Hotels without Brand Leads'}
                        </h3>
                        <p className="text-xs text-slate-500 mb-6 font-medium">
                            {statsModalType === 'auditees' 
                                ? 'The following properties currently do not have any registered or onboarded auditee user accounts.' 
                                : 'The following properties currently do not have a designated Brand Lead assigned.'}
                        </p>

                        <div className="space-y-4">
                            {/* Copy button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={() => {
                                        const matchingHotels = includedHotels.filter(hotel => {
                                            if (hotel.id === 'sbi-test' || hotel.id === 'sbi-dummy') return false;
                                            const matches = statsModalType === 'auditees' ? !profilesList.some(p => {
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
                                            }) : !profilesList.some(p => {
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
                                            return matches;
                                        });

                                        const textToCopy = matchingHotels.map(h => `- ${h.name}${h.code ? ` (#${h.code})` : ''}`).join('\n');
                                        navigator.clipboard.writeText(textToCopy);
                                        setStatsModalCopied(true);
                                        setTimeout(() => setStatsModalCopied(false), 2000);
                                    }}
                                    className={`px-4 py-2 text-xs font-bold rounded-xl shadow-sm border transition-all flex items-center gap-1.5 active:scale-95 ${
                                        statsModalCopied 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                            : 'bg-indigo-50 hover:bg-indigo-100/60 text-indigo-700 border-indigo-100'
                                    }`}
                                >
                                    {statsModalCopied ? (
                                        <>
                                            <Check size={13} />
                                            <span>Copied List!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={13} />
                                            <span>Copy Hotel List</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Hotel list container */}
                            <div className="border border-slate-100 rounded-2xl bg-slate-50/50 max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                                {(() => {
                                    const filteredList = includedHotels.filter(hotel => {
                                        if (hotel.id === 'sbi-test' || hotel.id === 'sbi-dummy') return false;
                                        const matches = statsModalType === 'auditees' ? !profilesList.some(p => {
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
                                        }) : !profilesList.some(p => {
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
                                        return matches;
                                    });

                                    if (filteredList.length === 0) {
                                        return (
                                            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                                                All active properties have been successfully assigned!
                                            </div>
                                        );
                                    }

                                    return filteredList.map((hotel) => (
                                        <div key={hotel.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate">{hotel.name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{hotel.location || 'Unknown Location'}</p>
                                            </div>
                                            {hotel.code && (
                                                <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50/75 border border-indigo-100 px-2 py-0.5 rounded-lg shrink-0">
                                                    #{hotel.code}
                                                </span>
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setStatsModalType(null)}
                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all active:scale-95"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
