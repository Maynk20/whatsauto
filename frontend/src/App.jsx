import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthModal } from './components/AuthModal';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { StorySchedulerPage } from './pages/StorySchedulerPage';
import { DirectSenderPage } from './pages/DirectSenderPage';
import { DeviceConnectionsPage } from './pages/DeviceConnectionsPage';
import { LiveQueuePage } from './pages/LiveQueuePage';
import { DeliveryLogsPage } from './pages/DeliveryLogsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('overview');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-medium">Connecting to WhatsAuto services...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <DashboardLayout currentTab={currentTab} onSelectTab={setCurrentTab}>
      {currentTab === 'overview' && <DashboardPage onNavigate={setCurrentTab} />}
      {currentTab === 'stories' && <StorySchedulerPage />}
      {currentTab === 'sender' && <DirectSenderPage onNavigateToQueue={() => setCurrentTab('queue')} />}
      {currentTab === 'devices' && <DeviceConnectionsPage />}
      {currentTab === 'queue' && <LiveQueuePage />}
      {currentTab === 'logs' && <DeliveryLogsPage />}
      {currentTab === 'settings' && <SettingsPage />}
    </DashboardLayout>
  );
}

export default App;
