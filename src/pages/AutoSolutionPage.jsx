import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Button, DatePicker, Progress, List, Tag } from 'antd';
import { RiseOutlined, FallOutlined, HistoryOutlined, DollarOutlined, RobotOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const PageContainer = styled.div` padding: 20px; background: transparent; height: 100%; color: white; overflow-y: auto; `;
const StatusCard = styled.div` background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 20px; text-align: center; height: 100%; `;

// 차트 더미 데이터 생성기 (00:00 ~ 현재시간)
const generateChartData = () => {
  let balance = 10000000;
  const data = [];
  const currentHour = new Date().getHours();
  
  for (let i = 0; i <= currentHour; i++) {
    const change = Math.floor(Math.random() * 2000000) - 800000; // 랜덤 등락
    balance += change;
    data.push({ time: `${i}:00`, balance: balance });
  }
  return data;
};

const AutoSolutionPage = () => {
  const [chartData, setChartData] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(10000000);
  const startBalance = 10000000;
  
  // 히스토리 더미 데이터
  const historyData = [
    { date: '2023-10-02', profit: 4200000, rate: 142, status: 'WIN' },
    { date: '2023-10-01', profit: 3400000, rate: 134, status: 'WIN' },
    { date: '2023-09-30', profit: -1200000, rate: 88, status: 'LOSE' },
    { date: '2023-09-29', profit: 5600000, rate: 156, status: 'WIN' },
    { date: '2023-09-28', profit: 2100000, rate: 121, status: 'WIN' },
  ];

  useEffect(() => {
    const data = generateChartData();
    setChartData(data);
    setCurrentBalance(data[data.length - 1].balance);
  }, []);

  return (
    <PageContainer>
      <div style={{marginBottom: 30}}>
         <Tag color="cyan" style={{marginBottom: 10}}>AI AUTO TRADING SYSTEM</Tag>
         <h1 style={{color:'white', margin:0}}>🤖 WHALE AUTO SOLUTION</h1>
         <p style={{color:'#94a3b8'}}>실시간 크롤링 데이터를 기반으로 한 AI 자동 배팅 시뮬레이션입니다. (매일 00시 1,000만P 리셋)</p>
      </div>

      {/* 상단 스탯 카드 */}
      <Row gutter={[20, 20]} style={{marginBottom: 30}}>
        <Col xs={24} md={8}>
            <StatusCard>
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
        <Col xs={24} md={16}>
            <StatusCard style={{border: currentBalance >= startBalance ? '1px solid #10b981' : '1px solid #ef4444', background: currentBalance >= startBalance ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}}>
                <div style={{display:'flex', justifyContent:'space-around', alignItems:'center'}}>
                    <Statistic 
                        title={<span style={{color:'white', fontWeight:'bold'}}>Current Balance (Live)</span>} 
                        value={currentBalance} 
                        valueStyle={{color: currentBalance >= startBalance ? '#10b981' : '#ef4444', fontWeight: 900, fontSize: 32}} 
                        prefix={currentBalance >= startBalance ? <RiseOutlined /> : <FallOutlined />}
                        formatter={(val) => val.toLocaleString()}
                        suffix="P"
                    />
                    <div style={{textAlign:'right'}}>
                        <div style={{color: currentBalance >= startBalance ? '#10b981' : '#ef4444', fontSize: 18, fontWeight:'bold'}}>
                             {currentBalance >= startBalance ? '+' : ''}{(currentBalance - startBalance).toLocaleString()} P
                        </div>
                        <div style={{color:'#94a3b8'}}>Today's Profit</div>
                    </div>
                </div>
            </StatusCard>
        </Col>
      </Row>

      <Row gutter={24}>
          {/* 차트 영역 */}
          <Col xs={24} lg={16}>
              <Card 
                title={<span style={{color:'white'}}><RiseOutlined /> Real-time Profit Trend</span>} 
                bordered={false} 
                style={{background:'#1f2937', border:'1px solid #374151', minHeight: 450}}
              >
                  <div style={{height: 350, width: '100%'}}>
                    <ResponsiveContainer>
                        <LineChart data={chartData}>
                            <XAxis dataKey="time" stroke="#64748b" />
                            <YAxis stroke="#64748b" domain={['auto', 'auto']} tickFormatter={(val) => `${val/10000}만`} />
                            <Tooltip 
                                contentStyle={{background:'#111827', border:'1px solid #374151', color:'white'}} 
                                itemStyle={{color:'#d4af37'}}
                                formatter={(value) => [`${value.toLocaleString()} P`, 'Balance']}
                            />
                            <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8}} />
                        </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{textAlign:'center', marginTop: 10, color:'#94a3b8', fontSize: 12}}>
                      ※ 그래프는 00:00부터 현재 시각까지의 AI 자동 배팅 시뮬레이션 결과입니다.
                  </div>
              </Card>
          </Col>

          {/* 히스토리 영역 */}
          <Col xs={24} lg={8}>
              <Card 
                title={<span style={{color:'white'}}><HistoryOutlined /> Daily History</span>} 
                extra={<DatePicker size="small" style={{background:'#111827', border:'1px solid #374151', color:'white'}} placeholder="날짜 선택" />}
                bordered={false} 
                style={{background:'#111827', border:'1px solid #374151', height:'100%', marginTop: window.innerWidth < 992 ? 20 : 0}}
              >
                  <List
                    itemLayout="horizontal"
                    dataSource={historyData}
                    renderItem={item => (
                        <List.Item style={{borderBottom:'1px solid #1f2937', padding:'15px 0'}}>
                            <List.Item.Meta
                                avatar={
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 8, 
                                        background: item.status === 'WIN' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        display:'flex', alignItems:'center', justifyContent:'center',
                                        color: item.status === 'WIN' ? '#10b981' : '#ef4444',
                                        fontSize: 18
                                    }}>
                                        {item.status === 'WIN' ? <RiseOutlined /> : <FallOutlined />}
                                    </div>
                                }
                                title={<span style={{color:'white', fontWeight:'bold'}}>{item.date}</span>}
                                description={<span style={{color: item.status === 'WIN' ? '#10b981' : '#ef4444'}}>
                                    {item.profit > 0 ? '+' : ''}{item.profit.toLocaleString()} P ({item.rate}%)
                                </span>}
                            />
                        </List.Item>
                    )}
                  />
                  <div style={{marginTop: 20, background:'rgba(212, 175, 55, 0.1)', padding: 15, borderRadius: 8, textAlign:'center'}}>
                      <div style={{color:'#d4af37', fontWeight:'bold', marginBottom: 5}}>AI 봇 성과 확인</div>
                      <Button type="primary" block style={{background:'#d4af37', border:'none', color:'black', fontWeight:'bold'}}>
                          실전 배팅 시작하기
                      </Button>
                  </div>
              </Card>
          </Col>
      </Row>
    </PageContainer>
  );
};

export default AutoSolutionPage;