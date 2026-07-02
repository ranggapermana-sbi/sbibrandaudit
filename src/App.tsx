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
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  const checkSuperAdmin = (session: any) => {
    if (session.user.email === 'brandaudit@swiss-belhotel.com') {
      const prof = {
        id: session.user.id,
        email: session.user.email,
        access_level: 'admin',
        first_name: 'Super',
        last_name: 'Admin',
        role: 'Super Admin'
      };
      setUserProfile(prof);
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
    
    // Fetch from main Supabase database profiles table
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
          let prof = data[0];
          // Clear stale super admin / admin row for ranggapermana to allow proper auditee onboarding
          if (prof && prof.email === 'ranggapermana@swiss-belhotel.com' && (prof.role === 'Super Admin' || prof.access_level === 'admin')) {
            await fetch(`${cleanMainUrl}/rest/v1/audit_users?id=eq.${userId}`, {
              method: 'DELETE',
              headers: {
                'apikey': mainAnonKey,
                'Authorization': `Bearer ${mainAnonKey}`
              }
            });
            prof = null;
          }

          // Check if mandatory onboarding fields are fully populated
          if (prof && (prof.access_level === 'admin' || (prof.first_name && prof.role && (prof.hotel_id || prof.hotel_name)))) {
            setUserProfile(prof);
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
    if (userProfile?.access_level === 'auditor') {
      const restrictedScreens = ['dashboard', 'brandingPropertyIdentification', 'pendingCategories', 'step1', 'step2'];
      if (restrictedScreens.includes(currentScreen)) {
        setCurrentScreen('adminPanel');
      }
    }
  }, [userProfile, currentScreen]);

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
            if (profile?.access_level === 'admin' || profile?.access_level === 'auditor') {
              setCurrentScreen('adminPanel');
            } else {
              setCurrentScreen('dashboard');
            }
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
      {currentScreen === 'pendingCategories' && (
        <PendingCategoriesScreen 
          onBack={() => setCurrentScreen('dashboard')} 
          onNavigate={(screen, category) => {
            if (category) setSelectedCategory(category);
            setCurrentScreen(screen);
          }} 
        />
      )}
      {currentScreen === 'brandingPropertyIdentification' && (
        <BrandingPropertyIdentificationScreen 
          selectedCategory={selectedCategory}
          userProfile={userProfile}
          onBack={() => setCurrentScreen('pendingCategories')} 
        />
      )}
      {currentScreen === 'adminPanel' && (userProfile?.access_level === 'admin' || userProfile?.access_level === 'auditor' ? (
        <AdminPanelScreen userProfile={userProfile} onBack={() => setCurrentScreen('dashboard')} onLogout={handleLogout} />
      ) : (
        <DashboardScreen 
          onViewPending={() => setCurrentScreen('pendingCategories')} 
          userProfile={userProfile}
          onProfileUpdate={setUserProfile}
          onLogout={handleLogout}
        />
      ))}
    </div>
  );
}
