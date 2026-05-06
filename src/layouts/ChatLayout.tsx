import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ModelsProvider } from '../context/ModelsContext';

export function ChatLayout() {
  return (
    <ModelsProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-base)]">
        <Navbar />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <ChatSidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <Outlet />
          </div>
        </div>
      </div>
    </ModelsProvider>
  );
}
