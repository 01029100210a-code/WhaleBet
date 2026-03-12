import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// ▼ 경로 수정 (pages 폴더 안의 파일들을 가져오도록 수정)
import Login from './pages/Login';
import Admin from './pages/Admin';
import Main from './pages/Main';

// Ant Design 스타일 (버전에 따라 필요할 수도 있음)
import 'antd/dist/reset.css'; 

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