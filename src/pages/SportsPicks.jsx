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

const SportsPicks = () => {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 최신 50개만 가져옴
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

                      {/* 이미지 있으면 표시 */}
                      {item.image && (
                          <div style={{marginBottom: 15, borderRadius: 8, overflow: 'hidden'}}>
                              <Image src={item.image} alt="analysis" style={{width: '100%', objectFit:'cover'}} />
                          </div>
                      )}

                      {/* 텍스트 내용 */}
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