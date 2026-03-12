import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Tabs, Tag, Switch, Tooltip, Popconfirm, Card, Space, Divider } from 'antd';
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc, getDoc, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from '../firebase';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, KeyOutlined, UserAddOutlined, PoweroffOutlined, GiftOutlined, HistoryOutlined, ClockCircleOutlined } from '@ant-design/icons';
import bcrypt from 'bcryptjs';

// --- 🎨 UI 스타일 개선 (가독성 UP) ---
const Container = styled.div` padding: 30px; background: #111827; min-height: 100vh; color: #e5e7eb; font-family: 'Noto Sans KR', sans-serif; `;
const Header = styled.div` display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; h1 { color: #d4af37; margin:0; font-weight: 900; letter-spacing: 1px; } `;
const DarkTable = styled(Table)` 
  .ant-table { background: #1f2937; border-radius: 8px; } 
  .ant-table-thead > tr > th { background: #374151 !important; color: #d4af37 !important; border-bottom: 2px solid #4b5563 !important; font-weight: bold; font-size: 14px; }
  .ant-table-tbody > tr > td { border-bottom: 1px solid #374151 !important; color: #e5e7eb !important; font-size: 13px; }
  .ant-table-tbody > tr:hover > td { background: #111827 !important; }
  .ant-tabs-tab { color: #9ca3af !important; }
  .ant-tabs-tab-active .ant-tabs-tab-btn { color: #d4af37 !important; }
`;

const Admin = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [codes, setCodes] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [coupons, setCoupons] = useState([]); 
  
  // 모달
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false); // 시간 충전 모달
  const [selectedUser, setSelectedUser] = useState(null); // 시간 충전할 유저

  const [form] = Form.useForm();
  const [couponForm] = Form.useForm();

  const myRole = localStorage.getItem('role');

  const fetchAllData = async () => {
    try {
        const userQ = await getDocs(collection(db, "users"));
        // 접속 상태 및 로그 정보 포함하여 매핑
        setUsers(userQ.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        if (myRole === 'super_admin') {
            const codeQ = await getDocs(collection(db, "codes"));
            setCodes(codeQ.docs.map(doc => ({ code: doc.id, ...doc.data() })));
            
            const logQ = query(collection(db, "coupon_logs"), orderBy("created_at", "desc"), limit(100));
            const logSnap = await getDocs(logQ);
            setLogs(logSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            const couponQ = await getDocs(collection(db, "coupons"));
            setCoupons(couponQ.docs.map(doc => ({ code: doc.id, ...doc.data() })));
        }
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchAllData(); }, []);

  // --- 기능 ---
  const handleToggleBlock = async (r) => {
    if (r.role === 'super_admin') return message.error("최고관리자 차단 불가");
    await updateDoc(doc(db, "users", r.id), { isBlocked: !r.isBlocked, currentSessionId: !r.isBlocked ? null : r.currentSessionId });
    message.success("상태 변경 완료"); fetchAllData();
  };
  const handleDelete = async (id) => { await deleteDoc(doc(db, "users", id)); fetchAllData(); };

  // 가입 코드 생성 (버그 수정됨)
  const handleCreateCode = async (v) => {
    try {
        const codeRef = doc(db, "codes", v.code);
        const snap = await getDoc(codeRef);
        if (snap.exists()) return message.error("이미 존재하는 코드입니다.");
        
        await setDoc(codeRef, { 
            code: v.code, 
            assignedRole: v.assignedRole, 
            memo: v.memo || '', 
            createdBy: localStorage.getItem('username'), 
            createdAt: new Date().toISOString() 
        });
        message.success("가입코드 생성 완료"); 
        setIsCodeModalOpen(false); form.resetFields(); fetchAllData();
    } catch(e) { message.error("생성 실패: " + e.message); }
  };

  const handleCreateCoupon = async (v) => {
    try {
        const couponRef = doc(db, "coupons", v.code);
        const snap = await getDoc(couponRef);
        if (snap.exists()) return message.error("이미 존재하는 쿠폰");
        await setDoc(couponRef, { code: v.code, hours: parseInt(v.hours), used: false, createdBy: localStorage.getItem('username'), createdAt: new Date().toISOString() });
        message.success("쿠폰 생성 완료"); setIsCouponModalOpen(false); couponForm.resetFields(); fetchAllData();
    } catch(e) { message.error("실패"); }
  };

  // ★ 이용권 시간 간편 충전 (1시간, 3시간, 1일, 30일)
  const handleAddTime = async (hours) => {
      if (!selectedUser) return;
      try {
          const userRef = doc(db, "users", selectedUser.id);
          const snap = await getDoc(userRef);
          const userData = snap.data();

          let currentExpiry = new Date();
          // 이미 남은 시간이 있으면 거기서부터 추가, 없으면 현재 시간부터 추가
          if (userData.expiryDate) {
              const expiryDate = userData.expiryDate.toDate ? userData.expiryDate.toDate() : new Date(userData.expiryDate);
              if (expiryDate > new Date()) currentExpiry = expiryDate;
          }
          currentExpiry.setHours(currentExpiry.getHours() + hours);

          await updateDoc(userRef, { expiryDate: Timestamp.fromDate(currentExpiry) });
          message.success(`${selectedUser.username}님에게 ${hours}시간 추가 완료`);
          setIsTimeModalOpen(false);
          fetchAllData();
      } catch (e) { message.error("충전 실패"); }
  };

  // 날짜 포맷
  const formatDate = (t) => t?.seconds ? new Date(t.seconds * 1000).toLocaleString() : '-';

  return (
    <Container>
      <Header>
        <div style={{display:'flex', gap:10}}><Button icon={<ArrowLeftOutlined />} onClick={()=>navigate('/main')} ghost style={{color:'white'}} /> <h1>ADMIN PAGE</h1></div>
        <Button onClick={()=>{localStorage.clear(); navigate('/');}}>나가기</Button>
      </Header>

      <Tabs defaultActiveKey="1" type="card" items={[
        { label: '유저 관리 (Users)', key: '1', children: <DarkTable dataSource={users} columns={[
            { title: 'ID', dataIndex: 'username', render: t=><b style={{color:'white'}}>{t}</b> },
            { title: 'ROLE', dataIndex: 'role', render: r => <Tag color={r==='super_admin'?'gold':r==='admin'?'orange':'blue'}>{r}</Tag> },
            { title: 'IP 주소', dataIndex: 'ipAddress', render: t => <span style={{fontSize:12, color:'#9ca3af'}}>{t || '-'}</span> },
            { title: '접속상태', align:'center', render: (_,r) => r.currentSessionId ? <Tag color="#10b981">● ON</Tag> : <Tag color="#374151">OFF</Tag> },
            { title: '최근 로그아웃', dataIndex: 'lastLogout', render: t => <span style={{fontSize:11, color:'#6b7280'}}>{formatDate(t)}</span> },
            { title: '이용권 만료일', dataIndex: 'expiryDate', render: t => t ? <span style={{color:'#00e5ff'}}>{formatDate(t)}</span> : <span style={{color:'red'}}>만료됨</span> },
            { title: '시간충전', align:'center', render: (_,r) => <Button size="small" icon={<ClockCircleOutlined />} onClick={()=>{setSelectedUser(r); setIsTimeModalOpen(true);}} style={{color:'#d4af37', borderColor:'#d4af37'}} ghost>충전</Button> },
            { title: '차단', align:'center', render: (_,r) => <Switch size="small" checked={!r.isBlocked} onChange={()=>handleToggleBlock(r)} disabled={r.role==='super_admin'} /> },
            { title: '삭제', align:'center', render: (_,r) => <Popconfirm title="삭제?" onConfirm={()=>handleDelete(r.id)}><Button danger size="small">삭제</Button></Popconfirm> }
        ]} rowKey="id" pagination={{pageSize: 8}} /> },
        
        myRole === 'super_admin' ? { label: '가입코드 관리', key: '2', children: <>
            <div style={{marginBottom:10, textAlign:'right'}}><Button type="primary" icon={<KeyOutlined />} onClick={()=>setIsCodeModalOpen(true)} style={{background:'#d4af37', borderColor:'#d4af37', color:'black'}}>가입코드 생성</Button></div>
            <DarkTable dataSource={codes} columns={[{title:'코드',dataIndex:'code', render:t=><b style={{color:'#d4af37'}}>{t}</b>},{title:'권한',dataIndex:'assignedRole', render:t=><Tag color="blue">{t}</Tag>},{title:'메모',dataIndex:'memo'},{title:'삭제',render:(_,r)=><Button danger size="small" onClick={async()=>{await deleteDoc(doc(db,"codes",r.code)); fetchAllData();}}>삭제</Button>}]} rowKey="code" />
        </> } : null,

        myRole === 'super_admin' ? { label: '쿠폰/이벤트 로그', key: '3', children: (
            <div style={{display:'flex', gap: 20}}>
                <div style={{flex:1}}>
                    <div style={{marginBottom:10, display:'flex', justifyContent:'space-between'}}><h3 style={{margin:0, color:'white'}}>🎟 쿠폰 목록</h3><Button type="primary" icon={<GiftOutlined />} onClick={()=>setIsCouponModalOpen(true)}>쿠폰 생성</Button></div>
                    <DarkTable dataSource={coupons} columns={[{title:'코드',dataIndex:'code'},{title:'시간',dataIndex:'hours'},{title:'삭제',render:(_,r)=><Button danger size="small" onClick={async()=>{await deleteDoc(doc(db,"coupons",r.code)); fetchAllData();}}>삭제</Button>}]} rowKey="code" pagination={{pageSize:5}} />
                </div>
                <div style={{flex:2}}>
                    <h3 style={{marginBottom:10, color:'white'}}>📜 전체 로그 (History)</h3>
                    <DarkTable dataSource={logs} columns={[
                        {title:'시간',dataIndex:'created_at', render:t=>formatDate(t)},
                        {title:'유저',dataIndex:'username'},
                        {title:'유형',dataIndex:'type', render:t=><Tag color={t==='ROULETTE_WIN'?'purple':'green'}>{t}</Tag>},
                        {title:'내용',dataIndex:'amount', render:t=><b style={{color:'#d4af37'}}>{t}</b>}
                    ]} rowKey="id" pagination={{pageSize:8}} />
                </div>
            </div>
        )} : null
      ].filter(Boolean)} />

      {/* 모달들 */}
      <Modal title="가입 코드 생성" open={isCodeModalOpen} onCancel={()=>setIsCodeModalOpen(false)} footer={null}>
        <Form form={form} onFinish={handleCreateCode} layout="vertical">
          <Form.Item name="code" label="코드명" rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="assignedRole" label="부여 권한" rules={[{required:true}]}><Select><Select.Option value="admin">관리자</Select.Option><Select.Option value="distributor">총판</Select.Option><Select.Option value="store">매장</Select.Option><Select.Option value="user">유저</Select.Option></Select></Form.Item>
          <Form.Item name="memo" label="메모"><Input /></Form.Item>
          <Button type="primary" htmlType="submit" block>생성</Button>
        </Form>
      </Modal>

      <Modal title="이용권 쿠폰 생성" open={isCouponModalOpen} onCancel={()=>setIsCouponModalOpen(false)} footer={null}>
        <Form form={couponForm} onFinish={handleCreateCoupon} layout="vertical">
          <Form.Item name="code" label="쿠폰명" rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="hours" label="시간(Hour)" rules={[{required:true}]}><Input type="number" /></Form.Item>
          <Button type="primary" htmlType="submit" block>생성</Button>
        </Form>
      </Modal>

      {/* ★ 시간 간편 충전 모달 */}
      <Modal title={`[${selectedUser?.username}] 이용권 충전`} open={isTimeModalOpen} onCancel={()=>setIsTimeModalOpen(false)} footer={null}>
          <div style={{display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center'}}>
              <Button size="large" onClick={()=>handleAddTime(1)}>+1시간</Button>
              <Button size="large" onClick={()=>handleAddTime(3)}>+3시간</Button>
              <Button size="large" onClick={()=>handleAddTime(24)} type="primary">+1일 (24H)</Button>
              <Button size="large" onClick={()=>handleAddTime(720)} type="primary" danger>+30일</Button>
          </div>
      </Modal>
    </Container>
  );
};
export default Admin;