// 認証モジュール

const Auth = {
    currentUser: null,

    // 認証状態の監視
    init() {
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateUI(user);

            if (user) {
                // ログイン時にお気に入りを読み込み
                Firestore.loadFavorites().then(() => {
                    // ページに応じてrenderを呼び出し
                    if (typeof App !== 'undefined') {
                        App.render();
                    }
                    if (typeof MyPage !== 'undefined') {
                        MyPage.render();
                    }
                });
            } else {
                // ログアウト時にお気に入りをクリア
                Firestore.favorites = {};
                if (typeof App !== 'undefined') {
                    App.render();
                }
                if (typeof MyPage !== 'undefined') {
                    MyPage.render();
                }
            }
        });
    },

    // UIの更新
    updateUI(user) {
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');
        const filterFavoritesLabel = document.getElementById('favorites-filter-label');

        if (user) {
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            userInfo.classList.remove('hidden');
            userName.textContent = user.displayName || 'ユーザー';
            userAvatar.src = user.photoURL || '';
            if (filterFavoritesLabel) {
                filterFavoritesLabel.classList.remove('hidden');
            }
        } else {
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            userInfo.classList.add('hidden');
            if (filterFavoritesLabel) {
                filterFavoritesLabel.classList.add('hidden');
                document.getElementById('filter-favorites').checked = false;
            }
        }
    },

    // Googleログイン
    async login() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
        } catch (error) {
            console.error('ログインエラー:', error);
            alert('ログインに失敗しました。もう一度お試しください。');
        }
    },

    // ログアウト
    async logout() {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('ログアウトエラー:', error);
        }
    },

    // ログイン状態確認
    isLoggedIn() {
        return this.currentUser !== null;
    }
};
