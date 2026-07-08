import { Department, Hotel, AuditBatch, AuditCategory, AuditItem, AuditGroup } from '../types';

export const DEFAULT_DEPARTMENTS: Department[] = [
    { id: '1', name: 'Digital Marketing', head: 'Hidayat Jayawardana' },
    { id: '2', name: 'Marcomm & Branding', head: 'Nadya Frederica' },
    { id: '3', name: 'CRM & Loyalty', head: 'Mohammad Jawhar' },
    { id: '4', name: 'Online Reputation', head: 'Rangga Permana' },
];

export const DEFAULT_HOTELS: Hotel[] = [
    {
        id: 'sbi-ho',
        name: 'Swiss-Belhotel International',
        location: 'Corporate Headquarters',
        code: 'SBI',
        brandClass: 'Corporate',
        region: 'Global',
        country: 'International',
        stars: 5
    },
    {
        id: '1',
        name: 'Swiss-Belhotel Seef',
        location: 'Manama, Bahrain',
        code: 'SBBH',
        brandClass: 'Swiss-Belhotel',
        region: 'Middle East',
        country: 'Bahrain',
        stars: 4
    },
    {
        id: '2',
        name: 'Swiss-Belresidences Juffair',
        location: 'Manama, Bahrain',
        code: 'SBJU',
        brandClass: 'Swiss-Belresidences',
        region: 'Middle East',
        country: 'Bahrain',
        stars: 4
    },
    {
        id: '3',
        name: 'Swiss-Belinn Airport Jakarta',
        location: 'Jakarta, Indonesia',
        code: 'SBAJ',
        brandClass: 'Swiss-Belinn',
        region: 'Asia Pacific',
        country: 'Indonesia',
        stars: 3
    }
];

export const DEFAULT_BATCHES: AuditBatch[] = [
    { id: '1', name: 'Batch 1', status: 'Active', hotelIds: ['1', '2'] },
    { id: '2', name: 'Batch 2', status: 'Completed', hotelIds: ['3'] },
    { id: '3', name: 'Batch 3', status: 'Upcoming', hotelIds: [] },
    { id: '4', name: 'Batch 4', status: 'Upcoming', hotelIds: ['1', '4'] },
];

export const DEFAULT_CATEGORIES: AuditCategory[] = [
    { id: '1', name: "I. BRANDING & PROPERTY IDENTIFICATION", totalTasks: 5, completed: 2 },
    { id: '2', name: "II. BRANDING AT RECEPTION / FRONT OFFICE", totalTasks: 4, completed: 0 },
    { id: '3', name: "III. BRANDING IN GUEST ROOM", totalTasks: 6, completed: 1 },
    { id: '4', name: "SWISS-CARE AMENITIES", totalTasks: 3, completed: 3 },
    { id: '5', name: "IV. BRANDING IN FOOD & BEVERAGE AND BANQUET", totalTasks: 8, completed: 0 },
    { id: '6', name: "V. SALES & MARKETING - PHYSICAL", totalTasks: 4, completed: 2 },
    { id: '7', name: "VI. SALES & MARKETING - DIGITAL", totalTasks: 5, completed: 0 },
    { id: '8', name: "VII. BRANDING AT PUBLIC AREAS", totalTasks: 6, completed: 4 },
    { id: '9', name: "VIII. BRANDING AT BACK OFFICE & STAFF", totalTasks: 3, completed: 0 },
    { id: '10', name: "IX. BONUS", totalTasks: 2, completed: 0 },
];

export const DEFAULT_GROUPS: AuditGroup[] = [
    { id: '1', name: 'Front Office Excellence Group', description: 'Standard criteria checking reception and guest greeting compliance.', itemIds: ['1', '2'] },
    { id: '2', name: 'Safety & Hygiene Standard Group', description: 'Master check list for public spaces and hygiene protocols.', itemIds: ['3', '4'] },
];

export const DEFAULT_OFFLINE_ITEMS: AuditItem[] = [
    { id: '1', name: "Brand Identity Guidelines Manual", departmentId: '2', categoryId: '1', inputType: 'text', description: "Check if the property holds the latest Brand Manual." },
    { id: '2', name: "Primary Hotel Signage at Entrance", departmentId: '2', categoryId: '1', inputType: 'checkbox', description: "Ensure hotel main logo signage is illuminated and clean." },
    { id: '3', name: "Front Desk Reception Brand Logo", departmentId: '2', categoryId: '2', inputType: 'checkbox', description: "Brand logo at the reception desk must comply with standards." },
    { id: '4', name: "Swiss-Care Bath Amenities Kit", departmentId: '3', categoryId: '4', inputType: 'numeric', description: "Count of standard guest amenities provided in bathroom." },
    { id: '5', name: "Sales collateral on display", departmentId: '1', categoryId: '6', inputType: 'checkbox', description: "Flyers and brochures must be current." },
    { id: '6', name: "Hotel website promotion accuracy", departmentId: '1', categoryId: '7', inputType: 'text', description: "Verify active promotions on the hotel homepage." },
];
