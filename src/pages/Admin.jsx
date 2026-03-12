import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Form, Input, Select, 
  message, Popconfirm, Tag, Switch, Tooltip 
} from 'antd';
import { 
  collection, getDocs, setDoc, doc, deleteDoc, updateDoc 
} from "firebase/firestore";
import { db } from '../firebase';
import bcrypt from 'bcryptjs';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { 
  LogoutOutlined, UserAddOutlined, PoweroffOutlined, SyncOutlined 
} from '@ant-design/icons';

// --- 🎨 스타일 컴포넌트 (예쁜 디자인 복구) ---
const Container = styled.div`
  padding: 40px;
  background-color: #111827; /* 다크 배경 */
  min-height: 100vh;
  color: white;
  font-family: 'Noto Sans KR', sans-serif;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  
  h1 {
    color: #d4af37; /* 골드 컬러 */
    margin: 0;
    font-size: 28px;
    font-weight: 900;
    letter-spacing: 2px;
  }

  .actions {
    display: flex;
    gap: 12px;
  }
`;

// 테이블 스타일 커스텀
const DarkTable = styled(Table)`
  .ant-table {
    background: #1f2937;
    color: #d1d5db;
    border-radius: 12px;
    overflow: hidden;
  }
  .ant-table-thead > tr > th {
    background: #374151 !important;
    color: #d4af37 !important; /* 헤더 골드 */
    border-bottom: 2px solid #4b5563 !important;
    font-weight: bold;
  }
  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #374151 !important;
    color: #e5e7eb !important;
    padding: 16px;
  }
  .ant-table-tbody > tr:hover > td {
    background: #111827 !important;
  }
  .ant-switch-checked {
    background-color: #10b981; 
  }
`;

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // 유저 불러오기
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = await getDocs(collection(db, "users"));
      const list = q.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setUsers(list);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // 유저 생성
  const handleCreateUser = async (values) => {
    try {
      const hashedPassword = await bcrypt.hash(values.password, 10);
      await setDoc(doc(db, "users", values.username), {
        username: values.username,
        password: hashedPassword,
        role: values.role, 
        entryLevel: values.entryLevel,
        isBlocked: false,
        currentSessionId: null,
        createdAt: new Date().toISOString()
      });
      message.success('유저 생성 완료');
      setIsModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      message.error('생성 실패: ' + error.message);
    }
  };

  // 차단 토글
  const handleToggleBlock = async (record) => {
    const newStatus = !record.isBlocked; 
    try {
      await updateDoc(doc(db, "users", record.id), {
        isBlocked: newStatus,
        currentSessionId: newStatus ? null : record.currentSessionId 
      });
      message.success(newStatus ? `[${record.username}] 차단됨` : `차단 해제됨`);
      fetchUsers(); 
    } catch (error) {
      message.error("실패: " + error.message);
    }
  };

  // 강제 로그아웃
  const handleForceLogout = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), { currentSessionId: null });
      message.success('강제 로그아웃 처리');
      fetchUsers();
    } catch (error) {
      message.error('실패: ' + error.message);
    }
  };

  // 삭제
  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "users", id));
    fetchUsers();
  };

  const columns = [
    {
      title: 'USERNAME',
      dataIndex: 'username',
      key: 'username',
      render: (text) => <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1em' }}>{text}</span>,
    },
    {
      title: 'LEVEL',
      dataIndex: 'entryLevel',
      key: 'entryLevel',
      align: 'center',
      render: (lvl) => <Tag color="gold" style={{fontWeight:'bold'}}>{lvl}단계</Tag>,
    },
    {
      title: 'CONNECTION',
      key: 'connection',
      align: 'center',
      render: (_, record) => (
        <Tag color={record.currentSessionId ? 'processing' : 'default'} style={{padding: '4px 10px'}}>
          {record.currentSessionId ? '🟢 접속중' : '⚪ OFF'}
        </Tag>
      )
    },
    {
      title: 'BLOCK',
      key: 'status',
      align: 'center',
      render: (_, record) => (
        <Switch
          checkedChildren="정상"
          unCheckedChildren="차단"
          checked={!record.isBlocked}
          onChange={() => handleToggleBlock(record)}
          style={{ backgroundColor: record.isBlocked ? '#ef4444' : '#10b981' }}
        />
      ),
    },
    {
      title: 'MANAGEMENT',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Tooltip title="강제 로그아웃 (세션 킬)">
            <Button 
              type="dashed" 
              icon={<PoweroffOutlined />}
              disabled={!record.currentSessionId}
              onClick={() => handleForceLogout(record.id)}
              style={{ borderColor: '#eab308', color: '#eab308' }}
            >
              Kick
            </Button>
          </Tooltip>
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDelete(record.id)}>
            <Button type="primary" danger>삭제</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Container>
      <Header>
        <h1>🐋 WHALEBET ADMIN</h1>
        <div className="actions">
          <Button icon={<SyncOutlined />} onClick={fetchUsers} type="text" style={{color: '#9ca3af'}}>새로고침</Button>
          <Button 
            type="primary" 
            icon={<UserAddOutlined />} 
            onClick={() => setIsModalOpen(true)}
            size="large"
            style={{ background: '#d4af37', borderColor: '#d4af37', fontWeight: 'bold' }}
          >
            유저 생성
          </Button>
          <Button icon={<LogoutOutlined />} size="large" onClick={() => { localStorage.clear(); navigate('/'); }}>
            나가기
          </Button>
        </div>
      </Header>

      <DarkTable 
        dataSource={users} 
        columns={columns} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 8 }} 
      />

      <Modal 
        title="Create New User" 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)} 
        footer={null}
      >
        <Form form={form} onFinish={handleCreateUser} layout="vertical" initialValues={{ role: 'user', entryLevel: 1 }}>
          <Form.Item name="username" label="아이디" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="비밀번호" rules={[{ required: true }]}><Input.Password /></Form.Item>
          <Form.Item name="role" label="권한"><Select><Select.Option value="user">User</Select.Option><Select.Option value="admin">Admin</Select.Option></Select></Form.Item>
          <Form.Item name="entryLevel" label="레벨"><Select>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <Select.Option key={n} value={n}>{n}단계</Select.Option>)}</Select></Form.Item>
          <Button type="primary" htmlType="submit" block style={{background:'#d4af37'}}>생성하기</Button>
        </Form>
      </Modal>
    </Container>
  );
};

export default Admin;