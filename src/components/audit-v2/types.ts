import { Hotel, AuditCategory, AuditItem } from '../../types';

export interface AuditSubmissionOriginal {
    hotel_id: string;
    item_id: string;
    input_type?: string | null;
    value?: string | null;
    is_na?: boolean | null;
    na_reason?: string | null;
    submitted_by_name?: string | null;
    submitted_at?: string | null;
    score?: number | null;
    auditor_notes?: string | null;
    auditor_remarks?: string | null;
    captured_at?: string | null;
}

export interface AuditSubmissionV2 {
    id?: string;
    hotel_id: string;
    item_id: string;
    input_type?: string;
    value?: string;
    photo_url?: string;
    evidence_url?: string;
    file_url?: string;
    image_url?: string;
    is_na?: boolean;
    na_reason?: string;
    score?: number | null;
    auditor_notes?: string;
    auditor_remarks?: string;
    notes?: string;
    submitted_by?: string;
    submitted_by_name?: string;
    updated_at?: string;
    created_at?: string;
    is_saved_in_db?: boolean;
}

export interface CategoryStats {
    categoryId: string;
    categoryName: string;
    totalItems: number;
    auditedCount: number;
    passCount: number;
    failCount: number;
    naCount: number;
    totalEarnedPoints: number;
    totalMaxPoints: number;
    percentage: number;
}

export interface OverallAuditStats {
    totalItems: number;
    auditedCount: number;
    unscoredCount: number;
    passCount: number;
    failCount: number;
    naCount: number;
    totalEarnedPoints: number;
    totalMaxPoints: number;
    overallPercentage: number;
}

export type AuditItemFilter = 'all' | 'unscored' | 'audited' | 'pass' | 'fail' | 'na' | 'updated';

export function isSubmissionChanged(
    original?: AuditSubmissionOriginal | null,
    current?: AuditSubmissionV2 | null
): boolean {
    if (!original) return false;

    // 1. value (trimmed; null equals "")
    const origValue = String(original.value ?? '').trim();
    const currentValue = String(current?.value ?? '').trim();
    if (origValue !== currentValue) {
        return true;
    }

    // 2. is_na (null = false)
    const normalizeIsNa = (val: any) => val === true || val === 'true';
    const origIsNa = normalizeIsNa(original.is_na);
    const currentIsNa = normalizeIsNa(current?.is_na);
    if (origIsNa !== currentIsNa) {
        return true;
    }

    // 3. N/A reason (na_reason, falling back to notes)
    const origNaReason = String(original.na_reason ?? (original as any).notes ?? '').trim();
    const currentNaReason = String(current?.na_reason ?? current?.notes ?? '').trim();
    if (origNaReason !== currentNaReason) {
        return true;
    }

    return false;
}
