/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import type { AppScreen } from './types';
import LoginScreen from './components/LoginScreen';
import DashboardScreen from './components/DashboardScreen';
import Step1Screen from './components/Step1Screen';
import Step2Screen from './components/Step2Screen';
import PendingCategoriesScreen from './components/PendingCategoriesScreen';
import BrandingPropertyIdentificationScreen from './components/BrandingPropertyIdentificationScreen';
import AdminPanelScreen from './components/AdminPanelScreen';
import { supabase } from './lib/supabase';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');

  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentScreen('dashboard');
      }
    });

    // Listen for auth state transitions dynamically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setCurrentScreen('dashboard');
      } else {
        // Only kick to login screen if they aren't on adminPanel (as adminPanel features independent access)
        setCurrentScreen(prev => prev === 'adminPanel' ? 'adminPanel' : (session ? 'dashboard' : 'login'));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen text-slate-900">
      {currentScreen === 'login' && <LoginScreen onLogin={() => setCurrentScreen('dashboard')} onAdminAccess={() => setCurrentScreen('adminPanel')} />}
      {currentScreen === 'dashboard' && <DashboardScreen onStartAudit={() => setCurrentScreen('step1')} onViewPending={() => setCurrentScreen('pendingCategories')} />}
      {currentScreen === 'step1' && <Step1Screen onNext={() => setCurrentScreen('step2')} />}
      {currentScreen === 'step2' && <Step2Screen />}
      {currentScreen === 'pendingCategories' && <PendingCategoriesScreen onBack={() => setCurrentScreen('dashboard')} onNavigate={(screen) => setCurrentScreen(screen)} />}
      {currentScreen === 'brandingPropertyIdentification' && <BrandingPropertyIdentificationScreen onBack={() => setCurrentScreen('pendingCategories')} />}
      {currentScreen === 'adminPanel' && <AdminPanelScreen onBack={() => setCurrentScreen('login')} />}
    </div>
  );
}
