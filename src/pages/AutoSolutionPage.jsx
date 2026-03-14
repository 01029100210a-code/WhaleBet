import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Tag, Radio, List, Avatar, Spin, DatePicker, Button } from 'antd';
import { RiseOutlined, RobotOutlined, SyncOutlined, DollarOutlined, HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from '../firebase';
import dayjs from 'dayjs';

// --- 스타일 정의 ---
const PageContainer = styled.div` padding: 20px; background: transparent; height: 100%; color: white; overflow-y: auto; `;
const StatusCard = styled.div` background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 20px; text-align: center; height: 100%; transition: 0.3s; &:hover { border-color: #d4af37; } display: flex; flex-direction: column; justify-content: center; `;

// 봇 선택 버튼
const BotSelector = styled(Radio.Group)`
  width: 100%; display: flex; gap: 10px; margin-bottom: 20px;
  .ant-radio-button-wrapper {
    flex: 1; text-align: center; background: #111827; border: 1px solid #374151; color: #94a3b8; 
    border-radius: 8px; height: 80px; display: flex; flex-direction: column; justify-content: center; align-items: center;
    &:hover { color: #d4af37; border-color: #d4af37; }
    &.ant-radio-button-wrapper-checked { 
      background: rgba(212, 175, 55, 0.1); border: 2px solid #d4af37; color: #d4af37; 
      .bot-desc { color: #fcd34d; }
    }
    &::before { display: none; }
  }
  .bot-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
  .bot-desc { font-size: 11px; opacity: 0.8; font-weight: normal; }
`;

// 🔥 무한 롤링 슬라이드 애니메이션
const scrollUp = keyframes`
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); } 
`;

const RollingContainer = styled.div`
  height: 350px; overflow: hidden; position: relative;
  /* 상하단 페이드 효과 */
  &::before, &::after {
    content: ""; position: absolute; left: 0; right: 0; height: 30px; z-index: 2; pointer-events: none;
  }
  &::before { top: 0; background: linear-gradient(to bottom, #111827, transparent); }
  &::after { bottom: 0; background: linear-gradient(to top, #111827, transparent); }
`;

const RollingContent = styled.div`
  /* 데이터 양에 따라 속도 조절 가능, 여기선 20초 */
  animation: ${scrollUp} 30s linear infinite;
  &:hover { animation-play-state: paused; }
`;

const LogItem = styled(List.Item)`
  border-bottom: 1px solid #1f2937; padding: 12px 15px !important; background: #111827;
  display: flex; justify-content: space-between; align-items: center;
  &:hover { background: rgba(255,255,255,0.02); }
`;

// --- 봇 전략 정의 ---
const BOT_STRATEGIES = [
    { id: 1, name: 'Bot 1 (1단 5% 고정)', desc: '1단계 픽만 50만원 고정배팅', steps: [1], type: 'FIXED' },
    { id: 2, name: 'Bot 2 (1~4단 시스템)', desc: '330만 분할 시스템 (안전형)', steps: [1,2,3,4], type: 'SYSTEM' },
    { id: 3, name: 'Bot 3 (2~6단 시스템)', desc: '2단계 진입 ~ 6단 마감', steps: [2,3,4,5,6], type: 'SYSTEM' },
    { id: 4, name: 'Bot 4 (3~6단 시스템)', desc: '3단계 진입 ~ 6단 마감', steps: [3,4,5,6], type: 'SYSTEM' },
    { id: 5, name: 'Bot 5 (4~6단 고위험)', desc: '4단계 진입 ~ 6단 마감', steps: [4,5,6], type: 'SYSTEM' },
];

const AutoSolutionPage = () => {
  const [loading, setLoading] = useState(true);
  const [activeBotId, setActiveBotId] = useState(2); 
  const [rawData, setRawData] = useState([]); 
  const [selectedDate, setSelectedDate] = useState(dayjs()); // 날짜 선택 (기본 오늘)

  // 계산된 상태값
  const [chartData, setChartData] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(10000000);
  const [rollingLogs, setRollingLogs] = useState([]); // 롤링용 로그
  const [winRate, setWinRate] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);

  const startBalance = 10000000;

  // 1. 데이터 가져오기 (LivePicks 방식 적용: 타임스탬프 범위 쿼리)
  useEffect(() => {
    setLoading(true);
    
    // 선택한 날짜의 00:00:00 ~ 23:59:59 타임스탬프 구하기
    // LivePicks.jsx의 로직을 그대로 사용하여 DB 쿼리에 적용
    const startOfDay = selectedDate.startOf('day').toDate();
    const endOfDay = selectedDate.endOf('day').toDate();
    
    const startTs = Timestamp.fromDate(startOfDay);
    const endTs = Timestamp.fromDate(endOfDay);

    // 쿼리: created_at 기준으로 해당 날짜의 데이터만 가져옴
    const q = query(
        collection(db, "game_history"),
        where("created_at", ">=", startTs),
        where("created_at", "<=", endTs),
        orderBy("created_at", "asc") // 그래프를 위해 시간순 정렬 필수
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`🔥 [${selectedDate.format('YYYY-MM-DD')}] 로드된 데이터: ${docs.length}건`);
        setRawData(docs);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]); 

  // 2. 시뮬레이션 로직 (데이터가 로드되면 실행)
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

    // 시간별 차트 데이터 초기화 (0시부터 현재시간/또는 23시까지)
    const isToday = selectedDate.isSame(dayjs(), 'day');
    const currentHour = isToday ? new Date().getHours() : 23;
    
    const hourlyData = {};
    for (let i = 0; i <= currentHour; i++) hourlyData[i] = startBalance;

    data.forEach(game => {
        // 데이터 파싱
        const step = parseInt(game.step, 10); 
        const resultRaw = (game.result || "").trim().toUpperCase(); // LivePicks 처럼 안전하게 처리
        
        let gameTime = new Date();
        if (game.created_at && game.created_at.toDate) {
            gameTime = game.created_at.toDate(); // Firestore Timestamp -> JS Date
        }
        const hour = gameTime.getHours();
        const timeStr = dayjs(gameTime).format('HH:mm');

        let change = 0;
        let isBetting = false;

        // --- 봇 로직 적용 ---
        
        // [Bot 1] 1단계 고정 배팅
        if (strategy.type === 'FIXED') {
            if (step === 1) {
                isBetting = true;
                if (resultRaw === 'WIN') change = 500000;
                else change = -500000;
            }
        } 
        // [Bot 2~5] 시스템 배팅
        else {
            const minStep = strategy.steps[0];
            const maxStep = strategy.steps[strategy.steps.length - 1];

            // 적중 (수익 발생)
            if (step >= minStep && step <= maxStep && resultRaw === 'WIN') {
                isBetting = true;
                change = 150000; 
            }
            // 시스템 파산 (마지막 단계에서 패배)
            // LivePicks 처럼 result가 WIN이 아니면 패배로 간주하되, 여기선 특정 단계 패배만 체크
            else if (step === maxStep && resultRaw !== 'WIN') { 
                isBetting = true;
                change = -3300000; 
            }
        }

        if (isBetting) {
            balance += change;
            betCount++;
            if (change > 0) wins++;

            logs.push({
                id: game.id,
                time: timeStr,
                room: game.room_name,
                result: change > 0 ? 'WIN' : 'LOSE',
                change: change,
                balance: balance
            });
        }

        // 시간별 잔고 업데이트 (해당 시간의 마지막 잔고가 기록됨)
        if (hour <= currentHour) hourlyData[hour] = balance;
    });

    // 차트 데이터 포맷팅
    const formattedChart = Object.keys(hourlyData).map(h => ({
        time: `${h}:00`,
        balance: hourlyData[h]
    }));

    setChartData(formattedChart);
    setCurrentBalance(balance);
    setTodayProfit(balance - startBalance);
    setTotalTrades(betCount);
    setWinRate(betCount === 0 ? 0 : Math.round((wins / betCount) * 100));
    setRollingLogs(logs.reverse()); // 최신순으로 정렬
  };

  return (
    <PageContainer>
      <div style={{marginBottom: 20, display:'flex', justifyContent:'space-between', alignItems:'end'}}>
         <div>
            <Tag color="geekblue" style={{marginBottom: 10}}>AI STRATEGY SIMULATION</Tag>
            <h1 style={{color:'white', margin:0, display:'flex', alignItems:'center', gap: 10}}>
                <RobotOutlined /> WHALE AUTO SOLUTION
                {loading && <Spin indicator={<SyncOutlined spin style={{fontSize: 20, color:'#d4af37'}} />} />}
            </h1>
            <p style={{color:'#94a3b8', marginTop: 5}}>실시간 DB 데이터를 기반으로 각 전략별 수익을 시뮬레이션합니다. (00시 자동 초기화)</p>
         </div>
         
         {/* 날짜 선택기 (과거 이력 조회) */}
         <div>
             <span style={{color:'#94a3b8', marginRight: 10}}>Date:</span>
             <DatePicker 
                value={selectedDate} 
                onChange={(date) => setSelectedDate(date || dayjs())} 
                allowClear={false}
                style={{background:'#1f2937', border:'1px solid #374151', color:'white'}} 
             />
         </div>
      </div>

      {/* 1. 봇 선택기 */}
      <BotSelector value={activeBotId} onChange={(e) => setActiveBotId(e.target.value)}>
          {BOT_STRATEGIES.map(bot => (
              <Radio.Button key={bot.id} value={bot.id}>
                  <div className="bot-name">{bot.name}</div>
                  <div className="bot-desc">{bot.desc}</div>
              </Radio.Button>
          ))}
      </BotSelector>

      {/* 2. 상단 상태 카드 */}
      <Row gutter={[16, 16]} style={{marginBottom: 20}}>
          <Col xs={24} md={6}>
            <StatusCard>
                <Statistic 
                    title={<span style={{color:'#94a3b8'}}>Start Balance</span>} 
                    value={startBalance} 
                    prefix={<DollarOutlined />} 
                    valueStyle={{color:'white', fontWeight:'bold'}} 
                    formatter={(val) => val.toLocaleString()}
                    suffix="P"
                />
            </StatusCard>
          </Col>
          <Col xs={24} md={10}>
            <StatusCard style={{
                border: currentBalance >= startBalance ? '1px solid #10b981' : '1px solid #ef4444', 
                background: currentBalance >= startBalance ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
            }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <div style={{textAlign:'left'}}>
                        <div style={{color:'#94a3b8', fontSize: 12, marginBottom: 5}}>Current Balance</div>
                        <div style={{fontSize: 26, fontWeight:900, color: currentBalance >= startBalance ? '#10b981' : '#ef4444'}}>
                            {currentBalance.toLocaleString()} P
                        </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                         <Tag color={todayProfit >= 0 ? "success" : "error"} style={{fontSize: 16, padding: '5px 10px'}}>
                            {todayProfit >= 0 ? '+' : ''}{todayProfit.toLocaleString()}
                         </Tag>
                         <div style={{fontSize: 11, marginTop: 5, color:'#94a3b8'}}>
                             {selectedDate.isSame(dayjs(), 'day') ? "Today's Profit" : "Daily Profit"}
                         </div>
                    </div>
                </div>
            </StatusCard>
          </Col>
          <Col xs={12} md={4}>
            <StatusCard>
                <Statistic title="Win Rate" value={winRate} suffix="%" valueStyle={{color: winRate >= 50 ? '#d4af37' : '#ef4444'}} />
                <div style={{fontSize:11, color:'#64748b', marginTop: 5}}>적중 확률</div>
            </StatusCard>
          </Col>
          <Col xs={12} md={4}>
            <StatusCard>
                <Statistic title="Trades" value={totalTrades} suffix="회" valueStyle={{color:'white'}} />
                <div style={{fontSize:11, color:'#64748b', marginTop: 5}}>총 배팅 횟수</div>
            </StatusCard>
          </Col>
      </Row>

      <Row gutter={24}>
          {/* 3. 차트 */}
          <Col xs={24} lg={16}>
              <Card 
                title={<span style={{color:'white'}}><RiseOutlined /> Profit Trend Graph ({selectedDate.format('MM-DD')})</span>} 
                bordered={false} 
                style={{background:'#1f2937', border:'1px solid #374151', minHeight: 450}}
              >
                  <div style={{height: 380, width: '100%'}}>
                    <ResponsiveContainer>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis dataKey="time" stroke="#64748b" />
                            <YAxis 
                                stroke="#64748b" 
                                domain={['auto', 'auto']} 
                                tickFormatter={(val) => `${(val/10000).toFixed(0)}만`} 
                            />
                            <Tooltip 
                                contentStyle={{background:'#111827', border:'1px solid #374151', color:'white'}} 
                                itemStyle={{color:'#d4af37'}}
                                formatter={(value) => [`${value.toLocaleString()} P`, 'Balance']}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="balance" 
                                stroke="#10b981" 
                                fillOpacity={1} 
                                fill="url(#colorBalance)" 
                                strokeWidth={3}
                                animationDuration={500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </Card>
          </Col>

          {/* 4. 실시간 로그 (무한 롤링) */}
          <Col xs={24} lg={8}>
              <Card 
                title={<span style={{color:'white'}}><HistoryOutlined /> {selectedDate.isSame(dayjs(), 'day') ? "Real-time Activity" : "Past Activity"}</span>} 
                bordered={false} 
                style={{background:'#111827', border:'1px solid #374151', height:'100%', marginTop: window.innerWidth < 992 ? 20 : 0}}
                bodyStyle={{padding: 0}}
              >
                  {rollingLogs.length > 0 ? (
                      <RollingContainer>
                          {/* 
                             무한 롤링을 위해 리스트를 복제해서 렌더링.
                             데이터가 적을 경우엔 애니메이션 끄고 그냥 보여주는게 나음.
                          */}
                          <RollingContent style={{ animationPlayState: rollingLogs.length < 5 ? 'paused' : 'running' }}>
                              {[...rollingLogs, ...rollingLogs].map((item, idx) => (
                                  <LogItem key={`${item.id}-${idx}`}>
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
                                              <div style={{color:'white', fontSize: 13, fontWeight:'bold'}}>{item.room}</div>
                                              <div style={{color:'#64748b', fontSize: 11}}>{item.time}</div>
                                          </div>
                                      </div>
                                      <div style={{textAlign:'right'}}>
                                          <div style={{color: item.result === 'WIN' ? '#10b981' : '#ef4444', fontWeight:'bold', fontSize: 13}}>
                                              {item.change > 0 ? '+' : ''}{item.change.toLocaleString()}
                                          </div>
                                          <div style={{color:'#94a3b8', fontSize: 11}}>
                                              {(item.balance / 10000).toFixed(0)}만
                                          </div>
                                      </div>
                                  </LogItem>
                              ))}
                          </RollingContent>
                      </RollingContainer>
                  ) : (
                      <div style={{textAlign:'center', padding: 60, color:'#64748b'}}>
                          <SyncOutlined spin={loading} style={{fontSize: 24, marginBottom: 10}} />
                          <div>{loading ? '데이터 로딩 중...' : '데이터가 없습니다.'}</div>
                      </div>
                  )}
                  
                  <div style={{padding: 15, borderTop: '1px solid #1f2937'}}>
                      <Button type="primary" block style={{background:'#d4af37', border:'none', color:'black', fontWeight:'bold', height: 40}}>
                          이 봇으로 실전 배팅하기
                      </Button>
                  </div>
              </Card>
          </Col>
      </Row>
    </PageContainer>
  );
};

export default AutoSolutionPage;