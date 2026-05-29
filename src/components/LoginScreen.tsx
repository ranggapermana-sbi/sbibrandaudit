import { Badge, Lock, Eye, EyeOff, Info, ShieldAlert, KeyRound, Mail, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LoginScreen({ onLogin, onAdminAccess }: { onLogin: () => void, onAdminAccess: () => void }) {
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleSignIn = async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
              redirectTo: window.location.origin
          }
      });
      if (error) {
          console.error("Error signing in with Google:", error);
          return;
      }
      // The redirection will happen automatically
  };

  const handleContactSupport = () => {
      window.location.href = "mailto:marcomcoordinator@swiss-belhotel.com?subject=SBI%20Brand%20Audit%20Support%20Request";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-transparent">
      <main className="w-full max-w-[420px] bg-white border border-slate-100 p-8 sm:p-10 rounded-[32px] shadow-[0_16px_48px_rgba(15,23,42,0.04)] text-center transition-all duration-300 hover:shadow-[0_20px_56px_rgba(15,23,42,0.06)]">
        <header className="mb-8">
            <div className="mb-6 flex justify-center transform hover:scale-105 transition-transform duration-300">
              <img src="https://i.ibb.co.com/WNB70XBz/sbi-logo.png" alt="Swiss-Belhotel Logo" className="h-[76px] object-contain" />
            </div>
            
            <h2 className="text-slate-900 text-2xl font-bold tracking-tight">Property Audit Portal</h2>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-[11px] font-bold px-3 py-1 rounded-full border border-indigo-100">
                Property Team Access Only
              </span>
            </div>
        </header>

        <div className="text-center space-y-6">
            <p className="text-slate-500 text-sm leading-relaxed px-2">
              Please sign in with your corporate Google account to continue and verify your brand audit access rights.
            </p>
            
            <button 
              onClick={handleGoogleSignIn} 
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm h-12 rounded-full shadow-sm active:scale-95 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer group"
              type="button"
            >
              <svg className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Sign In or Sign Up with Google</span>
            </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onAdminAccess} 
            className="inline-flex items-center gap-2 text-[11px] text-slate-400 hover:text-indigo-600 font-bold tracking-wider uppercase transition-colors duration-200"
          >
            <Lock size={12} />
            <span>Admin Portal</span>
          </button>
          
          <span className="hidden sm:inline text-slate-200 text-xs">|</span>

          <button 
            onClick={handleContactSupport} 
            className="inline-flex items-center gap-2 text-[11px] text-slate-400 hover:text-indigo-600 font-bold tracking-wider uppercase transition-colors duration-200"
          >
            <Mail size={12} />
            <span>Contact Support</span>
          </button>
        </div>
      </main>
    </div>
  );
}

