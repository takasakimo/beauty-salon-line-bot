// reservation.js（完全版 - 予約送信エラー修正）

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('予約ページ初期化開始');
    
    try {
        // テナント管理の初期化
        const tenantInfo = TenantManager.initialize();
        
        if (!tenantInfo) {
            console.error('テナント情報が取得できません');
            showError('店舗情報が見つかりません。ホーム画面から再度アクセスしてください。');
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
        
        // プロフィール取得してグローバルに保存
        try {
            const profile = await liff.getProfile();
            window.userProfile = profile;
            console.log('ユーザープロフィール取得:', profile);
        } catch (err) {
            console.error('プロフィール取得エラー:', err);
        }
        
        // メニューとスタッフのロード
        await loadMenus();
        await loadStaff();
        
    } catch (error) {
        console.error('初期化エラー:', error);
        showError('初期化中にエラーが発生しました: ' + error.message);
    }
});

// エラー表示
function showError(message) {
    const menuList = document.getElementById('menu-list');
    if (menuList) {
        menuList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: red;">
                <p>${message}</p>
                <button onclick="window.location.href='index.html'" 
                        style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; margin-top: 20px;">
                    ホームに戻る
                </button>
            </div>
        `;
    }
}

// メニュー一覧を読み込む
async function loadMenus() {
    console.log('メニュー読み込み開始');
    
    const menuList = document.getElementById('menu-list');
    if (!menuList) {
        console.error('menu-list要素が見つかりません');
        return;
    }
    
    try {
        const tenantCode = TenantManager.getTenantCode();
        if (!tenantCode) {
            throw new Error('テナントコードが取得できません');
        }
        
        console.log('API呼び出し: /api/menus, テナント:', tenantCode);
        
        const response = await fetch('/api/menus', {
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
            throw new Error(`メニュー取得エラー: ${response.status}`);
        }
        
        const menus = await response.json();
        console.log('取得したメニュー:', menus);
        
        if (!menus || menus.length === 0) {
            menuList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">メニューが登録されていません</p>';
            return;
        }
        
        // メニューを表示
        menuList.innerHTML = menus.map(menu => `
            <div class="menu-item" data-menu-id="${menu.menu_id}" data-price="${menu.price}">
                <h3>${menu.name}</h3>
                <p class="duration">施術時間: ${menu.duration}分</p>
                <p class="price">¥${Number(menu.price).toLocaleString()}</p>
                <button onclick="selectMenu(${menu.menu_id}, '${menu.name.replace(/'/g, "\\'")}', ${menu.duration}, ${menu.price})" 
                        class="select-btn">選択</button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('メニュー読み込みエラー:', error);
        menuList.innerHTML = `
            <p style="color: red; text-align: center; padding: 20px;">
                メニューの読み込みに失敗しました<br>
                ${error.message}
            </p>
        `;
    }
}

// スタッフ一覧を読み込む
async function loadStaff() {
    console.log('スタッフ読み込み開始');
    
    const staffList = document.getElementById('staff-list');
    if (!staffList) {
        console.error('staff-list要素が見つかりません');
        return;
    }
    
    try {
        const tenantCode = TenantManager.getTenantCode();
        if (!tenantCode) {
            throw new Error('テナントコードが取得できません');
        }
        
        console.log('API呼び出し: /api/staff, テナント:', tenantCode);
        
        const response = await fetch('/api/staff', {
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
            throw new Error(`スタッフ取得エラー: ${response.status}`);
        }
        
        const staff = await response.json();
        console.log('取得したスタッフ:', staff);
        
        if (!staff || staff.length === 0) {
            staffList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">スタッフが登録されていません</p>';
            return;
        }
        
        // スタッフを表示
        staffList.innerHTML = staff.map(s => `
            <div class="staff-item" data-staff-id="${s.staff_id}">
                <h3>${s.name}</h3>
                <p class="role">${s.role || 'スタッフ'}</p>
                <button onclick="selectStaff(${s.staff_id}, '${s.name.replace(/'/g, "\\'")}')" 
                        class="select-btn">選択</button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('スタッフ読み込みエラー:', error);
        staffList.innerHTML = `
            <p style="color: red; text-align: center; padding: 20px;">
                スタッフの読み込みに失敗しました<br>
                ${error.message}
            </p>
        `;
    }
}

// メニュー選択
function selectMenu(menuId, menuName, duration, price) {
    console.log('メニュー選択:', menuId, menuName, duration, price);
    
    // 選択状態を保存
    sessionStorage.setItem('selectedMenu', JSON.stringify({
        id: menuId,
        name: menuName,
        duration: duration,
        price: price
    }));
    
    // UIを更新
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('selected');
    });
    const selectedItem = document.querySelector(`[data-menu-id="${menuId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // ステップインジケーターを更新
    document.getElementById('step-1-indicator').classList.add('active');
    document.getElementById('step-2-indicator').classList.add('active');
    
    // 次のステップを表示
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    window.scrollTo(0, 0);
}

// スタッフ選択
function selectStaff(staffId, staffName) {
    console.log('スタッフ選択:', staffId, staffName);
    
    // 選択状態を保存
    sessionStorage.setItem('selectedStaff', JSON.stringify({
        id: staffId,
        name: staffName
    }));
    
    // UIを更新
    document.querySelectorAll('.staff-item').forEach(item => {
        item.classList.remove('selected');
    });
    const selectedItem = document.querySelector(`[data-staff-id="${staffId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // ステップインジケーターを更新
    document.getElementById('step-3-indicator').classList.add('active');
    
    // 次のステップを表示
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'block';
    window.scrollTo(0, 0);
    
    // カレンダーを初期化
    initCalendar();
}

// カレンダー初期化
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    let calendarHtml = `<h3>${year}年${month + 1}月</h3>`;
    calendarHtml += '<div class="calendar-grid">';
    
    // 曜日ヘッダー
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    weekDays.forEach(day => {
        calendarHtml += `<div class="calendar-header">${day}</div>`;
    });
    
    // 日付
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    
    // 空白を埋める
    for (let i = 0; i < startDay; i++) {
        calendarHtml += '<div class="calendar-day empty"></div>';
    }
    
    // 日付を表示
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = date.toDateString() === today.toDateString();
        const isPast = date < today && !isToday;
        
        if (isPast) {
            calendarHtml += `<div class="calendar-day disabled">${day}</div>`;
        } else {
            calendarHtml += `<div class="calendar-day available" onclick="selectDate('${dateStr}', ${day})">${day}</div>`;
        }
    }
    
    calendarHtml += '</div>';
    calendarEl.innerHTML = calendarHtml;
}

// 日付選択
function selectDate(dateStr, day) {
    console.log('日付選択:', dateStr);
    
    sessionStorage.setItem('selectedDate', dateStr);
    
    // 選択状態を表示
    document.querySelectorAll('.calendar-day').forEach(dayEl => {
        dayEl.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    // 時間選択を表示
    document.getElementById('time-selection').style.display = 'block';
    generateTimeSlots();
}

// 時間スロット生成
function generateTimeSlots() {
    const timeSlotsEl = document.getElementById('time-slots');
    if (!timeSlotsEl) return;
    
    const slots = [];
    for (let hour = 10; hour <= 18; hour++) {
        slots.push(`${hour}:00`);
        if (hour < 18) {
            slots.push(`${hour}:30`);
        }
    }
    
    timeSlotsEl.innerHTML = slots.map(time => `
        <button class="time-slot" onclick="selectTime('${time}')">${time}</button>
    `).join('');
}

// 時間選択
function selectTime(time) {
    console.log('時間選択:', time);
    
    sessionStorage.setItem('selectedTime', time);
    
    // 選択状態を表示
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    // ステップインジケーターを更新
    document.getElementById('step-4-indicator').classList.add('active');
    
    // 確認画面を表示
    showConfirmation();
}

// 確認画面表示
function showConfirmation() {
    const menu = JSON.parse(sessionStorage.getItem('selectedMenu'));
    const staff = JSON.parse(sessionStorage.getItem('selectedStaff'));
    const date = sessionStorage.getItem('selectedDate');
    const time = sessionStorage.getItem('selectedTime');
    
    // 確認画面の値を設定
    document.getElementById('confirm-menu').textContent = menu.name;
    document.getElementById('confirm-staff').textContent = staff.name;
    document.getElementById('confirm-datetime').textContent = `${date} ${time}`;
    document.getElementById('confirm-price').textContent = `¥${Number(menu.price).toLocaleString()}`;
    
    // 確認画面を表示
    document.getElementById('step3').style.display = 'none';
    document.getElementById('step4').style.display = 'block';
    window.scrollTo(0, 0);
}

// 予約送信（修正版）
async function submitReservation() {
    console.log('予約送信開始');
    
    // ボタンを無効化（二重送信防止）
    const submitBtn = event.target;
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';
    
    try {
        const menu = JSON.parse(sessionStorage.getItem('selectedMenu'));
        const staff = JSON.parse(sessionStorage.getItem('selectedStaff'));
        const date = sessionStorage.getItem('selectedDate');
        const time = sessionStorage.getItem('selectedTime');
        const tenantCode = TenantManager.getTenantCode();
        
        // プロフィール情報を取得
        let lineUserId, customerName;
        
        // まずwindow.userProfileを確認
        if (window.userProfile && window.userProfile.userId) {
            lineUserId = window.userProfile.userId;
            customerName = window.userProfile.displayName;
            console.log('既存のプロフィール使用:', window.userProfile);
        } else {
            // なければLIFFから再取得
            try {
                const profile = await liff.getProfile();
                lineUserId = profile.userId;
                customerName = profile.displayName;
                window.userProfile = profile;
                console.log('プロフィール再取得:', profile);
            } catch (err) {
                console.error('プロフィール取得エラー:', err);
                // フォールバック
                lineUserId = localStorage.getItem('line_user_id') || 'unknown_' + Date.now();
                customerName = 'ゲスト';
            }
        }
        
        const reservationData = {
            line_user_id: lineUserId,
            customer_name: customerName,
            menu_id: menu.id,
            staff_id: staff.id,
            reservation_date: `${date} ${time}:00`,
            status: 'confirmed'
        };
        
        console.log('送信する予約データ:', reservationData);
        
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-Code': tenantCode
            },
            body: JSON.stringify(reservationData)
        });
        
        console.log('レスポンスステータス:', response.status);
        
        const responseData = await response.json();
        console.log('レスポンスデータ:', responseData);
        
        if (!response.ok) {
            throw new Error(responseData.details || responseData.error || '予約の送信に失敗しました');
        }
        
        console.log('予約完了:', responseData);
        
        // 完了画面を表示
        document.getElementById('step4').style.display = 'none';
        document.getElementById('step-complete').style.display = 'block';
        window.scrollTo(0, 0);
        
        // セッションストレージをクリア
        sessionStorage.clear();
        
    } catch (error) {
        console.error('予約送信エラー:', error);
        alert(`予約の送信に失敗しました。\n\nエラー: ${error.message}\n\nもう一度お試しください。`);
        
        // ボタンを再度有効化
        submitBtn.disabled = false;
        submitBtn.textContent = '予約を確定する';
    }
}

// デバッグ用
window.debugReservation = function() {
    console.log('=== デバッグ情報 ===');
    console.log('テナントコード:', TenantManager.getTenantCode());
    console.log('テナント情報:', TenantManager.currentTenant);
    console.log('ユーザープロフィール:', window.userProfile);
    console.log('LocalStorage:', {
        tenant_info: localStorage.getItem('tenant_info'),
        line_user_id: localStorage.getItem('line_user_id')
    });
    console.log('SessionStorage:', {
        menu: sessionStorage.getItem('selectedMenu'),
        staff: sessionStorage.getItem('selectedStaff'),
        date: sessionStorage.getItem('selectedDate'),
        time: sessionStorage.getItem('selectedTime')
    });
};

// グローバル関数として公開
window.selectMenu = selectMenu;
window.selectStaff = selectStaff;
window.selectDate = selectDate;
window.selectTime = selectTime;
window.submitReservation = submitReservation;