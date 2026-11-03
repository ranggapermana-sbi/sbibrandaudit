import React from 'react';
import { Department } from '../../types';
import { ArrowLeft, Edit, Plus, Search, Trash2, X } from 'lucide-react';


// Moved out of AdminPanelScreen (sub-view 'departments'). Values are passed in from the admin screen.
export interface DepartmentsViewProps {
    onBackToDashboard: () => void;
    confirmDeptDeleteId: string;
    filteredDepts: Department[];
    handleDeleteDept: (id: string) => Promise<void>;
    handleOpenAddDept: () => void;
    handleOpenEditDept: (dept: Department) => void;
    searchQuery: string;
    setConfirmDeptDeleteId: React.Dispatch<React.SetStateAction<string>>;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = (props) => {
    const { confirmDeptDeleteId, filteredDepts, handleDeleteDept, handleOpenAddDept, handleOpenEditDept, searchQuery, setConfirmDeptDeleteId, setSearchQuery, onBackToDashboard } = props;
    return (
                    <div className="space-y-6">
                        {/* Departments Layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { onBackToDashboard(); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-55/80 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Departments</h2>
                                <p className="text-xs text-slate-500 mt-1">Manage organization departments and their designated heads.</p>
                            </div>
                            <button 
                                onClick={handleOpenAddDept} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 justify-center shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                            >
                                <Plus size={16} />
                                <span>Add Department</span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center gap-3 hover:border-slate-300 focus-within:border-indigo-400 focus-within:shadow-[0_8px_30px_rgba(99,102,241,0.03)] transition-all">
                            <Search className="text-slate-400 shrink-0" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search departments or heads..." 
                                className="w-full text-sm text-slate-700 bg-transparent outline-none border-none placeholder-slate-400 focus:ring-0"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')} 
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Departments Grid or Table */}
                        {filteredDepts.length === 0 ? (
                            <div className="bg-white/40 backdrop-blur-sm p-12 rounded-[24px] border border-dashed border-slate-200 text-center">
                                <Search size={28} className="text-slate-300 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-slate-800">No departments match your filter</h3>
                                <p className="text-xs text-slate-400 mt-1">Try resetting the search query or add a brand-new department.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.012)] overflow-hidden animate-fadeIn">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50 select-none text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                                                <th className="px-6 py-4.5">Department Name</th>
                                                <th className="px-6 py-4.5">Department Head</th>
                                                <th className="px-6 py-4.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredDepts.map((dept) => (
                                                <tr key={dept.id} className="hover:bg-slate-50/20 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-indigo-50/80 text-indigo-700 flex items-center justify-center font-black text-xs uppercase shadow-sm shrink-0">
                                                                {dept.name.substring(0, 2)}
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-800">{dept.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-extrabold text-slate-500 uppercase shrink-0">
                                                                {dept.head.charAt(0)}
                                                            </div>
                                                            <span className="text-sm text-slate-600 font-semibold">{dept.head}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                                        {confirmDeptDeleteId === dept.id ? (
                                                            <div className="inline-flex items-center gap-2 bg-red-50/85 px-3 py-1.5 rounded-xl border border-red-105 text-left animate-fadeIn">
                                                                <span className="text-[10px] text-red-600 font-bold whitespace-nowrap">Are you sure?</span>
                                                                <button 
                                                                    onClick={() => handleDeleteDept(dept.id)}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Yes, delete
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmDeptDeleteId(null)}
                                                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex gap-2">
                                                                <button 
                                                                    onClick={() => handleOpenEditDept(dept)}
                                                                    className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-xl transition-all font-bold flex items-center gap-1.5 active:scale-95"
                                                                >
                                                                    <Edit size={13} />
                                                                    <span>Edit</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmDeptDeleteId(dept.id)}
                                                                    className="px-3 py-1.5 text-slate-600 hover:text-red-800 hover:bg-red-50 border border-slate-200 hover:border-red-100 rounded-xl transition-all font-bold flex items-center gap-1.5 active:scale-95"
                                                                >
                                                                    <Trash2 size={13} />
                                                                    <span>Delete</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
    );
};
