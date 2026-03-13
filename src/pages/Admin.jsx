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

const { Option } = Select;

// --- 스타일 ---
const AdminLayout = styled(Layout)`
  background: #111827; 
  min-height: 100vh;
  padding: 20px;
  color: white;
`;

const StyledTable = styled(Table)`
  .ant-table { background: transparent; color: #e5e7eb; }
  .ant-table-thead > tr > th { background: #1f2937 !important; color: #9ca3af !important; border-bottom: 1px solid #374151 !important; font-size: 12px; }
  .ant-table-tbody > tr > td { border-bottom: 1px solid #1f2937 !important; color: #e5e7eb !important; }
  .ant-table-tbody > tr:hover > td { background: #374151 !important; }
  .ant-pagination-item-link, .ant-pagination-item { background: transparent !important; border-color: #374151 !important; a { color: #9ca3af !important; } }
  .ant-pagination-item-active { border-color: #10b981 !important; a { color: #10b981 !important; } }
`;

const StatsCard = styled(Card)`
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px;
  .ant-statistic-title { color: #9ca3af; }
  .ant-statistic-content { color: white; font-weight: bold; }
`;

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 모달 상태
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [isCouponModalVisible, setIsCouponModalVisible] = useState(false);
  
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [couponForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  // --- 데이터 실시간 로드 ---
  useEffect(() => {
    // 1. 유저 데이터
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 정렬: 최고관리자 > 접속중 > 나머지
      usersData.sort((a, b) => {
          if (a.role === 'super_admin') return -1;
          if (b.role === 'super_admin') return 1;
          // 접속중인 유저를 위로
          const aOnline = !!a.currentSessionId;
          const bOnline = !!b.currentSessionId;
          return Number(bOnline) - Number(aOnline);
      });
      setUsers(usersData);
      setLoading(false);
    });

    // 2. 쿠폰 데이터
    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snapshot) => {
      const couponData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      couponData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setCoupons(couponData);
    });

    return () => { unsubUsers(); unsubCoupons(); };
  }, []);

  // --- [유저 관리] 생성 및 수정 ---
  const handleUserOk = async () => {
    try {
      const values = await form.validateFields();
      const userData = {
        ...values,
        expiryDate: values.expiryDate ? values.expiryDate.toDate() : null,
      };

      if (editingUser) {
        await updateDoc(doc(db, "users", editingUser.id), userData);
        message.success('유저 정보가 수정되었습니다.');
      } else {
        await setDoc(doc(db, "users", values.username), {
            ...userData,
            password: values.password, 
            createdAt: Timestamp.now(),
            isBlocked: false,
            telegramChatId: '',
            isTelegramActive: false,
            isTelegramBlocked: false, 
            strategyLevel: 1,
            currentSessionId: null // 초기엔 접속 안함
        });
        message.success('신규 유저가 생성되었습니다.');
      }
      setIsUserModalVisible(false);
      form.resetFields();
      setEditingUser(null);
    } catch (error) {
      message.error('입력값을 확인해주세요.');
    }
  };

  // --- [유저 관리] 삭제 ---
  const handleDeleteUser = async (id) => {
    await deleteDoc(doc(db, "users", id));
    message.success('유저가 삭제되었습니다.');
  };

  // --- [유저 관리] 계정 차단/해제 (로그인 차단) ---
  const toggleUserBlock = async (user) => {
    const newStatus = !user.isBlocked;
    // 차단 시 세션도 끊어서 강제 로그아웃 시키기
    await updateDoc(doc(db, "users", user.id), { 
        isBlocked: newStatus,
        currentSessionId: newStatus ? null : user.currentSessionId 
    });
    if(newStatus) message.warning('해당 계정의 접속을 차단했습니다.');
    else message.success('접속 차단을 해제했습니다.');
  };

  // --- [유저 관리] 이용권 연장 ---
  const extendTime = async (id, days) => {
    const user = users.find(u => u.id === id);
    let currentExpiry = user.expiryDate ? user.expiryDate.toDate() : new Date();
    if (currentExpiry < new Date()) currentExpiry = new Date();
    
    const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
    await updateDoc(doc(db, "users", id), { expiryDate: newExpiry });
    message.success(`${days}일 연장되었습니다.`);
  };

  // --- [텔레그램] 알림 차단 토글 ---
  const toggleTelegramBlock = async (user) => {
    const newStatus = !user.isTelegramBlocked;
    await updateDoc(doc(db, "users", user.id), { 
        isTelegramBlocked: newStatus,
        isTelegramActive: newStatus ? false : user.isTelegramActive 
    });
    if (newStatus) message.error('텔레그램 알림을 차단했습니다.');
    else message.success('텔레그램 차단을 해제했습니다.');
  };

  // --- [쿠폰 관리] 생성 ---
  const handleCreateCoupon = async () => {
      try {
          const values = await couponForm.validateFields();
          const code = `WB-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
          
          await addDoc(collection(db, "coupons"), {
              code: code,
              days: values.days,
              isUsed: false,
              usedBy: null,
              createdAt: Timestamp.now()
          });
          
          message.success(`쿠폰 생성 완료: ${code}`);
          couponForm.resetFields();
      } catch (e) {
          message.error("생성 실패");
      }
  };

  const handleDeleteCoupon = async (id) => {
      await deleteDoc(doc(db, "coupons", id));
      message.success("쿠폰 삭제됨");
  };

  // --- 유저 테이블 컬럼 ---
  const userColumns = [
    {
      title: '유저정보',
      key: 'userinfo',
      width: 200,
      render: (_, record) => {
          // 🔥 [추가] 접속 상태 확인 (SessionId 존재 여부)
          const isOnline = !!record.currentSessionId;
          
          return (
            <div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4}}>
                    <div style={{fontWeight:'bold', color:'white', fontSize: 14}}>{record.id}</div>
                    {/* 접속 상태 뱃지 */}
                    <Tag icon={isOnline ? <WifiOutlined /> : <PoweroffOutlined />} color={isOnline ? "success" : "default"}>
                        {isOnline ? "ONLINE" : "OFF"}
                    </Tag>
                </div>
                <div style={{fontSize: 11, color: '#9ca3af'}}>
                   {record.role === 'super_admin' ? <Tag color="gold">최고관리자</Tag> : 
                    record.role === 'admin' ? <Tag color="orange">관리자</Tag> : 
                    record.role === 'distributor' ? <Tag color="cyan">총판</Tag> : <Tag color="blue">회원</Tag>}
                </div>
            </div>
          );
      },
      filteredValue: [searchText],
      onFilter: (value, record) => String(record.id).toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: '접속 정보',
      key: 'connection',
      render: (_, record) => (
          <div style={{fontSize: 12}}>
              <div style={{color: '#e5e7eb'}}>
                  <WifiOutlined style={{marginRight: 5, color: '#10b981'}} /> 
                  IP: {record.ipAddress || '기록없음'}
              </div>
              <div style={{color: '#9ca3af', marginTop: 2}}>
                  Last: {record.lastLogout ? dayjs(record.lastLogout.toDate()).format('MM-DD HH:mm') : '-'}
              </div>
              {record.isBlocked && <Tag color="red" style={{marginTop: 4, fontWeight:'bold'}}>🚫 접속차단됨</Tag>}
          </div>
      )
    },
    {
      title: '이용권',
      key: 'expiry',
      render: (_, record) => {
        if (['super_admin', 'admin'].includes(record.role)) return <Tag color="gold">무제한</Tag>;
        if (!record.expiryDate) return <Tag color="red">만료됨</Tag>;
        const d = record.expiryDate.toDate();
        return <Tag color={d < new Date() ? "red" : "geekblue"}>{dayjs(d).format('YYYY-MM-DD HH:mm')}</Tag>;
      }
    },
    // 텔레그램 관리
    {
      title: <span><RobotOutlined /> 텔레그램</span>,
      key: 'telegram',
      width: 220,
      render: (_, record) => {
        const hasChatId = !!record.telegramChatId;
        const isActive = record.isTelegramActive;
        const isBlocked = record.isTelegramBlocked || false;

        if (!hasChatId) return <span style={{color:'#6b7280', fontSize:12}}>미연동</span>;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Tag color="purple">{record.telegramChatId.substring(0, 6)}..</Tag>
                <Tag color={isActive ? "success" : "default"}>{isActive ? "ON" : "OFF"}</Tag>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems:'center', fontSize:11 }}>
                <span style={{color:'#f59e0b'}}><ThunderboltOutlined /> {record.strategyLevel || 1}단계</span>
                <Switch size="small" checked={!isBlocked} onChange={() => toggleTelegramBlock(record)} />
            </div>
          </div>
        );
      }
    },
    {
      title: '관리',
      key: 'action',
      render: (_, record) => (
        <div style={{display:'flex', gap: 5, flexWrap:'wrap'}}>
            <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingUser(record); form.setFieldsValue({ ...record, expiryDate: record.expiryDate ? dayjs(record.expiryDate.toDate()) : null }); setIsUserModalVisible(true); }} />
            <Button size="small" type="primary" onClick={() => extendTime(record.id, 30)}>+30일</Button>
            
            <Tooltip title={record.isBlocked ? "차단 해제" : "접속 차단"}>
                <Button size="small" style={{background: record.isBlocked ? '#10b981' : '#f59e0b', border:'none', color:'white'}} icon={record.isBlocked ? <UnlockOutlined /> : <LockOutlined />} onClick={() => toggleUserBlock(record)} />
            </Tooltip>

            <Popconfirm title="영구 삭제하시겠습니까?" onConfirm={() => handleDeleteUser(record.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
        </div>
      )
    }
  ];

  const couponColumns = [
      { title: '쿠폰 코드', dataIndex: 'code', key: 'code', render: text => <Tag color="cyan" style={{fontSize:14, padding:'5px 10px'}}>{text}</Tag> },
      { title: '기간', dataIndex: 'days', key: 'days', render: d => <b>{d}일</b> },
      { title: '상태', key: 'status', render: (_, r) => r.isUsed ? <Tag color="red">사용완료 ({r.usedBy})</Tag> : <Tag color="green">사용가능</Tag> },
      { title: '생성일', dataIndex: 'createdAt', render: d => <span style={{color:'#9ca3af'}}>{d ? dayjs(d.toDate()).format('MM-DD HH:mm') : '-'}</span> },
      { title: '삭제', key: 'del', render: (_, r) => <Button danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteCoupon(r.id)} /> }
  ];

  // --- 통계 (접속자 수 실시간 반영) ---
  const totalUsers = users.length;
  // 🔥 접속자 수: currentSessionId가 있는 유저
  const onlineUsers = users.filter(u => !!u.currentSessionId).length;
  const telegramUsers = users.filter(u => u.telegramChatId && u.isTelegramActive && !u.isTelegramBlocked).length;

  return (
    <AdminLayout>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
            <h1 style={{color:'white', margin:0, fontSize:24, fontWeight:900}}>ADMIN CONSOLE</h1>
            <div style={{display:'flex', gap: 10}}>
                <Button icon={<BarcodeOutlined />} onClick={() => setIsCouponModalVisible(true)} size="large" style={{background:'#0f766e', color:'white', border:'none', fontWeight:'bold'}}>
                    쿠폰 관리
                </Button>
                <Button type="primary" icon={<UserAddOutlined />} onClick={() => { setEditingUser(null); form.resetFields(); setIsUserModalVisible(true); }} size="large" style={{fontWeight:'bold'}}>
                    신규 유저 생성
                </Button>
            </div>
        </div>

        {/* 상단 통계 카드 */}
        <Row gutter={16} style={{marginBottom: 24}}>
            <Col span={6}><StatsCard><Statistic title="총 회원수" value={totalUsers} prefix={<UserAddOutlined />} /></StatsCard></Col>
            {/* 🔥 실시간 접속자 수 표시 */}
            <Col span={6}><StatsCard><Statistic title="현재 접속자 (ONLINE)" value={onlineUsers} valueStyle={{color:'#10b981'}} prefix={<WifiOutlined />} /></StatsCard></Col>
            <Col span={6}><StatsCard><Statistic title="텔레그램 발송중" value={telegramUsers} valueStyle={{color:'#3b82f6'}} prefix={<RobotOutlined />} /></StatsCard></Col>
            <Col span={6}><StatsCard><Statistic title="미사용 쿠폰" value={coupons.filter(c=>!c.isUsed).length} valueStyle={{color:'#f59e0b'}} prefix={<BarcodeOutlined />} /></StatsCard></Col>
        </Row>

        <div style={{marginBottom: 16, display:'flex', justifyContent:'flex-end'}}>
            <Input placeholder="ID 검색..." prefix={<SearchOutlined />} onChange={e => setSearchText(e.target.value)} style={{width: 250, background:'#1f2937', border:'1px solid #374151', color:'white'}} />
        </div>

        <StyledTable 
            columns={userColumns} 
            dataSource={users} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 8 }} 
        />

        <Modal
            title={editingUser ? "유저 정보 수정" : "신규 유저 생성"}
            open={isUserModalVisible}
            onOk={handleUserOk}
            onCancel={() => setIsUserModalVisible(false)}
        >
            <Form form={form} layout="vertical">
                <Form.Item name="username" label="아이디" rules={[{ required: true }]}>
                    <Input disabled={!!editingUser} />
                </Form.Item>
                {!editingUser && (
                    <Form.Item name="password" label="비밀번호 (코드)" rules={[{ required: true }]}>
                        <Input.Password placeholder="유저에게 전달할 코드 입력" />
                    </Form.Item>
                )}
                <Form.Item name="role" label="등급" initialValue="user">
                    <Select>
                        <Option value="user">일반 회원</Option>
                        <Option value="store">매장</Option>
                        <Option value="distributor">총판</Option>
                        <Option value="admin">관리자</Option>
                    </Select>
                </Form.Item>
                <Form.Item name="expiryDate" label="만료일">
                    <DatePicker showTime style={{width:'100%'}} />
                </Form.Item>
            </Form>
        </Modal>

        <Modal
            title="쿠폰 관리 시스템"
            open={isCouponModalVisible}
            onCancel={() => setIsCouponModalVisible(false)}
            footer={null}
            width={700}
        >
            <div style={{display:'flex', gap:10, marginBottom: 20, padding: 15, background:'#f3f4f6', borderRadius:8}}>
                <Form form={couponForm} layout="inline" onFinish={handleCreateCoupon}>
                    <Form.Item name="days" label="기간(일)" initialValue={30} rules={[{required:true}]}>
                        <Input type="number" style={{width:100}} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" icon={<ThunderboltOutlined />}>쿠폰 생성</Button>
                </Form>
            </div>
            
            <Table 
                dataSource={coupons} 
                columns={couponColumns} 
                rowKey="id" 
                pagination={{pageSize:5}} 
                size="small"
            />
        </Modal>

    </AdminLayout>
  );
};

export default Admin;