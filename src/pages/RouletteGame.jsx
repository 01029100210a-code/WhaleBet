import React, { useState, useEffect } from 'react';
import { Button, message, Typography, Card, Modal } from 'antd';
import { GiftOutlined, ClockCircleOutlined } from '@ant-design/icons';
import RoulettePro from 'react-roulette-pro';
import 'react-roulette-pro/dist/index.css';
import styled from 'styled-components';
import { doc, getDoc, updateDoc, Timestamp, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase'; // 경로가 맞는지 꼭 확인하세요! (예: '../firebase.js')

const { Title, Text } = Typography;

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

  .roulette-pro-regular-image-wrapper {
    border: none;
    background: transparent;
    transform: scale(1.1);
  }
  
  .roulette-pro-regular-selector-image {
    z-index: 10;
    border-top: 20px solid #ef4444;
  }
`;

const prizes = [
  { image: 'https://cdn-icons-png.flaticon.com/512/9492/9492863.png', text: '꽝', type: 'boom', hours: 0 },
  { image: 'https://cdn-icons-png.flaticon.com/512/9492/9492743.png', text: '1시간', type: 'win', hours: 1 },
  { image: 'https://cdn-icons-png.flaticon.com/512/9492/9492985.png', text: '3시간', type: 'win', hours: 3 },
  { image: 'https://cdn-icons-png.flaticon.com/512/9492/9492924.png', text: '1일(VIP)', type: 'jackpot', hours: 24 },
  { image: 'https://cdn-icons-png.flaticon.com/512/9492/9492878.png', text: '다음 기회에', type: 'boom', hours: 0 },
];

const reproductionArray = (array = [], length = 40) => {
  const result = [];
  for (let i = 0; i < length; i++) {
    result.push(...array);
  }
  return result;
};

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
  const [nextPlayTime, setNextPlayTime] = useState(null);

  // 🔥 핵심: 6시간 쿨타임 설정
  const COOLDOWN_HOURS = 6;
  const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

  useEffect(() => {
    checkLastPlay();
  }, [user]);

  const checkLastPlay = async () => {
    if(!user) return;
    try {
        const userRef = doc(db, "users", user.username);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            if (userData.lastGamePlayed) {
                const lastPlayedDate = userData.lastGamePlayed.toDate(); // Firestore Timestamp 변환
                const now = new Date();
                const diffTime = now - lastPlayedDate;
        
                if (diffTime < COOLDOWN_MS) {
                    // 쿨타임 걸림
                    setCanPlay(false);
                    setNextPlayTime(new Date(lastPlayedDate.getTime() + COOLDOWN_MS));
                    console.log("쿨타임 중입니다.");
                } else {
                    setCanPlay(true);
                    setNextPlayTime(null);
                }
            } else {
                setCanPlay(true);
            }
        }
    } catch(err) {
        console.error("유저 정보 확인 실패:", err);
    }
  };

  const handleStart = async () => {
    if (!canPlay) {
      message.warning('아직 쿨타임이 지나지 않았습니다!');
      return;
    }

    setLoading(true);
    setStart(false);

    // 랜덤 확률 로직
    const random = Math.random() * 100;
    let winType = 0; 
    if (random < 60) winType = 0;        
    else if (random < 85) winType = 4;   
    else if (random < 95) winType = 1;   
    else if (random < 99) winType = 2;   
    else winType = 3;                    

    const totalLength = prizeList.length;
    const baseIndex = Math.floor(totalLength * 0.85); 
    
    let targetIndex = -1;
    for(let i = baseIndex; i < totalLength; i++) {
        if ((i % prizes.length) === winType) {
            targetIndex = i;
            break;
        }
    }
    if(targetIndex === -1) targetIndex = Math.floor(totalLength / 2);

    setPrizeIndex(targetIndex);

    setTimeout(() => {
        setStart(true);
    }, 100);
  };

  const handlePrizeDefined = async () => {
    const prize = prizeList[prizeIndex];
    setCanPlay(false); 

    try {
        const userRef = doc(db, "users", user.username);
        
        // 1. 마지막 게임 시간 업데이트 (이게 있어야 쿨타임이 작동함)
        await updateDoc(userRef, {
            lastGamePlayed: Timestamp.now()
        });

        // 2. 히스토리 저장 (이게 있어야 마이페이지에 뜸)
        await addDoc(collection(db, "roulette_history"), {
            username: user.username,
            result: prize.text,
            isWin: prize.hours > 0,
            timestamp: serverTimestamp()
        });

        if (prize.hours > 0) {
            // 당첨 로직
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

            Modal.success({ title: '🎉 축하합니다!', content: `[${prize.text}] 당첨! 이용권이 연장되었습니다.` });
        } else {
            Modal.error({ title: '아쉬워요..', content: '꽝입니다. 6시간 뒤에 다시 도전하세요!' });
        }

        setTimeout(() => {
            setStart(false);
            setLoading(false);
            setResetKey(prev => prev + 1); 
            checkLastPlay(); // 다시 체크해서 버튼 비활성화
        }, 3000); 

    } catch (e) {
        console.error("저장 중 에러 발생:", e);
        message.error("데이터 저장 중 오류가 발생했습니다. 관리자에게 문의하세요.");
    }
  };

  if(!user) return <div>Loading...</div>;

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
            spinningTime={8}
            options={{ stopInCenter: true }}
            defaultDesignOptions={{ prizesWithText: true }} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 30 }}>
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
                    boxShadow: canPlay ? '0 0 20px rgba(212, 175, 55, 0.5)' : 'none',
                    border: 'none'
                }}
            >
                {canPlay ? "SPIN NOW!" : "Cooling Down..."}
            </Button>
            
            {!canPlay && nextPlayTime && (
                <Text style={{ color: '#ef4444', marginTop: 15, fontSize: 16 }}>
                    <ClockCircleOutlined /> 다음 참여 가능 시간: {nextPlayTime.toLocaleTimeString()}
                </Text>
            )}
        </div>
      </GameCard>
    </GameContainer>
  );
};

export default RouletteGame;