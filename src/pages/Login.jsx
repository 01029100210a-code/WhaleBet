import React, { useState } from 'react';
import { Form, Input, Button, message, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from "firebase/firestore"; // updateDoc 추가
import { db } from '../firebase';
import bcrypt from 'bcryptjs';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #111827;
`;

const StyledCard = styled(Card)`
  width: 400px;
  background-color: #1f2937;
  border-color: #374151;
  .ant-card-head { border-bottom: 1px solid #374151; color: white; }
  .ant-form-item-label > label { color: #d1d5db; }
  input { background-color: #374151; border-color: #4b5563; color: white; }
  input::placeholder { color: #9ca3af; }
`;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", values.username);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();

        // 1. 차단된 유저인지 확인 (Block Check)
        if (userData.isBlocked) {
            message.error("관리자에 의해 접속이 차단된 계정입니다.");
            setLoading(false);
            return;
        }

        // 2. 비밀번호 확인
        const isMatch = await bcrypt.compare(values.password, userData.password);
        if (isMatch) {
          // 3. 🔥 중복 로그인 방지 핵심 로직
          const newSessionId = Date.now().toString(); // 현재 시간으로 고유 ID 생성

          // DB에 '현재 접속중인 세션 ID'를 기록함
          await updateDoc(userRef, { 
              currentSessionId: newSessionId,
              lastLoginAt: new Date()
          });

          // 내 브라우저에도 저장
          localStorage.setItem('sessionId', newSessionId);
          
          // 기존 로그인 로직
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userRole', userData.role);
          localStorage.setItem('username', values.username);
          localStorage.setItem('entryLevel', userData.entryLevel || 1);
          
          message.success('로그인 성공!');
          navigate(userData.role === 'admin' ? '/admin' : '/dashboard');
        } else {
          message.error('비밀번호가 일치하지 않습니다.');
        }
      } else {
        message.error('존재하지 않는 아이디입니다.');
      }
    } catch (error) {
      console.error("Login Error:", error);
      message.error('로그인 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  return (
    <Container>
      <StyledCard title="WHALEBET LOGIN" bordered={false}>
        <Form name="login" onFinish={onFinish} layout="vertical">
          <Form.Item name="username" rules={[{ required: true, message: '아이디를 입력하세요' }]}>
            <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력하세요' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ background: '#d4af37', borderColor: '#d4af37' }}>
              로그인
            </Button>
          </Form.Item>
        </Form>
      </StyledCard>
    </Container>
  );
};

export default Login;