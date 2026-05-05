import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ChatSidebar } from '../components/chat/ChatSidebar';

export function ChatLayout() {
  return (
    <div className="chat-layout">
      <Navbar />
      <div className="chat-body">
        <ChatSidebar />
        <div className="chat-main">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
