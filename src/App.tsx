import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { ChatLayout } from './layouts/ChatLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ModelsPage } from './pages/ModelsPage';
import { ChatPage } from './pages/ChatPage';
import { FilesPage } from './pages/FilesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/files" element={<FilesPage />} />
        </Route>
        <Route element={<ChatLayout />}>
          <Route path="/chat" element={<ChatPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
