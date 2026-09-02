import React, { useState, useEffect, useMemo } from 'react';
import { 
  Menu, CheckCircle, Clock, Edit3, Building, ChevronRight, ChevronDown, PlusCircle, 
  LayoutDashboard, History, User, LogOut, FileText, Folder, Layers, Maximize2, Minimize2, 
  RefreshCw, Search, X, ChevronLeft, ChevronsLeft, ChevronsRight, CheckCircle2, AlertCircle, 
  XCircle, MinusCircle, MessageSquare, MessageSquareText, Eye, ExternalLink, ZoomIn, Copy, 
  Check, ShieldCheck, Download, AlertTriangle
} from 'lucide-react';
import { supabase, HOTELS_URL, HOTELS_KEY } from '../lib/supabase';
import { apiCache } from '../lib/cache';

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
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    const cachedTime = localStorage.getItem('sbi_dashboard_last_sync');
    return cachedTime ? new Date(cachedTime) : null;
  });
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [assignedBatches, setAssignedBatches] = useState<any[]>([]);
  const [isFetchingBatches, setIsFetchingBatches] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [expandedAuditItems, setExpandedAuditItems] = useState<Record<string, boolean>>({});

  // Submissions and auditor evaluation states for the Directory
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, any>>({});
  const [inspectionScores, setInspectionScores] = useState<Record<string, number | string>>({});
  const [inspectionComments, setInspectionComments] = useState<Record<string, string>>({});

  // Toggle single audit item expansion
  const toggleAuditItem = (itemId: string | number) => {
    const key = String(itemId);
    setExpandedAuditItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Compute inspection status, score, auditor feedback and submission data for an item
  const getItemInspectionData = (item: any) => {
    const checkHotelIds: string[] = [
      userProfile?.hotel_id,
      userProfile?.hotel_code,
      userProfile?.assigned_hotel_id,
      userProfile?.property_id,
      localStorage.getItem('sbi_selected_hotel_id') || '',
      localStorage.getItem('sbi_hotel_code') || '',
      ''
    ].filter((id): id is string => Boolean(id && String(id).trim().length > 0));

    const submission = submissionsMap[String(item.id)];

    // Priority 1: Check direct submission row loaded from DB
    let score: any = undefined;
    if (submission?.score !== undefined && submission?.score !== null) {
      score = submission.score;
    } else if (submission?.is_na === true || String(submission?.is_na) === 'true') {
      score = 'N/A';
    }

    // Priority 2: Check inspectionScores state map
    if (score === undefined) {
      for (const hId of checkHotelIds) {
        const key = `${hId}_${item.id}`;
        if (inspectionScores[key] !== undefined && inspectionScores[key] !== null) {
          score = inspectionScores[key];
          break;
        }
      }
    }

    if (score === undefined) {
      const matchingKey = Object.keys(inspectionScores).find(k => k.endsWith(`_${item.id}`));
      if (matchingKey) {
        score = inspectionScores[matchingKey];
      }
    }

    if (score === undefined && inspectionScores[String(item.id)] !== undefined) {
      score = inspectionScores[String(item.id)];
    }

    // Auditor remarks/notes: Priority 1: Direct DB Submission record fields (STRICTLY auditor_notes or auditor_remarks ONLY)
    let comment = '';
    if (submission?.auditor_notes && typeof submission.auditor_notes === 'string' && submission.auditor_notes.trim()) {
      comment = submission.auditor_notes.trim();
    } else if (submission?.auditor_remarks && typeof submission.auditor_remarks === 'string' && submission.auditor_remarks.trim()) {
      comment = submission.auditor_remarks.trim();
    }

    // Priority 2: Check inspectionComments map
    if (!comment) {
      for (const hId of checkHotelIds) {
        const key = `${hId}_${item.id}`;
        if (inspectionComments[key]) {
          comment = inspectionComments[key];
          break;
        }
      }
    }
    if (!comment) {
      const matchingKey = Object.keys(inspectionComments).find(k => k.endsWith(`_${item.id}`));
      if (matchingKey) {
        comment = inspectionComments[matchingKey];
      }
    }
    if (!comment && inspectionComments[String(item.id)]) {
      comment = inspectionComments[String(item.id)];
    }

    const itemMaxPoints = Number(item.points !== undefined && item.points !== null ? item.points : 5);
    const numScore = typeof score === 'number' ? score : (score !== undefined && !isNaN(Number(score)) ? Number(score) : null);

    const isPass = score !== undefined && score !== null && (
      score === 'PASS' ||
      score === 'pass' ||
      (itemMaxPoints > 0 && numScore === itemMaxPoints) ||
      (numScore !== null && numScore > 0) ||
      (itemMaxPoints === 0 && (score === 'PASS' || score === 'pass'))
    );

    const isFail = score !== undefined && score !== null && (
      score === 'FAIL' ||
      score === 'fail' ||
      (numScore !== null && numScore === 0 && itemMaxPoints > 0)
    );

    const isNA = score !== undefined && score !== null && (
      score === 'N/A' ||
      score === 'na' ||
      score === 'NA'
    );

    const isPending = score === undefined || score === null || score === '';

    let status: 'Passed' | 'Failed' | 'N/A' | 'Pending Inspection' = 'Pending Inspection';
    if (isPass) status = 'Passed';
    else if (isFail) status = 'Failed';
    else if (isNA) status = 'N/A';
    else status = 'Pending Inspection';

    return {
      status,
      score,
      itemMaxPoints,
      isPass,
      isFail,
      isNA,
      isPending,
      comment: (comment || '').trim(),
      submission
    };
  };

  // Sync inspection scores and comments from localStorage
  useEffect(() => {
    const syncLocalInspections = () => {
      try {
        const storedScores = localStorage.getItem('sbi_inspection_scores');
        if (storedScores) {
          setInspectionScores(prev => ({ ...JSON.parse(storedScores), ...prev }));
        }
        const storedComments = localStorage.getItem('sbi_inspection_comments');
        if (storedComments) {
          setInspectionComments(prev => ({ ...JSON.parse(storedComments), ...prev }));
        }
      } catch (e) {
        console.warn("Failed to read inspection storage:", e);
      }
    };

    syncLocalInspections();
    window.addEventListener('storage', syncLocalInspections);
    window.addEventListener('sbi_inspection_updated', syncLocalInspections);

    // Real-time synchronization of audit submissions, scores, and auditor remarks directly from Supabase DB
    const channel = supabase
      .channel('dashboard-audit-submissions-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'audit_submissions'
      }, () => {
        fetchAuditItems(false, false);
      })
      .subscribe();

    return () => {
      window.removeEventListener('storage', syncLocalInspections);
      window.removeEventListener('sbi_inspection_updated', syncLocalInspections);
      supabase.removeChannel(channel);
    };
  }, [userProfile?.hotel_id, userProfile?.hotel_code]);

  // Directory search & pagination state
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');
  const [directoryPage, setDirectoryPage] = useState<number>(1);
  const [directoryPageSize, setDirectoryPageSize] = useState<number>(10);

  // Reset directory pagination when search changes
  useEffect(() => {
    setDirectoryPage(1);
  }, [directorySearchQuery]);

  // Self-audit tasks statistics
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [remainingTasks, setRemainingTasks] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedPoints, setCompletedPoints] = useState(0);

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

  const fetchAuditItems = async (showSyncIndicator = false, forceRefresh = false) => {
    if (showSyncIndicator) {
      setIsSyncing(true);
    } else {
      setIsLoading(true);
    }

    if (forceRefresh) {
      // Invalidate relevant cache keys for fresh database synchronization
      apiCache.invalidate('dashboard_');
      apiCache.invalidate('audit_items');
      apiCache.invalidate('audit_categories');
      apiCache.invalidate('audit_departments');
    }

    try {
      // 1. Fetch hotels
      let hotels: any[] = [];
      try {
        hotels = await apiCache.getOrFetch<any[]>('dashboard_hotels', async () => {
          const response = await fetch(`${HOTELS_URL}hotels?select=*`, {
            headers: {
              'apikey': HOTELS_KEY,
              'Authorization': `Bearer ${HOTELS_KEY}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              return data.map((item: any) => ({
                id: item.id !== undefined && item.id !== null ? String(item.id) : '',
                name: item.name || item.hotel_name || '',
                location: item.location || item.city_country || '',
                code: item.code || ''
              }));
            }
          }
          return [];
        }, { forceRefresh });
      } catch (err) {
        console.warn("Could not fetch hotels in dashboard:", err);
      }

      // 2. Fetch categories
      const catsData = await apiCache.getOrFetch<any[]>('dashboard_categories', async () => {
        const { data, error } = await supabase
          .from('audit_categories')
          .select('id, name, sort_order')
          .order('sort_order', { ascending: true });
        if (error) throw error;
        return data || [];
      }, { forceRefresh });

      // 3. Fetch items
      const itemsData = await apiCache.getOrFetch<any[]>('dashboard_items', async () => {
        const { data, error } = await supabase
          .from('audit_items')
          .select('id, name, points, category_id, department_id, sort_order, filled_by_hotel, input_type, min_value, audit_departments(name), audit_categories(name, sort_order)');
        if (error) throw error;
        return data || [];
      }, { forceRefresh });

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
        const groupsResult = await apiCache.getOrFetch<any>('dashboard_groups', async () => {
          const { data: gData } = await supabase.from('audit_checklist_groups').select('*');
          const { data: ghData } = await supabase.from('audit_group_hotels').select('*');
          return { groupsData: gData || [], groupHotelsData: ghData || [] };
        }, { forceRefresh });

        const groupsData = groupsResult.groupsData;
        const groupHotelsData = groupsResult.groupHotelsData;

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

      // 6. Fetch submissions to calculate completed vs total tasks and show in directory
      let submittedItemIds = new Set<string>();
      let naItemIds = new Set<string>();
      const subsMap: Record<string, any> = {};
      const dbScores: Record<string, any> = {};
      const dbComments: Record<string, string> = {};

      const processSubmissionRow = (sub: any) => {
        if (!sub || sub.item_id === undefined || sub.item_id === null) return;
        const itemIdStr = String(sub.item_id);
        const hotelIdStr = String(sub.hotel_id || '');
        subsMap[itemIdStr] = sub;
        submittedItemIds.add(itemIdStr);
        if (sub.is_na === true || String(sub.is_na) === 'true') {
          naItemIds.add(itemIdStr);
        }

        // Direct DB inspection score / status
        if (sub.score !== undefined && sub.score !== null) {
          if (hotelIdStr) dbScores[`${hotelIdStr}_${itemIdStr}`] = sub.score;
          dbScores[itemIdStr] = sub.score;
        } else if (sub.is_na === true || String(sub.is_na) === 'true') {
          if (hotelIdStr) dbScores[`${hotelIdStr}_${itemIdStr}`] = 'N/A';
          dbScores[itemIdStr] = 'N/A';
        }

        // Direct DB auditor notes & remarks ONLY (strictly from auditor_notes or auditor_remarks)
        const remarkText = (sub.auditor_notes || sub.auditor_remarks || '').trim();
        if (remarkText) {
          if (hotelIdStr) dbComments[`${hotelIdStr}_${itemIdStr}`] = remarkText;
          dbComments[itemIdStr] = remarkText;
        }
      };

      try {
        let query = supabase.from('audit_submissions').select('*');
        if (possibleHotelIds.length > 0) {
          query = query.in('hotel_id', possibleHotelIds);
        }

        const { data: subsData, error: subsError } = await query;
        if (!subsError && subsData && Array.isArray(subsData)) {
          subsData.forEach((sub: any) => {
            const subHotelIdLower = String(sub.hotel_id || '').toLowerCase();
            const matchesHotel = targetHotelIdsLower.size === 0 || targetHotelIdsLower.has(subHotelIdLower);
            if (matchesHotel) {
              processSubmissionRow(sub);
            }
          });
        } else {
          // Fallback fetch all submissions
          const { data: fallbackSubs } = await supabase.from('audit_submissions').select('*');
          if (fallbackSubs && Array.isArray(fallbackSubs)) {
            fallbackSubs.forEach((sub: any) => {
              const subHotelIdLower = String(sub.hotel_id || '').toLowerCase();
              if (targetHotelIdsLower.size === 0 || targetHotelIdsLower.has(subHotelIdLower)) {
                processSubmissionRow(sub);
              }
            });
          }
        }
      } catch (subErr) {
        console.warn("Could not fetch audit_submissions in dashboard:", subErr);
      }

      if (Object.keys(dbScores).length > 0) {
        setInspectionScores(prev => ({ ...prev, ...dbScores }));
      }
      if (Object.keys(dbComments).length > 0) {
        setInspectionComments(prev => ({ ...prev, ...dbComments }));
      }

      // Merge any locally stored submission objects from localStorage for the active hotels
      try {
        const checkHotels = possibleHotelIds.length > 0 ? possibleHotelIds : [userProfile?.hotel_id, userProfile?.hotel_code, ''];
        (itemsData || []).forEach((item: any) => {
          const itemIdStr = String(item.id);
          if (!subsMap[itemIdStr]) {
            for (const hId of checkHotels) {
              if (!hId) continue;
              const localSubStr = localStorage.getItem(`sbi_audit_${hId}_${item.id}`);
              if (localSubStr) {
                try {
                  const parsed = JSON.parse(localSubStr);
                  if (parsed && (parsed.isSubmitted || parsed.value || parsed.is_na)) {
                    subsMap[itemIdStr] = parsed;
                    submittedItemIds.add(itemIdStr);
                    if (parsed.is_na === true || String(parsed.is_na) === 'true') {
                      naItemIds.add(itemIdStr);
                    }
                    break;
                  }
                } catch (pe) {}
              }
            }
          }
        });
      } catch (lsErr) {}

      setSubmissionsMap(subsMap);

      // 7. Filter items based on checklist group (including non-self audit items)
      const filtered = (itemsData || []).filter((item: any) => {
        // Must belong to category of group if any categories are assigned
        if (assignedCategoryIds && assignedCategoryIds.length > 0 && !assignedCategoryIds.includes(String(item.category_id))) {
          return false;
        }
        // Must belong to items of group if any items are assigned
        if (assignedItemIds && assignedItemIds.length > 0 && !assignedItemIds.includes(String(item.id))) {
          return false;
        }
        return true;
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

      // Calculate task statistics on self-audit items only (exempting N/A items)
      const selfAuditItems = sortedData.filter((item: any) => item.filled_by_hotel !== false && item.filled_by_hotel !== 'false');
      let completedT = 0;
      let totalT = 0;
      let totalP = 0;
      let completedP = 0;

      const storedScoresRaw = localStorage.getItem('sbi_inspection_scores');
      const inspectionScores = storedScoresRaw ? JSON.parse(storedScoresRaw) : {};

      selfAuditItems.forEach((item: any) => {
        const itemIdStr = String(item.id);
        let isNa = naItemIds.has(itemIdStr);

        // Also check local storage for target hotel IDs
        for (const hId of possibleHotelIds) {
          const localKey = `sbi_audit_${hId}_${item.id}`;
          const localStored = localStorage.getItem(localKey);
          if (localStored) {
            try {
              const parsed = JSON.parse(localStored);
              if (parsed.is_na === true || String(parsed.is_na) === 'true') {
                isNa = true;
              }
            } catch (e) {}
          }
        }

        // Determine if auditor approved N/A or made it N/A themselves
        let isAuditorNa = false;
        for (const hId of possibleHotelIds) {
          if (inspectionScores[`${hId}_${item.id}`] === 'N/A') {
            isAuditorNa = true;
            break;
          }
        }

        const pts = item.points !== undefined && item.points !== null ? Number(item.points) : 5;
        
        // If item is N/A (exempted by auditor), do NOT include it in total points or total task count
        // Otherwise, if auditee marked N/A but auditor has not approved, it does not reduce total possible score
        if (!isAuditorNa) {
          totalT++;
          totalP += pts;
          if (submittedItemIds.has(itemIdStr)) {
            completedT++;
            completedP += pts;
          }
        }
      });

      setTotalTasks(totalT);
      setCompletedTasks(completedT);
      setRemainingTasks(totalT - completedT);
      setTotalPoints(totalP);
      setCompletedPoints(completedP);

      const now = new Date();
      setLastSyncTime(now);
      try {
        localStorage.setItem('sbi_dashboard_last_sync', now.toISOString());
      } catch (e) {}

      if (forceRefresh) {
        setSyncSuccessMessage(`Successfully synced ${sortedData.length} items from database`);
        setTimeout(() => setSyncSuccessMessage(null), 3500);
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

  // Grouping auditItems by department, then category using useMemo
  const groupedData = useMemo(() => {
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
    return Object.values(departmentsMap).map(dept => {
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
  }, [auditItems]);

  const filteredGroupedData = useMemo(() => {
    if (!directorySearchQuery.trim()) return groupedData;
    const q = directorySearchQuery.toLowerCase();
    
    return groupedData.map(dept => {
      const matchDept = dept.name.toLowerCase().includes(q);
      const filteredCategories = dept.categories.map(cat => {
        const matchCat = cat.name.toLowerCase().includes(q);
        const filteredItems = cat.items.filter(item => 
          matchDept || matchCat || (item.name && item.name.toLowerCase().includes(q))
        );
        if (matchDept || matchCat || filteredItems.length > 0) {
          return { ...cat, items: matchDept || matchCat ? cat.items : filteredItems };
        }
        return null;
      }).filter(Boolean) as any[];

      if (matchDept || filteredCategories.length > 0) {
        return {
          ...dept,
          categories: matchDept ? dept.categories : filteredCategories
        };
      }
      return null;
    }).filter(Boolean) as any[];
  }, [groupedData, directorySearchQuery]);

  const totalDirectoryDepts = filteredGroupedData.length;
  const totalDirectoryPages = Math.max(1, Math.ceil(totalDirectoryDepts / directoryPageSize));
  const safeDirectoryPage = Math.min(Math.max(1, directoryPage), totalDirectoryPages);
  const directoryStartIndex = (safeDirectoryPage - 1) * directoryPageSize;
  const directoryEndIndex = Math.min(directoryStartIndex + directoryPageSize, totalDirectoryDepts);
  const paginatedDepts = filteredGroupedData.slice(directoryStartIndex, directoryEndIndex);

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

  // Stats calculation
  const totalDepts = groupedData.length;
  const totalCats = groupedData.reduce((acc, dept) => acc + dept.categories.length, 0);
  const totalItems = auditItems.length;

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
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-200 transition-colors">
                    <User size={15} />
                </div>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
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
                        <div className="bg-white/80 backdrop-blur-xs border border-emerald-100/60 p-3 rounded-xl flex items-center gap-3 shadow-xs col-span-2 sm:col-span-1">
                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Layers size={14} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide leading-none">Possible Score</p>
                                <p className="text-sm font-extrabold text-slate-800 mt-1">{completedPoints} <span className="text-[10px] text-slate-400 font-bold">/ {totalPoints} PTS</span></p>
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
            {/* Sync Success / Info Toast */}
            {syncSuccessMessage && (
                <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>{syncSuccessMessage}</span>
                    </div>
                    <button 
                        onClick={() => setSyncSuccessMessage(null)}
                        className="text-emerald-600 hover:text-emerald-800 p-0.5 rounded"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-5">
                <div className="flex flex-col gap-0.5 sm:gap-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg sm:text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
                            <span className="w-1.5 sm:w-2 h-5 sm:h-6 bg-indigo-600 rounded-full" />
                            Audit Checklist Directory
                        </h3>
                        {lastSyncTime && (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-md hidden md:inline-flex items-center gap-1">
                                <Clock size={10} className="text-slate-400" />
                                Cached {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 text-xs sm:text-sm font-medium">Organized by Department and Category</p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Sync with DB Button */}
                    <button 
                        onClick={() => fetchAuditItems(true, true)}
                        disabled={isSyncing || isLoading}
                        title="Fetch fresh data from database and update local cache"
                        className="p-1.5 sm:p-2 px-3 sm:px-3.5 bg-white hover:bg-slate-50 text-indigo-700 hover:text-indigo-800 border border-indigo-200/90 hover:border-indigo-300 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                        <RefreshCw size={13} className={`${isSyncing ? 'animate-spin text-indigo-600' : 'text-indigo-600'}`} />
                        <span>{isSyncing ? 'Syncing DB...' : 'Sync DB'}</span>
                    </button>

                    {!isLoading && groupedData.length > 0 && (
                        <>
                            <button 
                                onClick={() => expandAll(filteredGroupedData)}
                                className="p-1.5 sm:p-2 px-3 sm:px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 outline-none active:scale-95 border border-indigo-100/60 cursor-pointer"
                            >
                                <Maximize2 size={12} />
                                <span className="hidden xs:inline">Expand All</span>
                            </button>
                            <button 
                                onClick={collapseAll}
                                className="p-1.5 sm:p-2 px-3 sm:px-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 outline-none active:scale-95 border border-slate-200/60 cursor-pointer"
                            >
                                <Minimize2 size={12} />
                                <span className="hidden xs:inline">Collapse All</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Search Filter Bar */}
            {!isLoading && groupedData.length > 0 && (
                <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="relative w-full sm:w-80">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={directorySearchQuery}
                            onChange={(e) => setDirectorySearchQuery(e.target.value)}
                            placeholder="Search departments, categories, or items..."
                            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                        />
                        {directorySearchQuery && (
                            <button
                                onClick={() => setDirectorySearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-3 text-xs font-bold text-slate-500">
                        <span>Showing <strong className="text-slate-800">{totalDirectoryDepts}</strong> department{totalDirectoryDepts === 1 ? '' : 's'}</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">Per page:</span>
                            <select
                                value={directoryPageSize}
                                onChange={(e) => {
                                    setDirectoryPageSize(Number(e.target.value));
                                    setDirectoryPage(1);
                                }}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3 sm:space-y-4">
                {isLoading ? (
                    <div className="text-center py-10 sm:py-12 text-slate-400 font-bold text-xs sm:text-sm animate-pulse flex flex-col items-center justify-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                        Loading audit directory...
                    </div>
                ) : filteredGroupedData.length === 0 ? (
                    <div className="text-center py-10 sm:py-12 text-slate-400 font-bold text-xs sm:text-sm bg-white rounded-xl sm:rounded-2xl border border-slate-200">
                        {directorySearchQuery ? 'No matching audit items found for your search query.' : 'No audit items found.'}
                    </div>
                ) : (
                    paginatedDepts.map(dept => {
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
                                        {dept.categories.map((cat: any) => {
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
                                                                cat.items.map((item: any) => {
                                                                    const itemData = getItemInspectionData(item);
                                                                    const isItemExpanded = Boolean(expandedAuditItems[item.id]);

                                                                    return (
                                                                        <div 
                                                                            key={item.id} 
                                                                            className={`transition-colors duration-150 ${
                                                                                isItemExpanded ? 'bg-slate-50/50' : 'bg-white hover:bg-indigo-50/15'
                                                                            }`}
                                                                        >
                                                                            {/* Item Header / Summary Row */}
                                                                            <div 
                                                                                onClick={() => toggleAuditItem(item.id)}
                                                                                className="p-3 pl-5 pr-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer select-none"
                                                                            >
                                                                                {/* Left: Icon, Name & Feedback Icon */}
                                                                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                                                    <div className={`mt-0.5 shrink-0 transition-colors ${
                                                                                        isItemExpanded ? 'text-indigo-600' : 'text-slate-400'
                                                                                    }`}>
                                                                                        <FileText size={15} />
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                                            <p className={`font-semibold text-xs md:text-sm leading-relaxed transition-colors ${
                                                                                                isItemExpanded ? 'text-indigo-900' : 'text-slate-800'
                                                                                            }`}>
                                                                                                {item.name}
                                                                                            </p>
                                                                                            
                                                                                            {/* Feedback Icon / Badge if auditor left notes/remarks */}
                                                                                            {itemData.comment ? (
                                                                                                <span 
                                                                                                    title={`Auditor Remarks: "${itemData.comment}"`}
                                                                                                    className="inline-flex items-center gap-1 text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded shadow-2xs cursor-help animate-pulse hover:animate-none"
                                                                                                >
                                                                                                    <MessageSquareText size={11} className="text-indigo-600 shrink-0" />
                                                                                                    <span className="hidden sm:inline">Auditor Remark</span>
                                                                                                </span>
                                                                                            ) : null}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Right: Badges, Status & Expansion Chevron */}
                                                                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                                                                                    {(item.filled_by_hotel === false || item.filled_by_hotel === 'false') && (
                                                                                        <span className="text-[8px] sm:text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded whitespace-nowrap">
                                                                                            Auditor Only
                                                                                        </span>
                                                                                    )}
                                                                                    
                                                                                    <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200/70 px-1.5 py-0.5 rounded whitespace-nowrap">
                                                                                        {item.points || 0} PTS
                                                                                    </span>

                                                                                    {/* Inspection Result Badge */}
                                                                                    {itemData.status === 'Passed' && (
                                                                                        <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md whitespace-nowrap shadow-2xs">
                                                                                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                                                                            Passed
                                                                                        </span>
                                                                                    )}
                                                                                    {itemData.status === 'Failed' && (
                                                                                        <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md whitespace-nowrap shadow-2xs">
                                                                                            <AlertCircle size={12} className="text-rose-600 shrink-0" />
                                                                                            Failed
                                                                                        </span>
                                                                                    )}
                                                                                    {itemData.status === 'N/A' && (
                                                                                        <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md whitespace-nowrap shadow-2xs">
                                                                                            <MinusCircle size={12} className="text-amber-600 shrink-0" />
                                                                                            N/A
                                                                                        </span>
                                                                                    )}
                                                                                    {itemData.status === 'Pending Inspection' && (
                                                                                        <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md whitespace-nowrap">
                                                                                            <Clock size={12} className="text-slate-400 shrink-0" />
                                                                                            Pending Inspection
                                                                                        </span>
                                                                                    )}

                                                                                    <div className={`text-slate-400 transition-transform duration-200 ${
                                                                                        isItemExpanded ? 'rotate-180 text-indigo-600' : ''
                                                                                    }`}>
                                                                                        <ChevronDown size={15} />
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Expanded Item Details — Showing ONLY Auditor Notes/Remarks loaded directly from DB */}
                                                                            {isItemExpanded && (
                                                                                <div className="px-4 sm:px-6 py-4 bg-slate-50/70 border-t border-slate-150 animate-in fade-in duration-150">
                                                                                    <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
                                                                                        {/* Header: Evaluation Title & DB Inspection Result */}
                                                                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                                                                                    <ShieldCheck size={16} />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                                                                                                        Auditor Evaluation & Remarks
                                                                                                    </span>
                                                                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                                                                        Inspection findings loaded directly from database
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>

                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                                                                                                {itemData.status === 'Passed' && (
                                                                                                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
                                                                                                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                                                                                        PASSED ({itemData.score !== undefined && itemData.score !== null ? `${itemData.score} / ` : ''}{itemData.itemMaxPoints} PTS)
                                                                                                    </span>
                                                                                                )}
                                                                                                {itemData.status === 'Failed' && (
                                                                                                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
                                                                                                        <AlertCircle size={13} className="text-rose-600 shrink-0" />
                                                                                                        FAILED (0 / {itemData.itemMaxPoints} PTS)
                                                                                                    </span>
                                                                                                )}
                                                                                                {itemData.status === 'N/A' && (
                                                                                                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
                                                                                                        <MinusCircle size={13} className="text-amber-600 shrink-0" />
                                                                                                        EXEMPTED (N/A)
                                                                                                    </span>
                                                                                                )}
                                                                                                {itemData.status === 'Pending Inspection' && (
                                                                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                                                                                                        <Clock size={13} className="text-slate-400 shrink-0" />
                                                                                                        Pending Auditor Review
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Auditor Notes / Remarks Display */}
                                                                                        {itemData.comment ? (
                                                                                            <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-3.5 sm:p-4 space-y-2">
                                                                                                <div className="flex items-center gap-1.5 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                                                                                                    <MessageSquareText size={14} className="text-indigo-600 shrink-0" />
                                                                                                    <span>Auditor Notes / Remarks:</span>
                                                                                                </div>
                                                                                                <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed italic pl-3 border-l-2 border-indigo-400 bg-white/70 py-2 px-3 rounded-r-lg">
                                                                                                    "{itemData.comment}"
                                                                                                </p>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="flex items-center gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                                                                                                <MessageSquare size={15} className="text-slate-400 shrink-0" />
                                                                                                <span>
                                                                                                    {itemData.status === 'Pending Inspection' 
                                                                                                        ? 'Inspection pending review — No auditor remarks recorded yet.' 
                                                                                                        : 'No specific auditor notes or remarks recorded for this item.'}
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
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

            {/* Pagination Controls Footer */}
            {!isLoading && totalDirectoryDepts > 0 && totalDirectoryPages > 1 && (
                <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                    <p className="text-xs font-semibold text-slate-500">
                        Showing <strong className="text-slate-800">{directoryStartIndex + 1}</strong> to <strong className="text-slate-800">{directoryEndIndex}</strong> of <strong className="text-slate-800">{totalDirectoryDepts}</strong> departments
                    </p>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setDirectoryPage(1)}
                            disabled={safeDirectoryPage === 1}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            title="First Page"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                        <button
                            onClick={() => setDirectoryPage(prev => Math.max(1, prev - 1))}
                            disabled={safeDirectoryPage === 1}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            title="Previous Page"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: totalDirectoryPages }, (_, idx) => idx + 1)
                                .filter(p => p === 1 || p === totalDirectoryPages || Math.abs(p - safeDirectoryPage) <= 1)
                                .map((p, idx, arr) => {
                                    const prevPage = arr[idx - 1];
                                    const showEllipsis = prevPage && p - prevPage > 1;
                                    return (
                                        <React.Fragment key={p}>
                                            {showEllipsis && <span className="text-slate-400 text-xs px-1">...</span>}
                                            <button
                                                onClick={() => setDirectoryPage(p)}
                                                className={`min-w-[28px] h-7 px-2 text-xs font-extrabold rounded-lg transition-all ${
                                                    safeDirectoryPage === p
                                                        ? 'bg-indigo-600 text-white shadow-xs'
                                                        : 'text-slate-600 hover:bg-slate-100'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                        </div>

                        <button
                            onClick={() => setDirectoryPage(prev => Math.min(totalDirectoryPages, prev + 1))}
                            disabled={safeDirectoryPage === totalDirectoryPages}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            title="Next Page"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            onClick={() => setDirectoryPage(totalDirectoryPages)}
                            disabled={safeDirectoryPage === totalDirectoryPages}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            title="Last Page"
                        >
                            <ChevronsRight size={16} />
                        </button>
                    </div>
                </div>
            )}
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
