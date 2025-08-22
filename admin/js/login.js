// ログインフォームの処理
document.addEventListener('DOMContentLoaded', function() {
    // ページ読み込み時にログイン状態をチェック
    const isLoggedIn = localStorage.getItem('adminLoggedIn') || sessionStorage.getItem('adminLoggedIn');
    
    if (isLoggedIn) {
        // 既にログインしている場合はダッシュボードへ
        window.location.href = './dashboard.html';
        return;
    }
    
    // ログインフォームの取得
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const rememberCheckbox = document.querySelector('input[name="remember"]');
            const remember = rememberCheckbox ? rememberCheckbox.checked : false;
            
            // デモ用の簡易認証（本番環境では適切な認証を実装）
            if (username === 'admin' && password === 'admin123') {
                // セッションストレージに保存（rememberがtrueの場合はlocalStorage）
                const storage = remember ? localStorage : sessionStorage;
                storage.setItem('adminLoggedIn', 'true');
                storage.setItem('adminUsername', username);
                storage.setItem('loginTime', new Date().toISOString());
                
                // ダッシュボードへリダイレクト
                window.location.href = './dashboard.html';
            } else {
                // エラーメッセージを表示
                showError('ユーザー名またはパスワードが正しくありません');
            }
        });
    }
});

// エラーメッセージを表示
function showError(message) {
    // 既存のエラーメッセージを削除
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 新しいエラーメッセージを作成
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // スタイルを追加（CSSファイルにない場合のため）
    errorDiv.style.cssText = `
        margin-bottom: 20px;
        padding: 12px;
        background: #fee;
        color: #c33;
        border-radius: 8px;
        font-size: 14px;
        text-align: center;
        animation: shake 0.5s;
        transition: opacity 0.3s;
    `;
    
    // フォームの取得
    const form = document.getElementById('login-form');
    
    if (form) {
        // フォームの最初に挿入
        form.insertBefore(errorDiv, form.firstChild);
        
        // 3秒後に自動的に消す
        setTimeout(() => {
            errorDiv.style.opacity = '0';
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 300);
        }, 3000);
    }
}

// アニメーションのスタイルを追加（CSSにない場合のため）
if (!document.querySelector('style[data-login-animations]')) {
    const style = document.createElement('style');
    style.setAttribute('data-login-animations', 'true');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
        
        .error-message {
            animation: shake 0.5s;
        }
    `;
    document.head.appendChild(style);
}