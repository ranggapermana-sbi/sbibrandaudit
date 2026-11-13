import type { AuditResult, AuditStatus } from './auditResults';

// Pass/Fail breakdown for the admin Pass/Fail dashboard.
// Splits every hotel's audit result by Region, Country, Brand, and whether the hotel has an approved
// staff member whose role is Marcomm/PR (a dedicated marketing communications person).

export type BreakdownDimension = 'region' | 'country' | 'brand' | 'marcomm';

export interface BreakdownCounts {
    passed: number;
    failed: number;
    notAudited: number;
}

export interface BreakdownGroup extends BreakdownCounts {
    key: string;
    label: string;
}

export interface BreakdownProfile {
    role?: string | null;
    is_approved?: boolean | null;
    hotel_id?: string | null;
    hotel_code?: string | null;
    hotel_name?: string | null;
}

export const MARCOMM_ROLE = 'marcomm/pr';

const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();

// A profile belongs to a hotel the same way the admin screen binds users to hotels:
// by hotel id (may hold several comma-separated ids), hotel code or hotel name.
export const profileBelongsToHotel = (profile: BreakdownProfile, hotel: { hotelId: string; code: string; name: string }): boolean => {
    const hotelId = norm(hotel.hotelId);
    const hotelCode = norm(hotel.code);
    const hotelName = norm(hotel.name);
    const profileIds = norm(profile.hotel_id).split(',').map(s => s.trim()).filter(Boolean);
    if (hotelId && profileIds.includes(hotelId)) return true;
    if (hotelCode && norm(profile.hotel_code) === hotelCode) return true;
    if (hotelName && norm(profile.hotel_name) === hotelName) return true;
    return false;
};

export const hotelHasDedicatedMarcomm = (hotel: { hotelId: string; code: string; name: string }, profiles: BreakdownProfile[]): boolean =>
    profiles.some(p => p.is_approved !== false && norm(p.role) === MARCOMM_ROLE && profileBelongsToHotel(p, hotel));

const emptyCounts = (): BreakdownCounts => ({ passed: 0, failed: 0, notAudited: 0 });

const addStatus = (counts: BreakdownCounts, status: AuditStatus) => {
    if (status === 'passed') counts.passed += 1;
    else if (status === 'failed') counts.failed += 1;
    else counts.notAudited += 1;
};

const groupBy = (results: AuditResult[], keyOf: (r: AuditResult) => { key: string; label: string }): BreakdownGroup[] => {
    const groups = new Map<string, BreakdownGroup>();
    results.forEach(result => {
        const { key, label } = keyOf(result);
        let group = groups.get(key);
        if (!group) {
            group = { key, label, ...emptyCounts() };
            groups.set(key, group);
        }
        addStatus(group, result.status);
    });
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
};

const textOrUnassigned = (value: string) => (value || '').trim() || 'Unassigned';

export const buildPassFailBreakdown = (
    results: AuditResult[],
    profiles: BreakdownProfile[]
): Record<BreakdownDimension, BreakdownGroup[]> => {
    const region = groupBy(results, r => ({ key: norm(r.region) || 'unassigned', label: textOrUnassigned(r.region) }));
    const country = groupBy(results, r => ({ key: norm(r.country) || 'unassigned', label: textOrUnassigned(r.country) }));
    const brand = groupBy(results, r => ({ key: norm(r.brand) || 'unassigned', label: textOrUnassigned(r.brand) }));
    const marcomm = groupBy(results, r => hotelHasDedicatedMarcomm(r, profiles)
        ? { key: 'yes', label: 'With Dedicated Marcomm/PR' }
        : { key: 'no', label: 'Without Dedicated Marcomm/PR' });

    return { region, country, brand, marcomm };
};

// The four audit departments shown in the Audit Results table, in the same order.
export const AUDIT_DEPARTMENT_NAMES = [
    'Branding & Marketing',
    'Digital Marketing',
    'Online Reputation',
    'CRM & Loyalty',
] as const;

export interface DepartmentRef {
    id: string | number;
    name: string;
}

// A hotel's score for one department: earned over maximum on non-bonus categories, as a whole percentage.
// Null when the hotel has no scored items in that department.
export const departmentScoreOf = (result: AuditResult, departmentId: string): number | null => {
    const rows = result.categories.filter(c => !c.isBonus && c.departmentId === departmentId);
    const earned = rows.reduce((sum, c) => sum + c.earned, 0);
    const max = rows.reduce((sum, c) => sum + c.max, 0);
    return max > 0 ? Math.round((earned / max) * 100) : null;
};

// Pass/fail per audit department. A department passes when the hotel's department score reaches the
// hotel's pass mark (the same mark used for the overall result). Hotels with no score in a department are not audited there.
export const buildDepartmentBreakdown = (results: AuditResult[], departments: DepartmentRef[]): BreakdownGroup[] =>
    AUDIT_DEPARTMENT_NAMES.map(name => {
        const department = departments.find(d => d.name === name);
        const group: BreakdownGroup = { key: name, label: name, ...emptyCounts() };
        results.forEach(result => {
            // Reduced scheme hotels do not take part in their excluded department, so they are left out of that pie
            if (result.reducedExcludedDepartment === name) return;
            const score = department ? departmentScoreOf(result, String(department.id)) : null;
            if (score === null) {
                group.notAudited += 1;
            } else if (score >= result.passMark) {
                group.passed += 1;
            } else {
                group.failed += 1;
            }
        });
        return group;
    });

export const overallCounts = (results: AuditResult[]): BreakdownCounts => {
    const counts = emptyCounts();
    results.forEach(r => addStatus(counts, r.status));
    return counts;
};
