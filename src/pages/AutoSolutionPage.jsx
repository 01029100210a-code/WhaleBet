import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Tag, Radio, List, Avatar, Spin, DatePicker, Button, Badge } from 'antd';
import { RiseOutlined, RobotOutlined, SyncOutlined, DollarOutlined, HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom'; 
import dayjs from 'dayjs';

// --- 스타일 정의 ---
const PageContainer = styled.div` padding: 20px; background: transparent; height: 100%; color: white; overflow-y: auto; `;
const StatusCard = styled.div` background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 20px; text-align: center; height: 100%; transition: 0.3s; &:hover { border-color: #d4af37; } display: flex; flex-direction: column; justify-content: center; `;

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

const blink = keyframes` 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } `;
const NewBadge = styled(Tag)`
  animation: ${blink} 1.5s infinite; font-weight: bold; border: none; margin-right: 8px;
`;

const LogItem = styled(List.Item)`
  border-bottom: 1px solid #1f2937; padding: 12px 15px !important; background: #111827;
  display: flex; justify-content: space-between; align-items: center; transition: background 0.3s;
  &:hover { background: rgba(255,255,255,0.05); }
`;

// --- 봇 전략 정의 ---
const BOT_STRATEGIES = [
    { id: 1, name: 'Bot 1 (1단 5% 고정)', desc: '1단계 픽만 50만원 고정배팅', type: 'FIXED' },
    { id: 2, name: 'Bot 2 (1~4단 시스템)', desc: '330만 분할 시스템 (안전형)', min: 1, max: 4, type: 'SYSTEM' },
    { id: 3, name: 'Bot 3 (2~6단 시스템)', desc: '2단계 진입 ~ 6단 마감', min: 2, max: 6, type: 'SYSTEM' },
    { id: 4, name: 'Bot 4 (3~6단 시스템)', desc: '3단계 진입 ~ 6단 마감', min: 3, max: 6, type: 'SYSTEM' },
    { id: 5, name: 'Bot 5 (4~6단 고위험)', desc: '4단계 진입 ~ 6단 마감', min: 4, max: 6, type: 'SYSTEM' },
];

// 🔥 [중요] 시작 날짜 설정 (이 날짜 이전 데이터는 무시/선택 불가)
const START_DATE = dayjs('2024-03-14'); 

const AutoSolutionPage = () => {
  const navigate = useNavigate(); 
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

  // 1. 데이터 가져오기
  useEffect(() => {
    // 🔥 만약 선택된 날짜가 3/14 이전이면 강제로 데이터 비우고 종료
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

  // 2. 시뮬레이션 계산
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

        // Bot 1
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
        // Bot 2~5
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

  // 🔥 [NEW] 날짜 비활성화 함수 (3/14 이전 선택 불가)
  const disabledDate = (current) => {
    return current && current < START_DATE.startOf('day');
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
         
         <div>
             <span style={{color:'#94a3b8', marginRight: 10}}>Date:</span>
             <DatePicker 
                value={selectedDate} 
                onChange={(date) => setSelectedDate(date || dayjs())} 
                allowClear={false}
                disabledDate={disabledDate} // 🔥 날짜 선택 제한 적용
                style={{background:'#1f2937', border:'1px solid #374151', color:'white'}} 
             />
         </div>
      </div>

      <BotSelector value={activeBotId} onChange={(e) => setActiveBotId(e.target.value)}>
          {BOT_STRATEGIES.map(bot => (
              <Radio.Button key={bot.id} value={bot.id}>
                  <div className="bot-name">{bot.name}</div>
                  <div className="bot-desc">{bot.desc}</div>
              </Radio.Button>
          ))}
      </BotSelector>

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

          <Col xs={24} lg={8}>
              <Card 
                title={<span style={{color:'white'}}><HistoryOutlined /> {selectedDate.isSame(dayjs(), 'day') ? "Real-time Activity" : "Past History"}</span>} 
                bordered={false} 
                style={{background:'#111827', border:'1px solid #374151', height:'100%', marginTop: window.innerWidth < 992 ? 20 : 0}}
                bodyStyle={{padding: 0}}
              >
                  <div style={{height: 400, overflowY: 'auto', padding: '0 15px'}}>
                      {latestLogs.length > 0 ? (
                          <List
                            itemLayout="horizontal"
                            dataSource={latestLogs}
                            renderItem={item => {
                                const isNew = item.timestamp.diff(dayjs(), 'minute') > -3;
                                return (
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
                                                <div style={{color:'white', fontSize: 13, fontWeight:'bold', display:'flex', alignItems:'center'}}>
                                                    {isNew && <NewBadge color="#f50">NEW</NewBadge>}
                                                    {item.room}
                                                </div>
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
                                );
                            }}
                          />
                      ) : (
                          <div style={{textAlign:'center', padding: 60, color:'#64748b'}}>
                              <SyncOutlined spin={loading} style={{fontSize: 24, marginBottom: 10}} />
                              <div>{loading ? '데이터 분석 중...' : '데이터가 없습니다.'}</div>
                          </div>
                      )}
                  </div>
                  
                  <div style={{padding: 15, borderTop: '1px solid #1f2937'}}>
                      <Button 
                        type="primary" 
                        block 
                        style={{background:'#d4af37', border:'none', color:'black', fontWeight:'bold', height: 40}}
                        onClick={handleGoToLive} 
                      >
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