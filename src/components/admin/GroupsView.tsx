import React from 'react';
import { Hotel } from '../../types';
import { AuditGroup } from '../../types';
import { ArrowLeft, Building, Check, Database, Edit, Layers, Plus, Search, Trash2, X } from 'lucide-react';


// Moved out of AdminPanelScreen (sub-view 'groups'). Values are passed in from the admin screen.
export interface GroupsViewProps {
    onBackToDashboard: () => void;
    confirmGroupDeleteId: string;
    groupSearchQuery: string;
    groups: AuditGroup[];
    handleDeleteGroup: (id: string) => Promise<void>;
    handleGroupAssignAllHotels: (groupId: string) => Promise<void>;
    handleGroupClearAllHotels: (groupId: string) => Promise<void>;
    handleOpenAddGroup: () => void;
    handleOpenEditGroup: (group: AuditGroup) => void;
    handleToggleGroupHotel: (groupId: string, hotelId: string) => Promise<void>;
    includedHotels: Hotel[];
    selectedGroupId: string;
    setConfirmGroupDeleteId: React.Dispatch<React.SetStateAction<string>>;
    setGroupSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    setSelectedGroupId: React.Dispatch<React.SetStateAction<string>>;
    setShowSqlModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const GroupsView: React.FC<GroupsViewProps> = (props) => {
    const { confirmGroupDeleteId, groupSearchQuery, groups, handleDeleteGroup, handleGroupAssignAllHotels, handleGroupClearAllHotels, handleOpenAddGroup, handleOpenEditGroup, handleToggleGroupHotel, includedHotels, selectedGroupId, setConfirmGroupDeleteId, setGroupSearchQuery, setSelectedGroupId, setShowSqlModal, onBackToDashboard } = props;
    return (
                    <div className="space-y-6">
                        {/* Audit Groups Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <button 
                                    onClick={() => { onBackToDashboard(); }} 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-slate-100 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <ArrowLeft size={12} /> Back to Dashboard
                                </button>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Checklist Groups</h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    Manage checklist groups and assign categories or items to them using our real-time selector.
                                </p>
                            </div>

                            <button 
                                onClick={() => setShowSqlModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 shrink-0"
                            >
                                <Database size={14} className="text-emerald-400" />
                                <span>Supabase SQL Migration</span>
                            </button>
                        </div>

                        {/* MAIN WORKSPACE GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* LEFT COLUMN: AUDIT GROUPS SELECTOR */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs col-span-1 space-y-4 flex flex-col max-h-[700px]">
                                <div className="flex items-center justify-between shrink-0">
                                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                        <Layers size={16} className="text-indigo-600" />
                                        <span>Checklist Groups</span>
                                    </h3>
                                    <button 
                                        onClick={handleOpenAddGroup} 
                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                        title="Create Checklist Group"
                                    >
                                        <Plus size={13} />
                                        <span>Create</span>
                                    </button>
                                </div>

                                <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                                    {groups.length === 0 ? (
                                        <div className="text-center py-8 text-xs font-bold text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                            No checklist groups found. Click Create above!
                                        </div>
                                    ) : (
                                        groups.map(group => {
                                            const assignedHotelsCount = group.hotelIds ? group.hotelIds.length : 0;
                                            const isSelected = selectedGroupId === group.id;

                                            return (
                                                <div 
                                                    key={group.id}
                                                    onClick={() => { setSelectedGroupId(group.id); setGroupSearchQuery(''); }}
                                                    className={`w-full text-left p-3.5 rounded-xl transition-all border cursor-pointer select-none relative group ${
                                                        isSelected 
                                                            ? 'bg-indigo-50/90 border-indigo-200 text-indigo-900 shadow-2xs' 
                                                            : 'bg-white border-slate-100 hover:bg-slate-50/80 text-slate-700'
                                                    }`}
                                                >
                                                    <div className="pr-16">
                                                        <div className="font-bold text-sm text-slate-800 truncate">
                                                            {group.name}
                                                        </div>
                                                        <div className="text-[11px] font-semibold text-slate-500 mt-0.5 line-clamp-1 italic">
                                                            {group.description || 'No description provided'}
                                                        </div>
                                                    </div>

                                                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenEditGroup(group);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-md transition-all"
                                                            title="Edit Details"
                                                        >
                                                            <Edit size={11} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmGroupDeleteId(group.id);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-md transition-all"
                                                            title="Delete Group"
                                                        >
                                                            <Trash2 size={11} />
                                                        </button>
                                                    </div>

                                                    {confirmGroupDeleteId === group.id && (
                                                        <div 
                                                            className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-between px-3 z-10 border border-red-200"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <span className="text-[10px] text-red-600 font-bold">Delete group?</span>
                                                            <div className="flex gap-1.5">
                                                                <button 
                                                                    onClick={() => handleDeleteGroup(group.id)}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[9px] font-black"
                                                                >
                                                                    Yes, delete
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmGroupDeleteId(null)}
                                                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-[9px] font-black"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                                            assignedHotelsCount > 0 ? 'bg-indigo-100/70 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                                        }`}>
                                                            {assignedHotelsCount} {assignedHotelsCount === 1 ? 'Hotel Assigned' : 'Hotels Assigned'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* RIGHT COLUMN: ASSIGNMENT PANELS (CATEGORIES & ITEMS TABS) */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 space-y-6 flex flex-col max-h-[700px]">
                                {/* HOTEL HEADER */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 shrink-0">
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                                            <Building size={16} className="text-indigo-600" />
                                            <span>Assign Hotels to Group</span>
                                        </h3>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            Select which hotels are assigned to this audit group.
                                        </p>
                                    </div>

                                    {selectedGroupId && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleGroupAssignAllHotels(selectedGroupId)}
                                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-extrabold rounded-lg transition-all border border-indigo-200 active:scale-95"
                                            >
                                                Assign All Hotels
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleGroupClearAllHotels(selectedGroupId)}
                                                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[9px] font-extrabold rounded-lg transition-all border border-slate-200 active:scale-95"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {selectedGroupId ? (
                                    <>
                                        {/* Search bar */}
                                        <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2 shrink-0 focus-within:border-indigo-300 focus-within:bg-white transition-all select-none">
                                            <Search className="text-slate-400 shrink-0" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Search hotels by name, code, or location..."
                                                className="w-full text-xs text-slate-700 bg-transparent outline-none border-none placeholder-slate-400 p-0 focus:ring-0"
                                                value={groupSearchQuery}
                                                onChange={(e) => setGroupSearchQuery(e.target.value)}
                                            />
                                            {groupSearchQuery && (
                                                <button type="button" onClick={() => setGroupSearchQuery('')} className="p-0.5 text-slate-300 hover:text-slate-500">
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                                            {includedHotels.filter(h => {
                                                if (!groupSearchQuery) return true;
                                                const q = groupSearchQuery.toLowerCase();
                                                return h.name.toLowerCase().includes(q) ||
                                                       (h.code && h.code.toLowerCase().includes(q)) ||
                                                       h.location.toLowerCase().includes(q);
                                            }).length === 0 ? (
                                                <div className="text-center py-10 text-xs font-bold text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                                    No matching hotels found.
                                                </div>
                                            ) : (
                                                includedHotels.filter(h => {
                                                    if (!groupSearchQuery) return true;
                                                    const q = groupSearchQuery.toLowerCase();
                                                    return h.name.toLowerCase().includes(q) ||
                                                           (h.code && h.code.toLowerCase().includes(q)) ||
                                                           h.location.toLowerCase().includes(q);
                                                }).map(hotel => {
                                                    const group = groups.find(g => g.id === selectedGroupId);
                                                    const isAssigned = group?.hotelIds?.includes(hotel.id);
                                                    const assignedGroups = groups.filter(g => (g.hotelIds || []).includes(hotel.id));
                                                    const otherGroups = assignedGroups.filter(g => g.id !== selectedGroupId);
                                                    const isAssignedToOther = otherGroups.length > 0;

                                                    return (
                                                         <div 
                                                             key={hotel.id} 
                                                             onClick={() => handleToggleGroupHotel(selectedGroupId, hotel.id)}
                                                             className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                                                                 isAssigned
                                                                     ? 'bg-indigo-50/60 border-indigo-300 hover:bg-indigo-100/50 shadow-sm shadow-indigo-100/30'
                                                                     : isAssignedToOther
                                                                         ? 'bg-slate-50/50 border-slate-200 hover:bg-indigo-50/30 opacity-90'
                                                                         : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                                                             }`}
                                                         >
                                                             <div className="flex items-center gap-3 min-w-0">
                                                                 <div className="relative flex items-center shrink-0">
                                                                     <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all border-2 ${
                                                                         isAssigned
                                                                             ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                                             : 'bg-white border-slate-300 hover:border-slate-400'
                                                                     }`}>
                                                                         {isAssigned && <Check size={11} className="text-white stroke-[3.5px]" />}
                                                                     </div>
                                                                 </div>
                                                                 
                                                                 <div className="min-w-0">
                                                                     <div className="flex flex-wrap items-center gap-1.5">
                                                                         <span className="text-xs font-black text-slate-800 truncate">{hotel.name}</span>
                                                                         {hotel.code && (
                                                                             <span className="bg-indigo-50 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                                                                                 {hotel.code}
                                                                             </span>
                                                                         )}
                                                                         
                                                                         {/* Status indicator badges */}
                                                                         {isAssigned && (
                                                                             <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-0.5">
                                                                                 Current Group
                                                                             </span>
                                                                         )}
                                                                         {otherGroups.length > 0 && (
                                                                             <span className="bg-slate-100 text-slate-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                                                                                 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                                                 Also in: {otherGroups.map(g => g.name).join(', ')}
                                                                             </span>
                                                                         )}
                                                                         {assignedGroups.length === 0 && (
                                                                             <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                                 <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                                                 Unassigned
                                                                             </span>
                                                                         )}
                                                                     </div>
                                                                     <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{hotel.location} • {hotel.brandClass}</p>
                                                                 </div>
                                                             </div>

                                                             {hotel.stars && (
                                                                 <span className="text-[10px] text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 shrink-0">
                                                                     {'★'.repeat(hotel.stars)}
                                                                 </span>
                                                             )}
                                                         </div>
                                                     );
                                                 })
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        <Layers className="mx-auto text-slate-300 mb-4 animate-pulse" size={40} />
                                        <h3 className="font-extrabold text-slate-800 text-sm">No group selected</h3>
                                        <p className="text-xs text-slate-400 mt-1">Select or create an Audit Group on the left to configure assignments.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
    );
};
