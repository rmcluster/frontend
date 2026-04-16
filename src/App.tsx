import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { ChatLayout } from './layouts/ChatLayout';
import { HomePage } from './pages/HomePage';
import { ModelsPage } from './pages/ModelsPage';
import { DevicesPage } from './pages/DevicesPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ChatPage } from './pages/ChatPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Route>
        <Route element={<ChatLayout />}>
          <Route path="/chat" element={<ChatPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
