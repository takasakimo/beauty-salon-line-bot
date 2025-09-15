// reservation.js（完全版）

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('予約ページ初期化開始');
    
    try {
        // テナント管理の初期化
        const tenantInfo = TenantManager.initialize();
        
        if (!tenantInfo) {
            console.error('テナント情報が取得できません');
            // エラー表示
            document.body.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h2 style="color: red;">店舗情報が見つかりません</h2>
                    <p>ホーム画面から再度アクセスしてください。</p>
                    <button onclick="window.location.href='index.html'" 
                            style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; margin-top: 20px;">
                        ホームに戻る
                    </button>
                </div>
            `;
            return;
        }
        
        console.log('使用するテナント:', tenantInfo.code);
        
        // LIFF初期化
        await liff.init({ liffId: '2007971454-kL9LXL2O' });
        console.log('LIFF初期化完了');
        
        // メニューとスタッフのロード
        await loadMenus();
        await loadStaff();
        
        // デバッグ情報の表示
        const debugInfo = document.getElementById('debug-info');
        if (debugInfo) {
            debugInfo.textContent = `テナント: ${tenantInfo.code}`;
        }
        
    } catch (error) {
        console.error('初期化エラー:', error);
        alert('初期化中にエラーが発生しました: ' + error.message);
    }
});

// メニュー一覧を読み込む
async function loadMenus() {
    console.log('メニュー読み込み開始');
    
    try {
        const tenantCode = TenantManager.getTenantCode();
        if (!tenantCode) {
            throw new Error('テナントコードが取得できません');
        }
        
        const response = await fetch('/api/menus', {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-Code': tenantCode
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const menus = await response.json();
        console.log('取得したメニュー:', menus);
        
        const menuList = document.getElementById('menu-list');
        if (!menuList) {
            console.error('menu-list要素が見つかりません');
            return;
        }
        
        if (menus.length === 0) {
            menuList.innerHTML = '<p style="text-align: center; color: #999;">メニューがありません</p>';
            return;
        }
        
        menuList.innerHTML = menus.map(menu => `
            <div class="menu-item" data-menu-id="${menu.menu_id}">
                <h3>${menu.name}</h3>
                <p class="duration">施術時間: ${menu.duration}分</p>
                <p class="price">¥${Number(menu.price).toLocaleString()}</p>
                <button onclick="selectMenu(${menu.menu_id}, '${menu.name}', ${menu.duration})" 
                        class="select-btn">選択</button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('メニュー読み込みエラー:', error);
        const menuList = document.getElementById('menu-list');
        if (menuList) {
            menuList.innerHTML = `<p style="color: red; text-align: center;">メニューの読み込みに失敗しました: ${error.message}</p>`;
        }
    }
}

// スタッフ一覧を読み込む
async function loadStaff() {
    console.log('スタッフ読み込み開始');
    
    try {
        const tenantCode = TenantManager.getTenantCode();
        if (!tenantCode) {
            throw new Error('テナントコードが取得できません');
        }
        
        const response = await fetch('/api/staff', {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-Code': tenantCode
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const staff = await response.json();
        console.log('取得したスタッフ:', staff);
        
        const staffList = document.getElementById('staff-list');
        if (!staffList) {
            console.error('staff-list要素が見つかりません');
            return;
        }
        
        if (staff.length === 0) {
            staffList.innerHTML = '<p style="text-align: center; color: #999;">スタッフがいません</p>';
            return;
        }
        
        staffList.innerHTML = staff.map(s => `
            <div class="staff-item" data-staff-id="${s.staff_id}">
                <h3>${s.name}</h3>
                <p>${s.role || 'スタッフ'}</p>
                <button onclick="selectStaff(${s.staff_id}, '${s.name}')" 
                        class="select-btn">選択</button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('スタッフ読み込みエラー:', error);
        const staffList = document.getElementById('staff-list');
        if (staffList) {
            staffList.innerHTML = `<p style="color: red; text-align: center;">スタッフの読み込みに失敗しました: ${error.message}</p>`;
        }
    }
}

// メニュー選択
function selectMenu(menuId, menuName, duration) {
    console.log('メニュー選択:', menuId, menuName, duration);
    
    // 選択状態を保存
    sessionStorage.setItem('selectedMenu', JSON.stringify({
        id: menuId,
        name: menuName,
        duration: duration
    }));
    
    // UIを更新
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.querySelector(`[data-menu-id="${menuId}"]`).classList.add('selected');
    
    // 次のステップを有効化
    document.getElementById('step2').style.display = 'block';
    document.getElementById('step2').scrollIntoView({ behavior: 'smooth' });
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
    document.querySelector(`[data-staff-id="${staffId}"]`).classList.add('selected');
    
    // 次のステップを有効化
    document.getElementById('step3').style.display = 'block';
    document.getElementById('step3').scrollIntoView({ behavior: 'smooth' });
    
    // カレンダーを初期化
    initCalendar();
}

// カレンダー初期化
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    
    // 簡易カレンダーの実装
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // カレンダーHTMLを生成
    let calendarHtml = '<h3>' + year + '年' + (month + 1) + '月</h3>';
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
        const isToday = date.toDateString() === today.toDateString();
        const isPast = date < today;
        
        if (isPast && !isToday) {
            calendarHtml += `<div class="calendar-day disabled">${day}</div>`;
        } else {
            calendarHtml += `<div class="calendar-day available" onclick="selectDate('${date.toISOString().split('T')[0]}')">${day}</div>`;
        }
    }
    
    calendarHtml += '</div>';
    calendarEl.innerHTML = calendarHtml;
}

// 日付選択
function selectDate(date) {
    console.log('日付選択:', date);
    
    sessionStorage.setItem('selectedDate', date);
    
    // 選択状態を表示
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    // 時間選択を表示
    document.getElementById('step4').style.display = 'block';
    document.getElementById('step4').scrollIntoView({ behavior: 'smooth' });
    
    // 時間スロットを生成
    generateTimeSlots();
}

// 時間スロット生成
function generateTimeSlots() {
    const timeSlotsEl = document.getElementById('time-slots');
    if (!timeSlotsEl) return;
    
    const slots = [];
    for (let hour = 10; hour <= 18; hour++) {
        slots.push(`${hour}:00`);
        slots.push(`${hour}:30`);
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
    
    // 確認画面を表示
    showConfirmation();
}

// 確認画面表示
function showConfirmation() {
    const menu = JSON.parse(sessionStorage.getItem('selectedMenu'));
    const staff = JSON.parse(sessionStorage.getItem('selectedStaff'));
    const date = sessionStorage.getItem('selectedDate');
    const time = sessionStorage.getItem('selectedTime');
    
    const confirmationEl = document.getElementById('confirmation');
    if (!confirmationEl) return;
    
    confirmationEl.innerHTML = `
        <h3>予約内容の確認</h3>
        <div class="confirmation-details">
            <p><strong>メニュー:</strong> ${menu.name}</p>
            <p><strong>スタッフ:</strong> ${staff.name}</p>
            <p><strong>日付:</strong> ${date}</p>
            <p><strong>時間:</strong> ${time}</p>
        </div>
        <button onclick="submitReservation()" class="submit-btn">この内容で予約する</button>
    `;
    
    confirmationEl.style.display = 'block';
    confirmationEl.scrollIntoView({ behavior: 'smooth' });
}

// 予約送信
async function submitReservation() {
    console.log('予約送信開始');
    
    try {
        const menu = JSON.parse(sessionStorage.getItem('selectedMenu'));
        const staff = JSON.parse(sessionStorage.getItem('selectedStaff'));
        const date = sessionStorage.getItem('selectedDate');
        const time = sessionStorage.getItem('selectedTime');
        const tenantCode = TenantManager.getTenantCode();
        
        // LIFFからユーザー情報を取得
        const profile = await liff.getProfile();
        
        const reservationData = {
            customerId: profile.userId,
            customerName: profile.displayName,
            menuId: menu.id,
            staffId: staff.id,
            date: date,
            time: time
        };
        
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-Code': tenantCode
            },
            body: JSON.stringify(reservationData)
        });
        
        if (!response.ok) {
            throw new Error('予約の送信に失敗しました');
        }
        
        const result = await response.json();
        console.log('予約完了:', result);
        
        // 成功メッセージ
        alert('予約が完了しました！');
        
        // セッションストレージをクリア
        sessionStorage.clear();
        
        // ホームに戻る
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('予約送信エラー:', error);
        alert('予約の送信に失敗しました: ' + error.message);
    }
}

// デバッグ用
window.debugReservation = function() {
    console.log('=== デバッグ情報 ===');
    console.log('テナントコード:', TenantManager.getTenantCode());
    console.log('テナント情報:', TenantManager.currentTenant);
    console.log('LocalStorage:', localStorage.getItem('tenant_info'));
    console.log('SessionStorage:', {
        menu: sessionStorage.getItem('selectedMenu'),
        staff: sessionStorage.getItem('selectedStaff'),
        date: sessionStorage.getItem('selectedDate'),
        time: sessionStorage.getItem('selectedTime')
    });
};