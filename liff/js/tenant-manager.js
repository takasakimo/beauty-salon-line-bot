// テナント管理モジュール
const TenantManager = {
    // テナント情報を保存するキー
    STORAGE_KEY: 'tenant_info',
    
    // 現在のテナント情報
    currentTenant: null,
    
    // テナント情報を初期化
    initialize: function() {
        // URLパラメータからテナントコードを取得
        const urlParams = new URLSearchParams(window.location.search);
        const tenantCode = urlParams.get('tenant');
        
        // URLパラメータにテナントコードがある場合（QRコードからのアクセス）
        if (tenantCode) {
            // 新しいテナント情報として保存（永続的に保存）
            this.currentTenant = {
                code: tenantCode,
                savedAt: new Date().toISOString(),
                source: 'qr_code'
            };
            
            // LocalStorageに永続保存
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentTenant));
            
            // URLパラメータをクリア（見た目をきれいにする）
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            
            console.log('QRコードからテナント情報を設定:', tenantCode);
            
            // 初回設定メッセージ
            this.showWelcomeMessage(tenantCode);
            
        } else {
            // URLパラメータがない場合、保存済みの情報を確認
            const savedTenant = localStorage.getItem(this.STORAGE_KEY);
            
            if (savedTenant) {
                // 保存済みのテナント情報を使用
                this.currentTenant = JSON.parse(savedTenant);
                console.log('保存済みテナント情報を使用:', this.currentTenant.code);
            } else {
                // テナント情報が全くない場合（初めてのアクセス）
                console.log('テナント情報が未設定');
                this.showSetupGuide();
                return null; // nullを返して処理を中断
            }
        }
        
        return this.currentTenant;
    },
    
    // 初回設定時のウェルカムメッセージ
    showWelcomeMessage: function(tenantCode) {
        // テナント名のマッピング
        const tenantNames = {
            'beauty-salon-001': 'ビューティーサロン名古屋',
            'beauty-salon-002': 'ヘアサロン東京',
            'beauty-salon-003': 'エステ＆ビューティー大阪',
            'beauty-salon-004': 'ヘアサロン福岡'
        };
        
        const tenantName = tenantNames[tenantCode] || '店舗';
        
        // 一度だけ表示するフラグ
        const welcomeShownKey = `welcome_shown_${tenantCode}`;
        if (!localStorage.getItem(welcomeShownKey)) {
            setTimeout(() => {
                alert(`【${tenantName}】への登録ありがとうございます！\n今後はリッチメニューからも直接アクセスできます。`);
                localStorage.setItem(welcomeShownKey, 'true');
            }, 1000);
        }
    },
    
    // 設定ガイドを表示
    showSetupGuide: function() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div style="padding: 20px; text-align: center; background: white; border-radius: 10px; margin: 20px;">
                    <h2 style="color: #667eea; margin-bottom: 20px;">はじめての方へ</h2>
                    <p style="color: #333; line-height: 1.8; margin-bottom: 20px;">
                        ご利用の店舗から提供された<br>
                        <strong>QRコード</strong>を読み取ってください
                    </p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <p style="font-size: 14px; color: #666;">
                            QRコードは店舗に設置されています<br>
                            または、店舗スタッフにお尋ねください
                        </p>
                    </div>
                    <p style="font-size: 12px; color: #999;">
                        一度QRコードから登録すると<br>
                        次回からはリッチメニューから<br>
                        直接アクセスできます
                    </p>
                </div>
            `;
        }
    },
    
    // テナントコードを取得
    getTenantCode: function() {
        if (!this.currentTenant) {
            const result = this.initialize();
            if (!result) {
                return null; // 設定されていない場合はnullを返す
            }
        }
        return this.currentTenant ? this.currentTenant.code : null;
    },
    
    // テナント情報をクリア（店舗変更用）
    clear: function() {
        localStorage.removeItem(this.STORAGE_KEY);
        // ウェルカムメッセージフラグもクリア
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('welcome_shown_')) {
                localStorage.removeItem(key);
            }
        });
        this.currentTenant = null;
        console.log('テナント情報をクリアしました');
        alert('店舗情報をリセットしました。新しいQRコードを読み取ってください。');
        location.reload();
    },
    
    // 現在の店舗名を取得
    getCurrentTenantName: function() {
        const tenantNames = {
            'beauty-salon-001': 'ビューティーサロン名古屋',
            'beauty-salon-002': 'ヘアサロン東京',
            'beauty-salon-003': 'エステ＆ビューティー大阪',
            'beauty-salon-004': 'ヘアサロン福岡'
        };
        
        const code = this.getTenantCode();
        return tenantNames[code] || '未設定';
    },
    
    // テナント情報をAPIヘッダーに追加
    getHeaders: function() {
        const tenantCode = this.getTenantCode();
        if (!tenantCode) {
            return {};
        }
        return {
            'X-Tenant-Code': tenantCode
        };
    }
};

// デバッグ用にグローバルに公開
window.TenantManager = TenantManager;