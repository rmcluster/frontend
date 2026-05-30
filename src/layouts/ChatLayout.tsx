import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { SettingsModal } from '../components/settings/SettingsModal';
import { ModelsProvider } from '../context/ModelsContext';

export function ChatLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <ModelsProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-base)] pt-(--navbar-height)">
        <Navbar onOpenSettings={() => setSettingsOpen(true)} />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <ChatSidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <Outlet />
          </div>
        </div>
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </ModelsProvider>
  );
}
