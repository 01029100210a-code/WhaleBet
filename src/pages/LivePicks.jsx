import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Spin, Empty, Tag, Statistic, Progress, Table, Typography } from 'antd';
import { 
  TrophyOutlined, ThunderboltOutlined, ScanOutlined, FireOutlined, 
  AimOutlined, HistoryOutlined, SoundOutlined, MutedOutlined 
} from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from '../firebase';

const { Text } = Typography;

// --- 🎵 사운드 파일 ---
const TENSION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3"; 
const FANFARE_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3";

// --- ✨ 애니메이션 ---
const pulseGold = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4); border-color: #d4af37; }
  70% { box-shadow: 0 0 0 10px rgba(212, 175, 55, 0); border-color: #ffd700; }
  100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); border-color: #374151; }
`;

const pulseRed = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); border-color: #ef4444; }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); border-color: #ef4444; }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: #374151; }
`;

const scanMove = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// --- 🎨 스타일 ---
const Container = styled.div`
  padding: 20px;
  color: white;
  max-width: 1400px;
  margin: 0 auto;
`;

const HeaderContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 25px;
  gap: 15px;
`;

const DashboardTitle = styled.h1`
  font-size: 24px;
  font-weight: 900;
  margin: 0;
  background: linear-gradient(to right, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 1px;
`;

const SoundToggleBtn = styled.button`
  background: ${props => props.active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
  border: 1px solid ${props => props.active ? '#10b981' : '#ef4444'};
  color: ${props => props.active ? '#10b981' : '#ef4444'};
  padding: 5px 12px;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: bold;
  transition: all 0.3s ease;
  outline: none;

  &:hover {
    background: ${props => props.active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'};
  }
  animation: ${props => !props.active ? pulseRed : 'none'} 2s infinite;
`;

const HistoryPanel = styled.div`
  background: linear-gradient(145deg, #1f2937, #111827);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 30px;
  border: 1px solid #374151;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 20px;
  }
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  
  h2 {
    margin: 0;
    color: white;
    font-size: 20px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .icon { font-size: 20px; margin-right: 10px; }
  &.gold { color: #d4af37; h2 { text-shadow: 0 0 10px rgba(212, 175, 55, 0.3); } }
  &.red { color: #ef4444; h2 { text-shadow: 0 0 10px rgba(239, 68, 68, 0.3); } }
`;

const GameCard = styled.div`
  background-color: #1f2937;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 220px; 
  border: 1px solid #4b5563;
  position: relative;
  transition: transform 0.3s ease;

  &:hover { transform: translateY(-5px); }

  &.waiting {
    border-color: #d4af37;
    background: linear-gradient(145deg, #1f2937 0%, #292524 100%);
  }
  
  /* 진입 임박 시 깜빡임 */
  &.imminent {
    animation: ${pulseGold} 1.5s infinite;
    border-width: 2px;
  }

  &.betting {
    border-color: #ef4444;
    animation: ${pulseRed} 1.5s infinite;
    background: linear-gradient(145deg, #1f2937 0%, #450a0a 100%);
  }
`;

// [NEW] 카운트다운 박스 스타일 (고정된 디자인)
const CountBox = styled.div`
  border: 1px solid #d4af37;
  background: rgba(212, 175, 55, 0.05);
  border-radius: 12px;
  padding: 10px;
  text-align: center;
  margin: 10px 0;
`;

const CountNumber = styled.div`
  font-size: 42px;
  font-weight: 800;
  color: #fbbf24;
  line-height: 1;
  text-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
  margin-top: 5px;
`;

const PickDisplay = styled.div`
  font-size: 34px;
  font-weight: 900;
  letter-spacing: -1px;
  text-align: center;
  margin: 10px 0;
  line-height: 1.2;
  
  &.P { color: #3b82f6; text-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
  &.B { color: #ef4444; text-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
`;

const ScanZone = styled.div`
  background: #000;
  border: 1px dashed #374151;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  margin-top: 30px;
  opacity: 0.6;

  .scan-bar {
    height: 2px;
    width: 100%;
    background: linear-gradient(90deg, transparent, #00e5ff, transparent);
    background-size: 200% 100%;
    animation: ${scanMove} 2s linear infinite;
    margin-bottom: 10px;
  }
`;

const DarkTable = styled(Table)`
  .ant-table { background: transparent; color: #d1d5db; }
  .ant-table-thead > tr > th { background: #1f2937 !important; color: #9ca3af !important; border-bottom: 1px solid #374151 !important; }
  .ant-table-tbody > tr > td { border-bottom: 1px solid #1f2937 !important; color: #e5e7eb !important; }
  .ant-table-tbody > tr:hover > td { background: #111827 !important; }
  .ant-pagination-item-link, .ant-pagination-item { background: transparent !important; border-color: #374151 !important; a { color: #9ca3af !important; } }
  .ant-pagination-item-active { border-color: #d4af37 !important; a { color: #d4af37 !important; } }
`;

const LivePicks = () => {
  const [waitingRooms, setWaitingRooms] = useState([]);
  const [bettingRooms, setBettingRooms] = useState([]);
  const [idleCount, setIdleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);

  const [stats, setStats] = useState({
    totalScore: 0, totalGames: 0, winRate: 0, safeHitCount: 0, currentStreak: 0, history: []
  });

  const userEntryLevel = parseInt(localStorage.getItem('entryLevel')) || 1; 

  const tensionAudioRef = useRef(new Audio(TENSION_SOUND_URL));
  const fanfareAudioRef = useRef(new Audio(FANFARE_SOUND_URL));
  const isFirstLoad = useRef(true);

  useEffect(() => {
    tensionAudioRef.current.volume = 0.5;
    fanfareAudioRef.current.volume = 0.7;
  }, []);

  const toggleSound = () => {
    if (!isSoundEnabled) {
      tensionAudioRef.current.play().then(() => {
        tensionAudioRef.current.pause(); tensionAudioRef.current.currentTime = 0;
      }).catch(() => {});
      fanfareAudioRef.current.play().then(() => {
        fanfareAudioRef.current.pause(); fanfareAudioRef.current.currentTime = 0;
      }).catch(() => {});
      setIsSoundEnabled(true);
    } else {
      setIsSoundEnabled(false);
      tensionAudioRef.current.pause();
      fanfareAudioRef.current.pause();
    }
  };

  useEffect(() => {
    let intervalId = null;
    if (isSoundEnabled && bettingRooms.length > 0) {
      const playTension = () => {
        if (tensionAudioRef.current.paused) {
          tensionAudioRef.current.currentTime = 0;
          tensionAudioRef.current.play().catch(e => console.log("Sound Blocked:", e));
        }
      };
      playTension();
      intervalId = setInterval(playTension, 3000);
    } else {
      if(intervalId) clearInterval(intervalId);
      tensionAudioRef.current.pause();
      tensionAudioRef.current.currentTime = 0;
    }
    return () => {
      if(intervalId) clearInterval(intervalId);
      tensionAudioRef.current.pause();
    };
  }, [bettingRooms.length, isSoundEnabled]);

  useEffect(() => {
    const q = query(collection(db, "rooms"), orderBy("updated_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const waiting = roomData.filter(r => r.phase === 'WAITING');
      const betting = roomData.filter(r => r.phase === 'BETTING' && r.step >= userEntryLevel);
      const idle = roomData.length - waiting.length - betting.length;
      
      betting.sort((a, b) => b.step - a.step);

      setWaitingRooms(waiting);
      setBettingRooms(betting);
      setIdleCount(idle);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userEntryLevel]);

  useEffect(() => {
    const q = query(collection(db, "game_history"), orderBy("created_at", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isFirstLoad.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            if (isSoundEnabled && data.result === 'WIN') {
                fanfareAudioRef.current.currentTime = 0;
                fanfareAudioRef.current.play().catch(() => {});
            }
          }
        });
      } else {
        isFirstLoad.current = false;
      }

      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let winCount = 0, totalStepScore = 0, safeHitCount = 0;
      historyData.forEach(item => {
          if (item.result === 'WIN') {
              winCount++; totalStepScore += item.step; 
              if (item.step <= 4) safeHitCount++; 
          }
      });

      let streak = 0;
      for (let i = 0; i < historyData.length; i++) {
          if (historyData[i].result === 'WIN' && historyData[i].step <= 4) streak++;
          else break;
      }
      
      setStats({
        totalScore: totalStepScore, totalGames: historyData.length,
        winRate: historyData.length > 0 ? Math.round((winCount / historyData.length) * 100) : 0,
        safeHitCount, currentStreak: streak, history: historyData
      });
    });
    return () => unsubscribe();
  }, [isSoundEnabled]);

  const columns = [
    { title: 'Time', dataIndex: 'created_at', key: 'time', render: (ts) => <span style={{color:'#9ca3af'}}>{ts ? new Date(ts.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span> },
    { title: 'Room', dataIndex: 'room_name', key: 'room', render: (text) => <span style={{color:'white', fontWeight:'bold'}}>{text}</span> },
    { title: 'Pick', dataIndex: 'pick', key: 'pick', align: 'center', render: (pick) => <span style={{fontWeight:'bold', color: pick === 'P' ? '#3b82f6' : '#ef4444'}}>{pick === 'P' ? 'PLAYER' : 'BANKER'}</span> },
    { title: 'Result', dataIndex: 'result', key: 'result', align: 'center', render: (res) => <Tag color={res === 'WIN' ? 'success' : 'error'}>{res}</Tag> },
    { title: 'Step', dataIndex: 'step', key: 'step', align: 'right', render: (step) => <span style={{color: step <= 4 ? '#d4af37' : '#ef4444'}}>{step}단계</span> }
  ];

  if (loading) return <Spin size="large" style={{display:'block', margin:'100px auto'}} />;

  return (
    <Container>
      
      {/* 🔹 헤더 */}
      <HeaderContainer>
        <DashboardTitle>WHALEBET DASHBOARD</DashboardTitle>
        <SoundToggleBtn onClick={toggleSound} active={isSoundEnabled}>
          {isSoundEnabled ? <SoundOutlined /> : <MutedOutlined />}
          {isSoundEnabled ? 'SOUND ON' : 'SOUND OFF'}
        </SoundToggleBtn>
      </HeaderContainer>

      {/* 1. 통계 */}
      <HistoryPanel>
        <div style={{textAlign:'center'}}>
            <div style={{color:'#9ca3af', marginBottom: 5, fontSize:12}}>TOTAL WIN RATE</div>
            <Progress type="circle" percent={stats.winRate} width={80} strokeColor="#10b981" trailColor="#374151" format={percent => <span style={{color:'white', fontWeight:'bold'}}>{percent}%</span>} />
        </div>
        <div style={{textAlign:'center', borderLeft:'1px solid #374151', paddingLeft: 30}}>
            <Statistic title={<span style={{color:'#9ca3af', fontSize:12}}>TOTAL WINS</span>} value={stats.totalScore} valueStyle={{ color: '#d4af37', fontWeight:'bold', fontSize: 24 }} prefix={<TrophyOutlined />} suffix={<span style={{fontSize:12, color:'#6b7280', marginLeft: 5}}>pts</span>} />
        </div>
        <div style={{textAlign:'center', borderLeft:'1px solid #374151', paddingLeft: 30}}>
            <Statistic title={<span style={{color:'#9ca3af', fontSize:12}}>STREAK</span>} value={stats.currentStreak} valueStyle={{ color: '#ef4444', fontWeight:'bold', fontSize: 24 }} prefix={<FireOutlined />} />
        </div>
        <div style={{textAlign:'center', borderLeft:'1px solid #374151', paddingLeft: 30}}>
             <div style={{color:'#9ca3af', fontSize:12, marginBottom:5}}>SAFETY HIT</div>
             <div style={{fontSize: 24, fontWeight:'bold', color: '#3b82f6'}}><AimOutlined style={{marginRight: 8}} />{stats.safeHitCount}</div>
        </div>
      </HistoryPanel>

      {/* 2. 🔥 Waiting Zone (수정됨: 슬라이더 완전 제거) */}
      <div style={{marginBottom: 30}}>
          <SectionTitle className="gold">
            <ThunderboltOutlined className="icon" />
            <h2>Waiting Zone</h2>
          </SectionTitle>
          
          {waitingRooms.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{color:'#6b7280'}}>패턴 탐색 중...</span>} />
          ) : (
            <Row gutter={[20, 20]} justify="center">
                {waitingRooms.map((room) => {
                    // 남은 횟수 체크 (없으면 기본값 10)
                    const remaining = room.remaining !== undefined ? room.remaining : 10;
                    const isCountdown = remaining <= 3; // 3판 이하일 때만 카운트다운

                    return (
                        <Col xs={24} sm={12} md={8} lg={6} xl={6} key={room.id}>
                            <GameCard className={`waiting ${isCountdown ? 'imminent' : ''}`}>
                                <div style={{color:'white', fontWeight:'bold', fontSize: 16, marginBottom: 10}}>
                                    {room.room_name}
                                </div>

                                {/* [조건부 렌더링] 3판 이하일 때 vs 아닐 때 */}
                                {isCountdown ? (
                                    // 3, 2, 1 카운트다운 화면 (슬라이드 아님!)
                                    <div style={{textAlign:'center'}}>
                                        <CountBox>
                                            <Text style={{color:'#9ca3af', fontSize:10, letterSpacing:2}}>CHECKING</Text>
                                            <CountNumber>{remaining}</CountNumber>
                                        </CountBox>
                                        <div style={{marginTop: 10}}>
                                            <Text style={{color:'#9ca3af', fontSize:10}}>ENTRY PREPARE</Text>
                                            <PickDisplay className={room.pick}>
                                                {room.pick === 'P' ? 'PLAYER' : 'BANKER'}
                                            </PickDisplay>
                                        </div>
                                    </div>
                                ) : (
                                    // 일반 분석중 화면 (Deep Learning Scan)
                                    <div style={{textAlign:'center', padding: '20px 0'}}>
                                        <ScanOutlined spin style={{ fontSize: 40, color: '#4b5563', marginBottom: 15 }} />
                                        <Text style={{ display: 'block', color: '#6b7280', fontSize: 14, fontWeight: 'bold' }}>
                                            패턴 정밀 분석중
                                        </Text>
                                        <Text style={{ display: 'block', color: '#4b5563', fontSize: 12, marginTop: 5 }}>
                                            데이터 수집 단계
                                        </Text>
                                    </div>
                                )}

                                <div style={{display:'flex', justifyContent:'space-between', marginTop:'auto', paddingTop: 15, borderTop:'1px solid #374151'}}>
                                    <span style={{color:'#10b981', fontSize:12}}>
                                        <ScanOutlined /> AI-{room.ai_num}
                                    </span>
                                    {isCountdown ? (
                                        <Tag color="gold" style={{fontWeight:'bold'}}>진입 임박</Tag>
                                    ) : (
                                        <Tag color="default">분석중</Tag>
                                    )}
                                </div>
                            </GameCard>
                        </Col>
                    );
                })}
            </Row>
          )}
      </div>

      {/* 3. 진행 (Betting) - 유지 */}
      <div style={{marginBottom: 30}}>
          <SectionTitle className="red">
            <FireOutlined className="icon" />
            <h2>Active Betting</h2>
          </SectionTitle>
          {bettingRooms.length === 0 ? (
             <div style={{textAlign:'center', color:'#4b5563', padding: 20}}>현재 진행 중인 배팅이 없습니다.</div>
          ) : (
            <Row gutter={[20, 20]} justify="center">
                {bettingRooms.map((room) => (
                <Col xs={24} sm={12} md={8} lg={6} xl={6} key={room.id}>
                    <GameCard className="betting">
                        <div style={{color:'white', fontWeight:'bold', fontSize: 15}}>{room.room_name}</div>
                        <div style={{textAlign:'center'}}>
                            <div style={{fontSize:10, color:'#ef4444', marginBottom: 5}}>
                                <SoundOutlined spin /> BETTING LIVE
                            </div>
                            <PickDisplay className={room.pick}>{room.pick === 'P' ? 'PLAYER' : 'BANKER'}</PickDisplay>
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between', marginTop:'auto'}}>
                            <span style={{color:'#10b981', fontSize:12}}><ScanOutlined /> AI-{room.ai_num}</span>
                            <Tag color="#f50">{room.step}단계 진행 🔥</Tag>
                        </div>
                    </GameCard>
                </Col>
                ))}
            </Row>
          )}
      </div>

      {/* 4. 히스토리 & 5. AI Scan */}
      <div style={{marginBottom: 30, background: '#111827', padding: 20, borderRadius: 16, border: '1px solid #374151'}}>
        <h3 style={{color:'white', marginBottom: 15}}><HistoryOutlined /> Recent Results</h3>
        <DarkTable 
            dataSource={stats.history} 
            columns={columns} 
            pagination={{ pageSize: 5, position: ['bottomCenter'] }} 
            rowKey="id"
            size="middle"
        />
      </div>

      <ScanZone>
        <div className="scan-bar"></div>
        <ScanOutlined style={{ fontSize: 32, color: '#00e5ff', marginBottom: 15 }} spin />
        <h3 style={{ color: '#fff', margin: 0 }}>AI Deep Learning Active</h3>
        <p style={{ color: '#6b7280', marginTop: 10 }}>Analyzing {idleCount} Tables...</p>
      </ScanZone>

    </Container>
  );
};

export default LivePicks;