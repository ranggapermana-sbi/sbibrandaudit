import { Lock, Mail, ShieldCheck, ArrowRight, Sparkles, Building2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function LoginScreen({ onLogin, onAdminAccess }: { onLogin: () => void, onAdminAccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPinPromptOpen, setIsPinPromptOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const handlePinSubmit = async () => {
    if (pin === '230987') {
      setIsPinPromptOpen(false);
      setIsLoading(true);
      try {
          const { error } = await supabase.auth.signInWithPassword({
              email: 'brandaudit@swiss-belhotel.com',
              password: 'SbiBrandAudit2026'
          });
          if (error) throw error;
          onLogin();
      } catch (e) {
          console.error("Super Admin Login Error:", e);
          alert("Super Admin login failed.");
          setIsLoading(false);
          setPin('');
      }
    } else {
      setPinError("Incorrect PIN. Returning to login.");
      setTimeout(() => {
        setIsPinPromptOpen(false);
        setPin('');
        setPinError('');
      }, 1500);
    }
  };

  // OAuth Message Handler
  useEffect(() => {
      const handleMessage = async (event: MessageEvent) => {
          // Verify that message is from trusted origins
          const origin = event.origin;
          if (!origin.endsWith('.run.app') && !origin.endsWith('.vercel.app') && !origin.includes('localhost') && !origin.includes('supabase.co')) {
              return;
          }

          if (event.data?.type === 'SUPABASE_OAUTH_SUCCESS') {
              const hash = event.data.hash || '';
              if (hash) {
                  // Extract parameters from hash
                  const params = new URLSearchParams(hash.replace('#', '?'));
                  const accessToken = params.get('access_token');
                  const refreshToken = params.get('refresh_token');
                  
                  if (accessToken && refreshToken) {
                      setIsLoading(true);
                      try {
                          const { error } = await supabase.auth.setSession({
                              access_token: accessToken,
                              refresh_token: refreshToken
                          });
                          if (!error) {
                              onLogin();
                          } else {
                              console.error("Error setting session:", error);
                          }
                      } catch (e) {
                          console.error("Session configuration error:", e);
                      } finally {
                          setIsLoading(false);
                      }
                  }
              }
          }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, [onLogin]);

  // PIN Keyboard Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPinPromptOpen) return;
      
      if (e.key >= '0' && e.key <= '9') {
        setPin(prev => prev.length < 6 ? prev + e.key : prev);
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        handlePinSubmit();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPinPromptOpen, handlePinSubmit]);

  const handleGoogleSignIn = async () => {
      setIsLoading(true);
      try {
          const { data, error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                  redirectTo: `${window.location.origin}/auth-callback.html`,
                  skipBrowserRedirect: true
              }
          });
          
          if (error) {
              console.error("Error signing in with Google:", error);
              setIsLoading(false);
              return;
          }

          if (data?.url) {
              const authWindow = window.open(data.url, 'supabase_oauth_popup', 'width=550,height=680,resizable=yes,scrollbars=yes');
              if (!authWindow) {
                  alert('Popup blocked! Please allow popups for Swiss-Belhotel Brand Audit Portal.');
                  setIsLoading(false);
              }
          } else {
              setIsLoading(false);
          }
      } catch (err) {
          console.error("Failed to fetch Supabase login URL:", err);
          setIsLoading(false);
      }
  };

  const handleContactSupport = () => {
      window.location.href = "mailto:marcomcoordinator@swiss-belhotel.com?subject=SBI%20Brand%20Audit%20Support%20Request";
  };

  return (
    <>
      <div className="relative min-h-screen flex flex-col items-center justify-center p-5 bg-gradient-to-b from-slate-50 to-indigo-50/30 overflow-hidden font-sans">
        
        {/* Decorative High-End Ambient Lighting Backdrops */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -right-40 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Subtle Grid Accent Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-30 pointer-events-none" />

        {/* Main Container */}
        <main className="relative w-full max-w-[430px] z-10">
          
          {/* Core Card */}
          <div className="bg-white/90 backdrop-blur-md border border-white/60 p-8 sm:p-11 rounded-[32px] shadow-[0_24px_50px_rgba(30,41,59,0.06)] hover:shadow-[0_28px_60px_rgba(30,41,59,0.08)] transition-all duration-300 ease-out select-none">
            
            {/* Header section with brand identity */}
            <header className="mb-8 text-center">
              <div className="inline-flex justify-center mb-6">
                <div className="hover:scale-105 hover:rotate-1 transition-transform duration-300">
                  <img 
                    id="brand-logo-img"
                    src="https://i.ibb.co.com/WNB70XBz/sbi-logo.png" 
                    alt="Swiss-Belhotel Logo" 
                    className="h-[84px] object-contain" 
                  />
                </div>
              </div>
              
              <h2 className="text-slate-800 text-2xl font-black tracking-tight leading-none mb-2 font-sans">
                Brand Audit Portal
              </h2>
              <p className="text-slate-400 text-[11px] uppercase tracking-widest font-extrabold flex items-center justify-center gap-1.5 mt-2">
                <Building2 size={12} className="text-indigo-500" />
                July - November 2026
              </p>
            </header>

            {/* Prompt Information Block */}
            <div className="text-center space-y-6">
              <p className="text-slate-500 text-sm leading-relaxed px-1">
                Please sign in with your corporate Google account to continue and verify your property audit privileges.
              </p>
              
              {/* Action Google Sign in button */}
              <button 
                id="btn-google-sign-in"
                onClick={handleGoogleSignIn} 
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs uppercase tracking-widest h-12 rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.1)] active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-75 disabled:pointer-events-none"
                type="button"
              >
                {!isLoading ? (
                  <>
                    <svg className="w-4 h-4 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Sign In with Google</span>
                    <ArrowRight size={13} className="ml-1 text-slate-400 group-hover:text-white transition-colors" />
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </div>
                )}
              </button>
            </div>

            {/* Secure Access Ribbon */}
            <div className="mt-8 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100/30">
              <ShieldCheck size={14} className="text-indigo-600 animate-pulse shrink-0" />
              <span className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider">
                Secure Corporate Single Sign-On
              </span>
            </div>

          </div>

          {/* Polished Footer Navigation Capsule */}
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center justify-center bg-white/70 backdrop-blur-sm border border-slate-200/60 p-1 rounded-2xl shadow-sm">
              <button 
                id="admin-portal-link"
                onClick={() => setIsPinPromptOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer"
              >
                <Lock size={11} className="text-slate-400" />
                <span>Admin Portal</span>
              </button>
              
              <div className="h-4 w-px bg-slate-200 mx-1" />

              <button 
                id="contact-support-link"
                onClick={handleContactSupport} 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer"
              >
                <Mail size={11} className="text-slate-400" />
                <span>Contact Support</span>
              </button>
            </div>
          </div>

        </main>
      </div>

      {/* PIN Prompt Modal */}
      {isPinPromptOpen && (
        <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl space-y-6">
            <button 
              onClick={() => { setIsPinPromptOpen(false); setPin(''); setPinError(''); }} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-800 text-center">Enter Admin PIN</h3>
            {pinError ? (
              <p className="text-red-500 text-sm text-center font-bold">{pinError}</p>
            ) : (
              <div className="flex justify-center gap-2">
                 {[...Array(6)].map((_, i) => (
                     <div key={i} className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-xl font-bold ${pin[i] ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-200'}`}>
                       {pin[i] ? '•' : ''}
                     </div>
                 ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(digit => (
                <button
                  key={digit}
                  onClick={() => pin.length < 6 && setPin(prev => prev + digit.toString())}
                  className="h-14 bg-slate-100 hover:bg-slate-200 rounded-xl text-xl font-bold text-slate-800 active:scale-95 transition-all"
                >
                  {digit}
                </button>
              ))}
              <button onClick={() => setPin('')} className="col-start-3 h-14 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs uppercase active:scale-95 transition-all">Clear</button>
            </div>
            <button onClick={handlePinSubmit} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl active:scale-95 transition-all">Submit</button>
          </div>
        </div>
      )}
    </>
  );
}
