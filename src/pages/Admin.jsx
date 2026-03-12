import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Tag, Switch } from 'antd';
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from '../firebase';
import bcrypt from 'bcryptjs';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { LogoutOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';

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
  h1 { color: #d4af37; margin: 0; }
`;

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUsers(userList);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (values) => {
    try {
      const hashedPassword = await bcrypt.hash(values.password, 10);
      await setDoc(doc(db, "users", values.username), {
        username: values.username,
        password: hashedPassword,
        role: 'user',
        entryLevel: values.entryLevel,
        isBlocked: false, // 기본값: 차단 안됨
        currentSessionId: null,
        createdAt: new Date()
      });
      message.success('유저 생성 완료');
      setIsModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      message.error('생성 실패: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "users", id));
    message.success('삭제 완료');
    fetchUsers();
  };

  // 🔥 차단/해제 토글 함수
  const handleToggleBlock = async (id, currentStatus) => {
      try {
          await updateDoc(doc(db, "users", id), {
              isBlocked: !currentStatus
          });
          message.success(!currentStatus ? "유저 접속 차단됨" : "유저 차단 해제됨");
          fetchUsers(); // 목록 새로고침
      } catch (error) {
          message.error("상태 변경 실패");
      }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const columns = [
    { title: 'Username', dataIndex: 'username', key: 'username', render: text => <span style={{color:'white', fontWeight:'bold'}}>{text}</span> },
    { title: 'Level', dataIndex: 'entryLevel', key: 'entryLevel', render: lvl => <Tag color="gold">{lvl}단계</Tag> },
    { 
        title: '접속 상태', 
        key: 'status', 
        render: (_, record) => (
            <Tag color={record.isBlocked ? "error" : "success"}>
                {record.isBlocked ? <><StopOutlined /> 차단됨</> : <><CheckCircleOutlined /> 정상</>}
            </Tag>
        ) 
    },
    {
        title: '접속 제어',
        key: 'action',
        render: (_, record) => (
            <div style={{display:'flex', gap: 10, alignItems:'center'}}>
                {/* 차단 스위치 */}
                <Switch 
                    checkedChildren="정상" 
                    unCheckedChildren="차단" 
                    checked={!record.isBlocked} 
                    onChange={() => handleToggleBlock(record.id, record.isBlocked)}
                    style={{backgroundColor: record.isBlocked ? '#ef4444' : '#10b981'}}
                />
                
                <Popconfirm title="정말 삭제하시겠습니까?" onConfirm={() => handleDelete(record.id)}>
                    <Button danger size="small">삭제</Button>
                </Popconfirm>
            </div>
        ),
    },
  ];

  return (
    <Container>
      <Header>
        <h1>🐋 WHALEBET ADMIN</h1>
        <div style={{display:'flex', gap: 10}}>
            <Button type="primary" onClick={() => setIsModalOpen(true)} style={{background:'#d4af37', borderColor:'#d4af37'}}>
            + 유저 생성
            </Button>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>로그아웃</Button>
        </div>
      </Header>

      <Table 
        dataSource={users} 
        columns={columns} 
        rowKey="id" 
        pagination={{ pageSize: 10 }}
        rowClassName="dark-row"
        style={{background:'#1f2937', borderRadius: 8}}
      />

      <Modal title="새 유저 생성" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
        <Form onFinish={handleCreateUser} layout="vertical">
          <Form.Item name="username" rules={[{ required: true }]} label="아이디">
            <Input />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]} label="비밀번호">
            <Input.Password />
          </Form.Item>
          <Form.Item name="entryLevel" rules={[{ required: true }]} label="진입 단계 (1~10)" initialValue={1}>
            <Select>
              {[1,2,3,4,5,6,7,8,9,10].map(n => <Select.Option key={n} value={n}>{n}단계</Select.Option>)}
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>생성</Button>
        </Form>
      </Modal>
    </Container>
  );
};

export default Admin;