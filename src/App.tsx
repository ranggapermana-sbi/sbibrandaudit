/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import type { AppScreen } from './types';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';
import DashboardScreen from './components/DashboardScreen';
import Step1Screen from './components/Step1Screen';
import Step2Screen from './components/Step2Screen';
import PendingCategoriesScreen from './components/PendingCategoriesScreen';
import BrandingPropertyIdentificationScreen from './components/BrandingPropertyIdentificationScreen';
import AdminPanelScreen from './components/AdminPanelScreen';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const checkSuperAdmin = (session: any) => {
    if (session.user.email === 'brandaudit@swiss-belhotel.com') {
      const prof = {
        id: session.user.id,
        email: session.user.email,
        access_level: 'admin',
        first_name: 'Super',
        role: 'Super Admin'
      };
      setUserProfile(prof);
      localStorage.setItem(`sbi_profile_${session.user.id}`, JSON.stringify(prof));
      setCurrentScreen('adminPanel');
      setIsLoadingSession(false);
      return true;
    }
    return false;
  };

  const checkProfileOnboarding = async (session: any) => {
    if (checkSuperAdmin(session)) return;

    if (!session) {
      setUserProfile(null);
      setCurrentScreen('login');
      setIsLoadingSession(false);
      return;
    }

    const userId = session.user.id;
    
    // 1. Check local storage cache
    const cachedProfile = localStorage.getItem(`sbi_profile_${userId}`);
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        // Ensure onboarding is completed locally before routing to dashboard
        if (parsed && (parsed.email === 'brandaudit@swiss-belhotel.com' || parsed.access_level === 'admin' || (parsed.first_name && parsed.role && (parsed.hotel_id || parsed.hotel_name)))) {
          setUserProfile(parsed);
          if (parsed.email === 'brandaudit@swiss-belhotel.com' || parsed.access_level === 'admin' || parsed.access_level === 'auditor') {
            setCurrentScreen('adminPanel');
          } else {
            setCurrentScreen('dashboard');
          }
          setIsLoadingSession(false);
          return;
        }
      } catch (e) {
        console.error("Local profile parse error", e);
      }
    }

    // 2. Fetch from main Supabase database profiles table
    try {
      const mainUrl = import.meta.env.MAIN_SUPABASE_URL || 'https://gvnwxrejgdkixbszhxkw.supabase.co/rest/v1/';
      const cleanMainUrl = mainUrl.replace(/\/rest\/v1\/?$/, '').trim();
      const mainAnonKey = import.meta.env.MAIN_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bnd4cmVqZ2RraXhic3poeGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTE2ODcsImV4cCI6MjA5NDcyNzY4N30.Pvv9rgR_Vr9McwxLrYfELeSpWYLNH2NPw0nkeGD6ZXo';

      const response = await fetch(`${cleanMainUrl}/rest/v1/audit_users?id=eq.${userId}`, {
        headers: {
          'apikey': mainAnonKey,
          'Authorization': `Bearer ${mainAnonKey}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const prof = data[0];
          // Check if mandatory onboarding fields are fully populated
          if (prof && (prof.access_level === 'admin' || (prof.first_name && prof.role && (prof.hotel_id || prof.hotel_name)))) {
            setUserProfile(prof);
            localStorage.setItem(`sbi_profile_${userId}`, JSON.stringify(prof));
            if (prof.access_level === 'admin' || prof.access_level === 'auditor') {
              setCurrentScreen('adminPanel');
            } else {
              setCurrentScreen('dashboard');
            }
            setIsLoadingSession(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch remote profile info, falling back to signup state:", err);
    }

    // Direct user to signup onboarding
    setCurrentScreen('signup');
    setIsLoadingSession(false);
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        setCurrentScreen(event.state.screen);
      }
    };
    window.addEventListener('popstate', handlePopState);
    
    if (!window.history.state?.screen) {
      window.history.replaceState({ screen: currentScreen }, '', `#${currentScreen}`);
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (window.history.state?.screen !== currentScreen) {
      window.history.pushState({ screen: currentScreen }, '', `#${currentScreen}`);
    }
  }, [currentScreen]);

  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkProfileOnboarding(session);
      } else {
        setIsLoadingSession(false);
      }
    });

    // Listen for auth state transitions dynamically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkProfileOnboarding(session);
      } else {
        setUserProfile(null);
        // Only kick to login screen if they aren't on adminPanel
        setCurrentScreen(prev => prev === 'adminPanel' ? 'adminPanel' : 'login');
        setIsLoadingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setIsLoadingSession(true);
    await supabase.auth.signOut();
    setUserProfile(null);
    setCurrentScreen('login');
    setIsLoadingSession(false);
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50/30">
        <img src="https://i.ibb.co.com/WNB70XBz/sbi-logo.png" alt="Swiss-Belhotel" className="h-[48px] object-contain mb-6 animate-pulse" />
        <div className="flex items-center gap-2 text-indigo-650 font-bold text-xs uppercase tracking-widest">
          <Loader2 size={16} className="animate-spin text-indigo-600" />
          Loading Session Security...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900">
      {currentScreen === 'login' && (
        <LoginScreen 
          onLogin={() => {
            setIsLoadingSession(true);
            supabase.auth.getSession().then(({ data: { session } }) => {
              checkProfileOnboarding(session);
            });
          }} 
          onAdminAccess={() => setCurrentScreen('adminPanel')} 
        />
      )}
      
      {currentScreen === 'signup' && (
        <SignupScreen 
          onComplete={(profile) => {
            setUserProfile(profile);
            setCurrentScreen('dashboard');
          }} 
          onLogout={handleLogout}
        />
      )}

      {currentScreen === 'dashboard' && (
        <DashboardScreen 
          onViewPending={() => setCurrentScreen('pendingCategories')} 
          userProfile={userProfile}
          onProfileUpdate={setUserProfile}
          onLogout={handleLogout}
        />
      )}
      
      {currentScreen === 'step1' && <Step1Screen onNext={() => setCurrentScreen('step2')} />}
      {currentScreen === 'step2' && <Step2Screen />}
      {currentScreen === 'pendingCategories' && <PendingCategoriesScreen userProfile={userProfile} onBack={() => setCurrentScreen('dashboard')} onNavigate={(screen) => setCurrentScreen(screen)} />}
      {currentScreen === 'brandingPropertyIdentification' && <BrandingPropertyIdentificationScreen onBack={() => setCurrentScreen('pendingCategories')} />}
      {currentScreen === 'adminPanel' && (userProfile?.access_level === 'auditee' ? (
        <DashboardScreen 
          onViewPending={() => setCurrentScreen('pendingCategories')} 
          userProfile={userProfile}
          onProfileUpdate={setUserProfile}
          onLogout={handleLogout}
        />
      ) : (
        <AdminPanelScreen userProfile={userProfile} onBack={() => setCurrentScreen('dashboard')} onLogout={handleLogout} />
      ))}
    </div>
  );
}
