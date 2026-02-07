// Firebase Messaging Service Worker

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase設定
firebase.initializeApp({
    apiKey: "AIzaSyDf5fExoBHwCKrlw8F2JzXefE554aCbSF4",
    authDomain: "marathon-races-ed25c.firebaseapp.com",
    projectId: "marathon-races-ed25c",
    storageBucket: "marathon-races-ed25c.firebasestorage.app",
    messagingSenderId: "197470744822",
    appId: "1:197470744822:web:9e1ac0e50c6ff1276bbcd7"
});

const messaging = firebase.messaging();

// バックグラウンドメッセージ受信
messaging.onBackgroundMessage((payload) => {
    console.log('バックグラウンドメッセージ受信:', payload);

    const notificationTitle = payload.notification.title || 'マラソン大会カレンダー';
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: payload.data,
        actions: [
            { action: 'open', title: '詳細を見る' }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/mypage.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // 既に開いているタブがあればフォーカス
                for (const client of clientList) {
                    if (client.url.includes('marathon-calendar') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // なければ新しいタブを開く
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
