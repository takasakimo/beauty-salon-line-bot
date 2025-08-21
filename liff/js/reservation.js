// 予約情報を保持するオブジェクト
let reservationData = {
    menu_id: null,
    menu_name: null,
    menu_price: null,
    menu_duration: null,
    staff_id: null,
    staff_name: null,
    reservation_date: null,
    reservation_time: null
};

// 現在のステップ
let currentStep = 1;

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async function() {
    // LIFF初期化を待つ
    setTimeout(async () => {
        if (typeof userProfile === 'undefined' || !userProfile) {
            alert('ログイン情報が取得できませんでした。');
            window.location.href = './index.html';
            return;
        }
        
        // コンテンツを表示
        document.getElementById('loading').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        
        // メニュー一覧を読み込み
        await loadMenus();
        
        // 日付選択の最小値・最大値を設定
        setDateLimits();
    }, 1500);
});

// メニュー一覧を読み込み
async function loadMenus() {
    try {
        const menus = await MenuAPI.list();
        const menuList = document.getElementById('menu-list');
        menuList.innerHTML = '';
        
        menus.forEach(menu => {
            const menuCard = document.createElement('div');
            menuCard.className = 'menu-card';
            menuCard.innerHTML = `
                <div class="menu-name">${menu.name}</div>
                <div class="menu-details">
                    <span class="menu-duration">${menu.duration}分</span>
                    <span class="menu-price">¥${menu.price.toLocaleString()}</span>
                </div>
            `;
            menuCard.onclick = () => selectMenu(menu);
            menuList.appendChild(menuCard);
        });
    } catch (error) {
        console.error('メニュー読み込みエラー:', error);
        alert('メニューの読み込みに失敗しました。');
    }
}

// メニューを選択
function selectMenu(menu) {
    // 選択状態をクリア
    document.querySelectorAll('.menu-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 選択したカードにクラスを追加
    event.currentTarget.classList.add('selected');
    
    // 予約データを更新
    reservationData.menu_id = menu.menu_id;
    reservationData.menu_name = menu.name;
    reservationData.menu_price = menu.price;
    reservationData.menu_duration = menu.duration;
    
    // 次のステップへ
    setTimeout(() => {
        goToStep(2);
        loadStaff();
    }, 300);
}

// スタッフ一覧を読み込み
async function loadStaff() {
    try {
        const staffList = await StaffAPI.list();
        const staffContainer = document.getElementById('staff-list');
        staffContainer.innerHTML = '';
        
        staffList.forEach(staff => {
            const staffCard = document.createElement('div');
            staffCard.className = 'staff-card';
            staffCard.innerHTML = `
                <div class="staff-avatar">${staff.name.charAt(0)}</div>
                <div class="staff-name">${staff.name}</div>
                <div class="staff-role">${getStaffRole(staff.staff_id)}</div>
            `;
            staffCard.onclick = () => selectStaff(staff);
            staffContainer.appendChild(staffCard);
        });
    } catch (error) {
        console.error('スタッフ読み込みエラー:', error);
        alert('スタッフ情報の読み込みに失敗しました。');
    }
}

// スタッフの役職を取得
function getStaffRole(staffId) {
    const roles = {
        1: 'チーフスタイリスト',
        2: 'スタイリスト',
        3: 'アシスタント'
    };
    return roles[staffId] || 'スタッフ';
}

// スタッフを選択
function selectStaff(staff) {
    // 選択状態をクリア
    document.querySelectorAll('.staff-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 選択したカードにクラスを追加
    event.currentTarget.classList.add('selected');
    
    // 予約データを更新
    reservationData.staff_id = staff.staff_id;
    reservationData.staff_name = staff.name;
    
    // 次のステップへ
    setTimeout(() => {
        goToStep(3);
    }, 300);
}

// 日付選択の制限を設定
function setDateLimits() {
    const dateInput = document.getElementById('reservation-date');
    const today = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2); // 2ヶ月先まで
    
    dateInput.min = formatDate(today);
    dateInput.max = formatDate(maxDate);
    
    // 日付が変更されたら時間スロットを読み込み
    dateInput.addEventListener('change', loadTimeSlots);
}

// 日付フォーマット（YYYY-MM-DD）
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 時間スロットを読み込み
async function loadTimeSlots() {
    const selectedDate = document.getElementById('reservation-date').value;
    if (!selectedDate) return;
    
    reservationData.reservation_date = selectedDate;
    
    try {
        // 空き時間を取得
        const availableSlots = await ReservationAPI.getAvailableSlots(
            selectedDate, 
            reservationData.menu_id
        );
        
        const timeSlotsContainer = document.getElementById('time-slots');
        timeSlotsContainer.innerHTML = '';
        
        // 営業時間（10:00-19:00）のスロットを生成
        const allSlots = [];
        for (let hour = 10; hour < 19; hour++) {
            allSlots.push(`${hour}:00`);
            allSlots.push(`${hour}:30`);
        }
        
        allSlots.forEach(time => {
            const slotButton = document.createElement('button');
            slotButton.className = 'time-slot';
            slotButton.textContent = time;
            
            if (availableSlots.includes(time)) {
                slotButton.onclick = () => selectTime(time);
            } else {
                slotButton.classList.add('disabled');
                slotButton.disabled = true;
            }
            
            timeSlotsContainer.appendChild(slotButton);
        });
        
        // 時間選択エリアを表示
        document.getElementById('time-selector').style.display = 'block';
    } catch (error) {
        console.error('空き時間取得エラー:', error);
        alert('空き時間の取得に失敗しました。');
    }
}

// 時間を選択
function selectTime(time) {
    // 選択状態をクリア
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // 選択したスロットにクラスを追加
    event.target.classList.add('selected');
    
    // 予約データを更新
    reservationData.reservation_time = time;
    
    // 次のステップへ
    setTimeout(() => {
        goToStep(4);
        showConfirmation();
    }, 300);
}

// 確認画面を表示
function showConfirmation() {
    const date = new Date(reservationData.reservation_date);
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const dateString = `${date.getMonth() + 1}月${date.getDate()}日(${dayOfWeek})`;
    
    document.getElementById('confirm-menu').textContent = reservationData.menu_name;
    document.getElementById('confirm-price').textContent = `¥${reservationData.menu_price.toLocaleString()}`;
    document.getElementById('confirm-duration').textContent = `${reservationData.menu_duration}分`;
    document.getElementById('confirm-staff').textContent = reservationData.staff_name;
    document.getElementById('confirm-datetime').textContent = `${dateString} ${reservationData.reservation_time}`;
}

// 予約を確定
async function confirmReservation() {
    const confirmButton = event.target;
    confirmButton.disabled = true;
    confirmButton.textContent = '予約処理中...';
    
    try {
        // 日時を結合
        const [hours, minutes] = reservationData.reservation_time.split(':');
        const reservationDateTime = new Date(reservationData.reservation_date);
        reservationDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
        
        // 予約を作成
        const result = await ReservationAPI.create({
            staff_id: reservationData.staff_id,
            menu_id: reservationData.menu_id,
            reservation_date: reservationDateTime.toISOString()
        });
        
        if (result.success) {
            // 完了画面を表示
            showCompletion();
            
            // LINE通知を送信（オプション）
            sendLineNotification();
        } else {
            throw new Error('予約の作成に失敗しました');
        }
    } catch (error) {
        console.error('予約確定エラー:', error);
        alert('予約の確定に失敗しました。もう一度お試しください。');
        confirmButton.disabled = false;
        confirmButton.textContent = '予約を確定する';
    }
}

// 完了画面を表示
function showCompletion() {
    // すべてのステップを非表示
    document.querySelectorAll('.reservation-step').forEach(step => {
        step.style.display = 'none';
    });
    
    // 完了画面を表示
    document.getElementById('completion').style.display = 'block';
    
    // 予約詳細を表示
    const date = new Date(reservationData.reservation_date);
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const dateString = `${date.getMonth() + 1}月${date.getDate()}日(${dayOfWeek})`;
    
    document.getElementById('completion-details').innerHTML = `
        <div class="confirmation-item">
            <span class="confirmation-label">メニュー：</span>
            <span>${reservationData.menu_name}</span>
        </div>
        <div class="confirmation-item">
            <span class="confirmation-label">スタッフ：</span>
            <span>${reservationData.staff_name}</span>
        </div>
        <div class="confirmation-item">
            <span class="confirmation-label">日時：</span>
            <span>${dateString} ${reservationData.reservation_time}</span>
        </div>
    `;
    
    // ステップインジケーターを非表示
    document.querySelector('.step-indicator').style.display = 'none';
}

// LINE通知を送信（オプション）
async function sendLineNotification() {
    // LIFFのsendMessagesを使用して通知
    if (liff.isInClient()) {
        try {
            await liff.sendMessages([{
                type: 'text',
                text: `✅ 予約が完了しました！\n\n【予約内容】\nメニュー: ${reservationData.menu_name}\nスタッフ: ${reservationData.staff_name}\n日時: ${reservationData.reservation_date} ${reservationData.reservation_time}\n\nご来店をお待ちしております。`
            }]);
        } catch (error) {
            console.error('LINE通知エラー:', error);
        }
    }
}

// ステップ遷移
function goToStep(stepNumber) {
    // すべてのステップを非表示
    document.querySelectorAll('.reservation-step').forEach(step => {
        step.style.display = 'none';
    });
    
    // ステップインジケーターを更新
    document.querySelectorAll('.step').forEach((step, index) => {
        if (index < stepNumber) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    // 対象のステップを表示
    const stepIds = ['', 'menu-selection', 'staff-selection', 'datetime-selection', 'confirmation'];
    document.getElementById(stepIds[stepNumber]).style.display = 'block';
    
    currentStep = stepNumber;
}