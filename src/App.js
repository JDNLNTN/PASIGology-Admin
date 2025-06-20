import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Administrators from './pages/admin/Administrators';
import Settings from './pages/Settings';
import Dialogue from './pages/dialogue/Dialogue';
import Historical from './pages/historical/Historical';
import HistoricalFactsManage from './pages/historical/HistoricalFactsManage';
import Quiz from './pages/quiz/Quiz';
import QuizManage from './pages/quiz/QuizManage';
import UserProgress from './pages/userProgress/UserProgress';
import Users from './pages/users/Users';
import Sidebar from './components/Sidebar';
import IntroductionDialogue from './pages/dialogue/introduction';
import MechanicsDialogue from './pages/dialogue/mechanics';
import PlayerRoomDialogue from './pages/dialogue/playerRoom';
import LivingRoomDialogue from './pages/dialogue/livingRoom';
import LolitaDialogue from './pages/dialogue/emmaculate_conception_church/lolita.js';
import KuyaReneDialogue from './pages/dialogue/emmaculate_conception_church/kuyarene.js';
import IntroductionOverview from './pages/dialogue/IntroductionOverview';
import EmmaculateConceptionChurchOverview from './pages/dialogue/emmaculate_conception_church/EmmaculateConceptionChurchOverview.js';
import Login from './pages/auth/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { supabase } from './services/supabase';
import './App.css';
import SupabaseTest from './components/SupabaseTest';
import DimasAlangBakeryOverview from './pages/dialogue/dimas_alang_bakery/DimasAlangBakeryOverview';
import AteIsabellaDialogue from './pages/dialogue/dimas_alang_bakery/script_ate_isabella';
import ScriptCustomerDialogue from './pages/dialogue/dimas_alang_bakery/script_customer';
import CreateAdmin from './pages/admin/CreateAdmin';

function App() {
  return (
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
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/dialogue" element={<Dialogue />} />
                    <Route path="/historical" element={<Historical />} />
                    <Route path="/historical/facts/:tableName" element={<HistoricalFactsManage />} />
                    <Route path="/quiz" element={<Quiz />} />
                    <Route path="/quiz/manage/:tableName" element={<QuizManage />} />
                    <Route path="/userprogress" element={<UserProgress />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/dialogue/introduction" element={<IntroductionDialogue />} />
                    <Route path="/dialogue/mechanics" element={<MechanicsDialogue />} />
                    <Route path="/dialogue/playerroom" element={<PlayerRoomDialogue />} />
                    <Route path="/dialogue/livingroom" element={<LivingRoomDialogue />} />
                    <Route path="/dialogue/lolita" element={<LolitaDialogue />} />
                    <Route path="/dialogue/kuyarene" element={<KuyaReneDialogue />} />
                    <Route path="/dialogue/introduction-overview" element={<IntroductionOverview />} />
                    <Route path="/dialogue/emmaculate-conception-church-overview" element={<EmmaculateConceptionChurchOverview />} />
                    <Route path="/dialogue/dimas_alang_bakery/DimasAlangBakeryOverview" element={<DimasAlangBakeryOverview />} />
                    <Route path="/dialogue/dimas_alang_bakery/script_ate_isabella" element={<AteIsabellaDialogue />}/>
                    <Route path="/dialogue/dimas_alang_bakery/script_customer" element={<ScriptCustomerDialogue />}  />
                  </Routes>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
