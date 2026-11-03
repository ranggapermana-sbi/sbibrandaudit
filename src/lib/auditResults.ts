import { AuditCategory, AuditItem, Department, Hotel } from '../types';
import { BONUS_RULES, bonusRuleForCategory, bonusCategoryAppliesTo } from './bonusRules';
import { CERTIFICATE_WEIGHTS } from './certificate';

// Audit results: per hotel, the weighted audit score from the department percentages (40/30/15/15),
// plus the bonus from passed BONUS items, capped at 100. A hotel passes at AUDIT_PASS_THRESHOLD or more.
export const AUDIT_PASS_THRESHOLD = 80;

export type AuditStatus = 'passed' | 'failed' | 'not_audited';

export interface AuditResultCategory {
    id: string;
    name: string;
    departmentId: string;
    earned: number;
    max: number;
    isBonus: boolean;
    bonusStatus: 'passed' | 'failed' | null;
    percentage: number;
    bonusPoints: number;
}

export interface AuditBonusRow {
    label: string;
    passed: number;
    rate: number;
    points: number;
}

export interface AuditResult {
    hotelId: string;
    name: string;
    code: string;
    percentage: number | null;
    basePercentage: number | null;
    bonusRows: AuditBonusRow[];
    bonusTotal: number;
    status: AuditStatus;
    categories: AuditResultCategory[];
}

export interface AuditSubmissionRow {
    hotel_id: string;
    item_id: string;
    score: number | null | string;
    is_na: boolean | string | null;
}

export interface AuditResultsInput {
    hotels: Hotel[];
    items: AuditItem[];
    categories: AuditCategory[];
    departments: Department[];
    submissions: AuditSubmissionRow[];
    // Every identifier a hotel's submissions may be stored under (id, code, name, and linked profile ids)
    idsForHotel: (hotel: Hotel) => string[];
}

type SubmissionValue = { score: number | null; isNa: boolean };

export const computeAuditResults = (input: AuditResultsInput): AuditResult[] => {
    const itemById = new Map<string, AuditItem>();
    input.items.forEach(item => itemById.set(String(item.id), item));
    const categoryNameById = new Map<string, string>();
    const categoryDepartmentById = new Map<string, string>();
    input.categories.forEach(cat => {
        categoryNameById.set(String(cat.id), cat.name);
        categoryDepartmentById.set(String(cat.id), cat.departmentId ? String(cat.departmentId) : '');
    });

    // Submissions per hotel key, then per item. A scored record wins over an unscored one.
    const submissionsByHotel = new Map<string, Map<string, SubmissionValue>>();
    input.submissions.forEach(sub => {
        if (!sub.hotel_id || sub.item_id === undefined || sub.item_id === null) return;
        const hKey = String(sub.hotel_id).trim().toLowerCase();
        const value: SubmissionValue = {
            score: sub.score !== undefined && sub.score !== null ? Number(sub.score) : null,
            isNa: sub.is_na === true || String(sub.is_na) === 'true'
        };
        let perItem = submissionsByHotel.get(hKey);
        if (!perItem) {
            perItem = new Map<string, SubmissionValue>();
            submissionsByHotel.set(hKey, perItem);
        }
        const itemKey = String(sub.item_id);
        const existing = perItem.get(itemKey);
        if (!existing || (existing.score === null && value.score !== null)) {
            perItem.set(itemKey, value);
        }
    });

    return input.hotels
        .filter(h => h.brandClass !== 'Corporate' && h.id !== 'sbi-test' && h.id !== 'sbi-dummy')
        .map(hotel => {
            const idsFound = input.idsForHotel(hotel);
            const possibleIds: string[] = idsFound.length > 0 ? idsFound : [String(hotel.id).trim().toLowerCase()];

            const perItem = new Map<string, SubmissionValue>();
            possibleIds.forEach(pid => {
                submissionsByHotel.get(pid)?.forEach((value, itemKey) => {
                    const existing = perItem.get(itemKey);
                    if (!existing || (existing.score === null && value.score !== null)) {
                        perItem.set(itemKey, value);
                    }
                });
            });

            // Scored items with points feed the audit score. Items in BONUS categories are not scored by points:
            // a passed item (score above 0) adds its department's bonus rate on top of the audit score.
            const categoryTotals = new Map<string, { earned: number; max: number }>();
            const bonusCategories = new Map<string, { passed: number; failed: number }>();
            const bonusPassedByDepartment = new Map<string, number>();
            perItem.forEach((value, itemKey) => {
                if (value.isNa || value.score === null) return;
                const item = itemById.get(itemKey);
                if (!item) return;
                const catKey = String(item.categoryId);
                const catName = categoryNameById.get(catKey) || '';

                const bonusRule = bonusRuleForCategory(catName);
                if (bonusRule) {
                    if (!bonusCategoryAppliesTo(catName, hotel.brandClass || '')) return;
                    const stats = bonusCategories.get(catKey) ?? { passed: 0, failed: 0 };
                    if (value.score > 0) {
                        stats.passed += 1;
                        bonusPassedByDepartment.set(bonusRule.department, (bonusPassedByDepartment.get(bonusRule.department) ?? 0) + 1);
                    } else {
                        stats.failed += 1;
                    }
                    bonusCategories.set(catKey, stats);
                    return;
                }

                const maxPts = item.points ?? 5;
                if (maxPts === 0) return;
                const earned = value.score > 0 ? Math.min(value.score, maxPts) : 0;
                const totals = categoryTotals.get(catKey) ?? { earned: 0, max: 0 };
                totals.earned += earned;
                totals.max += maxPts;
                categoryTotals.set(catKey, totals);
            });

            const scoredCategories: AuditResultCategory[] = Array.from(categoryTotals.entries()).map(([catId, totals]) => ({
                id: catId,
                name: categoryNameById.get(catId) || 'Uncategorised',
                departmentId: categoryDepartmentById.get(catId) || '',
                earned: totals.earned,
                max: totals.max,
                isBonus: false,
                bonusStatus: null,
                percentage: totals.max > 0 ? Math.round((totals.earned / totals.max) * 100) : 0,
                bonusPoints: 0
            }));

            // Bonus categories are listed in the breakdown as passed when no applicable item failed
            const bonusCategoryRows: AuditResultCategory[] = Array.from(bonusCategories.entries()).map(([catId, stats]) => ({
                id: catId,
                name: categoryNameById.get(catId) || 'Bonus',
                departmentId: categoryDepartmentById.get(catId) || '',
                earned: 0,
                max: 0,
                isBonus: true,
                bonusStatus: stats.failed === 0 ? 'passed' : 'failed',
                percentage: stats.failed === 0 ? 100 : 0,
                bonusPoints: stats.passed * (bonusRuleForCategory(categoryNameById.get(catId) || '')?.rate ?? 0)
            }));
            const categories = [...scoredCategories, ...bonusCategoryRows].sort((a, b) => a.name.localeCompare(b.name));

            const bonusRows: AuditBonusRow[] = BONUS_RULES.map(rule => {
                const passed = bonusPassedByDepartment.get(rule.department) ?? 0;
                return { label: rule.department, passed, rate: rule.rate, points: passed * rule.rate };
            });
            const bonusTotal = bonusRows.reduce((sum, row) => sum + row.points, 0);

            // Weighted audit score: each department's points percentage times its weightage (40/30/15/15)
            const departmentTotals = new Map<string, { earned: number; max: number }>();
            scoredCategories.forEach(c => {
                const totals = departmentTotals.get(c.departmentId) ?? { earned: 0, max: 0 };
                totals.earned += c.earned;
                totals.max += c.max;
                departmentTotals.set(c.departmentId, totals);
            });
            let weightedScore = 0;
            let hasPoints = false;
            CERTIFICATE_WEIGHTS.forEach(def => {
                const department = input.departments.find(d => d.name === def.department);
                const totals = department ? departmentTotals.get(String(department.id)) : undefined;
                if (totals && totals.max > 0) {
                    hasPoints = true;
                    weightedScore += (def.weight * totals.earned) / totals.max;
                }
            });
            const basePercentage = hasPoints ? Math.round(weightedScore * 100) / 100 : null;
            const percentage = basePercentage === null
                ? null
                : Math.min(100, Math.round((basePercentage + bonusTotal) * 100) / 100);
            const status: AuditStatus =
                percentage === null ? 'not_audited' : percentage >= AUDIT_PASS_THRESHOLD ? 'passed' : 'failed';

            return {
                hotelId: String(hotel.id),
                name: hotel.name,
                code: hotel.code || '',
                percentage,
                basePercentage,
                bonusRows,
                bonusTotal,
                status,
                categories
            };
        });
};
