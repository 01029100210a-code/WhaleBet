import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, Input, Button, message, Tag, Switch, Spin } from 'antd';
import { 
  SettingOutlined, RobotOutlined, SafetyCertificateOutlined, 
  ThunderboltOutlined, CheckCircleOutlined, BellOutlined, SendOutlined 
} from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';
import { doc, getDoc, updateDoc } from "firebase/firestore"; // 🔥 Firestore 함수 추가
import { db } from '../firebase'; // 🔥 Firebase 설정 가져오기

const { Title, Text } = Typography;

// --- ✨ 애니메이션 ---
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// --- 🎨 스타일 ---
const Container = styled.div`
  padding: 40px 20px;
  max-width: 1000px;
  margin: 0 auto;
  color: white;
  animation: ${fadeIn} 0.5s ease-out;
`;

const StyledCard = styled(Card)`
  background: #1f2937;
  border-color: #374151;
  border-radius: 16px;
  margin-bottom: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

  .ant-card-head {
    border-bottom: 1px solid #374151;
    color: white;
    font-size: 18px;
    font-weight: bold;
  }
  
  .ant-card-body {
    padding: 24px;
  }

  &:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  }
`;

const StrategyButton = styled.div`
  background: ${props => props.$active ? 'rgba(16, 185, 129, 0.1)' : '#111827'};
  border: 2px solid ${props => props.$active ? '#10b981' : '#374151'};
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  &:hover {
    border-color: ${props => props.$active ? '#10b981' : '#6b7280'};
    transform: translateY(-2px);
  }

  h3 {
    color: ${props => props.$active ? '#10b981' : 'white'};
    margin-bottom: 8px;
    font-weight: 800;
    font-size: 18px;
  }

  p {
    color: #9ca3af;
    font-size: 13px;
    margin: 0;
    line-height: 1.5;
  }
  
  .badge {
    position: absolute;
    top: 10px;
    right: 10px;
    opacity: ${props => props.$active ? 1 : 0};
    transition: opacity 0.3s;
    color: #10b981;
    font-size: 18px;
  }
`;

const TelegramSection = styled.div`
  background: linear-gradient(145deg, #1e3a8a, #1e40af);
  padding: 20px;
  border-radius: 12px;
  margin-top: 20px;
  border: 1px solid #3b82f6;

  input {
    background: #172554;
    border: 1px solid #3b82f6;
    color: white;
    height: 45px;
    border-radius: 8px;
    
    &::placeholder { color: #93c5fd; }
    &:focus { border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
  }
`;

const SaveButton = styled(Button)`
  height: 45px;
  font-weight: bold;
  font-size: 16px;
  border-radius: 8px;
  margin-top: 20px;
  width: 100%;
  background: #10b981;
  border-color: #10b981;
  
  &:hover, &:focus {
    background: #059669 !important;
    border-color: #059669 !important;
    color: white !important;
  }
`;

const DashboardTitle = styled.h1`
  font-size: 28px;
  font-weight: 900;
  margin: 0 0 5px 0;
  background: linear-gradient(to right, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 1px;
`;

const Settings = () => {
  // 1. 초기 상태: 로컬 스토리지 값으로 먼저 세팅 (빠른 렌더링)
  const [entryLevel, setEntryLevel] = useState(() => {
    return parseInt(localStorage.getItem('entryLevel')) || 1;
  });
  
  const [telegramId, setTelegramId] = useState(() => {
    return localStorage.getItem('telegramChatId') || '';
  });

  const [isBotActive, setIsBotActive] = useState(() => {
    return localStorage.getItem('isTelegramActive') === 'true';
  });

  const [loading, setLoading] = useState(true);
  
  // 현재 로그인한 사용자 아이디 가져오기
  const username = localStorage.getItem('username');

  // 🔥 [로드] 컴포넌트 마운트 시 Firebase에서 설정값 가져오기
  useEffect(() => {
    const fetchSettings = async () => {
      if (!username) {
          setLoading(false);
          return;
      }
      try {
        const docRef = doc(db, "users", username);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          // DB에 데이터가 있으면 state 업데이트
          if (data.strategyLevel) setEntryLevel(data.strategyLevel);
          if (data.telegramChatId) setTelegramId(data.telegramChatId);
          if (data.isTelegramActive !== undefined) setIsBotActive(data.isTelegramActive);

          // 로컬 스토리지도 동기화 (최신화)
          localStorage.setItem('entryLevel', data.strategyLevel || 1);
          if(data.telegramChatId) localStorage.setItem('telegramChatId', data.telegramChatId);
          localStorage.setItem('isTelegramActive', data.isTelegramActive || false);
        }
      } catch (error) {
        console.error("설정 로드 중 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [username]);

  // 단계별 전략 설명 데이터
  const strategies = [
    { level: 1, title: '1단계 진입 (공격형)', desc: '1단계 배팅부터 모든 픽을 알림받습니다. 가장 많은 배팅 기회가 있지만 리스크가 존재합니다.', icon: <ThunderboltOutlined /> },
    { level: 2, title: '2단계 진입 (밸런스)', desc: '1단계가 미당첨된 후, 2단계부터 진입합니다. 승률과 배팅 횟수의 균형이 좋습니다.', icon: <SafetyCertificateOutlined /> },
    { level: 3, title: '3단계 진입 (안정형)', desc: '2단계까지 지켜본 후, 3단계 배팅부터 진입합니다. 안전한 구간을 노립니다.', icon: <SafetyCertificateOutlined /> },
    { level: 4, title: '4단계 진입 (신중형)', desc: '3연패 구간을 확인하고 4단계부터 진입합니다. 꺾기 전략에 유용합니다.', icon: <SafetyCertificateOutlined /> },
    { level: 5, title: '5단계 진입 (초고도)', desc: '4단계까지 미당첨된 흐름을 확인 후 5단계 마틴으로 진입합니다.', icon: <SettingOutlined /> },
    { level: 6, title: '6단계 진입 (스나이퍼)', desc: '극악의 확률을 기다려 6단계 막타만 노립니다. 기회는 적지만 확실합니다.', icon: <SettingOutlined /> },
  ];

  // 🔥 [저장] 전략 설정 핸들러 (Firebase + LocalStorage)
  const handleSaveStrategy = async () => {
    if (!username) return message.error('로그인 정보가 없습니다.');

    try {
        // 1. Firebase에 저장 (백엔드 연동용)
        await updateDoc(doc(db, "users", username), {
            strategyLevel: entryLevel
        });

        // 2. LocalStorage에 저장 (프론트엔드 즉시 반영용)
        localStorage.setItem('entryLevel', entryLevel);

        message.success({
            content: `전략이 저장되었습니다! 이제 ${entryLevel}단계부터 알림이 발생합니다.`,
            icon: <CheckCircleOutlined style={{ color: '#10b981' }} />,
            style: { marginTop: '20vh' },
        });
    } catch (e) {
        console.error(e);
        message.error('설정 저장 중 오류가 발생했습니다.');
    }
  };

  // 🔥 [저장] 텔레그램 설정 핸들러 (Firebase + LocalStorage)
  const handleSaveTelegram = async () => {
    if (!username) return message.error('로그인 정보가 없습니다.');

    try {
        // 1. Firebase에 저장 (백엔드 연동용)
        await updateDoc(doc(db, "users", username), {
            telegramChatId: telegramId,
            isTelegramActive: isBotActive
        });
        
        // 2. LocalStorage에 저장
        localStorage.setItem('telegramChatId', telegramId);
        localStorage.setItem('isTelegramActive', isBotActive);
        
        if (!telegramId && isBotActive) {
            message.warning('알림을 켰지만 Chat ID가 비어있습니다.');
        } else {
            message.success({
                content: '텔레그램 설정이 서버에 저장되었습니다.',
                style: { marginTop: '20vh' },
            });
        }
    } catch (e) {
        console.error(e);
        message.error('설정 저장 실패');
    }
  };

  if (loading) return <div style={{textAlign:'center', marginTop:100}}><Spin size="large" /></div>;

  return (
    <Container>
      <div style={{ marginBottom: 30 }}>
        <DashboardTitle>STRATEGY SETTINGS</DashboardTitle>
        <Text style={{ color: '#9ca3af' }}>
          실시간 픽 알림 단계와 텔레그램 연동을 설정하세요. 설정은 즉시 대시보드에 적용됩니다.
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* --- 1. 진입 단계 설정 섹션 --- */}
        <Col xs={24} lg={16}>
          <StyledCard title={<><SettingOutlined /> 진입 단계 설정 (Entry Strategy)</>}>
            <Row gutter={[16, 16]}>
              {strategies.map((strategy) => (
                <Col xs={24} sm={12} key={strategy.level}>
                  <StrategyButton 
                    $active={entryLevel === strategy.level}
                    onClick={() => setEntryLevel(strategy.level)}
                  >
                    <CheckCircleOutlined className="badge" />
                    <div>
                      <h3>{strategy.title}</h3>
                      <p>{strategy.desc}</p>
                    </div>
                    {entryLevel === strategy.level && (
                      <Tag color="success" style={{ marginTop: 10, width: 'fit-content' }}>
                        현재 적용중
                      </Tag>
                    )}
                  </StrategyButton>
                </Col>
              ))}
            </Row>
            
            <SaveButton type="primary" onClick={handleSaveStrategy}>
              전략 적용하기 (SAVE STRATEGY)
            </SaveButton>
          </StyledCard>
        </Col>

        {/* --- 2. 텔레그램 알림 설정 섹션 --- */}
        <Col xs={24} lg={8}>
          <StyledCard title={<><RobotOutlined /> 텔레그램 알림 (Telegram)</>}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 50, color: '#3b82f6', marginBottom: 10 }}>
                <SendOutlined />
              </div>
              <Title level={4} style={{ color: 'white', margin: 0 }}>TELEGRAM BOT</Title>
              <Text style={{ color: '#9ca3af', fontSize: 12 }}>
                설정한 단계가 시작되면 텔레그램으로<br/>실시간 알림을 보내드립니다.
              </Text>
            </div>

            <TelegramSection>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <span style={{ fontWeight: 'bold', color: 'white' }}>알림 활성화</span>
                <Switch 
                  checked={isBotActive} 
                  onChange={setIsBotActive} 
                  checkedChildren="ON" 
                  unCheckedChildren="OFF" 
                />
              </div>

              <div style={{ marginBottom: 5 }}>
                <Text style={{ color: '#bfdbfe', fontSize: 12, fontWeight: 'bold' }}>YOUR CHAT ID</Text>
              </div>
              <Input 
                prefix={<BellOutlined style={{ color: '#3b82f6' }} />}
                placeholder="Chat ID 입력 (예: 123456789)" 
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
              />
              <div style={{ marginTop: 10 }}>
                <Text style={{ color: '#60a5fa', fontSize: 11 }}>
                  * Chat ID를 모른다면 텔레그램에서 <b>@userinfobot</b>을 검색하여 확인하세요.
                </Text>
              </div>
            </TelegramSection>

            <Button 
              type="primary" 
              onClick={handleSaveTelegram} 
              style={{ width: '100%', height: 45, marginTop: 20, background: '#3b82f6', borderColor: '#3b82f6', fontWeight: 'bold' }}
            >
              설정 저장 (SAVE CONFIG)
            </Button>
          </StyledCard>
        </Col>
      </Row>
    </Container>
  );
};

export default Settings;