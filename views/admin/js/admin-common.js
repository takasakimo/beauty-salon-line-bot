// API基本設定
const API_BASE_URL = window.location.origin + '/api';

// セッショントークンを取得（マルチテナント用追加）
function getSessionToken() {
    return localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
}

// テナントコードを取得（マルチテナント用追加）
function getTenantCode() {
    return localStorage.getItem('tenantCode') || sessionStorage.getItem('tenantCode') || 'beauty-salon-001';
}

// ログイン状態をチェック
function checkAuth() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn') || sessionStorage.getItem('adminLoggedIn');
    
    if (!isLoggedIn) {
        // ログインページへリダイレクト
        window.location.href = './login.html';
        return false;
    }
    
    // テナント情報を表示（マルチテナント用追加）
    displayTenantInfo();
    
    return true;
}

// テナント情報を表示（マルチテナント用追加）
function displayTenantInfo() {
    const tenantName = localStorage.getItem('tenantName') || sessionStorage.getItem('tenantName');
    const adminName = localStorage.getItem('adminName') || sessionStorage.getItem('adminName') || '管理者';
    
    // ヘッダーに管理者名を表示
    const adminNameElement = document.getElementById('admin-name');
    if (adminNameElement) {
        adminNameElement.textContent = adminName;
    }
    
    // テナント名を表示（もし要素があれば）
    const tenantNameElement = document.getElementById('tenant-name');
    if (tenantNameElement) {
        tenantNameElement.textContent = tenantName || 'ビューティーサロン';
    }
}

// ログアウト処理
function logout() {
    if (confirm('ログアウトしますか？')) {
        // すべてのセッション情報をクリア（マルチテナント対応）
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminUsername');
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('tenantCode');
        localStorage.removeItem('tenantName');
        localStorage.removeItem('adminName');
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminUsername');
        sessionStorage.removeItem('sessionToken');
        sessionStorage.removeItem('tenantCode');
        sessionStorage.removeItem('tenantName');
        sessionStorage.removeItem('adminName');
        
        window.location.href = './login.html';
    }
}

// 現在の日付を表示
function displayCurrentDate() {
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        dateElement.textContent = now.toLocaleDateString('ja-JP', options);
    }
}

// APIヘルパー関数（マルチテナント対応版）
class AdminAPI {
    // ヘッダーを生成（マルチテナント対応）
    static getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin'
        };
        
        // セッショントークンを追加
        const sessionToken = getSessionToken();
        if (sessionToken) {
            headers['X-Session-Token'] = sessionToken;
        }
        
        // テナントコードを追加
        const tenantCode = getTenantCode();
        if (tenantCode) {
            headers['X-Tenant-Code'] = tenantCode;
        }
        
        return headers;
    }
    
    // エラーハンドリング（401の場合はログイン画面へ）
    static async handleResponse(response) {
        if (response.status === 401) {
            // 認証エラーの場合はログイン画面へ
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = './login.html';
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response;
    }
    
    static async get(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            const checkedResponse = await this.handleResponse(response);
            if (!checkedResponse) return null;
            
            return await checkedResponse.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    }
    
    static async post(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            
            const checkedResponse = await this.handleResponse(response);
            if (!checkedResponse) return null;
            
            return await checkedResponse.json();
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }
    
    static async put(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            
            const checkedResponse = await this.handleResponse(response);
            if (!checkedResponse) return null;
            
            return await checkedResponse.json();
        } catch (error) {
            console.error('API PUT Error:', error);
            throw error;
        }
    }
    
    static async delete(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            
            const checkedResponse = await this.handleResponse(response);
            if (!checkedResponse) return null;
            
            return response.status === 204 ? null : await checkedResponse.json();
        } catch (error) {
            console.error('API DELETE Error:', error);
            throw error;
        }
    }
}

// 日時フォーマット関数
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 日付フォーマット関数
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}/${month}/${day}`;
}

// 金額フォーマット関数
function formatCurrency(amount) {
    return `¥${amount.toLocaleString()}`;
}

// 価格フォーマット（エイリアス）
function formatPrice(price) {
    return formatCurrency(price);
}

// ステータスの日本語化（マルチテナント用追加）
function getStatusLabel(status) {
    const statusMap = {
        'confirmed': '確定',
        'cancelled': 'キャンセル',
        'completed': '完了',
        'pending': '保留中'
    };
    return statusMap[status] || status;
}

// ステータスバッジのクラス（マルチテナント用追加）
function getStatusClass(status) {
    const classMap = {
        'confirmed': 'status-confirmed',
        'cancelled': 'status-cancelled',
        'completed': 'status-completed',
        'pending': 'status-pending'
    };
    return classMap[status] || 'status-default';
}

// トースト通知
function showToast(message, type = 'success') {
    // トーストコンテナを作成（存在しない場合）
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(toastContainer);
    }
    
    // トーストを作成
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        min-width: 250px;
    `;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // 3秒後に削除
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// APIリクエストのヘルパー関数（マルチテナント対応・互換性用）
async function apiRequest(url, options = {}) {
    const sessionToken = getSessionToken();
    const tenantCode = getTenantCode();
    
    // ヘッダーにセッショントークンとテナントコードを追加
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (sessionToken) {
        headers['X-Session-Token'] = sessionToken;
    }
    
    if (tenantCode) {
        headers['X-Tenant-Code'] = tenantCode;
    }
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        // 401エラーの場合はログイン画面へ
        if (response.status === 401) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'login.html';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('APIリクエストエラー:', error);
        throw error;
    }
}

// アニメーション用CSS追加
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    /* ステータスバッジのスタイル（マルチテナント用追加） */
    .status-confirmed {
        background-color: #27ae60;
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
    }
    
    .status-cancelled {
        background-color: #e74c3c;
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
    }
    
    .status-completed {
        background-color: #3498db;
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
    }
    
    .status-pending {
        background-color: #f39c12;
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
    }
`;
document.head.appendChild(style);

// サイドバーのアクティブ状態を設定（マルチテナント用追加）
function setActiveNavItem() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // 両方のクラス名に対応（.nav-itemと.sidebar nav ul li）
    const navItems = document.querySelectorAll('.nav-item, .sidebar nav ul li');
    
    navItems.forEach(item => {
        // リンクを探す（直接またはa要素）
        const link = item.tagName === 'A' ? item : item.querySelector('a');
        if (link) {
            const href = link.getAttribute('href');
            if (href) {
                const hrefPage = href.split('/').pop();
                if (hrefPage === currentPage) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            }
        }
    });
}

// ページ読み込み時の共通処理
document.addEventListener('DOMContentLoaded', function() {
    // ログインチェック（ログインページ以外）
    if (!window.location.pathname.includes('login.html')) {
        if (!checkAuth()) {
            return;
        }
    }
    
    // 現在の日付を表示
    displayCurrentDate();
    
    // アクティブなナビゲーションを設定
    setActiveNavItem();
    
    // テナント情報を表示（追加）
    const currentTenantElement = document.getElementById('current-tenant');
    if (currentTenantElement) {
        const tenantName = localStorage.getItem('tenantName') || sessionStorage.getItem('tenantName');
        currentTenantElement.textContent = tenantName || 'ビューティーサロン';
    }
});

// エクスポート（他のJSファイルから使用可能にする）
window.adminAPI = {
    apiRequest,
    checkAuth,
    logout,
    formatDate,
    formatDateTime,
    formatCurrency,
    formatPrice,
    getStatusLabel,
    getStatusClass,
    getSessionToken,
    getTenantCode,
    showToast,
    AdminAPI
};