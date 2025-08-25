// API基本設定
const API_BASE_URL = window.location.origin + '/api';

// APIヘルパー関数（テナント対応版）
class API {
    // GETリクエスト
    static async get(endpoint) {
        try {
            // テナント情報を含むヘッダーを作成
            const tenantHeaders = TenantManager.getHeaders();
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userProfile?.userId}`,
                    ...tenantHeaders  // テナント情報を追加
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    }
    
    // POSTリクエスト
    static async post(endpoint, data) {
        try {
            // テナント情報を含むヘッダーを作成
            const tenantHeaders = TenantManager.getHeaders();
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userProfile?.userId}`,
                    ...tenantHeaders  // テナント情報を追加
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }
    
    // PUTリクエスト
    static async put(endpoint, data) {
        try {
            // テナント情報を含むヘッダーを作成
            const tenantHeaders = TenantManager.getHeaders();
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userProfile?.userId}`,
                    ...tenantHeaders  // テナント情報を追加
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API PUT Error:', error);
            throw error;
        }
    }
    
    // DELETEリクエスト
    static async delete(endpoint) {
        try {
            // テナント情報を含むヘッダーを作成
            const tenantHeaders = TenantManager.getHeaders();
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userProfile?.userId}`,
                    ...tenantHeaders  // テナント情報を追加
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response.status === 204 ? null : await response.json();
        } catch (error) {
            console.error('API DELETE Error:', error);
            throw error;
        }
    }
}

// 顧客API（テナント対応版）
const CustomerAPI = {
    // 顧客登録（テナント情報も一緒に送信）
    register: async (customerData) => {
        // テナントコードを追加
        const tenantCode = TenantManager.getTenantCode();
        
        return await API.post('/customers/register', {
            ...customerData,
            line_user_id: userProfile.userId,
            tenant_code: tenantCode  // テナント情報を追加
        });
    },
    
    // 顧客情報取得
    get: async (userId) => {
        return await API.get(`/customers/${userId}`);
    },
    
    // 顧客情報更新
    update: async (userId, data) => {
        return await API.put(`/customers/${userId}`, data);
    }
};

// 予約API（テナント対応版）
const ReservationAPI = {
    // 予約作成（テナント情報も一緒に送信）
    create: async (reservationData) => {
        // テナントコードを追加
        const tenantCode = TenantManager.getTenantCode();
        
        return await API.post('/reservations', {
            ...reservationData,
            customer_id: userProfile.userId,
            tenant_code: tenantCode  // テナント情報を追加
        });
    },
    
    // 予約一覧取得
    list: async (userId) => {
        return await API.get(`/reservations/user/${userId}`);
    },
    
    // 現在の予約取得
    getCurrent: async (userId) => {
        return await API.get(`/reservations/current/${userId}`);
    },
    
    // 予約キャンセル
    cancel: async (reservationId) => {
        return await API.delete(`/reservations/${reservationId}`);
    },
    
    // 空き時間取得（テナント別）
    getAvailableSlots: async (date, menuId) => {
        return await API.get(`/reservations/available-slots?date=${date}&menu_id=${menuId}`);
    }
};

// メニューAPI（テナント対応版）
const MenuAPI = {
    // メニュー一覧取得（テナント別）
    list: async () => {
        return await API.get('/menus');
    },
    
    // メニュー詳細取得
    get: async (menuId) => {
        return await API.get(`/menus/${menuId}`);
    }
};

// スタッフAPI（テナント対応版）
const StaffAPI = {
    // スタッフ一覧取得（テナント別）
    list: async () => {
        return await API.get('/staff');
    },
    
    // スタッフ詳細取得
    get: async (staffId) => {
        return await API.get(`/staff/${staffId}`);
    }
};

// デバッグ用：現在のテナント情報を確認
console.log('API Module Loaded - Current Tenant:', TenantManager.getTenantCode());