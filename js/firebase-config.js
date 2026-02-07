// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyDf5fExoBHwCKrlw8F2JzXefE554aCbSF4",
  authDomain: "marathon-races-ed25c.firebaseapp.com",
  projectId: "marathon-races-ed25c",
  storageBucket: "marathon-races-ed25c.firebasestorage.app",
  messagingSenderId: "197470744822",
  appId: "1:197470744822:web:9e1ac0e50c6ff1276bbcd7"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// サービスのエクスポート
const auth = firebase.auth();
const db = firebase.firestore();
