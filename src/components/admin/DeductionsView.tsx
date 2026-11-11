import React from 'react';
import { AlertCircle, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Hotel } from '../../types';
import { AuditDeduction, addDeduction, removeDeduction } from '../../lib/deductions';
import { isExcludedHotel } from '../../lib/hotelExclusion';

// Score deductions: an admin records a percentage taken off a hotel's final score, with a written reason.
export interface DeductionsViewProps {
    hotels: Hotel[];
    deductions: AuditDeduction[];
    onChanged: () => Promise<void> | void;
    adminName: string;
    onBackToDashboard: () => void;
}

const MAX_REASON_LENGTH = 500;
const HEAD_CLASS = 'px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500';

export const DeductionsView: React.FC<DeductionsViewProps> = ({ hotels, deductions, onChanged, adminName, onBackToDashboard }) => {
    const [hotelId, setHotelId] = React.useState('');
    const [percentage, setPercentage] = React.useState('');
    const [reason, setReason] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);
    const [saving, setSaving] = React.useState(false);

    const selectableHotels = hotels
        .filter(h => h.id && h.id !== 'sbi-test' && h.id !== 'sbi-dummy' && h.brandClass !== 'Corporate' && !isExcludedHotel(h))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));

    const hotelLabel = (id: string) => {
        const hotel = hotels.find(h => h.id === id);
        return hotel ? `${hotel.name}${hotel.code ? ` (${hotel.code})` : ''}` : id;
    };

    const handleAdd = async (event: React.FormEvent) => {
        event.preventDefault();
        const value = Number(percentage);
        if (!hotelId) {
            setError('Select a hotel.');
            return;
        }
        if (!Number.isFinite(value) || value <= 0 || value > 100) {
            setError('Enter a percentage above 0 and up to 100.');
            return;
        }
        if (!reason.trim()) {
            setError('Enter the reason for the deduction.');
            return;
        }
        if (reason.trim().length > MAX_REASON_LENGTH) {
            setError(`The reason must be ${MAX_REASON_LENGTH} characters or fewer.`);
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await addDeduction({ hotelId, percentage: Math.round(value * 100) / 100, reason, createdBy: adminName });
            setHotelId('');
            setPercentage('');
            setReason('');
            await onChanged();
        } catch (err: any) {
            console.error('Error adding deduction:', err);
            setError(`Could not save the deduction: ${err?.message || 'request failed'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (deduction: AuditDeduction) => {
        if (!window.confirm(`Remove the ${deduction.percentage}% deduction for ${hotelLabel(deduction.hotel_id)}? It stays on record as removed.`)) return;
        setError(null);
        try {
            await removeDeduction(deduction.id, adminName);
            await onChanged();
        } catch (err: any) {
            console.error('Error removing deduction:', err);
            setError(`Could not remove the deduction: ${err?.message || 'request failed'}`);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <button
                    type="button"
                    onClick={onBackToDashboard}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/60 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                >
                    <ArrowLeft size={12} /> Back to Audit Report & Inspection
                </button>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Score Deductions</h2>
                <p className="text-xs text-slate-500 mt-1">
                    A deduction takes a percentage off a hotel's final score, with the reason. A hotel can have several.
                </p>
            </div>

            <form onSubmit={handleAdd} className="bg-white p-6 rounded-[20px] border border-slate-150/80 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <label className="md:col-span-4 flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hotel</span>
                    <select
                        value={hotelId}
                        onChange={(e) => setHotelId(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                    >
                        <option value="">Select a hotel…</option>
                        {selectableHotels.map(h => (
                            <option key={h.id} value={h.id}>{h.name}{h.code ? ` (${h.code})` : ''}</option>
                        ))}
                    </select>
                </label>
                <label className="md:col-span-2 flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Deduction (%)</span>
                    <input
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        value={percentage}
                        onChange={(e) => setPercentage(e.target.value)}
                        placeholder="e.g. 5"
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 tabular-nums"
                    />
                </label>
                <label className="md:col-span-4 flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reason</span>
                    <input
                        type="text"
                        value={reason}
                        maxLength={MAX_REASON_LENGTH}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Why the score is reduced"
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-400"
                    />
                </label>
                <div className="md:col-span-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full inline-flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={12} /> {saving ? 'Saving…' : 'Add deduction'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-bold">
                    <AlertCircle size={14} /> {error}
                </div>
            )}

            <div className="bg-white rounded-[20px] border border-slate-150/80 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                        <tr>
                            <th className={HEAD_CLASS}>Date</th>
                            <th className={HEAD_CLASS}>Hotel</th>
                            <th className={`${HEAD_CLASS} text-right`}>Deduction</th>
                            <th className={HEAD_CLASS}>Reason</th>
                            <th className={HEAD_CLASS}>Added by</th>
                            <th className={`${HEAD_CLASS} text-right`}><span className="sr-only">Remove</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {deductions.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-400">No deductions recorded.</td>
                            </tr>
                        ) : (
                            deductions.map(d => (
                                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-3 py-3.5 text-xs font-bold text-slate-600 whitespace-nowrap">{new Date(d.created_at).toLocaleDateString()}</td>
                                    <td className="px-3 py-3.5 text-sm font-bold text-slate-800">{hotelLabel(d.hotel_id)}</td>
                                    <td className="px-3 py-3.5 text-sm font-black text-rose-700 text-right tabular-nums">-{d.percentage}%</td>
                                    <td className="px-3 py-3.5 text-xs font-medium text-slate-700">{d.reason}</td>
                                    <td className="px-3 py-3.5 text-xs font-bold text-slate-500">{d.created_by || '—'}</td>
                                    <td className="px-3 py-3.5 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(d)}
                                            title="Remove this deduction"
                                            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-2 rounded-xl border border-rose-100/60 active:scale-95 transition-all"
                                        >
                                            <Trash2 size={11} />
                                            <span className="sr-only">Remove</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
