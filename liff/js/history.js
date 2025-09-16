// history.js（完全版 - マルチテナント対応）

// グローバル変数
let allReservations = [];
let upcomingReservations = [];
let pastReservations = [];
let currentTab = 'upcoming';
let cancelTargetId = null;

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('予約履歴ページ初期化開始');
    
    try {
        // テナント管理の初期化
        const tenantInfo = TenantManager.initialize();
        
        if (!tenantInfo) {
            console.error('テナント情報が取得できません');
            alert('店舗情報が見つかりません。\nホーム画面から再度アクセスしてください。');
            window.location.href = './index.html';
            return;
        }
        
        console.log('使用するテナント:', tenantInfo.code);
        
        // LIFF初期化
        await liff.init({ liffId: '2007971454-kL9LXL2O' });
        console.log('LIFF初期化完了');
        
        // ログイン状態確認
        if (!liff.isLoggedIn()) {
            console.log('未ログイン状態');
            if (!liff.isInClient()) {
                liff.login();
                return;
            }
        }
        
        // プロフィール取得
        let profile;
        try {
            profile = await liff.getProfile();
            window.userProfile = profile;
            console.log('ユーザープロフィール:', profile);
        } catch (err) {
            console.error('プロフィール取得エラー:', err);
            alert('ユーザー情報の取得に失敗しました。');
            window.location.href = './index.html';
            return;
        }
        
        // 予約履歴を読み込み
        await loadReservations();
        
        // コンテンツを表示
        document.getElementById('loading').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        
    } catch (error) {
        console.error('初期化エラー:', error);
        alert('ページの初期化に失敗しました。\n' + error.message);
        window.location.href = './index.html';
    }
});

// 予約履歴を読み込み
async function loadReservations() {
    try {
        const tenantCode = TenantManager.getTenantCode();
        if (!tenantCode) {
            throw new Error('テナントコードが取得できません');
        }
        
        // customer_idとしてline_user_idを使用
        const userId = window.userProfile.userId;
        console.log('予約履歴取得 - ユーザーID:', userId);
        
        const response = await fetch(`/api/reservations/user/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-Code': tenantCode
            }
        });
        
        console.log('APIレスポンス:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('APIエラー:', errorText);
            throw new Error('予約履歴の取得に失敗しました');
        }
        
        allReservations = await response.json();
        console.log('取得した予約:', allReservations);
        
        // 現在時刻で分類（JSTで比較）
        const now = new Date();
        upcomingReservations = [];
        pastReservations = [];
        
        allReservations.forEach(reservation => {
            // UTC時間をJSTに変換して比較
            const reservationDate = new Date(reservation.reservation_date);
            if (!reservation.reservation_date.includes('+')) {
                reservationDate.setHours(reservationDate.getHours() + 9);
            }
            
            if (reservationDate > now && reservation.status === 'confirmed') {
                upcomingReservations.push(reservation);
            } else {
                pastReservations.push(reservation);
            }
        });
        
        // 日付でソート
        upcomingReservations.sort((a, b) => new Date(a.reservation_date) - new Date(b.reservation_date));
        pastReservations.sort((a, b) => new Date(b.reservation_date) - new Date(a.reservation_date));
        
        // カウントを更新
        document.getElementById('upcoming-count').textContent = upcomingReservations.length;
        document.getElementById('past-count').textContent = pastReservations.length;
        
        // 表示
        displayUpcomingReservations();
        calculateStats();
        
    } catch (error) {
        console.error('予約履歴読み込みエラー:', error);
        // エラーでも画面は表示（空の状態）
        displayUpcomingReservations();
        calculateStats();
    }
}

// 今後の予約を表示
function displayUpcomingReservations() {
    const listContainer = document.getElementById('upcoming-list');
    const emptyState = document.getElementById('no-upcoming');
    
    if (upcomingReservations.length === 0) {
        listContainer.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    listContainer.innerHTML = '';
    
    upcomingReservations.forEach(reservation => {
        const card = createReservationCard(reservation, false);
        listContainer.appendChild(card);
    });
}

// 過去の履歴を表示
function displayPastReservations() {
    const listContainer = document.getElementById('past-list');
    const emptyState = document.getElementById('no-past');
    
    if (pastReservations.length === 0) {
        listContainer.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    listContainer.innerHTML = '';
    
    pastReservations.forEach(reservation => {
        const card = createReservationCard(reservation, true);
        listContainer.appendChild(card);
    });
}

// 予約カードを作成
function createReservationCard(reservation, isPast) {
    const card = document.createElement('div');
    card.className = `reservation-card ${isPast ? 'past' : ''} ${reservation.status === 'cancelled' ? 'cancelled' : ''}`;
    
    // UTC時間をJSTに変換（+9時間）
    const date = new Date(reservation.reservation_date);
    // PostgreSQLからの日時がUTCの場合、JSTに変換
    if (!reservation.reservation_date.includes('+')) {
        date.setHours(date.getHours() + 9);
    }
    
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const dateString = `${date.getMonth() + 1}月${date.getDate()}日(${dayOfWeek})`;
    const timeString = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    // ステータス表示
    let statusBadge = '';
    if (reservation.status === 'cancelled') {
        statusBadge = '<span class="status-badge cancelled">キャンセル済</span>';
    } else if (isPast) {
        statusBadge = '<span class="status-badge completed">完了</span>';
    } else {
        statusBadge = '<span class="status-badge confirmed">予約確定</span>';
    }
    
    // 価格とメニュー名の安全な取得
    const menuName = reservation.menu_name || 'メニュー情報なし';
    const staffName = reservation.staff_name || 'スタッフ未定';
    const price = reservation.price || 0;
    const duration = reservation.duration || 60;
    
    card.innerHTML = `
        ${statusBadge}
        <div class="reservation-date">${dateString}</div>
        <div class="reservation-time">${timeString}</div>
        <div class="reservation-details">
            <div class="detail-row">
                <span class="detail-label">メニュー</span>
                <span class="detail-value">${menuName}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">担当</span>
                <span class="detail-value">${staffName}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">料金</span>
                <span class="detail-value">¥${price.toLocaleString()}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">所要時間</span>
                <span class="detail-value">${duration}分</span>
            </div>
        </div>
        ${createCardActions(reservation, isPast)}
    `;
    
    return card;
}

// カードアクションを作成
function createCardActions(reservation, isPast) {
    if (reservation.status === 'cancelled') {
        return ''; // キャンセル済みはアクションなし
    }
    
    if (isPast) {
        // 過去の予約：再予約ボタン
        return `
            <div class="card-actions">
                <button class="btn-rebook" onclick="rebookReservation(${reservation.reservation_id})">
                    もう一度予約する
                </button>
            </div>
        `;
    } else {
        // 今後の予約：キャンセルボタン
        const reservationDate = new Date(reservation.reservation_date);
        const now = new Date();
        const hoursDiff = (reservationDate - now) / (1000 * 60 * 60);
        
        // 24時間前まではキャンセル可能
        if (hoursDiff > 24) {
            return `
                <div class="card-actions">
                    <button class="btn-cancel" onclick="openCancelModal(${reservation.reservation_id})">
                        キャンセル
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="card-actions">
                    <p style="color: #999; font-size: 12px;">※24時間前を過ぎたためキャンセルできません</p>
                </div>
            `;
        }
    }
}

// タブ切り替え
function switchTab(tab) {
    currentTab = tab;
    
    // タブのアクティブ状態を更新
    document.querySelectorAll('.history-tab').forEach(t => {
        t.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // セクションの表示切り替え
    if (tab === 'upcoming') {
        document.getElementById('upcoming-reservations').style.display = 'block';
        document.getElementById('past-reservations').style.display = 'none';
        document.getElementById('stats-section').style.display = 'none';
        displayUpcomingReservations();
    } else {
        document.getElementById('upcoming-reservations').style.display = 'none';
        document.getElementById('past-reservations').style.display = 'block';
        document.getElementById('stats-section').style.display = 'block';
        displayPastReservations();
    }
}

// 統計を計算
function calculateStats() {
    // 完了した予約のみカウント
    const completedReservations = allReservations.filter(r => 
        r.status === 'confirmed' && new Date(r.reservation_date) < new Date()
    );
    
    // 総来店回数
    document.getElementById('total-visits').textContent = completedReservations.length;
    
    // よく利用するメニュー
    const menuCounts = {};
    completedReservations.forEach(r => {
        if (r.menu_name) {
            menuCounts[r.menu_name] = (menuCounts[r.menu_name] || 0) + 1;
        }
    });
    const favoriteMenu = Object.keys(menuCounts).sort((a, b) => menuCounts[b] - menuCounts[a])[0];
    document.getElementById('favorite-menu').textContent = favoriteMenu || '-';
    
    // 担当スタッフ
    const staffCounts = {};
    completedReservations.forEach(r => {
        if (r.staff_name) {
            staffCounts[r.staff_name] = (staffCounts[r.staff_name] || 0) + 1;
        }
    });
    const favoriteStaff = Object.keys(staffCounts).sort((a, b) => staffCounts[b] - staffCounts[a])[0];
    document.getElementById('favorite-staff').textContent = favoriteStaff || '-';
    
    // 累計金額
    const totalAmount = completedReservations.reduce((sum, r) => sum + (r.price || 0), 0);
    document.getElementById('total-amount').textContent = `¥${totalAmount.toLocaleString()}`;
}

// キャンセルモーダルを開く
function openCancelModal(reservationId) {
    cancelTargetId = reservationId;
    const reservation = upcomingReservations.find(r => r.reservation_id === reservationId);
    
    if (!reservation) return;
    
    // UTC時間をJSTに変換
    const date = new Date(reservation.reservation_date);
    if (!reservation.reservation_date.includes('+')) {
        date.setHours(date.getHours() + 9);
    }
    
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const dateString = `${date.getMonth() + 1}月${date.getDate()}日(${dayOfWeek})`;
    const timeString = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    document.getElementById('cancel-reservation-info').innerHTML = `
        <div class="detail-row">
            <span class="detail-label">日時</span>
            <span class="detail-value">${dateString} ${timeString}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">メニュー</span>
            <span class="detail-value">${reservation.menu_name || 'メニュー情報なし'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">担当</span>
            <span class="detail-value">${reservation.staff_name || 'スタッフ未定'}</span>
        </div>
    `;
    
    document.getElementById('cancel-modal').style.display = 'flex';
}

// キャンセルモーダルを閉じる
function closeCancelModal() {
    document.getElementById('cancel-modal').style.display = 'none';
    cancelTargetId = null;
}

// キャンセルを確定
async function confirmCancel() {
    if (!cancelTargetId) return;
    
    const confirmButton = event.target;
    confirmButton.disabled = true;
    confirmButton.textContent = 'キャンセル中...';
    
    try {
        const tenantCode = TenantManager.getTenantCode();
        
        const response = await fetch(`/api/reservations/${cancelTargetId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-Code': tenantCode
            }
        });
        
        if (!response.ok) {
            throw new Error('キャンセルに失敗しました');
        }
        
        alert('予約をキャンセルしました');
        closeCancelModal();
        
        // リロード
        await loadReservations();
        
        // LINE通知（LINEアプリ内の場合）
        if (liff.isInClient && liff.isInClient()) {
            const reservation = upcomingReservations.find(r => r.reservation_id === cancelTargetId);
            if (reservation) {
                const date = new Date(reservation.reservation_date);
                const dateString = `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                
                try {
                    await liff.sendMessages([{
                        type: 'text',
                        text: `❌ 予約をキャンセルしました\n\n日時: ${dateString}\nメニュー: ${reservation.menu_name || 'メニュー情報なし'}`
                    }]);
                } catch (error) {
                    console.error('LINE通知エラー:', error);
                }
            }
        }
        
    } catch (error) {
        console.error('キャンセルエラー:', error);
        alert('予約のキャンセルに失敗しました。\n' + error.message);
        confirmButton.disabled = false;
        confirmButton.textContent = 'キャンセルする';
    }
}

// 再予約
function rebookReservation(reservationId) {
    const reservation = pastReservations.find(r => r.reservation_id === reservationId);
    if (!reservation) return;
    
    // メニュー情報をセッションストレージに保存
    sessionStorage.setItem('rebookMenu', JSON.stringify({
        menu_id: reservation.menu_id,
        menu_name: reservation.menu_name || 'メニュー情報なし',
        staff_id: reservation.staff_id,
        staff_name: reservation.staff_name || 'スタッフ未定'
    }));
    
    // 予約ページへ
    window.location.href = './reservation.html';
}

// モーダルの外側クリックで閉じる
document.addEventListener('click', function(event) {
    const modal = document.getElementById('cancel-modal');
    if (event.target === modal) {
        closeCancelModal();
    }
});

// グローバル関数として公開
window.switchTab = switchTab;
window.openCancelModal = openCancelModal;
window.closeCancelModal = closeCancelModal;
window.confirmCancel = confirmCancel;
window.rebookReservation = rebookReservation;