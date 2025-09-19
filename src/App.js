import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Administrators from './pages/admin/Administrators';
import Dialogue from './pages/dialogue/Dialogue';
import Historical from './pages/historical/Historical';
import HistoricalFactsManage from './pages/historical/HistoricalFactsManage.js';
import Quiz from './pages/quiz/QuizOverview.js';
import QuizStats from './pages/quiz/stats/QuizStats';
import UserProgress from './pages/userProgress/UserProgress';
import Users from './pages/users/users'; // restored import (matches file name)
import Sidebar from './components/Sidebar';
import IntroductionDialogue from './pages/dialogue/introduction';
import IntroductionOverview from './pages/dialogue/IntroductionOverview';
import EmmaculateConceptionChurchOverview from './pages/dialogue/emmaculate_conception_church/EmmaculateConceptionChurchOverview.js';
import Login from './pages/auth/Login';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import SupabaseTest from './components/SupabaseTest';
import DimasAlangBakeryOverview from './pages/dialogue/dimas_alang_bakery/DimasAlangBakeryOverview';
import CreateAdmin from './pages/admin/CreateAdmin';
import QuizPlazaSequence from './pages/quiz/manage/QuizPlazaSequence';
import CathedralQuizManage from './pages/quiz/manage/Cathedral';
import DimasalangIdentificationManage from './pages/quiz/manage/DimasalangIdentification';
import DimasalangMultipleChoice from './pages/quiz/manage/DimasalangMultipleChoice';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Test route */}
          <Route path="/test" element={<SupabaseTest />} />
          {/* Public routes */}
          <Route 
            path="/login" 
            element={<Login />}
          />
          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="app">
                  <Sidebar />
                  <div className="content-wrapper">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/administrators" element={<Administrators />} />
                      <Route path="/admin/create" element={<CreateAdmin />} />
                      <Route path="/dialogue" element={<Dialogue />} />
                      <Route path="/historical" element={<Historical />} />
                      <Route path="/historical/facts/:tableName" element={<HistoricalFactsManage />} />
                      <Route path="/quiz" element={<Quiz />} />
                      <Route path="/quiz/stats/:tableName" element={<QuizStats />} />
                      <Route path="/userprogress" element={<UserProgress />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/dialogue/introduction" element={<IntroductionDialogue />} />
                      <Route path="/dialogue/introduction-overview" element={<IntroductionOverview />} />
                      <Route path="/dialogue/emmaculate-conception-church-overview" element={<EmmaculateConceptionChurchOverview />} />
                      <Route path="/dialogue/dimas_alang_bakery/DimasAlangBakeryOverview" element={<DimasAlangBakeryOverview />} />
                      <Route path="/quiz/manage/QuizPlazaSequence" element={<QuizPlazaSequence />} />
                      <Route path="/quiz/manage/Cathedral" element={<CathedralQuizManage />} />
                      <Route path="/quiz/manage/DimasalangIdentification" element={<DimasalangIdentificationManage />} />
                      <Route path="/quiz/manage/DimasalangMultipleChoice" element={<DimasalangMultipleChoice />} />
                    </Routes>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
