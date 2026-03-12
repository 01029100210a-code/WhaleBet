import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Layout, Menu, Spin, Button } from 'antd';
import { DesktopOutlined, SettingOutlined, FireOutlined, LogoutOutlined, ClockCircleOutlined, UserOutlined, GiftOutlined, SecurityScanOutlined } from '@ant-design/icons';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

import LivePicks from './pages/LivePicks';
import Settings from './pages/Settings';
import Login from './pages/Login'; 
import MyPage from './pages/MyPage';
import RouletteGame from './pages/RouletteGame';
import Admin from './pages/Admin'; 

const { Header, Content, Sider } = Layout;

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const savedUser = localStorage.getItem('whalebet_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // 접속 상태 유지 (Heartbeat)
  useEffect(() => {
    if (!user) return;
    const heartbeat = async () => {
      try {
        await updateDoc(doc(db, "users", user.username), {
          last_active_at: Timestamp.now(),
          is_online: true
        });
      } catch (e) { /* 무시 */ }
    };
    heartbeat();
    const interval = setInterval(heartbeat, 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('whalebet_user', JSON.stringify(userData)); 
  };

  const handleLogout = async () => {
    if (user) {
        try {
            await updateDoc(doc(db, "users", user.username), {
                is_online: false,
                last_logout_at: Timestamp.now()
            });
        } catch(e) {}
    }
    setUser(null);
    localStorage.removeItem('whalebet_user');
  };

  const getRemainingTime = () => {
    if (!user || !user.expiryDate) return "이용권 없음"; 
    
    let expiry;
    if (user.expiryDate.seconds) {
        expiry = new Date(user.expiryDate.seconds * 1000);
    } else {
        expiry = new Date(user.expiryDate); 
    }

    const now = new Date();
    const diff = expiry - now;

    if (diff <= 0) return "이용권 만료";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    
    return `${days}일 ${hours}시간 남음`;
  };

  if (loading) return <div style={{background:'#0b1219', height:'100vh'}} />;

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const menuItems = [
    { key: '1', icon: <DesktopOutlined />, label: <Link to="/">실시간 픽</Link> },
    { key: '2', icon: <SettingOutlined />, label: <Link to="/settings">전략 설정</Link> },
    { key: '3', icon: <GiftOutlined />, label: <Link to="/game">행운의 룰렛</Link> },
    { key: '4', icon: <UserOutlined />, label: <Link to="/mypage">마이페이지</Link> },
  ];

  if (['admin', 'master', 'store'].includes(user.role)) {
      menuItems.push({ 
          key: '99', 
          icon: <SecurityScanOutlined style={{color: '#d4af37'}} />, 
          label: <Link to="/admin" style={{color: '#d4af37', fontWeight:'bold'}}>파트너 페이지</Link> 
      });
  }

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} style={{background: '#0b1219'}}>
          <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 6, textAlign:'center', color:'#fff', lineHeight:'32px', fontWeight:'bold' }}>
            {collapsed ? 'WB' : 'WhaleBet'}
          </div>
          <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline" style={{background: '#0b1219'}} items={menuItems} />
        </Sider>

        <Layout style={{ background: '#111827' }}>
          <Header style={{ padding: '0 20px', background: '#0b1219', borderBottom: '1px solid #1f2937', display:'flex', justifyContent:'space-between', alignItems:'center', height: 'auto', minHeight: '64px' }}>
             <div style={{color:'white', fontWeight:'bold', fontSize:16}}>WHALEBET DASHBOARD</div>
             <div style={{display:'flex', alignItems:'center', gap: 15, flexWrap: 'wrap', padding: '10px 0'}}>
                <div style={{background: 'rgba(0, 229, 255, 0.1)', padding: '6px 16px', borderRadius: 20, color: '#00e5ff', fontWeight: 'bold', border: '1px solid #00e5ff', display: 'flex', alignItems: 'center', fontSize: 13, whiteSpace: 'nowrap'}}>
                    <ClockCircleOutlined style={{marginRight: 8}} />
                    {getRemainingTime()}
                </div>
                <span style={{color: '#9ca3af', fontSize: 13, whiteSpace: 'nowrap'}}>
                  <FireOutlined style={{color: '#ef4444', marginRight: 5}} />
                  <b style={{color:'gold', marginRight:5}}>{user.role}</b>: <b style={{color:'white'}}>{user.name}님</b>
                </span>
                <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} style={{color:'#6b7280'}}>Logout</Button>
             </div>
          </Header>

          <Content style={{ margin: '16px' }}>
            <Routes>
              <Route path="/" element={<LivePicks />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/game" element={<RouletteGame user={user} />} />
              <Route path="/mypage" element={<MyPage user={user} />} />
              <Route path="/admin" element={['admin', 'master', 'store'].includes(user.role) ? <Admin currentUser={user} /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;