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
        
        // URLパラメータにテナントコードがある場合
        if (tenantCode) {
            // 新しいテナント情報として保存
            this.currentTenant = {
                code: tenantCode,
                savedAt: new Date().toISOString()
            };
            
            // LocalStorageに保存
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentTenant));
            
            // URLパラメータをクリア（見た目をきれいにする）
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            
            console.log('テナント情報を設定:', tenantCode);
        } else {
            // URLパラメータがない場合、保存済みの情報を確認
            const savedTenant = localStorage.getItem(this.STORAGE_KEY);
            
            if (savedTenant) {
                // 保存済みのテナント情報を使用
                this.currentTenant = JSON.parse(savedTenant);
                console.log('保存済みテナント情報を使用:', this.currentTenant.code);
            } else {
                // テナント情報が全くない場合（エラー状態）
                console.error('テナント情報が設定されていません');
                this.showTenantError();
            }
        }
        
        return this.currentTenant;
    },
    
    // テナントコードを取得
    getTenantCode: function() {
        if (!this.currentTenant) {
            this.initialize();
        }
        return this.currentTenant ? this.currentTenant.code : null;
    },
    
    // テナント情報をクリア（デバッグ用）
    clear: function() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.currentTenant = null;
        console.log('テナント情報をクリアしました');
    },
    
    // テナントエラー表示
    showTenantError: function() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h2 style="color: #ff6b6b;">アクセスエラー</h2>
                    <p>店舗情報が見つかりません</p>
                    <p style="font-size: 14px; color: #666; margin-top: 20px;">
                        お店から提供されたQRコードまたはリンクから<br>
                        もう一度アクセスしてください
                    </p>
                </div>
            `;
        }
    },
    
    // テナント情報をAPIヘッダーに追加
    getHeaders: function() {
        const tenantCode = this.getTenantCode();
        if (tenantCode) {
            return {
                'X-Tenant-Code': tenantCode
            };
        }
        return {};
    }
};

// デバッグ用にグローバルに公開
window.TenantManager = TenantManager;