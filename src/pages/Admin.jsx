import React, { useState, useEffect } from 'react';
import { 
  Table, Layout, Button, Input, Modal, Form, DatePicker, 
  Select, Tag, message, Popconfirm, Card, Row, Col, Statistic, Switch, Tooltip, Badge
} from 'antd';
import { 
  SearchOutlined, UserAddOutlined, DeleteOutlined, 
  EditOutlined, RobotOutlined, StopOutlined, CheckCircleOutlined, ThunderboltOutlined 
} from '@ant-design/icons';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from '../firebase';
import styled from 'styled-components';
import dayjs from 'dayjs';

const { Option } = Select;

// --- 스타일 컴포넌트 ---
const AdminLayout = styled(Layout)`
  background: #111827; 
  min-height: 100vh;
  padding: 20px;
  color: white;
`;

const StyledTable = styled(Table)`
  .ant-table { background: transparent; color: #e5e7eb; }
  .ant-table-thead > tr > th { background: #1f2937 !important; color: #9ca3af !important; border-bottom: 1px solid #374151 !important; }
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
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  // --- 실시간 유저 데이터 가져오기 ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 유저 생성/수정 ---
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const userData = {
        ...values,
        expiryDate: values.expiryDate ? values.expiryDate.toDate() : null,
      };

      if (editingUser) {
        await updateDoc(doc(db, "users", editingUser.id), userData);
        message.success('유저 정보 수정 완료');
      } else {
        await setDoc(doc(db, "users", values.username), {
            ...userData,
            createdAt: Timestamp.now(),
            isBlocked: false,
            telegramChatId: '',
            isTelegramActive: false,
            isTelegramBlocked: false, 
            strategyLevel: 1 // 기본 전략 1단계
        });
        message.success('새 유저 생성 완료');
      }
      setIsModalVisible(false);
      form.resetFields();
      setEditingUser(null);
    } catch (error) {
      message.error('오류 발생: ' + error.message);
    }
  };

  // --- 유저 삭제 ---
  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "users", id));
    message.success('유저 삭제 완료');
  };

  // --- 이용권 연장 ---
  const extendTime = async (id, days) => {
    const user = users.find(u => u.id === id);
    let currentExpiry = user.expiryDate ? user.expiryDate.toDate() : new Date();
    if (currentExpiry < new Date()) currentExpiry = new Date();
    
    const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
    await updateDoc(doc(db, "users", id), { expiryDate: newExpiry });
    message.success(`${days}일 연장되었습니다.`);
  };

  // --- 🔥 [기능] 텔레그램 알림 차단 토글 ---
  const toggleTelegramBlock = async (user) => {
    const currentStatus = user.isTelegramBlocked || false;
    const newStatus = !currentStatus; // 반대로 전환

    try {
        await updateDoc(doc(db, "users", user.id), {
            isTelegramBlocked: newStatus
        });
        
        if (newStatus) message.error(`${user.id}님의 알림을 차단했습니다.`);
        else message.success(`${user.id}님의 차단을 해제했습니다.`);
    } catch (e) {
        message.error('상태 변경 실패');
    }
  };

  // --- 테이블 컬럼 정의 ---
  const columns = [
    {
      title: '유저명 (ID)',
      dataIndex: 'id',
      key: 'id',
      render: text => <span style={{fontWeight:'bold', color:'white'}}>{text}</span>,
      filteredValue: [searchText],
      onFilter: (value, record) => String(record.id).toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: '등급',
      dataIndex: 'role',
      key: 'role',
      render: role => {
        let color = 'default';
        if (role === 'super_admin') color = 'gold';
        if (role === 'admin') color = 'orange';
        if (role === 'distributor') color = 'cyan';
        if (role === 'user') color = 'blue';
        return <Tag color={color}>{role.toUpperCase()}</Tag>;
      }
    },
    {
      title: '이용권 만료일',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (date, record) => {
        if (['super_admin', 'admin'].includes(record.role)) return <Tag color="gold">무제한</Tag>;
        if (!date) return <Tag color="red">미등록</Tag>;
        const d = date.toDate();
        const isExpired = d < new Date();
        return <Tag color={isExpired ? "red" : "green"}>{dayjs(d).format('YYYY-MM-DD HH:mm')}</Tag>;
      }
    },
    // 🔥 [핵심] 텔레그램 관리 컬럼
    {
      title: <span><RobotOutlined /> 텔레그램 상태</span>,
      key: 'telegram',
      width: 280,
      render: (_, record) => {
        const hasChatId = !!record.telegramChatId;
        const isActive = record.isTelegramActive;
        const strategy = record.strategyLevel || 1; // 유저 설정 단계
        const isBlocked = record.isTelegramBlocked || false; // 관리자 차단 여부

        if (!hasChatId) return <Tag color="default" style={{color:'#6b7280'}}>미신청</Tag>;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '5px 0' }}>
            {/* 1줄: 아이디 & 유저 설정 상태 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tooltip title={`Chat ID: ${record.telegramChatId}`}>
                    <Tag color="geekblue" icon={<RobotOutlined />}>
                        {record.telegramChatId.substring(0, 6)}...
                    </Tag>
                </Tooltip>
                
                {/* 유저가 켰는지 껐는지 표시 */}
                <Badge status={isActive ? "processing" : "default"} text={isActive ? <span style={{color:'#10b981', fontSize:12}}>수신ON</span> : <span style={{color:'#6b7280', fontSize:12}}>수신OFF</span>} />
            </div>
            
            {/* 2줄: 설정 단계 & 관리자 차단 스위치 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background:'rgba(255,255,255,0.05)', padding:'4px 8px', borderRadius: 4 }}>
                <div style={{display:'flex', alignItems:'center', gap:5}}>
                    <ThunderboltOutlined style={{color: '#f59e0b'}} />
                    <span style={{color: '#e5e7eb', fontWeight:'bold', fontSize: 12}}>
                        {strategy}단계 설정
                    </span>
                </div>

                <div style={{display:'flex', alignItems:'center', gap: 5}}>
                    <span style={{fontSize: 11, color: isBlocked ? '#ef4444' : '#10b981'}}>
                        {isBlocked ? "차단됨" : "허용됨"}
                    </span>
                    <Switch 
                        size="small"
                        checked={!isBlocked} // 차단 안됐으면 켜짐(초록)
                        onChange={() => toggleTelegramBlock(record)}
                        style={{ background: isBlocked ? '#ef4444' : '#10b981' }}
                    />
                </div>
            </div>
          </div>
        );
      }
    },
    {
      title: '관리',
      key: 'action',
      render: (_, record) => (
        <div style={{display:'flex', gap: 8}}>
            <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingUser(record); form.setFieldsValue({ ...record, expiryDate: record.expiryDate ? dayjs(record.expiryDate.toDate()) : null }); setIsModalVisible(true); }}>수정</Button>
            <Button size="small" type="primary" onClick={() => extendTime(record.id, 30)}>+30일</Button>
            <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDelete(record.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
        </div>
      )
    }
  ];

  // 통계 집계
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.expiryDate && u.expiryDate.toDate() > new Date()).length;
  const telegramUsers = users.filter(u => u.telegramChatId && u.isTelegramActive && !u.isTelegramBlocked).length;

  return (
    <AdminLayout>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
            <h1 style={{color:'white', margin:0, fontSize:24, fontWeight:900}}>ADMIN DASHBOARD</h1>
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => { setEditingUser(null); form.resetFields(); setIsModalVisible(true); }} size="large" style={{background:'#2563eb'}}>
                신규 유저 생성
            </Button>
        </div>

        <Row gutter={16} style={{marginBottom: 24}}>
            <Col span={8}>
                <StatsCard><Statistic title="총 회원수" value={totalUsers} prefix={<UserAddOutlined />} /></StatsCard>
            </Col>
            <Col span={8}>
                <StatsCard><Statistic title="활성 이용자" value={activeUsers} valueStyle={{color: '#10b981'}} prefix={<CheckCircleOutlined />} /></StatsCard>
            </Col>
            <Col span={8}>
                <StatsCard><Statistic title="텔레그램 알림 발송중" value={telegramUsers} valueStyle={{color: '#3b82f6'}} prefix={<RobotOutlined />} /></StatsCard>
            </Col>
        </Row>

        <div style={{marginBottom: 16, display:'flex', justifyContent:'flex-end'}}>
            <Input placeholder="유저 아이디 검색..." prefix={<SearchOutlined />} onChange={e => setSearchText(e.target.value)} style={{width: 250, background:'#1f2937', border:'1px solid #374151', color:'white'}} />
        </div>

        <StyledTable 
            columns={columns} 
            dataSource={users} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 10 }} 
        />

        <Modal
            title={editingUser ? "유저 정보 수정" : "신규 유저 생성"}
            open={isModalVisible}
            onOk={handleOk}
            onCancel={() => setIsModalVisible(false)}
        >
            <Form form={form} layout="vertical">
                <Form.Item name="username" label="아이디 (Email)" rules={[{ required: true }]}>
                    <Input disabled={!!editingUser} />
                </Form.Item>
                <Form.Item name="role" label="등급" rules={[{ required: true }]}>
                    <Select>
                        <Option value="user">일반 회원 (User)</Option>
                        <Option value="store">매장 (Store)</Option>
                        <Option value="distributor">총판 (Distributor)</Option>
                        <Option value="admin">관리자 (Admin)</Option>
                    </Select>
                </Form.Item>
                <Form.Item name="expiryDate" label="만료일 설정">
                    <DatePicker showTime style={{width:'100%'}} />
                </Form.Item>
            </Form>
        </Modal>
    </AdminLayout>
  );
};

export default Admin;