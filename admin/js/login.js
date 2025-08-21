// ログインフォームの処理
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const remember = document.querySelector('input[name="remember"]').checked;
    
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
    
    // フォームの前に挿入
    const form = document.getElementById('login-form');
    form.insertBefore(errorDiv, form.firstChild);
    
    // 3秒後に自動的に消す
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

// ページ読み込み時にログイン状態をチェック
document.addEventListener('DOMContentLoaded', function() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn') || sessionStorage.getItem('adminLoggedIn');
    
    if (isLoggedIn) {
        // 既にログインしている場合はダッシュボードへ
        window.location.href = './dashboard.html';
    }
});