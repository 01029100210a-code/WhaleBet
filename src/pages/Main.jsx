import React, { useEffect, useState } from 'react';
import { Button, message, Modal, Row, Col, Card, Tag } from 'antd';
import { 
  LogoutOutlined, SettingOutlined, TrophyOutlined, 
  PlayCircleOutlined, DashboardOutlined 
} from '@ant-design/icons';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '../firebase'; 
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  padding: 30px; background-color: #111827; min-height: 100vh; color: white;
`;
const Header = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;
  h1 { color: #d4af37; font-weight: 900; margin: 0; font-size: 24px; }
`;
const InfoSection = styled.div`
  background: #1f2937; padding: 20px; border-radius: 12px; margin-bottom: 30px;
  display: flex; justify-content: space-around; align-items: center;
  border: 1px solid #374151;
  .item { text-align: center; }
  .label { color: #9ca3af; font-size: 12px; margin-bottom: 5px; }
  .value { font-size: 18px; font-weight: bold; color: white; }
  .gold { color: #d4af37; }
`;
const MenuCard = styled(Card)`
  background: #1f2937; border: 1px solid #374151; border-radius: 12px; text-align: center; cursor: pointer; transition: 0.3s;
  &:hover { border-color: #d4af37; transform: translateY(-5px); }
  .icon { font-size: 32px; color: #d4af37; margin-bottom: 10px; }
  .title { color: white; font-weight: bold; font-size: 16px; }
`;
const AdminButtonArea = styled.div`
  margin-top: 50px; padding-top: 20px; border-top: 1px solid #374151; text-align: center;
`;

const Main = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  
  const myUsername = localStorage.getItem('username');
  const mySessionId = localStorage.getItem('sessionId');

  // 관리자 권한 목록 (이 안에 포함되면 관리자 버튼 보임)
  const managerRoles = ['super_admin', 'distributor', 'store'];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

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
          Modal.warning({ title: '중복 로그인', content: '다른 기기 접속 감지.', onOk: handleLogout });
        }
      } else { handleLogout(); }
    });
    return () => unsub();
  }, [myUsername, mySessionId, navigate]);

  return (
    <Container>
      <Header>
        <h1>WHALEBET</h1>
        <Button danger type="text" icon={<LogoutOutlined />} onClick={handleLogout} style={{color:'#ef4444'}}>로그아웃</Button>
      </Header>

      {/* 1. 상단 정보창 */}
      <InfoSection>
        <div className="item">
          <div className="label">아이디</div>
          <div className="value">{myUsername}</div>
        </div>
        <div className="item">
          <div className="label">내 권한</div>
          <div className="value">
            {userData?.role === 'super_admin' && <Tag color="gold">최고관리자</Tag>}
            {userData?.role === 'distributor' && <Tag color="magenta">총판</Tag>}
            {userData?.role === 'store' && <Tag color="cyan">매장</Tag>}
            {userData?.role === 'user' && <Tag color="blue">유저</Tag>}
          </div>
        </div>
        <div className="item">
          <div className="label">보유 머니</div>
          <div className="value gold">₩ 0</div>
        </div>
      </InfoSection>

      {/* 2. 대시보드 메뉴 (모두에게 보임) */}
      <h3 style={{color:'white', marginBottom:15}}>GAME MENU</h3>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <MenuCard bordered={false} onClick={() => message.info("준비중")}>
            <div className="icon"><PlayCircleOutlined /></div>
            <div className="title">룰렛 게임</div>
          </MenuCard>
        </Col>
        <Col span={8}>
          <MenuCard bordered={false} onClick={() => message.info("준비중")}>
            <div className="icon"><TrophyOutlined /></div>
            <div className="title">실시간 픽</div>
          </MenuCard>
        </Col>
        <Col span={8}>
          <MenuCard bordered={false} onClick={() => message.info("준비중")}>
            <div className="icon"><SettingOutlined /></div>
            <div className="title">마이페이지</div>
          </MenuCard>
        </Col>
      </Row>

      {/* 3. 관리자 메뉴 (권한 있는 사람만 보임) */}
      {userData && managerRoles.includes(userData.role) && (
        <AdminButtonArea>
          <h3 style={{color:'#9ca3af', fontSize:14, marginBottom:15}}>ADMINISTRATION</h3>
          <Button 
            type="primary" 
            size="large" 
            block 
            icon={<DashboardOutlined />}
            onClick={() => navigate('/admin')}
            style={{ height: 50, background: '#d4af37', borderColor: '#d4af37', fontWeight: 'bold', fontSize: 16 }}
          >
            관리자 페이지 접속
          </Button>
        </AdminButtonArea>
      )}
    </Container>
  );
};

export default Main;