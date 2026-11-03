import React from 'react';
import { AuditCategory } from '../../types';
import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, Edit, Plus, Search, Trash2, X } from 'lucide-react';


// Moved out of AdminPanelScreen (sub-view 'categories'). Values are passed in from the admin screen.
export interface CategoriesViewProps {
    onBackToDashboard: () => void;
    confirmCatDeleteId: string;
    expandedDepartments: Record<string, boolean>;
    filteredCategories: AuditCategory[];
    groupedCategories: { department: any; categories: any; }[];
    handleDeleteCat: (id: string) => Promise<void>;
    handleMoveCategory: (category: AuditCategory, direction: "up" | "down") => Promise<void>;
    handleOpenAddCat: () => void;
    handleOpenEditCat: (cat: AuditCategory) => void;
    searchQuery: string;
    setConfirmCatDeleteId: React.Dispatch<React.SetStateAction<string>>;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    toggleDepartmentExpansion: (deptId: string) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = (props) => {
    const { confirmCatDeleteId, expandedDepartments, filteredCategories, groupedCategories, handleDeleteCat, handleMoveCategory, handleOpenAddCat, handleOpenEditCat, searchQuery, setConfirmCatDeleteId, setSearchQuery, toggleDepartmentExpansion, onBackToDashboard } = props;
    return (
                    <div className="space-y-6">
                        {/* Categories Layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { onBackToDashboard(); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-55/80 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Checklist Categories</h2>
                                <p className="text-xs text-slate-500 mt-1">Manage checklist categories, organize them by department, and track task progress.</p>
                            </div>
                            <button 
                                onClick={handleOpenAddCat} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 justify-center shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                            >
                                <Plus size={16} />
                                <span>Add Category</span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center gap-3 hover:border-slate-300 focus-within:border-indigo-400 focus-within:shadow-[0_8px_30px_rgba(99,102,241,0.03)] transition-all">
                            <Search className="text-slate-400 shrink-0" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search categories..." 
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

                        {/* Categories list */}
                        {filteredCategories.length === 0 ? (
                            <div className="bg-white/40 backdrop-blur-sm p-12 rounded-[24px] border border-dashed border-slate-200 text-center">
                                <Search size={28} className="text-slate-300 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-slate-800">No categories match your filter</h3>
                                <p className="text-xs text-slate-400 mt-1">Try resetting the search query or create a new audit category.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.012)] overflow-hidden animate-fadeIn">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50 select-none text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                                                <th className="px-6 py-4.5">Category Group Name</th>
                                                <th className="px-6 py-4.5">Department</th>
                                                <th className="px-6 py-4.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {groupedCategories.map((group) => {
                                                const isExpanded = expandedDepartments[group.department.id] !== false;
                                                return (
                                                    <React.Fragment key={group.department.id}>
                                                        <tr 
                                                            className="bg-indigo-50/30 cursor-pointer hover:bg-indigo-50/60 transition-colors"
                                                            onClick={() => toggleDepartmentExpansion(group.department.id)}
                                                        >
                                                            <td colSpan={3} className="px-6 py-3 font-bold text-sm text-indigo-900">
                                                                <div className="flex items-center gap-2">
                                                                    {isExpanded ? <ChevronDown size={16} className="text-indigo-500" /> : <ChevronRight size={16} className="text-indigo-400" />}
                                                                    <span>{group.department.name}</span>
                                                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] ml-2">
                                                                        {group.categories.length} categories
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && group.categories.map((cat, index) => (
                                                            <tr key={cat.id} className="hover:bg-slate-50/20 transition-colors">
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex flex-col gap-0.5 text-slate-300">
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleMoveCategory(cat, 'up'); }}
                                                                                disabled={index === 0}
                                                                                className="hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors p-0.5"
                                                                            >
                                                                                <ChevronUp size={14} />
                                                                            </button>
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleMoveCategory(cat, 'down'); }}
                                                                                disabled={index === group.categories.length - 1}
                                                                                className="hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors p-0.5"
                                                                            >
                                                                                <ChevronDown size={14} />
                                                                            </button>
                                                                        </div>
                                                                        <div className="w-9 h-9 rounded-xl bg-indigo-50/80 text-indigo-700 flex items-center justify-center font-black text-xs uppercase shadow-sm shrink-0">
                                                                            C
                                                                        </div>
                                                                        <span className="text-sm font-bold text-slate-800 max-w-xs xl:max-w-md truncate block" title={cat.name}>
                                                                            {cat.name}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                                                                    {group.department.name}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                                                    {confirmCatDeleteId === cat.id ? (
                                                                        <div className="inline-flex items-center gap-2 bg-red-50/85 px-3 py-1.5 rounded-xl border border-red-105 text-left animate-fadeIn">
                                                                            <span className="text-[10px] text-red-600 font-bold whitespace-nowrap">Are you sure?</span>
                                                                            <button 
                                                                                onClick={() => handleDeleteCat(cat.id)}
                                                                                className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                            >
                                                                                Yes, delete
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => setConfirmCatDeleteId(null)}
                                                                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="inline-flex gap-2 justify-end w-full">
                                                                            <button 
                                                                                onClick={() => handleOpenEditCat(cat)}
                                                                                className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-xl transition-all font-bold flex items-center gap-1.5 active:scale-95"
                                                                            >
                                                                                <Edit size={13} />
                                                                                <span>Edit</span>
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => setConfirmCatDeleteId(cat.id)}
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
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
    );
};
