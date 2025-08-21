// LIFF ID（環境変数から取得するか、直接指定）
const LIFF_ID = '2007971454-kL9LXL2O';

// グローバル変数
let userProfile = null;
let isRegistered = false;

// LIFF初期化
async function initializeLiff() {
    try {
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
        
        // ユーザー登録確認
        await checkUserRegistration();
        
        // 画面表示
        showAppContent();
        
    } catch (error) {
        console.error('LIFF初期化エラー:', error);
        alert('アプリの初期化に失敗しました。\n' + error.message);
    }
}

// ユーザー登録確認
async function checkUserRegistration() {
    try {
        const response = await fetch(`/api/customers/${userProfile.userId}`);
        
        if (response.ok) {
            const userData = await response.json();
            isRegistered = true;
            
            // ユーザー名を表示
            const userNameElements = document.querySelectorAll('.user-name');
            userNameElements.forEach(el => {
                el.textContent = userData.real_name;
            });
            
            // ローカルストレージに保存
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

// 現在の予約を読み込み
async function loadCurrentReservation() {
    try {
        const response = await fetch(`/api/reservations/current/${userProfile.userId}`);
        
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