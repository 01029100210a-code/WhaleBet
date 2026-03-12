// frontend/src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- 여기가 중요! 아까 메모장에 복사한 코드로 덮어쓰세요 ---
const firebaseConfig = {
  apiKey: "AIzaSyA0OKgmueP12fejtzfNkNx2lr9WaIVrR-Q",
  authDomain: "whalebet-f7d18.firebaseapp.com",
  projectId: "whalebet-f7d18",
  storageBucket: "whalebet-f7d18.firebasestorage.app",
  messagingSenderId: "380232653257",
  appId: "1:380232653257:web:088ecd61bbf308e0837018"
};
// -----------------------------------------------------

// 파이어베이스 초기화 (앱 시작)
const app = initializeApp(firebaseConfig);

// DB 사용 준비 끝! (이걸 다른 파일에서 갖다 씀)
export const db = getFirestore(app);