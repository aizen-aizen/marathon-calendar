// Firestoreモジュール

const Firestore = {
    favorites: {},

    // お気に入りの読み込み（オブジェクト形式）
    async loadFavorites() {
        if (!Auth.isLoggedIn()) return [];

        try {
            const snapshot = await db
                .collection('users')
                .doc(Auth.currentUser.uid)
                .collection('favorites')
                .get();

            this.favorites = {};
            const favoritesArray = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                this.favorites[doc.id] = data;
                favoritesArray.push({ id: doc.id, ...data });
            });
            return favoritesArray;
        } catch (error) {
            console.error('お気に入りの読み込みエラー:', error);
            return [];
        }
    },

    // お気に入りの追加
    async addFavorite(marathonId, marathonData) {
        if (!Auth.isLoggedIn()) {
            alert('お気に入り登録にはログインが必要です');
            return false;
        }

        try {
            const favoriteData = {
                marathonName: marathonData.name,
                entryStart: marathonData.entryStart,
                date: marathonData.date,
                type: marathonData.type,
                url: marathonData.url,
                status: {
                    application: 'none',
                    accommodation: 'none',
                    transportation: 'none'
                },
                notificationSent: {
                    sevenDays: false,
                    oneDay: false
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db
                .collection('users')
                .doc(Auth.currentUser.uid)
                .collection('favorites')
                .doc(marathonId)
                .set(favoriteData);

            this.favorites[marathonId] = favoriteData;
            return true;
        } catch (error) {
            console.error('お気に入り追加エラー:', error);
            alert('お気に入りの追加に失敗しました');
            return false;
        }
    },

    // お気に入りの削除
    async removeFavorite(marathonId) {
        if (!Auth.isLoggedIn()) return false;

        try {
            await db
                .collection('users')
                .doc(Auth.currentUser.uid)
                .collection('favorites')
                .doc(marathonId)
                .delete();

            delete this.favorites[marathonId];
            return true;
        } catch (error) {
            console.error('お気に入り削除エラー:', error);
            alert('お気に入りの削除に失敗しました');
            return false;
        }
    },

    // お気に入りか確認
    isFavorite(marathonId) {
        return marathonId in this.favorites;
    },

    // お気に入りのトグル
    async toggleFavorite(marathonId, marathonData) {
        if (this.isFavorite(marathonId)) {
            return await this.removeFavorite(marathonId);
        } else {
            return await this.addFavorite(marathonId, marathonData);
        }
    },

    // ステータス更新
    async updateStatus(marathonId, field, value) {
        if (!Auth.isLoggedIn()) return false;

        try {
            const updateData = {
                [`status.${field}`]: value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db
                .collection('users')
                .doc(Auth.currentUser.uid)
                .collection('favorites')
                .doc(marathonId)
                .update(updateData);

            // ローカルキャッシュも更新
            if (this.favorites[marathonId]) {
                if (!this.favorites[marathonId].status) {
                    this.favorites[marathonId].status = {};
                }
                this.favorites[marathonId].status[field] = value;
            }

            return true;
        } catch (error) {
            console.error('ステータス更新エラー:', error);
            return false;
        }
    },

    // FCMトークンを保存
    async saveFCMToken(token) {
        if (!Auth.isLoggedIn()) return false;

        try {
            await db
                .collection('users')
                .doc(Auth.currentUser.uid)
                .set({
                    fcmToken: token,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

            return true;
        } catch (error) {
            console.error('FCMトークン保存エラー:', error);
            return false;
        }
    }
};
