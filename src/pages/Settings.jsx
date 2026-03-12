import React, { useState, useEffect } from 'react';
import { Card, Radio, Switch, Button, message, Typography, Divider, Input } from 'antd';
import { SaveOutlined, BellOutlined, RocketOutlined, RobotOutlined } from '@ant-design/icons';
import { doc, setDoc, getDoc } from "firebase/firestore"; // Firebase 함수 추가
import { db } from '../firebase'; // Firebase 설정 파일 불러오기

const { Title, Text } = Typography;

const Settings = () => {
  // 기본값 설정
  const [entryLevel, setEntryLevel] = useState(1);
  const [telegramOn, setTelegramOn] = useState(false);
  const [telegramId, setTelegramId] = useState('');
  const [loading, setLoading] = useState(false);

  // 컴포넌트 로드시 저장된 설정 불러오기
  useEffect(() => {
    const loadSettings = async () => {
      // 1. 로컬 스토리지 우선 확인
      const localLevel = localStorage.getItem('entryLevel');
      const localTgOn = localStorage.getItem('telegramOn');
      const localTgId = localStorage.getItem('telegramId');

      if (localLevel) setEntryLevel(parseInt(localLevel));
      if (localTgOn) setTelegramOn(JSON.parse(localTgOn));
      if (localTgId) setTelegramId(localTgId);

      // 2. Firebase(DB)에서 불러오기 (서버와 동기화)
      try {
        // 'settings' 컬렉션의 'global_config' 문서 사용 (또는 사용자 ID별로 분리 가능)
        const docRef = doc(db, "settings", "global_config");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.entryLevel) setEntryLevel(data.entryLevel);
          if (data.telegramOn !== undefined) setTelegramOn(data.telegramOn);
          if (data.telegramId) setTelegramId(data.telegramId);
        }
      } catch (error) {
        console.error("설정 불러오기 실패:", error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. 로컬 스토리지 저장 (브라우저용)
      localStorage.setItem('entryLevel', entryLevel);
      localStorage.setItem('telegramOn', JSON.stringify(telegramOn));
      localStorage.setItem('telegramId', telegramId);

      // 2. 실시간 반영을 위한 이벤트 발생 (LivePicks 페이지 즉시 갱신용)
      window.dispatchEvent(new Event('storage'));

      // 3. Firebase(DB) 저장 (텔레그램 봇용)
      // 'settings' 컬렉션이 없다면 자동으로 생성됩니다.
      await setDoc(doc(db, "settings", "global_config"), {
        entryLevel: entryLevel,
        telegramOn: telegramOn,
        telegramId: telegramId,
        updatedAt: new Date()
      });

      message.success('전략 설정이 저장되었습니다! (DB 동기화 완료)');
    } catch (error) {
      console.error("저장 실패:", error);
      message.error("설정 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20, paddingTop: 100 }}>
      <Title level={2} style={{ color: '#fff', marginBottom: 30, textAlign:'center' }}>
        <RobotOutlined /> 전략 설정 (Strategy)
      </Title>
      
      <Card style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 15 }} bordered={false}>
        
        {/* 1. 진입 단계 설정 */}
        <div style={{ marginBottom: 30 }}>
          <Title level={4} style={{ color: '#00e5ff', display:'flex', alignItems:'center', gap:10 }}>
             <RocketOutlined /> 진입 시점 설정
          </Title>
          <Text style={{ color: '#9ca3af', display:'block', marginBottom: 20 }}>
            설정한 단계 이상일 때만 화면에 표시하고 알림을 보냅니다.
          </Text>

          <Radio.Group onChange={(e) => setEntryLevel(e.target.value)} value={entryLevel} style={{display:'flex', flexDirection:'column', gap: 15}}>
            {[1, 2, 3, 4, 5].map(level => (
              <Radio key={level} value={level} style={{color:'white', padding: 10, background: level === entryLevel ? 'rgba(0, 229, 255, 0.1)' : 'transparent', borderRadius: 8, border: level === entryLevel ? '1px solid #00e5ff' : '1px solid transparent'}}>
                <span style={{fontSize:16, fontWeight:'bold', color: level === entryLevel ? '#00e5ff' : 'white'}}>
                  {level}단계 진입 
                  {level===1 && " (공격형)"}
                  {level===2 && " (1단계 미적중 후)"}
                  {level===3 && " (안전형)"}
                  {level===4 && " (고위험 회피)"}
                  {level===5 && " (극안전형)"}
                </span>
                <div style={{fontSize:13, color:'#6b7280', marginLeft: 25, marginTop: 5}}>
                   {level===1 ? "패턴 감지 즉시 1단계부터 배팅" : `1~${level-1}단계 미적중 확인 후 -> ${level}단계부터 시작`}
                </div>
              </Radio>
            ))}
          </Radio.Group>
        </div>

        <Divider style={{borderColor: '#374151'}} />

        {/* 2. 텔레그램 알림 설정 */}
        <div style={{ marginBottom: 30 }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 15}}>
                <div>
                    <Title level={4} style={{ color: '#00e5ff', margin:0, display:'flex', alignItems:'center', gap:10 }}>
                        <BellOutlined /> 텔레그램 알림
                    </Title>
                    <Text type="secondary" style={{color:'#9ca3af'}}>
                        설정한 단계 도달 시 텔레그램 메시지 발송
                    </Text>
                </div>
                <Switch 
                    checked={telegramOn} 
                    onChange={setTelegramOn} 
                    checkedChildren="ON" 
                    unCheckedChildren="OFF" 
                    style={{ background: telegramOn ? '#10b981' : 'rgba(255,255,255,0.2)' }}
                />
            </div>
            
            {telegramOn && (
                <Input 
                    placeholder="텔레그램 Chat ID 입력 (예: 123456789)" 
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
                    style={{
                      marginTop: 10, 
                      background: '#111827', 
                      border: '1px solid #374151', 
                      color: 'white', 
                      height: 45,
                      borderRadius: 8
                    }}
                />
            )}
            <div style={{marginTop: 10, fontSize: 12, color: '#6b7280'}}>
               * 봇에게 먼저 /start 명령어를 보내야 알림을 받을 수 있습니다.
            </div>
        </div>

        <Button 
          type="primary" 
          size="large" 
          icon={<SaveOutlined />} 
          block 
          loading={loading}
          onClick={handleSave} 
          style={{
            height: 55, 
            fontSize: 18, 
            fontWeight: 'bold', 
            borderRadius: 10,
            background: 'linear-gradient(90deg, #00c6ff, #0072ff)',
            border: 'none',
            boxShadow: '0 4px 15px rgba(0, 114, 255, 0.4)'
          }}
        >
          설정 저장하기
        </Button>

      </Card>
    </div>
  );
};

export default Settings;