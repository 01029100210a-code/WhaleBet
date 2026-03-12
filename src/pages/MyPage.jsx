import React, { useState } from 'react';
import { Card, Typography, Descriptions, Tag, Input, Button, message, Divider, Modal } from 'antd';
import { UserOutlined, SafetyCertificateOutlined, GiftOutlined, ClockCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

const { Title, Text } = Typography;

const Container = styled.div`
  max-width: 1000px; margin: 0 auto; padding: 20px; color: white;
`;

const DarkCard = styled(Card)`
  background: #1f2937; border: 1px solid #374151; border-radius: 12px; margin-bottom: 20px;
  .ant-descriptions-item-label { color: #9ca3af !important; }
  .ant-descriptions-item-content { color: #fff !important; font-weight: 500; }
  .ant-card-head { border-bottom: 1px solid #374151; color: #d4af37; font-weight: bold; font-size: 18px; }
`;

const MyPage = ({ user }) => {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);

  // 🎁 쿠폰 등록 함수
  const handleRedeemCoupon = async () => {
    if (!couponCode) return message.error('쿠폰 코드를 입력하세요.');
    setLoading(true);

    try {
      // 1. 쿠폰 조회 (admins가 생성한 쿠폰)
      const couponRef = doc(db, "coupons", couponCode);
      const couponSnap = await getDoc(couponRef);

      if (!couponSnap.exists()) {
        message.error('유효하지 않은 쿠폰입니다.');
        setLoading(false); return;
      }

      // 2. 이용권 기간 연장
      const userRef = doc(db, "users", user.username);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      let currentExpiry = new Date();
      if (userData.expiryDate) {
          const expiryDate = userData.expiryDate.toDate ? userData.expiryDate.toDate() : new Date(userData.expiryDate);
          if (expiryDate > new Date()) currentExpiry = expiryDate;
      }

      // 쿠폰 데이터 가져오기 (시간 or 포인트)
      const couponData = couponSnap.data();
      const addHours = couponData.hours || 24; 
      currentExpiry.setHours(currentExpiry.getHours() + addHours);

      // 3. DB 업데이트 (유저 날짜 연장)
      await updateDoc(userRef, { expiryDate: Timestamp.fromDate(currentExpiry) });
      
      // 4. 쿠폰 삭제 (재사용 방지)
      await deleteDoc(couponRef); 

      // 5. ★ [핵심] 로그 남기기 (관리자가 추적 가능하게)
      await addDoc(collection(db, "coupon_logs"), {
          username: user.username,
          type: 'COUPON_REDEEM',
          code: couponCode,
          amount: addHours + ' Hours',
          created_at: Timestamp.now()
      });

      Modal.success({ title: '충전 완료!', content: `${addHours}시간 이용권이 연장되었습니다.` });
      setCouponCode('');
      
      // 새로고침 (정보 갱신)
      setTimeout(() => window.location.reload(), 1500);

    } catch (error) {
      console.error(error);
      message.error('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <Container>
      <Title level={2} style={{ color: '#d4af37', marginBottom: 30, textShadow:'0 0 10px rgba(212,175,55,0.3)' }}>
        <UserOutlined /> MY PAGE
      </Title>

      <DarkCard title="내 정보 (Profile)">
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label="아이디">{user.username}</Descriptions.Item>
          <Descriptions.Item label="권한">
            {user.role === 'super_admin' ? <Tag color="gold">최고관리자</Tag> : 
             user.role === 'admin' ? <Tag color="orange">관리자</Tag> : 
             user.role === 'distributor' ? <Tag color="magenta">총판</Tag> : <Tag color="blue">일반회원</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="현재 레벨"><Tag color="cyan">{user.entryLevel} 단계</Tag></Descriptions.Item>
          <Descriptions.Item label="이용권 만료일">
             <span style={{color: '#00e5ff', fontWeight:'bold', fontSize: 16}}>
                <ClockCircleOutlined /> {user.expiryDate ? new Date(user.expiryDate.seconds * 1000).toLocaleString() : '만료됨 (이용불가)'}
             </span>
          </Descriptions.Item>
        </Descriptions>
      </DarkCard>

      <DarkCard title={<span><GiftOutlined /> 쿠폰 등록 (Voucher Redeem)</span>}>
        <div style={{display:'flex', gap: 10, maxWidth: 600}}>
            <Input 
                placeholder="관리자에게 받은 쿠폰 코드를 입력하세요" 
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                style={{background:'#111827', border:'1px solid #374151', color:'white', height: 50, fontSize:16}}
            />
            <Button 
                type="primary" 
                size="large" 
                style={{height: 50, background: '#d4af37', borderColor: '#d4af37', color:'black', fontWeight:'bold', width: 120}}
                onClick={handleRedeemCoupon}
                loading={loading}
            >
                등록하기
            </Button>
        </div>
        <Text type="secondary" style={{display:'block', marginTop: 15, color:'#6b7280'}}>
            * 룰렛 이벤트 당첨은 자동으로 적립되며, 별도 쿠폰 입력이 필요 없습니다.
        </Text>
      </DarkCard>
    </Container>
  );
};

export default MyPage;