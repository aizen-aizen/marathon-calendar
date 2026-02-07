// メインアプリケーション

const App = {
    marathons: [],
    filters: {
        type: 'all',
        openOnly: false,
        favoritesOnly: false
    },
    viewMode: 'card', // 'card' or 'table'

    // 初期化
    async init() {
        await this.loadMarathons();
        this.setupEventListeners();
        Auth.init();
        this.render();
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
        // ログイン/ログアウトボタン
        document.getElementById('login-btn').addEventListener('click', () => Auth.login());
        document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());

        // フィルターボタン
        document.querySelectorAll('.filter-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filters.type = e.target.dataset.filter;
                this.render();
            });
        });

        // 表示切り替えボタン
        document.querySelectorAll('.view-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach((b) => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.viewMode = e.currentTarget.dataset.view;
                this.render();
            });
        });

        // チェックボックスフィルター
        document.getElementById('filter-open').addEventListener('change', (e) => {
            this.filters.openOnly = e.target.checked;
            this.render();
        });

        document.getElementById('filter-favorites').addEventListener('change', (e) => {
            this.filters.favoritesOnly = e.target.checked;
            this.render();
        });
    },

    // マラソンIDの生成（大会名と日付から一意のIDを作成）
    generateMarathonId(marathon) {
        // 大会名と日付を組み合わせてシンプルなハッシュを生成
        const str = marathon.name + '-' + marathon.date;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit整数に変換
        }
        return 'marathon-' + Math.abs(hash).toString(36);
    },

    // 申込状態の判定
    getEntryStatus(marathon) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 日付パース（「未定」「予定」などを考慮）
        const parseDate = (dateStr) => {
            if (!dateStr || dateStr.includes('未定') || dateStr.includes('予定') || dateStr.includes('頃')) {
                return null;
            }
            // 「2025-08-29」形式
            const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            }
            return null;
        };

        const entryStart = parseDate(marathon.entryStart);
        const entryDeadline = parseDate(marathon.entryDeadline);

        // 締切済みチェック
        if (marathon.entryDeadline && marathon.entryDeadline.includes('締切済')) {
            return { status: 'closed', label: '締切済' };
        }
        if (marathon.entryDeadline && marathon.entryDeadline.includes('定員達成')) {
            return { status: 'closed', label: '定員達成' };
        }

        // 抽選の場合
        if (marathon.method === '抽選') {
            if (entryStart && today < entryStart) {
                const daysUntil = Math.ceil((entryStart - today) / (1000 * 60 * 60 * 24));
                return { status: 'upcoming', label: `${daysUntil}日後` };
            }
            if (entryDeadline && today <= entryDeadline) {
                return { status: 'lottery', label: '抽選中' };
            }
            if (entryDeadline && today > entryDeadline) {
                return { status: 'closed', label: '抽選終了' };
            }
            return { status: 'upcoming', label: '抽選' };
        }

        // 先着の場合
        if (entryStart && today < entryStart) {
            const daysUntil = Math.ceil((entryStart - today) / (1000 * 60 * 60 * 24));
            return { status: 'upcoming', label: `${daysUntil}日後` };
        }
        if (entryStart && today >= entryStart) {
            if (!entryDeadline || today <= entryDeadline) {
                return { status: 'open', label: '受付中' };
            }
        }
        if (entryDeadline && today > entryDeadline) {
            return { status: 'closed', label: '締切済' };
        }

        return { status: 'upcoming', label: '未定' };
    },

    // フィルタリング
    getFilteredMarathons() {
        return this.marathons.filter((marathon) => {
            // 種別フィルター
            if (this.filters.type === 'full' && marathon.type !== 'フルマラソン') return false;
            if (this.filters.type === 'ultra' && marathon.type !== 'ウルトラマラソン') return false;

            // 受付中フィルター
            if (this.filters.openOnly) {
                const status = this.getEntryStatus(marathon);
                if (status.status !== 'open' && status.status !== 'lottery') return false;
            }

            // お気に入りフィルター
            if (this.filters.favoritesOnly) {
                const marathonId = this.generateMarathonId(marathon);
                if (!Firestore.isFavorite(marathonId)) return false;
            }

            return true;
        });
    },

    // レンダリング
    render() {
        const marathonList = document.getElementById('marathon-list');
        const loading = document.getElementById('loading');
        const emptyState = document.getElementById('empty-state');

        const filteredMarathons = this.getFilteredMarathons();

        loading.classList.add('hidden');

        if (filteredMarathons.length === 0) {
            marathonList.innerHTML = '';
            marathonList.className = 'marathon-list';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        // 表示モードに応じてレンダリング
        if (this.viewMode === 'table') {
            marathonList.className = 'marathon-list table-view';
            marathonList.innerHTML = filteredMarathons.map((marathon) => this.createTableRow(marathon)).join('');
        } else {
            marathonList.className = 'marathon-list';
            marathonList.innerHTML = filteredMarathons.map((marathon) => this.createCard(marathon)).join('');
        }

        // お気に入りボタンのイベント設定
        document.querySelectorAll('.favorite-btn').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const marathonId = e.currentTarget.dataset.id;
                const marathon = this.marathons.find((m) => this.generateMarathonId(m) === marathonId);
                if (marathon) {
                    await Firestore.toggleFavorite(marathonId, marathon);
                    this.render();
                }
            });
        });

        // テーブル行クリックで公式サイトへ
        document.querySelectorAll('.marathon-table-row').forEach((row) => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.favorite-btn')) {
                    window.open(row.dataset.url, '_blank');
                }
            });
        });
    },

    // カードの生成
    createCard(marathon) {
        const marathonId = this.generateMarathonId(marathon);
        const isFavorite = Firestore.isFavorite(marathonId);
        const entryStatus = this.getEntryStatus(marathon);
        const typeClass = marathon.type === 'フルマラソン' ? 'full' : 'ultra';

        return `
      <article class="marathon-card ${isFavorite ? 'favorited' : ''}">
        <div class="card-header">
          <h2 class="card-title">${marathon.name}</h2>
          <span class="card-type ${typeClass}">${marathon.type === 'フルマラソン' ? 'フル' : 'ウルトラ'}</span>
        </div>
        <div class="card-body">
          <div class="card-info">
            <span class="card-info-icon">📅</span>
            <span class="card-info-label">開催</span>
            <span>${marathon.date}</span>
          </div>
          <div class="card-info">
            <span class="card-info-icon">👥</span>
            <span class="card-info-label">定員</span>
            <span>${marathon.capacity.toLocaleString()}人</span>
          </div>
          <div class="card-info">
            <span class="card-info-icon">📝</span>
            <span class="card-info-label">申込</span>
            <span>${marathon.entryStart}</span>
            <span class="entry-status ${entryStatus.status}">${entryStatus.label}</span>
          </div>
        </div>
        <div class="card-footer">
          <a href="${marathon.url}" target="_blank" rel="noopener noreferrer" class="card-link">
            公式サイト →
          </a>
          <button class="btn-icon favorite-btn ${isFavorite ? 'active' : ''}" data-id="${marathonId}" title="${isFavorite ? 'お気に入り解除' : 'お気に入り登録'}">
            ${isFavorite ? '⭐' : '☆'}
          </button>
        </div>
      </article>
    `;
    },

    // テーブル行の生成
    createTableRow(marathon) {
        const marathonId = this.generateMarathonId(marathon);
        const isFavorite = Firestore.isFavorite(marathonId);
        const entryStatus = this.getEntryStatus(marathon);

        return `
      <div class="marathon-table-row ${isFavorite ? 'favorited' : ''}" data-url="${marathon.url}">
        <button class="btn-icon favorite-btn table-favorite ${isFavorite ? 'active' : ''}" data-id="${marathonId}">
          ${isFavorite ? '⭐' : '☆'}
        </button>
        <div class="table-main">
          <div class="table-name">${marathon.name}</div>
          <div class="table-info">
            <span class="table-date">${marathon.date}</span>
            <span>${marathon.method}</span>
          </div>
        </div>
        <span class="entry-status table-status ${entryStatus.status}">${entryStatus.label}</span>
      </div>
    `;
    }
};

// アプリ起動
document.addEventListener('DOMContentLoaded', () => App.init());
