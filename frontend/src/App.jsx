import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import UserNamePrompt from './components/UserNamePrompt';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import NewDocumentPage from './pages/NewDocumentPage';
import ImpactAnalysisPage from './pages/ImpactAnalysisPage';
import ChatPage from './pages/ChatPage';
import AuditLogPage from './pages/AuditLogPage';
import ReviewCyclesPage from './pages/ReviewCyclesPage';

export default function App() {
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [showPrompt, setShowPrompt] = useState(!localStorage.getItem('userName'));

  const handleSetName = (name) => {
    localStorage.setItem('userName', name);
    setUserName(name);
    setShowPrompt(false);
  };

  return (
    <BrowserRouter>
      {showPrompt && <UserNamePrompt onSet={handleSetName} />}
      <Layout userName={userName} onChangeName={() => setShowPrompt(true)}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/new" element={<NewDocumentPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/impact-analysis" element={<ImpactAnalysisPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/reviews" element={<ReviewCyclesPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
