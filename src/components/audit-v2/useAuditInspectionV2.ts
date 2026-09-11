import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Hotel, AuditCategory, AuditItem, AuditBatch, AuditGroup } from '../../types';
import { AuditSubmissionV2, CategoryStats, OverallAuditStats } from './types';

const LIGHTWEIGHT_COLUMNS = '*';

export function useAuditInspectionV2(
    selectedHotelCode: string,
    hotels: Hotel[],
    categories: AuditCategory[],
    items: AuditItem[],
    userProfile?: any,
    batches?: AuditBatch[],
    groups?: AuditGroup[],
    auditorCategoryAssignments?: any[]
) {
    const [submissionsMap, setSubmissionsMap] = useState<Record<string, AuditSubmissionV2>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSavingMap, setIsSavingMap] = useState<Record<string, boolean>>({});
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const [loadedGroups, setLoadedGroups] = useState<AuditGroup[]>([]);

    const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

    // Target hotel object and canonical hotel code (always uppercase)
    const currentHotel = useMemo(() => {
        if (!selectedHotelCode) return null;
        const codeUpper = selectedHotelCode.trim().toUpperCase();
        return hotels.find(h => 
            String(h.code || '').trim().toUpperCase() === codeUpper || 
            String(h.id || '').trim().toUpperCase() === codeUpper
        ) || null;
    }, [selectedHotelCode, hotels]);

    const canonicalHotelCode = useMemo(() => {
        if (currentHotel?.code) return String(currentHotel.code).trim().toUpperCase();
        if (currentHotel?.id) return String(currentHotel.id).trim().toUpperCase();
        return selectedHotelCode ? selectedHotelCode.trim().toUpperCase() : '';
    }, [currentHotel, selectedHotelCode]);

    // Fetch live audit_checklist_groups and audit_group_hotels from Supabase
    useEffect(() => {
        let isMounted = true;
        const fetchGroups = async () => {
            try {
                const { data: groupsData } = await supabase
                    .from('audit_checklist_groups')
                    .select('*');

                const { data: groupHotelsData } = await supabase
                    .from('audit_group_hotels')
                    .select('*');

                if (groupsData && isMounted) {
                    const mapped: AuditGroup[] = groupsData.map((g: any) => {
                        const hotelIds = (groupHotelsData || [])
                            .filter((gh: any) => String(gh.group_id) === String(g.id))
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
                    setLoadedGroups(mapped);
                }
            } catch (e) {
                console.warn("Audit V2: Exception fetching checklist groups from Supabase:", e);
            }
        };
        fetchGroups();
        return () => { isMounted = false; };
    }, []);

    // Set of all possible identifiers for current hotel
    const currentHotelIdentifiers = useMemo(() => {
        const set = new Set<string>();
        if (selectedHotelCode) {
            const s = selectedHotelCode.trim().toLowerCase();
            if (s) set.add(s);
        }
        if (currentHotel) {
            if (currentHotel.id) set.add(String(currentHotel.id).trim().toLowerCase());
            if (currentHotel.code) set.add(String(currentHotel.code).trim().toLowerCase());
            if (currentHotel.name) set.add(String(currentHotel.name).trim().toLowerCase());
        }
        return set;
    }, [selectedHotelCode, currentHotel]);

    // Compute relevantCategories and relevantItems dynamically for the selected hotel
    const { relevantCategories, relevantItems } = useMemo(() => {
        if (!currentHotel && !selectedHotelCode) {
            return { relevantCategories: categories, relevantItems: items };
        }

        const effectiveGroups = loadedGroups.length > 0 ? loadedGroups : (groups || []);

        // Step 1: Find matching checklist groups for this hotel
        const matchingGroups = effectiveGroups.filter(g => {
            if (!g) return false;
            const gHotelIds = (g.hotelIds || (g as any).hotel_ids || []).map((id: any) => String(id).trim().toLowerCase());
            return gHotelIds.some((hId: string) => currentHotelIdentifiers.has(hId));
        });

        let groupCatIds: Set<string> | null = null;
        let groupItemIds: Set<string> | null = null;

        if (matchingGroups.length > 0) {
            const catSet = new Set<string>();
            const itemSet = new Set<string>();
            matchingGroups.forEach(g => {
                const cIds = g.categoryIds || (g as any).category_ids || [];
                const iIds = g.itemIds || (g as any).item_ids || [];
                cIds.forEach((cid: any) => catSet.add(String(cid).trim()));
                iIds.forEach((iid: any) => itemSet.add(String(iid).trim()));
            });
            if (catSet.size > 0) groupCatIds = catSet;
            if (itemSet.size > 0) groupItemIds = itemSet;
        }

        // Step 2: Check direct hotel assigned category IDs
        let hotelCatIds: Set<string> | null = null;
        const directHotelCats = (currentHotel as any)?.assignedCategoryIds || (currentHotel as any)?.assigned_category_ids;
        if (Array.isArray(directHotelCats) && directHotelCats.length > 0) {
            hotelCatIds = new Set(directHotelCats.map((id: any) => String(id).trim()));
        }

        // Step 3: Check batch assigned category IDs
        let batchCatIds: Set<string> | null = null;
        const hotelBatchId = (currentHotel as any)?.batchId || (currentHotel as any)?.batch_id;
        if (hotelBatchId && batches && batches.length > 0) {
            const matchingBatch = batches.find(b => String(b.id).trim().toLowerCase() === String(hotelBatchId).trim().toLowerCase());
            const bCatIds = (matchingBatch as any)?.categoryIds || (matchingBatch as any)?.category_ids;
            if (Array.isArray(bCatIds) && bCatIds.length > 0) {
                batchCatIds = new Set(bCatIds.map((id: any) => String(id).trim()));
            }
        }

        // Step 4: Auditor category assignments
        let auditorCatIds: Set<string> | null = null;
        const isUserAuditor = userProfile?.access_level === 'auditor' || userProfile?.role === 'auditor';
        if (isUserAuditor && auditorCategoryAssignments && auditorCategoryAssignments.length > 0) {
            const userId = String(userProfile.id || '').trim().toLowerCase();
            const userAssignments = auditorCategoryAssignments.filter((a: any) => String(a.user_id).trim().toLowerCase() === userId);
            if (userAssignments.length > 0) {
                auditorCatIds = new Set(userAssignments.map((a: any) => String(a.category_id).trim()));
            }
        }

        // Combine assigned category constraints
        let effectiveCatIds: Set<string> | null = groupCatIds || hotelCatIds || batchCatIds;

        if (effectiveCatIds && auditorCatIds) {
            const intersection = new Set<string>();
            effectiveCatIds.forEach(id => {
                if (auditorCatIds!.has(id)) intersection.add(id);
            });
            effectiveCatIds = intersection;
        } else if (!effectiveCatIds && auditorCatIds) {
            effectiveCatIds = auditorCatIds;
        }

        // Filter Items
        const filteredItemsList = items.filter(item => {
            const itemCatId = String(item.categoryId || (item as any).category_id || '').trim();
            const itemIdStr = String(item.id).trim();

            if (effectiveCatIds && !effectiveCatIds.has(itemCatId)) {
                return false;
            }

            if (groupItemIds && groupItemIds.size > 0 && !groupItemIds.has(itemIdStr)) {
                return false;
            }

            return true;
        });

        // Filter Categories
        const activeCatIdsInItems = new Set(filteredItemsList.map(i => String(i.categoryId || (i as any).category_id || '').trim()));

        const filteredCategoriesList = categories.filter(cat => {
            const catIdStr = String(cat.id).trim();
            if (effectiveCatIds) {
                return effectiveCatIds.has(catIdStr);
            }
            return activeCatIdsInItems.has(catIdStr);
        });

        return {
            relevantCategories: filteredCategoriesList,
            relevantItems: filteredItemsList
        };
    }, [categories, items, loadedGroups, groups, currentHotelIdentifiers, currentHotel, batches, userProfile, auditorCategoryAssignments]);

    // Efficient database query
    const loadSubmissions = useCallback(async () => {
        if (!canonicalHotelCode) {
            setSubmissionsMap({});
            return;
        }

        setIsLoading(true);
        try {
            const possibleHotelIds = Array.from(new Set([
                canonicalHotelCode,
                canonicalHotelCode.toLowerCase(),
                currentHotel?.id ? String(currentHotel.id) : '',
                currentHotel?.code ? String(currentHotel.code) : ''
            ].filter(Boolean)));

            let { data, error } = await supabase
                .from('audit_submissions')
                .select('*')
                .in('hotel_id', possibleHotelIds)
                .order('updated_at', { ascending: true });

            if (error) {
                console.warn("Supabase query warning in Audit V2, attempting fallback select('*'):", error);
                const fallbackRes = await supabase
                    .from('audit_submissions')
                    .select('*');

                if (!fallbackRes.error && fallbackRes.data) {
                    const possibleLower = possibleHotelIds.map(id => id.toLowerCase());
                    data = fallbackRes.data.filter((row: any) =>
                        possibleLower.includes(String(row.hotel_id || '').toLowerCase())
                    );
                    error = null;
                }
            }

            if (error) {
                console.error("Supabase query error in Audit V2:", error);
                setIsLoading(false);
                return;
            }

            const newMap: Record<string, AuditSubmissionV2> = {};

            (data || []).forEach(row => {
                if (row && row.item_id !== undefined && row.item_id !== null) {
                    const itemIdStr = String(row.item_id);
                    const existing = newMap[itemIdStr];

                    const rowVal = row.value || row.photo_url || row.evidence_url || row.file_url || row.image_url || '';
                    const existingVal = existing?.value || existing?.photo_url || existing?.evidence_url || existing?.file_url || existing?.image_url || '';

                    // Priority rule: if existing row has canonical hotel_id or has valid value, don't overwrite with empty
                    if (!existing || row.hotel_id === canonicalHotelCode || (rowVal && !existingVal)) {
                        newMap[itemIdStr] = {
                            ...existing,
                            ...row,
                            value: rowVal || existingVal,
                            item_id: itemIdStr,
                            hotel_id: String(row.hotel_id || canonicalHotelCode)
                        };
                    } else {
                        // Merge score and notes onto existing row
                        newMap[itemIdStr] = {
                            ...existing,
                            value: existingVal || rowVal,
                            score: row.score !== undefined && row.score !== null ? row.score : existing.score,
                            is_na: row.is_na !== undefined ? row.is_na : existing.is_na,
                            auditor_notes: (row.auditor_notes || row.auditor_remarks || existing.auditor_notes || existing.auditor_remarks || '').trim(),
                            auditor_remarks: (row.auditor_remarks || row.auditor_notes || existing.auditor_remarks || existing.auditor_notes || '').trim(),
                            updated_at: row.updated_at || existing.updated_at
                        };
                    }
                }
            });

            setSubmissionsMap(newMap);
            setLastSyncedAt(new Date());
        } catch (err) {
            console.error("Failed to load submissions in Audit V2:", err);
        } finally {
            setIsLoading(false);
        }
    }, [canonicalHotelCode, currentHotel]);

    // Initial load when hotel changes
    useEffect(() => {
        loadSubmissions();
    }, [loadSubmissions]);

    // Submitter Name helper
    const auditorSubmitterName = useMemo(() => {
        if (!userProfile) return 'Auditor';
        const fullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
        return fullName ? `Auditor: ${fullName}` : `Auditor: ${userProfile.email || 'Admin'}`;
    }, [userProfile]);

    // Update Score Function (Instant Optimistic + Background Supabase Sync)
    // Update Item Score (In-Memory Only - DB Save on Button Press)
    const updateItemScore = useCallback((itemId: string, scoreVal: number | 'N/A' | null) => {
        if (!canonicalHotelCode) return;

        const isNA = scoreVal === 'N/A';
        const numScore = isNA || scoreVal === null 
            ? null 
            : (typeof scoreVal === 'number' ? scoreVal : null);

        const nowIso = new Date().toISOString();

        // Optimistic local state update
        setSubmissionsMap(prev => {
            const existing = prev[itemId] || {};
            return {
                ...prev,
                [itemId]: {
                    ...existing,
                    hotel_id: canonicalHotelCode,
                    item_id: String(itemId),
                    score: numScore,
                    is_na: isNA,
                    updated_at: nowIso
                }
            };
        });
    }, [canonicalHotelCode]);

    // Update Auditor Remarks / Comment Function (In-Memory Only - DB Save on Button Press)
    const updateItemComment = useCallback((itemId: string, comment: string) => {
        if (!canonicalHotelCode) return;

        const rawComment = comment;
        const nowIso = new Date().toISOString();

        // Optimistic local state update with raw comment (preserving trailing spaces)
        setSubmissionsMap(prev => {
            const existing = prev[itemId] || {};
            return {
                ...prev,
                [itemId]: {
                    ...existing,
                    hotel_id: canonicalHotelCode,
                    item_id: String(itemId),
                    auditor_notes: rawComment,
                    auditor_remarks: rawComment,
                    updated_at: nowIso
                }
            };
        });

        if (debounceTimersRef.current[itemId]) {
            clearTimeout(debounceTimersRef.current[itemId]);
            delete debounceTimersRef.current[itemId];
        }
    }, [canonicalHotelCode]);

    // Save Item Audit to Database strictly on [SAVE AUDIT TO DB] button click
    const saveItemAudit = useCallback(async (itemId: string) => {
        if (!canonicalHotelCode) return;

        setIsSavingMap(prev => ({ ...prev, [itemId]: true }));

        try {
            const existingSub = submissionsMap[itemId];
            const existingSubmitter = existingSub?.submitted_by_name || existingSub?.submitted_by;
            const finalSubmitter = (existingSubmitter && !existingSubmitter.startsWith('Auditor:'))
                ? existingSubmitter
                : auditorSubmitterName;

            const nowIso = new Date().toISOString();
            const notes = (existingSub?.auditor_notes || existingSub?.auditor_remarks || '').trim();

            const payload: any = {
                hotel_id: canonicalHotelCode,
                item_id: String(itemId),
                score: existingSub?.score ?? null,
                is_na: existingSub?.is_na ?? false,
                auditor_notes: notes,
                auditor_remarks: notes,
                submitted_by: finalSubmitter,
                submitted_by_name: finalSubmitter,
                updated_at: nowIso
            };

            if (existingSub?.value) payload.value = existingSub.value;
            if (existingSub?.input_type) payload.input_type = existingSub.input_type;

            const { error } = await supabase
                .from('audit_submissions')
                .upsert(payload, { onConflict: 'hotel_id,item_id' });

            if (error) {
                console.warn("Audit V2 manual save warning:", error);
            }

            setLastSyncedAt(new Date());
        } catch (e) {
            console.error("Failed to save audit item in Audit V2:", e);
        } finally {
            setIsSavingMap(prev => ({ ...prev, [itemId]: false }));
        }
    }, [canonicalHotelCode, auditorSubmitterName, submissionsMap]);

    // Computed Category Stats
    const categoryStats = useMemo<Record<string, CategoryStats>>(() => {
        const stats: Record<string, CategoryStats> = {};

        relevantCategories.forEach(cat => {
            const catItems = relevantItems.filter(i => String(i.categoryId || (i as any).category_id) === String(cat.id));
            let auditedCount = 0;
            let passCount = 0;
            let failCount = 0;
            let naCount = 0;
            let totalEarnedPoints = 0;
            let totalMaxPoints = 0;

            catItems.forEach(item => {
                const sub = submissionsMap[item.id];
                const maxPts = item.points ?? 5;

                if (sub) {
                    if (sub.is_na) {
                        auditedCount++;
                        naCount++;
                    } else if (sub.score !== undefined && sub.score !== null) {
                        auditedCount++;
                        totalMaxPoints += maxPts;
                        if (sub.score > 0) {
                            passCount++;
                            totalEarnedPoints += Number(sub.score);
                        } else {
                            failCount++;
                        }
                    }
                }
            });

            const percentage = totalMaxPoints > 0 ? (totalEarnedPoints / totalMaxPoints) * 100 : 0;

            stats[cat.id] = {
                categoryId: cat.id,
                categoryName: cat.name,
                totalItems: catItems.length,
                auditedCount,
                passCount,
                failCount,
                naCount,
                totalEarnedPoints,
                totalMaxPoints,
                percentage
            };
        });

        return stats;
    }, [relevantCategories, relevantItems, submissionsMap]);

    // Computed Overall Stats
    const overallStats = useMemo<OverallAuditStats>(() => {
        let totalItems = relevantItems.length;
        let auditedCount = 0;
        let passCount = 0;
        let failCount = 0;
        let naCount = 0;
        let totalEarnedPoints = 0;
        let totalMaxPoints = 0;

        relevantItems.forEach(item => {
            const sub = submissionsMap[item.id];
            const maxPts = item.points ?? 5;

            if (sub) {
                if (sub.is_na) {
                    auditedCount++;
                    naCount++;
                } else if (sub.score !== undefined && sub.score !== null) {
                    auditedCount++;
                    totalMaxPoints += maxPts;
                    if (sub.score > 0) {
                        passCount++;
                        totalEarnedPoints += Number(sub.score);
                    } else {
                        failCount++;
                    }
                }
            }
        });

        const unscoredCount = Math.max(0, totalItems - auditedCount);
        const overallPercentage = totalMaxPoints > 0 ? (totalEarnedPoints / totalMaxPoints) * 100 : 0;

        return {
            totalItems,
            auditedCount,
            unscoredCount,
            passCount,
            failCount,
            naCount,
            totalEarnedPoints,
            totalMaxPoints,
            overallPercentage
        };
    }, [relevantItems, submissionsMap]);

    return {
        currentHotel,
        canonicalHotelCode,
        submissionsMap,
        isLoading,
        isSavingMap,
        lastSyncedAt,
        loadSubmissions,
        updateItemScore,
        updateItemComment,
        saveItemAudit,
        categoryStats,
        overallStats,
        relevantCategories,
        relevantItems
    };
}
