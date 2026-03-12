import React, { useState } from 'react';
import { Card, Typography, Descriptions, Tag, Input, Button, message, Divider, Modal } from 'antd';
import { UserOutlined, GiftOutlined, ClockCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

const { Title, Text } = Typography;
const Container = styled.div` max-width: 1000px; margin: 0 auto; padding: 20px; color: white; font-family: 'Noto Sans KR', sans-serif; `;
const DarkCard = styled(Card)` background: #1f2937; border: 1px solid #374151; border-radius: 12px; margin-bottom: 20px; .ant-card-head { color: #d4af37; border-bottom: 1px solid #374151; } .ant-descriptions-item-label { color: #9ca3af !important; } .ant-descriptions-item-content { color: white !important; } `;

const MyPage = ({ user }) => {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);

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

  if (!user) return <div>Loading...</div>;

  return (
    <Container>
      <Title level={2} style={{ color: '#d4af37', marginBottom: 30 }}><UserOutlined /> MY PAGE</Title>
      <DarkCard title="내 정보">
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label="아이디">{user.username}</Descriptions.Item>
          <Descriptions.Item label="등급"><Tag color="cyan">{user.role.toUpperCase()}</Tag></Descriptions.Item>
          <Descriptions.Item label="이용권 만료일">
             <span style={{color: '#00e5ff', fontWeight:'bold', fontSize:16}}>
                <ClockCircleOutlined /> {user.expiryDate ? new Date(user.expiryDate.seconds * 1000).toLocaleString() : '만료됨'}
             </span>
          </Descriptions.Item>
        </Descriptions>
      </DarkCard>

      <DarkCard title={<span><GiftOutlined /> 쿠폰 등록</span>}>
        <div style={{display:'flex', gap: 10, maxWidth: 600}}>
            <Input placeholder="쿠폰 코드 입력" value={couponCode} onChange={(e)=>setCouponCode(e.target.value)} style={{background:'#111827', border:'1px solid #374151', color:'white', height: 50}} />
            <Button type="primary" size="large" style={{height: 50, background: '#d4af37', borderColor: '#d4af37', color:'black', fontWeight:'bold'}} onClick={handleRedeem} loading={loading}>등록</Button>
        </div>
      </DarkCard>
    </Container>
  );
};
export default MyPage;