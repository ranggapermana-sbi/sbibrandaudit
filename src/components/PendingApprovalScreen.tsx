import { useState, useEffect } from 'react';
import { Loader2, ShieldAlert, LogOut, RefreshCw, CheckCircle, Mail, User, Building, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PendingApprovalScreenProps {
    userProfile: any;
    onLogout: () => void;
    onApproved: (profile: any) => void;
}

export default function PendingApprovalScreen({ userProfile, onLogout, onApproved }: PendingApprovalScreenProps) {
    const [isChecking, setIsChecking] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);

    const handleCheckStatus = async () => {
        if (!userProfile?.id) return;
        setIsChecking(true);
        setStatusError(null);

        try {
            const mainUrl = import.meta.env.MAIN_SUPABASE_URL || 'https://gvnwxrejgdkixbszhxkw.supabase.co/rest/v1/';
            const cleanMainUrl = mainUrl.replace(/\/rest\/v1\/?$/, '').trim();
            const mainAnonKey = import.meta.env.MAIN_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bnd4cmVqZ2RraXhic3poeGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTE2ODcsImV4cCI6MjA5NDcyNzY4N30.Pvv9rgR_Vr9McwxLrYfELeSpWYLNH2NPw0nkeGD6ZXo';

            const response = await fetch(`${cleanMainUrl}/rest/v1/audit_users?id=eq.${userProfile.id}`, {
                headers: {
                    'apikey': mainAnonKey,
                    'Authorization': `Bearer ${mainAnonKey}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    const latestProfile = data[0];
                    if (latestProfile.is_approved) {
                        localStorage.setItem(`sbi_profile_${userProfile.id}`, JSON.stringify(latestProfile));
                        onApproved(latestProfile);
                        return;
                    } else {
                        setStatusError("Your profile is still pending review. Please contact Group Marketing & Communications system admin if you believe this is an error.");
                    }
                } else {
                    setStatusError("Profile record could not be located in the database. Please contact support.");
                }
            } else {
                setStatusError("Unable to establish database connection to check approval state.");
            }
        } catch (err: any) {
            console.error("Error checking approval status:", err);
            setStatusError("A connection anomaly occurred. Please try again shortly.");
        } finally {
            setIsChecking(false);
        }
    };

    // Auto check on mount
    useEffect(() => {
        handleCheckStatus();
    }, []);

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-50 to-indigo-50/30 overflow-x-hidden font-sans select-none">
            
            {/* Decorative background visualizers */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 -right-40 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-30 pointer-events-none" />

            <main className="relative w-full max-w-[540px] z-10 py-10">
                <div className="bg-white/95 backdrop-blur-md border border-white/80 p-6 sm:p-10 rounded-[32px] shadow-[0_24px_50px_rgba(30,41,59,0.06)]">
                    
                    {/* Header */}
                    <div className="text-center mb-8">
                        <img 
                            src="https://i.ibb.co.com/WNB70XBz/sbi-logo.png" 
                            alt="Swiss-Belhotel International" 
                            className="h-[44px] mx-auto object-contain mb-6" 
                        />
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[10px] uppercase tracking-wider mb-3">
                            <ShieldAlert size={12} className="text-amber-500 animate-pulse" />
                            Pending Admin Approval
                        </div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                            Registration Under Review
                        </h1>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
                            Thank you for completing your onboarding. Your registration is being reviewed by the <strong className="text-slate-700 font-bold">Group Marketing & Communications</strong> system admin before access is granted.
                        </p>
                    </div>

                    {/* Profile Information details */}
                    <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-5 space-y-4 mb-6">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-2">
                            Onboarding Profile
                        </h2>
                        
                        <div className="grid grid-cols-1 gap-3.5">
                            {/* Full Name */}
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-500 mt-0.5">
                                    <User size={14} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Full Name</div>
                                    <div className="text-sm font-bold text-slate-800">
                                        {userProfile?.first_name || ''} {userProfile?.last_name || ''}
                                    </div>
                                </div>
                            </div>

                            {/* Email Address */}
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-500 mt-0.5">
                                    <Mail size={14} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Email Address</div>
                                    <div className="text-sm font-bold text-slate-800 break-all">{userProfile?.email || '—'}</div>
                                </div>
                            </div>

                            {/* Assigned Property */}
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-500 mt-0.5">
                                    <Building size={14} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Hotel Property</div>
                                    <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                        <span>{userProfile?.hotel_name || '—'}</span>
                                        {userProfile?.hotel_code && (
                                            <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/30">
                                                #{userProfile.hotel_code}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Designated Role */}
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-500 mt-0.5">
                                    <Briefcase size={14} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Designated Role</div>
                                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <span>{userProfile?.role || '—'}</span>
                                        {userProfile?.is_brand_audit_lead && (
                                            <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-sm">
                                                Brand Lead
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {statusError && (
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-800 text-xs font-medium leading-relaxed mb-6 text-center">
                            {statusError}
                        </div>
                    )}

                    {/* Action controls */}
                    <div className="space-y-3">
                        <button
                            onClick={handleCheckStatus}
                            disabled={isChecking}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-[0_4px_16px_rgba(99,102,241,0.2)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none transition-all cursor-pointer outline-none select-none"
                        >
                            {isChecking ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Verifying Status...</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={16} />
                                    <span>Check Status / Refresh</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all cursor-pointer outline-none select-none active:scale-[0.98]"
                        >
                            <LogOut size={16} />
                            <span>Sign Out of Account</span>
                        </button>
                    </div>

                    <div className="mt-8 border-t border-slate-100 pt-5 text-center">
                        <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                            Swiss-Belhotel International Audit System
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
