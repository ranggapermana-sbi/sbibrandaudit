export type AppScreen = 'login' | 'signup' | 'dashboard' | 'step1' | 'step2' | 'pendingCategories' | 'brandingPropertyIdentification' | 'adminPanel' | 'pendingApproval';

export interface Department {
    id: string;
    name: string;
    head: string;
}

export interface Hotel {
    id: string;
    name: string;
    location: string;
    code?: string;
    brandClass: string;
    region?: string;
    country?: string;
    stars?: number;
}

export interface AuditBatch {
    id: string;
    name: string;
    status: 'Active' | 'Completed' | 'Upcoming';
    hotelIds?: string[];
}

export interface AuditCategory {
    id: string;
    name: string;
    totalTasks: number;
    completed: number;
    departmentId?: string;
    sort_order?: number;
}

export interface AuditItem {
    id: string;
    name: string;
    itemDescription?: string;
    departmentId: string;
    categoryId: string;
    inputType: 'camera' | 'image' | 'document' | 'numeric' | 'text' | 'checkbox';
    points?: number;
    description?: string;
    sort_order?: number;
    filled_by_hotel?: boolean;
    result?: number;
    min_value?: number;
}

export interface AuditGroup {
    id: string;
    name: string;
    description?: string;
    categoryIds?: string[];
    itemIds: string[];
    hotelIds?: string[];
}
