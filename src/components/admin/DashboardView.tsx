import React from 'react';
import { AuditBatch, AuditCategory, AuditGroup, Department, Hotel } from '../../types';
import { Briefcase, Building, ChevronRight, ClipboardCheck, ClipboardList, FileCheck, Layers, Package, Percent, Settings2, ShieldCheck, Sparkles, Users } from 'lucide-react';


// Moved out of AdminPanelScreen (sub-view 'dashboard'). Values are passed in from the admin screen.
export interface DashboardViewProps {
    onBackToDashboard: () => void;
    MAIN_URL: string;
    allSubmissions: any[];
    batches: AuditBatch[];
    catList: AuditCategory[];
    departments: Department[];
    fetchProfilesFromSupabase: (forceRefresh?: boolean) => Promise<void>;
    groups: AuditGroup[];
    handleSetSubView: (view: any) => void;
    hotels: Hotel[];
    includedHotels: Hotel[];
    profilesList: any[];
    setAuditResultsSearch: React.Dispatch<React.SetStateAction<string>>;
    setProgressSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    setSelectedAuditResultId: React.Dispatch<React.SetStateAction<string>>;
    setStatsModalCopied: React.Dispatch<React.SetStateAction<boolean>>;
    setStatsModalType: React.Dispatch<React.SetStateAction<"auditees" | "brand_leads">>;
    setSubView: React.Dispatch<React.SetStateAction<"dashboard" | "departments" | "hotels" | "batches" | "categories" | "items" | "groups" | "users" | "access" | "inspection" | "inspection_v2" | "auditor_assignment" | "progress_report" | "audit_results">>;
    stats: { title: string; value: string; icon: React.ForwardRefExoticComponent<any>; color: string; }[];
    supabaseConnected: boolean;
    userProfile: any;
}

export const DashboardView: React.FC<DashboardViewProps> = (props) => {
    const { MAIN_URL, allSubmissions, batches, catList, departments, fetchProfilesFromSupabase, groups, handleSetSubView, hotels, includedHotels, profilesList, setAuditResultsSearch, setProgressSearchQuery, setSearchQuery, setSelectedAuditResultId, setStatsModalCopied, setStatsModalType, setSubView, stats, supabaseConnected, userProfile, onBackToDashboard } = props;
    return (
                    <>
                        {/* Stats Row */}
                        {(userProfile?.access_level === 'admin' || userProfile?.access_level === 'auditor') && (
                            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {(() => {
                                    const activeHotels = includedHotels.filter(h => h.id !== 'sbi-test' && h.id !== 'sbi-dummy');
                                    const hotelsWithoutAuditees = activeHotels.filter(hotel => {
                                        const hasAuditee = profilesList.some(p => {
                                            const isAuditee = p.access_level !== 'admin' && p.access_level !== 'auditor';
                                            if (!isAuditee) return false;

                                            const hotelIdLower = String(hotel.id).toLowerCase();
                                            const hotelCodeLower = hotel.code ? String(hotel.code).toLowerCase() : '';
                                            const hotelNameLower = hotel.name ? String(hotel.name).toLowerCase() : '';

                                            const pIdLower = p.hotel_id ? String(p.hotel_id).toLowerCase() : '';
                                            const pCodeLower = p.hotel_code ? String(p.hotel_code).toLowerCase() : '';
                                            const pNameLower = p.hotel_name ? String(p.hotel_name).toLowerCase() : '';

                                            const pIds = p.hotel_id ? String(p.hotel_id).split(',').map((s: string) => s.trim().toLowerCase()) : [];

                                            const matchesId = pIds.includes(hotelIdLower) || pIdLower === hotelIdLower;
                                            const matchesCode = hotelCodeLower && pCodeLower === hotelCodeLower;
                                            const matchesName = hotelNameLower && pNameLower === hotelNameLower;

                                            return matchesId || matchesCode || matchesName;
                                        });
                                        return !hasAuditee;
                                    }).length;

                                    const hotelsWithoutBrandLeads = activeHotels.filter(hotel => {
                                        const hasBrandLead = profilesList.some(p => {
                                            const isBrandLead = !!p.is_brand_audit_lead;
                                            if (!isBrandLead) return false;

                                            const hotelIdLower = String(hotel.id).toLowerCase();
                                            const hotelCodeLower = hotel.code ? String(hotel.code).toLowerCase() : '';
                                            const hotelNameLower = hotel.name ? String(hotel.name).toLowerCase() : '';

                                            const pIdLower = p.hotel_id ? String(p.hotel_id).toLowerCase() : '';
                                            const pCodeLower = p.hotel_code ? String(p.hotel_code).toLowerCase() : '';
                                            const pNameLower = p.hotel_name ? String(p.hotel_name).toLowerCase() : '';

                                            const pIds = p.hotel_id ? String(p.hotel_id).split(',').map((s: string) => s.trim().toLowerCase()) : [];

                                            const matchesId = pIds.includes(hotelIdLower) || pIdLower === hotelIdLower;
                                            const matchesCode = hotelCodeLower && pCodeLower === hotelCodeLower;
                                            const matchesName = hotelNameLower && pNameLower === hotelNameLower;

                                            return matchesId || matchesCode || matchesName;
                                        });
                                        return !hasBrandLead;
                                    }).length;

                                    return stats.map((stat, i) => {
                                        const Icon = stat.icon;
                                        const isProperties = stat.title === 'Active Properties';
                                        const displayValue = isProperties ? activeHotels.length : (stat.title === 'Total Submissions' && allSubmissions.length > 0 ? allSubmissions.length : stat.value);
                                        return (
                                            <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center justify-between hover:shadow-[0_8px_32px_rgba(15,23,42,0.03)] hover:scale-[1.01] transition-all duration-300">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                                                    <p className="text-3xl font-extrabold text-slate-900 mt-1 font-sans tracking-tight">
                                                        {displayValue}
                                                    </p>
                                                    {isProperties && (
                                                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2.5 text-[11px] font-bold text-slate-500">
                                                            <span 
                                                                onClick={() => {
                                                                    setStatsModalType('auditees');
                                                                    setStatsModalCopied(false);
                                                                }}
                                                                className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 active:scale-98 transition-all" 
                                                                title="Click to view hotels with no registered auditee users"
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block animate-pulse"></span>
                                                                No Auditees: <strong className="text-slate-800 hover:text-indigo-700 underline decoration-dotted decoration-slate-300 hover:decoration-indigo-400 underline-offset-2">{hotelsWithoutAuditees}</strong>
                                                            </span>
                                                            <span className="text-slate-300">•</span>
                                                            <span 
                                                                onClick={() => {
                                                                    setStatsModalType('brand_leads');
                                                                    setStatsModalCopied(false);
                                                                }}
                                                                className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 active:scale-98 transition-all" 
                                                                title="Click to view hotels with no Brand Lead assigned"
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
                                                                No Brand Leads: <strong className="text-slate-800 hover:text-indigo-700 underline decoration-dotted decoration-slate-300 hover:decoration-indigo-400 underline-offset-2">{hotelsWithoutBrandLeads}</strong>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                                    stat.color.includes('indigo') ? 'bg-indigo-50/80 text-indigo-600' :
                                                    stat.color.includes('amber') ? 'bg-amber-50/80 text-amber-600' :
                                                    'bg-emerald-50/80 text-emerald-600'
                                                }`}>
                                                    <Icon size={24} />
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}

                                {/* ENROLLED USERS CARD */}
                                {(() => {
                                    const totalPending = profilesList.filter(p => !p.is_approved).length;
                                    const totalApproved = profilesList.filter(p => p.is_approved).length;
                                    const totalBrandLeads = profilesList.filter(p => p.is_brand_audit_lead).length;
                                    return (
                                        <div className="bg-white p-6 rounded-[24px] border border-slate-150/80 shadow-[0_4px_24px_rgba(15,23,42,0.015)] flex items-center justify-between hover:shadow-[0_8px_32px_rgba(15,23,42,0.03)] hover:scale-[1.01] transition-all duration-300">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrolled Users</p>
                                                <p className="text-3xl font-extrabold text-slate-900 mt-1 font-sans tracking-tight">
                                                    {totalApproved} <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded ml-1.5 inline-block align-middle">Onboarded</span>
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2.5 text-[11px] font-bold text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                                                        Pending: <strong className="text-slate-800">{totalPending}</strong>
                                                    </span>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                                        Approved: <strong className="text-slate-800">{totalApproved}</strong>
                                                    </span>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>
                                                        Brand Leads: <strong className="text-slate-800">{totalBrandLeads}</strong>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center shrink-0">
                                                <Users size={24} />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </section>
                        )}

                        {/* Config Area */}
                        {userProfile?.access_level === 'admin' && (
                            <section className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-150/80 shadow-[0_12px_40px_rgba(15,23,42,0.02)]">
                                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2.5">
                                        <Settings2 size={20} className="text-indigo-600" />
                                        <span className="tracking-tight">Manage Master Data</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full text-xs shrink-0 max-w-full">
                                        <span className={`block h-2.5 w-2.5 rounded-full ${
                                            supabaseConnected === true ? 'bg-emerald-500 animate-pulse' :
                                            supabaseConnected === false ? 'bg-red-500' :
                                            'bg-amber-400'
                                        }`}></span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Main DB:</span>
                                        <span className="text-xs font-semibold text-slate-600 font-mono select-all truncate max-w-[180px] sm:max-w-xs" title={MAIN_URL}>
                                            {MAIN_URL.replace('https://', '').split('/')[0] || 'diqyjjuipouujvhfsmli.supabase.co'}
                                        </span>
                                    </div>
                                </h2>
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Audit Config</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
                                            
                                            {/* Master Hotel List Action Grid */}
                                            <div 
                                                onClick={() => { handleSetSubView('hotels'); setSearchQuery(''); }}
                                                className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                        <Building size={22} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Hotels</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{hotels.length} registered properties</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                            </div>

                                            {/* Departments Action Grid */}
                                            <div 
                                                onClick={() => { handleSetSubView('departments'); setSearchQuery(''); }}
                                                className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                        <Briefcase size={22} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Department</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{departments.length} registered departments</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                            </div>

                                            {/* Categories Action Grid */}
                                            <div 
                                                onClick={() => { handleSetSubView('categories'); setSearchQuery(''); }}
                                                className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                        <ClipboardList size={22} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Category</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{catList.length} checklist categories</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                            </div>

                                            {/* Audit Item Action Grid */}
                                            <div 
                                                onClick={() => handleSetSubView('items')}
                                                className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                        <FileCheck size={22} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Items</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">Manage audit criteria items</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                            </div>

                                            {/* Audit Group Action Grid */}
                                            <div 
                                                onClick={() => { handleSetSubView('groups'); setSearchQuery(''); }}
                                                className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                        <Layers size={22} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Group</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{groups.length} configured groups</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                            </div>

                                            {/* Audit Batch Action Grid */}
                                            <div 
                                                onClick={() => { handleSetSubView('batches'); setSearchQuery(''); }}
                                                className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                        <Package size={22} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Batch</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{batches.length} registered batches</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* User & Access Setup Area */}
                        {userProfile?.access_level === 'admin' && (
                            <section className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-150/80 shadow-[0_12px_40px_rgba(15,23,42,0.02)] mt-6">
                                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2.5">
                                    <Users size={20} className="text-indigo-600" />
                                    <span className="tracking-tight">User & Access Setup</span>
                                </h2>
                                <div className="space-y-6">
                                    <div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                                            
                                            {/* Auditor Assignment */}
                                            <div 
                                                onClick={() => { handleSetSubView('auditor_assignment'); setSearchQuery(''); }}
                                                className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                        <Briefcase size={22} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 tracking-tight">Auditor Assignment</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">Assign auditors to hotels</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                            </div>

                                            {/* User Management */}
                                            <div 
                                                onClick={() => { handleSetSubView('users'); setSearchQuery(''); fetchProfilesFromSupabase(); }}
                                                className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                        <Users size={22} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 tracking-tight">User Management</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">Manage system users</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                            </div>

                                            {/* Access Right Management */}
                                            <div 
                                                onClick={() => handleSetSubView('access')}
                                                className="flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/80 rounded-[20px] border border-slate-100 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                        <ShieldCheck size={22} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 tracking-tight">Access Right Management</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">Define role-based access</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Audit Report & Inspection Area */}
                        <section className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-150/80 shadow-[0_12px_40px_rgba(15,23,42,0.02)] mt-6">
                            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2.5">
                                <FileCheck size={20} className="text-indigo-600" />
                                <span className="tracking-tight font-bold">Audit Report & Inspection</span>
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                                        
                                        {/* Audit Progress Report */}
                                        <div 
                                            onClick={() => { setSubView('progress_report'); setProgressSearchQuery(''); }}
                                            className="flex items-center justify-between p-5 bg-white hover:bg-slate-50/80 rounded-[20px] border border-slate-150/80 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all duration-200 group shadow-[0_4px_24px_rgba(15,23,42,0.01)] hover:shadow-[0_8px_32px_rgba(15,23,42,0.02)]"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                    <Percent size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Progress Report</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Real-time completion monitoring and analytics</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={18} />
                                        </div>

                                        {/* Audit Results */}
                                        <div
                                            onClick={() => { setSubView('audit_results'); setAuditResultsSearch(''); setSelectedAuditResultId(null); }}
                                            className="flex items-center justify-between p-5 bg-white hover:bg-slate-50/80 rounded-[20px] border border-slate-150/80 cursor-pointer hover:border-emerald-200 active:scale-[0.99] transition-all duration-200 group shadow-[0_4px_24px_rgba(15,23,42,0.01)] hover:shadow-[0_8px_32px_rgba(15,23,42,0.02)]"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                    <ClipboardCheck size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Results</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Passed or failed result per hotel, with category percentages</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" size={18} />
                                        </div>

                                        {/* Audit Inspection v2 */}
                                        <div 
                                            onClick={() => { 
                                                setSubView('inspection_v2'); 
                                            }}
                                            className="flex items-center justify-between p-5 bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-[20px] border border-indigo-700/60 cursor-pointer hover:shadow-xl active:scale-[0.99] transition-all duration-200 group shadow-md"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 backdrop-blur-md text-amber-300 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 border border-indigo-400/30">
                                                    <Sparkles size={22} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-black tracking-tight text-white">Audit Inspection v2</p>
                                                        <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                                            <Sparkles size={10} />
                                                            RELEASED ENGINE
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-indigo-200/80 mt-0.5">High-performance direct Supabase sync engine</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-indigo-300 group-hover:text-white group-hover:translate-x-1 transition-all" size={18} />
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </section>
                        </>
    );
};
