import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Row, Col, Statistic, Card, Typography, Table, Tag, Modal } from 'antd';
import { 
  UserOutlined, LockOutlined, TrophyOutlined, FireOutlined, AimOutlined, 
  ThunderboltOutlined, SendOutlined, GlobalOutlined, HistoryOutlined,
  IdcardOutlined, PhoneOutlined, BarcodeOutlined 
} from '@ant-design/icons';
import styled, { keyframes, createGlobalStyle } from 'styled-components';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, updateDoc, setDoc, Timestamp, getDocs, where } from "firebase/firestore";
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import bcrypt from 'bcryptjs';

const { Title, Text } = Typography;
const ADMIN_TELEGRAM_URL = "https://t.me/whalebet_admin"; 

// --- 애니메이션 & 스타일 ---
const float = keyframes` 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } `;
const glow = keyframes` 0% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.2); } 50% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.5); } 100% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.2); } `;
const scrollVertical = keyframes` 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } `;
const GlobalStyle = createGlobalStyle` body { background-color: #0b0e14; margin: 0; font-family: 'Inter', sans-serif; } `;
const Container = styled.div` min-height: 100vh; display: flex; flex-direction: column; background: radial-gradient(circle at 50% 10%, #1e293b 0%, #0b0e14 100%); overflow-x: hidden; `;
const Header = styled.div` padding: 20px 40px; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(11,14,20,0.8); backdrop-filter: blur(10px); z-index: 10; `;
const Logo = styled.div` font-size: 24px; font-weight: 900; color: white; span { color: #d4af37; } `;
const ContentWrapper = styled.div` flex: 1; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; z-index: 5; `;
const StatsBar = styled.div` display: flex; justify-content: center; gap: 40px; margin-bottom: 40px; flex-wrap: wrap; width: 100%; max-width: 1200px; `;
const StatItem = styled.div` text-align: center; padding: 15px 30px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; min-width: 160px; transition: all 0.3s; &:hover { border-color: #d4af37; transform: translateY(-5px); } `;
const LoginCard = styled(Card)` width: 100%; max-width: 400px; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; backdrop-filter: blur(20px); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); animation: ${glow} 3s infinite; .ant-input-affix-wrapper { background: rgba(0, 0, 0, 0.3); border-color: rgba(255, 255, 255, 0.1); color: white; padding: 12px; } input { background: transparent; color: white; } .ant-btn-primary { height: 45px; font-weight: bold; background: linear-gradient(135deg, #d4af37 0%, #f59e0b 100%); border: none; &:hover { opacity: 0.9; transform: scale(1.02); } } `;
const IntroSection = styled.div` color: white; animation: ${float} 6s ease-in-out infinite; h1 { font-size: 48px; font-weight: 900; margin-bottom: 20px; } p { font-size: 16px; color: #94a3b8; margin-bottom: 30px; } `;
const ResultTableWrapper = styled.div` margin-top: 40px; width: 100%; max-width: 800px; background: rgba(15, 23, 42, 0.6); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.1); h3 { color: white; margin-bottom: 15px; } .ant-table { color: #e5e7eb; font-size:12px; } .ant-table-thead > tr > th { background: rgba(30, 41, 59, 0.8) !important; color: #94a3b8 !important; border-bottom: 1px solid #334155 !important; } .ant-table-tbody > tr > td { border-bottom: 1px solid #1e293b !important; color: #e5e7eb !important; } .ant-table-tbody > tr:hover > td { background: rgba(255, 255, 255, 0.05) !important; } `;
const ReservationWidget = styled.div` position: absolute; bottom: 40px; left: 40px; width: 280px; height: 180px; background: rgba(15, 23, 42, 0.9); border: 1px solid #1e293b; border-left: 3px solid #10b981; border-radius: 8px; padding: 15px; overflow: hidden; z-index: 20; .scroll-content { animation: ${scrollVertical} 20s linear infinite; } .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; font-size: 13px; font-family: monospace; } @media (max-width: 768px) { display: none; } `;
const Footer = styled.div` padding: 40px; background: #05070a; border-top: 1px solid #1e293b; text-align: center; color: #475569; font-size: 12px; `;

const reservationData = Array.from({ length: 30 }, (_, i) => ({ id: `user${Math.floor(Math.random() * 900) + 100}***`, time: `${Math.floor(Math.random() * 59) + 1}m ago`, action: 'Reserved AI Access' }));

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false); 
  const [stats, setStats] = useState({ winRate: 0, totalScore: 0, streak: 0, safetyHit: 0 });
  const [recentHistory, setRecentHistory] = useState([]);

  useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const q = query(collection(db, "game_history"), orderBy("created_at", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setRecentHistory(data.slice(0, 5));
      const todayData = data.filter(item => item.created_at && (item.created_at.seconds * 1000) >= startOfDay);
      const winCount = todayData.filter(d => d.result === 'WIN').length;
      setStats({
        winRate: todayData.length === 0 ? 0 : Math.round((winCount / todayData.length) * 100),
        totalScore: todayData.reduce((acc, curr) => curr.result === 'WIN' ? acc + curr.step : acc, 0),
        streak: data.findIndex(item => item.result !== 'WIN'),
        safetyHit: data.filter(d => d.result === 'WIN' && d.step >= 3).length
      });
    });
    return () => unsubscribe();
  }, []);

  // --- 로그인 ---
  const onFinish = async (values) => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", values.username);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        message.error("존재하지 않는 아이디입니다.");
        setLoading(false); return;
      }

      const userData = userSnap.data();

      // 🔥 1. 승인 대기 체크
      if (userData.isApproved === false) {
          message.warning("관리자 승인 대기 중입니다. 잠시 후 다시 시도해주세요.");
          setLoading(false); return;
      }

      // 2. 차단 체크
      if (userData.isBlocked && userData.username !== 'admin') {
        message.error("접속이 차단된 계정입니다.");
        setLoading(false); return;
      }

      // 3. 비밀번호 확인
      const isMatch = await bcrypt.compare(values.password, userData.password);
      if (!isMatch) {
        message.error("비밀번호가 일치하지 않습니다.");
        setLoading(false); return;
      }

      const newSessionId = Date.now().toString();
      
      // 관리자 권한 승격 로직
      let finalRole = userData.role;
      if (values.username === 'admin') {
          finalRole = 'super_admin';
          await updateDoc(userRef, { currentSessionId: newSessionId, role: 'super_admin' });
      } else {
          await updateDoc(userRef, { currentSessionId: newSessionId });
      }

      localStorage.setItem('username', userData.username);
      localStorage.setItem('role', finalRole);
      localStorage.setItem('sessionId', newSessionId);
      localStorage.setItem('entryLevel', userData.strategyLevel || 1);

      message.success(`환영합니다, ${values.username}님!`);
      navigate('/main');
    } catch (error) { message.error("로그인 오류"); }
    setLoading(false);
  };

  // --- 회원가입 ---
  const onJoin = async (values) => {
    try {
        const userRef = doc(db, "users", values.username);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            message.error("이미 존재하는 아이디입니다."); return;
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(values.password, salt);

        await setDoc(userRef, {
            username: values.username,
            password: hashedPassword,
            name: values.name,           // 이름
            phone: values.phone,         // 번호
            referralCode: values.code,   // 코드
            role: 'user',
            createdAt: Timestamp.now(),
            expiryDate: null,
            isBlocked: false,
            isApproved: false,           // 🔥 승인 대기 상태
            telegramChatId: '',
            isTelegramActive: false,
            isTelegramBlocked: false,
            strategyLevel: 1,
            currentSessionId: null
        });

        message.success("가입 신청 완료! 관리자 승인을 기다려주세요.");
        setIsJoinModalVisible(false);
    } catch (e) {
        message.error("가입 실패");
    }
  };

  const columns = [
    { title: 'Time', dataIndex: 'created_at', render: (ts) => <span style={{color:'#94a3b8'}}>{ts ? new Date(ts.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span> },
    { title: 'Room', dataIndex: 'room_name', render: (text) => <span style={{color:'white', fontWeight:'bold'}}>{text}</span> },
    { title: 'Pick', dataIndex: 'pick', render: (pick) => <span style={{fontWeight:'bold', color: pick === 'P' ? '#3b82f6' : '#ef4444'}}>{pick === 'P' ? 'PLAYER' : 'BANKER'}</span> },
    { title: 'Result', dataIndex: 'result', render: (res) => <span style={{color: res === 'WIN' ? '#10b981' : '#ef4444', fontWeight:'bold'}}>{res}</span> },
    { title: 'Step', dataIndex: 'step', align: 'right', render: (step) => <Tag color={step <= 4 ? "gold" : "volcano"}>{step}단계</Tag> }
  ];

  return (
    <>
      <GlobalStyle />
      <Container>
        <Header>
          <Logo>WHALE<span>BET</span></Logo>
          <Button type="primary" icon={<SendOutlined />} onClick={() => window.open(ADMIN_TELEGRAM_URL, '_blank')} style={{background: '#229ED9', borderColor: '#229ED9', fontWeight:'bold'}}>Telegram Support</Button>
        </Header>

        <ContentWrapper>
          <div style={{width: '100%', maxWidth: 1200}}>
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
                    <a onClick={() => setIsJoinModalVisible(true)} style={{color:'#d4af37', fontWeight:'bold', marginLeft: 5, cursor:'pointer'}}>Join Now</a>
                  </div>
                </LoginCard>
              </Col>
            </Row>

            <div style={{display:'flex', justifyContent:'center'}}>
                <ResultTableWrapper>
                    <h3><HistoryOutlined /> LIVE RECENT RESULTS</h3>
                    <Table dataSource={recentHistory} columns={columns} pagination={false} size="small" />
                </ResultTableWrapper>
            </div>
          </div>
        </ContentWrapper>

        {/* 회원가입 모달 */}
        <Modal title="회원가입 신청" open={isJoinModalVisible} onCancel={() => setIsJoinModalVisible(false)} footer={null}>
            <Form layout="vertical" onFinish={onJoin}>
                <Form.Item name="username" label="아이디" rules={[{ required: true, message: '아이디를 입력하세요' }]}><Input prefix={<UserOutlined />} /></Form.Item>
                <Form.Item name="password" label="비밀번호" rules={[{ required: true, message: '비밀번호를 입력하세요' }]}><Input.Password prefix={<LockOutlined />} /></Form.Item>
                <Row gutter={10}>
                    <Col span={12}><Form.Item name="name" label="이름" rules={[{ required: true }]}><Input prefix={<IdcardOutlined />} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="phone" label="핸드폰" rules={[{ required: true }]}><Input prefix={<PhoneOutlined />} /></Form.Item></Col>
                </Row>
                <Form.Item name="code" label="가입 코드" rules={[{ required: true }]} help="코드 미소지시 가입 불가"><Input prefix={<BarcodeOutlined />} /></Form.Item>
                <Button type="primary" htmlType="submit" block style={{fontWeight:'bold'}}>가입 신청하기</Button>
            </Form>
        </Modal>

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
            <p>Established in 2020, WHALEBET specializes in AI Baccarat algorithms and big data analysis.</p>
            <p style={{color:'#334155'}}>© 2020-2024 WHALEBET Corp. All rights reserved.</p>
        </Footer>
      </Container>
    </>
  );
};

export default Login;