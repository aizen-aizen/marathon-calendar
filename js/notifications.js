// 通知モジュール

const Notifications = {
    messaging: null,

    // 初期化
    async init() {
        if (!('Notification' in window)) {
            console.log('このブラウザは通知に対応していません');
            return false;
        }

        try {
            // Firebase Messagingの初期化
            this.messaging = firebase.messaging();

            // Service Workerの登録
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('Service Worker登録成功:', registration);

            return true;
        } catch (error) {
            console.error('通知の初期化エラー:', error);
            return false;
        }
    },

    // 通知許可をリクエスト
    async requestPermission() {
        if (!this.messaging) {
            await this.init();
        }

        try {
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                console.log('通知許可が得られました');
                await this.getToken();
                return true;
            } else {
                console.log('通知許可が拒否されました');
                return false;
            }
        } catch (error) {
            console.error('通知許可リクエストエラー:', error);
            return false;
        }
    },

    // FCMトークンを取得
    async getToken() {
        if (!this.messaging) return null;

        try {
            // VAPID公開鍵（Firebase ConsoleからWeb Push certificatesで取得）
            const vapidKey = 'BL4d7INzsT6ZU9wIOnncJtjP7LY56CG0EIZTRFtLQZ8sMMmZHm0qjyk2_D4Q3KJDxqp6EaewMSZGI5wW41S6S7Q';

            const token = await this.messaging.getToken({
                vapidKey: vapidKey,
                serviceWorkerRegistration: await navigator.serviceWorker.getRegistration()
            });

            if (token) {
                console.log('FCMトークン取得成功');
                // Firestoreに保存
                await Firestore.saveFCMToken(token);
                return token;
            } else {
                console.log('FCMトークンの取得に失敗');
                return null;
            }
        } catch (error) {
            console.error('FCMトークン取得エラー:', error);
            return null;
        }
    },

    // フォアグラウンドメッセージリスナー
    setupForegroundListener() {
        if (!this.messaging) return;

        this.messaging.onMessage((payload) => {
            console.log('フォアグラウンドメッセージ受信:', payload);

            // カスタム通知を表示
            if (Notification.permission === 'granted') {
                const notification = new Notification(
                    payload.notification.title || 'マラソン大会カレンダー',
                    {
                        body: payload.notification.body,
                        icon: '/icon-192.png'
                    }
                );

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
            }
        });
    },

    // 通知許可状態を確認
    getPermissionStatus() {
        if (!('Notification' in window)) {
            return 'unsupported';
        }
        return Notification.permission; // 'default', 'granted', 'denied'
    }
};
