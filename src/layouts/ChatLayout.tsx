import { Outlet } from 'react-router-dom';
import { ChatSidebar } from '../components/chat/ChatSidebar';

export function ChatLayout() {
  return (
    <div className="chat-layout">
      <ChatSidebar />
      <div className="chat-main">
        <Outlet />
      </div>
    </div>
  );
}
