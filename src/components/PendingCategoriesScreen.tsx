import React, { useState, useEffect } from 'react';
import { ChevronRight, FolderOpen, Loader2, CheckCircle2, Lock, Unlock, Send, Clock } from 'lucide-react';
import { supabase, HOTELS_URL, HOTELS_KEY } from '../lib/supabase';
import { DEFAULT_CATEGORIES, DEFAULT_OFFLINE_ITEMS } from '../lib/constants';

interface PendingCategoriesProps {
  onBack: () => void;
  onNavigate: (screen: 'brandingPropertyIdentification', category: any) => void;
  userProfile?: any;
}

export default function PendingCategoriesScreen({ onBack, onNavigate, userProfile }: PendingCategoriesProps) {
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hotels, setHotels] = useState<any[]>([]);

    const [isFinalized, setIsFinalized] = useState(false);
    const [finalizedBy, setFinalizedBy] = useState<string | null>(null);
    const [finalizedAt, setFinalizedAt] = useState<string | null>(null);
    const [isSubmittingFinalize, setIsSubmittingFinalize] = useState(false);

    const isAuditee = !!userProfile && userProfile.access_level !== 'admin' && userProfile.access_level !== 'auditor';
    const initialHotelId = isAuditee ? (userProfile?.hotel_id || '') : (userProfile?.hotel_id || localStorage.getItem('selected_hotel_id') || '');
    const [selectedHotelId, setSelectedHotelId] = useState<string>(initialHotelId);

    useEffect(() => {
        if (isAuditee && userProfile?.hotel_id) {
            setSelectedHotelId(userProfile.hotel_id);
        }
    }, [isAuditee, userProfile?.hotel_id]);

    useEffect(() => {
        const loadHotels = async () => {
            try {
                const response = await fetch(`${HOTELS_URL}hotels?select=*`, {
                    headers: {
                        'apikey': HOTELS_KEY,
                        'Authorization': `Bearer ${HOTELS_KEY}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        const mapped = data.map((item: any) => {
                            const rawId = item.id !== undefined && item.id !== null ? String(item.id) : '';
                            const fallbackId = item.hotel_id !== undefined && item.hotel_id !== null ? String(item.hotel_id) : '';
                            const finalId = rawId || fallbackId || item.code || String(item.name || '').replace(/\s+/g, '-').toLowerCase();
                            return {
                                id: finalId,
                                name: item.name || item.hotel_name || '',
                                location: item.location || item.city_country || '',
                                code: item.code || ''
                            };
                        });
                        const sorted = mapped.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
                        setHotels(sorted);
                        if (sorted.length > 0 && (!selectedHotelId || selectedHotelId === 'demo-hotel-123')) {
                            if (!isAuditee) {
                                setSelectedHotelId(sorted[0].id);
                                localStorage.setItem('selected_hotel_id', sorted[0].id);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error loading hotels:", err);
            }
        };
        loadHotels();
    }, []);

    const fetchCategoriesAndItems = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch categories
            const { data: catsData, error: catsError } = await supabase
                .from('audit_categories')
                .select('*')
                .order('sort_order', { ascending: true });
            if (catsError) throw catsError;

            // 2. Fetch items
            const { data: itemsData, error: itemsError } = await supabase
                .from('audit_items')
                .select('id, category_id, filled_by_hotel');
            if (itemsError) throw itemsError;

            // 2b. Fetch checklist groups and group hotel mappings to find the group of selectedHotelId
            let assignedCategoryIds: string[] | null = null;
            let assignedItemIds: string[] | null = null;
            let groupName: string | null = null;

            try {
                const { data: groupsData } = await supabase
                    .from('audit_checklist_groups')
                    .select('*');

                const { data: groupHotelsData } = await supabase
                    .from('audit_group_hotels')
                    .select('*');

                if (groupsData && groupHotelsData) {
                    const currentHotel = hotels.find(h => 
                        String(h.id).toLowerCase() === String(selectedHotelId).toLowerCase() || 
                        String(h.code).toLowerCase() === String(selectedHotelId).toLowerCase()
                    );
                    
                    const possibleHotelIds = Array.from(new Set([
                        selectedHotelId,
                        String(selectedHotelId),
                        currentHotel?.id ? String(currentHotel.id) : null,
                        currentHotel?.code ? String(currentHotel.code) : null
                    ].filter(Boolean) as string[]));

                    const assignedGroupHotels = groupHotelsData.filter((gh: any) => 
                        possibleHotelIds.some(phId => String(gh.hotel_id).toLowerCase() === String(phId).toLowerCase())
                    );

                    if (assignedGroupHotels.length > 0) {
                        const groupIds = assignedGroupHotels.map((gh: any) => gh.group_id);
                        const matchedGroups = groupsData.filter((g: any) => groupIds.includes(g.id));
                        if (matchedGroups.length > 0) {
                            groupName = matchedGroups.map((g: any) => g.name).join(', ');
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
                console.warn("Could not fetch checklist groups for filtering:", groupErr);
            }

            // Fallback to local storage if DB is not set or empty
            if (!assignedCategoryIds || !assignedItemIds) {
                const savedGroups = localStorage.getItem('sbi_audit_groups_v2');
                if (savedGroups) {
                    try {
                        const parsedGroups = JSON.parse(savedGroups);
                        const currentHotel = hotels.find(h => 
                            String(h.id).toLowerCase() === String(selectedHotelId).toLowerCase() || 
                            String(h.code).toLowerCase() === String(selectedHotelId).toLowerCase()
                        );
                        const possibleHotelIds = Array.from(new Set([
                            selectedHotelId,
                            String(selectedHotelId),
                            currentHotel?.id ? String(currentHotel.id) : null,
                            currentHotel?.code ? String(currentHotel.code) : null
                        ].filter(Boolean) as string[]));

                        const assignedGroups = parsedGroups.filter((g: any) => 
                            g.hotelIds && g.hotelIds.some((hId: string) => 
                                possibleHotelIds.some(phId => String(hId).toLowerCase() === String(phId).toLowerCase())
                            )
                        );

                        if (assignedGroups.length > 0) {
                            groupName = assignedGroups.map((g: any) => g.name).join(', ');
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

            // Filter categories based on group assignment
            const filteredCats = (catsData || []).filter((cat: any) => 
                !assignedCategoryIds || assignedCategoryIds.includes(String(cat.id))
            );

            // 3. Determine target hotel identifiers for selected property
            const currentHotel = hotels.find(h => 
                String(h.id).toLowerCase() === String(selectedHotelId).toLowerCase() || 
                String(h.code).toLowerCase() === String(selectedHotelId).toLowerCase()
            );

            const targetHotelIds = Array.from(new Set([
                selectedHotelId,
                String(selectedHotelId),
                currentHotel?.id ? String(currentHotel.id) : null,
                currentHotel?.code ? String(currentHotel.code) : null,
                userProfile?.hotel_id ? String(userProfile.hotel_id) : null,
                userProfile?.hotel_code ? String(userProfile.hotel_code) : null
            ].filter(Boolean) as string[]));

            const targetHotelIdsLower = new Set(targetHotelIds.map(id => String(id).toLowerCase()));

            // 4. Fetch submissions for target hotel
            let submittedItemIds = new Set<string>();

            try {
                let query = supabase.from('audit_submissions').select('item_id, hotel_id, value, is_na');
                if (targetHotelIds.length > 0) {
                    query = query.in('hotel_id', targetHotelIds);
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
                } else if (subsError) {
                    // Fallback to fetch all submissions if .in query fails
                    const { data: fallbackSubs } = await supabase.from('audit_submissions').select('item_id, hotel_id, value, is_na');
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
                console.warn("Could not fetch audit_submissions:", subErr);
            }

            // 5. Map categories and calculate completed vs total items for each category
            const mapped = filteredCats.map((cat: any) => {
                const catItems = (itemsData || []).filter((item: any) => 
                    String(item.category_id || '') === String(cat.id || '') && 
                    item.filled_by_hotel !== false && item.filled_by_hotel !== 'false' &&
                    (!assignedItemIds || assignedItemIds.includes(String(item.id)))
                );
                
                let completedCount = 0;
                catItems.forEach((item: any) => {
                    const itemIdStr = String(item.id);
                    let isCompleted = submittedItemIds.has(itemIdStr);

                    // Check local storage fallback for any target hotel ID
                    if (!isCompleted) {
                        for (const hId of targetHotelIds) {
                            const localKey = `sbi_audit_${hId}_${item.id}`;
                            const localStored = localStorage.getItem(localKey);
                            if (localStored) {
                                try {
                                    const parsed = JSON.parse(localStored);
                                    if (parsed.isSubmitted || parsed.value !== undefined || parsed.is_na !== undefined) {
                                        isCompleted = true;
                                        break;
                                    }
                                } catch (e) {}
                            }
                        }
                    }

                    if (isCompleted) {
                        completedCount++;
                    }
                });

                localStorage.setItem(`sbi_cat_completed_${cat.id}`, String(completedCount));
                
                return {
                    id: cat.id,
                    name: cat.name,
                    total: catItems.length,
                    completed: Math.min(completedCount, catItems.length)
                };
            }).filter((cat: any) => cat.total > 0);

            setCategories(mapped);
        } catch (err) {
            console.warn("Error syncing pending categories with DB, using offline fallback:", err);
            
            // Try loading from localStorage first, otherwise fallback to default constants
            const savedCats = localStorage.getItem('sbi_audit_categories_v2');
            let fallbackCats: any[] = [];
            if (savedCats) {
                try {
                    fallbackCats = JSON.parse(savedCats);
                } catch (e) {
                    fallbackCats = DEFAULT_CATEGORIES;
                }
            } else {
                fallbackCats = DEFAULT_CATEGORIES;
            }

            const savedItems = localStorage.getItem('sbi_audit_items_v2');
            let fallbackItems: any[] = [];
            if (savedItems) {
                try {
                    fallbackItems = JSON.parse(savedItems);
                } catch (e) {
                    fallbackItems = DEFAULT_OFFLINE_ITEMS;
                }
            } else {
                fallbackItems = DEFAULT_OFFLINE_ITEMS;
            }

            // Fallback for target hotel IDs
            const currentHotel = hotels.find(h => 
                String(h.id).toLowerCase() === String(selectedHotelId).toLowerCase() || 
                String(h.code).toLowerCase() === String(selectedHotelId).toLowerCase()
            );

            const targetHotelIds = Array.from(new Set([
                selectedHotelId,
                String(selectedHotelId),
                currentHotel?.id ? String(currentHotel.id) : null,
                currentHotel?.code ? String(currentHotel.code) : null,
                userProfile?.hotel_id ? String(userProfile.hotel_id) : null,
                userProfile?.hotel_code ? String(userProfile.hotel_code) : null
            ].filter(Boolean) as string[]));

            // Retrieve group filtering offline
            let assignedCategoryIds: string[] | null = null;
            let assignedItemIds: string[] | null = null;
            const savedGroups = localStorage.getItem('sbi_audit_groups_v2');
            if (savedGroups) {
                try {
                    const parsedGroups = JSON.parse(savedGroups);
                    const possibleHotelIds = Array.from(new Set([
                        selectedHotelId,
                        String(selectedHotelId),
                        currentHotel?.id ? String(currentHotel.id) : null,
                        currentHotel?.code ? String(currentHotel.code) : null
                    ].filter(Boolean) as string[]));

                    const assignedGroup = parsedGroups.find((g: any) => 
                        g.hotelIds && g.hotelIds.some((hId: string) => 
                            possibleHotelIds.some(phId => String(hId).toLowerCase() === String(phId).toLowerCase())
                        )
                    );

                    if (assignedGroup) {
                        assignedCategoryIds = assignedGroup.categoryIds || [];
                        assignedItemIds = assignedGroup.itemIds || [];
                    }
                } catch (e) {}
            }

            const filteredFallbackCats = fallbackCats.filter((cat: any) =>
                !assignedCategoryIds || assignedCategoryIds.includes(String(cat.id))
            );

            const mappedFallback = filteredFallbackCats.map((cat: any) => {
                const catItems = fallbackItems.filter((item: any) => 
                    String(item.category_id || item.categoryId || '') === String(cat.id || '') &&
                    (!assignedItemIds || assignedItemIds.includes(String(item.id)))
                );
                
                let completedCount = 0;
                catItems.forEach((item: any) => {
                    let isCompleted = false;
                    for (const hId of targetHotelIds) {
                        const localKey = `sbi_audit_${hId}_${item.id}`;
                        const localStored = localStorage.getItem(localKey);
                        if (localStored) {
                            try {
                                const parsed = JSON.parse(localStored);
                                if (parsed.isSubmitted || parsed.value !== undefined || parsed.is_na !== undefined) {
                                    isCompleted = true;
                                    break;
                                }
                            } catch (e) {}
                        }
                    }
                    if (isCompleted) {
                        completedCount++;
                    }
                });
                
                localStorage.setItem(`sbi_cat_completed_${cat.id}`, String(completedCount));

                return {
                    id: cat.id,
                    name: cat.name,
                    total: catItems.length,
                    completed: Math.min(completedCount, catItems.length)
                };
            }).filter((cat: any) => cat.total > 0);

            setCategories(mappedFallback);
        } finally {
            setIsLoading(false);
        }
    };

    const checkFinalizedStatus = async () => {
        if (!selectedHotelId) return;
        try {
            const { data, error } = await supabase
                .from('hotel_audit_status')
                .select('*')
                .eq('hotel_id', selectedHotelId)
                .maybeSingle();
            
            if (error) {
                console.warn("Could not fetch finalized status:", error);
                const localFinalized = localStorage.getItem(`sbi_audit_finalized_${selectedHotelId}`) === 'true';
                setIsFinalized(localFinalized);
                if (localFinalized) {
                    setFinalizedBy(localStorage.getItem(`sbi_audit_finalized_by_${selectedHotelId}`) || 'Self');
                    setFinalizedAt(localStorage.getItem(`sbi_audit_finalized_at_${selectedHotelId}`) || new Date().toISOString());
                } else {
                    setFinalizedBy(null);
                    setFinalizedAt(null);
                }
            } else if (data) {
                setIsFinalized(!!data.is_finalized);
                setFinalizedBy(data.finalized_by || null);
                setFinalizedAt(data.finalized_at || null);
                localStorage.setItem(`sbi_audit_finalized_${selectedHotelId}`, String(!!data.is_finalized));
                if (data.finalized_by) localStorage.setItem(`sbi_audit_finalized_by_${selectedHotelId}`, data.finalized_by);
                if (data.finalized_at) localStorage.setItem(`sbi_audit_finalized_at_${selectedHotelId}`, data.finalized_at);
            } else {
                setIsFinalized(false);
                setFinalizedBy(null);
                setFinalizedAt(null);
                localStorage.setItem(`sbi_audit_finalized_${selectedHotelId}`, 'false');
                localStorage.removeItem(`sbi_audit_finalized_by_${selectedHotelId}`);
                localStorage.removeItem(`sbi_audit_finalized_at_${selectedHotelId}`);
            }
        } catch (err) {
            console.warn("Error checking finalized status:", err);
            const localFinalized = localStorage.getItem(`sbi_audit_finalized_${selectedHotelId}`) === 'true';
            setIsFinalized(localFinalized);
            if (localFinalized) {
                setFinalizedBy(localStorage.getItem(`sbi_audit_finalized_by_${selectedHotelId}`) || 'Self');
                setFinalizedAt(localStorage.getItem(`sbi_audit_finalized_at_${selectedHotelId}`) || new Date().toISOString());
            }
        }
    };

    const handleFinalize = async () => {
        if (!selectedHotelId) return;
        const confirmMsg = `Are you sure you want to finalise and submit your self-audit?\n\nTasks Completed: ${totalCompleted} / ${totalTasks}\n\nOnce finalised, you cannot submit or edit any evidence or responses again unless updated/unlocked by an admin.`;
        if (!window.confirm(confirmMsg)) return;

        setIsSubmittingFinalize(true);
        const submitterName = userProfile?.full_name || userProfile?.email || 'Hotel Representative';
        const finalizedDate = new Date().toISOString();

        try {
            const { error } = await supabase
                .from('hotel_audit_status')
                .upsert({
                    hotel_id: selectedHotelId,
                    is_finalized: true,
                    finalized_at: finalizedDate,
                    finalized_by: submitterName,
                    updated_at: finalizedDate
                }, { onConflict: 'hotel_id' });

            if (error) {
                console.warn("Database save failed, using local storage fallback for finalized status:", error);
                if (error.code === '42P01') {
                    alert("Self-audit finalised in offline fallback. To enable live sync, please ask your admin to run the SQL migration in Supabase.");
                } else {
                    alert("Failed to submit to database: " + error.message + ". Finalised offline.");
                }
            }

            // Always save to localStorage as fallback
            localStorage.setItem(`sbi_audit_finalized_${selectedHotelId}`, 'true');
            localStorage.setItem(`sbi_audit_finalized_by_${selectedHotelId}`, submitterName);
            localStorage.setItem(`sbi_audit_finalized_at_${selectedHotelId}`, finalizedDate);

            setIsFinalized(true);
            setFinalizedBy(submitterName);
            setFinalizedAt(finalizedDate);
        } catch (err) {
            console.error(err);
            alert("An error occurred during finalisation.");
        } finally {
            setIsSubmittingFinalize(false);
        }
    };

    const handleUnlockByAdmin = async () => {
        if (!selectedHotelId) return;
        if (!window.confirm("Admin/Auditor: Are you sure you want to unlock this self-audit? This will allow the hotel to edit and submit evidence again.")) return;

        setIsSubmittingFinalize(true);
        try {
            const { error } = await supabase
                .from('hotel_audit_status')
                .upsert({
                    hotel_id: selectedHotelId,
                    is_finalized: false,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'hotel_id' });

            if (error) {
                console.warn("Database unlock failed, using local storage fallback:", error);
            }

            localStorage.setItem(`sbi_audit_finalized_${selectedHotelId}`, 'false');
            localStorage.removeItem(`sbi_audit_finalized_by_${selectedHotelId}`);
            localStorage.removeItem(`sbi_audit_finalized_at_${selectedHotelId}`);

            setIsFinalized(false);
            setFinalizedBy(null);
            setFinalizedAt(null);
        } catch (err) {
            console.error(err);
            alert("An error occurred.");
        } finally {
            setIsSubmittingFinalize(false);
        }
    };

    useEffect(() => {
        fetchCategoriesAndItems();
        checkFinalizedStatus();
    }, [selectedHotelId, hotels]);

    const totalTasks = categories.reduce((sum, c) => sum + c.total, 0);
    const totalCompleted = categories.reduce((sum, c) => sum + c.completed, 0);
    const progress = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

    return (
        <div className="min-h-screen pt-16 sm:pt-20 pb-8 bg-slate-50/50 px-2 sm:px-4">
            <header className="fixed top-0 left-0 z-40 w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
                <button onClick={onBack} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full text-slate-600">
                    <ChevronRight className="rotate-180" size={20} />
                </button>
                <h1 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight ml-2.5 sm:ml-4">Self-Audit Pending Tasks</h1>
            </header>
            <main className="max-w-4xl mx-auto py-3 sm:py-5 px-1 sm:px-3 space-y-3 sm:space-y-4">
                {isFinalized && (
                    <div className="bg-amber-50 border border-amber-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs flex items-start gap-3 animate-fadeIn mb-1">
                        <Lock className="text-amber-600 shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-xs font-black text-amber-850">Self-Audit Finalised & Locked</p>
                            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                                This property's self-audit is finalised and locked for editing. You cannot upload new evidence, change inputs, or edit notes unless an administrator unlocks the property.
                            </p>
                        </div>
                    </div>
                )}

                {/* For Auditees, show assigned hotel */}
                {isAuditee && (
                    userProfile?.hotel_id ? (
                        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs space-y-1 animate-fadeIn">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                                <span className="text-[9px] sm:text-[10px] font-black text-indigo-700 uppercase tracking-widest block">Representing Property (Auditee Mode)</span>
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-slate-800">
                                {userProfile?.hotel_name || hotels.find(h => String(h.id) === String(selectedHotelId) || String(h.code) === String(selectedHotelId))?.name || 'Your Assigned Hotel'}
                            </p>
                        </div>
                    ) : null
                )}

                {/* Property selector for Admin/Auditor */}
                {!isAuditee && (!userProfile?.hotel_id || userProfile?.access_level === 'admin' || userProfile?.access_level === 'auditor') && hotels.length > 0 && (
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs space-y-2 animate-fadeIn">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest block">Select Representing Property (Auditor Mode)</label>
                        </div>
                        <div className="relative">
                            <select
                                value={selectedHotelId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedHotelId(val);
                                    localStorage.setItem('selected_hotel_id', val);
                                }}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-lg text-xs sm:text-sm text-slate-800 outline-none transition-all appearance-none cursor-pointer font-bold"
                            >
                                {hotels.map(h => (
                                    <option key={h.id} value={h.id}>{h.name} ({h.code || 'CODE'})</option>
                                ))}
                            </select>
                            <span className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                                <ChevronRight className="rotate-90" size={16} />
                            </span>
                        </div>
                    </div>
                )}

                <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm mb-4 sm:mb-6">
                    <h2 className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Overall Self-Audit Progress</h2>
                    <p className="text-2xl sm:text-4xl font-bold text-slate-900 mt-1 sm:mt-2">
                        {totalCompleted} <span className="text-xs sm:text-base text-slate-400 font-normal">/ {totalTasks} tasks completed</span>
                    </p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2 mt-3 sm:mt-4 overflow-hidden">
                        <div className="bg-indigo-600 h-1.5 sm:h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-xs sm:text-sm animate-pulse flex flex-col items-center justify-center gap-2 bg-white rounded-xl sm:rounded-2xl border border-slate-200">
                        <Loader2 className="animate-spin text-indigo-600" size={24} />
                        Syncing categories and checklist counters...
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-xs sm:text-sm bg-white rounded-xl sm:rounded-2xl border border-slate-200">
                        No audit categories found in the database.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                        {categories.map((category) => {
                            const catProgress = category.total > 0 ? (category.completed / category.total) * 100 : 0;
                            const isAllDone = category.completed === category.total && category.total > 0;
                            const isPartiallyDone = category.completed > 0 && category.completed < category.total;

                            return (
                                <div 
                                    key={category.id} 
                                    className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group active:scale-[0.99] flex flex-col justify-between"
                                    onClick={() => onNavigate('brandingPropertyIdentification', category)}
                                >
                                    <div className="flex justify-between items-start mb-2.5 sm:mb-3">
                                        <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 pr-2">
                                            <FolderOpen size={16} className={`mt-0.5 shrink-0 ${isAllDone ? 'text-emerald-500' : 'text-indigo-500'}`} />
                                            <span className="text-xs sm:text-sm font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                                                {category.name}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:py-1 rounded-md whitespace-nowrap flex items-center gap-1 ${
                                            isAllDone
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-black'
                                                : isPartiallyDone
                                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold'
                                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                                        }`}>
                                            {isAllDone && <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />}
                                            {category.completed}/{category.total} submitted
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
                                        <div 
                                            className={`h-1.5 rounded-full transition-all duration-500 ${
                                                isAllDone ? 'bg-emerald-500' : 'bg-indigo-600'
                                            }`} 
                                            style={{ width: `${catProgress}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Finalise & Submit Button at the bottom */}
                {!isLoading && categories.length > 0 && (isFinalized || (isAuditee && userProfile?.is_brand_audit_lead)) && (
                    <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center justify-center sm:justify-start gap-1.5">
                                {isFinalized ? (
                                    <><Lock size={16} className="text-amber-500" /> Self-Audit Finalised</>
                                ) : (
                                    'Wrap up Self-Audit'
                                )}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {isFinalized 
                                    ? `Submitted on ${finalizedAt ? new Date(finalizedAt).toLocaleDateString() : ''} by ${finalizedBy || 'the hotel representative'}.`
                                    : "Finalise and submit your self-audit to lock evidence for evaluation."
                                }
                            </p>
                        </div>
                        {isFinalized ? (
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <span className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs sm:text-sm font-black w-full sm:w-auto">
                                    <CheckCircle2 size={16} />
                                    Audit Submitted & Locked
                                </span>
                                {!isAuditee && (
                                    <button
                                        onClick={handleUnlockByAdmin}
                                        disabled={isSubmittingFinalize}
                                        className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all outline-none active:scale-95 disabled:opacity-50"
                                    >
                                        <Unlock size={14} />
                                        Unlock Audit
                                    </button>
                                )}
                            </div>
                        ) : (
                            totalCompleted > 0 && totalCompleted === totalTasks ? (
                                <button
                                    onClick={handleFinalize}
                                    disabled={isSubmittingFinalize}
                                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    <Send size={14} />
                                    {isSubmittingFinalize ? 'Submitting...' : 'Finalise & Submit'}
                                </button>
                            ) : (
                                <span className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold w-full sm:w-auto">
                                    <Clock size={16} className="text-slate-400 animate-pulse" />
                                    Complete all tasks ({totalCompleted}/{totalTasks}) to finalise
                                </span>
                            )
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
