import { supabase } from './supabase';

// Score deductions recorded by admins. A deduction is subtracted from a hotel's final score.
// Deleting a deduction only sets deleted_at and deleted_by, so the record stays for the audit trail.
export interface AuditDeduction {
    id: string;
    hotel_id: string;
    percentage: number;
    reason: string;
    created_by: string | null;
    created_at: string;
    deleted_at: string | null;
    deleted_by: string | null;
}

export const fetchActiveDeductions = async (): Promise<AuditDeduction[]> => {
    const { data, error } = await supabase
        .from('audit_deductions')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as AuditDeduction[];
};

export const addDeduction = async (input: { hotelId: string; percentage: number; reason: string; createdBy: string }): Promise<void> => {
    const { error } = await supabase.from('audit_deductions').insert({
        hotel_id: input.hotelId,
        percentage: input.percentage,
        reason: input.reason.trim(),
        created_by: input.createdBy
    });
    if (error) throw error;
};

export const removeDeduction = async (id: string, deletedBy: string): Promise<void> => {
    const { error } = await supabase
        .from('audit_deductions')
        .update({ deleted_at: new Date().toISOString(), deleted_by: deletedBy })
        .eq('id', id);
    if (error) throw error;
};
