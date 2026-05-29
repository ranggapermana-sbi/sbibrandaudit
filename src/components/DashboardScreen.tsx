import { Menu, CheckCircle, Clock, Edit3, Building, ChevronRight, PlusCircle, LayoutDashboard, History, User, LogOut } from 'lucide-react';

interface DashboardProps {
  onStartAudit: () => void;
  onViewPending: () => void;
  userProfile?: any;
  onLogout: () => void;
}

export default function DashboardScreen({ onStartAudit, onViewPending, userProfile, onLogout }: DashboardProps) {
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
                <button onClick={onStartAudit} className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-slate-900 transition-all">
                    <PlusCircle size={18} /> New Audit
                </button>
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
            <h3 className="text-lg font-bold mb-4 text-slate-900">Active Audit Submissions</h3>
            <div className="space-y-4">
                {[
                    {name: 'Lobby & Reception', code: 'LOB-JUN-2025', progress: 75},
                    {name: 'Guest Rooms', code: 'GRM-JUN-2025', progress: 32},
                    {name: 'F&B Outlets', code: 'FNB-JUN-2025', progress: 90},
                ].map(audit => (
                    <div key={audit.code} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between hover:border-indigo-300 transition-colors">
                        <div className="flex items-center gap-4">
                            <Building className="text-indigo-600" />
                            <div>
                                <p className="font-semibold text-slate-900 text-sm">{audit.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Code: {audit.code}</p>
                            </div>
                        </div>
                        <div className="w-32">
                            <div className="flex justify-between text-[10px] mb-1 font-bold text-slate-500">
                                <span>Progress</span>
                                <span>{audit.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full"><div className="h-full bg-indigo-600 rounded-full" style={{width: `${audit.progress}%`}}></div></div>
                        </div>
                        <ChevronRight className="text-slate-400" size={18} />
                    </div>
                ))}
            </div>
        </section>
      </main>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-100 flex justify-around p-4 text-[10px] font-bold text-slate-400">
        <button className="flex flex-col items-center gap-1 text-slate-900"><LayoutDashboard size={20} /> Dashboard</button>
        <button className="flex flex-col items-center gap-1"><PlusCircle size={20} /> New</button>
        <button className="flex flex-col items-center gap-1"><History size={20} /> History</button>
        <button className="flex flex-col items-center gap-1"><User size={20} /> Profile</button>
      </nav>
    </div>
  );
}
