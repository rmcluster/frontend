import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ModelsProvider } from '../context/ModelsContext';

export function ChatLayout() {
  return (
    <ModelsProvider>
      <div className="chat-layout">
        <Navbar />
        <div className="chat-body">
          <ChatSidebar />
          <div className="chat-main">
            <Outlet />
          </div>
        </div>
      </div>
    </ModelsProvider>
  );
}
