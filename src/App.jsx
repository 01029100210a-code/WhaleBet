import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// ▼ 경로 주의: pages 폴더 안의 파일들을 가져옵니다.
import Login from './pages/Login.jsx';
import Admin from './pages/Admin.jsx';
import Main from './pages/Main.jsx';

import 'antd/dist/reset.css'; // Antd 스타일

function App() {
  return (
    <Router>
      <Routes>
        {/* 기본 경로 */}
        <Route path="/" element={<Login />} />
        
        {/* 메인 페이지 */}
        <Route path="/main" element={<Main />} />
        
        {/* 어드민 페이지 */}
        <Route path="/admin" element={<Admin />} />
        
        {/* 이상한 주소로 오면 로그인으로 보냄 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;