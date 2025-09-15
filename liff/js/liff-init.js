// LIFF ID（環境変数から取得するか、直接指定）
const LIFF_ID = '2007971454-kL9LXL2O';

// グローバル変数
let userProfile = null;
let isRegistered = false;

// LIFF初期化
async function initializeLiff() {
    try {
        // テナント情報を初期化（最初に実行）
        const tenantInfo = TenantManager.initialize();
        
        // テナント情報がない場合も続行（QRコード案内を表示）
        if (!tenantInfo) {
            console.log('テナント情報が未設定 - QRコード案内を表示');
            // 処理は続行する
        } else {
            console.log('現在のテナント:', tenantInfo.code);
        }
        
        // LIFF初期化
        await liff.init({ liffId: LIFF_ID });
        
        // ログインチェック
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }
        
        // プロフィール取得
        userProfile = await liff.getProfile();
        console.log('User Profile:', userProfile);
        
        // テナント情報がある場合のみユーザー登録確認
        if (tenantInfo) {
            // ユーザー登録確認（テナント情報付き）
            await checkUserRegistration();
            
            // 画面表示
            showAppContent();
        }
        // テナント情報がない場合は、TenantManagerが案内を表示している
        
    } catch (error) {
        console.error('LIFF初期化エラー:', error);
        // エラーでも案内は表示する
        if (error.message && error.message.includes('404')) {
            console.log('404エラーのため、続行します');
        } else {
            alert('アプリの初期化に失敗しました。\n' + error.message);
        }
    }
}

// ユーザー登録確認（テナント対応版）
async function checkUserRegistration() {
    try {
        // テナントコードを確認
        const tenantCode = TenantManager.getTenantCode();
        if (!tenantCode) {
            console.log('テナントコードが未設定のため、登録確認をスキップ');
            return;
        }
        
        // テナントコードをヘッダーに追加
        const tenantHeaders = TenantManager.getHeaders();
        
        const response = await fetch(`/api/customers/${userProfile.userId}`, {
            headers: {
                ...tenantHeaders,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            isRegistered = true;
            
            // ユーザー名を表示
            const userNameElements = document.querySelectorAll('.user-name');
            userNameElements.forEach(el => {
                el.textContent = userData.real_name;
            });
            
            // ローカルストレージに保存（テナント情報も含める）
            userData.tenant_code = TenantManager.getTenantCode();
            localStorage.setItem('userData', JSON.stringify(userData));
        } else if (response.status === 404) {
            isRegistered = false;
        }
    } catch (error) {
        console.error('登録確認エラー:', error);
    }
}

// アプリコンテンツ表示
function showAppContent() {
    // ローディング画面を非表示
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    
    // 適切な画面を表示
    if (isRegistered) {
        showHomeScreen();
    } else {
        showRegistrationScreen();
    }
}

// ホーム画面表示
function showHomeScreen() {
    hideAllScreens();
    document.getElementById('home-screen').style.display = 'block';
    
    // 次回予約を取得
    loadCurrentReservation();
}

// 登録画面表示
function showRegistrationScreen() {
    hideAllScreens();
    document.getElementById('registration-screen').style.display = 'block';
}

// 全画面非表示
function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.style.display = 'none';
    });
}

// 現在の予約を読み込み（テナント対応版）
async function loadCurrentReservation() {
    try {
        // テナントコードを確認
        const tenantCode = TenantManager.getTenantCode();
        if (!tenantCode) {
            console.log('テナントコードが未設定のため、予約取得をスキップ');
            return;
        }
        
        // テナントコードをヘッダーに追加
        const tenantHeaders = TenantManager.getHeaders();
        
        const response = await fetch(`/api/reservations/current/${userProfile.userId}`, {
            headers: {
                ...tenantHeaders,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const reservation = await response.json();
            displayCurrentReservation(reservation);
        }
    } catch (error) {
        console.error('予約取得エラー:', error);
    }
}

// 予約表示
function displayCurrentReservation(reservation) {
    const container = document.getElementById('current-reservation');
    if (reservation) {
        container.style.display = 'block';
        container.querySelector('.reservation-date').textContent = 
            formatDateTime(reservation.reservation_date);
        container.querySelector('.reservation-menu').textContent = 
            `メニュー: ${reservation.menu_name}`;
        container.querySelector('.reservation-staff').textContent = 
            `担当: ${reservation.staff_name}`;
    } else {
        container.style.display = 'none';
    }
}

// 日時フォーマット
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    
    return `${month}月${day}日(${dayOfWeek}) ${hours}:${minutes}`;
}

// DOMContentLoadedで初期化
document.addEventListener('DOMContentLoaded', initializeLiff);