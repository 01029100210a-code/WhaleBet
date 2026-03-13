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

// --- 🎵 사운드 파일 수정 ---
// [변경] 기존 209번(웅장한 소리) -> 명확한 '삐-삐-' 경고음으로 변경 (Mixkit Alert)
const TENSION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3"; 
const FANFARE_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3";

// --- ✨ 애니메이션 정의 ---
const glowGold = keyframes`
  0% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.2); border-color: rgba(212, 175, 55, 0.5); }
  50% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.6); border-color: #ffd700; }
  100% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.2); border-color: rgba(212, 175, 55, 0.5); }
`;

const glowRed = keyframes`
  0% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.5); }
  50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.8); border-color: #ff0000; }
  100% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.5); }
`;

const scanMove = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const spin = keyframes`
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

// --- 🎨 스타일 컴포넌트 ---
const Container = styled.div`
  padding: 20px;
  color: white;
  max-width: 1400px;
  margin: 0 auto;
`;

const HeaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  position: relative;
  z-index: 1000;
  background: ${props => props.$active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
  border: 1px solid ${props => props.$active ? '#10b981' : '#ef4444'};
  color: ${props => props.$active ? '#10b981' : '#ef4444'};
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s ease;
  outline: none;
  user-select: none;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);

  &:hover {
    background: ${props => props.$active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'};
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
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
  min-height: 240px; 
  border: 1px solid #4b5563;
  position: relative;
  transition: transform 0.3s ease;
  overflow: hidden;
  background: radial-gradient(circle at top right, rgba(255,255,255,0.03), transparent);

  &:hover { transform: translateY(-5px); }

  &.waiting { border-color: #d4af37; }
  
  &.imminent {
    animation: ${glowGold} 2s infinite;
    border-width: 2px;
  }

  &.betting {
    animation: ${glowRed} 1.5s infinite;
    border-width: 2px;
    background: linear-gradient(145deg, #1f2937 0%, #350808 100%);
  }
`;

const PickDisplay = styled.div`
  font-size: 42px; 
  font-weight: 900;
  letter-spacing: -1px;
  text-align: center;
  line-height: 1;
  margin-top: 15px;
  &.P { color: #3b82f6; text-shadow: 0 0 25px rgba(59, 130, 246, 0.6); }
  &.B { color: #ef4444; text-shadow: 0 0 25px rgba(239, 68, 68, 0.6); }
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
    background: linear-gradient(90deg, transparent, #00ff00, transparent);
    background-size: 200% 100%;
    animation: ${scanMove} 1.5s linear infinite;
    margin-bottom: 10px;
  }
`;

const FluorescentIconWrapper = styled.div`
  font-size: 40px;
  margin-bottom: 20px;
  
  .anticon {
    background: linear-gradient(135deg, #00ffff, #00ff00);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.3));
    animation: ${spin} 3s linear infinite;
  }
`;

const AnalyzingText = styled.div`
  color: #9ca3af;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.5px;
  margin-bottom: 5px;
  text-transform: uppercase;
`;

const RainbowText = styled.div`
  font-size: 13px;
  font-weight: 800;
  margin-top: 4px;
  background: linear-gradient(to right, #ef4444, #f59e0b, #eab308, #22c55e, #3b82f6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
`;

const BettingAlertText = styled.div`
  font-size: 12px;
  color: #ef4444;
  margin-bottom: 15px;
  letter-spacing: 2px;
  font-weight: bold;
  animation: ${pulse} 1s infinite;
`;

const DarkTable = styled(Table)`
  .ant-table { background: transparent; color: #d1d5db; }
  .ant-table-thead > tr > th { background: #1f2937 !important; color: #9ca3af !important; border-bottom: 1px solid #374151 !important; }
  .ant-table-tbody > tr > td { border-bottom: 1px solid #1f2937 !important; color: #e5e7eb !important; }
  .ant-table-tbody > tr:hover > td { background: #111827 !important; }
  .ant-pagination-item-link, .ant-pagination-item { background: transparent !important; border-color: #374151 !important; a { color: #9ca3af !important; } }
  .ant-pagination-item-active { border-color: #d4af37 !important; a { color: #d4af37 !important; } }
`;

const CenterContent = styled.div`
  flex: 1; 
  display: flex;
  flex-direction: column;
  justify-content: center; 
  align-items: center; 
  width: 100%;
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

  const tensionAudioRef = useRef(null);
  const fanfareAudioRef = useRef(null);
  const isFirstLoad = useRef(true);

  // 오디오 초기화
  useEffect(() => {
    tensionAudioRef.current = new Audio(TENSION_SOUND_URL);
    tensionAudioRef.current.volume = 0.6; // 적절한 볼륨
    tensionAudioRef.current.preload = 'auto'; // 미리 로드

    fanfareAudioRef.current = new Audio(FANFARE_SOUND_URL);
    fanfareAudioRef.current.volume = 0.7;
    fanfareAudioRef.current.preload = 'auto';
  }, []);

  // 사운드 토글 함수
  const toggleSound = () => {
    if (isSoundEnabled) {
      setIsSoundEnabled(false);
      // 소리 끄면 즉시 정지
      if (tensionAudioRef.current) {
        tensionAudioRef.current.pause();
        tensionAudioRef.current.currentTime = 0;
      }
      if (fanfareAudioRef.current) {
        fanfareAudioRef.current.pause();
        fanfareAudioRef.current.currentTime = 0;
      }
    } else {
      setIsSoundEnabled(true);
      // 브라우저 정책 우회를 위해 짧게 재생 후 정지
      const unlockAudio = async () => {
        try {
          if (tensionAudioRef.current) {
              await tensionAudioRef.current.play();
              tensionAudioRef.current.pause();
              tensionAudioRef.current.currentTime = 0;
          }
          if (fanfareAudioRef.current) {
              await fanfareAudioRef.current.play();
              fanfareAudioRef.current.pause();
              fanfareAudioRef.current.currentTime = 0;
          }
        } catch (e) {
          console.warn("Audio unlock failed (user interaction needed):", e);
        }
      };
      unlockAudio();
    }
  };

  // 배팅 중인지 여부 (안정적인 boolean 값)
  const hasActiveBetting = bettingRooms.length > 0;

  // 🔥 [핵심 수정] 배팅 알림음 루프 로직
  useEffect(() => {
    let intervalId = null;

    if (isSoundEnabled && hasActiveBetting) {
      const playBeep = async () => {
        const audio = tensionAudioRef.current;
        if (!audio) return;

        try {
            // 소리가 겹치지 않도록 초기화 후 재생
            audio.currentTime = 0;
            await audio.play();
        } catch (e) {
            console.error("Beep sound error:", e);
        }
      };

      // 1. 즉시 한 번 재생
      playBeep();

      // 2. 2초 간격으로 반복 재생 (새로운 알람 소리에 맞춰 2초 설정)
      intervalId = setInterval(playBeep, 2000);

    } else {
      // 배팅이 끝나거나 소리를 끄면 정지
      if (tensionAudioRef.current) {
        tensionAudioRef.current.pause();
        tensionAudioRef.current.currentTime = 0;
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSoundEnabled, hasActiveBetting]); // bettingRooms 자체가 바뀌어도 hasActiveBetting 값만 같으면 불필요하게 재시작 안 함

  // Firestore Listeners
  useEffect(() => {
    const q = query(collection(db, "rooms")); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const waiting = roomData.filter(r => r.phase === 'WAITING');
      const betting = roomData.filter(r => r.phase === 'BETTING' && r.step >= userEntryLevel);
      const idle = roomData.length - waiting.length - betting.length;
      
      waiting.sort((a, b) => a.room_name.localeCompare(b.room_name));
      betting.sort((a, b) => b.step - a.step);

      setWaitingRooms(waiting);
      setBettingRooms(betting);
      setIdleCount(idle);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userEntryLevel]);

  // 승리 사운드 및 히스토리
  useEffect(() => {
    const q = query(collection(db, "game_history"), orderBy("created_at", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isFirstLoad.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            // 승리 시 팡파레
            if (isSoundEnabled && data.result === 'WIN' && fanfareAudioRef.current) {
                // 배팅 소리와 겹칠 수 있으므로 배팅 소리 잠시 줄이거나 멈출 수도 있지만, 여기선 그냥 재생
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
    { 
        title: 'Result', 
        dataIndex: 'result', 
        key: 'result', 
        align: 'center', 
        render: (res) => (
            <span style={{
                color: res === 'WIN' ? '#39ff14' : '#ff4d4f',
                fontWeight: '900',
                textShadow: res === 'WIN' ? '0 0 10px rgba(57, 255, 20, 0.4)' : 'none',
                fontSize: '14px'
            }}>
                {res}
            </span>
        ) 
    },
    { title: 'Step', dataIndex: 'step', key: 'step', align: 'right', render: (step) => <span style={{color: step <= 4 ? '#d4af37' : '#ef4444'}}>{step}단계</span> }
  ];

  if (loading) return <Spin size="large" style={{display:'block', margin:'100px auto'}} />;

  return (
    <Container>
      <HeaderContainer>
        <DashboardTitle>WHALEBET DASHBOARD</DashboardTitle>
        <SoundToggleBtn onClick={toggleSound} $active={isSoundEnabled}>
          {isSoundEnabled ? <SoundOutlined /> : <MutedOutlined />}
          {isSoundEnabled ? 'SOUND ON' : 'SOUND OFF'}
        </SoundToggleBtn>
      </HeaderContainer>

      {/* 통계 패널 */}
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

      {/* WAITING ZONE */}
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
                    const remaining = room.remaining !== undefined ? room.remaining : 10;
                    const isCountdown = remaining <= 3; 

                    return (
                        <Col xs={24} sm={12} md={8} lg={6} xl={6} key={room.id}>
                            <GameCard className={`waiting ${isCountdown ? 'imminent' : ''}`}>
                                <div style={{color:'white', fontWeight:'bold', fontSize: 16, textAlign:'left'}}>
                                    {room.room_name}
                                </div>

                                <CenterContent>
                                    {isCountdown ? (
                                        <div style={{textAlign:'center'}}>
                                            <Text style={{color:'#fbbf24', fontSize:18, fontWeight:'bold', letterSpacing:1, textShadow: '0 0 10px rgba(251, 191, 36, 0.5)'}}>
                                                ⚠️ 진입 임박 ({remaining}판 전)
                                            </Text>
                                            <div style={{marginTop: 15}}>
                                                <Text style={{color:'#9ca3af', fontSize:10}}>ENTRY PREPARE</Text>
                                                <PickDisplay className={room.pick}>
                                                    {room.pick === 'P' ? 'PLAYER' : 'BANKER'}
                                                </PickDisplay>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{textAlign:'center'}}>
                                            <FluorescentIconWrapper>
                                                <ScanOutlined />
                                            </FluorescentIconWrapper>
                                            <AnalyzingText>패턴 정밀 분석중</AnalyzingText>
                                            <RainbowText>1단계부터 타이보험필수!!</RainbowText>
                                        </div>
                                    )}
                                </CenterContent>

                                <div style={{display:'flex', justifyContent:'space-between', paddingTop: 15, borderTop:'1px solid #374151'}}>
                                    <span style={{color:'#10b981', fontSize:12}}>
                                        <ScanOutlined /> AI-{room.ai_num}
                                    </span>
                                    {isCountdown ? (
                                        <Tag color="gold" style={{fontWeight:'bold'}}>진입 대기</Tag>
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

      {/* ACTIVE BETTING */}
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
                        <div style={{color:'white', fontWeight:'bold', fontSize: 15, textAlign:'left'}}>
                            {room.room_name}
                        </div>

                        <CenterContent>
                            <div style={{textAlign:'center'}}>
                                <BettingAlertText>
                                    <SoundOutlined /> BETTING LIVE
                                </BettingAlertText>
                                
                                <PickDisplay className={room.pick}>
                                    {room.pick === 'P' ? 'PLAYER' : 'BANKER'}
                                </PickDisplay>
                            </div>
                        </CenterContent>
                        
                        <div style={{display:'flex', justifyContent:'space-between', paddingTop: 15, borderTop:'1px solid #374151'}}>
                            <span style={{color:'#10b981', fontSize:12}}><ScanOutlined /> AI-{room.ai_num}</span>
                            <Tag color="#f50">{room.step}단계 진행 🔥</Tag>
                        </div>
                    </GameCard>
                </Col>
                ))}
            </Row>
          )}
      </div>

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