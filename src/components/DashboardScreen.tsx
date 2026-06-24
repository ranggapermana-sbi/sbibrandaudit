import React, { useState, useEffect } from 'react';
import { Menu, CheckCircle, Clock, Edit3, Building, ChevronRight, ChevronDown, PlusCircle, LayoutDashboard, History, User, LogOut, FileText, Folder, Layers, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  onViewPending: () => void;
  userProfile?: any;
  onProfileUpdate?: (profile: any) => void;
  onLogout: () => void;
}

export default function DashboardScreen({ onViewPending, userProfile, onProfileUpdate, onLogout }: DashboardProps) {
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [assignedBatches, setAssignedBatches] = useState<any[]>([]);
  const [isFetchingBatches, setIsFetchingBatches] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // Profile editing state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveProfileError, setSaveProfileError] = useState('');

  useEffect(() => {
    if (userProfile) {
      setEditFirstName(userProfile.first_name || '');
      setEditLastName(userProfile.last_name || '');
      setEditRole(userProfile.role || '');
    }
  }, [userProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFirstName.trim()) {
      setSaveProfileError('First Name is a mandatory requirement.');
      return;
    }
    
    setIsSavingProfile(true);
    setSaveProfileError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("No active Google Session detected.");
      }

      const userId = session.user.id;
      const updatedProfile = {
        ...userProfile,
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        role: editRole.trim(),
        updated_at: new Date().toISOString()
      };

      // Save locally immediately
      localStorage.setItem(`sbi_profile_${userId}`, JSON.stringify(updatedProfile));

      // Save to remote Supabase DB using fetch POST
      const mainUrl = import.meta.env.MAIN_SUPABASE_URL || 'https://gvnwxrejgdkixbszhxkw.supabase.co/rest/v1/';
      const cleanMainUrl = mainUrl.replace(/\/rest\/v1\/?$/, '').trim();
      const mainAnonKey = import.meta.env.MAIN_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bnd4cmVqZ2RraXhic3poeGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTE2ODcsImV4cCI6MjA5NDcyNzY4N30.Pvv9rgR_Vr9McwxLrYfELeSpWYLNH2NPw0nkeGD6ZXo';

      const res = await fetch(`${cleanMainUrl}/rest/v1/audit_users?on_conflict=id`, {
        method: 'POST',
        headers: {
          'apikey': mainAnonKey,
          'Authorization': `Bearer ${mainAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(updatedProfile)
      });

      if (!res.ok) {
        console.warn(`Database profiles write returned response status: ${res.status}. Falling back to local cache.`);
      }

      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }
      setIsEditProfileOpen(false);
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      setSaveProfileError(err.message || 'Failed to update profile. Please check your connection.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const fetchAuditItems = async (showSyncIndicator = false) => {
    if (showSyncIndicator) {
      setIsSyncing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from('audit_items')
        .select('*, audit_departments(name), audit_categories(name)');
        
      if (error) throw error;
      
      const sortedData = (data || []).sort((a: any, b: any) => {
        if (a.sort_order !== undefined && a.sort_order !== null && b.sort_order !== undefined && b.sort_order !== null) {
          return Number(a.sort_order) - Number(b.sort_order);
        }
        return (a.name || '').localeCompare(b.name || '');
      });
      
      setAuditItems(sortedData);

      // Auto-expand the first department and its categories by default on load
      if (sortedData.length > 0 && Object.keys(expandedDepts).length === 0) {
        const firstDeptId = sortedData[0].department_id || 'unassigned-dept';
        setExpandedDepts({ [firstDeptId]: true });
        
        const firstDeptCats = sortedData.filter(i => (i.department_id || 'unassigned-dept') === firstDeptId);
        if (firstDeptCats.length > 0) {
          const firstCatId = firstDeptCats[0].category_id || 'unassigned-cat';
          setExpandedCats({ [firstCatId]: true });
        }
      }
    } catch (err) {
      console.error('Error fetching audit items:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchAuditItems();

    // Subscribe to real-time changes on audit_items, audit_categories, and audit_departments
    const itemsChannel = supabase
      .channel('realtime-audit-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_items' },
        () => {
          console.log('Realtime change in audit_items. Syncing...');
          fetchAuditItems(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_categories' },
        () => {
          console.log('Realtime change in audit_categories. Syncing...');
          fetchAuditItems(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_departments' },
        () => {
          console.log('Realtime change in audit_departments. Syncing...');
          fetchAuditItems(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
    };
  }, []);

  // Fetch assigned batches for the user's hotel
  useEffect(() => {
    const fetchAssignedBatches = async () => {
      if (!userProfile?.hotel_id) return;
      setIsFetchingBatches(true);
      try {
        const mainUrl = import.meta.env.MAIN_SUPABASE_URL || 'https://gvnwxrejgdkixbszhxkw.supabase.co/rest/v1/';
        const cleanMainUrl = mainUrl.replace(/\/rest\/v1\/?$/, '').trim();
        const mainAnonKey = import.meta.env.MAIN_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bnd4cmVqZ2RraXhic3poeGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTE2ODcsImV4cCI6MjA5NDcyNzY4N30.Pvv9rgR_Vr9McwxLrYfELeSpWYLNH2NPw0nkeGD6ZXo';

        // 1. Fetch junction links for user's hotel_id
        const junctionRes = await fetch(`${cleanMainUrl}/rest/v1/audit_batch_hotels?hotel_id=eq.${userProfile.hotel_id}`, {
          headers: {
            'apikey': mainAnonKey,
            'Authorization': `Bearer ${mainAnonKey}`
          }
        });
        if (!junctionRes.ok) throw new Error("Failed to fetch batch mappings");
        const junctionData = await junctionRes.json();
        
        if (junctionData.length > 0) {
          const batchIds = junctionData.map((m: any) => m.batch_id);
          // 2. Fetch the actual batches
          const batchesRes = await fetch(`${cleanMainUrl}/rest/v1/audit_batches?id=in.(${batchIds.join(',')})`, {
            headers: {
              'apikey': mainAnonKey,
              'Authorization': `Bearer ${mainAnonKey}`
            }
          });
          if (batchesRes.ok) {
            const batchesData = await batchesRes.json();
            setAssignedBatches(batchesData);
          }
        } else {
          setAssignedBatches([]);
        }
      } catch (err) {
        console.error("Error fetching assigned batches:", err);
      } finally {
        setIsFetchingBatches(false);
      }
    };

    fetchAssignedBatches();
  }, [userProfile?.hotel_id]);

  // Grouping auditItems by department, then category
  const getGroupedData = () => {
    const departmentsMap: Record<string, {
      id: string;
      name: string;
      categoriesMap: Record<string, {
        id: string;
        name: string;
        sort_order?: number;
        items: any[];
      }>;
    }> = {};

    auditItems.forEach(item => {
      const deptId = item.department_id || 'unassigned-dept';
      const deptName = item.audit_departments?.name || 'General / Unassigned';
      
      const catId = item.category_id || 'unassigned-cat';
      const catName = item.audit_categories?.name || 'General Checklist';
      const catSortOrder = item.audit_categories?.sort_order;

      if (!departmentsMap[deptId]) {
        departmentsMap[deptId] = {
          id: deptId,
          name: deptName,
          categoriesMap: {}
        };
      }

      if (!departmentsMap[deptId].categoriesMap[catId]) {
        departmentsMap[deptId].categoriesMap[catId] = {
          id: catId,
          name: catName,
          sort_order: catSortOrder,
          items: []
        };
      }

      departmentsMap[deptId].categoriesMap[catId].items.push(item);
    });

    // Convert map to sorted arrays
    const sortedDepartments = Object.values(departmentsMap).map(dept => {
      const sortedCategories = Object.values(dept.categoriesMap).map(cat => {
        // Sort items by sort_order, then name
        const sortedItems = [...cat.items].sort((a, b) => {
          if (a.sort_order !== undefined && a.sort_order !== null && b.sort_order !== undefined && b.sort_order !== null) {
            return Number(a.sort_order) - Number(b.sort_order);
          }
          return (a.name || '').localeCompare(b.name || '');
        });
        return {
          ...cat,
          items: sortedItems
        };
      }).sort((a, b) => {
        // Sort categories by sort_order, then name
        if (a.sort_order !== undefined && a.sort_order !== null && b.sort_order !== undefined && b.sort_order !== null) {
          return Number(a.sort_order) - Number(b.sort_order);
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      return {
        ...dept,
        categories: sortedCategories
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return sortedDepartments;
  };

  const toggleDept = (deptId: string) => {
    setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const toggleCat = (catId: string) => {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const expandAll = (groupedData: any[]) => {
    const depts: Record<string, boolean> = {};
    const cats: Record<string, boolean> = {};
    groupedData.forEach(dept => {
      depts[dept.id] = true;
      dept.categories.forEach((cat: any) => {
        cats[cat.id] = true;
      });
    });
    setExpandedDepts(depts);
    setExpandedCats(cats);
  };

  const collapseAll = () => {
    setExpandedDepts({});
    setExpandedCats({});
  };

  const groupedData = getGroupedData();

  // Stats calculation
  const totalDepts = groupedData.length;
  const totalCats = groupedData.reduce((acc, dept) => acc + dept.categories.length, 0);
  const totalItems = auditItems.length;
  const totalPoints = auditItems.reduce((acc, item) => acc + (item.points || 0), 0);

  return (
    <div className="min-h-screen pb-24 md:pb-0 pt-20 md:pt-16 bg-transparent">
      <header className="fixed top-0 z-40 w-full flex justify-between items-center px-4 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><Menu size={20}/></button>
            <img src="https://i.ibb.co.com/WNB70XBz/sbi-logo.png" alt="Swiss-Belhotel Logo" className="h-10" />
        </div>
        <div className="flex items-center gap-3">
            <div 
                onClick={() => setIsEditProfileOpen(true)}
                className="text-right hidden sm:block cursor-pointer hover:opacity-80 transition-opacity"
                title="Edit Profile"
            >
                <p className="text-slate-850 text-xs font-extrabold leading-none flex items-center gap-1 justify-end">
                    {userProfile?.first_name ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() : 'Property User'}
                    <Edit3 size={11} className="text-slate-400" />
                </p>
                <p className="text-slate-400 text-[9px] uppercase tracking-wider font-bold mt-1">
                    {userProfile?.role || 'Team Member'}
                </p>
            </div>
            <button 
                onClick={() => setIsEditProfileOpen(true)}
                className="hover:scale-105 transition-transform duration-150 outline-none"
                title="Edit Profile"
            >
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBITBWNBBtIG0rf-g2rSnXVh9VGHDvsAjvLTDjrE23xz1hJrCplqnz6Xn1zrgcgHMUmCMQ3IdgZhZbEuTf1ImpPe7qG_G1XAXu0U8ILiKm-G1yTVcT14BEf-0i6SdQv_STVs2afp2q-qyq_bFuTRUnJiG650ZgShhYGSpaReJ7UOabaT-pWAFjHSmW0zh7U8NDb86GS9JamBquf3kiqH527l8DSi5MchVDfG3Ynr9tQMnoQnBwmDHiGBzXeeSny3uJYmL-hopwk60g" alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />
            </button>
            
            <button 
                onClick={onLogout}
                className="p-1 px-2.5 text-slate-500 hover:text-red-650 hover:bg-slate-100/80 rounded-lg transition-all font-bold text-xs flex items-center gap-1.5"
                title="Sign Out"
            >
                <LogOut size={15} />
                <span className="hidden md:inline">Sign Out</span>
            </button>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-4 py-8">
        <section className="mb-8">
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-indigo-600 text-[10px] tracking-widest uppercase font-bold">
                        {userProfile?.hotel_name || 'Swiss-Belhotel International'} 
                        {userProfile?.hotel_code ? ` (${userProfile.hotel_code})` : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <h2 className="text-2xl font-bold text-slate-900">
                            Welcome, {userProfile?.first_name ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() : 'Property Team'}
                        </h2>
                        <button 
                            onClick={() => setIsEditProfileOpen(true)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Edit Profile Name"
                        >
                            <Edit3 size={15} />
                        </button>
                    </div>
                    {userProfile?.role && (
                        <p className="text-slate-500 text-[11px] font-bold mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                            {userProfile.role}
                            {userProfile.is_brand_audit_lead && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-105 text-indigo-700 text-[9px] font-extrabold uppercase rounded">
                                    Audit Lead
                                </span>
                            )}
                        </p>
                    )}
                </div>
            </div>
        </section>

        {/* Assigned Batches / Schedules program sync */}
        {isFetchingBatches ? (
          <section className="mb-8 bg-white border border-slate-200/60 p-5 rounded-2xl animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
            <div className="h-10 bg-slate-100 rounded w-full" />
          </section>
        ) : assignedBatches.length > 0 ? (
          <section className="mb-8">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 pl-1 select-none">
              <Building size={13} className="text-slate-400" />
              Your Active Brand Audit Schedules ({assignedBatches.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assignedBatches.map((batch) => (
                <div key={batch.id} className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 p-5 rounded-[22px] border border-slate-800 text-white shadow-lg relative overflow-hidden group">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-300" />
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 bg-indigo-500/30 text-indigo-100 rounded-full select-none border border-indigo-400/10">
                      {batch.status || 'Active'}
                    </span>
                    <Clock size={15} className="text-slate-400" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-50 tracking-tight mb-1">{batch.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Property: {userProfile?.hotel_name}</p>
                </div>
              ))}
            </div>
          </section>
        ) : userProfile?.hotel_id ? (
          <section className="mb-8 bg-slate-50 border border-slate-200/60 p-5 rounded-2xl flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="font-extrabold text-sm text-slate-800 tracking-tight">No Active Audit Schedule Assigned</h4>
              <p className="text-xs text-slate-400 font-medium">Please coordinate with the Swiss-Belhotel International brand audit team to schedule your property.</p>
            </div>
            <span className="text-[9px] font-extrabold px-2.5 py-1.5 bg-slate-200 text-slate-500 rounded-lg uppercase tracking-wider select-none shrink-0">Unassigned</span>
          </section>
        ) : null}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div 
              onClick={onViewPending} 
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300 transition-all duration-200 hover:shadow-md group"
              title="Click to perform self-audit and upload evidence photos"
            >
                <div className="flex justify-between items-start mb-2">
                    <CheckCircle className="text-indigo-600" size={24}/>
                    <span className="text-indigo-600 text-[10px] font-extrabold bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider group-hover:scale-105 transition-transform">Start Self-Audit</span>
                </div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Self-Audit Checklist</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1 flex items-baseline gap-1.5">
                  {totalItems}
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">items</span>
                </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <Layers className="text-indigo-600" size={24}/>
                    <span className="text-slate-500 text-[10px] font-extrabold bg-slate-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Synced</span>
                </div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Checklist Categories</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1 flex items-baseline gap-1.5">
                  {totalCats}
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">groups</span>
                </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <Building className="text-indigo-600" size={24}/>
                    <span className="text-emerald-600 text-[10px] font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                      Live
                    </span>
                </div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Property Departments</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1 flex items-baseline gap-1.5">
                  {totalDepts}
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">areas</span>
                </p>
            </div>
        </section>

        <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="w-2 h-5 bg-indigo-600 rounded-full" />
                        Audit Checklist Directory
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5 font-medium">Organized by Department and Category</p>
                </div>
                
                {!isLoading && groupedData.length > 0 && (
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        <button 
                            onClick={() => fetchAuditItems(true)}
                            disabled={isSyncing}
                            className={`p-1.5 px-3 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 outline-none active:scale-95 border ${
                                isSyncing 
                                    ? 'bg-indigo-50 text-indigo-500 border-indigo-100/50 cursor-not-allowed' 
                                    : 'bg-white hover:bg-indigo-50 text-indigo-600 border-indigo-100/50 shadow-sm'
                            }`}
                            title="Sync checklist directory in real-time with remote database"
                        >
                            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                            {isSyncing ? 'Syncing...' : 'Sync with DB'}
                        </button>
                        <button 
                            onClick={() => expandAll(groupedData)}
                            className="p-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 outline-none active:scale-95 border border-indigo-100/30"
                        >
                            <Maximize2 size={12} />
                            Expand All
                        </button>
                        <button 
                            onClick={collapseAll}
                            className="p-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 outline-none active:scale-95 border border-slate-200/50"
                        >
                            <Minimize2 size={12} />
                            Collapse All
                        </button>
                    </div>
                )}
            </div>

            {/* Micro Stats Banner */}
            {!isLoading && groupedData.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center select-none">
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Departments</p>
                        <p className="text-lg font-extrabold text-slate-800 mt-0.5">{totalDepts}</p>
                    </div>
                    <div className="border-l border-slate-200/60">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Categories</p>
                        <p className="text-lg font-extrabold text-slate-800 mt-0.5">{totalCats}</p>
                    </div>
                    <div className="border-l border-slate-200/60">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Audit Items</p>
                        <p className="text-lg font-extrabold text-indigo-700 mt-0.5">{totalItems}</p>
                    </div>
                    <div className="border-l border-slate-200/60">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Points</p>
                        <p className="text-lg font-extrabold text-emerald-700 mt-0.5">{totalPoints} PTS</p>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-sm animate-pulse flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                        Loading audit directory...
                    </div>
                ) : groupedData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-sm bg-white rounded-2xl border border-slate-200">No audit items found.</div>
                ) : (
                    groupedData.map(dept => {
                        const isDeptExpanded = !!expandedDepts[dept.id];
                        const deptItemCount = dept.categories.reduce((acc: number, c: any) => acc + c.items.length, 0);
                        const deptPoints = dept.categories.reduce((acc: number, c: any) => acc + c.items.reduce((sum: number, i: any) => sum + (i.points || 0), 0), 0);

                        return (
                            <div key={dept.id} className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-300">
                                {/* Department Accordion Header */}
                                <div 
                                    onClick={() => toggleDept(dept.id)}
                                    className={`p-4 px-5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors duration-200 ${
                                        isDeptExpanded ? 'bg-indigo-50/40 border-b border-slate-100' : 'hover:bg-slate-50/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                                            isDeptExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            <Building size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 text-sm md:text-base tracking-tight truncate">
                                                {dept.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium flex items-center gap-1.5">
                                                <span>{dept.categories.length} {dept.categories.length === 1 ? 'category' : 'categories'}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                <span>{deptItemCount} checklist items</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {deptPoints} PTS
                                        </span>
                                        <div className={`p-1 rounded-lg text-slate-400 transition-transform duration-250 ${
                                            isDeptExpanded ? 'rotate-180 bg-indigo-50 text-indigo-600' : 'group-hover:bg-slate-100'
                                        }`}>
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                </div>

                                {/* Department Accordion Body (Contains Categories) */}
                                {isDeptExpanded && (
                                    <div className="p-4 bg-slate-50/30 border-t-0 space-y-3">
                                        {dept.categories.map(cat => {
                                            const isCatExpanded = !!expandedCats[cat.id];
                                            const catPoints = cat.items.reduce((sum: number, i: any) => sum + (i.points || 0), 0);

                                            return (
                                                <div key={cat.id} className="bg-white rounded-xl border border-slate-150 overflow-hidden transition-all duration-200">
                                                    {/* Category Header */}
                                                    <div 
                                                        onClick={() => toggleCat(cat.id)}
                                                        className={`p-3 px-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors duration-150 ${
                                                            isCatExpanded ? 'bg-slate-50 border-b border-slate-100' : 'hover:bg-slate-50/40'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={`p-1.5 rounded-lg shrink-0 ${
                                                                isCatExpanded ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'
                                                            }`}>
                                                                <Layers size={14} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-slate-800 text-xs md:text-sm tracking-tight truncate">
                                                                    {cat.name}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2.5 shrink-0">
                                                            <span className="text-[9px] font-bold text-indigo-605 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                                {cat.items.length} {cat.items.length === 1 ? 'item' : 'items'} ({catPoints} PTS)
                                                            </span>
                                                            <div className={`text-slate-400 transition-transform duration-200 ${
                                                                isCatExpanded ? 'rotate-180 text-indigo-500' : ''
                                                            }`}>
                                                                <ChevronDown size={14} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Category Body (Contains checklist items) */}
                                                    {isCatExpanded && (
                                                        <div className="divide-y divide-slate-100">
                                                            {cat.items.length === 0 ? (
                                                                <p className="p-3 text-[11px] italic text-slate-450 text-center select-none bg-slate-50/20">
                                                                    No checklist items in this category.
                                                                </p>
                                                            ) : (
                                                                cat.items.map(item => (
                                                                    <div 
                                                                        key={item.id} 
                                                                        className="p-3 pl-6 pr-4 flex items-start justify-between gap-3 bg-white hover:bg-indigo-50/10 transition-colors"
                                                                    >
                                                                        <div className="flex items-start gap-2.5 min-w-0">
                                                                            <div className="mt-0.5 text-slate-350 shrink-0">
                                                                                <FileText size={13} />
                                                                            </div>
                                                                            <p className="font-medium text-slate-700 text-xs md:text-sm leading-relaxed">
                                                                                {item.name}
                                                                            </p>
                                                                        </div>
                                                                        <span className="text-[9px] shrink-0 font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap self-center">
                                                                            {item.points || 0} PTS
                                                                        </span>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </section>
      </main>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-100 flex justify-around p-4 text-[10px] font-bold text-slate-400">
        <button className="flex flex-col items-center gap-1 text-slate-900"><LayoutDashboard size={20} /> Dashboard</button>
        <button className="flex flex-col items-center gap-1"><History size={20} /> History</button>
        <button 
          onClick={() => setIsEditProfileOpen(true)}
          className="flex flex-col items-center gap-1 hover:text-indigo-600 transition-colors"
        >
          <User size={20} /> Profile
        </button>
      </nav>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[32px] border border-slate-100 p-6 sm:p-8 w-full max-w-[440px] shadow-2xl relative animate-slideUp">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">Update Your Profile</h3>
            <p className="text-slate-400 text-xs mb-6">Change your first name, last name, and role for your Swiss-Belhotel account.</p>

            {saveProfileError && (
              <div className="mb-4 bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2 text-xs text-red-600 font-bold">
                {saveProfileError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-350 focus:bg-white rounded-xl px-4 py-3 text-slate-800 text-sm outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-350 focus:bg-white rounded-xl px-4 py-3 text-slate-800 text-sm outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                  Your Role
                </label>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="e.g. General Manager, Marcomm/PR"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-350 focus:bg-white rounded-xl px-4 py-3 text-slate-800 text-sm outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full font-bold text-xs tracking-wider transition-all uppercase border border-slate-200/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-xs tracking-wider transition-all uppercase shadow-lg hover:shadow-indigo-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
