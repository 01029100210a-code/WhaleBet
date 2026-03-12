import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// ★★★ 여기가 제일 중요합니다 ★★★
// 파일들이 이제 src/pages 안에 있으므로 경로를 ./pages/... 로 해야 합니다.
import Login from './pages/Login';
import Main from './pages/Main'; 
import Admin from './pages/Admin';

// (혹시 Login.jsx 등이 .jsx 확장자를 명시해야 에러가 안 난다면 아래처럼 쓰세요)
// import Login from './pages/Login.jsx';
// import Main from './pages/Main.jsx';
// import Admin from './pages/Admin.jsx';

import 'antd/dist/reset.css'; 

function App() {
  return (
    <Router>
      <Routes>
        {/* 로그인 페이지 */}
        <Route path="/" element={<Login />} />
        
        {/* 메인 페이지 (대시보드 + 룰렛 + 사이드바 통합됨) */}
        <Route path="/main" element={<Main />} />
        
        {/* 관리자 페이지 */}
        <Route path="/admin" element={<Admin />} />
        
        {/* 이상한 주소로 오면 로그인으로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;