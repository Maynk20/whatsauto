import React from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Clock,
  Send,
  Smartphone,
  ListOrdered,
  FileText,
  Settings,
  LogOut,
  Radio,
  ExternalLink
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
  { id: 'stories', label: 'Story Scheduler', icon: Clock },
  { id: 'sender', label: 'Direct Sender & CSV', icon: Send },
  { id: 'devices', label: 'Device Connections', icon: Smartphone },
  { id: 'queue', label: 'Live Queue', icon: ListOrdered },
  { id: 'logs', label: 'Delivery Logs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function DashboardLayout({ currentTab, onSelectTab, children }) {
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen bg-background text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-slate-800 flex flex-col shrink-0 select-none">
        {/* Brand */}
        <div className="h-16 px-6 flex items-center space-x-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center space-x-1.5">
              <span>WhatsAuto</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/20 text-accent">PRO</span>
            </h1>
            <p className="text-[11px] text-slate-400">Automation Engine</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent/15 text-accent border border-accent/25 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-secondary/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/40">
          <div className="px-3 py-2 rounded-xl bg-secondary/50 border border-slate-800 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-white truncate">{user?.email || 'Logged In'}</p>
              <p className="text-[10px] text-accent flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block"></span>
                <span>Supabase Auth</span>
              </p>
            </div>
            <button
              onClick={signOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-secondary transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-card/60 backdrop-blur-md border-b border-slate-800 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-400">WhatsAuto</span>
            <span className="text-slate-600">/</span>
            <span className="text-sm font-semibold text-white capitalize">
              {NAV_ITEMS.find(n => n.id === currentTab)?.label || currentTab}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-secondary/60 border border-slate-700 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Worker: Active</span>
            </div>

            <a
              href="https://github.com/Maynk20/whatsauto.git"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 text-xs text-slate-400 hover:text-accent transition px-2.5 py-1 rounded-lg hover:bg-secondary"
            >
              <span>GitHub Repo</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
