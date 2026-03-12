import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Admin from './Admin';
import Main from './Main';
import 'antd/dist/reset.css'; // Ant Design 스타일 (버전에 따라 다를 수 있음)

function App() {
  return (
    <Router>
      <Routes>
        {/* 기본 경로는 로그인 페이지 */}
        <Route path="/" element={<Login />} />
        
        {/* 메인 페이지 (유저용) */}
        <Route path="/main" element={<Main />} />
        
        {/* 어드민 페이지 (관리자용) */}
        <Route path="/admin" element={<Admin />} />
        
        {/* 없는 페이지는 로그인으로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;