import React, { useState } from 'react';
import { Layout, Menu, Button, Drawer } from 'antd';
import { 
  MenuOutlined, 
  HomeOutlined,      // Dashboard 용
  TrophyOutlined,    // SportsPicks 용
  ThunderboltOutlined, // LivePicks 용
  DollarCircleOutlined, // RouletteGame 용
  CalendarOutlined,  // Attendance 용
  SettingOutlined,   // Settings 용
  LogoutOutlined 
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const { Header, Sider, Content } = Layout;

// --- 스타일 정의 (반응형 핵심) ---

const StyledLayout = styled(Layout)`
  min-height: 100vh;
  .ant-layout-sider { background: #111827; } /* 사이드바 배경색 */
`;

// [모바일용] 상단 헤더 (PC에선 숨김)
const MobileHeader = styled(Header)`
  display: none;
  padding: 0 20px;
  background: #111827;
  align-items: center;
  justify-content: space-between;
  position: fixed;
  width: 100%;
  z-index: 100;
  height: 60px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);

  @media (max-width: 768px) {
    display: flex; /* 768px 이하에서만 보임 */
  }
`;

// [PC용] 좌측 사이드바 (모바일에선 숨김)
const DesktopSider = styled(Sider)`
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 99;
  
  @media (max-width: 768px) {
    display: none !important; /* 768px 이하에선 숨김 */
  }
`;

// 콘텐츠 영역 (반응형 여백)
const StyledContent = styled(Content)`
  margin-left: 200px; /* PC: 사이드바 너비만큼 띄움 */
  padding: 24px;
  background: #000000;
  min-height: 100vh;
  transition: all 0.2s;

  @media (max-width: 768px) {
    margin-left: 0; /* 모바일: 꽉 차게 */
    padding: 15px;
    padding-top: 80px; /* 헤더 높이만큼 내림 */
  }
`;

const Logo = styled.div`
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d4af37; /* 금색 */
  font-size: 18px;
  font-weight: 900;
  background: #1f2937;
  &::before { content: "♛"; margin-right: 8px; font-size: 22px; }
`;

// --- 컴포넌트 시작 ---

const AppLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 📌 메뉴 목록 (사진에 있는 파일명 참고해서 구성함)
  const menuItems = [
    { key: '/dashboard', icon: <HomeOutlined />, label: '대시보드' },
    { key: '/sports-picks', icon: <TrophyOutlined />, label: '스포츠 픽' },
    { key: '/live-picks', icon: <ThunderboltOutlined />, label: '라이브 픽' },
    { key: '/roulette', icon: <DollarCircleOutlined />, label: '룰렛 게임' },
    { key: '/attendance', icon: <CalendarOutlined />, label: '출석체크' },
    { key: '/settings', icon: <SettingOutlined />, label: '설정' },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
    setMobileMenuOpen(false); // 모바일에서 클릭 시 메뉴 닫기
  };

  // 메뉴 UI (재사용)
  const MenuList = () => (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      onClick={handleMenuClick}
      style={{ background: '#111827', borderRight: 0 }}
      items={menuItems}
    />
  );

  return (
    <StyledLayout>
      {/* 📱 모바일 헤더 */}
      <MobileHeader>
        <div style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '18px' }}>
             WB SPORTS
        </div>
        <Button 
          type="text" 
          icon={<MenuOutlined style={{ fontSize: '20px', color: 'white' }} />} 
          onClick={() => setMobileMenuOpen(true)} 
        />
      </MobileHeader>

      {/* 🖥️ PC 사이드바 */}
      <DesktopSider width={200}>
        <Logo>WB SPORTS</Logo>
        <MenuList />
        <div style={{ position: 'absolute', bottom: 20, width: '100%', padding: '0 20px' }}>
            <Button block ghost icon={<LogoutOutlined />} onClick={() => navigate('/')}>로그아웃</Button>
        </div>
      </DesktopSider>

      {/* 📱 모바일 드로어 (슬라이드 메뉴) */}
      <Drawer
        title={<span style={{color:'#d4af37'}}>MENU</span>}
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        styles={{ body: { padding: 0, background: '#111827' }, header: { background: '#1f2937' } }}
        width={250}
        closeIcon={<span style={{color: 'white'}}>X</span>}
      >
        <MenuList />
      </Drawer>

      {/* 📄 실제 페이지 내용이 들어가는 곳 */}
      <StyledContent>
        {children}
      </StyledContent>
    </StyledLayout>
  );
};

export default AppLayout;