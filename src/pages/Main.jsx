import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Modal, Tag } from 'antd';
import { 
  DesktopOutlined, GiftOutlined, LogoutOutlined, CrownOutlined, SettingOutlined 
} from '@ant-design/icons';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '../firebase'; 
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

// ★ 같은 폴더의 파일들 불러오기
import Dashboard from './Dashboard';
import RouletteGame from './RouletteGame';

const { Header, Content, Sider } = Layout;

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
  const [selectedKey, setSelectedKey] = useState('1'); 
  
  // 유저 정보 & 보안
  const [userData, setUserData] = useState(null);
  const myUsername = localStorage.getItem('username');
  const mySessionId = localStorage.getItem('sessionId');
  const adminRoles = ['super_admin', 'distributor', 'store'];

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  useEffect(() => {
    if (!myUsername || !mySessionId) { handleLogout(); return; }
    const unsub = onSnapshot(doc(db, "users", myUsername), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        if (data.isBlocked) { Modal.error({ title: '접속 차단', content: '관리자에 의해 차단되었습니다.', onOk: handleLogout }); return; }
        if (data.currentSessionId !== mySessionId) { Modal.warning({ title: '중복 로그인', content: '다른 기기 접속이 감지되었습니다.', onOk: handleLogout }); }
      } else { handleLogout(); }
    });
    return () => unsub();
  }, [myUsername, mySessionId, navigate]);

  return (
    <DarkLayout>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={250}>
        <div style={{ height: 64, margin: 16, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <h2 style={{color:'white', margin:0, fontWeight:900, letterSpacing:1, fontSize: collapsed ? 10 : 20}}>{collapsed ? 'WB' : 'WHALEBET'}</h2>
        </div>
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline" onClick={(e) => setSelectedKey(e.key)}>
          <Menu.Item key="1" icon={<DesktopOutlined />}>실시간 픽 (Live)</Menu.Item>
          <Menu.Item key="2" icon={<GiftOutlined />}>룰렛 게임 (Event)</Menu.Item>
          <Menu.Item key="3" icon={<SettingOutlined />}>전략 설정</Menu.Item>
          
          {userData && adminRoles.includes(userData.role) && (
            <Menu.Item key="admin" icon={<CrownOutlined style={{color: '#d4af37'}} />} style={{marginTop: 50, color: '#d4af37', fontWeight:'bold'}} onClick={() => navigate('/admin')}>
              관리자 페이지
            </Menu.Item>
          )}
        </Menu>
      </Sider>
      
      <Layout className="site-layout">
        <Header>
            <div style={{color:'white', fontWeight:'bold'}}>
                {userData?.role === 'super_admin' && <Tag color="gold">최고관리자</Tag>}
                {userData?.role === 'distributor' && <Tag color="magenta">총판</Tag>}
                {userData?.role === 'store' && <Tag color="cyan">매장</Tag>}
                {userData?.role === 'user' && <Tag color="blue">회원</Tag>}
                <span style={{marginLeft: 10}}>{myUsername}님 환영합니다.</span>
            </div>
            <Button type="text" icon={<LogoutOutlined />} style={{color:'#94a3b8'}} onClick={handleLogout}>Logout</Button>
        </Header>
        
        <Content>
          {/* 메뉴 선택에 따라 보여주는 컴포넌트가 달라짐 */}
          {selectedKey === '1' && <Dashboard />}
          {selectedKey === '2' && <RouletteGame user={userData} />}
          {selectedKey === '3' && <div style={{color:'white', textAlign:'center', marginTop:100}}><h2>🔧 전략 설정 페이지 준비중</h2></div>}
        </Content>
      </Layout>
    </DarkLayout>
  );
};
export default Main;