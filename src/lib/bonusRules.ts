// Bonus rules: each passed item in a "BONUS" category adds its department's rate (in percentage points)
// on top of the hotel's audit score. The bonus is added after the audit percentage and capped at 100.
export const BONUS_RULES: { department: string; rate: number }[] = [
    { department: 'Digital Marketing', rate: 2 },
    { department: 'Branding & Marketing', rate: 1 },
    { department: 'CRM & Loyalty', rate: 1 },
    { department: 'Online Reputation', rate: 1 },
];

// Returns the bonus rule for a category name, or null when the category is not a bonus category
export const bonusRuleForCategory = (categoryName: string) => {
    if (!/^bonus/i.test(categoryName.trim())) return null;
    const name = categoryName.toLowerCase();
    return BONUS_RULES.find(rule => name.includes(rule.department.toLowerCase())) ?? null;
};

// Zest hotels get the Zest version of the Digital Marketing bonus instead of the standard one
export const bonusCategoryAppliesTo = (categoryName: string, hotelBrand: string): boolean => {
    const isZestHotel = hotelBrand.trim().toLowerCase() === 'zest';
    const name = categoryName.toLowerCase();
    if (name.includes('zest')) return isZestHotel;
    if (name.includes('digital marketing')) return !isZestHotel;
    return true;
};
