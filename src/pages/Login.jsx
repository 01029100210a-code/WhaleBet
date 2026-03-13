import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Row, Col, Statistic, Card, Typography, Table, Tag } from 'antd';
import { 
  UserOutlined, LockOutlined, TrophyOutlined, 
  FireOutlined, AimOutlined, ThunderboltOutlined, SendOutlined, GlobalOutlined, HistoryOutlined 
} from '@ant-design/icons';
import styled, { keyframes, createGlobalStyle } from 'styled-components';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import bcrypt from 'bcryptjs';

const { Title, Text } = Typography;

// --- ⚙️ 설정 ---
const ADMIN_TELEGRAM_URL = "https://t.me/whalebet_admin"; 

// --- ✨ 애니메이션 ---
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.2); }
  50% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.5); }
  100% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.2); }
`;

const scrollVertical = keyframes`
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
`;

// --- 🎨 스타일 ---
const GlobalStyle = createGlobalStyle`
  body {
    background-color: #0b0e14;
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
`;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
  background: radial-gradient(circle at 50% 10%, #1e293b 0%, #0b0e14 100%);
`;

const Header = styled.div`
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(11, 14, 20, 0.8);
  backdrop-filter: blur(10px);
  z-index: 10;
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: 900;
  color: white;
  letter-spacing: 2px;
  span { color: #d4af37; }
`;

const ContentWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  z-index: 5;
`;

const StatsBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 40px;
  flex-wrap: wrap;
  width: 100%;
  max-width: 1200px;
  
  .ant-statistic-title { color: #64748b; font-size: 12px; letter-spacing: 1px; }
  .ant-statistic-content { color: white; font-weight: bold; font-family: 'Monaco', monospace; }
`;

const StatItem = styled.div`
  text-align: center;
  padding: 15px 30px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  min-width: 160px;
  transition: all 0.3s;
  &:hover {
    background: rgba(255,255,255,0.05);
    border-color: #d4af37;
    transform: translateY(-5px);
  }
`;

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  animation: ${glow} 3s infinite;

  .ant-input-affix-wrapper {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.1);
    color: white;
    padding: 12px;
  }
  input { background: transparent; color: white; }
  .ant-btn-primary {
    height: 45px;
    font-weight: bold;
    background: linear-gradient(135deg, #d4af37 0%, #f59e0b 100%);
    border: none;
    &:hover { opacity: 0.9; transform: scale(1.02); }
  }
`;

const IntroSection = styled.div`
  color: white;
  animation: ${float} 6s ease-in-out infinite;

  h1 {
    font-size: 48px;
    font-weight: 900;
    margin-bottom: 20px;
    line-height: 1.2;
    background: linear-gradient(to right, #fff, #94a3b8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  p { font-size: 16px; color: #94a3b8; line-height: 1.6; margin-bottom: 30px; }

  @media (max-width: 768px) {
    text-align: center;
    h1 { font-size: 32px; }
  }
`;

const ReservationWidget = styled.div`
  position: absolute;
  bottom: 40px;
  left: 40px;
  width: 280px;
  height: 180px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid #1e293b;
  border-left: 3px solid #10b981;
  border-radius: 8px;
  padding: 15px;
  overflow: hidden;
  z-index: 20;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);

  h4 { color: #fff; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #10b981; }
  
  .list-container {
    height: 100%;
    overflow: hidden;
    position: relative;
  }
  .scroll-content {
    animation: ${scrollVertical} 20s linear infinite;
  }
  .item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    color: #cbd5e1;
    font-size: 13px;
    font-family: monospace;
  }
  @media (max-width: 768px) { display: none; }
`;

const ResultTableWrapper = styled.div`
  margin-top: 40px;
  width: 100%;
  max-width: 800px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  h3 { color: white; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; font-size: 16px; }
  
  .ant-table { background: transparent; color: #e5e7eb; font-size: 12px; }
  .ant-table-thead > tr > th { background: rgba(30, 41, 59, 0.8) !important; color: #94a3b8 !important; border-bottom: 1px solid #334155 !important; font-size: 11px; }
  .ant-table-tbody > tr > td { border-bottom: 1px solid #1e293b !important; color: #e5e7eb !important; padding: 8px 16px !important; }
  .ant-table-tbody > tr:hover > td { background: rgba(255, 255, 255, 0.05) !important; }
`;

const Footer = styled.div`
  padding: 40px;
  background: #05070a;
  border-top: 1px solid #1e293b;
  text-align: center;
  color: #475569;
  font-size: 12px;
  
  h3 { color: #64748b; font-size: 14px; margin-bottom: 10px; font-weight: bold; }
  p { margin: 5px 0; max-width: 800px; margin: 0 auto 10px auto; line-height: 1.5; }
`;

// --- 더미 데이터 ---
const reservationData = Array.from({ length: 30 }, (_, i) => ({
  id: `user${Math.floor(Math.random() * 900) + 100}***`,
  time: `${Math.floor(Math.random() * 59) + 1}m ago`,
  action: 'Reserved AI Access'
}));

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ winRate: 0, totalScore: 0, streak: 0, safetyHit: 0 });
  const [recentHistory, setRecentHistory] = useState([]);

  // --- 🔥 Firestore 통계 및 히스토리 가져오기 ---
  useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const q = query(collection(db, "game_history"), orderBy("created_at", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      
      // Recent Results (상위 5개만 노출)
      setRecentHistory(data.slice(0, 5));

      const todayData = data.filter(item => {
          if (!item.created_at) return false;
          return (item.created_at.seconds * 1000) >= startOfDay;
      });

      const totalGames = todayData.length;
      const winCount = todayData.filter(d => d.result === 'WIN').length;
      const winRate = totalGames === 0 ? 0 : Math.round((winCount / totalGames) * 100);
      const totalScore = todayData.reduce((acc, curr) => curr.result === 'WIN' ? acc + curr.step : acc, 0);
      
      let streak = 0;
      for (let item of data) {
          if (item.result !== 'WIN') break;
          if (item.step <= 4) streak++; else break;
      }

      setStats({ winRate, totalScore, streak, safetyHit: data.filter(d => d.result === 'WIN' && d.step >= 3).length });
    });

    return () => unsubscribe();
  }, []);

  // --- 로그인 핸들러 (기존 로직 유지) ---
  const onFinish = async (values) => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", values.username);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        message.error("존재하지 않는 아이디입니다.");
        setLoading(false);
        return;
      }

      const userData = userSnap.data();

      // 1. 차단 체크 (admin 제외)
      if (userData.isBlocked && userData.username !== 'admin') {
        message.error("관리자에 의해 접속이 차단된 계정입니다.");
        setLoading(false);
        return;
      }

      // 2. 비밀번호 확인 (bcrypt)
      const isMatch = await bcrypt.compare(values.password, userData.password);
      if (!isMatch) {
        message.error("비밀번호가 일치하지 않습니다.");
        setLoading(false);
        return;
      }

      // 3. 세션 ID 생성
      const newSessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      // 4. 슈퍼관리자 승격 로직
      let finalRole = userData.role;
      if (values.username === 'admin') {
          finalRole = 'super_admin';
          await updateDoc(userRef, {
              currentSessionId: newSessionId,
              role: 'super_admin'
          });
      } else {
          await updateDoc(userRef, { currentSessionId: newSessionId });
      }

      // 5. 로컬 저장 및 이동
      localStorage.setItem('username', userData.username);
      localStorage.setItem('role', finalRole);
      localStorage.setItem('sessionId', newSessionId);
      localStorage.setItem('entryLevel', userData.strategyLevel || 1);

      message.success(`환영합니다, ${values.username}님!`);
      navigate('/main');

    } catch (error) {
      console.error(error);
      message.error("로그인 중 오류가 발생했습니다.");
    }
    setLoading(false);
  };

  const columns = [
    { title: 'Time', dataIndex: 'created_at', key: 'time', render: (ts) => <span style={{color:'#94a3b8'}}>{ts ? new Date(ts.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span> },
    { title: 'Room', dataIndex: 'room_name', key: 'room', render: (text) => <span style={{color:'white', fontWeight:'bold'}}>{text}</span> },
    { title: 'Pick', dataIndex: 'pick', key: 'pick', align: 'center', render: (pick) => <span style={{fontWeight:'bold', color: pick === 'P' ? '#3b82f6' : '#ef4444'}}>{pick === 'P' ? 'PLAYER' : 'BANKER'}</span> },
    { title: 'Result', dataIndex: 'result', key: 'result', align: 'center', render: (res) => <span style={{color: res === 'WIN' ? '#10b981' : '#ef4444', fontWeight:'bold'}}>{res}</span> },
    { title: 'Step', dataIndex: 'step', key: 'step', align: 'right', render: (step) => <Tag color={step <= 4 ? "gold" : "volcano"}>{step}단계</Tag> }
  ];

  return (
    <>
      <GlobalStyle />
      <Container>
        <Header>
          <Logo>WHALE<span>BET</span></Logo>
          <Button type="primary" icon={<SendOutlined />} onClick={() => window.open(ADMIN_TELEGRAM_URL, '_blank')} style={{background: '#229ED9', borderColor: '#229ED9', fontWeight:'bold'}}>
            Telegram Support
          </Button>
        </Header>

        <ContentWrapper>
          <div style={{width: '100%', maxWidth: 1200}}>
            
            {/* 통계 바 */}
            <StatsBar>
                <StatItem><Statistic title="WIN RATE (Today)" value={stats.winRate} suffix="%" valueStyle={{ color: '#10b981' }} prefix={<AimOutlined />} /></StatItem>
                <StatItem><Statistic title="TOTAL SCORE" value={stats.totalScore} suffix="pts" valueStyle={{ color: '#d4af37' }} prefix={<TrophyOutlined />} /></StatItem>
                <StatItem><Statistic title="WIN STREAK" value={stats.streak} valueStyle={{ color: '#f59e0b' }} prefix={<FireOutlined />} /></StatItem>
                <StatItem><Statistic title="SAFETY HITS" value={stats.safetyHit} valueStyle={{ color: '#3b82f6' }} prefix={<ThunderboltOutlined />} /></StatItem>
            </StatsBar>

            <Row gutter={60} align="middle">
              <Col xs={24} md={14}>
                <IntroSection>
                  <Tag color="gold" style={{marginBottom: 15, fontWeight:'bold'}}>VER 2.0 AI SYSTEM</Tag>
                  <h1>Unlock the Future of <br/><span style={{color:'#d4af37'}}>Data-Driven</span> Betting.</h1>
                  <p>Experience the power of WhaleBet's real-time pattern recognition algorithm. We provide accurate probability statistics and automated Telegram alerts to maximize your winning potential.</p>
                  <div style={{display:'flex', gap: 15}}>
                    <Button size="large" type="primary" style={{height: 50, padding: '0 40px', fontWeight:'bold', background: 'white', color: 'black', border:'none'}}>View Demo</Button>
                    <Button size="large" icon={<GlobalOutlined />} style={{height: 50, background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)'}}>Global Service</Button>
                  </div>
                </IntroSection>
              </Col>

              <Col xs={24} md={10}>
                <LoginCard bordered={false}>
                  <div style={{textAlign:'center', marginBottom: 30}}>
                    <Title level={3} style={{color:'white', margin:0}}>MEMBER LOGIN</Title>
                    <Text style={{color:'#64748b'}}>Access your personal AI dashboard</Text>
                  </div>
                  <Form name="login" onFinish={onFinish} layout="vertical">
                    <Form.Item name="username" rules={[{ required: true }]}><Input prefix={<UserOutlined />} placeholder="Username" size="large" /></Form.Item>
                    <Form.Item name="password" rules={[{ required: true }]}><Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" /></Form.Item>
                    <Form.Item><Button type="primary" htmlType="submit" loading={loading} block size="large">LOG IN NOW</Button></Form.Item>
                  </Form>
                  <div style={{textAlign:'center', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop: 20}}>
                    <Text style={{color:'#94a3b8', fontSize: 12}}>Don't have an account? </Text>
                    <a href={ADMIN_TELEGRAM_URL} target="_blank" rel="noreferrer" style={{color:'#d4af37', fontWeight:'bold', marginLeft: 5}}>Contact Admin</a>
                  </div>
                </LoginCard>
              </Col>
            </Row>

            {/* 🔥 Recent Results (중앙 배치) */}
            <div style={{display:'flex', justifyContent:'center'}}>
                <ResultTableWrapper>
                    <h3><HistoryOutlined /> LIVE RECENT RESULTS</h3>
                    <Table 
                        dataSource={recentHistory} 
                        columns={columns} 
                        pagination={false} 
                        rowKey={(record) => record.created_at?.seconds || Math.random()}
                        size="small"
                    />
                </ResultTableWrapper>
            </div>

          </div>
        </ContentWrapper>

        {/* 예약자 슬라이더 */}
        <ReservationWidget>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                <h4><span style={{animation: 'pulse 1s infinite'}}>●</span> Live Reservations</h4>
                <Text style={{color:'#64748b', fontSize:10}}>Real-time</Text>
            </div>
            <div className="list-container">
                <div className="scroll-content">
                    {[...reservationData, ...reservationData].map((item, idx) => (
                        <div key={idx} className="item">
                            <span style={{color:'#93c5fd'}}>{item.id}</span>
                            <span style={{color:'#10b981'}}>{item.action}</span>
                            <span style={{color:'#64748b'}}>{item.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </ReservationWidget>

        <Footer>
            <h3>WHALEBET ANALYTICS GROUP</h3>
            <p>Established in 2020, WHALEBET specializes in AI Baccarat algorithms and big data analysis. We are committed to providing innovative services and building a trusted probability statistics system for our users.</p>
            <p style={{color:'#334155'}}>© 2020-2024 WHALEBET Corp. All rights reserved.</p>
        </Footer>
      </Container>
    </>
  );
};

export default Login;