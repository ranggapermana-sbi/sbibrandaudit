/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import type { AppScreen } from './types';
import LoginScreen from './components/LoginScreen';
import DashboardScreen from './components/DashboardScreen';
import Step1Screen from './components/Step1Screen';
import Step2Screen from './components/Step2Screen';
import PendingCategoriesScreen from './components/PendingCategoriesScreen';
import BrandingPropertyIdentificationScreen from './components/BrandingPropertyIdentificationScreen';
import AdminPanelScreen from './components/AdminPanelScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');

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
