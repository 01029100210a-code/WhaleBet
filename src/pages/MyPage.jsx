import React, { useState, useEffect } from 'react';
import { Card, Typography, Descriptions, Tag, Input, Button, message, Modal, Carousel, Empty } from 'antd';
import { UserOutlined, GiftOutlined, ClockCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp, addDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; // firebase 경로 확인 필요

const { Title, Text } = Typography;

// 스타일 정의
const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  color: white;
  font-family: 'Noto Sans KR', sans-serif;
`;

const DarkCard = styled(Card)`
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 12px;
  margin-bottom: 20px;

  .ant-card-head {
    color: #d4af37;
    border-bottom: 1px solid #374151;
    font-size: 18px;
  }
  .ant-descriptions-item-label {
    color: #9ca3af !important;
  }
  .ant-descriptions-item-content {
    color: white !important;
  }
`;

// 슬라이더 아이템 스타일
const HistoryItem = styled.div`
  background: #111827;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #4b5563;
  margin: 0 10px; /* 슬라이드 간격 */
  height: 120px;
  display: flex !important; /* Carousel 내부 정렬용 */
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const MyPage = ({ user }) => {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 룰렛 기록 상태 관리
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // 컴포넌트 마운트 시 히스토리 가져오기
  useEffect(() => {
    if (user) {
      fetchRouletteHistory();
    }
  }, [user]);

  const fetchRouletteHistory = async () => {
    try {
      const q = query(
        collection(db, "roulette_history"),
        where("username", "==", user.username),
        orderBy("timestamp", "desc"), // 최신순 정렬
        limit(5) // 5개만
      );
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(data);
    } catch (error) {
      console.error("히스토리 로드 실패:", error);
      // 주의: Firestore 콘솔에서 복합 색인(Index) 생성이 필요할 수 있습니다.
      // 에러 발생 시 브라우저 콘솔의 링크를 클릭하여 인덱스를 생성해주세요.
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRedeem = async () => {
    if(!couponCode) return message.error("쿠폰번호 입력");
    setLoading(true);
    try {
        const couponRef = doc(db, "coupons", couponCode);
        const snap = await getDoc(couponRef);
        if(!snap.exists()) { message.error("유효하지 않은 쿠폰"); setLoading(false); return; }
        
        const data = snap.data();
        if(data.used) { message.error("이미 사용됨"); setLoading(false); return; }

        const userRef = doc(db, "users", user.username);
        const uSnap = await getDoc(userRef);
        const uData = uSnap.data();

        let currentExpiry = new Date();
        if (uData.expiryDate) {
            const exp = uData.expiryDate.toDate ? uData.expiryDate.toDate() : new Date(uData.expiryDate);
            if (exp > new Date()) currentExpiry = exp;
        }
        currentExpiry.setHours(currentExpiry.getHours() + data.hours);

        await updateDoc(userRef, { expiryDate: Timestamp.fromDate(currentExpiry) });
        await deleteDoc(couponRef);
        await addDoc(collection(db, "coupon_logs"), { username: user.username, type: 'COUPON_REDEEM', code: couponCode, amount: data.hours + ' Hours', created_at: Timestamp.now() });

        Modal.success({ title: '충전 성공!', content: `${data.hours}시간 연장됨` });
        setCouponCode('');
        setTimeout(()=>window.location.reload(), 1500);
    } catch(e) { message.error("오류 발생"); }
    setLoading(false);
  };

  if (!user) return <div style={{color:'white', padding:20}}>Loading user info...</div>;

  return (
    <Container>
      <Title level={2} style={{ color: '#d4af37', marginBottom: 30 }}>
        <UserOutlined /> MY PAGE
      </Title>

      {/* 1. 내 정보 카드 */}
      <DarkCard title="내 정보">
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label="아이디">{user.username}</Descriptions.Item>
          <Descriptions.Item label="등급"><Tag color="cyan">{user.role ? user.role.toUpperCase() : 'USER'}</Tag></Descriptions.Item>
          <Descriptions.Item label="이용권 만료일">
             <span style={{color: '#00e5ff', fontWeight:'bold', fontSize:16}}>
                <ClockCircleOutlined /> {user.expiryDate ? new Date(user.expiryDate.seconds * 1000).toLocaleString() : '만료됨'}
             </span>
          </Descriptions.Item>
        </Descriptions>
      </DarkCard>

      {/* 2. 쿠폰 등록 카드 */}
      <DarkCard title={<span><GiftOutlined /> 쿠폰 등록</span>}>
        <div style={{display:'flex', gap: 10, maxWidth: 600}}>
            <Input 
                placeholder="쿠폰 코드 입력" 
                value={couponCode} 
                onChange={(e)=>setCouponCode(e.target.value)} 
                style={{background:'#111827', border:'1px solid #374151', color:'white', height: 50}} 
            />
            <Button 
                type="primary" 
                size="large" 
                style={{height: 50, background: '#d4af37', borderColor: '#d4af37', color:'black', fontWeight:'bold'}} 
                onClick={handleRedeem} 
                loading={loading}
            >
                등록
            </Button>
        </div>
      </DarkCard>

      {/* 3. 룰렛 히스토리 카드 (NEW) */}
      <DarkCard title={<span><HistoryOutlined /> 룰렛 참여 기록 (최근 5회)</span>}>
        {historyLoading ? (
           <div style={{textAlign:'center', color:'#9ca3af'}}>기록 불러오는 중...</div>
        ) : history.length > 0 ? (
          <div style={{ padding: '0 20px' }}>
            <Carousel autoplay dots={false} slidesToShow={3} slidesToScroll={1} responsive={[
                { breakpoint: 768, settings: { slidesToShow: 1 } } // 모바일에서는 1개씩
            ]}>
                {history.map((item) => (
                    <div key={item.id} style={{ padding: 10 }}>
                        <HistoryItem>
                            <div>
                                {item.isWin ? (
                                    <Tag color="gold" style={{marginBottom: 8}}>🎉 당첨</Tag>
                                ) : (
                                    <Tag color="default" style={{marginBottom: 8}}>꽝</Tag>
                                )}
                            </div>
                            <Text style={{ color: item.isWin ? '#fbbf24' : '#d1d5db', fontSize: 16, fontWeight: 'bold', display:'block' }}>
                                Result: {item.result}
                            </Text>
                            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 5, display:'block' }}>
                                {item.timestamp ? new Date(item.timestamp.toDate()).toLocaleString() : ''}
                            </Text>
                        </HistoryItem>
                    </div>
                ))}
            </Carousel>
          </div>
        ) : (
          <Empty 
            description={<span style={{color:'#9ca3af'}}>참여 기록이 없습니다.</span>} 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
          />
        )}
      </DarkCard>

    </Container>
  );
};

export default MyPage;