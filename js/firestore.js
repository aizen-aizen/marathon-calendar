// Firestoreモジュール

const Firestore = {
    favorites: {},

    // お気に入りの読み込み
    async loadFavorites() {
        if (!Auth.isLoggedIn()) return;

        try {
            const snapshot = await db
                .collection('users')
                .doc(Auth.currentUser.uid)
                .collection('favorites')
                .get();

            this.favorites = {};
            snapshot.forEach((doc) => {
                this.favorites[doc.id] = doc.data();
            });
        } catch (error) {
            console.error('お気に入りの読み込みエラー:', error);
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
    }
};
