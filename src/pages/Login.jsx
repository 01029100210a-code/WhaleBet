import React, { useState } from 'react';
import { Form, Input, Button, message, Typography, Card, Tabs, Alert } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined, PhoneOutlined, KeyOutlined } from '@ant-design/icons';
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import styled from 'styled-components';
import bcrypt from 'bcryptjs';

const { Title, Text } = Typography;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #0b1219;
  background-image: radial-gradient(circle at 50% 50%, #1f2937 0%, #0b1219 100%);
`;

const LoginCard = styled(Card)`
  width: 420px;
  background: rgba(31, 41, 55, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid #374151;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);

  .ant-tabs-tab { color: #9ca3af; }
  .ant-tabs-tab-active .ant-tabs-tab-btn { color: #d4af37 !important; }
  .ant-tabs-ink-bar { background: #d4af37; }
  
  .ant-input-affix-wrapper {
    background-color: #111827;
    border-color: #374151;
    color: white;
    padding: 10px;
  }
  .ant-input { background-color: transparent; color: white; }
`;

const GoldButton = styled(Button)`
  background: linear-gradient(90deg, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c);
  border: none;
  color: #000;
  font-weight: bold;
  height: 45px;
  font-size: 16px;
  margin-top: 10px;
  
  &:hover {
    opacity: 0.9;
    color: #000 !important;
  }
`;

const Login = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      // 1. IP 주소 가져오기
      let userIp = 'Unknown';
      try {
          const ipRes = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipRes.json();
          userIp = ipData.ip;
      } catch (e) { console.error("IP check failed"); }

      // 2. 유저 확인
      const q = query(collection(db, "users"), where("username", "==", values.username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        message.error("존재하지 않는 아이디입니다.");
        setLoading(false);
        return;
      }

      const userData = querySnapshot.docs[0].data();
      
      const isMatch = await bcrypt.compare(values.password, userData.password);
      if (!isMatch) {
        message.error("비밀번호가 일치하지 않습니다.");
        setLoading(false);
        return;
      }

      if (userData.status !== 'active') {
        message.warning("관리자 승인 대기 중입니다.");
        setLoading(false);
        return;
      }

      // 🔥 3. 로그인 정보 업데이트 (IP, 접속시간, 상태)
      await updateDoc(doc(db, "users", userData.username), {
        last_login_at: serverTimestamp(),
        last_active_at: serverTimestamp(),
        ip_address: userIp,
        is_online: true
      });

      message.success(`${userData.name}님 환영합니다!`);
      // 최신 정보로 갱신하여 전달
      onLoginSuccess({ ...userData, ip_address: userIp, is_online: true });

    } catch (error) {
      console.error(error);
      message.error("로그인 오류");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (values) => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("username", "==", values.username));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        message.error("이미 사용 중인 아이디입니다.");
        setLoading(false);
        return;
      }

      const hashedPassword = await bcrypt.hash(values.password, 10);

      await setDoc(doc(db, "users", values.username), {
        username: values.username,
        password: hashedPassword,
        name: values.name,
        phone: values.phone,
        referral_code: values.referral_code,
        role: 'user',
        status: 'pending',
        created_at: serverTimestamp()
      });

      message.success("가입 신청 완료! 승인을 기다려주세요.");
      
    } catch (error) {
      console.error(error);
      message.error("가입 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <LoginCard bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <Title level={2} style={{ color: 'white', margin: 0, letterSpacing: 2 }}>WHALEBET</Title>
          <Text type="secondary" style={{ color: '#9ca3af' }}>Premium Baccarat Analyzer</Text>
        </div>

        <Tabs
          defaultActiveKey="1"
          centered
          items={[
            {
              key: '1',
              label: '로그인',
              children: (
                <Form onFinish={handleLogin} layout="vertical">
                  <Form.Item name="username" rules={[{ required: true }]}>
                    <Input prefix={<UserOutlined />} placeholder="아이디" size="large" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" size="large" />
                  </Form.Item>
                  <GoldButton type="primary" htmlType="submit" block loading={loading}>
                    로그인
                  </GoldButton>
                </Form>
              ),
            },
            {
              key: '2',
              label: '회원가입 신청',
              children: (
                <Form onFinish={handleSignup} layout="vertical">
                  <Alert message="승인제 운영" description="가입 코드가 필요합니다." type="warning" showIcon style={{marginBottom: 15, background:'#451d08', border:'none', color:'#ffd591'}} />
                  <Form.Item name="username" rules={[{ required: true, min: 4 }]}>
                    <Input prefix={<UserOutlined />} placeholder="아이디" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, min: 6 }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
                  </Form.Item>
                  <Form.Item name="name" rules={[{ required: true }]}>
                    <Input prefix={<SafetyCertificateOutlined />} placeholder="이름" />
                  </Form.Item>
                  <Form.Item name="phone" rules={[{ required: true }]}>
                    <Input prefix={<PhoneOutlined />} placeholder="연락처" />
                  </Form.Item>
                  <Form.Item name="referral_code" rules={[{ required: true }]}>
                    <Input prefix={<KeyOutlined />} placeholder="가입 코드" style={{borderColor: '#d4af37'}} />
                  </Form.Item>
                  <GoldButton type="primary" htmlType="submit" block loading={loading}>
                    가입 신청하기
                  </GoldButton>
                </Form>
              ),
            },
          ]}
        />
      </LoginCard>
    </Container>
  );
};

export default Login;