// マイページアプリケーション

const MyPage = {
    marathons: [],
    favorites: [],

    // ステータス選択肢
    statusOptions: {
        application: [
            { value: 'none', label: '未申込', icon: '⬜' },
            { value: 'applied', label: '申込済', icon: '✅' },
            { value: 'waiting', label: '当選待ち', icon: '⏳' },
            { value: 'rejected', label: '落選', icon: '❌' }
        ],
        accommodation: [
            { value: 'none', label: '未手配', icon: '⬜' },
            { value: 'booked', label: '予約済', icon: '🏨' },
            { value: 'not_needed', label: '不要', icon: '➖' }
        ],
        transportation: [
            { value: 'none', label: '未手配', icon: '⬜' },
            { value: 'plane', label: '飛行機', icon: '✈️' },
            { value: 'shinkansen', label: '新幹線', icon: '🚄' },
            { value: 'train', label: '電車', icon: '🚃' },
            { value: 'car', label: '車', icon: '🚗' },
            { value: 'bus', label: 'バス', icon: '🚌' },
            { value: 'not_needed', label: '不要', icon: '➖' }
        ]
    },

    // 初期化
    async init() {
        await this.loadMarathons();
        this.setupEventListeners();
        Auth.init();

        // 通知モジュールの初期化
        if (typeof Notifications !== 'undefined') {
            await Notifications.init();
            Notifications.setupForegroundListener();
        }
    },

    // 大会データの読み込み
    async loadMarathons() {
        try {
            const response = await fetch('data/marathons.json');
            const data = await response.json();
            this.marathons = data.marathons;
        } catch (error) {
            console.error('大会データの読み込みエラー:', error);
        }
    },

    // イベントリスナーの設定
    setupEventListeners() {
        document.getElementById('login-btn').addEventListener('click', () => Auth.login());
        document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());
        document.getElementById('login-btn-main').addEventListener('click', () => Auth.login());

        // 通知許可ボタン
        const enableBtn = document.getElementById('enable-notifications');
        const dismissBtn = document.getElementById('dismiss-notifications');

        if (enableBtn) {
            enableBtn.addEventListener('click', async () => {
                const granted = await Notifications.requestPermission();
                if (granted) {
                    document.getElementById('notification-prompt').classList.add('hidden');
                    localStorage.setItem('notificationsEnabled', 'true');
                }
            });
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                document.getElementById('notification-prompt').classList.add('hidden');
                localStorage.setItem('notificationsDismissed', 'true');
            });
        }
    },

    // 通知プロンプトを表示するかどうか判定
    shouldShowNotificationPrompt() {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return false;
        if (Notification.permission === 'denied') return false;
        if (localStorage.getItem('notificationsEnabled') === 'true') return false;
        if (localStorage.getItem('notificationsDismissed') === 'true') return false;
        return true;
    },

    // マラソンIDの生成
    generateMarathonId(marathon) {
        const str = marathon.name + '-' + marathon.date;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'marathon-' + Math.abs(hash).toString(36);
    },

    // 申込開始までの日数を計算
    getDaysUntilEntry(marathon) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const match = marathon.entryStart?.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return null;

        const entryDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        const diffTime = entryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    },

    // お気に入り一覧を表示
    async render() {
        const loginPrompt = document.getElementById('login-prompt');
        const favoritesList = document.getElementById('favorites-list');
        const emptyState = document.getElementById('empty-state');
        const loading = document.getElementById('loading');

        // 未ログイン時
        if (!Auth.currentUser) {
            loginPrompt.classList.remove('hidden');
            favoritesList.classList.add('hidden');
            emptyState.classList.add('hidden');
            loading.classList.add('hidden');
            return;
        }

        loginPrompt.classList.add('hidden');
        loading.classList.remove('hidden');

        // 通知プロンプトの表示判定
        const notificationPrompt = document.getElementById('notification-prompt');
        if (notificationPrompt && this.shouldShowNotificationPrompt()) {
            notificationPrompt.classList.remove('hidden');
        }

        // お気に入りを取得
        this.favorites = await Firestore.loadFavorites();
        loading.classList.add('hidden');

        if (this.favorites.length === 0) {
            favoritesList.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        favoritesList.classList.remove('hidden');

        // お気に入り大会のカードを生成
        favoritesList.innerHTML = this.favorites.map(fav => this.createFavoriteCard(fav)).join('');

        // イベントリスナーを設定
        this.setupStatusListeners();
        this.setupRemoveListeners();
    },

    // お気に入りカードを生成
    createFavoriteCard(favorite) {
        const marathon = this.marathons.find(m => this.generateMarathonId(m) === favorite.id);
        const daysUntil = marathon ? this.getDaysUntilEntry(marathon) : null;

        const status = favorite.status || {
            application: 'none',
            accommodation: 'none',
            transportation: 'none'
        };

        let daysLabel = '';
        if (daysUntil !== null) {
            if (daysUntil > 0) {
                daysLabel = `申込開始まで <strong>${daysUntil}日</strong>`;
            } else if (daysUntil === 0) {
                daysLabel = '<strong class="highlight">本日申込開始！</strong>';
            } else {
                daysLabel = '申込開始済み';
            }
        }

        return `
        <article class="favorite-card" data-id="${favorite.id}">
            <div class="favorite-header">
                <h2 class="favorite-title">${favorite.marathonName || marathon?.name || '不明な大会'}</h2>
                <button class="btn-remove" data-id="${favorite.id}" title="お気に入りから削除">×</button>
            </div>
            ${marathon ? `
            <div class="favorite-info">
                <span class="info-item">📅 ${marathon.date}</span>
                <span class="info-item days-until">${daysLabel}</span>
            </div>
            ` : ''}
            <div class="status-section">
                <div class="status-group">
                    <label class="status-label">📝 申込</label>
                    <div class="status-buttons" data-field="application">
                        ${this.createStatusButtons('application', status.application, favorite.id)}
                    </div>
                </div>
                <div class="status-group">
                    <label class="status-label">🏨 宿泊</label>
                    <div class="status-buttons" data-field="accommodation">
                        ${this.createStatusButtons('accommodation', status.accommodation, favorite.id)}
                    </div>
                </div>
                <div class="status-group">
                    <label class="status-label">🚃 移動</label>
                    <div class="status-buttons" data-field="transportation">
                        ${this.createStatusButtons('transportation', status.transportation, favorite.id)}
                    </div>
                </div>
            </div>
            ${marathon?.url ? `
            <div class="favorite-footer">
                <a href="${marathon.url}" target="_blank" class="card-link">公式サイト →</a>
            </div>
            ` : ''}
        </article>
        `;
    },

    // ステータスボタンを生成
    createStatusButtons(field, currentValue, marathonId) {
        return this.statusOptions[field].map(option => `
            <button class="status-btn ${currentValue === option.value ? 'active' : ''}"
                    data-marathon="${marathonId}"
                    data-field="${field}"
                    data-value="${option.value}"
                    title="${option.label}">
                ${option.icon}
            </button>
        `).join('');
    },

    // ステータスボタンのイベントリスナー
    setupStatusListeners() {
        document.querySelectorAll('.status-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const marathonId = e.target.dataset.marathon;
                const field = e.target.dataset.field;
                const value = e.target.dataset.value;

                // UIを即座に更新
                const container = e.target.closest('.status-buttons');
                container.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Firestoreに保存
                await Firestore.updateStatus(marathonId, field, value);
            });
        });
    },

    // 削除ボタンのイベントリスナー
    setupRemoveListeners() {
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const marathonId = e.target.dataset.id;
                if (confirm('この大会をお気に入りから削除しますか？')) {
                    await Firestore.removeFavorite(marathonId);
                    this.render();
                }
            });
        });
    }
};

// アプリ起動
document.addEventListener('DOMContentLoaded', () => MyPage.init());
