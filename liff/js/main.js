// main.js（完全版 - TenantManager対応）

// ページナビゲーション（テナント情報を引き継ぎ）
function navigateTo(page) {
    // TenantManagerからテナント情報を取得
    const tenantCode = TenantManager.getTenantCode();
    
    if (!tenantCode) {
        // テナント未設定の場合
        alert('店舗情報が設定されていません。\nQRコードから再度アクセスしてください。');
        TenantManager.showSetupGuide();
        return;
    }
    
    console.log('ナビゲーション:', page, 'テナント:', tenantCode);
    
    // ページ遷移（テナント情報はLocalStorageに保存されているので、URLパラメータは不要）
    switch(page) {
        case 'reservation':
            window.location.href = '/liff/reservation.html';
            break;
        case 'mypage':
            window.location.href = '/liff/mypage.html';
            break;
        case 'menu':
            window.location.href = '/liff/menu.html';
            break;
        case 'history':
            window.location.href = '/liff/history.html';
            break;
        default:
            window.location.href = '/liff/index.html';
    }
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('main.js初期化開始');
    
    // TenantManagerの初期化
    const tenantInfo = TenantManager.initialize();
    
    if (!tenantInfo) {
        console.log('テナント情報が設定されていません');
        // TenantManagerが自動的にセットアップガイドを表示
        return;
    }
    
    console.log('テナント情報確認:', tenantInfo);
    
    // currentTenantをグローバルに設定（互換性のため）
    window.currentTenant = {
        tenant_code: tenantInfo.code,
        tenant_name: TenantManager.getCurrentTenantName()
    };
    
    // ページ初期化
    initializePage();
});

// ページ初期化
function initializePage() {
    // 登録フォームの処理
    const registrationForm = document.getElementById('registration-form');
    
    if (registrationForm) {
        registrationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const customerData = {
                real_name: formData.get('name'),
                phone_number: formData.get('phone')
            };
            
            // バリデーション
            if (!validateRegistrationData(customerData)) {
                return;
            }
            
            // 登録ボタンを無効化
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = '登録中...';
            
            try {
                // API呼び出し（テナントヘッダー付き）
                const result = await apiCall('/api/customers/register', 'POST', customerData);
                
                if (result && result.success) {
                    // 登録成功
                    alert('登録が完了しました！');
                    
                    // ユーザーデータを保存
                    window.userProfile = result.data;
                    localStorage.setItem('userData', JSON.stringify(result.data));
                    
                    // ホーム画面へ遷移
                    showHomeScreen();
                } else {
                    throw new Error(result.message || '登録に失敗しました');
                }
                
            } catch (error) {
                console.error('登録エラー:', error);
                alert('登録に失敗しました。\n' + error.message);
                
                // ボタンを有効化
                submitButton.disabled = false;
                submitButton.textContent = '登録する';
            }
        });
    }
    
    // 店舗名を表示（あれば）
    const tenantNameElements = document.querySelectorAll('.tenant-name');
    tenantNameElements.forEach(element => {
        element.textContent = TenantManager.getCurrentTenantName();
    });
}

// ホーム画面を表示
function showHomeScreen() {
    console.log('ホーム画面表示');
    
    // 画面切り替え
    const loadingEl = document.getElementById('loading');
    const registrationEl = document.getElementById('registration-screen');
    const homeEl = document.getElementById('home-screen');
    const mainEl = document.getElementById('main-content');
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (registrationEl) registrationEl.style.display = 'none';
    if (homeEl) homeEl.style.display = 'block';
    if (mainEl) mainEl.style.display = 'block';
    
    // ユーザー名を表示
    if (window.userProfile && window.userProfile.real_name) {
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            element.textContent = window.userProfile.real_name;
        });
    }
    
    // 現在の予約を読み込み
    loadCurrentReservation();
}

// 登録画面を表示
function showRegistrationScreen() {
    console.log('登録画面表示');
    
    // 画面切り替え
    const loadingEl = document.getElementById('loading');
    const homeEl = document.getElementById('home-screen');
    const registrationEl = document.getElementById('registration-screen');
    const mainEl = document.getElementById('main-content');
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (homeEl) homeEl.style.display = 'none';
    if (registrationEl) registrationEl.style.display = 'block';
    if (mainEl) mainEl.style.display = 'block';
}

// 現在の予約を読み込み
async function loadCurrentReservation() {
    try {
        if (!window.userProfile || !window.userProfile.customer_id) {
            return;
        }
        
        const response = await apiCall('/api/reservations/current', 'GET');
        
        if (response && response.length > 0) {
            const reservation = response[0];
            displayCurrentReservation(reservation);
        }
    } catch (error) {
        console.error('現在の予約取得エラー:', error);
    }
}

// 現在の予約を表示
function displayCurrentReservation(reservation) {
    const currentReservationDiv = document.getElementById('current-reservation');
    
    if (!currentReservationDiv) return;
    
    if (reservation) {
        const reservationDate = new Date(reservation.reservation_date);
        const dateString = reservationDate.toLocaleDateString('ja-JP', {
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
        const timeString = reservationDate.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const dateEl = currentReservationDiv.querySelector('.reservation-date');
        const menuEl = currentReservationDiv.querySelector('.reservation-menu');
        const staffEl = currentReservationDiv.querySelector('.reservation-staff');
        
        if (dateEl) dateEl.textContent = `${dateString} ${timeString}`;
        if (menuEl) menuEl.textContent = reservation.menu_name || 'メニュー情報なし';
        if (staffEl) staffEl.textContent = reservation.staff_name || 'スタッフ情報なし';
        
        currentReservationDiv.style.display = 'block';
    } else {
        currentReservationDiv.style.display = 'none';
    }
}

// 登録データのバリデーション
function validateRegistrationData(data) {
    // 名前のバリデーション
    if (!data.real_name || data.real_name.length < 2 || data.real_name.length > 20) {
        alert('お名前は2文字以上20文字以内で入力してください');
        return false;
    }
    
    // 電話番号のバリデーション
    const phoneRegex = /^[0-9]{10,13}$/;
    if (!data.phone_number || !phoneRegex.test(data.phone_number)) {
        alert('電話番号は10〜13桁の数字で入力してください');
        return false;
    }
    
    return true;
}

// エラーハンドリング
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});

// 未処理のPromiseエラー
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
});

// LIFFエラー時の処理
if (typeof liff === 'undefined') {
    console.error('LIFF SDKが読み込まれていません');
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
        loadingDiv.innerHTML = `
            <p style="color: red;">エラー: アプリを読み込めませんでした</p>
            <p>LINEアプリから開いてください</p>
        `;
    }
}

// デバッグ用関数
window.debugMain = function() {
    console.log('=== Main.js デバッグ情報 ===');
    console.log('テナントコード:', TenantManager.getTenantCode());
    console.log('テナント名:', TenantManager.getCurrentTenantName());
    console.log('テナント情報:', TenantManager.currentTenant);
    console.log('ユーザープロファイル:', window.userProfile);
    console.log('LocalStorage - tenant_info:', localStorage.getItem('tenant_info'));
    console.log('LocalStorage - userData:', localStorage.getItem('userData'));
};

// デバッグ用: コンソールにLIFF情報を表示
console.log('main.js読み込み完了');

// グローバル関数として公開
window.navigateTo = navigateTo;
window.showHomeScreen = showHomeScreen;
window.showRegistrationScreen = showRegistrationScreen;