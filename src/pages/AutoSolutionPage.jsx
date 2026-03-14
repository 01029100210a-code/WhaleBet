import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Tag, Radio, List, Avatar, Spin, Badge } from 'antd';
import { RiseOutlined, FallOutlined, RobotOutlined, SyncOutlined, DollarOutlined, HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from '../firebase';
import dayjs from 'dayjs';

// --- 스타일 정의 ---
const PageContainer = styled.div` padding: 20px; background: transparent; height: 100%; color: white; overflow-y: auto; `;
const StatusCard = styled.div` background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 20px; text-align: center; height: 100%; transition: 0.3s; &:hover { border-color: #d4af37; } `;
const BotSelector = styled(Radio.Group)`
  width: 100%; display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
  .ant-radio-button-wrapper {
    flex: 1; text-align: center; background: #111827; border: 1px solid #374151; color: #94a3b8; border-radius: 8px; height: 50px; line-height: 48px; font-weight: bold;
    &:hover { color: #d4af37; }
    &.ant-radio-button-wrapper-checked { background: rgba(212, 175, 55, 0.2); border-color: #d4af37; color: #d4af37; box-shadow: none; }
    &::before { display: none; }
  }
`;
const slideIn = keyframes` from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } `;
const LogItem = styled(List.Item)`
  animation: ${slideIn} 0.3s ease-out; border-bottom: 1px solid #1f2937; padding: 12px 0 !important;
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
  const [activeBotId, setActiveBotId] = useState(2); // 기본 2번 봇
  const [rawData, setRawData] = useState([]); // DB 원본 데이터
  
  // 계산된 상태값
  const [chartData, setChartData] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(10000000);
  const [recentLogs, setRecentLogs] = useState([]);
  const [winRate, setWinRate] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);

  const startBalance = 10000000;

  // 1. 데이터 가져오기 (DB 실시간 연동)
  useEffect(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTimestamp = Timestamp.fromDate(startOfToday);

    const q = query(
        collection(db, "game_history"),
        where("created_at", ">=", startTimestamp),
        orderBy("created_at", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRawData(docs);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. 봇 전략 시뮬레이션 로직 (봇이 바뀔때마다 재계산)
  useEffect(() => {
    if (loading || rawData.length === 0) return;

    calculateBotPerformance(activeBotId, rawData);
  }, [activeBotId, rawData, loading]);


  // --- 🤖 핵심: 시뮬레이션 계산 함수 ---
  const calculateBotPerformance = (botId, data) => {
    const strategy = BOT_STRATEGIES.find(b => b.id === botId);
    let balance = startBalance;
    let wins = 0;
    let totalBets = 0;
    const chartHistory = [];
    const logs = [];

    // 시간별 차트 데이터 초기화 (0시~현재)
    const currentHour = new Date().getHours();
    const hourlyData = {};
    for (let i = 0; i <= currentHour; i++) hourlyData[i] = startBalance;

    // 데이터 순회
    data.forEach(game => {
        const step = game.step; // 결과가 나온 단계
        const result = game.result; // WIN or LOSE
        const hour = game.created_at.toDate().getHours();
        const timeStr = dayjs(game.created_at.toDate()).format('HH:mm');

        let change = 0;
        let isBetting = false;

        // [Bot 1] 1단계 고정 배팅 (50만원)
        if (strategy.type === 'FIXED') {
            if (step === 1) {
                isBetting = true;
                if (result === 'WIN') change = 500000;
                else change = -500000;
            }
        } 
        // [Bot 2~5] 시스템 배팅 (330만원 3분할 기회)
        else {
            const minStep = strategy.steps[0];
            const maxStep = strategy.steps[strategy.steps.length - 1];

            // 범위 내 적중 (수익 발생)
            if (step >= minStep && step <= maxStep && result === 'WIN') {
                isBetting = true;
                change = 150000; // 1회 적중 시 평균 수익 (가정)
            }
            // 범위 끝에서 패배 (시스템 파산 -330만)
            else if (step === maxStep && (result === 'LOSE' || result === 'LOSS')) {
                isBetting = true;
                change = -3300000; // 기회비용 소멸
            }
        }

        // 배팅이 일어난 경우만 업데이트
        if (isBetting) {
            balance += change;
            totalBets++;
            if (change > 0) wins++;

            // 로그 추가 (최신 10개만 유지하기 위해 배열에 다 넣고 나중에 자름)
            logs.push({
                time: timeStr,
                room: game.room_name,
                result: change > 0 ? 'WIN' : 'LOSE',
                change: change,
                balance: balance
            });
        }

        // 시간별 데이터 갱신 (마지막 잔고 유지)
        if (hour <= currentHour) hourlyData[hour] = balance;
    });

    // 차트 데이터 포맷팅
    const formattedChart = Object.keys(hourlyData).map(h => ({
        time: `${h}:00`,
        balance: hourlyData[h]
    }));

    // 상태 업데이트
    setChartData(formattedChart);
    setCurrentBalance(balance);
    setTodayProfit(balance - startBalance);
    setWinRate(totalBets === 0 ? 0 : Math.round((wins / totalBets) * 100));
    setRecentLogs(logs.reverse().slice(0, 10)); // 최신순 10개
  };

  return (
    <PageContainer>
      <div style={{marginBottom: 20}}>
         <Tag color="geekblue" style={{marginBottom: 10}}>AI STRATEGY SIMULATION</Tag>
         <h1 style={{color:'white', margin:0, display:'flex', alignItems:'center', gap: 10}}>
             <RobotOutlined /> WHALE AUTO SOLUTION
             {loading && <Spin indicator={<SyncOutlined spin style={{fontSize: 20, color:'#d4af37'}} />} />}
         </h1>
      </div>

      {/* 1. 봇 선택기 */}
      <BotSelector value={activeBotId} onChange={(e) => setActiveBotId(e.target.value)}>
          {BOT_STRATEGIES.map(bot => (
              <Radio.Button key={bot.id} value={bot.id}>
                  <div>{bot.name}</div>
                  <div style={{fontSize: 10, fontWeight:'normal', opacity: 0.7}}>{bot.desc}</div>
              </Radio.Button>
          ))}
      </BotSelector>

      {/* 2. 상단 상태 카드 */}
      <Row gutter={[16, 16]} style={{marginBottom: 20}}>
          <Col xs={24} md={8}>
            <StatusCard style={{background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'}}>
                <Statistic 
                    title={<span style={{color:'#94a3b8'}}>Start Balance (00:00)</span>} 
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
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', height:'100%'}}>
                    <div>
                        <div style={{color:'#94a3b8', fontSize: 12}}>Current Balance</div>
                        <div style={{fontSize: 28, fontWeight:900, color: currentBalance >= startBalance ? '#10b981' : '#ef4444'}}>
                            {currentBalance.toLocaleString()} P
                        </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                         <Tag color={todayProfit >= 0 ? "success" : "error"} style={{fontSize: 16, padding: '5px 10px'}}>
                            {todayProfit >= 0 ? '+' : ''}{todayProfit.toLocaleString()} P
                         </Tag>
                         <div style={{fontSize: 11, marginTop: 5, color:'#94a3b8'}}>Today's Profit</div>
                    </div>
                </div>
            </StatusCard>
          </Col>
          <Col xs={12} md={3}>
            <StatusCard>
                <Statistic title="Win Rate" value={winRate} suffix="%" valueStyle={{color: winRate >= 50 ? '#d4af37' : '#ef4444'}} />
                <div style={{fontSize:10, color:'#64748b'}}>적중 확률</div>
            </StatusCard>
          </Col>
          <Col xs={12} md={3}>
            <StatusCard>
                <Statistic title="Trades" value={recentLogs.length > 0 ? 'Active' : 'Wait'} valueStyle={{color:'white', fontSize: 18}} />
                <Badge status="processing" text="Running" style={{color:'#10b981'}} />
            </StatusCard>
          </Col>
      </Row>

      <Row gutter={24}>
          {/* 3. 메인 그래프 */}
          <Col xs={24} lg={16}>
              <Card 
                title={<span style={{color:'white'}}><RiseOutlined /> Profit Trend Graph</span>} 
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
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </Card>
          </Col>

          {/* 4. 실시간 로그 (슬라이드 방식) */}
          <Col xs={24} lg={8}>
              <Card 
                title={<span style={{color:'white'}}><HistoryOutlined /> Real-time Activity</span>} 
                bordered={false} 
                style={{background:'#111827', border:'1px solid #374151', height:'100%', marginTop: window.innerWidth < 992 ? 20 : 0}}
                bodyStyle={{padding: 0}}
              >
                  <div style={{height: 400, overflow: 'hidden', padding: '0 15px'}}>
                      <List
                        itemLayout="horizontal"
                        dataSource={recentLogs}
                        renderItem={item => (
                            <LogItem>
                                <List.Item.Meta
                                    avatar={
                                        <Avatar 
                                            icon={item.result === 'WIN' ? <CheckCircleOutlined /> : <CloseCircleOutlined />} 
                                            style={{backgroundColor: item.result === 'WIN' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: item.result === 'WIN' ? '#10b981' : '#ef4444'}} 
                                        />
                                    }
                                    title={<div style={{color:'white', fontSize: 13}}>{item.time} <span style={{color:'#64748b', fontSize: 11}}>| {item.room}</span></div>}
                                    description={
                                        <div style={{display:'flex', justifyContent:'space-between'}}>
                                            <span style={{color: item.result === 'WIN' ? '#10b981' : '#ef4444', fontWeight:'bold'}}>
                                                {item.change > 0 ? '+' : ''}{item.change.toLocaleString()} P
                                            </span>
                                            <span style={{color:'#94a3b8', fontSize: 12}}>
                                                잔고: {(item.balance / 10000).toFixed(0)}만
                                            </span>
                                        </div>
                                    }
                                />
                            </LogItem>
                        )}
                      />
                      {recentLogs.length === 0 && (
                          <div style={{textAlign:'center', padding: 40, color:'#64748b'}}>
                              <SyncOutlined spin style={{fontSize: 24, marginBottom: 10}} />
                              <div>배팅 대기 중...</div>
                          </div>
                      )}
                  </div>
                  
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