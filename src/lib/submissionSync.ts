import { supabase } from './supabase';
import { withRetry } from './retry';

// Incremental sync of audit_submissions for one screen.
// The first load (and a full reload every fullReloadMs) downloads every row. Later syncs download only the rows whose
// updated_at moved past the last sync. Deleted rows are only removed by a full reload, so call sync(true) after deletes.
// `columns` must include updated_at (or be '*').

export interface SubmissionSyncOptions {
    columns: string;
    fullReloadMs: number;
    // Re-read slightly before the last sync point so rows written during the previous request are not missed
    overlapMs: number;
    pageSize?: number;
    maxRows?: number;
}

export const createSubmissionSync = (options: SubmissionSyncOptions) => {
    const pageSize = options.pageSize ?? 1000;
    const maxRows = options.maxRows ?? 50000;
    const rows = new Map<string, any>();
    let lastSyncedAt: string | null = null;
    let lastFullLoadAt = 0;

    const fetchChanged = async (since: string | null): Promise<any[]> => {
        const changed: any[] = [];
        for (let from = 0; from < maxRows; from += pageSize) {
            const page = await withRetry(async () => {
                let query = supabase.from('audit_submissions').select(options.columns);
                if (since) {
                    query = query.gt('updated_at', since);
                }
                const { data, error } = await query
                    .order('hotel_id', { ascending: true })
                    .order('item_id', { ascending: true })
                    .range(from, from + pageSize - 1);
                if (error) throw error;
                return data || [];
            });
            changed.push(...page);
            if (page.length < pageSize) break;
        }
        return changed;
    };

    const sync = async (forceFull = false): Promise<any[]> => {
        const isFullLoad = forceFull || !lastSyncedAt || Date.now() - lastFullLoadAt > options.fullReloadMs;
        const since = isFullLoad || !lastSyncedAt
            ? null
            : new Date(new Date(lastSyncedAt).getTime() - options.overlapMs).toISOString();
        const startedAt = new Date().toISOString();

        let changed: any[];
        try {
            changed = await fetchChanged(since);
        } catch (error) {
            // An incremental sync that fails (for example, a missing updated_at column) is retried as a full load
            if (since) return sync(true);
            throw error;
        }

        if (isFullLoad) rows.clear();
        changed.forEach((row: any) => rows.set(`${row.hotel_id}|${row.item_id}`, row));
        lastSyncedAt = startedAt;
        if (isFullLoad) lastFullLoadAt = Date.now();
        return Array.from(rows.values());
    };

    return { sync };
};

export type SubmissionSync = ReturnType<typeof createSubmissionSync>;
