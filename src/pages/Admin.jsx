import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Tabs, Tag, Switch, Tooltip, Popconfirm, Card } from 'antd';
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc, getDoc, query, orderBy, limit } from "firebase/firestore";
import { db } from '../firebase';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, KeyOutlined, UserAddOutlined, PoweroffOutlined, GiftOutlined, HistoryOutlined } from '@ant-design/icons';
import bcrypt from 'bcryptjs';

const Container = styled.div` padding: 30px; background: #111827; min-height: 100vh; color: white; font-family: sans-serif; `;
const Header = styled.div` display: flex; justify-content: space-between; margin-bottom: 20px; h1 { color: #d4af37; margin:0; } `;
const DarkTable = styled(Table)` 
  .ant-table { background: #1f2937; } 
  .ant-table-thead > tr > th { background: #374151 !important; color: #d4af37 !important; border-bottom: 2px solid #4b5563 !important; }
  .ant-table-tbody > tr > td { border-bottom: 1px solid #374151 !important; color: #e5e7eb !important; }
  .ant-table-tbody > tr:hover > td { background: #111827 !important; }
`;

const Admin = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [codes, setCodes] = useState([]);
  const [logs, setLogs] = useState([]); // ★ 로그 데이터
  const [coupons, setCoupons] = useState([]); // ★ 생성된 쿠폰 목록

  // 모달 상태
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false); // 쿠폰 생성 모달
  const [form] = Form.useForm();
  const [couponForm] = Form.useForm();

  const myRole = localStorage.getItem('role');

  const fetchAllData = async () => {
    // 1. 유저 로드
    const userQ = await getDocs(collection(db, "users"));
    setUsers(userQ.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // 2. 가입코드 로드 (슈퍼관리자만)
    if (myRole === 'super_admin') {
        const codeQ = await getDocs(collection(db, "codes"));
        setCodes(codeQ.docs.map(doc => ({ code: doc.id, ...doc.data() })));
        
        // 3. ★ 로그 로드 (룰렛/쿠폰 사용 기록)
        const logQ = query(collection(db, "coupon_logs"), orderBy("created_at", "desc"), limit(100));
        const logSnap = await getDocs(logQ);
        setLogs(logSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // 4. 생성된 쿠폰 목록 로드
        const couponQ = await getDocs(collection(db, "coupons"));
        setCoupons(couponQ.docs.map(doc => ({ code: doc.id, ...doc.data() })));
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  // --- 기능 ---
  const handleToggleBlock = async (r) => {
    if (r.role === 'super_admin') return message.error("최고관리자 차단 불가");
    await updateDoc(doc(db, "users", r.id), { isBlocked: !r.isBlocked, currentSessionId: !r.isBlocked ? null : r.currentSessionId });
    fetchAllData();
  };
  const handleDelete = async (id) => { await deleteDoc(doc(db, "users", id)); fetchAllData(); };

  // 가입 코드 생성
  const handleCreateCode = async (v) => {
    const codeRef = doc(db, "codes", v.code);
    const snap = await getDoc(codeRef);
    if (snap.exists()) return message.error("이미 존재하는 코드");
    await setDoc(codeRef, { code: v.code, assignedRole: v.assignedRole, memo: v.memo, createdBy: localStorage.getItem('username'), createdAt: new Date().toISOString() });
    message.success("가입코드 생성 완료"); setIsCodeModalOpen(false); form.resetFields(); fetchAllData();
  };

  // ★ 이용권 쿠폰 생성 (유저가 입력해서 쓸 것)
  const handleCreateCoupon = async (v) => {
    const couponRef = doc(db, "coupons", v.code);
    const snap = await getDoc(couponRef);
    if (snap.exists()) return message.error("이미 존재하는 쿠폰");
    await setDoc(couponRef, { code: v.code, hours: parseInt(v.hours), used: false, createdBy: localStorage.getItem('username'), createdAt: new Date().toISOString() });
    message.success("이용권 쿠폰 생성 완료"); setIsCouponModalOpen(false); couponForm.resetFields(); fetchAllData();
  };

  // --- 컬럼 정의 ---
  const logCols = [
    { title: '시간', dataIndex: 'created_at', render: t => t?.seconds ? new Date(t.seconds * 1000).toLocaleString() : '-' },
    { title: '유저ID', dataIndex: 'username', render: t => <b style={{color:'white'}}>{t}</b> },
    { title: '유형', dataIndex: 'type', render: t => <Tag color={t==='ROULETTE_WIN'?'purple':'green'}>{t==='ROULETTE_WIN'?'룰렛 당첨':'쿠폰 사용'}</Tag> },
    { title: '내용 (코드/상품)', dataIndex: 'code', render: (t, r) => r.type==='ROULETTE_WIN' ? '이벤트 당첨' : t },
    { title: '지급량', dataIndex: 'amount', render: t => <b style={{color:'#d4af37'}}>{t}</b> },
  ];

  const couponCols = [
    { title: '쿠폰코드', dataIndex: 'code', render: t=><b style={{color:'#00e5ff'}}>{t}</b> },
    { title: '시간(Hours)', dataIndex: 'hours' },
    { title: '삭제', render: (_,r) => <Button danger size="small" onClick={async()=>{await deleteDoc(doc(db,"coupons",r.code)); fetchAllData();}}>삭제</Button> }
  ];

  return (
    <Container>
      <Header>
        <div style={{display:'flex', gap:10}}><Button icon={<ArrowLeftOutlined />} onClick={()=>navigate('/main')} ghost /> <h1>ADMIN PAGE</h1></div>
        <Button onClick={()=>{localStorage.clear(); navigate('/');}}>나가기</Button>
      </Header>

      <Tabs defaultActiveKey="1" type="card" items={[
        { label: '유저 관리', key: '1', children: <DarkTable dataSource={users} columns={[
            { title: 'ID', dataIndex: 'username', render: t=><b style={{color:'white'}}>{t}</b> },
            { title: 'ROLE', dataIndex: 'role', render: r => <Tag color={r==='super_admin'?'gold':r==='admin'?'orange':'blue'}>{r}</Tag> },
            { title: '만료일', dataIndex: 'expiryDate', render: t => t?.seconds ? new Date(t.seconds*1000).toLocaleDateString() : '무제한' },
            { title: '차단', render: (_,r) => <Switch checked={!r.isBlocked} onChange={()=>handleToggleBlock(r)} disabled={r.role==='super_admin'} /> },
            { title: '삭제', render: (_,r) => <Popconfirm title="삭제?" onConfirm={()=>handleDelete(r.id)}><Button danger size="small">삭제</Button></Popconfirm> }
        ]} rowKey="id" /> },
        
        myRole === 'super_admin' ? { label: '가입코드 관리', key: '2', children: <>
            <div style={{marginBottom:10, textAlign:'right'}}><Button type="primary" icon={<KeyOutlined />} onClick={()=>setIsCodeModalOpen(true)}>가입코드 생성</Button></div>
            <DarkTable dataSource={codes} columns={[{title:'코드',dataIndex:'code'},{title:'권한',dataIndex:'assignedRole'},{title:'삭제',render:(_,r)=><Button danger size="small" onClick={async()=>{await deleteDoc(doc(db,"codes",r.code)); fetchAllData();}}>삭제</Button>}]} rowKey="code" />
        </> } : null,

        // ★ [핵심] 이벤트/쿠폰 관리 탭
        myRole === 'super_admin' ? { label: '쿠폰 및 이벤트 로그', key: '3', children: (
            <div style={{display:'flex', gap: 20}}>
                <div style={{flex:1}}>
                    <div style={{marginBottom:10, display:'flex', justifyContent:'space-between'}}>
                        <h3 style={{margin:0}}>🎟 생성된 쿠폰 목록</h3>
                        <Button type="primary" icon={<GiftOutlined />} style={{background:'#d4af37', borderColor:'#d4af37', color:'black'}} onClick={()=>setIsCouponModalOpen(true)}>쿠폰 생성</Button>
                    </div>
                    <DarkTable dataSource={coupons} columns={couponCols} rowKey="code" pagination={{pageSize:5}} />
                </div>
                <div style={{flex:2}}>
                    <h3 style={{marginBottom:10}}>📜 사용/당첨 기록 (History)</h3>
                    <DarkTable dataSource={logs} columns={logCols} rowKey="id" pagination={{pageSize:8}} />
                </div>
            </div>
        )} : null

      ].filter(Boolean)} />

      {/* 가입 코드 생성 모달 */}
      <Modal title="가입 코드 생성" open={isCodeModalOpen} onCancel={()=>setIsCodeModalOpen(false)} footer={null}>
        <Form form={form} onFinish={handleCreateCode} layout="vertical">
          <Form.Item name="code" label="가입 코드" rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="assignedRole" label="부여할 권한" rules={[{required:true}]}><Select><Select.Option value="admin">관리자 (Admin)</Select.Option><Select.Option value="distributor">총판</Select.Option><Select.Option value="store">매장</Select.Option><Select.Option value="user">유저</Select.Option></Select></Form.Item>
          <Button type="primary" htmlType="submit" block>생성</Button>
        </Form>
      </Modal>

      {/* 이용권 쿠폰 생성 모달 */}
      <Modal title="이용권 쿠폰 생성" open={isCouponModalOpen} onCancel={()=>setIsCouponModalOpen(false)} footer={null}>
        <Form form={couponForm} onFinish={handleCreateCoupon} layout="vertical">
          <Form.Item name="code" label="쿠폰 코드 (예: VIP-TIME-10)" rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="hours" label="추가할 시간 (Hour)" rules={[{required:true}]}><Input type="number" placeholder="24" /></Form.Item>
          <Button type="primary" htmlType="submit" block style={{background:'#d4af37', borderColor:'#d4af37', color:'black'}}>생성하기</Button>
        </Form>
      </Modal>
    </Container>
  );
};
export default Admin;