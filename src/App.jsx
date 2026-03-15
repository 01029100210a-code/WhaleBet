import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 1. 모바일 반응형 레이아웃 불러오기
import AppLayout from './components/AppLayout';

// 2. 페이지 불러오기
import Login from './pages/Login';
import Main from './pages/Main'; 
import Admin from './pages/Admin';

// 3. 파일 목록에 있던 추가 페이지들 불러오기 (메뉴 이동을 위해 필요)
import SportsPicks from './pages/SportsPicks';
import LivePicks from './pages/LivePicks';
import RouletteGame from './pages/RouletteGame';
import AttendancePage from './pages/AttendancePage';
import Settings from './pages/Settings';

import 'antd/dist/reset.css'; 

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. 로그인 페이지: 레이아웃 없이 꽉 찬 화면 */}
        <Route path="/" element={<Login />} />
        
        {/* 
            2. 메인 및 서브 페이지들: AppLayout으로 감싸서
            PC에서는 사이드바, 모바일에서는 햄버거 메뉴가 나오도록 설정 
        */}
        
        {/* 메인 대시보드 */}
        <Route path="/main" element={
          <AppLayout>
            <Main />
          </AppLayout>
        } />
        
        {/* 스포츠 픽 */}
        <Route path="/sports-picks" element={
          <AppLayout>
            <SportsPicks />
          </AppLayout>
        } />

        {/* 라이브 픽 */}
        <Route path="/live-picks" element={
          <AppLayout>
            <LivePicks />
          </AppLayout>
        } />

        {/* 룰렛 게임 */}
        <Route path="/roulette" element={
          <AppLayout>
            <RouletteGame />
          </AppLayout>
        } />

        {/* 출석체크 */}
        <Route path="/attendance" element={
          <AppLayout>
            <AttendancePage />
          </AppLayout>
        } />

        {/* 설정 페이지 */}
        <Route path="/settings" element={
          <AppLayout>
            <Settings />
          </AppLayout>
        } />
        
        {/* 관리자 페이지 (관리자도 메뉴가 필요하다면 감싸줍니다) */}
        <Route path="/admin" element={
          <AppLayout>
            <Admin />
          </AppLayout>
        } />
        
        {/* 이상한 주소로 오면 로그인으로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;