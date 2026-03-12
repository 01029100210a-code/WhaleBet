import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './Dashboard'; // LivePicks -> Dashboard로 변경
import Admin from './pages/Admin';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './firebase';
import { message } from 'antd';

// 감시자 컴포넌트 (로그인한 유저만 감시)
const AuthGuard = ({ children, requireAdmin }) => {
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userRole = localStorage.getItem('userRole');
  const username = localStorage.getItem('username');

  useEffect(() => {
    if (isLoggedIn && username) {
      // 🔥 실시간 감시 시작
      const unsub = onSnapshot(doc(db, "users", username), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const mySessionId = localStorage.getItem('sessionId');

          // 1. 차단 여부 감시
          if (data.isBlocked) {
            localStorage.clear();
            message.error("관리자에 의해 계정이 차단되었습니다.");
            navigate('/');
            return;
          }

          // 2. 중복 로그인 감시 (DB의 세션ID와 내 세션ID가 다르면 튕김)
          if (data.currentSessionId && data.currentSessionId !== mySessionId) {
            localStorage.clear();
            message.warning("다른 기기에서 로그인하여 접속이 종료됩니다.");
            navigate('/');
          }
        } else {
            // 유저가 삭제된 경우
            localStorage.clear();
            navigate('/');
        }
      });

      return () => unsub(); // 페이지 이동 시 감시 해제
    }
  }, [isLoggedIn, username, navigate]);

  if (!isLoggedIn) return <Navigate to="/" />;
  if (requireAdmin && userRole !== 'admin') return <Navigate to="/dashboard" />;
  
  return children;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <AuthGuard requireAdmin>
              <Admin />
            </AuthGuard>
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;