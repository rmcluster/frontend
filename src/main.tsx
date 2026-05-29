import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { ConversationProvider } from './context/ConversationContext';
import { ChatStreamingProvider } from './context/ChatStreamingContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <ConversationProvider>
        <ChatStreamingProvider>
          <App />
        </ChatStreamingProvider>
      </ConversationProvider>
    </ThemeProvider>
  </React.StrictMode>
);
