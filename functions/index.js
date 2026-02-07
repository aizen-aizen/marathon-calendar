/**
 * マラソン大会カレンダー - 通知スケジューラー
 * 
 * 毎日09:00 JSTに実行され、申込開始7日前・1日前の大会について通知を送信
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * 日付文字列をDateオブジェクトに変換
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
}

/**
 * 通知スケジューラー
 * 毎日09:00 JSTに実行
 */
exports.sendNotifications = functions
    .region('asia-northeast1')
    .pubsub.schedule('0 9 * * *')
    .timeZone('Asia/Tokyo')
    .onRun(async (context) => {
        console.log('通知スケジューラー開始');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 7日後と1日後の日付を計算
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

        const oneDayLater = new Date(today);
        oneDayLater.setDate(oneDayLater.getDate() + 1);

        try {
            // 全ユーザーを取得
            const usersSnapshot = await db.collection('users').get();

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                const fcmToken = userData.fcmToken;

                if (!fcmToken) {
                    console.log(`ユーザー ${userDoc.id}: FCMトークンなし`);
                    continue;
                }

                // ユーザーのお気に入りを取得
                const favoritesSnapshot = await db
                    .collection('users')
                    .doc(userDoc.id)
                    .collection('favorites')
                    .get();

                for (const favDoc of favoritesSnapshot.docs) {
                    const favorite = favDoc.data();
                    const entryStart = parseDate(favorite.entryStart);

                    if (!entryStart) continue;

                    const notificationSent = favorite.notificationSent || {};
                    let shouldNotify = false;
                    let daysUntil = 0;
                    let notificationType = '';

                    // 7日前チェック
                    if (!notificationSent.sevenDays &&
                        entryStart.getTime() === sevenDaysLater.getTime()) {
                        shouldNotify = true;
                        daysUntil = 7;
                        notificationType = 'sevenDays';
                    }

                    // 1日前チェック
                    if (!notificationSent.oneDay &&
                        entryStart.getTime() === oneDayLater.getTime()) {
                        shouldNotify = true;
                        daysUntil = 1;
                        notificationType = 'oneDay';
                    }

                    if (shouldNotify) {
                        console.log(`通知送信: ${favorite.marathonName} (${daysUntil}日前)`);

                        // 通知を送信
                        const message = {
                            token: fcmToken,
                            notification: {
                                title: `📅 申込開始まで${daysUntil}日！`,
                                body: `${favorite.marathonName}の申込開始日が近づいています`
                            },
                            data: {
                                marathonId: favDoc.id,
                                marathonName: favorite.marathonName,
                                url: favorite.url || '/mypage.html'
                            },
                            webpush: {
                                fcmOptions: {
                                    link: favorite.url || '/mypage.html'
                                }
                            }
                        };

                        try {
                            await messaging.send(message);
                            console.log(`通知送信成功: ${favorite.marathonName}`);

                            // 通知送信済みフラグを更新
                            await favDoc.ref.update({
                                [`notificationSent.${notificationType}`]: true
                            });
                        } catch (sendError) {
                            console.error(`通知送信エラー: ${favorite.marathonName}`, sendError);

                            // 無効なトークンの場合は削除
                            if (sendError.code === 'messaging/registration-token-not-registered') {
                                await db.collection('users').doc(userDoc.id).update({
                                    fcmToken: admin.firestore.FieldValue.delete()
                                });
                            }
                        }
                    }
                }
            }

            console.log('通知スケジューラー完了');
            return null;
        } catch (error) {
            console.error('通知スケジューラーエラー:', error);
            throw error;
        }
    });

/**
 * 手動通知テスト用（開発用）
 */
exports.testNotification = functions
    .region('asia-northeast1')
    .https.onRequest(async (req, res) => {
        const { userId, marathonName } = req.query;

        if (!userId) {
            res.status(400).send('userId is required');
            return;
        }

        try {
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();

            if (!userData?.fcmToken) {
                res.status(404).send('FCM token not found');
                return;
            }

            const message = {
                token: userData.fcmToken,
                notification: {
                    title: '🏃 通知テスト',
                    body: marathonName || 'テスト通知が正常に送信されました'
                }
            };

            await messaging.send(message);
            res.send('Notification sent successfully');
        } catch (error) {
            console.error('テスト通知エラー:', error);
            res.status(500).send(error.message);
        }
    });
