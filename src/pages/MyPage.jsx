import React, { useState } from 'react';
import { Card, Typography, Descriptions, Tag, Input, Button, message, Divider } from 'antd';
import { UserOutlined, SafetyCertificateOutlined, GiftOutlined, ClockCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

const { Title, Text } = Typography;

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const DarkCard = styled(Card)`
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 12px;
  .ant-descriptions-item-label { color: #9ca3af; }
  .ant-descriptions-item-content { color: #fff; font-weight: 500; }
  .ant-card-head { border-bottom: 1px solid #374151; color: white; }
`;

const MyPage = ({ user }) => {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);

  // 🎁 쿠폰 등록 함수
  const handleRedeemCoupon = async () => {
    if (!couponCode) return message.error('쿠폰 코드를 입력하세요.');
    setLoading(true);

    try {
      // 1. 쿠폰 조회
      const couponRef = doc(db, "coupons", couponCode);
      const couponSnap = await getDoc(couponRef);

      if (!couponSnap.exists()) {
        message.error('유효하지 않은 쿠폰입니다.');
        setLoading(false);
        return;
      }

      const couponData = couponSnap.data();
      if (couponData.used) {
        message.error('이미 사용된 쿠폰입니다.');
        setLoading(false);
        return;
      }

      // 2. 이용권 기간 연장
      const userRef = doc(db, "users", user.username);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      // 현재 만료일 확인 (없으면 오늘부터 시작)
      let currentExpiry = new Date();
      if (userData.expiryDate) {
          const expiryDate = userData.expiryDate.toDate ? userData.expiryDate.toDate() : new Date(userData.expiryDate);
          if (expiryDate > new Date()) currentExpiry = expiryDate;
      }

      // 쿠폰 종류에 따른 시간 추가 (Hours)
      const addHours = couponData.hours || 24; // 기본 24시간
      currentExpiry.setHours(currentExpiry.getHours() + addHours);

      // 3. DB 업데이트 (유저 날짜 연장 + 쿠폰 사용 처리)
      await updateDoc(userRef, {
          expiryDate: Timestamp.fromDate(currentExpiry)
      });
      await deleteDoc(couponRef); // 쿠폰 삭제 (재사용 방지)

      message.success(`${addHours}시간 이용권이 충전되었습니다!`);
      setCouponCode('');
      
      // 새로고침해야 반영됨 (Context 안 써서 임시방편)
      setTimeout(() => window.location.reload(), 1000);

    } catch (error) {
      console.error(error);
      message.error('쿠폰 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Title level={2} style={{ color: '#fff', marginBottom: 30 }}>
        <UserOutlined /> 마이페이지
      </Title>

      <DarkCard title="내 정보 (My Profile)">
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label="아이디">{user.username}</Descriptions.Item>
          <Descriptions.Item label="이름">{user.name}</Descriptions.Item>
          <Descriptions.Item label="등급">
            {user.role === 'admin' ? <Tag color="gold">관리자</Tag> : <Tag color="blue">일반회원</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="가입일">
            {user.created_at ? new Date(user.created_at.seconds * 1000).toLocaleDateString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="이용권 상태">
             <span style={{color: '#00e5ff', fontWeight:'bold'}}>
                <ClockCircleOutlined /> {user.expiryDate ? new Date(user.expiryDate.seconds * 1000).toLocaleString() : '만료됨'} 까지
             </span>
          </Descriptions.Item>
        </Descriptions>
      </DarkCard>

      <Divider style={{borderColor:'#374151'}} />

      <DarkCard title={<span><GiftOutlined /> 이용권 / 포인트 쿠폰 등록</span>}>
        <div style={{display:'flex', gap: 10}}>
            <Input 
                placeholder="쿠폰 번호를 입력하세요 (예: BONUS-2024)" 
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                style={{background:'#111827', border:'1px solid #374151', color:'white', height: 50, fontSize:16}}
            />
            <Button 
                type="primary" 
                size="large" 
                style={{height: 50, background: '#d4af37', borderColor: '#d4af37', color:'black', fontWeight:'bold'}}
                onClick={handleRedeemCoupon}
                loading={loading}
            >
                쿠폰 등록
            </Button>
        </div>
        <Text type="secondary" style={{display:'block', marginTop: 10}}>
            * 관리자에게 발급받은 쿠폰을 입력하면 이용 기간이 즉시 연장됩니다.
        </Text>
      </DarkCard>

    </Container>
  );
};

export default MyPage;