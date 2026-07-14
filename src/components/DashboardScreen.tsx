import React, { useState, useEffect } from 'react';
import { Menu, CheckCircle, Clock, Edit3, Building, ChevronRight, ChevronDown, PlusCircle, LayoutDashboard, History, User, LogOut, FileText, Folder, Layers, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  onViewPending: () => void;
  userProfile?: any;
  onProfileUpdate?: (profile: any) => void;
  onLogout: () => void;
  onSwitchProperty?: () => void;
}

export default function DashboardScreen({ onViewPending, userProfile, onProfileUpdate, onLogout, onSwitchProperty }: DashboardProps) {
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [assignedBatches, setAssignedBatches] = useState<any[]>([]);
  const [isFetchingBatches, setIsFetchingBatches] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // Self-audit tasks statistics
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [remainingTasks, setRemainingTasks] = useState(0);

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
      // 1. Fetch hotels
      let hotels: any[] = [];
      try {
        const { data: hotelsData } = await supabase.from('hotels').select('*');
        if (hotelsData) {
          hotels = hotelsData.map((item: any) => ({
            id: item.id || '',
            name: item.name || item.hotel_name || '',
            location: item.location || item.city_country || '',
            code: item.code || ''
          }));
        }
      } catch (err) {
        console.warn("Could not fetch hotels in dashboard:", err);
      }

      // 2. Fetch categories
      const { data: catsData, error: catsError } = await supabase
        .from('audit_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (catsError) throw catsError;

      // 3. Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('audit_items')
        .select('*, audit_departments(name), audit_categories(name)');
      if (itemsError) throw itemsError;

      // 4. Determine target hotel identifiers
      const isAuditee = !!userProfile && userProfile.access_level !== 'admin' && userProfile.access_level !== 'auditor';
      const selectedHotelId = isAuditee ? (userProfile?.hotel_id || '') : (userProfile?.hotel_id || localStorage.getItem('selected_hotel_id') || '');

      const currentHotel = hotels.find(h => 
        String(h.id).toLowerCase() === String(selectedHotelId).toLowerCase() || 
        String(h.code).toLowerCase() === String(selectedHotelId).toLowerCase()
      );

      const possibleHotelIds = Array.from(new Set([
        selectedHotelId,
        String(selectedHotelId),
        currentHotel?.id ? String(currentHotel.id) : null,
        currentHotel?.code ? String(currentHotel.code) : null,
        userProfile?.hotel_id ? String(userProfile.hotel_id) : null,
        userProfile?.hotel_code ? String(userProfile.hotel_code) : null
      ].filter(Boolean) as string[]));

      const targetHotelIdsLower = new Set(possibleHotelIds.map(id => String(id).toLowerCase()));

      // 5. Fetch checklist groups and filter items
      let assignedCategoryIds: string[] | null = null;
      let assignedItemIds: string[] | null = null;

      try {
        const { data: groupsData } = await supabase.from('audit_checklist_groups').select('*');
        const { data: groupHotelsData } = await supabase.from('audit_group_hotels').select('*');

        if (groupsData && groupHotelsData) {
          const assignedGroupHotels = groupHotelsData.filter((gh: any) => 
            possibleHotelIds.some(phId => String(gh.hotel_id).toLowerCase() === String(phId).toLowerCase())
          );

          if (assignedGroupHotels.length > 0) {
            const groupIds = assignedGroupHotels.map((gh: any) => gh.group_id);
            const matchedGroups = groupsData.filter((g: any) => groupIds.includes(g.id));
            if (matchedGroups.length > 0) {
              const allCatIds = new Set<string>();
              const allItemIds = new Set<string>();
              matchedGroups.forEach((g: any) => {
                if (g.category_ids) {
                  g.category_ids.forEach((id: string) => allCatIds.add(String(id)));
                }
                if (g.item_ids) {
                  g.item_ids.forEach((id: string) => allItemIds.add(String(id)));
                }
              });
              assignedCategoryIds = Array.from(allCatIds);
              assignedItemIds = Array.from(allItemIds);
            }
          }
        }
      } catch (groupErr) {
        console.warn("Could not fetch checklist groups for filtering in dashboard:", groupErr);
      }

      // Fallback to local storage if DB is not set or empty
      if (!assignedCategoryIds || !assignedItemIds) {
        const savedGroups = localStorage.getItem('sbi_audit_groups_v2');
        if (savedGroups) {
          try {
            const parsedGroups = JSON.parse(savedGroups);
            const assignedGroups = parsedGroups.filter((g: any) => 
              g.hotelIds && g.hotelIds.some((hId: string) => 
                possibleHotelIds.some(phId => String(hId).toLowerCase() === String(phId).toLowerCase())
              )
            );

            if (assignedGroups.length > 0) {
              const allCatIds = new Set<string>();
              const allItemIds = new Set<string>();
              assignedGroups.forEach((g: any) => {
                const cids = g.categoryIds || g.category_ids || [];
                const iids = g.itemIds || g.item_ids || [];
                cids.forEach((id: string) => allCatIds.add(String(id)));
                iids.forEach((id: string) => allItemIds.add(String(id)));
              });
              assignedCategoryIds = Array.from(allCatIds);
              assignedItemIds = Array.from(allItemIds);
            }
          } catch (e) {}
        }
      }

      // 6. Fetch submissions to calculate completed vs total tasks
      let submittedItemIds = new Set<string>();
      try {
        let query = supabase.from('audit_submissions').select('item_id, hotel_id');
        if (possibleHotelIds.length > 0) {
          query = query.in('hotel_id', possibleHotelIds);
        }

        const { data: subsData, error: subsError } = await query;
        if (!subsError && subsData && Array.isArray(subsData)) {
          subsData.forEach((sub: any) => {
            const subHotelIdLower = String(sub.hotel_id || '').toLowerCase();
            const matchesHotel = targetHotelIdsLower.size === 0 || targetHotelIdsLower.has(subHotelIdLower);
            if (matchesHotel && sub.item_id !== undefined && sub.item_id !== null) {
              submittedItemIds.add(String(sub.item_id));
            }
          });
        } else {
          // Fallback fetch all submissions
          const { data: fallbackSubs } = await supabase.from('audit_submissions').select('item_id, hotel_id');
          if (fallbackSubs && Array.isArray(fallbackSubs)) {
            fallbackSubs.forEach((sub: any) => {
              const subHotelIdLower = String(sub.hotel_id || '').toLowerCase();
              if (targetHotelIdsLower.size === 0 || targetHotelIdsLower.has(subHotelIdLower)) {
                if (sub.item_id !== undefined && sub.item_id !== null) {
                  submittedItemIds.add(String(sub.item_id));
                }
              }
            });
          }
        }
      } catch (subErr) {
        console.warn("Could not fetch audit_submissions in dashboard:", subErr);
      }

      // 7. Filter items based on checklist group and active for hotel filled_by_hotel !== false
      const filtered = (itemsData || []).filter((item: any) => {
        // Must belong to category of group
        if (assignedCategoryIds && !assignedCategoryIds.includes(String(item.category_id))) {
          return false;
        }
        // Must belong to items of group
        if (assignedItemIds && !assignedItemIds.includes(String(item.id))) {
          return false;
        }
        // Must be filled by hotel
        return item.filled_by_hotel !== false && item.filled_by_hotel !== 'false';
      });

      const sortedData = filtered.sort((a: any, b: any) => {
        const sA = a.sort_order !== undefined && a.sort_order !== null ? Number(a.sort_order) : 999999;
        const sB = b.sort_order !== undefined && b.sort_order !== null ? Number(b.sort_order) : 999999;
        if (sA !== sB) {
          return sA - sB;
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      setAuditItems(sortedData);

      // Calculate task statistics
      const totalT = sortedData.length;
      let completedT = 0;
      sortedData.forEach((item: any) => {
        if (submittedItemIds.has(String(item.id))) {
          completedT++;
        }
      });

      setTotalTasks(totalT);
      setCompletedTasks(completedT);
      setRemainingTasks(totalT - completedT);

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
          const sA = a.sort_order !== undefined && a.sort_order !== null ? Number(a.sort_order) : 999999;
          const sB = b.sort_order !== undefined && b.sort_order !== null ? Number(b.sort_order) : 999999;
          if (sA !== sB) {
            return sA - sB;
          }
          return (a.name || '').localeCompare(b.name || '');
        });
        return {
          ...cat,
          items: sortedItems
        };
      }).sort((a, b) => {
        // Sort categories by sort_order, then name
        const sA = a.sort_order !== undefined && a.sort_order !== null ? Number(a.sort_order) : 999999;
        const sB = b.sort_order !== undefined && b.sort_order !== null ? Number(b.sort_order) : 999999;
        if (sA !== sB) {
          return sA - sB;
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
    <div className="min-h-screen pb-20 md:pb-8 pt-16 sm:pt-20 md:pt-16 bg-slate-50/50">
      <header className="fixed top-0 left-0 z-40 w-full flex justify-between items-center px-3 sm:px-4 py-2.5 sm:py-3 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3">
            <button className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full text-slate-600"><Menu size={18} className="sm:w-5 sm:h-5"/></button>
            <img src="https://i.ibb.co.com/WNB70XBz/sbi-logo.png" alt="Swiss-Belhotel Logo" className="h-8 sm:h-10" />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
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
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBITBWNBBtIG0rf-g2rSnXVh9VGHDvsAjvLTDjrE23xz1hJrCplqnz6Xn1zrgcgHMUmCMQ3IdgZhZbEuTf1ImpPe7qG_G1XAXu0U8ILiKm-G1yTVcT14BEf-0i6SdQv_STVs2afp2q-qyq_bFuTRUnJiG650ZgShhYGSpaReJ7UOabaT-pWAFjHSmW0zh7U8NDb86GS9JamBquf3kiqH527l8DSi5MchVDfG3Ynr9tQMnoQnBwmDHiGBzXeeSny3uJYmL-hopwk60g" alt="Profile" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-200" />
            </button>
            
            <button 
                onClick={onLogout}
                className="p-1 px-2 text-slate-500 hover:text-red-650 hover:bg-slate-100/80 rounded-lg transition-all font-bold text-xs flex items-center gap-1.5"
                title="Sign Out"
            >
                <LogOut size={15} />
                <span className="hidden md:inline">Sign Out</span>
            </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-2.5 sm:px-4 py-4 sm:py-8">
        <section className="mb-4 sm:mb-8">
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-indigo-600 text-[9px] sm:text-[10px] tracking-widest uppercase font-bold flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span>
                            {userProfile?.hotel_name || 'Swiss-Belhotel International'} 
                            {userProfile?.hotel_code ? ` (${userProfile.hotel_code})` : ''}
                        </span>
                        {onSwitchProperty && String(userProfile?.hotel_id || '').split(',').length > 1 && (
                            <button 
                                onClick={onSwitchProperty}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[8px] sm:text-[9px] font-extrabold uppercase rounded-md border border-indigo-150 transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                            >
                                <Building size={10} />
                                Switch Property
                            </button>
                        )}
                    </p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                        <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
                            Welcome, {userProfile?.first_name ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() : 'Property Team'}
                        </h2>
                        <button 
                            onClick={() => setIsEditProfileOpen(true)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Edit Profile Name"
                        >
                            <Edit3 size={14} className="sm:w-4 sm:h-4" />
                        </button>
                    </div>
                    {userProfile?.role && (
                        <p className="text-slate-500 text-[10px] sm:text-[11px] font-bold mt-0.5 sm:mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                            {userProfile.role}
                            {userProfile.is_brand_audit_lead && (
                                <span className="ml-1 px-1.5 py-0.5 bg-indigo-105 text-indigo-700 text-[8px] sm:text-[9px] font-extrabold uppercase rounded">
                                    Audit Lead
                                </span>
                            )}
                        </p>
                    )}
                </div>
            </div>
        </section>



        <section className="mb-6 sm:mb-10">
            <div 
              onClick={onViewPending} 
              className="bg-gradient-to-br from-emerald-50/80 via-emerald-50/30 to-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border-2 border-emerald-500/60 shadow-md cursor-pointer hover:border-emerald-600 hover:shadow-xl hover:scale-[1.005] transition-all duration-300 group relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
              title="Click to perform self-audit and upload evidence photos"
            >
                {/* Decorative background element */}
                <div className="absolute right-0 bottom-0 w-36 h-36 bg-emerald-100/50 rounded-full blur-3xl -z-10 group-hover:bg-emerald-100/70 transition-all duration-300" />
                
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-100/80 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                            <CheckCircle size={20}/>
                        </div>
                        <div>
                            <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">Self-Audit Portal</span>
                            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight mt-0.5">Checklist Progress</h3>
                        </div>
                    </div>

                    {/* Progress Bar & Stats */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                                {completedTasks} of {totalTasks} tasks completed
                            </span>
                            <span className="text-emerald-600 text-sm font-black">
                                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                            </span>
                        </div>
                        {/* Custom Progress Bar */}
                        <div className="w-full h-2.5 bg-slate-100/80 rounded-full overflow-hidden border border-slate-200/30">
                            <div 
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Detailed Counter Boxes */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-white/80 backdrop-blur-xs border border-emerald-100/60 p-3 rounded-xl flex items-center gap-3 shadow-xs">
                            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                                <CheckCircle size={14} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide leading-none">Completed</p>
                                <p className="text-sm font-extrabold text-slate-800 mt-1">{completedTasks} <span className="text-[10px] text-slate-400 font-bold">tasks</span></p>
                            </div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-xs border border-emerald-100/60 p-3 rounded-xl flex items-center gap-3 shadow-xs">
                            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                                <Clock size={14} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide leading-none">Remaining</p>
                                <p className="text-sm font-extrabold text-slate-800 mt-1">{remainingTasks} <span className="text-[10px] text-slate-400 font-bold">tasks</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Button/Indicator Block */}
                <div className="flex md:flex-col items-center justify-between md:justify-center md:items-end gap-3 border-t md:border-t-0 border-emerald-100/50 pt-4 md:pt-0 shrink-0">
                    <div className="text-left md:text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Self-Audit Checklist</p>
                        <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-0.5">
                            {totalTasks}
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider ml-1">tasks</span>
                        </p>
                    </div>
                    
                    <button className="bg-emerald-600 group-hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-500/10 group-hover:translate-x-1 transition-all">
                        <span>Continue</span>
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </section>

        <section>
            <div className="flex flex-col gap-2.5 sm:gap-4 mb-3 sm:mb-5">
                <div className="flex flex-col gap-0.5 sm:gap-1">
                    <h3 className="text-lg sm:text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
                        <span className="w-1.5 sm:w-2 h-5 sm:h-6 bg-indigo-600 rounded-full" />
                        Audit Checklist Directory
                    </h3>
                    <p className="text-slate-500 text-xs sm:text-sm font-medium">Organized by Department and Category</p>
                </div>
                
                {!isLoading && groupedData.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <button 
                            onClick={() => expandAll(groupedData)}
                            className="p-1 sm:p-1.5 px-2.5 sm:px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 sm:gap-1.5 outline-none active:scale-95 border border-indigo-100/30"
                        >
                            <Maximize2 size={11} />
                            Expand All
                        </button>
                        <button 
                            onClick={collapseAll}
                            className="p-1 sm:p-1.5 px-2.5 sm:px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 sm:gap-1.5 outline-none active:scale-95 border border-slate-200/50"
                        >
                            <Minimize2 size={11} />
                            Collapse All
                        </button>
                    </div>
                )}
            </div>



            <div className="space-y-3 sm:space-y-4">
                {isLoading ? (
                    <div className="text-center py-10 sm:py-12 text-slate-400 font-bold text-xs sm:text-sm animate-pulse flex flex-col items-center justify-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                        Loading audit directory...
                    </div>
                ) : groupedData.length === 0 ? (
                    <div className="text-center py-10 sm:py-12 text-slate-400 font-bold text-xs sm:text-sm bg-white rounded-xl sm:rounded-2xl border border-slate-200">No audit items found.</div>
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
