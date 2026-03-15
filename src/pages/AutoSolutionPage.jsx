import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Tag, Radio, List, Avatar, Spin, DatePicker, Button, Grid } from 'antd'; // Grid 추가됨
import { RiseOutlined, RobotOutlined, SyncOutlined, DollarOutlined, HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom'; 
import dayjs from 'dayjs';

const { useBreakpoint } = Grid; // 반응형 훅

// 스타일 수정: 모바일 패딩 축소 및 오버플로우 방지
const PageContainer = styled.div` 
  padding: 10px; 
  background: transparent; 
  height: 100%; 
  color: white; 
  overflow-x: hidden;
  overflow-y: auto; 
  @media (min-width: 768px) {
    padding: 20px;
  }
`;

const StatusCard = styled.div` 
  background: #1f2937; 
  border: 1px solid #374151; 
  border-radius: 12px; 
  padding: 15px; 
  text-align: center; 
  height: 100%; 
  min-height: 100px;
  transition: 0.3s; 
  &:hover { border-color: #d4af37; } 
  display: flex; 
  flex-direction: column; 
  justify-content: center; 
`;

// [수정] 모바일에서 봇 선택 버튼이 가로 스크롤되도록 변경
const BotSelector = styled(Radio.Group)`
  width: 100%; 
  display: flex; 
  gap: 8px; 
  margin-bottom: 20px;
  overflow-x: auto; /* 가로 스크롤 허용 */
  padding-bottom: 5px; /* 스크롤바 공간 확보 */
  
  /* 스크롤바 숨김 (선택사항) */
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }

  .ant-radio-button-wrapper {
    flex: 0 0 auto; /* 크기 줄어듦 방지 */
    width: 140px;   /* 버튼 최소 너비 확보 */
    text-align: center; 
    background: #111827; 
    border: 1px solid #374151; 
    color: #94a3b8; 
    border-radius: 8px; 
    height: 70px; 
    display: flex; 
    flex-direction: column; 
    justify-content: center; 
    align-items: center;
    padding: 5px;
    
    &:hover { color: #d4af37; border-color: #d4af37; }
    &.ant-radio-button-wrapper-checked { 
      background: rgba(212, 175, 55, 0.1); 
      border: 2px solid #d4af37; 
      color: #d4af37; 
      .bot-desc { color: #fcd34d; }
    }
    &::before { display: none; }
  }
  .bot-name { font-size: 13px; font-weight: bold; margin-bottom: 2px; }
  .bot-desc { font-size: 10px; opacity: 0.8; font-weight: normal; white-space: nowrap; }
`;

const blink = keyframes` 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } `;
const NewBadge = styled(Tag)`
  animation: ${blink} 1.5s infinite; font-weight: bold; border: none; margin-right: 8px;
`;

const LogItem = styled(List.Item)`
  border-bottom: 1px solid #1f2937; 
  padding: 10px !important; 
  background: #111827;
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  transition: background 0.3s;
  &:hover { background: rgba(255,255,255,0.05); }
`;

const BOT_STRATEGIES = [
    { id: 1, name: 'Bot 1 (1단 5% 고정)', desc: '1단계 픽만 50만원 고정', type: 'FIXED' },
    { id: 2, name: 'Bot 2 (1~4단 시스템)', desc: '330만 분할 (안전형)', min: 1, max: 4, type: 'SYSTEM' },
    { id: 3, name: 'Bot 3 (2~6단 시스템)', desc: '2단계 진입 ~ 6단 마감', min: 2, max: 6, type: 'SYSTEM' },
    { id: 4, name: 'Bot 4 (3~6단 시스템)', desc: '3단계 진입 ~ 6단 마감', min: 3, max: 6, type: 'SYSTEM' },
    { id: 5, name: 'Bot 5 (4~6단 고위험)', desc: '4단계 진입 ~ 6단 마감', min: 4, max: 6, type: 'SYSTEM' },
];

const START_DATE = dayjs('2024-03-14'); 

const AutoSolutionPage = () => {
  const navigate = useNavigate(); 
  const screens = useBreakpoint(); // 반응형 감지
  const isMobile = !screens.md;

  const [loading, setLoading] = useState(true);
  const [activeBotId, setActiveBotId] = useState(2); 
  const [rawData, setRawData] = useState([]); 
  const [selectedDate, setSelectedDate] = useState(dayjs()); 

  const [chartData, setChartData] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(10000000);
  const [latestLogs, setLatestLogs] = useState([]); 
  const [winRate, setWinRate] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);

  const startBalance = 10000000;

  useEffect(() => {
    if (selectedDate.isBefore(START_DATE, 'day')) {
        setRawData([]);
        setLoading(false);
        return;
    }
    setLoading(true);
    const startOfDay = selectedDate.startOf('day').toDate();
    const endOfDay = selectedDate.endOf('day').toDate();
    const startTs = Timestamp.fromDate(startOfDay);
    const endTs = Timestamp.fromDate(endOfDay);

    const q = query(
        collection(db, "game_history"),
        where("created_at", ">=", startTs),
        where("created_at", "<=", endTs),
        orderBy("created_at", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRawData(docs);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]); 

  useEffect(() => {
    if (loading) return;
    calculateBotPerformance(activeBotId, rawData);
  }, [activeBotId, rawData, loading]);

  const calculateBotPerformance = (botId, data) => {
    const strategy = BOT_STRATEGIES.find(b => b.id === botId);
    let balance = startBalance;
    let wins = 0;
    let betCount = 0;
    const logs = [];

    const isToday = selectedDate.isSame(dayjs(), 'day');
    const currentHour = isToday ? new Date().getHours() : 23;
    const hourlyData = {};
    for (let i = 0; i <= currentHour; i++) hourlyData[i] = startBalance;

    data.forEach(game => {
        const step = parseInt(game.step, 10); 
        const resultRaw = (game.result || "").trim().toUpperCase(); 
        
        let gameTime = new Date();
        if (game.created_at && game.created_at.toDate) gameTime = game.created_at.toDate();
        const hour = gameTime.getHours();
        const timeStr = dayjs(gameTime).format('HH:mm');

        let change = 0;
        let isBetting = false;
        let betResult = ''; 

        if (strategy.type === 'FIXED') {
            if (step === 1 && resultRaw === 'WIN') {
                isBetting = true;
                change = 500000;
                betResult = 'WIN';
            }
            else if (step > 1 || (step === 1 && resultRaw !== 'WIN')) {
                isBetting = true;
                change = -500000;
                betResult = 'LOSE';
            }
        } 
        else {
            const min = strategy.min;
            const max = strategy.max;

            if (step >= min && step <= max && resultRaw === 'WIN') {
                isBetting = true;
                change = 150000; 
                betResult = 'WIN';
            }
            else if (step >= max && (step > max || resultRaw !== 'WIN')) {
                if (step === max && resultRaw !== 'WIN') {
                    isBetting = true;
                    change = -3300000; 
                    betResult = 'LOSE';
                }
                else if (step > max) {
                     isBetting = true;
                     change = -3300000;
                     betResult = 'LOSE';
                }
            }
        }

        if (isBetting) {
            balance += change;
            betCount++;
            if (change > 0) wins++;
            logs.push({
                id: game.id,
                timestamp: dayjs(gameTime),
                time: timeStr,
                room: game.room_name,
                result: betResult,
                change: change,
                balance: balance
            });
        }
        if (hour <= currentHour) hourlyData[hour] = balance;
    });

    const formattedChart = Object.keys(hourlyData).map(h => ({
        time: `${h}:00`,
        balance: hourlyData[h]
    }));

    setChartData(formattedChart);
    setCurrentBalance(balance);
    setTodayProfit(balance - startBalance);
    setTotalTrades(betCount);
    setWinRate(betCount === 0 ? 0 : Math.round((wins / betCount) * 100));
    setLatestLogs(logs.reverse()); 
  };

  const handleGoToLive = () => {
      localStorage.setItem('lastMenuKey', '1'); 
      window.location.reload(); 
  };

  const disabledDate = (current) => {
    return current && current < START_DATE.startOf('day');
  };

  return (
    <PageContainer>
      {/* 헤더 부분 모바일 대응: 세로 배치 */}
      <div style={{
          marginBottom: 20, 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'end',
          gap: 10
      }}>
         <div>
            <Tag color="geekblue" style={{marginBottom: 5}}>AI STRATEGY SIMULATION</Tag>
            <h1 style={{color:'white', margin:0, fontSize: isMobile ? '20px' : '26px', display:'flex', alignItems:'center', gap: 10}}>
                <RobotOutlined /> WHALE AUTO
                {loading && <Spin indicator={<SyncOutlined spin style={{fontSize: 20, color:'#d4af37'}} />} />}
            </h1>
            <p style={{color:'#94a3b8', marginTop: 5, fontSize: isMobile ? '12px' : '14px', wordBreak: 'keep-all'}}>
                실시간 DB 데이터를 기반으로 수익 시뮬레이션 (00시 초기화)
            </p>
         </div>
         
         <div style={{ width: isMobile ? '100%' : 'auto' }}>
             <DatePicker 
                value={selectedDate} 
                onChange={(date) => setSelectedDate(date || dayjs())} 
                allowClear={false}
                disabledDate={disabledDate} 
                style={{
                    background:'#1f2937', 
                    border:'1px solid #374151', 
                    color:'white', 
                    width: isMobile ? '100%' : 'auto'
                }} 
             />
         </div>
      </div>

      {/* 봇 선택: 가로 스크롤 가능하게 변경됨 */}
      <BotSelector value={activeBotId} onChange={(e) => setActiveBotId(e.target.value)}>
          {BOT_STRATEGIES.map(bot => (
              <Radio.Button key={bot.id} value={bot.id}>
                  <div className="bot-name">{bot.name}</div>
                  <div className="bot-desc">{bot.desc}</div>
              </Radio.Button>
          ))}
      </BotSelector>

      {/* 통계 카드: 그리드 간격 조절 */}
      <Row gutter={[10, 10]} style={{marginBottom: 20}}>
          <Col xs={12} md={6}>
            <StatusCard>
                <Statistic 
                    title={<span style={{color:'#94a3b8', fontSize: 12}}>Start Balance</span>} 
                    value={startBalance} 
                    prefix={<DollarOutlined />} 
                    valueStyle={{color:'white', fontWeight:'bold', fontSize: isMobile ? 18 : 24}} 
                    formatter={(val) => (val/10000).toFixed(0) + '만'}
                />
            </StatusCard>
          </Col>

          <Col xs={24} md={10} order={isMobile ? -1 : 0}>
            <StatusCard style={{
                border: currentBalance >= startBalance ? '1px solid #10b981' : '1px solid #ef4444', 
                background: currentBalance >= startBalance ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                padding: '10px 20px'
            }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <div style={{textAlign:'left'}}>
                        <div style={{color:'#94a3b8', fontSize: 12, marginBottom: 5}}>Current Balance</div>
                        <div style={{fontSize: isMobile ? 22 : 28, fontWeight:900, color: currentBalance >= startBalance ? '#10b981' : '#ef4444'}}>
                            {currentBalance.toLocaleString()} P
                        </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                         <Tag color={todayProfit >= 0 ? "success" : "error"} style={{fontSize: isMobile ? 14 : 16, padding: '4px 8px'}}>
                            {todayProfit >= 0 ? '+' : ''}{todayProfit.toLocaleString()}
                         </Tag>
                         <div style={{fontSize: 11, marginTop: 5, color:'#94a3b8'}}>
                             Today's Profit
                         </div>
                    </div>
                </div>
            </StatusCard>
          </Col>
          
          <Col xs={6} md={4}>
            <StatusCard>
                <Statistic 
                    title={<span style={{fontSize:12}}>Win Rate</span>} 
                    value={winRate} 
                    suffix="%" 
                    valueStyle={{color: winRate >= 50 ? '#d4af37' : '#ef4444', fontSize: isMobile ? 18 : 24}} 
                />
            </StatusCard>
          </Col>
          <Col xs={6} md={4}>
            <StatusCard>
                <Statistic 
                    title={<span style={{fontSize:12}}>Trades</span>} 
                    value={totalTrades} 
                    suffix="회" 
                    valueStyle={{color:'white', fontSize: isMobile ? 18 : 24}} 
                />
            </StatusCard>
          </Col>
      </Row>

      <Row gutter={[0, 20]}>
          <Col xs={24} lg={16} style={{ paddingRight: isMobile ? 0 : 20 }}>
              <Card 
                title={<span style={{color:'white'}}><RiseOutlined /> Profit Trend Graph</span>} 
                bordered={false} 
                style={{background:'#1f2937', border:'1px solid #374151', minHeight: 350}}
                bodyStyle={{ padding: isMobile ? '10px 0' : '24px' }}
              >
                  <div style={{width: '100%', height: 300}}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickCount={5} />
                            <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `${(val/10000).toFixed(0)}`} />
                            <Tooltip 
                                contentStyle={{background:'#111827', border:'1px solid #374151', color:'white'}} 
                                itemStyle={{color:'#d4af37'}}
                                formatter={(value) => [`${value.toLocaleString()} P`, 'Balance']}
                            />
                            <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2}/>
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </Card>
          </Col>

          <Col xs={24} lg={8}>
              <Card 
                title={<span style={{color:'white'}}><HistoryOutlined /> Betting Logs</span>} 
                bordered={false} 
                style={{background:'#111827', border:'1px solid #374151'}}
                bodyStyle={{padding: 0}}
              >
                  <div style={{height: 400, overflowY: 'auto', padding: '0 10px'}}>
                      {latestLogs.length > 0 ? (
                          <List
                            itemLayout="horizontal"
                            dataSource={latestLogs}
                            renderItem={item => (
                                <LogItem>
                                    <div style={{display:'flex', alignItems:'center', gap: 10}}>
                                        <Avatar 
                                            size="small"
                                            icon={item.result === 'WIN' ? <CheckCircleOutlined /> : <CloseCircleOutlined />} 
                                            style={{
                                                backgroundColor: item.result === 'WIN' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                                                color: item.result === 'WIN' ? '#10b981' : '#ef4444'
                                            }} 
                                        />
                                        <div>
                                            <div style={{color:'white', fontSize: 13, fontWeight:'bold'}}>
                                                {item.room} <span style={{color:'#64748b', fontSize: 11, fontWeight:'normal'}}>({item.time})</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{textAlign:'right'}}>
                                        <div style={{color: item.result === 'WIN' ? '#10b981' : '#ef4444', fontWeight:'bold', fontSize: 13}}>
                                            {item.change > 0 ? '+' : ''}{item.change.toLocaleString()}
                                        </div>
                                    </div>
                                </LogItem>
                            )}
                          />
                      ) : (
                          <div style={{textAlign:'center', padding: 60, color:'#64748b'}}>
                              <SyncOutlined spin={loading} style={{fontSize: 24, marginBottom: 10}} />
                              <div>{loading ? '분석 중...' : '기록 없음'}</div>
                          </div>
                      )}
                  </div>
                  <div style={{padding: 15, borderTop: '1px solid #1f2937'}}>
                      <Button type="primary" block style={{background:'#d4af37', border:'none', color:'black', fontWeight:'bold', height: 40}} onClick={handleGoToLive}>
                          실전 배팅하기
                      </Button>
                  </div>
              </Card>
          </Col>
      </Row>
    </PageContainer>
  );
};

export default AutoSolutionPage;