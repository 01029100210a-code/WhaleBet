import React, { useState } from 'react';
import { Form, Input, Button, message, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from './firebase'; // 경로 확인 필요
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
  
  .ant-card-head-title {
    color: #d4af37;
    text-align: center;
    font-size: 24px;
    font-weight: bold;
  }
  
  label { color: #9ca3af !important; }
  input { background-color: #374151; color: white; border: 1px solid #4b5563; }
  input:hover, input:focus { border-color: #d4af37; box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2); }
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

      // 1. [차단 체크] 관리자가 차단했는지 확인
      if (userData.isBlocked) {
        message.error("관리자에 의해 접속이 차단된 계정입니다. 관리자에게 문의하세요.");
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

      // 3. [이중 접속 방지 핵심] 고유 세션 ID 생성
      // 시간 + 랜덤문자열 조합
      const newSessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

      // 4. DB에 현재 세션 ID 업데이트 (이전 접속자는 튕기게 됨)
      await updateDoc(userRef, {
        currentSessionId: newSessionId
      });

      // 5. 로컬 스토리지 저장
      localStorage.setItem('username', userData.username);
      localStorage.setItem('role', userData.role);
      localStorage.setItem('sessionId', newSessionId); // ★ 중요: 내 세션 ID 저장

      message.success("로그인 성공!");

      // 6. 페이지 이동
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
        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '아이디를 입력해주세요!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '비밀번호를 입력해주세요!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              size="large" 
              loading={loading}
              style={{ backgroundColor: '#d4af37', borderColor: '#d4af37', marginTop: '10px' }}
            >
              로그인
            </Button>
          </Form.Item>
        </Form>
      </StyledCard>
    </Container>
  );
};

export default Login;