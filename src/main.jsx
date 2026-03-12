import React, { useEffect, useState } from 'react';
import { Button, message, Modal } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './firebase'; // 경로 확인 필요
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
  
  // 로컬 스토리지 정보 가져오기
  const myUsername = localStorage.getItem('username');
  const mySessionId = localStorage.getItem('sessionId');

  // 로그아웃 함수
  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  useEffect(() => {
    // 로그인이 안 된 상태면 내쫓음
    if (!myUsername || !mySessionId) {
      handleLogout();
      return;
    }

    // ★ [실시간 감시] Firestore 리스너 연결
    const unsubscribe = onSnapshot(doc(db, "users", myUsername), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setUserData(data);

        // 1. [차단 감지] 관리자가 차단했는지 확인
        if (data.isBlocked) {
          Modal.error({
            title: '접속 차단',
            content: '관리자에 의해 계정이 차단되었습니다.',
            onOk: handleLogout,
            keyboard: false,
            maskClosable: false
          });
          return;
        }

        // 2. [이중 접속 감지] 내 세션 ID와 DB의 세션 ID가 다르면?
        // (다른 기기에서 로그인했거나 관리자가 강제 종료함)
        if (data.currentSessionId !== mySessionId) {
          Modal.warning({
            title: '중복 로그인 감지',
            content: '다른 기기에서 로그인하여 현재 접속이 종료됩니다.',
            onOk: handleLogout,
            keyboard: false,
            maskClosable: false
          });
        }

      } else {
        // 유저 데이터가 DB에서 삭제된 경우
        message.error("계정 정보를 찾을 수 없습니다.");
        handleLogout();
      }
    }, (error) => {
      console.error("실시간 감시 에러:", error);
      handleLogout();
    });

    // 컴포넌트가 사라질 때 리스너 해제 (메모리 누수 방지)
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
        type="primary" 
        danger 
        icon={<LogoutOutlined />} 
        onClick={handleLogout}
        style={{ marginTop: 40 }}
      >
        로그아웃
      </Button>
    </Container>
  );
};

export default Main;