import React, { useState } from 'react';
import { Form, Input, Button, message, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { doc, getDoc, updateDoc } from "firebase/firestore";
// src/pages 안에 있으므로 firebase는 ../ 로 나갑니다.
import { db } from '../firebase'; 
import bcrypt from 'bcryptjs';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

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
  border: 1px solid #374151;
  .ant-card-head-title { color: #d4af37; text-align: center; font-size: 24px; font-weight: bold; }
  label { color: #9ca3af !important; }
  input { background-color: #374151; color: white; border: 1px solid #4b5563; }
`;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", values.username);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        message.error("존재하지 않는 아이디입니다.");
        setLoading(false);
        return;
      }

      const userData = userSnap.data();

      // 1. 차단된 유저인지 확인
      if (userData.isBlocked) {
        message.error("관리자에 의해 접속이 차단된 계정입니다.");
        setLoading(false);
        return;
      }

      // 2. 비밀번호 확인
      const isMatch = await bcrypt.compare(values.password, userData.password);
      if (!isMatch) {
        message.error("비밀번호가 일치하지 않습니다.");
        setLoading(false);
        return;
      }

      // 3. 세션 ID 생성 (이중 접속 방지용)
      const newSessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      // DB에 저장
      await updateDoc(userRef, {
        currentSessionId: newSessionId
      });

      // 내 로컬에 저장
      localStorage.setItem('username', userData.username);
      localStorage.setItem('role', userData.role);
      localStorage.setItem('sessionId', newSessionId);

      message.success("로그인 성공!");

      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/main');
      }

    } catch (error) {
      console.error(error);
      message.error("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <StyledCard title="WHALEBET LOGIN" bordered={false}>
        <Form name="login" onFinish={onFinish} layout="vertical">
          <Form.Item name="username" rules={[{ required: true, message: '아이디 입력 필수' }]}>
            <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '비밀번호 입력 필수' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ backgroundColor: '#d4af37', borderColor: '#d4af37' }}>
              로그인
            </Button>
          </Form.Item>
        </Form>
      </StyledCard>
    </Container>
  );
};

export default Login;