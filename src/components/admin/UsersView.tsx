import React from 'react';
import { AlertCircle, ArrowLeft, Clock, Edit, Lock, Plus, RefreshCw, Search, ShieldCheck, Trash2, X } from 'lucide-react';


// Moved out of AdminPanelScreen (sub-view 'users'). Values are passed in from the admin screen.
export interface UsersViewProps {
    onBackToDashboard: () => void;
    fetchProfilesFromSupabase: (forceRefresh?: boolean) => Promise<void>;
    getRoleStyles: (accessLevel: string) => { bg: string; text: string; icon: any; };
    handleOpenCreateUser: () => void;
    handleOpenEditUser: (user: any) => void;
    isProfilesTableMissing: boolean;
    isSupabaseLoading: boolean;
    profilesList: any[];
    searchQuery: string;
    setConfirmUserDeleteId: React.Dispatch<React.SetStateAction<string>>;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    updateAccessLevel: (userId: string, newAccessLevel: string) => Promise<void>;
    updateApprovalStatus: (userId: string, isApproved: boolean) => Promise<void>;
    userProfile: any;
}

export const UsersView: React.FC<UsersViewProps> = (props) => {
    const { fetchProfilesFromSupabase, getRoleStyles, handleOpenCreateUser, handleOpenEditUser, isProfilesTableMissing, isSupabaseLoading, profilesList, searchQuery, setConfirmUserDeleteId, setSearchQuery, updateAccessLevel, updateApprovalStatus, userProfile, onBackToDashboard } = props;
    return (
                    (userProfile?.access_level !== 'admin' && userProfile?.access_level !== 'auditor') ? (
                        <div className="bg-red-50/50 border border-red-100 p-8 rounded-[28px] text-center max-w-lg mx-auto my-12 animate-fadeIn shadow-sm">
                            <ShieldCheck className="text-red-500 mx-auto mb-4" size={48} />
                            <h3 className="text-lg font-bold text-slate-800">Access Restricted</h3>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                Only designated Administrators are authorized to access the User Management portal. Please contact a system administrator if you require authorization.
                            </p>
                            <button 
                                onClick={() => { onBackToDashboard(); }}
                                className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-white hover:bg-slate-50 px-4 py-2 rounded-full border border-indigo-100 shadow-sm transition-all"
                            >
                                <ArrowLeft size={12} /> Return to Dashboard
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Users Layout Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <button 
                                        onClick={() => { onBackToDashboard(); }} 
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-slate-100 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                                    >
                                        <ArrowLeft size={12} /> Back to Dashboard
                                    </button>
                                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Onboarded User Registry</h2>
                                    <p className="text-xs text-slate-500 mt-1">Manage system logins, registration roles, property bindings, and brand audit privileges.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button 
                                        onClick={handleOpenCreateUser}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 justify-center shadow-lg hover:shadow-indigo-500/10 active:scale-95 outline-none"
                                    >
                                        <Plus size={16} />
                                        <span>Add New User</span>
                                    </button>
                                    <button 
                                        onClick={() => fetchProfilesFromSupabase(true)}
                                        className="bg-white hover:bg-slate-50 text-slate-750 border border-slate-200 transition-all px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 justify-center shadow-sm active:scale-95 outline-none"
                                    >
                                        <Clock size={16} className={isSupabaseLoading ? 'animate-spin' : ''} />
                                        <span>Sync Profiles</span>
                                    </button>
                                </div>
                            </div>

                            {/* Database Setup Notice if table missing */}
                            {isProfilesTableMissing && (
                                <div className="bg-amber-50 border border-amber-200 p-5 rounded-[20px] animate-fadeIn space-y-3">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-805">Supabase Table Sync Pending</h4>
                                            <p className="text-xs text-slate-650 leading-relaxed mt-1">
                                                The <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-800">public.audit_users</code> table doesn't exist yet on your Supabase instance, or permissions require database provisioning. 
                                            </p>
                                            <p className="text-xs text-slate-650 leading-relaxed mt-2 font-medium">
                                                👉 We have automatically saved your onboarding information locally in your browser. To finalize cloud storage sync, please copy the script inside the <strong className="text-slate-800">/supabase-onboarding.sql</strong> file and execute it within your Supabase SQL Editor.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Search bar */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center gap-3 hover:border-slate-300 focus-within:border-indigo-400 focus-within:shadow-[0_8px_30px_rgba(99,102,241,0.03)] transition-all">
                                <Search className="text-slate-400 shrink-0" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search users by email, name, role, or hotel..." 
                                    className="w-full text-sm text-slate-705 bg-transparent outline-none border-none placeholder-slate-400 focus:ring-0"
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

                            {/* User List */}
                            {(() => {
                                const filteredProfiles = profilesList.filter(p => {
                                    const q = searchQuery.toLowerCase();
                                    return (
                                        (p.email || '').toLowerCase().includes(q) ||
                                        (p.display_name || '').toLowerCase().includes(q) ||
                                        (p.first_name || '').toLowerCase().includes(q) ||
                                        (p.last_name || '').toLowerCase().includes(q) ||
                                        (p.role || '').toLowerCase().includes(q) ||
                                        (p.hotel_name || '').toLowerCase().includes(q) ||
                                        (p.hotel_code || '').toLowerCase().includes(q)
                                    );
                                });

                                const formatSqlTimestamp = (isoString?: string) => {
                                    if (!isoString) return '—';
                                    try {
                                        const d = new Date(isoString);
                                        if (isNaN(d.getTime())) return '—';
                                        const day = String(d.getUTCDate()).padStart(2, '0');
                                        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                                        const year = d.getUTCFullYear();
                                        const hours = String(d.getUTCHours()).padStart(2, '0');
                                        const minutes = String(d.getUTCMinutes()).padStart(2, '0');
                                        const seconds = String(d.getUTCSeconds()).padStart(2, '0');
                                        return `${day}-${month}-${year} ${hours}:${minutes}:${seconds} (UTC)`;
                                    } catch {
                                        return '—';
                                    }
                                };

                                if (filteredProfiles.length === 0) {
                                    return (
                                        <div className="bg-white/40 backdrop-blur-sm p-12 rounded-[24px] border border-dashed border-slate-200 text-center">
                                            <Search size={28} className="text-slate-300 mx-auto mb-3" />
                                            <h3 className="text-sm font-bold text-slate-800">No registered users matched your criteria</h3>
                                            <p className="text-xs text-slate-400 mt-1 font-medium">Try verifying spelling or clear search filters.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="bg-white rounded-[24px] border border-slate-150/80 shadow-[0_8px_30px_rgba(15,23,42,0.012)] overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-slate-100 bg-slate-50/50 select-none text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                                                        <th className="px-6 py-4">Display Name</th>
                                                        <th className="px-6 py-4">Email</th>
                                                        <th className="px-6 py-4">Hotel Property</th>
                                                        <th className="px-6 py-4">Role</th>
                                                        <th className="px-6 py-4">Access Level</th>
                                                        <th className="px-6 py-4">Approval</th>
                                                        <th className="px-6 py-4">Created At</th>
                                                        <th className="px-6 py-4 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                                    {filteredProfiles.map((p, index) => {
                                                        const roleStyles = getRoleStyles(p.access_level);
                                                        const isOnboardingFinished = p.access_level === 'admin' || !!(p.first_name && p.role && (p.hotel_id || p.hotel_name));
                                                        return (
                                                            <tr key={p.id || index} className={`${roleStyles.bg} hover:opacity-95 transition-colors`}>
                                                                <td className="px-6 py-4 text-xs font-semibold text-slate-800 flex items-center gap-2">
                                                                    <span className={roleStyles.text}>{roleStyles.icon}</span>
                                                                    <div>
                                                                        <div className="font-bold flex items-center gap-1.5 flex-wrap">
                                                                            <span>{p.display_name || '—'}</span>
                                                                            {!isOnboardingFinished && (
                                                                                <span 
                                                                                    className="inline-flex items-center gap-1 text-[9px] bg-amber-50 text-amber-700 border border-amber-150/60 px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider animate-pulse animate-infinite"
                                                                                    title="User has not completed the onboarding process"
                                                                                >
                                                                                    <RefreshCw size={8} className="animate-spin" /> In Progress
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {(p.first_name || p.last_name) && (
                                                                            <div className="text-[10px] text-slate-400 font-medium">({p.first_name || ''} {p.last_name || ''})</div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-slate-600">{p.email || '—'}</td>
                                                                <td className="px-6 py-4 text-xs">
                                                                    {p.hotel_name ? (
                                                                        <div>
                                                                             <span className="font-bold text-slate-800">{p.hotel_name}</span>
                                                                             {p.hotel_code && <span className="ml-1.5 font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">#{p.hotel_code}</span>}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-400 font-medium">—</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-slate-600">
                                                                    <div>{p.role || '—'}</div>
                                                                    {p.is_brand_audit_lead && (
                                                                        <span className="mt-1 inline-flex items-center text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">Brand Lead</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs">
                                                                    <select 
                                                                        value={p.access_level || 'auditee'} 
                                                                        disabled={!isOnboardingFinished}
                                                                        onChange={(e) => updateAccessLevel(p.id, e.target.value)}
                                                                        className={`text-xs font-bold rounded-lg px-2 py-1 outline-none shadow-sm border transition-all ${
                                                                            !isOnboardingFinished 
                                                                                ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                                                                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 cursor-pointer'
                                                                        }`}
                                                                        title={!isOnboardingFinished ? "Locked: Onboarding in progress" : ""}
                                                                    >
                                                                        <option value="admin">Admin</option>
                                                                        <option value="auditor">Auditor</option>
                                                                        <option value="auditee">Auditee</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs">
                                                                    {p.email === 'brandaudit@swiss-belhotel.com' ? (
                                                                        <span className="text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                            Bypassed (Super)
                                                                        </span>
                                                                    ) : (
                                                                        <select 
                                                                            value={p.is_approved ? 'approved' : 'pending'} 
                                                                            disabled={!isOnboardingFinished}
                                                                            onChange={(e) => updateApprovalStatus(p.id, e.target.value === 'approved')}
                                                                            className={`text-xs font-bold rounded-lg px-2 py-1 outline-none border transition-all shadow-sm ${
                                                                                !isOnboardingFinished 
                                                                                    ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                                                                                    : p.is_approved 
                                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300 cursor-pointer' 
                                                                                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300 cursor-pointer'
                                                                            }`}
                                                                            title={!isOnboardingFinished ? "Locked: Onboarding in progress" : ""}
                                                                        >
                                                                            <option value="approved">Approved</option>
                                                                            <option value="pending">Pending</option>
                                                                        </select>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-[11px] font-mono font-bold text-slate-550">
                                                                    {formatSqlTimestamp(p.created_at)}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        {isOnboardingFinished ? (
                                                                            <button 
                                                                                onClick={() => handleOpenEditUser(p)}
                                                                                className="p-1.5 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg border border-indigo-100/50 transition-all"
                                                                                title="Edit Profile"
                                                                            >
                                                                                <Edit size={13} />
                                                                            </button>
                                                                        ) : (
                                                                            <button 
                                                                                disabled
                                                                                className="p-1.5 text-slate-400 bg-slate-50 rounded-lg border border-slate-200 cursor-not-allowed"
                                                                                title="Editing locked: Onboarding in progress"
                                                                            >
                                                                                <Lock size={13} />
                                                                            </button>
                                                                        )}
                                                                        {userProfile?.email === 'brandaudit@swiss-belhotel.com' && (
                                                                            isOnboardingFinished ? (
                                                                                <button 
                                                                                    onClick={() => setConfirmUserDeleteId(p.id)}
                                                                                    className="p-1.5 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-lg border border-red-100/50 transition-all"
                                                                                    title="Delete Profile"
                                                                                >
                                                                                    <Trash2 size={13} />
                                                                                </button>
                                                                            ) : (
                                                                                <button 
                                                                                    disabled
                                                                                    className="p-1.5 text-slate-300 bg-slate-50 rounded-lg border border-slate-100 cursor-not-allowed animate-pulse"
                                                                                    title="Deleting locked: Onboarding in progress"
                                                                                >
                                                                                    <Trash2 size={13} />
                                                                                </button>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )
    );
};
