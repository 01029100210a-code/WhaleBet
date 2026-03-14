import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Row, Col, Statistic, Card, Typography, Table, Tag, Modal, Divider, Alert, Tabs, Steps } from 'antd';
import { 
  UserOutlined, LockOutlined, TrophyOutlined, FireOutlined, AimOutlined, 
  ThunderboltOutlined, SendOutlined, GlobalOutlined, HistoryOutlined,
  IdcardOutlined, PhoneOutlined, BarcodeOutlined, ReadOutlined, SafetyCertificateOutlined, MailOutlined, KeyOutlined,
  CheckCircleOutlined, InfoCircleOutlined, RobotOutlined, SettingOutlined, DashboardOutlined, BellOutlined, StopOutlined
} from '@ant-design/icons';
import styled, { keyframes, createGlobalStyle } from 'styled-components';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, updateDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import bcrypt from 'bcryptjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Step } = Steps;

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
    box-shadow: 0 20px 50px rgba(0,0,0,0.8);
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
  /* Tabs 커스텀 */
  .ant-tabs-tab { color: #94a3b8 !important; }
  .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn { color: #d4af37 !important; text-shadow: 0 0 10px rgba(212,175,55,0.3); }
  .ant-tabs-ink-bar { background: #d4af37 !important; }
  
  /* Steps 커스텀 */
  .ant-steps-item-title { color: white !important; font-weight: bold !important; font-size: 14px !important; }
  .ant-steps-item-description { color: #94a3b8 !important; font-size: 12px !important; }
  .ant-steps-item-process .ant-steps-item-icon { background: #d4af37 !important; border-color: #d4af37 !important; }
  .ant-steps-item-wait .ant-steps-item-icon { border-color: #475569 !important; }
  .ant-steps-item-finish .ant-steps-item-icon { border-color: #10b981 !important; }
  .ant-steps-item-finish .ant-steps-item-icon > .ant-steps-icon { color: #10b981 !important; }

  /* Alert 메시지 커스텀 */
  .custom-alert .ant-alert-message { color: #1e293b !important; font-weight: 800; font-size: 15px; }
`;

const Container = styled.div` min-height: 100vh; display: flex; flex-direction: column; background: radial-gradient(circle at 50% 10%, #1e293b 0%, #0b0e14 100%); overflow-x: hidden; position: relative; `;
const Header = styled.div` padding: 20px 40px; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(11,14,20,0.8); backdrop-filter: blur(10px); z-index: 10; `;
const Logo = styled.div` font-size: 24px; font-weight: 900; color: white; span { color: #d4af37; } `;
const ContentWrapper = styled.div` flex: 1; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; z-index: 5; `;
const StatsBar = styled.div` display: flex; justify-content: center; gap: 40px; margin-bottom: 40px; flex-wrap: wrap; width: 100%; max-width: 1200px; `;
const StatItem = styled.div` text-align: center; padding: 15px 30px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; min-width: 160px; transition: all 0.3s; &:hover { border-color: #d4af37; transform: translateY(-5px); } `;
const LoginCard = styled(Card)` width: 100%; max-width: 400px; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; backdrop-filter: blur(20px); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); animation: ${glow} 3s infinite; .ant-input-affix-wrapper { background: rgba(0, 0, 0, 0.3); border-color: rgba(255, 255, 255, 0.1); color: white; padding: 12px; } input { background: transparent; color: white; } .ant-btn-primary { height: 45px; font-weight: bold; background: linear-gradient(135deg, #d4af37 0%, #f59e0b 100%); border: none; &:hover { opacity: 0.9; transform: scale(1.02); } } `;
const IntroSection = styled.div` color: white; animation: ${float} 6s ease-in-out infinite; h1 { font-size: 48px; font-weight: 900; margin-bottom: 20px; } p { font-size: 16px; color: #94a3b8; margin-bottom: 30px; } `;

const ResultTableWrapper = styled.div` width: 100%; height: 100%; min-height: 400px; background: #111827; border-radius: 12px; padding: 25px; border: 1px solid #1f293b; box-shadow: 0 10px 30px rgba(0,0,0,0.3); h3 { color: white; margin-bottom: 20px; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 8px; letter-spacing: 1px; } `;

const ReservationWidget = styled.div` width: 100%; height: 100%; min-height: 400px; background: #0f172a; border: 1px solid #1e293b; border-top: 4px solid #10b981; border-radius: 8px; padding: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #1e293b; padding-bottom: 10px; } h4 { color: #10b981; margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; display: flex; align-items: center; gap: 6px; } .list-container { height: 320px; overflow: hidden; position: relative; } .scroll-content { animation: ${scrollVertical} 40s linear infinite; } .item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 12px; font-family: 'Monaco', monospace; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.03); } .user { color: #60a5fa; } .action { color: #10b981; } .time { color: #475569; font-size: 11px; } `;

const Footer = styled.div` padding: 40px; background: #05070a; border-top: 1px solid #1e293b; text-align: center; color: #475569; font-size: 12px; `;

// 이미지 플레이스홀더 스타일
const GuideImageContainer = styled.div`
  width: 100%;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  
  img {
    width: 100%;
    height: auto;
    display: block;
    transition: transform 0.3s;
  }
  
  &:hover img { transform: scale(1.02); }
`;

const reservationData = Array.from({ length: 30 }, (_, i) => ({ id: `user${Math.floor(Math.random() * 900) + 100}***`, time: `${Math.floor(Math.random() * 59) + 1}m ago`, action: 'Reserved AI Access' }));

const Login = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm(); 
  const [loading, setLoading] = useState(false);
  
  // 모달 상태
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false); 
  const [isDemoModalVisible, setIsDemoModalVisible] = useState(false);
  const [isGuideModalVisible, setIsGuideModalVisible] = useState(false);
  const [generatedAccount, setGeneratedAccount] = useState(null);

  // 이메일 인증 관련 상태
  const [emailForDemo, setEmailForDemo] = useState('');
  const [verificationCode, setVerificationCode] = useState(''); 
  const [serverCode, setServerCode] = useState(null); 
  const [isCodeSent, setIsCodeSent] = useState(false); 

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

  // 로그인 로직
  const onFinish = async (values) => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", values.username);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) { message.error("존재하지 않는 아이디입니다."); setLoading(false); return; }
      const userData = userSnap.data();

      // 만료 체크 로직
      if (userData.expiryDate) {
        const expiry = userData.expiryDate.toDate();
        const now = new Date();
        
        if (now > expiry) {
          await updateDoc(userRef, {
            isBlocked: true,
            isTelegramActive: false, // 만료 시 텔레그램 알림 자동 차단
            blockedReason: 'Demo Expired'
          });
          
          message.error("만료된 데모 계정입니다. (텔레그램 알림도 자동 중단되었습니다)");
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
    } catch (error) { 
        console.error(error);
        message.error("로그인 오류"); 
    }
    setLoading(false);
  };

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

  // --- [이메일 인증 및 데모 생성 로직] ---
  const handleSendCode = () => {
    if (!emailForDemo || !emailForDemo.includes('@')) {
        message.error("올바른 이메일 주소를 입력해주세요.");
        return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setServerCode(code);
    setIsCodeSent(true);
    
    setTimeout(() => {
        alert(`[WhaleBet Demo System]\n\n인증번호: ${code}`);
    }, 500);
    message.success("인증번호가 발송되었습니다.");
  };

  const handleVerifyAndCreate = async () => {
    if (verificationCode !== serverCode) {
        message.error("인증번호가 일치하지 않습니다.");
        return;
    }

    try {
        const randomId = `demo${Math.floor(1000 + Math.random() * 9000)}`;
        const randomPw = Math.random().toString(36).slice(-6); 
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 3);

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(randomPw, salt);

        await setDoc(doc(db, "users", randomId), {
            username: randomId,
            password: hashedPassword,
            name: `체험고객-${randomId.slice(-4)}`,
            email: emailForDemo,
            role: 'demo',
            createdAt: Timestamp.now(),
            expiryDate: Timestamp.fromDate(expiryDate),
            isBlocked: false,
            isApproved: true,
            strategyLevel: 1,
            isTelegramActive: false
        });

        setGeneratedAccount({ id: randomId, pw: randomPw, expiry: expiryDate.toLocaleTimeString(), email: emailForDemo });
        setIsDemoModalVisible(false); 
        
        setServerCode(null);
        setIsCodeSent(false);
        setVerificationCode('');
        setEmailForDemo('');

    } catch (e) {
        console.error(e);
        message.error("데모 계정 생성 실패");
    }
  };

  // 폼 자동 입력 및 닫기
  const handleAutoFillAndClose = () => {
    if (generatedAccount) {
        form.setFieldsValue({
            username: generatedAccount.id,
            password: generatedAccount.pw
        });
        message.success("로그인 정보가 입력되었습니다.");
        setGeneratedAccount(null);
    }
  };

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
                  
                  <div style={{display:'flex', gap: 15}}>
                    <Button 
                        size="large" 
                        onClick={() => setIsDemoModalVisible(true)}
                        style={{height: 50, padding: '0 40px', fontWeight:'bold', background: 'white', color: 'black', border:'none'}}
                    >
                        View Demo (3 Hours Free)
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
                  <Form name="login" form={form} onFinish={onFinish} layout="vertical">
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

            <Row gutter={30} style={{marginTop: 60}}>
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

        {/* 회원가입 모달 */}
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

        {/* 데모 신청 모달 */}
        <Modal 
            title={<span style={{color:'white'}}><MailOutlined /> 이메일 인증 및 체험 신청</span>} 
            open={isDemoModalVisible} 
            onCancel={() => { setIsDemoModalVisible(false); setIsCodeSent(false); setVerificationCode(''); }} 
            footer={null} 
            centered
        >
            <p style={{color:'#cbd5e1', marginBottom:20, fontSize:13}}>
                사용 중인 이메일을 입력하시면 인증번호가 발송됩니다.<br/>
                인증 완료 시 3시간 동안 사용 가능한 데모 계정이 발급됩니다.
            </p>
            
            <Form layout="vertical">
                <Form.Item label={<span style={{color:'white'}}>이메일 주소</span>} style={{marginBottom: 10}}>
                    <div style={{display:'flex', gap: 10}}>
                        <Input 
                            placeholder="example@email.com" 
                            prefix={<MailOutlined />} 
                            value={emailForDemo}
                            onChange={(e) => setEmailForDemo(e.target.value)}
                            disabled={isCodeSent}
                            style={{background:'#0f172a', border:'1px solid #334155', color:'white'}} 
                        />
                        <Button 
                            onClick={handleSendCode} 
                            disabled={isCodeSent}
                            style={{background: isCodeSent ? '#334155' : '#3b82f6', color:'white', border:'none'}}
                        >
                            {isCodeSent ? '발송됨' : '인증번호 발송'}
                        </Button>
                    </div>
                </Form.Item>

                {isCodeSent && (
                    <>
                        <Form.Item label={<span style={{color:'white'}}>인증번호 입력</span>} style={{marginTop: 20}}>
                            <Input 
                                placeholder="6자리 코드 입력" 
                                prefix={<KeyOutlined />} 
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                style={{background:'#0f172a', border:'1px solid #334155', color:'white'}} 
                            />
                        </Form.Item>
                        <Button 
                            type="primary" 
                            block 
                            style={{height:45, fontWeight:'bold', background:'#10b981', border:'none', marginTop: 10}}
                            onClick={handleVerifyAndCreate}
                        >
                            인증 확인 및 데모 계정 생성
                        </Button>
                    </>
                )}
            </Form>
        </Modal>

        {/* 데모 계정 생성 완료 모달 */}
        <Modal open={!!generatedAccount} onCancel={() => setGeneratedAccount(null)} footer={null} centered closable={false}>
            <div style={{textAlign:'center', padding: 20}}>
                <SafetyCertificateOutlined style={{fontSize: 40, color: '#10b981', marginBottom: 15}} />
                <h2 style={{color:'white', margin:0}}>데모 계정 생성 완료!</h2>
                
                <Alert 
                    message="이메일 전송 완료" 
                    description={`ID와 비밀번호가 ${generatedAccount?.email}로 전송되었습니다.`}
                    type="success" 
                    showIcon 
                    style={{margin: '20px 0', textAlign:'left'}}
                />
                
                <div style={{
                    background: 'rgba(251, 191, 36, 0.1)', 
                    border: '2px solid #fbbf24', 
                    borderRadius: '8px', 
                    padding: '15px', 
                    margin: '0 0 20px 0',
                    textAlign: 'center'
                }}>
                    <Text style={{color:'#fbbf24', fontSize:16, fontWeight: 'bold'}}>
                        ⚠ 잊어버리지 않게 따로 저장해두세요!
                    </Text>
                </div>

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

                <Button type="primary" block style={{marginTop: 20, height: 45, fontSize: 15, fontWeight:'bold'}} onClick={handleAutoFillAndClose}>
                    확인 (로그인하러 가기)
                </Button>
            </div>
        </Modal>

        {/* 4. 수정된 이용 가이드 모달 */}
        <Modal 
            title={<span style={{color:'white', fontSize: 18, fontWeight:'bold'}}><ReadOutlined /> WhaleBet System Guide</span>} 
            open={isGuideModalVisible} 
            onCancel={() => setIsGuideModalVisible(false)} 
            footer={null} 
            width={850}
            centered
        >
            <Tabs defaultActiveKey="1" style={{color: 'white'}}>
                {/* 탭 1: 대시보드 및 집계 현황 */}
                <TabPane tab={<span><DashboardOutlined /> 대시보드</span>} key="1">
                    <div style={{padding: '10px 0'}}>
                        <h3 style={{color:'#d4af37', fontSize: 16, marginBottom: 15}}>1. 상단 집계 현황 (Stats Bar)</h3>
                        <p style={{color:'#cbd5e1', fontSize: 13, marginBottom: 15}}>
                            메인 화면 최상단에는 당일 AI 예측 성과가 실시간으로 집계됩니다.
                        </p>
                        
                        <Row gutter={[10, 10]} style={{marginBottom: 20}}>
                            <Col span={6}>
                                <div style={{background: '#111827', padding: 10, borderRadius: 6, textAlign:'center', border:'1px solid #1f2937'}}>
                                    <div style={{color:'#10b981', fontWeight:'bold'}}>WIN RATE</div>
                                    <div style={{color:'#64748b', fontSize:11}}>금일 적중 확률</div>
                                </div>
                            </Col>
                            <Col span={6}>
                                <div style={{background: '#111827', padding: 10, borderRadius: 6, textAlign:'center', border:'1px solid #1f2937'}}>
                                    <div style={{color:'#d4af37', fontWeight:'bold'}}>TOTAL SCORE</div>
                                    <div style={{color:'#64748b', fontSize:11}}>누적 수익 포인트</div>
                                </div>
                            </Col>
                            <Col span={6}>
                                <div style={{background: '#111827', padding: 10, borderRadius: 6, textAlign:'center', border:'1px solid #1f2937'}}>
                                    <div style={{color:'#f59e0b', fontWeight:'bold'}}>STREAK</div>
                                    {/* 수정된 부분: 텍스트 변경 및 가독성 개선 */}
                                    <div style={{color:'#94a3b8', fontSize:11, fontWeight:'bold'}}>4단계 이내 승리 연승</div>
                                </div>
                            </Col>
                            <Col span={6}>
                                <div style={{background: '#111827', padding: 10, borderRadius: 6, textAlign:'center', border:'1px solid #1f2937'}}>
                                    <div style={{color:'#3b82f6', fontWeight:'bold'}}>SAFETY</div>
                                    {/* 수정된 부분: 텍스트 변경 및 가독성 개선 */}
                                    <div style={{color:'#94a3b8', fontSize:11, fontWeight:'bold'}}>3~6단계 연승 횟수</div>
                                </div>
                            </Col>
                        </Row>

                        <h3 style={{color:'#d4af37', fontSize: 16, marginBottom: 15}}>2. 메인 대시보드 화면</h3>
                        <GuideImageContainer>
                            {/* 첨부하신 사진 파일명을 dashboard_guide.png 로 public 폴더에 넣어주세요 */}
                            <img src="/dashboard_guide.png" alt="Dashboard Preview" />
                        </GuideImageContainer>
                        <div style={{background:'rgba(255,255,255,0.05)', padding:15, borderRadius:8, fontSize:13, color:'#cbd5e1', lineHeight:1.6}}>
                            <b style={{color:'white'}}>● Waiting Zone:</b> 현재 AI가 실시간으로 패턴을 분석 중인 테이블 목록입니다.<br/>
                            <b style={{color:'white'}}>● Live Result:</b> 최근 분석 결과와 승패 여부를 보여줍니다.
                        </div>
                    </div>
                </TabPane>

                {/* 탭 2: AI 로직 및 알림 프로세스 */}
                <TabPane tab={<span><RobotOutlined /> AI 로직 & 알림</span>} key="2">
                    <div style={{padding: '10px 0'}}>
                        <Alert 
                            className="custom-alert"
                            message="AI 패턴 분석 프로세스" 
                            description={
                                <div style={{marginTop: 5, color: 'white', fontWeight: 'bold'}}>
                                    AI는 3단계에 걸쳐 정밀하게 배팅 시점을 포착하고 <span style={{borderBottom: '3px solid #ef4444'}}>알림을 전송합니다.</span>
                                </div>
                            }
                            type="info" 
                            showIcon 
                            style={{background:'#172554', border:'1px solid #1e3a8a', marginBottom: 25}}
                        />

                        <Steps direction="vertical" current={-1}>
                            <Step 
                                title="1단계: 실시간 패턴 감지 (Pattern Detection)" 
                                description="수천 개의 슈(Shoe) 데이터를 실시간으로 스캔하여 승률이 높은 특정 패턴을 찾아냅니다. (모든 단계 공통)" 
                                icon={<DashboardOutlined />}
                            />
                            <Step 
                                title="2단계: 배팅 시작 알림 (Betting Alert)" 
                                description={
                                    <div style={{marginTop: 5}}>
                                        <div style={{color:'#cbd5e1', marginBottom: 5}}>사용자가 설정한 <span style={{color:'#d4af37', fontWeight:'bold'}}>전략 단계(Level)</span>에 따라 알림이 다르게 전송됩니다.</div>
                                        <div style={{display:'flex', gap: 10, marginTop: 8}}>
                                            <Tag color="green">Level 1: 모든 공격적 패턴 알림</Tag>
                                            <Tag color="orange">Level 4: 3연패 후 안전 진입 알림</Tag>
                                        </div>
                                    </div>
                                }
                                icon={<BellOutlined />} 
                            />
                            <Step 
                                title="3단계: 결과 처리 및 검증 (Result Verification)" 
                                description="게임 결과가 나오면 즉시 승/패를 판독하여 대시보드에 반영하고, 텔레그램으로 결과를 리포트합니다." 
                                icon={<CheckCircleOutlined />} 
                            />
                        </Steps>
                    </div>
                </TabPane>

                {/* 탭 3: 텔레그램 연동 및 주의사항 */}
                <TabPane tab={<span><SendOutlined /> 텔레그램 연동</span>} key="3">
                    <div style={{padding: '10px 0'}}>
                        <h3 style={{color:'#d4af37', fontSize: 16, marginBottom: 15}}>텔레그램 봇 연동 방법</h3>
                        
                        <div style={{background:'#1e3a8a', padding: '20px', borderRadius: 8, color:'white', border:'1px solid #2563eb', marginBottom: 25}}>
                            <div style={{display:'flex', gap: 15, alignItems:'flex-start', marginBottom: 15}}>
                                <div style={{background:'#3b82f6', minWidth:24, height:24, borderRadius:'50%', textAlign:'center', fontWeight:'bold', lineHeight:'24px'}}>1</div>
                                <div>
                                    <div style={{fontWeight:'bold', fontSize:14}}>Chat ID 확인</div>
                                    <div style={{fontSize:12, color:'#bfdbfe'}}>텔레그램에서 <Tag color="blue">@userinfobot</Tag>을 검색 후 실행하여 ID 숫자 확인</div>
                                </div>
                            </div>
                            <div style={{display:'flex', gap: 15, alignItems:'flex-start', marginBottom: 15}}>
                                <div style={{background:'#3b82f6', minWidth:24, height:24, borderRadius:'50%', textAlign:'center', fontWeight:'bold', lineHeight:'24px'}}>2</div>
                                <div>
                                    <div style={{fontWeight:'bold', fontSize:14}}>설정 페이지 입력</div>
                                    <div style={{fontSize:12, color:'#bfdbfe'}}>로그인 후 [전략 설정] 페이지 하단에 ID 입력 및 스위치 ON</div>
                                </div>
                            </div>
                            <div style={{display:'flex', gap: 15, alignItems:'flex-start'}}>
                                <div style={{background:'#3b82f6', minWidth:24, height:24, borderRadius:'50%', textAlign:'center', fontWeight:'bold', lineHeight:'24px'}}>3</div>
                                <div>
                                    <div style={{fontWeight:'bold', fontSize:14}}>알림 수신 시작</div>
                                    <div style={{fontSize:12, color:'#bfdbfe'}}>이제 설정된 단계의 픽이 발생하면 즉시 메시지가 도착합니다.</div>
                                </div>
                            </div>
                        </div>

                        <Divider style={{borderColor:'#334155'}} />

                        <h3 style={{color:'#ef4444', fontSize: 16, marginBottom: 15, display:'flex', alignItems:'center', gap:8}}>
                            <StopOutlined /> 데모 계정 주의사항
                        </h3>
                        <div style={{background:'rgba(239, 68, 68, 0.1)', border:'1px solid #ef4444', borderRadius:8, padding:15}}>
                            <p style={{color:'#fca5a5', margin:0, fontSize:13, lineHeight:1.6}}>
                                <b>3시간 무료 체험</b> 시간이 종료되면 자동으로 계정이 만료됩니다.<br/>
                                만료 시 <u style={{fontWeight:'bold'}}>텔레그램 알림도 즉시 중단(차단)</u>되며, 더 이상 로그인할 수 없습니다.<br/>
                                지속적인 이용을 원하시면 정식 회원가입을 진행해주세요.
                            </p>
                        </div>
                    </div>
                </TabPane>
            </Tabs>
            
            <div style={{textAlign:'center', marginTop: 25}}>
                <Button type="primary" onClick={() => setIsGuideModalVisible(false)} style={{width: 150, fontWeight:'bold'}}>
                    닫기 (Close)
                </Button>
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