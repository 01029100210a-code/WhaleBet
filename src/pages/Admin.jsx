import React, { useState, useEffect } from 'react';
import { 
  Table, Layout, Button, Input, Modal, Form, DatePicker, 
  Select, Tag, message, Popconfirm, Card, Row, Col, Statistic, Switch, Tooltip
} from 'antd';
import { 
  SearchOutlined, UserAddOutlined, DeleteOutlined, 
  EditOutlined, RobotOutlined, StopOutlined, CheckCircleOutlined, 
  ThunderboltOutlined, WifiOutlined, BarcodeOutlined, LockOutlined, UnlockOutlined, PoweroffOutlined
} from '@ant-design/icons';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, addDoc, Timestamp } from "firebase/firestore";
import { db } from '../firebase';
import styled from 'styled-components';
import dayjs from 'dayjs';
import bcrypt from 'bcryptjs';

const { Option } = Select;

// --- 스타일 ---
const AdminLayout = styled(Layout)` background: #111827; min-height: 100vh; padding: 20px; color: white; `;
const StyledTable = styled(Table)` .ant-table { background: transparent; color: #e5e7eb; } .ant-table-thead > tr > th { background: #1f2937 !important; color: #9ca3af !important; border-bottom: 1px solid #374151 !important; font-size: 12px; } .ant-table-tbody > tr > td { border-bottom: 1px solid #1f2937 !important; color: #e5e7eb !important; } .ant-table-tbody > tr:hover > td { background: #374151 !important; } .ant-pagination-item-link, .ant-pagination-item { background: transparent !important; border-color: #374151 !important; a { color: #9ca3af !important; } } .ant-pagination-item-active { border-color: #10b981 !important; a { color: #10b981 !important; } } `;
const StatsCard = styled(Card)` background: #1f2937; border: 1px solid #374151; border-radius: 8px; .ant-statistic-title { color: #9ca3af; } .ant-statistic-content { color: white; font-weight: bold; } `;

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [isCouponModalVisible, setIsCouponModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [couponForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 정렬: 미승인 > 접속중 > 관리자 > 일반
      usersData.sort((a, b) => {
          if (a.isApproved === false && b.isApproved !== false) return -1;
          if (b.isApproved === false && a.isApproved !== false) return 1;
          const aOnline = !!a.currentSessionId; const bOnline = !!b.currentSessionId;
          return Number(bOnline) - Number(aOnline);
      });
      setUsers(usersData);
      setLoading(false);
    });
    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snapshot) => {
      const couponData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      couponData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setCoupons(couponData);
    });
    return () => { unsubUsers(); unsubCoupons(); };
  }, []);

  // --- 유저 생성/수정 ---
  const handleUserOk = async () => {
    try {
      const values = await form.validateFields();
      const userData = { ...values, expiryDate: values.expiryDate ? values.expiryDate.toDate() : null };
      if (editingUser) {
        if (values.password) {
            const salt = bcrypt.genSaltSync(10);
            userData.password = bcrypt.hashSync(values.password, salt);
        } else delete userData.password;
        await updateDoc(doc(db, "users", editingUser.id), userData);
        message.success('수정됨');
      } else {
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(values.password, salt);
        await setDoc(doc(db, "users", values.username), {
            ...userData, password: hashedPassword, createdAt: Timestamp.now(), isBlocked: false, telegramChatId: '', isTelegramActive: false, isTelegramBlocked: false, strategyLevel: 1, currentSessionId: null,
            isApproved: true // 관리자가 직접 만들면 바로 승인
        });
        message.success('생성됨');
      }
      setIsUserModalVisible(false); form.resetFields(); setEditingUser(null);
    } catch (e) { message.error('오류'); }
  };

  const handleDeleteUser = async (id) => { await deleteDoc(doc(db, "users", id)); message.success('삭제됨'); };
  const toggleUserBlock = async (user) => {
    const newStatus = !user.isBlocked;
    await updateDoc(doc(db, "users", user.id), { isBlocked: newStatus, currentSessionId: newStatus ? null : user.currentSessionId });
    message.success(newStatus ? '차단됨' : '해제됨');
  };
  
  // 🔥 [승인] 가입 승인
  const approveUser = async (user) => {
      await updateDoc(doc(db, "users", user.id), { isApproved: true });
      message.success('승인 완료');
  };

  const extendTime = async (id, days) => {
    const user = users.find(u => u.id === id);
    let currentExpiry = user.expiryDate ? user.expiryDate.toDate() : new Date();
    if (currentExpiry < new Date()) currentExpiry = new Date();
    const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
    await updateDoc(doc(db, "users", id), { expiryDate: newExpiry });
    message.success('연장됨');
  };
  const toggleTelegramBlock = async (user) => {
    const newStatus = !user.isTelegramBlocked;
    await updateDoc(doc(db, "users", user.id), { isTelegramBlocked: newStatus, isTelegramActive: newStatus ? false : user.isTelegramActive });
    message.success(newStatus ? '텔레 차단됨' : '텔레 해제됨');
  };
  const handleCreateCoupon = async () => {
      try {
          const values = await couponForm.validateFields();
          const code = `WB-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
          await addDoc(collection(db, "coupons"), { code, days: values.days, isUsed: false, usedBy: null, createdAt: Timestamp.now() });
          message.success(`쿠폰 생성: ${code}`); couponForm.resetFields();
      } catch (e) { message.error("실패"); }
  };
  const handleDeleteCoupon = async (id) => { await deleteDoc(doc(db, "coupons", id)); message.success("삭제됨"); };

  const userColumns = [
    {
      title: '유저정보', width: 200, filteredValue: [searchText], onFilter: (val, rec) => String(rec.id).toLowerCase().includes(val.toLowerCase()),
      render: (_, r) => {
          const isOnline = !!r.currentSessionId;
          return (
            <div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4}}>
                    <div style={{fontWeight:'bold', color:'white', fontSize: 14}}>{r.id}</div>
                    <Tag icon={isOnline ? <WifiOutlined /> : <PoweroffOutlined />} color={isOnline ? "success" : "default"}>{isOnline ? "ON" : "OFF"}</Tag>
                </div>
                <div style={{fontSize: 11, color: '#d1d5db', marginBottom:2}}>{r.name || '-'} / {r.phone || '-'}</div>
                <div style={{fontSize: 11, color: '#f59e0b'}}>코드: {r.referralCode || '없음'}</div>
            </div>
          );
      }
    },
    {
      title: '접속/상태',
      render: (_, r) => (
          <div style={{fontSize: 12}}>
              <div style={{color: '#e5e7eb'}}><WifiOutlined style={{marginRight: 5, color: '#10b981'}} /> IP: {r.ipAddress || '-'}</div>
              <div style={{color: '#9ca3af', marginTop: 2}}>Last: {r.lastLogout ? dayjs(r.lastLogout.toDate()).format('MM-DD HH:mm') : '-'}</div>
              {r.isApproved === false ? <Tag color="volcano" style={{marginTop: 4, fontWeight:'bold', animation:'pulse 1s infinite'}}>⏳ 승인 대기중</Tag> : (r.isBlocked && <Tag color="red" style={{marginTop:4}}>🚫 접속차단</Tag>)}
          </div>
      )
    },
    {
      title: '이용권',
      render: (_, r) => {
        if (['super_admin', 'admin'].includes(r.role)) return <Tag color="gold">무제한</Tag>;
        if (!r.expiryDate) return <Tag color="red">만료됨</Tag>;
        const d = r.expiryDate.toDate();
        return <Tag color={d < new Date() ? "red" : "geekblue"}>{dayjs(d).format('YYYY-MM-DD HH:mm')}</Tag>;
      }
    },
    {
      title: <span><RobotOutlined /> 텔레그램</span>, width: 220,
      render: (_, r) => {
        if (!r.telegramChatId) return <span style={{color:'#6b7280', fontSize:12}}>미연동</span>;
        return (
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
                <Tag color="purple">{r.telegramChatId.substring(0, 6)}..</Tag>
                <Tag color={r.isTelegramActive ? "success" : "default"}>{r.isTelegramActive ? "ON" : "OFF"}</Tag>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11}}>
                <span style={{color:'#f59e0b'}}><ThunderboltOutlined /> {r.strategyLevel || 1}단계</span>
                <Switch size="small" checked={!r.isTelegramBlocked} onChange={() => toggleTelegramBlock(r)} />
            </div>
          </div>
        );
      }
    },
    {
      title: '관리', render: (_, r) => (
        <div style={{display:'flex', gap: 5, flexWrap:'wrap'}}>
            {r.isApproved === false && (
                <Button type="primary" size="small" style={{background:'#10b981', borderColor:'#10b981', width:'100%', marginBottom: 5}} onClick={() => approveUser(r)}>가입 승인</Button>
            )}
            <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingUser(r); form.setFieldsValue({ ...r, password: '', expiryDate: r.expiryDate ? dayjs(r.expiryDate.toDate()) : null }); setIsUserModalVisible(true); }} />
            <Button size="small" type="primary" onClick={() => extendTime(r.id, 30)}>+30일</Button>
            <Tooltip title={r.isBlocked ? "차단 해제" : "접속 차단"}>
                <Button size="small" style={{background: r.isBlocked ? '#10b981' : '#f59e0b', border:'none', color:'white'}} icon={r.isBlocked ? <UnlockOutlined /> : <LockOutlined />} onClick={() => toggleUserBlock(r)} />
            </Tooltip>
            <Popconfirm title="삭제?" onConfirm={() => handleDeleteUser(r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
        </div>
      )
    }
  ];

  const couponColumns = [ { title: '코드', dataIndex: 'code', render: t => <Tag color="cyan">{t}</Tag> }, { title: '기간', dataIndex: 'days', render: d => <b>{d}일</b> }, { title: '상태', render: (_, r) => r.isUsed ? <Tag color="red">사용됨</Tag> : <Tag color="green">가능</Tag> }, { title: '삭제', render: (_, r) => <Button danger size="small" onClick={() => handleDeleteCoupon(r.id)} icon={<DeleteOutlined />} /> } ];
  const pendingUsers = users.filter(u => u.isApproved === false).length;

  return (
    <AdminLayout>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom: 20}}>
            <h1 style={{color:'white', margin:0}}>ADMIN CONSOLE</h1>
            <div style={{display:'flex', gap: 10}}>
                <Button icon={<BarcodeOutlined />} onClick={() => setIsCouponModalVisible(true)} size="large" style={{background:'#0f766e', color:'white', border:'none'}}>쿠폰 관리</Button>
                <Button type="primary" icon={<UserAddOutlined />} onClick={() => { setEditingUser(null); form.resetFields(); setIsUserModalVisible(true); }} size="large">신규 유저</Button>
            </div>
        </div>
        <Row gutter={16} style={{marginBottom: 24}}>
            <Col span={6}><StatsCard><Statistic title="총 회원" value={users.length} prefix={<UserAddOutlined />} /></StatsCard></Col>
            <Col span={6}><StatsCard><Statistic title="가입 승인 대기" value={pendingUsers} valueStyle={{color: pendingUsers > 0 ? '#ef4444' : '#9ca3af'}} prefix={<CheckCircleOutlined />} /></StatsCard></Col>
            <Col span={6}><StatsCard><Statistic title="텔레그램" value={users.filter(u=>u.isTelegramActive && !u.isTelegramBlocked).length} valueStyle={{color:'#3b82f6'}} prefix={<RobotOutlined />} /></StatsCard></Col>
            <Col span={6}><StatsCard><Statistic title="쿠폰" value={coupons.filter(c=>!c.isUsed).length} valueStyle={{color:'#f59e0b'}} prefix={<BarcodeOutlined />} /></StatsCard></Col>
        </Row>
        <div style={{marginBottom: 16, display:'flex', justifyContent:'flex-end'}}>
            <Input placeholder="ID 검색..." prefix={<SearchOutlined />} onChange={e => setSearchText(e.target.value)} style={{width: 250, background:'#1f2937', border:'1px solid #374151', color:'white'}} />
        </div>
        <StyledTable columns={userColumns} dataSource={users} rowKey="id" loading={loading} pagination={{ pageSize: 8 }} />
        
        <Modal title={editingUser ? "정보 수정" : "신규 생성"} open={isUserModalVisible} onOk={handleUserOk} onCancel={() => setIsUserModalVisible(false)}>
            <Form form={form} layout="vertical">
                <Form.Item name="username" label="아이디"><Input disabled={!!editingUser} /></Form.Item>
                <Form.Item name="password" label="비밀번호"><Input.Password /></Form.Item>
                <Form.Item name="role" label="등급" initialValue="user"><Select><Option value="user">회원</Option><Option value="admin">관리자</Option></Select></Form.Item>
                <Form.Item name="expiryDate" label="만료일"><DatePicker showTime style={{width:'100%'}} /></Form.Item>
            </Form>
        </Modal>
        <Modal title="쿠폰 관리" open={isCouponModalVisible} onCancel={() => setIsCouponModalVisible(false)} footer={null} width={700}>
            <div style={{display:'flex', gap:10, marginBottom: 20}}>
                <Form form={couponForm} layout="inline" onFinish={handleCreateCoupon}>
                    <Form.Item name="days" initialValue={30}><Input type="number" style={{width:100}} /></Form.Item>
                    <Button type="primary" htmlType="submit">생성</Button>
                </Form>
            </div>
            <Table dataSource={coupons} columns={couponColumns} rowKey="id" pagination={{pageSize:5}} size="small" />
        </Modal>
    </AdminLayout>
  );
};
export default Admin;