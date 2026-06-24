import { Menu, CheckCircle, Clock, Edit3, Building, ChevronRight, PlusCircle, LayoutDashboard, History, User, LogOut, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  onViewPending: () => void;
  userProfile?: any;
  onLogout: () => void;
}

export default function DashboardScreen({ onViewPending, userProfile, onLogout }: DashboardProps) {
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAuditItems = async () => {
      try {
        const { data, error } = await supabase
          .from('audit_items')
          .select('*, audit_departments(name), audit_categories(name)');
          
        if (error) throw error;
        
        const sortedData = (data || []).sort((a: any, b: any) => {
          if (a.sort_order !== undefined && a.sort_order !== null && b.sort_order !== undefined && b.sort_order !== null) {
            return Number(a.sort_order) - Number(b.sort_order);
          }
          return (a.name || '').localeCompare(b.name || '');
        });
        
        setAuditItems(sortedData);
      } catch (err) {
        console.error('Error fetching audit items:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditItems();
  }, []);

  return (
    <div className="min-h-screen pb-24 md:pb-0 pt-20 md:pt-16 bg-transparent">
      <header className="fixed top-0 z-40 w-full flex justify-between items-center px-4 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><Menu size={20}/></button>
            <img src="https://i.ibb.co.com/WNB70XBz/sbi-logo.png" alt="Swiss-Belhotel Logo" className="h-10" />
        </div>
        <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
                <p className="text-slate-850 text-xs font-extrabold leading-none">
                    {userProfile?.first_name ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() : 'Property User'}
                </p>
                <p className="text-slate-400 text-[9px] uppercase tracking-wider font-bold mt-1">
                    {userProfile?.role || 'Team Member'}
                </p>
            </div>
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBITBWNBBtIG0rf-g2rSnXVh9VGHDvsAjvLTDjrE23xz1hJrCplqnz6Xn1zrgcgHMUmCMQ3IdgZhZbEuTf1ImpPe7qG_G1XAXu0U8ILiKm-G1yTVcT14BEf-0i6SdQv_STVs2afp2q-qyq_bFuTRUnJiG650ZgShhYGSpaReJ7UOabaT-pWAFjHSmW0zh7U8NDb86GS9JamBquf3kiqH527l8DSi5MchVDfG3Ynr9tQMnoQnBwmDHiGBzXeeSny3uJYmL-hopwk60g" alt="Profile" className="w-8 h-8 rounded-full" />
            
            <button 
                onClick={onLogout}
                className="p-1 px-2.5 text-slate-500 hover:text-red-650 hover:bg-slate-100/80 rounded-lg transition-all font-bold text-xs flex items-center gap-1.5"
                title="Sign Out"
            >
                <LogOut size={15} />
                <span className="hidden md:inline">Sign Out</span>
            </button>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-4 py-8">
        <section className="mb-8">
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-indigo-600 text-[10px] tracking-widest uppercase font-bold">
                        {userProfile?.hotel_name || 'Swiss-Belhotel International'} 
                        {userProfile?.hotel_code ? ` (${userProfile.hotel_code})` : ''}
                    </p>
                    <h2 className="text-2xl font-bold mt-1 text-slate-900">
                        Welcome, {userProfile?.first_name ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() : 'Property Team'}
                    </h2>
                    {userProfile?.role && (
                        <p className="text-slate-500 text-[11px] font-bold mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                            {userProfile.role}
                            {userProfile.is_brand_audit_lead && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-105 text-indigo-700 text-[9px] font-extrabold uppercase rounded">
                                    Audit Lead
                                </span>
                            )}
                        </p>
                    )}
                </div>
            </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div onClick={onViewPending} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <CheckCircle className="text-emerald-500" size={24}/>
                    <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-md">+4 this week</span>
                </div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Pending Tasks</p>
                <p className="text-3xl font-bold text-slate-900">24</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <Clock className="text-amber-500" size={24}/>
                    <span className="text-amber-600 text-xs font-bold bg-amber-50 px-2 py-1 rounded-md">Urgent</span>
                </div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Requires Action</p>
                <p className="text-3xl font-bold text-slate-900">03</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <Edit3 className="text-slate-500" size={24}/>
                </div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Active Drafts</p>
                <p className="text-3xl font-bold text-slate-900">08</p>
            </div>
        </section>

        <section>
            <h3 className="text-lg font-bold mb-4 text-slate-900">Audit List</h3>
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-8 text-slate-400 font-bold text-sm animate-pulse">Loading audit items...</div>
                ) : auditItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 font-bold text-sm">No audit items found.</div>
                ) : (
                    auditItems.map(item => (
                        <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col hover:border-indigo-300 transition-colors cursor-pointer group">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm leading-tight">{item.name}</p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                            {item.audit_departments?.name && (
                                                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                                                    {item.audit_departments.name}
                                                </span>
                                            )}
                                            {item.audit_categories?.name && (
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                                    {item.audit_categories.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded-md whitespace-nowrap">
                                        {item.points || 0} PTS
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
      </main>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-100 flex justify-around p-4 text-[10px] font-bold text-slate-400">
        <button className="flex flex-col items-center gap-1 text-slate-900"><LayoutDashboard size={20} /> Dashboard</button>
        <button className="flex flex-col items-center gap-1"><History size={20} /> History</button>
        <button className="flex flex-col items-center gap-1"><User size={20} /> Profile</button>
      </nav>
    </div>
  );
}
