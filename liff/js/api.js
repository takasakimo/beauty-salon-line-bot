// api.js（完全版 - マルチテナント対応）

// API呼び出し用の共通関数
async function apiCall(endpoint, method = 'GET', data = null) {
    console.log(`API呼び出し: ${method} ${endpoint}`);
    
    try {
        // テナント情報を取得
        const tenantCode = TenantManager.getTenantCode();
        if (!tenantCode) {
            console.error('テナント情報が取得できません');
            throw new Error('店舗情報が設定されていません');
        }
        
        // リクエストオプション
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-Code': tenantCode
            }
        };
        
        // LINE User IDを追加（ある場合）
        const lineUserId = localStorage.getItem('line_user_id');
        if (lineUserId) {
            options.headers['X-Line-User-Id'] = lineUserId;
        }
        
        // POSTやPUTの場合はボディを追加
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        // API呼び出し
        const response = await fetch(endpoint, options);
        
        // レスポンスのログ
        console.log(`API応答: ${response.status}`);
        
        // エラーチェック
        if (!response.ok) {
            const errorText = await response.text();
            console.error('APIエラー:', errorText);
            throw new Error(`APIエラー: ${response.status}`);
        }
        
        // JSONレスポンスをパース
        const result = await response.json();
        console.log('API結果:', result);
        
        return result;
        
    } catch (error) {
        console.error('API呼び出しエラー:', error);
        throw error;
    }
}

// 顧客登録API
async function registerCustomer(customerData) {
    console.log('顧客登録:', customerData);
    
    // LINEプロフィール情報を追加
    if (window.userProfile) {
        customerData.line_user_id = window.userProfile.userId;
        customerData.display_name = window.userProfile.displayName;
        customerData.picture_url = window.userProfile.pictureUrl;
    }
    
    return await apiCall('/api/customers/register', 'POST', customerData);
}

// 予約作成API
async function createReservation(reservationData) {
    console.log('予約作成:', reservationData);
    
    // LINEユーザーIDを追加
    if (window.userProfile) {
        reservationData.line_user_id = window.userProfile.userId;
    }
    
    return await apiCall('/api/reservations', 'POST', reservationData);
}

// メニュー取得API
async function getMenus() {
    return await apiCall('/api/menus', 'GET');
}

// スタッフ取得API
async function getStaff() {
    return await apiCall('/api/staff', 'GET');
}

// 予約履歴取得API
async function getReservationHistory() {
    if (!window.userProfile || !window.userProfile.userId) {
        throw new Error('ユーザー情報が取得できません');
    }
    
    return await apiCall(`/api/reservations/history/${window.userProfile.userId}`, 'GET');
}

// 現在の予約取得API
async function getCurrentReservations() {
    if (!window.userProfile || !window.userProfile.userId) {
        throw new Error('ユーザー情報が取得できません');
    }
    
    return await apiCall(`/api/reservations/current/${window.userProfile.userId}`, 'GET');
}

// グローバルに公開
window.apiCall = apiCall;
window.registerCustomer = registerCustomer;
window.createReservation = createReservation;
window.getMenus = getMenus;
window.getStaff = getStaff;
window.getReservationHistory = getReservationHistory;
window.getCurrentReservations = getCurrentReservations;

// API Module Loaded のログ
console.log('API Module Loaded - Current Tenant:', TenantManager.getTenantCode());