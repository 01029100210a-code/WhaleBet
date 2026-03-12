import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Tag, Badge, Button, Spin, Empty } from 'antd';
import { LogoutOutlined, FireOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from './firebase'; // firebase.js에서 db 가져오기

const { Title, Text } = Typography;

// --- 스타일 정의 ---
const DashboardContainer = styled.div`
  min-height: 100vh;
  padding: 20px;
  background-color: #0b1219;
  color: #fff;
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #2a3a4d;
  padding-bottom: 15px;
`;

// 반짝이는 애니메이션 (패턴 감지 시)
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.7); border-color: #00e5ff; }
  70% { box-shadow: 0 0 0 10px rgba(0, 229, 255, 0); border-color: #00e5ff; }
  100% { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0); border-color: #2a3a4d; }
`;

const RoomCard = styled(Card)`
  background: #151e29;
  border: 1px solid #2a3a4d;
  border-radius: 8px;
  margin-bottom: 16px;
  transition: all 0.3s;
  
  // 상태별 테두리 색상 및 애니메이션
  &.status-betting {
    border-color: #ff4d4f;
    box-shadow: 0 0 15px rgba(255, 77, 79, 0.3);
  }
  &.status-waiting {
    animation: ${pulse} 2s infinite;
  }

  .ant-card-head {
    border-bottom: 1px solid #2a3a4d;
    color: #fff;
    min-height: 40px;
    padding: 0 12px;
  }
  .ant-card-body {
    padding: 12px;
  }
`;

// 원매(그림) 그리드
const RoadMapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr); // 12칸
  gap: 2px;
  margin-top: 10px;
  background: #0f1621;
  padding: 4px;
  border-radius: 4px;
`;

const Bead = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  color: #fff;
  
  &.P { background-color: #1890ff; border: 1px solid #0050b3; }
  &.B { background-color: #f5222d; border: 1px solid #a8071a; }
  &.T { background-color: #52c41a; border: 1px solid #237804; }
`;

// --- 메인 컴포넌트 ---
const Dashboard = ({ onLogout, user }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 [핵심] 파이어베이스 실시간 구독 (Real-time Listener)
  useEffect(() => {
    // rooms 컬렉션을 구독합니다.
    const q = query(collection(db, "rooms"), orderBy("updated_at", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 우선순위 정렬: 배팅중(1) -> 대기중(2) -> 나머지
      const sortedRooms = roomData.sort((a, b) => {
        const scoreA = getPriorityScore(a.phase);
        const scoreB = getPriorityScore(b.phase);
        return scoreB - scoreA; // 점수 높은 순
      });

      setRooms(sortedRooms);
      setLoading(false);
    });

    return () => unsubscribe(); // 컴포넌트 꺼질 때 구독 해제
  }, []);

  // 정렬 점수 계산 함수
  const getPriorityScore = (phase) => {
    if (phase === 'BETTING') return 3;
    if (phase === 'WAITING') return 2;
    return 1;
  };

  // 카드 상태에 따른 클래스 이름 반환
  const getCardClass = (phase) => {
    if (phase === 'BETTING') return 'status-betting';
    if (phase === 'WAITING') return 'status-waiting';
    return '';
  };

  // 픽 텍스트 변환 (P -> 플레이어)
  const renderPick = (pick, phase) => {
    if (!pick) return <Text type="secondary">-</Text>;
    const color = pick === 'P' ? '#1890ff' : '#f5222d';
    const text = pick === 'P' ? 'PLAYER' : 'BANKER';
    
    if (phase === 'IDLE') return <Text type="secondary">분석중...</Text>;

    return (
      <Tag color={color} style={{ fontSize: '14px', padding: '4px 10px', fontWeight: 'bold' }}>
        {phase === 'WAITING' ? `[대기] ${text}` : `[진입] ${text}`}
      </Tag>
    );
  };

  return (
    <DashboardContainer>
      <TopBar>
        <div>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
             WhaleBet Dashboard <Tag color="gold">VIP</Tag>
          </Title>
          <Text type="secondary">Welcome, {user?.username || 'Guest'}</Text>
        </div>
        <Button type="primary" danger icon={<LogoutOutlined />} onClick={onLogout}>
          LOGOUT
        </Button>
      </TopBar>

      {/* 로딩 중일 때 */}
      {loading && (
        <div style={{ textAlign: 'center', marginTop: 100 }}>
          <Spin size="large" />
          <p style={{ marginTop: 10, color: '#aaa' }}>실시간 데이터 연결 중...</p>
        </div>
      )}

      {/* 데이터가 없을 때 */}
      {!loading && rooms.length === 0 && (
        <Empty description={<span style={{color:'#aaa'}}>현재 활성화된 방이 없습니다. 크롤러를 켜주세요!</span>} />
      )}

      {/* 방 목록 카드 리스트 */}
      <Row gutter={[16, 16]}>
        {rooms.map((room) => (
          <Col xs={24} sm={12} md={8} lg={6} key={room.id}>
            <RoomCard 
              title={room.room_name} 
              className={getCardClass(room.phase)}
              extra={
                room.phase === 'BETTING' ? <Badge status="processing" text={<span style={{color:'#ff4d4f'}}>배팅중</span>} /> :
                room.phase === 'WAITING' ? <Badge status="warning" text={<span style={{color:'#00e5ff'}}>진입대기</span>} /> :
                <Badge status="default" text={<span style={{color:'#aaa'}}>탐색중</span>} />
              }
            >
              {/* 1. 상태 메시지 & AI 번호 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: '#fff' }}>AI-{room.ai_num || '00'}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{room.updated_at ? 'Live' : 'Offline'}</Text>
              </div>

              {/* 2. 픽 정보 (크게 보여주기) */}
              <div style={{ textAlign: 'center', margin: '15px 0' }}>
                {renderPick(room.pick, room.phase)}
                {room.phase === 'BETTING' && (
                  <div style={{ marginTop: 5, color: '#ff4d4f', fontWeight: 'bold' }}>
                    {room.step}단계 진행중 🔥
                  </div>
                )}
              </div>

              {/* 3. 그림판 (원매) */}
              <Text type="secondary" style={{ fontSize: 11 }}>Recent History</Text>
              <RoadMapGrid>
                {/* 최근 12개 결과만 보여줌 (없으면 빈칸 채우기) */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const history = room.history || [];
                  const token = history[history.length - 12 + i]; // 뒤에서부터 12개
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'center' }}>
                      {token ? <Bead className={token}>{token}</Bead> : <span style={{width:18, height:18, background:'#1f2d3d', borderRadius:'50%'}}></span>}
                    </div>
                  );
                })}
              </RoadMapGrid>
            </RoomCard>
          </Col>
        ))}
      </Row>
    </DashboardContainer>
  );
};

export default Dashboard;