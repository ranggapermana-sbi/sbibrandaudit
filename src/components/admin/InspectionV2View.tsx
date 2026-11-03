import React from 'react';
import { AuditBatch, AuditCategory, AuditGroup, AuditItem, Hotel } from '../../types';
import { ArrowLeft, Lock, Unlock } from 'lucide-react';


// Moved out of AdminPanelScreen (sub-view 'inspection_v2'). Values are passed in from the admin screen.
export interface InspectionV2ViewProps {
    onBackToDashboard: () => void;
    AuditInspectionV2: any;
    auditorCategoryAssignments: any[];
    batches: AuditBatch[];
    catList: AuditCategory[];
    groups: AuditGroup[];
    hotels: Hotel[];
    isV2Unlocked: boolean;
    items: AuditItem[];
    setIsV2PinModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsV2Unlocked: React.Dispatch<React.SetStateAction<boolean>>;
    setSubView: React.Dispatch<React.SetStateAction<"dashboard" | "departments" | "hotels" | "batches" | "categories" | "items" | "groups" | "users" | "access" | "inspection" | "inspection_v2" | "auditor_assignment" | "progress_report" | "audit_results">>;
    setV2PinError: React.Dispatch<React.SetStateAction<string>>;
    setV2PinValue: React.Dispatch<React.SetStateAction<string>>;
    userProfile: any;
}

export const InspectionV2View: React.FC<InspectionV2ViewProps> = (props) => {
    const { AuditInspectionV2, auditorCategoryAssignments, batches, catList, groups, hotels, isV2Unlocked, items, setIsV2PinModalOpen, setIsV2Unlocked, setSubView, setV2PinError, setV2PinValue, userProfile, onBackToDashboard } = props;
    return (
                    !isV2Unlocked ? (
                        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-6 animate-fadeIn">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-xs">
                                <Lock size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Audit Inspection V2 Protected</h3>
                                <p className="text-xs text-indigo-700 font-extrabold uppercase tracking-wider bg-indigo-50 py-1 px-3 rounded-lg border border-indigo-100 inline-block mt-2">
                                    Super Admin PIN Required
                                </p>
                                <p className="text-xs text-slate-500 mt-3">
                                    Please enter the Super Admin PIN <span className="font-bold text-indigo-600">(230987)</span> to access Audit Inspection V2.
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setIsV2PinModalOpen(true);
                                    setV2PinValue('');
                                    setV2PinError('');
                                }}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-indigo-200 transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                <Lock size={16} /> Enter PIN to Unlock V2
                            </button>

                            <button
                                onClick={() => setSubView('dashboard')}
                                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
                                <div>
                                    <button 
                                        onClick={() => { onBackToDashboard(); }} 
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 px-3.5 py-1.5 rounded-full border border-indigo-100/50 hover:shadow-2xs active:scale-95 transition-all outline-none cursor-pointer"
                                    >
                                        <ArrowLeft size={12} /> Back to Dashboard
                                    </button>
                                    <div className="flex items-center gap-2 mt-2">
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Audit Inspection v2</h2>
                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200 flex items-center gap-1">
                                            <Unlock size={10} /> Unlocked
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        High-performance direct Supabase synchronization engine with canonical hotel codes.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => {
                                            setIsV2Unlocked(false);
                                            try { sessionStorage.removeItem('v2_unlocked'); } catch {}
                                            setSubView('dashboard');
                                        }}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100/80 px-3.5 py-2 rounded-xl border border-amber-200 transition-all cursor-pointer"
                                        title="Lock V2 access again"
                                    >
                                        <Lock size={13} /> Lock V2
                                    </button>
                                </div>
                            </div>

                            <AuditInspectionV2 
                                hotels={hotels} 
                                categories={catList} 
                                items={items} 
                                userProfile={userProfile}
                                batches={batches}
                                groups={groups}
                                auditorCategoryAssignments={auditorCategoryAssignments}
                            />
                        </div>
                    )
    );
};
