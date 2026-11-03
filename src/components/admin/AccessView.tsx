import React from 'react';
import { ArrowLeft } from 'lucide-react';


// Moved out of AdminPanelScreen (sub-view 'access'). Values are passed in from the admin screen.
export interface AccessViewProps {
    onBackToDashboard: () => void;
    auditorAccess: Record<string, boolean>;
    handleSaveAccess: () => Promise<void>;
    handleToggleAuditorAccess: (view: string) => void;
}

export const AccessView: React.FC<AccessViewProps> = (props) => {
    const { auditorAccess, handleSaveAccess, handleToggleAuditorAccess, onBackToDashboard } = props;
    return (
                    <div className="space-y-6">
                        {/* Access Right Management Layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { onBackToDashboard(); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-55/80 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Access Right Management</h2>
                                <p className="text-xs text-slate-500 mt-1">Configure section accessibility by user levels.</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="text-xs uppercase bg-slate-50 text-slate-700">
                                        <tr>
                                            <th className="px-6 py-3">Section</th>
                                            <th className="px-6 py-3">Auditor</th>
                                            <th className="px-6 py-3">Auditee</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {[
                                            { parent: 'Dashboard', children: [] },
                                            { parent: 'Audit & Reporting', children: ['Audit Report & Inspection', 'Audit Results', 'Recent Activity'] },
                                            { parent: 'Manage Master Data', children: ['Hotels', 'Departments', 'Categories', 'Items', 'Groups', 'Batches'] },
                                            { parent: 'Access Right Management', children: ['User Management', 'Access Rights'] }
                                        ].map((group) => (
                                            <React.Fragment key={group.parent}>
                                                <tr className="bg-slate-50">
                                                    <td className="px-6 py-3 font-bold text-slate-900">{group.parent}</td>
                                                    <td className="px-6 py-3"></td>
                                                    <td className="px-6 py-3"></td>
                                                </tr>
                                                {(group.children.length > 0 ? group.children : [group.parent]).map((view) => (
                                                    <tr key={view} className="hover:bg-slate-50">
                                                        <td className="px-6 py-4 pl-12 text-slate-700">{view}</td>
                                                        <td className="px-6 py-4">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={!!auditorAccess[view]}
                                                                onChange={() => handleToggleAuditorAccess(view)}
                                                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <input 
                                                                type="checkbox" 
                                                                disabled
                                                                className="w-4 h-4 text-slate-400 border-slate-300 rounded cursor-not-allowed"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={handleSaveAccess}
                                    className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-full hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
                                >
                                    Save Access Rules
                                </button>
                            </div>
                        </div>
                    </div>
    );
};
