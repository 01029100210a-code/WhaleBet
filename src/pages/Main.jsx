import React, { useEffect, useState } from 'react';
import { Button, message, Modal, Card, Row, Col } from 'antd';
import { LogoutOutlined, PlayCircleOutlined, TrophyOutlined, SettingOutlined } from '@ant-design/icons';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '../firebase'; 
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

// --- 🎨 스타일 (대시보드 디자인) ---
const Container = styled.div`
  padding: 40px;
  background-color: #111827;
  min-height: 100vh;
  color: white;
  font-family: 'Noto Sans KR', sans-serif;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 50px;
  
  h1 {
    color: #d4af37;
    font-size: 32px;
    font-weight: 900;
    margin: 0;
  }
`;

const StatCard = styled.div`
  background: #1f2937;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #374151;
  margin-bottom: 20px;
  h3 { color: #9ca3af; margin: 0; }
  p { font-size: 24px; font-weight: bold; color: white; margin: 5px 0 0 0; }
`;

const ActionCard = styled(Card)`
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 16px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-5px);
    border-color: #d4af37;
    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
  }

  .icon {
    font-size: 40px;
    color: #d4af37;
    margin-bottom: 15px;
  }
  
  h3 { color: white; font-size: 18px; margin: 0; }
`;

const Main = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  
  const myUsername = localStorage.getItem('username');
  const mySessionId = localStorage.getItem('sessionId');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // ★ 보안 및 실시간 데이터 로드
  useEffect(() => {
    if (!myUsername || !mySessionId) {
      handleLogout();
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", myUsername), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setUserData(data);

        // 1. 차단 감지
        if (data.isBlocked) {
          Modal.error({
            title: '접속 차단됨',
            content: '관리자에 의해 접속이 차단되었습니다.',
            onOk: handleLogout,
            keyboard: false, maskClosable: false
          });
          return;
        }

        // 2. 이중 접속 감지
        if (data.currentSessionId !== mySessionId) {
          Modal.warning({
            title: '중복 로그인 감지',
            content: '다른 기기에서 로그인이 감지되어 접속을 종료합니다.',
            onOk: handleLogout,
            keyboard: false, maskClosable: false
          });
        }
      } else {
        handleLogout();
      }
    });

    return () => unsubscribe();
  }, [myUsername, mySessionId, navigate]);

  return (
    <Container>
      <Header>
        <h1>WHALEBET DASHBOARD</h1>
        <Button 
          danger 
          type="primary" 
          icon={<LogoutOutlined />} 
          onClick={handleLogout}
        >
          로그아웃
        </Button>
      </Header>

      {/* 상단 정보 카드 */}
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <StatCard>
            <h3>WELCOME</h3>
            <p>{myUsername} 님</p>
          </StatCard>
        </Col>
        <Col span={8}>
          <StatCard>
            <h3>MY LEVEL</h3>
            <p style={{color: '#d4af37'}}>{userData ? `${userData.entryLevel} 단계` : 'Loading...'}</p>
          </StatCard>
        </Col>
        <Col span={8}>
          <StatCard>
            <h3>STATUS</h3>
            <p style={{color: '#10b981'}}>● Online</p>
          </StatCard>
        </Col>
      </Row>

      {/* 메인 메뉴 버튼들 */}
      <h2 style={{color:'white', marginTop:'40px', marginBottom: '20px'}}>GAME MENU</h2>
      <Row gutter={[24, 24]}>
        <Col span={8}>
          <ActionCard bordered={false} onClick={() => message.info('게임 준비중입니다!')}>
            <div className="icon"><PlayCircleOutlined /></div>
            <h3>룰렛 게임 시작</h3>
          </ActionCard>
        </Col>
        <Col span={8}>
          <ActionCard bordered={false} onClick={() => message.info('픽 정보 준비중입니다!')}>
            <div className="icon"><TrophyOutlined /></div>
            <h3>실시간 픽</h3>
          </ActionCard>
        </Col>
        <Col span={8}>
          <ActionCard bordered={false} onClick={() => message.info('설정 준비중입니다!')}>
            <div className="icon"><SettingOutlined /></div>
            <h3>마이 페이지</h3>
          </ActionCard>
        </Col>
      </Row>
    </Container>
  );
};

export default Main;