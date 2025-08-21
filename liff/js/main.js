// ページナビゲーション
function navigateTo(page) {
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

// 登録フォームの処理
document.addEventListener('DOMContentLoaded', function() {
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
                // API呼び出し
                const result = await CustomerAPI.register(customerData);
                
                if (result.success) {
                    // 登録成功
                    alert('登録が完了しました！');
                    isRegistered = true;
                    
                    // ユーザーデータを保存
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
});

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
    document.getElementById('loading').innerHTML = `
        <p style="color: red;">エラー: アプリを読み込めませんでした</p>
        <p>LINEアプリから開いてください</p>
    `;
}

// デバッグ用: コンソールにLIFF情報を表示
console.log('LIFF App Started');
console.log('LIFF ID:', LIFF_ID);