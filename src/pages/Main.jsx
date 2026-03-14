import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Modal, Tag } from 'antd';
import { 
  DesktopOutlined, GiftOutlined, LogoutOutlined, CrownOutlined, 
  SettingOutlined, UserOutlined, LockOutlined, SoundOutlined, 
  CustomerServiceOutlined, CalendarOutlined, RobotOutlined 
} from '@ant-design/icons';
import { doc, onSnapshot, updateDoc, Timestamp } from "firebase/firestore";
import { db } from '../firebase'; 
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios'; 

// 🔥 기존 컴포넌트 임포트
import LivePicks from './LivePicks'; 
import RouletteGame from './RouletteGame';
import MyPage from './MyPage';
import Settings from './Settings'; 
import Admin from './Admin';
import Notice from './Notice';

// 🔥🔥 새로 만든 페이지 임포트
import AttendancePage from './AttendancePage';
import AutoSolutionPage from './AutoSolutionPage';

const { Header, Content, Sider } = Layout;

// 텔레그램 문의 주소
const TELEGRAM_CS_URL = "https://t.me/y99887766y";

// 스타일 정의
const DarkLayout = styled(Layout)`
  min-height: 100vh;
  .ant-layout-sider { background: #0f172a; border-right: 1px solid #1e293b; }
  .ant-menu { background: #0f172a; color: #94a3b8; border-right: none; }
  .ant-menu-item-selected { background-color: #06b6d4 !important; color: white !important; font-weight: bold; }
  .ant-layout-header { background: #0f172a; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; }
  .ant-layout-content { background: #111827; padding: 24px; overflow-y: auto; }
`;

const Main = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  
  // 새로고침해도 마지막 메뉴 유지
  const [selectedKey, setSelectedKey] = useState(localStorage.getItem('lastMenuKey') || '1'); 
  
  const [userData, setUserData] = useState(null);
  
  const myUsername = localStorage.getItem('username');
  const mySessionId = localStorage.getItem('sessionId');
  
  // 관리자 권한 목록
  const adminRoles = ['super_admin', 'admin', 'distributor', 'store'];

  // 로그아웃 핸들러
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

  // IP 저장 (최초 1회)
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

  // 세션 및 유저 상태 실시간 감지
  useEffect(() => {
    if (!myUsername || !mySessionId) { handleLogout(); return; }

    const unsub = onSnapshot(doc(db, "users", myUsername), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);

        // 차단 체크
        if (data.isBlocked) { 
            Modal.error({ 
                title: '차단됨', 
                content: '관리자에 의해 차단되었습니다.', 
                onOk: handleLogout 
            }); 
            return; 
        }

        // 중복 로그인 체크
        if (data.currentSessionId !== mySessionId) { 
            Modal.warning({ 
                title: '중복 로그인', 
                content: '다른 기기에서 접속이 감지되었습니다.', 
                onOk: handleLogout 
            }); 
        }
      } else { 
          handleLogout(); 
      }
    });

    return () => unsub();
  }, [myUsername, mySessionId, navigate]);

  // 이용권 유효성 검사 함수
  const isSubscriptionValid = () => {
      if (!userData) return false;
      if (adminRoles.includes(userData.role)) return true; 
      if (!userData.expiryDate) return false;
      const expiry = userData.expiryDate.toDate ? userData.expiryDate.toDate() : new Date(userData.expiryDate);
      return expiry > new Date();
  };

  // 남은 시간 표시 함수
  const getRemainingTime = () => {
      if (!userData?.expiryDate) return "만료됨";
      const expiry = userData.expiryDate.toDate ? userData.expiryDate.toDate() : new Date(userData.expiryDate);
      if (expiry < new Date()) return "만료됨";
      const diff = expiry - new Date();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      return `${days}일 ${hours}시간 남음`;
  };

  // 메뉴 클릭 핸들러 (클릭 시 저장)
  const handleMenuClick = (e) => {
    if (e.key === 'telegram_cs') {
        window.open(TELEGRAM_CS_URL, '_blank'); 
    } else {
        setSelectedKey(e.key);
        localStorage.setItem('lastMenuKey', e.key); 
    }
  };

  return (
    <DarkLayout>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={250}>
        <div style={{ height: 64, margin: 16, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <h2 style={{color:'white', margin:0, fontWeight:900, fontSize: collapsed ? 10 : 20}}>WHALEBET</h2>
        </div>
        
        <Menu 
            theme="dark" 
            defaultSelectedKeys={['1']} 
            mode="inline" 
            selectedKeys={[selectedKey]}
            onClick={handleMenuClick} 
        >
          <Menu.Item key="1" icon={<DesktopOutlined />}>실시간 픽 (Live)</Menu.Item>
          
          {/* 🔥 [수정] 메뉴 이름 변경 (LiveBot) */}
          <Menu.Item key="auto" icon={<RobotOutlined style={{color: '#22d3ee'}} />}>Auto 솔루션 (LiveBot)</Menu.Item>
          
          <Menu.Item key="notice" icon={<SoundOutlined style={{color:'#f59e0b'}} />}>공지사항</Menu.Item>
          <Menu.Item key="attendance" icon={<CalendarOutlined style={{color: '#10b981'}} />}>출석체크 (Event)</Menu.Item>
          <Menu.Item key="2" icon={<GiftOutlined />}>룰렛 게임 (Event)</Menu.Item>
          <Menu.Item key="3" icon={<SettingOutlined />}>전략 설정</Menu.Item>
          <Menu.Item key="4" icon={<UserOutlined />}>마이페이지</Menu.Item>

          <Menu.Item key="telegram_cs" icon={<CustomerServiceOutlined style={{color: '#3b82f6'}} />}>
             <span style={{color:'#3b82f6', fontWeight:'bold'}}>관리자 문의 (텔레그램)</span>
          </Menu.Item>

          {userData && adminRoles.includes(userData.role) && (
            <Menu.Item 
                key="admin" 
                icon={<CrownOutlined style={{color: '#d4af37'}} />} 
                style={{marginTop: 30, color: '#d4af37', fontWeight:'bold'}}
            >
              관리자 페이지
            </Menu.Item>
          )}
        </Menu>
      </Sider>
      
      <Layout className="site-layout">
        <Header>
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
            <Button type="text" icon={<LogoutOutlined />} style={{color:'#94a3b8'}} onClick={handleLogout}>Logout</Button>
        </Header>
        
        <Content>
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