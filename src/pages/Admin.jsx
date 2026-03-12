import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, message, Tabs, Card, Modal, Select, Statistic, Row, Col, Badge, Space } from 'antd';
import { UsergroupAddOutlined, TeamOutlined, KeyOutlined, SearchOutlined, EditOutlined, PlusCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { collection, getDocs, doc, updateDoc, Timestamp, setDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import bcrypt from 'bcryptjs';
import { Typography } from 'antd';

const { Option } = Select;
const { Title } = Typography;

const Container = styled.div`
  padding: 20px;
`;

const DarkCard = styled(Card)`
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 12px;
  .ant-table { background: transparent; color: #d1d5db; }
  .ant-table-thead > tr > th { background: #111827 !important; color: #9ca3af !important; border-bottom: 1px solid #374151; }
  .ant-table-tbody > tr > td { border-bottom: 1px solid #374151; color: white; }
  .ant-table-tbody > tr:hover > td { background: #374151 !important; }
  .ant-tabs-tab { color: #9ca3af; }
  .ant-tabs-tab-active .ant-tabs-tab-btn { color: #d4af37 !important; }
  .ant-tabs-ink-bar { background: #d4af37; }
  .ant-pagination-item-link, .ant-pagination-item { background: transparent !important; border-color: #374151 !important; a { color: #9ca3af !important; } }
  .ant-pagination-item-active { border-color: #d4af37 !important; a { color: #d4af37 !important; } }
`;

const Admin = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [myCodes, setMyCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [newCodeType, setNewCodeType] = useState('user');
  const [newCodeMemo, setNewCodeMemo] = useState('');
  const [addDays, setAddDays] = useState(30);

  const myRole = currentUser?.role || 'user';

  const fetchData = async () => {
    setLoading(true);
    try {
      let q;
      if (myRole === 'admin') q = query(collection(db, "users"));
      else q = query(collection(db, "users"), where("parent_id", "==", currentUser.username));

      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(list);

      const codeQ = query(collection(db, "invite_codes"), where("owner_id", "==", currentUser.username));
      const codeSnap = await getDocs(codeQ);
      setMyCodes(codeSnap.docs.map(doc => doc.data()));
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { if(currentUser) fetchData(); }, [currentUser]);

  const handleApprove = async (userId) => {
    try { await updateDoc(doc(db, "users", userId), { status: 'active' }); message.success('승인 완료'); fetchData(); } catch (e) { message.error('오류'); }
  };

  const handleAddTime = async () => {
    try {
      const userRef = doc(db, "users", selectedUser.id);
      let expiry = selectedUser.expiryDate ? selectedUser.expiryDate.toDate() : new Date();
      if (expiry < new Date()) expiry = new Date();
      expiry.setDate(expiry.getDate() + addDays);
      await updateDoc(userRef, { expiryDate: Timestamp.fromDate(expiry), status: 'active' });
      message.success('지급 완료'); setIsTimeModalOpen(false); fetchData();
    } catch (e) { message.error('오류'); }
  };

  const handleEditUser = async (values) => {
    try {
        const updates = { role: values.role, name: values.name };
        if (values.newPassword) updates.password = await bcrypt.hash(values.newPassword, 10);
        await updateDoc(doc(db, "users", selectedUser.id), updates);
        message.success('수정 완료'); setIsEditModalOpen(false); fetchData();
    } catch (e) { message.error('오류'); }
  };

  const handleCreateCode = async () => {
    if (!newCodeMemo) return message.warning("메모 입력 필수");
    const prefix = newCodeType === 'master' ? 'MST' : newCodeType === 'store' ? 'STR' : 'USR';
    const code = `${prefix}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    try {
      await setDoc(doc(db, "invite_codes", code), {
        code, type: newCodeType, owner_id: currentUser.username, memo: newCodeMemo, created_at: Timestamp.now()
      });
      message.success(`코드 생성: ${code}`); setIsCodeModalOpen(false); fetchData();
    } catch (e) { message.error('실패'); }
  };

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchText.toLowerCase()) || u.name.includes(searchText));

  const userColumns = [
    { 
        title: '상태', key: 'online', width: 100,
        render: (_, r) => {
            const lastActive = r.last_active_at ? r.last_active_at.seconds : 0;
            const isLive = (Math.floor(Date.now()/1000) - lastActive) < 180; 
            return isLive ? <Badge status="processing" text={<span style={{color:'#52c41a'}}>접속중</span>} /> 
                          : <div style={{color:'grey', fontSize:11}}>{r.last_logout_at ? new Date(r.last_logout_at.seconds*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'OFF'}</div>;
        }
    },
    { title: '아이디', dataIndex: 'username', key: 'id', render: t => <b style={{color:'gold'}}>{t}</b> },
    { title: '이름', dataIndex: 'name', key: 'name' },
    { title: '등급', key: 'role', render: (_,r) => <Tag color={r.role==='admin'?'gold':r.role==='master'?'purple':r.role==='store'?'cyan':'default'}>{r.role}</Tag> },
    { title: '정보', key: 'info', render: (_, r) => <div style={{fontSize:10, color:'#6b7280'}}>IP: {r.ip_address || '-'}</div> },
    { title: '만료일', dataIndex: 'expiryDate', key: 'exp', render: d => d ? new Date(d.seconds*1000).toLocaleDateString() : '-' },
    {
      title: '관리', key: 'action',
      render: (_, r) => (
        <Space>
          {r.status === 'pending' && <Button size="small" type="primary" onClick={()=>handleApprove(r.id)}>승인</Button>}
          <Button size="small" icon={<EditOutlined />} onClick={()=>{setSelectedUser(r); setIsEditModalOpen(true);}}>수정</Button>
          <Button size="small" type="primary" ghost icon={<PlusCircleOutlined />} onClick={()=>{setSelectedUser(r); setIsTimeModalOpen(true);}}>지급</Button>
        </Space>
      )
    }
  ];

  return (
    <Container>
      <div style={{marginBottom: 20, display:'flex', justifyContent:'space-between'}}>
        <Title level={2} style={{color:'white', margin:0}}>🛡️ 통합 관리자 패널</Title>
        <Space>
            <Input placeholder="검색" prefix={<SearchOutlined />} onChange={e=>setSearchText(e.target.value)} style={{width: 200}} />
            <Button type="primary" size="large" icon={<KeyOutlined />} onClick={()=>setIsCodeModalOpen(true)}>코드생성</Button>
        </Space>
      </div>

      <Tabs defaultActiveKey="1" items={[
        { key: '1', label: '👥 회원 관리', children: <DarkCard><Table dataSource={filteredUsers} columns={userColumns} rowKey="id" pagination={{pageSize:5}} loading={loading} /></DarkCard> },
        { key: '2', label: '🔑 코드 관리', children: <DarkCard title="발급된 코드">{myCodes.map(c=><Tag key={c.code} color="blue" style={{margin:5, padding:5, fontSize:14}}>{c.code} ({c.memo})</Tag>)}</DarkCard> }
      ]} />

      <Modal title={`회원 수정: ${selectedUser?.username}`} open={isEditModalOpen} onCancel={()=>setIsEditModalOpen(false)} footer={null}>
        {selectedUser && (
            <Form layout="vertical" onFinish={handleEditUser} initialValues={{ name: selectedUser.name, role: selectedUser.role }}>
                <Form.Item label="이름" name="name"><Input /></Form.Item>
                <Form.Item label="등급" name="role"><Select><Option value="user">일반</Option><Option value="store">매장</Option><Option value="master">총판</Option></Select></Form.Item>
                <Form.Item label="비밀번호 변경" name="newPassword"><Input.Password placeholder="입력 시 변경됨" /></Form.Item>
                <Button type="primary" htmlType="submit" block>저장</Button>
            </Form>
        )}
      </Modal>

      <Modal title="시간 지급" open={isTimeModalOpen} onOk={handleAddTime} onCancel={()=>setIsTimeModalOpen(false)}>
        <Select defaultValue={30} style={{width:'100%'}} onChange={setAddDays}>
            <Option value={1}>1일</Option><Option value={7}>7일</Option><Option value={30}>30일</Option><Option value={-1}>회수</Option>
        </Select>
      </Modal>

      <Modal title="코드 생성" open={isCodeModalOpen} onOk={handleCreateCode} onCancel={()=>setIsCodeModalOpen(false)}>
        <Select value={newCodeType} onChange={setNewCodeType} style={{width:'100%', marginBottom:15}}><Option value="user">유저용</Option>{(myRole==='admin'||myRole==='master') && <Option value="store">매장용</Option>}{myRole==='admin' && <Option value="master">총판용</Option>}</Select>
        <Input value={newCodeMemo} onChange={e=>setNewCodeMemo(e.target.value)} placeholder="메모" />
      </Modal>
    </Container>
  );
};

export default Admin;