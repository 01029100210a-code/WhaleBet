import React, { useState, useEffect } from 'react';
import { Button, message, Typography, Card, Modal } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import RoulettePro from 'react-roulette-pro';
import 'react-roulette-pro/dist/index.css';
import styled from 'styled-components';
import { doc, getDoc, updateDoc, setDoc, Timestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const { Title, Text } = Typography;

// --- 🎨 스타일 정의 ---
const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 20px;
  background: radial-gradient(circle, #1f2937 0%, #000000 100%);
`;

const GameCard = styled(Card)`
  background: #111827;
  border: 2px solid #d4af37;
  border-radius: 20px;
  width: 100%;
  max-width: 800px;
  text-align: center;
  box-shadow: 0 0 50px rgba(212, 175, 55, 0.3);

  /* 룰렛 창 디자인 */
  .roulette-pro-regular-image-wrapper {
    border: none;
    background: transparent;
    transform: scale(1.1); /* 아이콘 좀 더 크게 */
  }
  
  /* 중앙 선택선 (빨간색 화살표 역할) */
  .roulette-pro-regular-selector-image {
    z-index: 10;
    border-top: 20px solid #ef4444;
  }
`;

// --- 💎 럭셔리 아이콘 목록 ---
const prizes = [
  {
    // 💣 꽝 (폭탄)
    image: 'https://cdn-icons-png.flaticon.com/512/9492/9492863.png', 
    text: '꽝',
    type: 'boom',
    hours: 0,
    bg: '#2d0a0a', // 어두운 빨강
  },
  {
    // 🥉 1시간 (동전 주머니)
    image: 'https://cdn-icons-png.flaticon.com/512/9492/9492743.png', 
    text: '1시간',
    type: 'win',
    hours: 1,
    bg: '#1e3a8a', // 어두운 파랑
  },
  {
    // 🥈 3시간 (보물상자)
    image: 'https://cdn-icons-png.flaticon.com/512/9492/9492985.png',
    text: '3시간',
    type: 'win',
    hours: 3,
    bg: '#064e3b', // 어두운 초록
  },
  {
    // 👑 1일 (왕관/다이아)
    image: 'https://cdn-icons-png.flaticon.com/512/9492/9492924.png', 
    text: '1일(VIP)',
    type: 'jackpot',
    hours: 24,
    bg: '#713f12', // 어두운 골드
  },
  {
    // 🏴‍☠️ 꽝 (해골)
    image: 'https://cdn-icons-png.flaticon.com/512/9492/9492878.png',
    text: '다음 기회에',
    type: 'boom',
    hours: 0,
    bg: '#171717', // 검정
  },
];

// 🔥 [속도 핵심] 목록을 40배로 늘림 -> 이동 거리가 길어져서 엄청 빨라짐
const reproductionArray = (array = [], length = 40) => {
  const result = [];
  for (let i = 0; i < length; i++) {
    result.push(...array);
  }
  return result;
};

// 실제 룰렛 데이터 생성
const prizeList = reproductionArray(prizes, 40).map((item) => ({
  ...item,
  id: Math.random().toString(36).substr(2, 9),
}));

const RouletteGame = ({ user }) => {
  const [start, setStart] = useState(false);
  const [prizeIndex, setPrizeIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [canPlay, setCanPlay] = useState(true); 
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    checkLastPlay();
  }, []);

  const checkLastPlay = async () => {
    const userRef = doc(db, "users", user.username);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    if (userData.lastGamePlayed) {
      const lastPlay = userData.lastGamePlayed.toDate();
      const now = new Date();
      // 🔥 테스트용 5초 쿨타임
      const diffSeconds = (now - lastPlay) / 1000;

      if (diffSeconds < 5) { 
        setCanPlay(false);
      } else {
        setCanPlay(true);
      }
    }
  };

  const handleStart = async () => {
    if (!canPlay) {
      message.warning('잠시 후 다시 시도해주세요!');
      return;
    }

    setLoading(true);
    setStart(false);

    // 🎲 확률 조작
    const random = Math.random() * 100;
    let winType = 0; // 0:꽝, 1:1H, 2:3H, 3:24H

    if (random < 60) winType = 0;        
    else if (random < 85) winType = 4;   
    else if (random < 95) winType = 1;   
    else if (random < 99) winType = 2;   
    else winType = 3;                    

    // 🔥 [속도 핵심 2] 당첨 번호를 리스트의 "맨 끝부분"에서 고름
    // 그래야 룰렛이 처음부터 끝까지 미친듯이 달려감
    const totalLength = prizeList.length;
    // 전체 길이의 80% ~ 90% 지점에 있는 아이템 중 하나를 타겟팅
    const baseIndex = Math.floor(totalLength * 0.85); 
    
    // baseIndex 이후에서 winType과 일치하는 첫 번째 인덱스 찾기
    let targetIndex = -1;
    for(let i = baseIndex; i < totalLength; i++) {
        // 원래 prizes 배열의 순서대로 반복되므로 (i % prizes.length)가 타입 인덱스임
        if ((i % prizes.length) === winType) {
            targetIndex = i;
            break;
        }
    }
    
    // 만약 못 찾으면 안전장치로 중앙값 사용
    if(targetIndex === -1) targetIndex = Math.floor(totalLength / 2);

    setPrizeIndex(targetIndex);

    // 0.1초 뒤 발사
    setTimeout(() => {
        setStart(true);
    }, 100);
  };

  const handlePrizeDefined = async () => {
    const prize = prizeList[prizeIndex];
    setCanPlay(false); 

    try {
        const userRef = doc(db, "users", user.username);
        
        await updateDoc(userRef, {
            lastGamePlayed: Timestamp.now()
        });

        let msgContent = "";
        let msgTitle = "";

        if (prize.hours > 0) {
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
            
            let currentExpiry = new Date();
            if (userData.expiryDate) {
                const expiryDate = userData.expiryDate.toDate ? userData.expiryDate.toDate() : new Date(userData.expiryDate);
                if (expiryDate > new Date()) currentExpiry = expiryDate;
            }
            
            currentExpiry.setHours(currentExpiry.getHours() + prize.hours);
            
            await updateDoc(userRef, {
                expiryDate: Timestamp.fromDate(currentExpiry)
            });

            await addDoc(collection(db, "coupon_logs"), {
                username: user.username,
                type: 'ROULETTE_WIN',
                amount: prize.hours + 'Hours',
                created_at: Timestamp.now()
            });

            msgTitle = '🎉 Congratulation!';
            msgContent = `[${prize.text}] 당첨! 이용권이 연장되었습니다.`;
            
            Modal.success({ title: msgTitle, content: msgContent });
        } else {
            msgTitle = 'Oops...';
            msgContent = '아쉽게도 꽝입니다. 다음 기회에!';
            Modal.error({ title: msgTitle, content: msgContent });
        }

        setTimeout(() => {
            setStart(false);
            setLoading(false);
            setResetKey(prev => prev + 1); 
            checkLastPlay();
            window.location.reload(); 
        }, 3000); // 결과창 3초 뒤 리셋

    } catch (e) {
        console.error(e);
        message.error("오류 발생");
    }
  };

  return (
    <GameContainer>
      <div style={{textAlign:'center', marginBottom: 40}}>
        <Title level={2} style={{ color: '#d4af37', margin: 0, textShadow:'0 0 20px rgba(212,175,55,0.8)', fontSize: 40, fontFamily: 'serif' }}>
          <GiftOutlined /> ROYAL ROULETTE
        </Title>
        <Text style={{color:'#9ca3af'}}>매일 터지는 행운의 기회 (Win up to 24H)</Text>
      </div>

      <GameCard>
        <div style={{ margin: '40px auto', width: '100%' }}>
          <RoulettePro
            key={resetKey}
            prizes={prizeList}
            prizeIndex={prizeIndex}
            start={start}
            onPrizeDefined={handlePrizeDefined}
            spinningTime={8} // 🔥 8초 동안 초고속 회전
            options={{ stopInCenter: true }}
            defaultDesignOptions={{ prizesWithText: true }} 
          />
        </div>

        <Button 
            type="primary" 
            size="large" 
            onClick={handleStart} 
            disabled={!canPlay || start}
            loading={loading && !start}
            style={{ 
                height: 70, 
                width: 300, 
                fontSize: 24, 
                fontWeight: 'bold', 
                background: canPlay ? 'linear-gradient(135deg, #d4af37 0%, #f59e0b 100%)' : '#374151',
                borderColor: canPlay ? '#d4af37' : '#374151',
                color: canPlay ? 'black' : '#9ca3af',
                marginTop: 30,
                boxShadow: canPlay ? '0 0 20px rgba(212, 175, 55, 0.5)' : 'none',
                border: 'none'
            }}
        >
            {canPlay ? "SPIN NOW!" : "Cooling Down..."}
        </Button>

        <div style={{marginTop: 20, color:'#6b7280', fontSize: 12}}>
            * 테스트 모드: 5초마다 재참여 가능
        </div>
      </GameCard>
    </GameContainer>
  );
};

export default RouletteGame;