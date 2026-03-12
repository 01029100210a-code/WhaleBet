import React, { useState } from 'react';
import { Form, Input, Button, message, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from '../firebase'; 
import bcrypt from 'bcryptjs';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #111827;
`;
const StyledCard = styled(Card)`
  width: 400px; background-color: #1f2937; border: 1px solid #374151;
  .ant-card-head-title { color: #d4af37; text-align: center; font-size: 24px; font-weight: bold; }
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
        setLoading(false); return;
      }

      const userData = userSnap.data();

      // 1. 차단 체크
      if (userData.isBlocked) {
        message.error("관리자에 의해 접속이 차단되었습니다.");
        setLoading(false); return;
      }

      // 2. 비밀번호 확인
      const isMatch = await bcrypt.compare(values.password, userData.password);
      if (!isMatch) {
        message.error("비밀번호 불일치");
        setLoading(false); return;
      }

      // 3. 세션 ID 생성
      const newSessionId = Date.now().toString() + Math.random().toString(36).substr(2);
      await updateDoc(userRef, { currentSessionId: newSessionId });

      localStorage.setItem('username', userData.username);
      localStorage.setItem('role', userData.role); // 권한 저장 (super_admin, distributor, store, user)
      localStorage.setItem('sessionId', newSessionId);

      message.success("로그인 성공!");
      
      // ★ 관리자든 유저든 무조건 메인으로 이동 (메인에서 메뉴가 갈림)
      navigate('/main');

    } catch (error) {
      message.error("오류 발생: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <StyledCard title="WHALEBET LOGIN" bordered={false}>
        <Form name="login" onFinish={onFinish} layout="vertical">
          <Form.Item name="username" rules={[{ required: true }]}><Input prefix={<UserOutlined />} placeholder="ID" size="large" /></Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}><Input.Password prefix={<LockOutlined />} placeholder="PW" size="large" /></Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ background: '#d4af37', borderColor: '#d4af37', marginTop: 10 }}>로그인</Button>
        </Form>
      </StyledCard>
    </Container>
  );
};
export default Login;