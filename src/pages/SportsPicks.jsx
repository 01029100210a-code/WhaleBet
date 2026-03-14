import React, { useState, useEffect } from 'react';
import { Card, Tag, Spin, Image, Avatar, Empty } from 'antd';
import { TrophyOutlined, ClockCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from '../firebase';
import dayjs from 'dayjs';

const PageContainer = styled.div` padding: 20px; color: white; overflow-y: auto; height: 100%; `;
const FeedContainer = styled.div` max-width: 800px; margin: 0 auto; `;

const TelegramCard = styled(Card)`
  background: #1f2937; border: 1px solid #374151; margin-bottom: 20px; border-radius: 12px;
  .ant-card-body { padding: 20px; }
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
  &:hover { transform: translateY(-2px); border-color: #d4af37; }
`;

// 🔥 [NEW] 이미지 컨테이너 (로고 오버레이를 위해 relative 설정)
const ImageContainer = styled.div`
  position: relative;
  margin-bottom: 15px;
  border-radius: 8px;
  overflow: hidden;
`;

// 🔥 [NEW] 이미지 위 가짜 로고 (SCORES24 가리기용)
const LogoOverlay = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.85); /* 진한 검정 배경 */
  color: #d4af37; /* 금색 글씨 */
  padding: 6px 12px;
  font-weight: 900;
  font-size: 16px;
  border-radius: 6px;
  border: 1px solid #d4af37;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  gap: 5px;
  
  /* 아이콘 추가 */
  &::before {
    content: "♛"; 
    font-size: 14px;
  }
`;

const SportsPicks = () => {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
        collection(db, "sports_picks"),
        orderBy("timestamp", "desc"),
        limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPicks(data);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <PageContainer>
      <div style={{textAlign:'center', marginBottom: 40}}>
          <Tag color="gold" style={{padding: '5px 15px', fontSize: 14, marginBottom: 10}}>PREMIUM SERVICE</Tag>
          <h1 style={{color:'white', margin:0, fontSize: 28}}>🏆 유료 스포츠 분석 픽</h1>
          <p style={{color:'#94a3b8', marginTop: 10}}>해외 유료 팁스터의 분석 내용을 실시간으로 제공합니다. (자동 번역)</p>
      </div>

      <FeedContainer>
          {loading ? (
              <div style={{textAlign:'center', marginTop: 50}}>
                  <Spin size="large" tip="분석 데이터 불러오는 중..." />
              </div>
          ) : picks.length > 0 ? (
              picks.map((item) => (
                  <TelegramCard key={item.id} bordered={false}>
                      <div style={{display:'flex', justifyContent:'space-between', marginBottom: 15}}>
                          <div style={{display:'flex', alignItems:'center', gap: 10}}>
                              <Avatar icon={<TrophyOutlined />} style={{backgroundColor: '#d4af37'}} />
                              <span style={{color:'white', fontWeight:'bold'}}>Bet of the Day</span>
                          </div>
                          <span style={{color:'#6b7280', fontSize: 12}}>
                              <ClockCircleOutlined style={{marginRight: 5}} />
                              {dayjs(item.timestamp?.toDate()).format('MM-DD HH:mm')}
                          </span>
                      </div>

                      {/* 🔥 [수정] 이미지 렌더링 부분 (로고 오버레이 적용) */}
                      {item.image && (
                          <ImageContainer>
                              <Image 
                                src={item.image} 
                                alt="analysis" 
                                style={{width: '100%', objectFit:'cover', display:'block'}} 
                              />
                              {/* 가짜 로고로 원본 로고 가리기 */}
                              <LogoOverlay>WB SPORTS AI</LogoOverlay>
                          </ImageContainer>
                      )}

                      <div style={{color:'#e5e7eb', whiteSpace: 'pre-line', lineHeight: '1.6', fontSize: 15}}>
                          {item.content}
                      </div>
                  </TelegramCard>
              ))
          ) : (
              <Empty description={<span style={{color:'#94a3b8'}}>등록된 픽이 없습니다.</span>} />
          )}
      </FeedContainer>
    </PageContainer>
  );
};

export default SportsPicks;