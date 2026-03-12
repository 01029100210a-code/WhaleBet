import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ConfigProvider, theme } from 'antd';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm, // 다크 모드 알고리즘 적용
        token: {
          colorPrimary: '#00e5ff', // 포인트 컬러: 형광 하늘색 (Cyan)
          colorBgBase: '#0b1219',  // 기본 배경색
          colorBgContainer: '#151e29', // 카드 배경색
          borderRadius: 4,
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)