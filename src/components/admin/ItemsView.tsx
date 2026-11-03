import React from 'react';
import { Department } from '../../types';
import { AuditItem } from '../../types';
import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, Edit, Plus, Trash2 } from 'lucide-react';


// Moved out of AdminPanelScreen (sub-view 'items'). Values are passed in from the admin screen.
export interface ItemsViewProps {
    onBackToDashboard: () => void;
    confirmItemDeleteId: string;
    departments: Department[];
    expandedCategories: Record<string, boolean>;
    groupedItems: { category: any; items: any; }[];
    handleDeleteItem: (id: string) => Promise<void>;
    handleMoveItem: (item: AuditItem, direction: "up" | "down") => Promise<void>;
    handleOpenAddItem: () => void;
    handleOpenEditItem: (item: AuditItem) => void;
    setConfirmItemDeleteId: React.Dispatch<React.SetStateAction<string>>;
    toggleCategoryExpansion: (categoryId: string) => void;
}

export const ItemsView: React.FC<ItemsViewProps> = (props) => {
    const { confirmItemDeleteId, departments, expandedCategories, groupedItems, handleDeleteItem, handleMoveItem, handleOpenAddItem, handleOpenEditItem, setConfirmItemDeleteId, toggleCategoryExpansion, onBackToDashboard } = props;
    return (
                    <div className="space-y-6">
                        {/* Audit Items Layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { onBackToDashboard(); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-55/80 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Checklist Items</h2>
                                <p className="text-xs text-slate-500 mt-1">Manage checklist items and their input requirements.</p>
                            </div>
                            <button 
                                onClick={handleOpenAddItem} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 justify-center shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                            >
                                <Plus size={16} />
                                <span>Add Item</span>
                            </button>
                        </div>
                        {/* items listing */}
                        <div className="bg-white rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.012)] overflow-hidden animate-fadeIn">
                             <table className="w-full text-left border-collapse">
                                         <thead>
                                             <tr className="border-b border-slate-100 bg-slate-50/50 select-none text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                                                 <th className="px-6 py-4.5">Item Name</th>
                                                 <th className="px-6 py-4.5">Department / Category</th>
                                                 <th className="px-6 py-4.5">Input Type</th>
                                                 <th className="px-6 py-4.5 text-center">Point</th>
                                                 <th className="px-6 py-4.5 text-right">Actions</th>
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-slate-100">
                                            {groupedItems.map((group) => {
                                                const isExpanded = expandedCategories[group.category.id];
                                                return (
                                                    <React.Fragment key={group.category.id}>
                                                        <tr 
                                                            className="bg-indigo-50/30 cursor-pointer hover:bg-indigo-50/60 transition-colors"
                                                            onClick={() => toggleCategoryExpansion(group.category.id)}
                                                        >
                                                            <td colSpan={5} className="px-6 py-3 font-bold text-sm text-indigo-900">
                                                                <div className="flex items-center gap-2">
                                                                    {isExpanded ? <ChevronDown size={16} className="text-indigo-500" /> : <ChevronRight size={16} className="text-indigo-400" />}
                                                                    <span>{group.category.name}</span>
                                                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] ml-2">
                                                                        {group.items.length} items
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && group.items.map((item, index) => (
                                                            <tr key={item.id} className="hover:bg-slate-50/20 transition-colors">
                                                                <td className="px-6 py-4 font-bold text-sm text-slate-800">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex flex-col gap-0.5 text-slate-300">
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleMoveItem(item, 'up'); }}
                                                                                disabled={index === 0}
                                                                                className="hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors p-0.5"
                                                                            >
                                                                                <ChevronUp size={14} />
                                                                            </button>
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleMoveItem(item, 'down'); }}
                                                                                disabled={index === group.items.length - 1}
                                                                                className="hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors p-0.5"
                                                                            >
                                                                                <ChevronDown size={14} />
                                                                            </button>
                                                                        </div>
                                                                        <span>{item.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-slate-500 font-semibold">
                                                                    <div>{departments.find(d => d.id === item.departmentId)?.name} / {group.category.name}</div>
                                                                    <div className="mt-1 flex items-center">
                                                                        {item.filled_by_hotel !== false ? (
                                                                            <span className="inline-flex items-center text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100/40 px-2 py-0.5 rounded-md font-extrabold tracking-wide uppercase">Filled by Hotel</span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center text-[9px] bg-amber-50 text-amber-700 border border-amber-100/50 px-2 py-0.5 rounded-md font-extrabold tracking-wide uppercase">Auditor Only</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-bold text-indigo-600 uppercase">
                                                                    <span className="bg-indigo-50/80 px-2.5 py-1 rounded-full text-[10px] border border-indigo-100/30">
                                                                        {item.inputType}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-bold text-slate-700 text-center">
                                                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-md text-xs font-extrabold">
                                                                        {item.points ?? 5} pts
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                                                    {confirmItemDeleteId === item.id ? (
                                                                        <div className="inline-flex items-center gap-2 bg-red-50/85 px-3 py-1.5 rounded-xl border border-red-105 text-left animate-fadeIn">
                                                                            <span className="text-[10px] text-red-600 font-bold whitespace-nowrap">Are you sure?</span>
                                                                            <button 
                                                                                onClick={() => handleDeleteItem(item.id)}
                                                                                className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                            >
                                                                                Yes, delete
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => setConfirmItemDeleteId(null)}
                                                                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="inline-flex gap-2 justify-end w-full">
                                                                            <button 
                                                                                onClick={() => handleOpenEditItem(item)}
                                                                                className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-xl transition-all font-bold flex items-center gap-1.5 active:scale-95"
                                                                            >
                                                                                <Edit size={13} />
                                                                                <span>Edit</span>
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => setConfirmItemDeleteId(item.id)}
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
    );
};
