import React, { useState, useEffect } from 'react';
import { Calendar, Button, Card, message, Modal, Row, Col, Statistic, Tag, ConfigProvider, theme } from 'antd';
import { CheckCircleOutlined, GiftOutlined, CrownOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from '../firebase';
import dayjs from 'dayjs';

const PageContainer = styled.div` padding: 20px; background: transparent; height: 100%; color: white; overflow-y: auto; `;
const StyledCalendarWrapper = styled.div`
  background: #1f2937; border-radius: 12px; padding: 20px; border: 1px solid #374151;
  .ant-picker-calendar { background: transparent !important; }
  .ant-picker-calendar .ant-picker-panel { background: transparent !important; }
  .ant-picker-content th { color: #94a3b8 !important; }
  .ant-picker-calendar-date-value { color: #cbd5e1 !important; }
  .ant-picker-cell-in-view.ant-picker-cell-selected .ant-picker-calendar-date { background: rgba(212, 175, 55, 0.2) !important; }
`;

const AttendancePage = () => {
  const [attendanceDates, setAttendanceDates] = useState([]);
  const [streak, setStreak] = useState(0);
  const username = localStorage.getItem('username');

  useEffect(() => {
    if (username) fetchAttendance();
  }, [username]);

  const fetchAttendance = async () => {
    try {
      const docRef = doc(db, "users", username);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
          const data = docSnap.data();
          setAttendanceDates(data.attendance || []);
          setStreak(data.streak || 0);
      }
    } catch (error) {
      console.error("출석 데이터 로드 실패", error);
    }
  };

  const handleCheckIn = async () => {
    const today = dayjs().format('YYYY-MM-DD');
    if (attendanceDates.includes(today)) { message.warning("오늘은 이미 출석했습니다."); return; }

    try {
      const newStreak = streak + 1;
      const docRef = doc(db, "users", username);
      
      await updateDoc(docRef, { 
          attendance: arrayUnion(today),
          streak: newStreak
      });
      
      setAttendanceDates([...attendanceDates, today]);
      setStreak(newStreak);
      message.success("출석체크 완료!");
      checkRewards(newStreak);
    } catch (error) {
      message.error("출석 체크 중 오류가 발생했습니다.");
    }
  };

  const checkRewards = (currentStreak) => {
    if (currentStreak === 7) {
        Modal.success({ title: '🎉 7일 연속 출석 달성!', content: '1시간 무료 이용권이 쿠폰함으로 지급되었습니다.' });
    } else if (currentStreak === 15) {
        Modal.success({ title: '🔥 15일 연속 출석 달성!', content: '3시간 무료 이용권이 지급되었습니다! 대단해요!' });
    } else if (currentStreak === 30) {
        Modal.success({ title: '👑 한 달 개근상!', content: '3일 무제한 이용권이 지급되었습니다.' });
    }
  };

  const dateCellRender = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    if (attendanceDates.includes(dateStr)) {
      return (
        <div style={{textAlign:'center', marginTop: 5}}>
            <CheckCircleOutlined style={{color:'#10b981', fontSize: 20}} />
            <div style={{fontSize: 10, color:'#10b981'}}>출석</div>
        </div>
      );
    }
    return null;
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <PageContainer>
          <Row gutter={24}>
              <Col xs={24} lg={16}>
                  <div style={{marginBottom: 20, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <h2 style={{color:'white', margin:0}}>📅 스마트 출석부</h2>
                        <span style={{color:'#94a3b8', fontSize:12}}>매일 출석하고 자동 쿠폰 혜택을 받으세요.</span>
                      </div>
                      <Button type="primary" size="large" onClick={handleCheckIn} style={{background:'#d4af37', border:'none', fontWeight:'bold', height: 45, color:'black'}}>
                          오늘 출석하기
                      </Button>
                  </div>
                  <StyledCalendarWrapper>
                    <Calendar dateCellRender={dateCellRender} fullscreen={false} />
                  </StyledCalendarWrapper>
              </Col>
              <Col xs={24} lg={8}>
                  <Card title={<span style={{color:'white'}}><GiftOutlined /> REWARD SYSTEM</span>} bordered={false} style={{background:'#1f2937', border:'1px solid #374151', height:'100%', marginTop: window.innerWidth < 992 ? 20 : 0}}>
                      <div style={{textAlign:'center', marginBottom: 30}}>
                          <Statistic title="현재 연속 출석" value={streak} suffix="일째" valueStyle={{color:'#d4af37', fontWeight:'bold', fontSize: 32}} />
                      </div>
                      
                      <div style={{display:'flex', flexDirection:'column', gap: 15}}>
                          <div style={{background: streak >= 7 ? 'rgba(16, 185, 129, 0.2)' : '#111827', padding: 15, borderRadius: 8, border: streak >= 7 ? '1px solid #10b981' : '1px solid #374151', display:'flex', alignItems:'center', gap: 15}}>
                              <div style={{background:'#10b981', width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', color:'white'}}>7</div>
                              <div style={{flex:1}}>
                                  <div style={{color:'white', fontWeight:'bold'}}>7일 연속</div>
                                  <div style={{color:'#94a3b8', fontSize:12}}>1시간 이용권</div>
                              </div>
                              {streak >= 7 && <Tag color="success">지급완료</Tag>}
                          </div>

                          <div style={{background: streak >= 15 ? 'rgba(59, 130, 246, 0.2)' : '#111827', padding: 15, borderRadius: 8, border: streak >= 15 ? '1px solid #3b82f6' : '1px solid #374151', display:'flex', alignItems:'center', gap: 15}}>
                              <div style={{background:'#3b82f6', width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', color:'white'}}>15</div>
                              <div style={{flex:1}}>
                                  <div style={{color:'white', fontWeight:'bold'}}>15일 연속</div>
                                  <div style={{color:'#94a3b8', fontSize:12}}>3시간 이용권</div>
                              </div>
                          </div>

                          <div style={{background: '#111827', padding: 15, borderRadius: 8, border: '1px solid #d4af37', display:'flex', alignItems:'center', gap: 15}}>
                              <div style={{background:'#d4af37', width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', color:'black'}}><CrownOutlined /></div>
                              <div style={{flex:1}}>
                                  <div style={{color:'#d4af37', fontWeight:'bold'}}>한 달 개근</div>
                                  <div style={{color:'#94a3b8', fontSize:12}}>3일 무제한 이용권</div>
                              </div>
                          </div>
                      </div>
                  </Card>
              </Col>
          </Row>
      </PageContainer>
    </ConfigProvider>
  );
};

export default AttendancePage;