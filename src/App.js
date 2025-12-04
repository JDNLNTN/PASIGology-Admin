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
import IntroductionGallery from './pages/dialogue/introduction/IntroductionGallery';
import EmmaculateConceptionChurchGallery from './pages/dialogue/emmaculate_conception_church/EmmaculateConceptionChurchGallery';
import EmmaculateConceptionChurchOverview from './pages/dialogue/emmaculate_conception_church/EmmaculateConceptionChurchOverview';
import PlazaRizalOverview from './pages/dialogue/plaza-rizal/PlazaRizalOverview';
import PlazaRizalGallery from './pages/dialogue/plaza-rizal/PlazaRizalGallery';
import BahayNaTisaOverview from './pages/dialogue/bahay-na-tisa/BahayNaTisaOverview';
import BahayNaTisaGallery from './pages/dialogue/bahay-na-tisa/BahayNaTisaGallery';
import Login from './pages/auth/Login';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import SupabaseTest from './components/SupabaseTest';
import DimasAlangBakeryGallery from './pages/dialogue/dimas_alang_bakery/DimasAlangBakeryGallery';
import DimasAlangAugmentic from './pages/dialogue/dimas_alang_bakery/DimasAlangAugmentic';
import RevolvingTowerOverview from './pages/dialogue/revolving-tower/RevolvingTowerOverview';
import RevolvingTowerGallery from './pages/dialogue/revolving-tower/RevolvingTowerGallery';
import CreateAdmin from './pages/admin/CreateAdmin';
import { AuthProvider } from './context/AuthContext';
// Quiz manage pages
import ChurchManage from './pages/quiz/manage/ChurchManage';
import PlazaRizalManage from './pages/quiz/manage/PlazaRizalManage';
import BahayNaTisaManage from './pages/quiz/manage/BahayNaTisaManage';
import DimasalangManage from './pages/quiz/manage/DimasalangManage';
import RevolvingTowerManage from './pages/quiz/manage/RevolvingTowerManage';

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
                      <Route path="/dialogue/introduction-gallery" element={<IntroductionGallery />} />
                      <Route path="/dialogue/emmaculate-conception-church" element={<EmmaculateConceptionChurchOverview />} />
                      <Route path="/dialogue/emmaculate-conception-church-gallery" element={<EmmaculateConceptionChurchGallery />} />
                      <Route path="/dialogue/plaza-rizal" element={<PlazaRizalOverview />} />
                      <Route path="/dialogue/plaza-rizal-gallery" element={<PlazaRizalGallery />} />
                      <Route path="/dialogue/bahay-na-tisa" element={<BahayNaTisaOverview />} />
                      <Route path="/dialogue/bahay-na-tisa-gallery" element={<BahayNaTisaGallery />} />
                      <Route path="/dialogue/dimas_alang_bakery/augmentic" element={<DimasAlangAugmentic />} />
                      <Route path="/dialogue/dimas_alang_bakery/gallery" element={<DimasAlangBakeryGallery />} />
                      <Route path="/dialogue/revolving-tower" element={<RevolvingTowerOverview />} />
                      <Route path="/dialogue/revolving-tower-gallery" element={<RevolvingTowerGallery />} />
                      {/* Quiz manage routes */}
                      <Route path="/quiz/manage/church" element={<ChurchManage />} />
                      <Route path="/quiz/manage/plaza-rizal" element={<PlazaRizalManage />} />
                      <Route path="/quiz/manage/bnt" element={<BahayNaTisaManage />} />
                      <Route path="/quiz/manage/dimasalang" element={<DimasalangManage />} />
                      <Route path="/quiz/manage/revolving-tower" element={<RevolvingTowerManage />} />
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
