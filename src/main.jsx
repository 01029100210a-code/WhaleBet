import React, { useEffect, useState } from 'react';
import { Button, message, Modal } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { doc, onSnapshot } from "firebase/firestore";
// ▼ 경로 수정 (pages 폴더에서 나가야 하므로 ../)
import { db } from '../firebase'; 
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  padding: 40px;
  background-color: #111827;
  min-height: 100vh;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Main = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  
  const myUsername = localStorage.getItem('username');
  const mySessionId = localStorage.getItem('sessionId');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  useEffect(() => {
    if (!myUsername || !mySessionId) {
      handleLogout();
      return;
    }

    // ★ 실시간 감시 (차단 및 이중 접속 체크)
    const unsubscribe = onSnapshot(doc(db, "users", myUsername), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setUserData(data);

        // 1. 차단 감지
        if (data.isBlocked) {
          Modal.error({
            title: '접속 차단',
            content: '관리자에 의해 계정이 차단되었습니다.',
            onOk: handleLogout,
            keyboard: false, maskClosable: false
          });
          return;
        }

        // 2. 이중 접속 감지
        if (data.currentSessionId !== mySessionId) {
          Modal.warning({
            title: '중복 로그인 감지',
            content: '다른 기기에서 로그인하여 현재 접속이 종료됩니다.',
            onOk: handleLogout,
            keyboard: false, maskClosable: false
          });
        }
      } else {
        handleLogout();
      }
    });

    return () => unsubscribe();
  }, [myUsername, mySessionId, navigate]);

  return (
    <Container>
      <h1>🎉 Welcome, {myUsername}!</h1>
      <p>현재 정상적으로 접속 중입니다.</p>
      
      {userData && (
        <div style={{ marginTop: 20, padding: 20, background: '#1f2937', borderRadius: 8 }}>
          <p>내 레벨: <span style={{ color: '#d4af37' }}>{userData.entryLevel}단계</span></p>
          <p>내 권한: {userData.role}</p>
        </div>
      )}

      <Button 
        type="primary" danger icon={<LogoutOutlined />} 
        onClick={handleLogout} style={{ marginTop: 40 }}
      >
        로그아웃
      </Button>
    </Container>
  );
};

export default Main;