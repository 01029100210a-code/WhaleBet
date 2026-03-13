import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Card, Tag, Typography, message, Popconfirm } from 'antd';
import { 
  SoundOutlined, EditOutlined, DeleteOutlined, PlusOutlined, FileImageOutlined 
} from '@ant-design/icons';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from '../firebase';
import styled from 'styled-components';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

// --- 스타일 ---
const Container = styled.div`
  padding: 20px;
  color: white;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #374151;
  padding-bottom: 15px;
`;

const NoticeCard = styled(Card)`
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 12px;
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.2s;
  
  .ant-card-body { padding: 20px; }
  &:hover { border-color: #d4af37; transform: translateY(-2px); }
  
  h3 { color: white; margin: 0; font-size: 16px; font-weight: bold; }
  .date { color: #9ca3af; font-size: 12px; margin-top: 5px; }
`;

const ContentBox = styled.div`
  background: #111827;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #374151;
  color: #e5e7eb;
  min-height: 200px;
  line-height: 1.6;
  
  img { max-width: 100%; border-radius: 8px; margin: 10px 0; }
`;

const Notice = ({ user }) => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [viewNotice, setViewNotice] = useState(null); // 상세보기 모달용 데이터
  const [form] = Form.useForm();

  const isSuperAdmin = user?.role === 'super_admin';

  // 공지사항 불러오기
  useEffect(() => {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotices(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 글 작성
  const handleWrite = async (values) => {
    try {
      await addDoc(collection(db, "notices"), {
        title: values.title,
        content: values.content, // HTML 태그 포함
        author: user.username || 'Admin',
        createdAt: Timestamp.now()
      });
      message.success("공지사항이 등록되었습니다.");
      setIsWriteModalOpen(false);
      form.resetFields();
    } catch (e) {
      message.error("작성 실패");
    }
  };

  // 글 삭제
  const handleDelete = async (e, id) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지
    try {
      await deleteDoc(doc(db, "notices", id));
      message.success("삭제되었습니다.");
    } catch (e) {
      message.error("삭제 실패");
    }
  };

  return (
    <Container>
      <Header>
        <div style={{display:'flex', alignItems:'center', gap: 10}}>
            <SoundOutlined style={{fontSize: 24, color: '#d4af37'}} />
            <h1 style={{fontSize: 24, fontWeight: 900, margin:0, color:'white'}}>NOTICE CENTER</h1>
        </div>
        {isSuperAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsWriteModalOpen(true)} style={{background:'#d4af37', border:'none', fontWeight:'bold'}}>
                공지 작성
            </Button>
        )}
      </Header>

      {/* 공지 목록 리스트 */}
      <div style={{display:'flex', flexDirection:'column', gap: 10}}>
        {notices.map((item) => (
            <NoticeCard key={item.id} onClick={() => setViewNotice(item)}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                        <Tag color="red" style={{marginRight: 10}}>공지</Tag>
                        <span style={{color:'white', fontWeight:'bold', fontSize: 16}}>{item.title}</span>
                        <div className="date">{dayjs(item.createdAt?.toDate()).format('YYYY-MM-DD HH:mm')}</div>
                    </div>
                    {isSuperAdmin && (
                        <Popconfirm title="삭제하시겠습니까?" onConfirm={(e) => handleDelete(e, item.id)} okText="Yes" cancelText="No">
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                        </Popconfirm>
                    )}
                </div>
            </NoticeCard>
        ))}
        {notices.length === 0 && <div style={{textAlign:'center', padding: 50, color: '#6b7280'}}>등록된 공지사항이 없습니다.</div>}
      </div>

      {/* 작성 모달 (최고관리자용) */}
      <Modal title="공지사항 작성" open={isWriteModalOpen} onCancel={() => setIsWriteModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleWrite}>
            <Form.Item name="title" label="제목" rules={[{required: true}]}>
                <Input placeholder="제목을 입력하세요" />
            </Form.Item>
            <Form.Item name="content" label="내용 (HTML 사용 가능)" rules={[{required: true}]} help={<span>이미지 첨부 시: &lt;img src="이미지주소" width="100%" /&gt; 형태로 입력하세요.</span>}>
                <TextArea rows={10} placeholder="내용을 입력하세요..." />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>등록하기</Button>
        </Form>
      </Modal>

      {/* 상세보기 모달 */}
      <Modal 
        title={null} 
        open={!!viewNotice} 
        onCancel={() => setViewNotice(null)} 
        footer={[<Button key="close" onClick={() => setViewNotice(null)}>닫기</Button>]}
        width={700}
        bodyStyle={{background:'#1f2937', color:'white', padding: 20}}
      >
        {viewNotice && (
            <div>
                <h2 style={{color:'white', marginBottom: 5}}>{viewNotice.title}</h2>
                <div style={{color:'#9ca3af', marginBottom: 20, borderBottom:'1px solid #374151', paddingBottom: 15}}>
                    {dayjs(viewNotice.createdAt?.toDate()).format('YYYY-MM-DD HH:mm')} | 작성자: {viewNotice.author}
                </div>
                {/* HTML 렌더링 */}
                <ContentBox dangerouslySetInnerHTML={{ __html: viewNotice.content }} />
            </div>
        )}
      </Modal>
    </Container>
  );
};

export default Notice;