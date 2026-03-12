import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Form, Input, Select, message, Popconfirm, Tag, Switch, Tooltip 
} from 'antd';
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
// src/pages 안에 있으므로 firebase는 ../ 로 나갑니다.
import { db } from '../firebase'; 
import bcrypt from 'bcryptjs';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { 
  LogoutOutlined, UserAddOutlined, PoweroffOutlined, SyncOutlined 
} from '@ant-design/icons';

const Container = styled.div`
  padding: 40px; background-color: #111827; min-height: 100vh; color: white;
`;
const Header = styled.div`
  display: flex; justify-content: space-between; margin-bottom: 30px;
  h1 { color: #d4af37; margin: 0; }
`;
const DarkTable = styled(Table)`
  .ant-table { background: #1f2937; color: #d1d5db; }
  .ant-table-thead > tr > th { background: #374151 !important; color: #9ca3af !important; border-bottom: 1px solid #4b5563 !important; }
  .ant-table-tbody > tr > td { border-bottom: 1px solid #374151 !important; color: #e5e7eb !important; }
  .ant-table-tbody > tr:hover > td { background: #111827 !important; }
`;

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const q = await getDocs(collection(db, "users"));
      const list = q.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setUsers(list);
    } catch (e) { message.error(e.message); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreateUser = async (v) => {
    try {
      const hash = await bcrypt.hash(v.password, 10);
      await setDoc(doc(db, "users", v.username), {
        username: v.username, password: hash, role: v.role, entryLevel: v.entryLevel,
        isBlocked: false, currentSessionId: null, createdAt: new Date().toISOString()
      });
      message.success('생성 완료'); setIsModalOpen(false); fetchUsers();
    } catch (e) { message.error(e.message); }
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "users", id));
    fetchUsers();
  };

  // 차단 토글
  const handleToggleBlock = async (record) => {
    const newStatus = !record.isBlocked;
    await updateDoc(doc(db, "users", record.id), {
      isBlocked: newStatus,
      currentSessionId: newStatus ? null : record.currentSessionId
    });
    message.success(newStatus ? '차단됨' : '해제됨');
    fetchUsers();
  };

  // 강제 로그아웃
  const handleForceLogout = async (id) => {
    await updateDoc(doc(db, "users", id), { currentSessionId: null });
    message.success('강제 로그아웃 처리');
    fetchUsers();
  };

  const columns = [
    { title: 'Username', dataIndex: 'username', key: 'username', render: t => <b style={{color:'white'}}>{t}</b> },
    { title: 'Level', dataIndex: 'entryLevel', render: l => <Tag color="gold">{l}</Tag> },
    { title: '접속상태', key: 'conn', align: 'center', render: (_, r) => <Tag color={r.currentSessionId ? 'processing' : 'default'}>{r.currentSessionId ? '🟢 접속중' : '⚪ 오프라인'}</Tag> },
    { title: '차단설정', key: 'status', align: 'center', render: (_, r) => 
      <Switch checkedChildren="정상" unCheckedChildren="차단" checked={!r.isBlocked} onChange={() => handleToggleBlock(r)} style={{ bg: r.isBlocked ? 'red' : 'green' }} /> 
    },
    { title: '관리', key: 'action', align: 'center', render: (_, r) => (
      <div style={{display:'flex', gap:8, justifyContent:'center'}}>
        <Tooltip title="강제 로그아웃"><Button size="small" icon={<PoweroffOutlined />} disabled={!r.currentSessionId} onClick={() => handleForceLogout(r.id)} style={{color:'#eab308', borderColor:'#eab308'}} ghost /></Tooltip>
        <Popconfirm title="삭제?" onConfirm={() => handleDelete(r.id)}><Button danger size="small">삭제</Button></Popconfirm>
      </div>
    )}
  ];

  return (
    <Container>
      <Header>
        <h1>ADMIN PAGE</h1>
        <div>
          <Button icon={<SyncOutlined />} onClick={fetchUsers} type="text" style={{color:'gray'}}>새로고침</Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setIsModalOpen(true)} style={{background:'#d4af37'}}>유저생성</Button>
          <Button icon={<LogoutOutlined />} onClick={() => { localStorage.clear(); navigate('/'); }}>나가기</Button>
        </div>
      </Header>
      <DarkTable dataSource={users} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
      <Modal title="유저 생성" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
        <Form form={form} onFinish={handleCreateUser} layout="vertical" initialValues={{role:'user', entryLevel:1}}>
          <Form.Item name="username" label="ID" rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="password" label="PW" rules={[{required:true}]}><Input.Password /></Form.Item>
          <Form.Item name="role" label="Role"><Select><Select.Option value="user">User</Select.Option><Select.Option value="admin">Admin</Select.Option></Select></Form.Item>
          <Form.Item name="entryLevel" label="Level"><Select>{[1,2,3,4,5].map(n=><Select.Option key={n} value={n}>{n}</Select.Option>)}</Select></Form.Item>
          <Button type="primary" htmlType="submit" block>생성</Button>
        </Form>
      </Modal>
    </Container>
  );
};

export default Admin;