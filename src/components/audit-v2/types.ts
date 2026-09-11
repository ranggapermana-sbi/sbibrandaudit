import { Hotel, AuditCategory, AuditItem } from '../../types';

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

export type AuditItemFilter = 'all' | 'unscored' | 'audited' | 'pass' | 'fail' | 'na';
