// liff-init.js（完全版 - エラー修正版）

// LIFF初期化とユーザー情報取得
const initializeLiff = async () => {
    console.log('LIFF初期化開始');
    
    try {
        // LIFF初期化
        await liff.init({ 
            liffId: '2007971454-kL9LXL2O',
            withLoginOnExternalBrowser: true
        });
        
        console.log('LIFF初期化完了');
        
        // ログイン状態を確認
        if (!liff.isLoggedIn()) {
            console.log('未ログイン状態');
            // 外部ブラウザの場合はログインを促す
            if (!liff.isInClient()) {
                liff.login();
                return null;
            }
        }
        
        // プロフィール取得
        const profile = await liff.getProfile();
        console.log('User Profile:', profile);
        
        // グローバル変数に保存
        window.userProfile = profile;
        
        // LINE IDをAPIで使用できるように保存
        if (profile && profile.userId) {
            localStorage.setItem('line_user_id', profile.userId);
        }
        
        // 既存の顧客データを確認
        await checkCustomerRegistration(profile);
        
        return profile;
        
    } catch (error) {
        console.error('LIFF初期化エラー:', error);
        throw error;
    }
};

// 顧客登録状態を確認
const checkCustomerRegistration = async (profile) => {
    if (!profile || !profile.userId) {
        console.error('プロフィール情報が不正です');
        return;
    }
    
    try {
        // テナント情報を取得
        const tenantCode = TenantManager.getTenantCode();
        if (!tenantCode) {
            console.error('テナント情報が取得できません');
            return;
        }
        
        // APIで顧客情報を確認
        const response = await fetch('/api/customers/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-Code': tenantCode
            },
            body: JSON.stringify({
                line_user_id: profile.userId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.exists && data.customer) {
                // 登録済み
                console.log('登録済みユーザー:', data.customer);
                window.userProfile = {
                    ...profile,
                    ...data.customer
                };
                localStorage.setItem('userData', JSON.stringify(window.userProfile));
                
                // ホーム画面を表示（要素が存在する場合のみ）
                showAppContent('home');
            } else {
                // 未登録
                console.log('未登録ユーザー');
                showAppContent('registration');
            }
        } else {
            console.error('顧客確認APIエラー:', response.status);
            // エラーの場合は登録画面を表示
            showAppContent('registration');
        }
    } catch (error) {
        console.error('顧客確認エラー:', error);
        // エラーの場合は登録画面を表示
        showAppContent('registration');
    }
};

// アプリコンテンツを表示
const showAppContent = (screen) => {
    console.log('画面表示:', screen);
    
    // ローディング画面を非表示（存在する場合のみ）
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
    
    // 各画面要素を取得
    const homeEl = document.getElementById('home-screen');
    const registrationEl = document.getElementById('registration-screen');
    const mainEl = document.getElementById('main-content');
    
    // 画面切り替え（要素が存在する場合のみ）
    if (screen === 'home') {
        if (homeEl) homeEl.style.display = 'block';
        if (registrationEl) registrationEl.style.display = 'none';
        if (mainEl) mainEl.style.display = 'block';
        
        // showHomeScreen関数が定義されていれば実行
        if (typeof showHomeScreen === 'function') {
            showHomeScreen();
        }
    } else if (screen === 'registration') {
        if (homeEl) homeEl.style.display = 'none';
        if (registrationEl) registrationEl.style.display = 'block';
        if (mainEl) mainEl.style.display = 'block';
        
        // showRegistrationScreen関数が定義されていれば実行
        if (typeof showRegistrationScreen === 'function') {
            showRegistrationScreen();
        }
    }
};

// DOMContentLoadedイベントで初期化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded - liff-init.js');
    
    // テナント情報を先に初期化
    const tenantInfo = TenantManager.initialize();
    
    if (!tenantInfo) {
        console.log('テナント情報が未設定のため、LIFF初期化をスキップ');
        return;
    }
    
    console.log('現在のテナント:', tenantInfo);
    
    // ページによって異なる処理
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    console.log('現在のページ:', currentPage);
    
    // 予約ページなど特定のページでは画面切り替えをスキップ
    const skipScreenSwitch = [
        'reservation.html',
        'menu.html',
        'history.html',
        'mypage.html'
    ].includes(currentPage);
    
    if (!skipScreenSwitch) {
        // index.htmlなどでのみLIFF初期化と画面切り替えを実行
        try {
            await initializeLiff();
        } catch (error) {
            console.error('LIFF初期化失敗:', error);
            
            // エラー表示（要素が存在する場合のみ）
            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.innerHTML = `
                    <p style="color: red;">エラー: ${error.message}</p>
                    <p>ページを再読み込みしてください</p>
                `;
            }
        }
    } else {
        // 他のページでは単純にLIFF初期化のみ
        try {
            await liff.init({ 
                liffId: '2007971454-kL9LXL2O',
                withLoginOnExternalBrowser: true
            });
            console.log('LIFF初期化完了（サブページ）');
            
            if (liff.isLoggedIn()) {
                const profile = await liff.getProfile();
                window.userProfile = profile;
                console.log('User Profile:', profile);
            }
        } catch (error) {
            console.error('LIFF初期化エラー（サブページ）:', error);
        }
    }
});

// グローバルに公開
window.initializeLiff = initializeLiff;
window.showAppContent = showAppContent;