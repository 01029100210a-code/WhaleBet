import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Row, Col, Statistic, Card, Typography, Table, Tag, Modal, Divider, Alert } from 'antd';
import { 
  UserOutlined, LockOutlined, TrophyOutlined, FireOutlined, AimOutlined, 
  ThunderboltOutlined, SendOutlined, GlobalOutlined, HistoryOutlined,
  IdcardOutlined, PhoneOutlined, BarcodeOutlined, ReadOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import styled, { keyframes, createGlobalStyle } from 'styled-components';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, updateDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import bcrypt from 'bcryptjs';

const { Title, Text, Paragraph } = Typography;
const ADMIN_TELEGRAM_URL = "https://t.me/whalebet_admin"; 

// --- 애니메이션 ---
const float = keyframes` 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } `;
const glow = keyframes` 0% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.2); } 50% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.5); } 100% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.2); } `;
const scrollVertical = keyframes` 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } `;

// --- 스타일 ---
const GlobalStyle = createGlobalStyle` 
  body { background-color: #0b0e14; margin: 0; font-family: 'Inter', sans-serif; } 
  .ant-table-thead > tr > th { 
    background: #111827 !important; 
    color: #94a3b8 !important; 
    border-bottom: 1px solid #1f2937 !important; 
    font-size: 11px !important;
    text-transform: uppercase;
  }
  .ant-table-tbody > tr > td { 
    background: transparent !important;
    color: #e2e8f0 !important; 
    border-bottom: 1px solid #1f2937 !important;
    font-size: 13px !important;
    font-weight: 600;
  }
  .ant-table-tbody > tr:hover > td { 
    background: rgba(255, 255, 255, 0.03) !important; 
  }
  .ant-table { 
    background: transparent !important; 
  }
  /* 모달 커스텀 */
  .ant-modal-content {
    background: #1e293b !important;
    border: 1px solid #334155;
  }
  .ant-modal-header {
    background: transparent !important;
    border-bottom: 1px solid #334155 !important;
  }
  .ant-modal-title {
    color: white !important;
  }
  .ant-modal-close {
    color: white !important;
  }
`;

const Container = styled.div` min-height: 100vh; display: flex; flex-direction: column; background: radial-gradient(circle at 50% 10%, #1e293b 0%, #0b0e14 100%); overflow-x: hidden; position: relative; `;
const Header = styled.div` padding: 20px 40px; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(11,14,20,0.8); backdrop-filter: blur(10px); z-index: 10; `;
const Logo = styled.div` font-size: 24px; font-weight: 900; color: white; span { color: #d4af37; } `;
const ContentWrapper = styled.div` flex: 1; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; z-index: 5; `;
const StatsBar = styled.div` display: flex; justify-content: center; gap: 40px; margin-bottom: 40px; flex-wrap: wrap; width: 100%; max-width: 1200px; `;
const StatItem = styled.div` text-align: center; padding: 15px 30px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; min-width: 160px; transition: all 0.3s; &:hover { border-color: #d4af37; transform: translateY(-5px); } `;
const LoginCard = styled(Card)` width: 100%; max-width: 400px; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; backdrop-filter: blur(20px); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); animation: ${glow} 3s infinite; .ant-input-affix-wrapper { background: rgba(0, 0, 0, 0.3); border-color: rgba(255, 255, 255, 0.1); color: white; padding: 12px; } input { background: transparent; color: white; } .ant-btn-primary { height: 45px; font-weight: bold; background: linear-gradient(135deg, #d4af37 0%, #f59e0b 100%); border: none; &:hover { opacity: 0.9; transform: scale(1.02); } } `;
const IntroSection = styled.div` color: white; animation: ${float} 6s ease-in-out infinite; h1 { font-size: 48px; font-weight: 900; margin-bottom: 20px; } p { font-size: 16px; color: #94a3b8; margin-bottom: 30px; } `;

// 결과 테이블 래퍼 (오른쪽 배치)
const ResultTableWrapper = styled.div` 
  width: 100%; 
  height: 100%;
  min-height: 400px;
  background: #111827; 
  border-radius: 12px; 
  padding: 25px; 
  border: 1px solid #1f293b;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);

  h3 { 
    color: white; 
    margin-bottom: 20px; 
    font-size: 14px; 
    font-weight: bold; 
    display: flex; 
    align-items: center; 
    gap: 8px;
    letter-spacing: 1px;
  }
`;

// 예약자 위젯 (왼쪽 배치 - fixed 제거됨)
const ReservationWidget = styled.div` 
  width: 100%; 
  height: 100%;
  min-height: 400px; /* 테이블과 높이 맞추기 */
  background: #0f172a; 
  border: 1px solid #1e293b; 
  border-top: 4px solid #10b981; 
  border-radius: 8px; 
  padding: 20px; 
  overflow: hidden; 
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);

  /* 헤더 */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 10px;
  }

  h4 { 
    color: #10b981; 
    margin: 0; 
    font-size: 12px; 
    font-weight: 800; 
    text-transform: uppercase; 
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .list-container {
    height: 320px; /* 내부 스크롤 높이 */
    overflow: hidden;
    position: relative;
  }
  
  .scroll-content {
    animation: ${scrollVertical} 40s linear infinite;
  }
  
  .item { 
    display: flex; 
    justify-content: space-between; 
    padding: 8px 0; 
    font-size: 12px; 
    font-family: 'Monaco', monospace; 
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.03);
  }

  .user { color: #60a5fa; }
  .action { color: #10b981; }
  .time { color: #475569; font-size: 11px; }
`;

const Footer = styled.div` padding: 40px; background: #05070a; border-top: 1px solid #1e293b; text-align: center; color: #475569; font-size: 12px; `;

// 더미 데이터
const reservationData = Array.from({ length: 30 }, (_, i) => ({ id: `user${Math.floor(Math.random() * 900) + 100}***`, time: `${Math.floor(Math.random() * 59) + 1}m ago`, action: 'Reserved AI Access' }));

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // 모달 상태 관리
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false); 
  const [isDemoModalVisible, setIsDemoModalVisible] = useState(false); // 데모 신청 모달
  const [isGuideModalVisible, setIsGuideModalVisible] = useState(false); // 이용가이드 모달
  const [generatedAccount, setGeneratedAccount] = useState(null); // 생성된 데모 계정 정보

  const [stats, setStats] = useState({ winRate: 0, totalScore: 0, streak: 0, safetyHit: 0 });
  const [recentHistory, setRecentHistory] = useState([]);

  useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const q = query(collection(db, "game_history"), orderBy("created_at", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setRecentHistory(data.slice(0, 5)); // 테이블엔 5개만
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

  // 로그인 로직 (데모 계정 만료 체크 추가)
  const onFinish = async (values) => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", values.username);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) { message.error("존재하지 않는 아이디입니다."); setLoading(false); return; }
      
      const userData = userSnap.data();

      // [추가] 데모 계정 만료 체크
      if (userData.expiryDate) {
        const expiry = userData.expiryDate.toDate();
        if (new Date() > expiry) {
          message.error("만료된 데모 계정입니다. 정식 가입을 이용해주세요.");
          setLoading(false);
          return;
        }
      }

      if (userData.isApproved === false) { message.warning("관리자 승인 대기 중입니다."); setLoading(false); return; }
      if (userData.isBlocked && userData.username !== 'admin') { message.error("접속이 차단된 계정입니다."); setLoading(false); return; }
      
      const isMatch = await bcrypt.compare(values.password, userData.password);
      if (!isMatch) { message.error("비밀번호가 일치하지 않습니다."); setLoading(false); return; }
      
      const newSessionId = Date.now().toString();
      let finalRole = userData.role;
      if (values.username === 'admin') { finalRole = 'super_admin'; await updateDoc(userRef, { currentSessionId: newSessionId, role: 'super_admin' }); } 
      else { await updateDoc(userRef, { currentSessionId: newSessionId }); }
      
      localStorage.setItem('username', userData.username);
      localStorage.setItem('role', finalRole);
      localStorage.setItem('sessionId', newSessionId);
      localStorage.setItem('entryLevel', userData.strategyLevel || 1);
      
      message.success(`환영합니다, ${values.username}님!`);
      navigate('/main');
    } catch (error) { message.error("로그인 오류"); }
    setLoading(false);
  };

  // 회원가입 로직
  const onJoin = async (values) => {
    try {
        const userRef = doc(db, "users", values.username);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) { message.error("이미 존재하는 아이디입니다."); return; }
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(values.password, salt);
        await setDoc(userRef, {
            username: values.username, password: hashedPassword, name: values.name, phone: values.phone, referralCode: values.code,
            role: 'user', createdAt: Timestamp.now(), expiryDate: null, isBlocked: false, isApproved: false, telegramChatId: '', isTelegramActive: false, isTelegramBlocked: false, strategyLevel: 1, currentSessionId: null
        });
        message.success("가입 신청 완료! 승인을 기다려주세요.");
        setIsJoinModalVisible(false);
    } catch (e) { message.error("가입 실패"); }
  };

  // [신규 기능] 데모 계정 생성 로직
  const handleCreateDemo = async (values) => {
    try {
        // 랜덤 ID/PW 생성
        const randomId = `demo${Math.floor(1000 + Math.random() * 9000)}`;
        const randomPw = Math.random().toString(36).slice(-6); // 6자리 랜덤 비번
        
        // 3시간 후 만료 시간 설정
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 3);

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(randomPw, salt);

        // Firestore에 저장
        await setDoc(doc(db, "users", randomId), {
            username: randomId,
            password: hashedPassword,
            name: `체험고객-${values.phone.slice(-4)}`,
            phone: values.phone,
            role: 'demo',
            createdAt: Timestamp.now(),
            expiryDate: Timestamp.fromDate(expiryDate), // 만료일 설정
            isBlocked: false,
            isApproved: true, // 데모는 즉시 승인
            strategyLevel: 1
        });

        // 결과 보여주기
        setGeneratedAccount({ id: randomId, pw: randomPw, expiry: expiryDate.toLocaleTimeString() });
        setIsDemoModalVisible(false);
    } catch (e) {
        console.error(e);
        message.error("데모 계정 생성 실패");
    }
  };

  // 테이블 컬럼
  const columns = [
    { title: 'Time', dataIndex: 'created_at', width: 100, render: (ts) => <span style={{color:'#64748b'}}>{ts ? new Date(ts.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span> },
    { title: 'Room', dataIndex: 'room_name', render: (text) => <span style={{color:'white', fontWeight:'600'}}>{text}</span> },
    { title: 'Pick', dataIndex: 'pick', width: 80, align: 'center', render: (pick) => <span style={{fontWeight:'800', color: pick === 'P' ? '#3b82f6' : '#ef4444'}}>{pick === 'P' ? 'P' : 'B'}</span> },
    { title: 'Result', dataIndex: 'result', width: 80, align: 'center', render: (res) => <span style={{color: res === 'WIN' ? '#10b981' : '#ef4444', fontWeight:'bold', letterSpacing:1}}>{res}</span> },
    { title: 'Step', dataIndex: 'step', width: 70, align: 'right', render: (step) => <Tag style={{border:'none', background: step <= 4 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: step <= 4 ? '#fbbf24' : '#ef4444', fontWeight:'bold'}}>{step}</Tag> }
  ];

  return (
    <>
      <GlobalStyle />
      <Container>
        <Header>
          <Logo>WHALE<span>BET</span></Logo>
          <Button type="primary" icon={<SendOutlined />} onClick={() => window.open(ADMIN_TELEGRAM_URL, '_blank')} style={{background: '#3b82f6', border: 'none', fontWeight:'bold', borderRadius: 4}}>Telegram Support</Button>
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
                  <Tag color="gold" style={{marginBottom: 15, fontWeight:'bold', border:'none'}}>VER 2.0 AI SYSTEM</Tag>
                  <h1>Unlock the Future of <br/><span style={{color:'#d4af37'}}>Data-Driven</span> Betting.</h1>
                  <p>Experience the power of WhaleBet's real-time pattern recognition algorithm. We provide accurate probability statistics and automated Telegram alerts to maximize your winning potential.</p>
                  
                  {/* 버튼 영역 수정 */}
                  <div style={{display:'flex', gap: 15}}>
                    <Button 
                        size="large" 
                        onClick={() => setIsDemoModalVisible(true)}
                        style={{height: 50, padding: '0 40px', fontWeight:'bold', background: 'white', color: 'black', border:'none'}}
                    >
                        View Demo (3시간 무료)
                    </Button>
                    <Button 
                        size="large" 
                        icon={<GlobalOutlined />} 
                        onClick={() => setIsGuideModalVisible(true)}
                        style={{height: 50, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)'}}
                    >
                        Global Service / Guide
                    </Button>
                  </div>
                </IntroSection>
              </Col>

              <Col xs={24} md={10}>
                <LoginCard bordered={false}>
                  <div style={{textAlign:'center', marginBottom: 30}}>
                    <Title level={3} style={{color:'white', margin:0, fontWeight: 800}}>MEMBER LOGIN</Title>
                    <Text style={{color:'#64748b', fontSize: 13}}>Access your personal AI dashboard</Text>
                  </div>
                  <Form name="login" onFinish={onFinish} layout="vertical">
                    <Form.Item name="username" rules={[{ required: true }]}><Input prefix={<UserOutlined />} placeholder="Username" size="large" style={{background:'#1e293b', border:'1px solid #334155'}} /></Form.Item>
                    <Form.Item name="password" rules={[{ required: true }]}><Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" style={{background:'#1e293b', border:'1px solid #334155'}} /></Form.Item>
                    <Form.Item><Button type="primary" htmlType="submit" loading={loading} block size="large" style={{height: 50, fontWeight: 'bold', fontSize: 16}}>LOG IN NOW</Button></Form.Item>
                  </Form>
                  <div style={{textAlign:'center', marginTop: 15}}>
                    <Text style={{color:'#64748b', fontSize: 13}}>Don't have an account? </Text>
                    <a onClick={() => setIsJoinModalVisible(true)} style={{color:'#d4af37', fontWeight:'bold', marginLeft: 5, cursor:'pointer'}}>Join Now</a>
                  </div>
                </LoginCard>
              </Col>
            </Row>

            {/* 🔥 [수정됨] 하단 섹션: 왼쪽(예약자) / 오른쪽(결과테이블) */}
            <Row gutter={30} style={{marginTop: 60}}>
                {/* 1. 예약자 목록 위젯 (왼쪽 배치) */}
                <Col xs={24} md={8}>
                    <ReservationWidget>
                        <div className="header">
                            <h4><span style={{color: '#10b981'}}>●</span> LIVE RESERVATIONS</h4>
                            <Text style={{color:'#475569', fontSize:10}}>Real-time</Text>
                        </div>
                        <div className="list-container">
                            <div className="scroll-content">
                                {[...reservationData, ...reservationData].map((item, idx) => (
                                    <div key={idx} className="item">
                                        <span className="user">{item.id}</span>
                                        <span className="action">{item.action}</span>
                                        <span className="time">{item.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ReservationWidget>
                </Col>

                {/* 2. 결과 테이블 (오른쪽 배치) */}
                <Col xs={24} md={16}>
                    <ResultTableWrapper>
                        <h3><HistoryOutlined /> LIVE RECENT RESULTS</h3>
                        <Table 
                            dataSource={recentHistory} 
                            columns={columns} 
                            pagination={false} 
                            size="small" 
                            rowKey={(r) => r.created_at?.seconds || Math.random()}
                        />
                    </ResultTableWrapper>
                </Col>
            </Row>

          </div>
        </ContentWrapper>

        {/* --- [모달 영역] --- */}

        {/* 1. 회원가입 모달 */}
        <Modal title="회원가입 신청" open={isJoinModalVisible} onCancel={() => setIsJoinModalVisible(false)} footer={null}>
            <Form layout="vertical" onFinish={onJoin}>
                <Form.Item name="username" label="아이디" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item name="password" label="비밀번호" rules={[{ required: true }]}><Input.Password /></Form.Item>
                <Row gutter={10}>
                    <Col span={12}><Form.Item name="name" label="이름" rules={[{ required: true }]}><Input prefix={<IdcardOutlined />} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="phone" label="핸드폰" rules={[{ required: true }]}><Input prefix={<PhoneOutlined />} /></Form.Item></Col>
                </Row>
                <Form.Item name="code" label="가입 코드" rules={[{ required: true }]}><Input prefix={<BarcodeOutlined />} /></Form.Item>
                <Button type="primary" htmlType="submit" block>가입 신청하기</Button>
            </Form>
        </Modal>

        {/* 2. 데모 신청 모달 (View Demo) */}
        <Modal title={<span style={{color:'white'}}><SafetyCertificateOutlined /> 3시간 무료 체험 신청</span>} open={isDemoModalVisible} onCancel={() => setIsDemoModalVisible(false)} footer={null} centered>
            <p style={{color:'#94a3b8', marginBottom:20}}>
                본인 인증(휴대폰 번호) 후 즉시 이용 가능한 데모 아이디가 발급됩니다.<br/>
                데모 계정은 발급 후 3시간 뒤 자동으로 만료/차단됩니다.
            </p>
            <Form layout="vertical" onFinish={handleCreateDemo}>
                <Form.Item 
                    name="phone" 
                    label={<span style={{color:'white'}}>휴대폰 번호</span>}
                    rules={[{ required: true, message: '휴대폰 번호를 입력해주세요' }]}
                >
                    <Input placeholder="01012345678" prefix={<PhoneOutlined />} style={{background:'#0f172a', border:'1px solid #334155', color:'white'}} />
                </Form.Item>
                <Button type="primary" htmlType="submit" block style={{height:40, fontWeight:'bold', background:'#10b981', border:'none'}}>
                    인증하고 데모 아이디 발급받기
                </Button>
            </Form>
        </Modal>

        {/* 3. 데모 계정 발급 완료 모달 */}
        <Modal open={!!generatedAccount} onCancel={() => setGeneratedAccount(null)} footer={null} centered closable={false}>
            <div style={{textAlign:'center', padding: 20}}>
                <SafetyCertificateOutlined style={{fontSize: 40, color: '#10b981', marginBottom: 15}} />
                <h2 style={{color:'white', margin:0}}>데모 계정 발급 완료</h2>
                <p style={{color:'#94a3b8', margin:'10px 0 20px'}}>아래 정보를 사용하여 로그인하세요.</p>
                
                <div style={{background:'#0f172a', padding: 20, borderRadius: 8, border:'1px solid #334155', textAlign:'left'}}>
                    <div style={{marginBottom: 10, display:'flex', justifyContent:'space-between'}}>
                        <span style={{color:'#64748b'}}>아이디:</span>
                        <span style={{color:'#d4af37', fontWeight:'bold', fontSize: 18}}>{generatedAccount?.id}</span>
                    </div>
                    <div style={{marginBottom: 10, display:'flex', justifyContent:'space-between'}}>
                        <span style={{color:'#64748b'}}>비밀번호:</span>
                        <span style={{color:'#d4af37', fontWeight:'bold', fontSize: 18}}>{generatedAccount?.pw}</span>
                    </div>
                    <Divider style={{borderColor:'#334155'}} />
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                        <span style={{color:'#ef4444'}}>만료 시간:</span>
                        <span style={{color:'white'}}>{generatedAccount?.expiry} 까지</span>
                    </div>
                </div>

                <Button type="primary" block style={{marginTop: 20}} onClick={() => setGeneratedAccount(null)}>
                    확인 (로그인하러 가기)
                </Button>
            </div>
        </Modal>

        {/* 4. 이용 가이드 모달 (Global Service) */}
        <Modal 
            title={<span style={{color:'white'}}><ReadOutlined /> WhaleBet 이용 가이드</span>} 
            open={isGuideModalVisible} 
            onCancel={() => setIsGuideModalVisible(false)} 
            footer={null} 
            width={800}
            centered
        >
            <div style={{maxHeight:'60vh', overflowY:'auto', paddingRight: 5}}>
                <Alert 
                    message="Global Service" 
                    description="WhaleBet은 전 세계 어디서나 이용 가능한 AI 분석 플랫폼입니다." 
                    type="info" 
                    showIcon 
                    style={{background:'#0f172a', border:'1px solid #1e40af', marginBottom: 20}}
                />
                
                <h3 style={{color:'white', borderBottom:'1px solid #334155', paddingBottom:10}}>1. 로그인 및 대시보드 접속</h3>
                <p style={{color:'#94a3b8'}}>
                    발급받은 아이디로 로그인하면 실시간 분석 대시보드에 접속할 수 있습니다.<br/>
                    (이미지 예시 공간)
                </p>
                <div style={{width:'100%', height: 200, background:'#0f172a', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#475569', marginBottom: 30, border:'1px dashed #334155'}}>
                    [이용방법 이미지 1]
                </div>

                <h3 style={{color:'white', borderBottom:'1px solid #334155', paddingBottom:10}}>2. AI 픽 확인 및 배팅</h3>
                <p style={{color:'#94a3b8'}}>
                    실시간으로 제공되는 AI의 확률 분석을 참고하여 전략적인 배팅을 진행하세요.<br/>
                    Telegram 알림 연동을 통해 놓치지 않고 정보를 받을 수 있습니다.
                </p>
                <div style={{width:'100%', height: 200, background:'#0f172a', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#475569', marginBottom: 20, border:'1px dashed #334155'}}>
                    [이용방법 이미지 2]
                </div>
                
                <Button block onClick={() => setIsGuideModalVisible(false)}>닫기</Button>
            </div>
        </Modal>

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