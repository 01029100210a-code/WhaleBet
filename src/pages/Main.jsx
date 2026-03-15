import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Modal, Tag, Drawer, Grid } from 'antd'; // Drawer, Grid 추가됨
import { 
  DesktopOutlined, GiftOutlined, LogoutOutlined, CrownOutlined, 
  SettingOutlined, UserOutlined, LockOutlined, SoundOutlined, 
  CustomerServiceOutlined, CalendarOutlined, RobotOutlined, TrophyOutlined,
  MenuOutlined // 햄버거 버튼 아이콘 추가
} from '@ant-design/icons';
import { doc, onSnapshot, updateDoc, Timestamp } from "firebase/firestore";
import { db } from '../firebase'; 
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios'; 

import LivePicks from './LivePicks'; 
import RouletteGame from './RouletteGame';
import MyPage from './MyPage';
import Settings from './Settings'; 
import Admin from './Admin';
import Notice from './Notice';
import AttendancePage from './AttendancePage';
import AutoSolutionPage from './AutoSolutionPage';
import SportsPicks from './SportsPicks'; 

const { Header, Content, Sider } = Layout;
const { useBreakpoint } = Grid; // 반응형 감지 훅

const TELEGRAM_CS_URL = "https://t.me/y99887766y";

// 스타일 정의 (모바일 헤더 패딩 조정)
const DarkLayout = styled(Layout)`
  min-height: 100vh;
  .ant-layout-sider { background: #0f172a; border-right: 1px solid #1e293b; }
  .ant-menu { background: #0f172a; color: #94a3b8; border-right: none; }
  .ant-menu-item-selected { background-color: #06b6d4 !important; color: white !important; font-weight: bold; }
  .ant-layout-header { 
    background: #0f172a; 
    border-bottom: 1px solid #1e293b; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    padding: 0 16px; /* 모바일 패딩 축소 */
  }
  .ant-layout-content { background: #111827; padding: 16px; overflow-y: auto; }

  /* 모바일 Drawer 커스텀 */
  .ant-drawer-content-wrapper { width: 250px !important; }
  .ant-drawer-body { background: #0f172a; padding: 0; }
  .ant-drawer-header { background: #0f172a; border-bottom: 1px solid #1e293b; }
  .ant-drawer-title { color: white; }
  .ant-drawer-close { color: white; }
`;

const Main = () => {
  const navigate = useNavigate();
  const screens = useBreakpoint(); // 현재 화면 크기 감지 (md가 true면 PC)
  const isMobile = !screens.md;    // md보다 작으면 모바일로 간주

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // 모바일 메뉴 열림 상태
  
  const [selectedKey, setSelectedKey] = useState(localStorage.getItem('lastMenuKey') || '1'); 
  const [userData, setUserData] = useState(null);
  
  const myUsername = localStorage.getItem('username');
  const mySessionId = localStorage.getItem('sessionId');
  
  const adminRoles = ['super_admin', 'admin', 'distributor', 'store'];

  const handleLogout = async () => {
      if (myUsername) {
          try {
            await updateDoc(doc(db, "users", myUsername), {
                currentSessionId: null,
                lastLogout: Timestamp.now()
            });
          } catch(e) {}
      }
      localStorage.clear(); 
      navigate('/');
  };

  useEffect(() => {
      const saveIp = async () => {
          try {
              const res = await axios.get('https://api.ipify.org?format=json');
              if (myUsername) {
                  await updateDoc(doc(db, "users", myUsername), { ipAddress: res.data.ip });
              }
          } catch (e) {}
      };
      saveIp();
  }, [myUsername]);

  useEffect(() => {
    if (!myUsername || !mySessionId) { handleLogout(); return; }

    const unsub = onSnapshot(doc(db, "users", myUsername), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);

        if (data.isBlocked) { 
            Modal.error({ title: '차단됨', content: '관리자에 의해 차단되었습니다.', onOk: handleLogout }); 
            return; 
        }
        if (data.currentSessionId !== mySessionId) { 
            Modal.warning({ title: '중복 로그인', content: '다른 기기에서 접속이 감지되었습니다.', onOk: handleLogout }); 
        }
      } else { 
          handleLogout(); 
      }
    });
    return () => unsub();
  }, [myUsername, mySessionId, navigate]);

  const isSubscriptionValid = () => {
      if (!userData) return false;
      if (adminRoles.includes(userData.role)) return true; 
      if (!userData.expiryDate) return false;
      const expiry = userData.expiryDate.toDate ? userData.expiryDate.toDate() : new Date(userData.expiryDate);
      return expiry > new Date();
  };

  const getRemainingTime = () => {
      if (!userData?.expiryDate) return "만료됨";
      const expiry = userData.expiryDate.toDate ? userData.expiryDate.toDate() : new Date(userData.expiryDate);
      if (expiry < new Date()) return "만료됨";
      const diff = expiry - new Date();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      return `${days}일 ${hours}시간`;
  };

  const handleMenuClick = (e) => {
    if (e.key === 'telegram_cs') {
        window.open(TELEGRAM_CS_URL, '_blank'); 
    } else {
        setSelectedKey(e.key);
        localStorage.setItem('lastMenuKey', e.key); 
    }
    if (isMobile) setMobileMenuOpen(false); // 모바일에서 메뉴 클릭하면 닫기
  };

  // 공통으로 사용할 메뉴 컴포넌트
  const renderSharedMenu = () => (
    <Menu 
        theme="dark" 
        defaultSelectedKeys={['1']} 
        mode="inline" 
        selectedKeys={[selectedKey]}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
    >
      <Menu.Item key="1" icon={<DesktopOutlined />}>실시간 픽 (Live)</Menu.Item>
      <Menu.Item key="auto" icon={<RobotOutlined style={{color: '#22d3ee'}} />}>Auto 솔루션 (LiveBot)</Menu.Item>
      <Menu.Item key="sports" icon={<TrophyOutlined style={{color: '#fcd34d'}} />}>스포츠 픽 (Premium)</Menu.Item>
      <Menu.Item key="notice" icon={<SoundOutlined style={{color:'#f59e0b'}} />}>공지사항</Menu.Item>
      <Menu.Item key="attendance" icon={<CalendarOutlined style={{color: '#10b981'}} />}>출석체크 (Event)</Menu.Item>
      <Menu.Item key="2" icon={<GiftOutlined />}>룰렛 게임 (Event)</Menu.Item>
      <Menu.Item key="3" icon={<SettingOutlined />}>전략 설정</Menu.Item>
      <Menu.Item key="4" icon={<UserOutlined />}>마이페이지</Menu.Item>

      <Menu.Item key="telegram_cs" icon={<CustomerServiceOutlined style={{color: '#3b82f6'}} />}>
         <span style={{color:'#3b82f6', fontWeight:'bold'}}>관리자 문의 (텔레그램)</span>
      </Menu.Item>

      {userData && adminRoles.includes(userData.role) && (
        <Menu.Item key="admin" icon={<CrownOutlined style={{color: '#d4af37'}} />} style={{marginTop: 30, color: '#d4af37', fontWeight:'bold'}}>
          관리자 페이지
        </Menu.Item>
      )}
    </Menu>
  );

  return (
    <DarkLayout>
      {/* PC 버전 사이드바 (모바일에서는 숨김) */}
      {!isMobile && (
        <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={250}>
          <div style={{ height: 64, margin: 16, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <h2 style={{color:'white', margin:0, fontWeight:900, fontSize: collapsed ? 10 : 20}}>WHALEBET</h2>
          </div>
          {renderSharedMenu()}
        </Sider>
      )}

      {/* 모바일 버전 사이드바 (Drawer) */}
      {isMobile && (
        <Drawer
          title="WHALEBET"
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width={260}
          bodyStyle={{ padding: 0, background: '#0f172a' }}
          headerStyle={{ background: '#0f172a', borderBottom: '1px solid #1e293b' }}
          closeIcon={<span style={{ color: 'white' }}>✕</span>}
        >
          {/* 모바일 메뉴 상단에 유저 정보 표시 */}
          <div style={{ padding: '20px', borderBottom: '1px solid #1e293b' }}>
             <div style={{color:'white', fontWeight:'bold', marginBottom: 10}}>{myUsername}님</div>
             <Tag color={isSubscriptionValid() ? "cyan" : "red"}>
                {isSubscriptionValid() ? `남은시간: ${getRemainingTime()}` : "🛑 이용권 만료"}
             </Tag>
          </div>
          {renderSharedMenu()}
        </Drawer>
      )}
      
      <Layout className="site-layout">
        <Header>
            <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                {/* 모바일에서만 보이는 햄버거 버튼 */}
                {isMobile && (
                    <Button 
                        type="text" 
                        icon={<MenuOutlined style={{fontSize: '20px', color: 'white'}} />} 
                        onClick={() => setMobileMenuOpen(true)}
                        style={{ marginRight: 0 }}
                    />
                )}
                
                {/* 로고 또는 유저 정보 (모바일에서는 간소화) */}
                {!isMobile ? (
                    <div style={{color:'white', fontWeight:'bold', display:'flex', alignItems:'center', gap:15}}>
                        {userData?.role === 'super_admin' && <Tag color="gold">최고관리자</Tag>}
                        {userData?.role === 'admin' && <Tag color="orange">관리자</Tag>}
                        {userData?.role === 'distributor' && <Tag color="cyan">총판</Tag>}
                        {userData?.role === 'store' && <Tag color="green">매장</Tag>}
                        {userData?.role === 'user' && <Tag color="blue">회원</Tag>}
                        
                        <span>{myUsername}님</span>
                        
                        <Tag color={isSubscriptionValid() ? "cyan" : "red"} style={{fontSize:13, padding:'4px 10px', marginLeft: 10}}>
                            {isSubscriptionValid() ? `이용권: ${getRemainingTime()}` : "🛑 이용권 만료"}
                        </Tag>
                    </div>
                ) : (
                    // 모바일 헤더 내용 (공간 절약)
                    <div style={{color:'white', fontWeight:900, fontSize: '18px'}}>
                        WHALEBET
                    </div>
                )}
            </div>
            
            <Button type="text" icon={<LogoutOutlined />} style={{color:'#94a3b8'}} onClick={handleLogout}>
                {!isMobile && "Logout"}
            </Button>
        </Header>
        
        <Content style={{ padding: isMobile ? '16px' : '24px' }}>
          {selectedKey === '1' && (
              isSubscriptionValid() ? <LivePicks /> : (
                  <div style={{textAlign:'center', marginTop:100, color:'white'}}>
                      <LockOutlined style={{fontSize: 60, color:'#ef4444', marginBottom:20}} />
                      <h2>이용권이 만료되었습니다.</h2>
                      <p style={{color:'#9ca3af'}}>마이페이지에서 쿠폰을 등록하거나 관리자에게 문의하세요.</p>
                      <Button type="primary" onClick={()=>setSelectedKey('4')}>마이페이지 이동</Button>
                  </div>
              )
          )}
          {selectedKey === 'auto' && <AutoSolutionPage />}
          {selectedKey === 'sports' && <SportsPicks />}
          {selectedKey === 'notice' && <Notice user={userData} />}
          {selectedKey === 'attendance' && <AttendancePage />}
          {selectedKey === '2' && <RouletteGame user={userData} />}
          {selectedKey === '3' && <Settings />}
          {selectedKey === '4' && <MyPage user={userData} />}
          {selectedKey === 'admin' && <Admin />}
        </Content>
      </Layout>
    </DarkLayout>
  );
};

export default Main;