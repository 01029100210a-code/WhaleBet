import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Form, Input, Select, message, Tabs, Tag, Switch, Tooltip, Popconfirm 
} from 'antd';
import { 
  collection, getDocs, setDoc, doc, deleteDoc, updateDoc, query, where 
} from "firebase/firestore";
import { db } from '../firebase';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { 
  LogoutOutlined, PoweroffOutlined, ArrowLeftOutlined, KeyOutlined, UserOutlined 
} from '@ant-design/icons';
import bcrypt from 'bcryptjs';

const Container = styled.div` padding: 30px; background: #111827; min-height: 100vh; color: white; `;
const Header = styled.div` display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; h1 { color: #d4af37; margin:0; } `;
const DarkTable = styled(Table)` 
  .ant-table { background: #1f2937; border-radius: 8px; } 
  .ant-table-thead > tr > th { background: #374151 !important; color: #d4af37 !important; border-bottom: 2px solid #4b5563 !important; }
  .ant-table-tbody > tr > td { border-bottom: 1px solid #374151 !important; color: #e5e7eb !important; }
  .ant-table-tbody > tr:hover > td { background: #111827 !important; }
`;

const Admin = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 모달 상태
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false); // 유저 수동 생성용
  const [form] = Form.useForm();
  const [userForm] = Form.useForm();

  const myRole = localStorage.getItem('role');

  // 1. 유저 목록 불러오기
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 실제로는 본인 하위 유저만 불러와야 하지만, 일단 전체 로드 (후에 쿼리 수정 가능)
      const q = await getDocs(collection(db, "users"));
      const list = q.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setUsers(list);
    } catch (e) { message.error(e.message); }
    setLoading(false);
  };

  // 2. 생성된 코드 목록 불러오기 (가입 코드)
  const fetchCodes = async () => {
    if (myRole !== 'super_admin') return; // 최고관리자만 코드 관리
    try {
      const q = await getDocs(collection(db, "codes"));
      setCodes(q.docs.map(doc => ({ code: doc.id, ...doc.data() })));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchUsers();
    fetchCodes();
  }, []);

  // --- 유저 관리 기능 ---
  const handleToggleBlock = async (record) => {
    if (record.role === 'super_admin') return message.error("최고관리자는 차단할 수 없습니다.");
    const newStatus = !record.isBlocked;
    await updateDoc(doc(db, "users", record.id), { isBlocked: newStatus, currentSessionId: newStatus ? null : record.currentSessionId });
    message.success("상태 변경 완료"); fetchUsers();
  };

  const handleForceLogout = async (id) => {
    await updateDoc(doc(db, "users", id), { currentSessionId: null });
    message.success("강제 로그아웃 완료"); fetchUsers();
  };

  const handleDeleteUser = async (id) => {
    await deleteDoc(doc(db, "users", id));
    message.success("삭제 완료"); fetchUsers();
  };

  // --- 코드 생성 기능 (최고관리자 전용) ---
  const handleCreateCode = async (values) => {
    try {
      // 코드 중복 체크
      const codeRef = doc(db, "codes", values.code);
      const docSnap = await getDoc(codeRef); // import 필요
      if (docSnap.exists()) return message.error("이미 존재하는 코드입니다.");

      await setDoc(codeRef, {
        code: values.code,
        assignedRole: values.assignedRole, // 이 코드로 가입하면 될 역할 (distributor, store 등)
        memo: values.memo,
        createdBy: localStorage.getItem('username'),
        createdAt: new Date().toISOString()
      });
      message.success("가입 코드 생성 완료");
      setIsCodeModalOpen(false);
      form.resetFields();
      fetchCodes();
    } catch (e) { 
        // getDoc이 없어서 에러날 수 있으니 상단 import 확인
        message.error("생성 실패: " + e.message); 
    }
  };

  // --- 유저 수동 생성 (비상용) ---
  const handleCreateUserManual = async (v) => {
    try {
      const hash = await bcrypt.hash(v.password, 10);
      await setDoc(doc(db, "users", v.username), {
        username: v.username, password: hash, role: v.role,
        isBlocked: false, currentSessionId: null, createdAt: new Date().toISOString()
      });
      message.success("유저 생성 완료"); setIsUserModalOpen(false); userForm.resetFields(); fetchUsers();
    } catch (e) { message.error(e.message); }
  };

  // --- 테이블 컬럼 정의 ---
  const userColumns = [
    { title: '아이디', dataIndex: 'username', key: 'username', render: t => <b style={{color:'white'}}>{t}</b> },
    { title: '권한', dataIndex: 'role', render: r => {
        if(r==='super_admin') return <Tag color="gold">최고관리자</Tag>;
        if(r==='distributor') return <Tag color="magenta">총판</Tag>;
        if(r==='store') return <Tag color="cyan">매장</Tag>;
        return <Tag color="blue">유저</Tag>;
    }},
    { title: '접속', align:'center', render: (_,r) => <Tag color={r.currentSessionId?'green':'default'}>{r.currentSessionId?'ON':'OFF'}</Tag>},
    { title: '차단', align:'center', render: (_,r) => <Switch checked={!r.isBlocked} onChange={()=>handleToggleBlock(r)} disabled={r.role==='super_admin'} />},
    { title: '관리', align:'center', render: (_,r) => (
      <div style={{display:'flex',gap:5,justifyContent:'center'}}>
        <Tooltip title="강제퇴장"><Button size="small" icon={<PoweroffOutlined />} onClick={()=>handleForceLogout(r.id)} disabled={!r.currentSessionId} style={{color:'#eab308',borderColor:'#eab308'}} ghost /></Tooltip>
        <Popconfirm title="삭제?" onConfirm={()=>handleDeleteUser(r.id)}><Button danger size="small">삭제</Button></Popconfirm>
      </div>
    )}
  ];

  const codeColumns = [
    { title: '가입 코드', dataIndex: 'code', key: 'code', render: t => <b style={{color:'#d4af37'}}>{t}</b> },
    { title: '부여될 권한', dataIndex: 'assignedRole', render: r => <Tag color="blue">{r}</Tag> },
    { title: '메모', dataIndex: 'memo' },
    { title: '삭제', render: (_,r) => <Button danger size="small" onClick={async()=>{ await deleteDoc(doc(db,"codes",r.code)); fetchCodes(); }}>삭제</Button> }
  ];

  return (
    <Container>
      <Header>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <Button icon={<ArrowLeftOutlined />} onClick={()=>navigate('/main')} style={{background:'transparent', color:'white', border:'none'}} />
          <h1>관리자 페이지</h1>
        </div>
        <Button onClick={()=>{localStorage.clear(); navigate('/');}}>나가기</Button>
      </Header>

      <Tabs defaultActiveKey="1" type="card"
        items={[
          {
            label: `유저 관리`,
            key: '1',
            children: (
              <>
                <div style={{textAlign:'right', marginBottom:10}}>
                   <Button icon={<UserAddOutlined />} onClick={()=>setIsUserModalOpen(true)}>유저 수동 생성</Button>
                </div>
                <DarkTable dataSource={users} columns={userColumns} rowKey="id" loading={loading} />
              </>
            )
          },
          // 최고관리자만 코드 관리 탭 보임
          myRole === 'super_admin' ? {
            label: `가입 코드 관리`,
            key: '2',
            children: (
              <>
                <div style={{textAlign:'right', marginBottom:10}}>
                  <Button type="primary" icon={<KeyOutlined />} onClick={()=>setIsCodeModalOpen(true)} style={{background:'#d4af37'}}>코드 생성</Button>
                </div>
                <DarkTable dataSource={codes} columns={codeColumns} rowKey="code" />
              </>
            )
          } : null
        ].filter(Boolean)} 
      />

      {/* 코드 생성 모달 */}
      <Modal title="가입 코드 생성" open={isCodeModalOpen} onCancel={()=>setIsCodeModalOpen(false)} footer={null}>
        <Form form={form} onFinish={handleCreateCode} layout="vertical">
          <Form.Item name="code" label="사용할 코드 (예: VIP777)" rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="assignedRole" label="이 코드로 가입 시 부여할 권한" rules={[{required:true}]}>
            <Select>
              <Select.Option value="distributor">총판 (Distributor)</Select.Option>
              <Select.Option value="store">매장 (Store)</Select.Option>
              <Select.Option value="user">유저 (User)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="memo" label="메모 (누구 줄 코드인지)"><Input /></Form.Item>
          <Button type="primary" htmlType="submit" block>생성하기</Button>
        </Form>
      </Modal>

      {/* 유저 수동 생성 모달 */}
      <Modal title="유저 수동 생성" open={isUserModalOpen} onCancel={()=>setIsUserModalOpen(false)} footer={null}>
        <Form form={userForm} onFinish={handleCreateUserManual} layout="vertical">
          <Form.Item name="username" label="아이디" rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="password" label="비밀번호" rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="role" label="권한">
            <Select>
                <Select.Option value="super_admin">최고관리자</Select.Option>
                <Select.Option value="distributor">총판</Select.Option>
                <Select.Option value="store">매장</Select.Option>
                <Select.Option value="user">유저</Select.Option>
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>생성</Button>
        </Form>
      </Modal>

    </Container>
  );
};

// 아이콘 및 firestore 함수 import 추가 필요할 수 있음
import { UserAddOutlined } from '@ant-design/icons';
import { getDoc } from "firebase/firestore"; // getDoc import 추가

export default Admin;