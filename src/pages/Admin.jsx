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
  LogoutOutlined, StopOutlined, CheckCircleOutlined, 
  UserAddOutlined, PoweroffOutlined, SyncOutlined 
} from '@ant-design/icons';

// --- 🎨 스타일 컴포넌트 ---
const Container = styled.div`
  padding: 40px;
  background-color: #111827;
  min-height: 100vh;
  color: white;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  
  h1 {
    color: #d4af37;
    margin: 0;
    font-size: 24px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .actions {
    display: flex;
    gap: 10px;
  }
`;

const DarkTable = styled(Table)`
  .ant-table {
    background: #1f2937;
    color: #d1d5db;
    border-radius: 8px;
  }
  .ant-table-thead > tr > th {
    background: #374151 !important;
    color: #9ca3af !important;
    border-bottom: 1px solid #4b5563 !important;
  }
  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #374151 !important;
    color: #e5e7eb !important;
  }
  .ant-table-tbody > tr:hover > td {
    background: #111827 !important;
  }
  .ant-pagination-item-link, .ant-pagination-item {
    background: transparent !important;
    border-color: #374151 !important;
    a { color: #9ca3af !important; }
  }
  .ant-pagination-item-active {
    border-color: #d4af37 !important;
    a { color: #d4af37 !important; }
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

  // 유저 목록 가져오기
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // 최신 생성순 정렬 (선택사항)
      userList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setUsers(userList);
    } catch (error) {
      message.error("유저 목록 로딩 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
        currentSessionId: null, // 이중 접속 방지를 위한 초기값
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

  // 유저 삭제
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "users", id));
      message.success('삭제 완료');
      fetchUsers();
    } catch (error) {
      message.error('삭제 실패: ' + error.message);
    }
  };

  // 1. 차단/해제 토글 (스위치) + 접속 끊기
  const handleToggleBlock = async (record) => {
    const newStatus = !record.isBlocked; // true면 차단, false면 정상
    try {
      await updateDoc(doc(db, "users", record.id), {
        isBlocked: newStatus,
        // 차단 시 세션을 null로 만들어 강제 로그아웃 유도
        currentSessionId: newStatus ? null : record.currentSessionId 
      });
      message.success(newStatus ? `[${record.username}] 차단됨 (세션 종료)` : `[${record.username}] 차단 해제`);
      fetchUsers(); 
    } catch (error) {
      message.error("상태 변경 실패: " + error.message);
    }
  };

  // 2. 강제 로그아웃 (이중 접속 꼬임 해결용)
  const handleForceLogout = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), {
        currentSessionId: null // DB 세션을 날려서 클라이언트에서 튕기게 함
      });
      message.success('해당 유저를 강제 로그아웃 처리했습니다.');
      fetchUsers();
    } catch (error) {
      message.error('로그아웃 처리 실패: ' + error.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (text) => <span style={{ color: 'white', fontWeight: 'bold' }}>{text}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'magenta' : 'blue'}>
          {role.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Level',
      dataIndex: 'entryLevel',
      key: 'entryLevel',
      render: (lvl) => <Tag color="gold">{lvl}단계</Tag>,
    },
    {
      title: 'Connection', // 접속 상태 (이중 접속 확인용)
      key: 'connection',
      align: 'center',
      render: (_, record) => {
        const isOnline = !!record.currentSessionId;
        return (
          <Tag color={isOnline ? 'processing' : 'default'}>
            {isOnline ? '🟢 접속중' : '⚪ 오프라인'}
          </Tag>
        );
      }
    },
    {
      title: 'Status (Block)', // 허용/차단 스위치
      key: 'status',
      align: 'center',
      render: (_, record) => (
        <Switch
          checkedChildren="정상"
          unCheckedChildren="차단"
          checked={!record.isBlocked} // 차단 안됐으면(false) -> 스위치 켜짐(true/정상)
          onChange={() => handleToggleBlock(record)}
          style={{ 
            backgroundColor: record.isBlocked ? '#ef4444' : '#10b981' 
          }}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          
          {/* 강제 로그아웃 버튼 (접속중일 때만 표시) */}
          <Tooltip title="세션 초기화 (강제 로그아웃)">
            <Button 
              type="default" 
              size="small"
              icon={<PoweroffOutlined />}
              disabled={!record.currentSessionId} // 오프라인이면 비활성
              onClick={() => handleForceLogout(record.id)}
              style={{ borderColor: '#eab308', color: '#eab308', background: 'transparent' }}
            />
          </Tooltip>

          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="primary" danger size="small">
              삭제
            </Button>
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
          <Button icon={<SyncOutlined />} onClick={fetchUsers} type="text" style={{color: 'gray'}}>
            새로고침
          </Button>
          <Button 
            type="primary" 
            icon={<UserAddOutlined />} 
            onClick={() => setIsModalOpen(true)}
            style={{ background: '#d4af37', borderColor: '#d4af37' }}
          >
            유저 생성
          </Button>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            로그아웃
          </Button>
        </div>
      </Header>

      <DarkTable 
        dataSource={users} 
        columns={columns} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 10 }} 
      />

      {/* 유저 생성 모달 */}
      <Modal 
        title="Create New User" 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)} 
        footer={null}
      >
        <Form 
          form={form} 
          onFinish={handleCreateUser} 
          layout="vertical"
          initialValues={{ role: 'user', entryLevel: 1 }}
        >
          <Form.Item 
            name="username" 
            label="Username" 
            rules={[{ required: true, message: '아이디를 입력하세요' }]}
          >
            <Input placeholder="Enter username" />
          </Form.Item>

          <Form.Item 
            name="password" 
            label="Password" 
            rules={[{ required: true, message: '비밀번호를 입력하세요' }]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Form.Item name="role" label="Role">
            <Select>
              <Select.Option value="user">User</Select.Option>
              <Select.Option value="admin">Admin</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="entryLevel" label="Entry Level (진입 단계)">
            <Select>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <Select.Option key={n} value={n}>{n}단계</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              생성하기
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Container>
  );
};

export default Admin;