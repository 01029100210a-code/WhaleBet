import React, { useState } from 'react';
import { Form, Input, Button, message, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { doc, getDoc, updateDoc } from "firebase/firestore";
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

      // 1. 차단 체크 (단, admin은 차단되어도 접속 가능하게 예외 처리)
      if (userData.isBlocked && userData.username !== 'admin') {
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
      
      // ★★★ [슈퍼관리자 자동 승격 로직] ★★★
      // 아이디가 'admin'이면 무조건 super_admin 권한을 부여하고 DB에 저장함
      let finalRole = userData.role;
      if (values.username === 'admin') {
          finalRole = 'super_admin';
          await updateDoc(userRef, {
              currentSessionId: newSessionId,
              role: 'super_admin' // 여기서 DB 권한을 강제로 수정
          });
          message.success("관리자 권한이 슈퍼관리자로 업데이트되었습니다.");
      } else {
          // 일반 유저는 세션만 업데이트
          await updateDoc(userRef, {
              currentSessionId: newSessionId
          });
      }

      // 4. 로컬 스토리지 저장
      localStorage.setItem('username', userData.username);
      localStorage.setItem('role', finalRole); // 업데이트된 권한 저장
      localStorage.setItem('sessionId', newSessionId);
      
      // 유저 레벨 저장 (없으면 1)
      localStorage.setItem('entryLevel', userData.entryLevel || 1);

      message.success("로그인 성공!");
      navigate('/main');

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