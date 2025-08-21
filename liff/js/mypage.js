// グローバル変数
let customerData = null;
let nextReservation = null;

// LIFF初期化を待つ
function waitForLiff() {
    return new Promise((resolve) => {
        const checkLiff = setInterval(() => {
            if (typeof liff !== 'undefined' && liff.isLoggedIn && liff.isLoggedIn()) {
                clearInterval(checkLiff);
                resolve();
            }
        }, 100);
        
        // 10秒でタイムアウト
        setTimeout(() => {
            clearInterval(checkLiff);
            resolve();
        }, 10000);
    });
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // LIFF初期化を待つ
        await waitForLiff();
        
        // userProfileが設定されるまで待つ
        let waitCount = 0;
        while ((!window.userProfile || !window.userProfile.userId) && waitCount < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
        }
        
        if (!window.userProfile || !window.userProfile.userId) {
            console.error('ユーザー情報が取得できませんでした');
            alert('ログイン情報が取得できませんでした。\nホーム画面から再度お試しください。');
            window.location.href = './index.html';
            return;
        }
        
        console.log('User Profile in mypage:', window.userProfile);
        
        // プロフィール画像を設定
        document.getElementById('profile-image').src = window.userProfile.pictureUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0ZGQjZDMSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPuKYuTwvdGV4dD48L3N2Zz4=';
        
        // 顧客情報を読み込み
        await loadCustomerData();
        
        // 次回予約を読み込み
        await loadNextReservation();
        
        // コンテンツを表示
        document.getElementById('loading').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        
    } catch (error) {
        console.error('初期化エラー:', error);
        alert('ページの初期化に失敗しました。\n' + error.message);
    }
});

// 顧客情報を読み込み
async function loadCustomerData() {
    try {
        const response = await fetch(`/api/customers/${window.userProfile.userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.userProfile.userId}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                // 未登録の場合は登録画面へ
                alert('お客様情報が見つかりません。\n登録画面へ移動します。');
                window.location.href = './index.html';
                return;
            }
            throw new Error('顧客情報の取得に失敗しました');
        }
        
        customerData = await response.json();
        displayCustomerData();
        
    } catch (error) {
        console.error('顧客情報読み込みエラー:', error);
        alert('お客様情報の読み込みに失敗しました。');
    }
}

// 顧客情報を表示
function displayCustomerData() {
    if (!customerData) return;
    
    // プロフィール名
    document.getElementById('profile-name').textContent = customerData.real_name + ' 様';
    
    // 詳細情報
    document.getElementById('customer-name').textContent = customerData.real_name;
    document.getElementById('customer-phone').textContent = formatPhoneNumber(customerData.phone_number);
    
    // 登録日をフォーマット
    const registeredDate = new Date(customerData.registered_date);
    const dateString = `${registeredDate.getFullYear()}年${registeredDate.getMonth() + 1}月${registeredDate.getDate()}日`;
    document.getElementById('customer-registered').textContent = dateString;
}

// 電話番号をフォーマット
function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // 11桁の場合: 090-1234-5678
    if (phone.length === 11) {
        return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    // 10桁の場合: 03-1234-5678
    if (phone.length === 10) {
        return phone.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    
    return phone;
}

// 次回予約を読み込み
async function loadNextReservation() {
    try {
        const response = await fetch(`/api/reservations/current/${window.userProfile.userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.userProfile.userId}`
            }
        });
        
        if (!response.ok) {
            throw new Error('予約情報の取得に失敗しました');
        }
        
        nextReservation = await response.json();
        
        if (nextReservation && nextReservation.reservation_date) {
            displayNextReservation();
        }
        
    } catch (error) {
        console.error('予約読み込みエラー:', error);
    }
}

// 次回予約を表示
function displayNextReservation() {
    if (!nextReservation) return;
    
    const section = document.getElementById('next-reservation-section');
    const container = document.getElementById('next-reservation');
    
    const date = new Date(nextReservation.reservation_date);
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const dateString = `${date.getMonth() + 1}月${date.getDate()}日(${dayOfWeek})`;
    const timeString = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    container.innerHTML = `
        <div class="reservation-date">${dateString} ${timeString}</div>
        <div class="reservation-details">
            メニュー: ${nextReservation.menu_name}<br>
            担当: ${nextReservation.staff_name}<br>
            所要時間: ${nextReservation.duration}分
        </div>
    `;
    
    section.style.display = 'block';
}

// プロフィール編集
function editProfile() {
    if (!customerData) return;
    
    // フォームに現在の値を設定
    document.getElementById('edit-name').value = customerData.real_name;
    document.getElementById('edit-phone').value = customerData.phone_number;
    
    // モーダルを表示
    document.getElementById('edit-modal').style.display = 'flex';
}

// 編集モーダルを閉じる
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

// プロフィールを保存
async function saveProfile() {
    const name = document.getElementById('edit-name').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    
    // バリデーション
    if (!name || name.length < 2 || name.length > 20) {
        alert('お名前は2文字以上20文字以内で入力してください');
        return;
    }
    
    const phoneRegex = /^[0-9]{10,13}$/;
    if (!phone || !phoneRegex.test(phone)) {
        alert('電話番号は10〜13桁の数字で入力してください');
        return;
    }
    
    try {
        const response = await fetch(`/api/customers/${window.userProfile.userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.userProfile.userId}`
            },
            body: JSON.stringify({
                real_name: name,
                phone_number: phone
            })
        });
        
        if (!response.ok) {
            throw new Error('更新に失敗しました');
        }
        
        const updatedData = await response.json();
        customerData = updatedData;
        
        // 表示を更新
        displayCustomerData();
        
        // モーダルを閉じる
        closeEditModal();
        
        alert('お客様情報を更新しました');
        
    } catch (error) {
        console.error('更新エラー:', error);
        alert('情報の更新に失敗しました。\n' + error.message);
    }
}

// モーダルの外側をクリックで閉じる
document.addEventListener('click', function(event) {
    const modal = document.getElementById('edit-modal');
    if (event.target === modal) {
        closeEditModal();
    }
});

// エスケープキーでモーダルを閉じる
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeEditModal();
    }
});