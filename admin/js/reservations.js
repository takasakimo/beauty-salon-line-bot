// 予約管理画面のJavaScript（マルチテナント対応版）

// グローバル変数
let allReservations = [];
let allCustomers = [];
let allMenus = [];
let allStaff = [];
let currentView = 'calendar';
let selectedDate = new Date();
let currentReservationId = null;

// テナント情報表示関数
function displayTenantInfo() {
    const tenantName = localStorage.getItem('tenantName') || sessionStorage.getItem('tenantName');
    const tenantCode = getTenantCode();
    
    // サイドバーのテナント名を表示
    const currentTenantEl = document.getElementById('current-tenant');
    if (currentTenantEl && tenantName) {
        currentTenantEl.textContent = tenantName;
    }
    
    // 管理者名を表示
    const adminName = localStorage.getItem('adminName') || sessionStorage.getItem('adminName');
    const adminNameEl = document.getElementById('admin-name');
    if (adminNameEl && adminName) {
        adminNameEl.textContent = adminName;
    }
    
    // メインコンテンツのテナント情報表示
    if (tenantName) {
        const tenantAlert = document.getElementById('tenant-alert');
        if (tenantAlert) {
            tenantAlert.style.display = 'block';
            document.getElementById('tenant-name-display').textContent = tenantName;
            
            const planMap = {
                'beauty-salon-001': 'Premiumプラン',
                'beauty-salon-002': 'Basicプラン',
                'beauty-salon-003': 'Basicプラン'
            };
            const planElement = document.getElementById('tenant-plan');
            if (planElement) {
                planElement.textContent = planMap[tenantCode] || 'Basicプラン';
            }
        }
    }
}

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', async function() {
    // 認証チェック
    if (!checkAuth()) {
        return;
    }
    
    // テナント情報表示
    displayTenantInfo();
    
    // 現在の日付を設定
    setToday();
    
    // 初期データ読み込み
    await loadInitialData();
    
    // 予約データ読み込み
    await loadReservations();
    
    // 現在の日付を表示
    updateCurrentDate();
});

// 初期データの読み込み
async function loadInitialData() {
    try {
        // 顧客、メニュー、スタッフデータを並行で読み込み
        const [customers, menus, staff] = await Promise.all([
            AdminAPI.get('/admin/customers'),
            AdminAPI.get('/menus'),
            AdminAPI.get('/staff')
        ]);
        
        allCustomers = customers;
        allMenus = menus;
        allStaff = staff;
        
        // ドロップダウンを更新
        updateDropdowns();
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        // デモデータを使用
        loadDemoData();
    }
}

// デモデータの読み込み（テナント別）
function loadDemoData() {
    const tenantCode = getTenantCode();
    
    // テナント別のデモデータ
    const demoData = {
        'beauty-salon-001': {
            customers: [
                { line_user_id: 'U001', real_name: '山田花子', phone_number: '090-1234-5678' },
                { line_user_id: 'U002', real_name: '田中太郎', phone_number: '080-2345-6789' },
                { line_user_id: 'U003', real_name: '鈴木美香', phone_number: '070-3456-7890' }
            ],
            menus: [
                { menu_id: 1, name: 'カット', price: 4000, duration: 60 },
                { menu_id: 2, name: 'カラー', price: 6000, duration: 90 },
                { menu_id: 6, name: 'カット+カラー', price: 9000, duration: 120 }
            ],
            staff: [
                { staff_id: 1, name: '田中美香' },
                { staff_id: 2, name: '佐藤雅子' },
                { staff_id: 3, name: '山田花子' }
            ]
        },
        'beauty-salon-002': {
            customers: [
                { line_user_id: 'U004', real_name: '高橋一郎', phone_number: '090-4567-8901' },
                { line_user_id: 'U005', real_name: '伊藤美咲', phone_number: '080-5678-9012' }
            ],
            menus: [
                { menu_id: 1, name: 'カット', price: 3500, duration: 45 },
                { menu_id: 2, name: 'カラー', price: 5500, duration: 90 }
            ],
            staff: [
                { staff_id: 1, name: '鈴木一郎' },
                { staff_id: 2, name: '高橋美咲' }
            ]
        },
        'beauty-salon-003': {
            customers: [
                { line_user_id: 'U006', real_name: '中村愛', phone_number: '070-6789-0123' },
                { line_user_id: 'U007', real_name: '小林真理', phone_number: '090-7890-1234' }
            ],
            menus: [
                { menu_id: 1, name: 'フェイシャル', price: 8000, duration: 60 },
                { menu_id: 2, name: 'ボディケア', price: 12000, duration: 90 }
            ],
            staff: [
                { staff_id: 1, name: '斎藤由美' },
                { staff_id: 2, name: '中村愛' }
            ]
        }
    };
    
    const data = demoData[tenantCode] || demoData['beauty-salon-001'];
    allCustomers = data.customers;
    allMenus = data.menus;
    allStaff = data.staff;
    
    updateDropdowns();
}

// ドロップダウンの更新
function updateDropdowns() {
    // 顧客選択
    const customerSelect = document.getElementById('customer-select');
    if (customerSelect) {
        customerSelect.innerHTML = '<option value="">選択してください</option>' +
            allCustomers.map(c => `<option value="${c.line_user_id}">${c.real_name} (${c.phone_number})</option>`).join('');
    }
    
    // メニュー選択
    const menuSelect = document.getElementById('menu-select');
    if (menuSelect) {
        menuSelect.innerHTML = '<option value="">選択してください</option>' +
            allMenus.map(m => `<option value="${m.menu_id}">${m.name} (¥${m.price.toLocaleString()} / ${m.duration}分)</option>`).join('');
    }
    
    // スタッフ選択（モーダル用）
    const staffSelect = document.getElementById('staff-select');
    if (staffSelect) {
        staffSelect.innerHTML = '<option value="">選択してください</option>' +
            allStaff.map(s => `<option value="${s.staff_id}">${s.name}</option>`).join('');
    }
    
    // スタッフフィルター
    const staffFilter = document.getElementById('staff-filter');
    if (staffFilter) {
        const currentValue = staffFilter.value;
        staffFilter.innerHTML = '<option value="all">すべてのスタッフ</option>' +
            allStaff.map(s => `<option value="${s.staff_id}">${s.name}</option>`).join('');
        staffFilter.value = currentValue;
    }
    
    // カレンダービューのスタッフカラムを更新
    updateStaffColumns();
}

// スタッフカラムの更新
function updateStaffColumns() {
    const staffColumnsContainer = document.getElementById('staff-columns');
    if (staffColumnsContainer && allStaff.length > 0) {
        staffColumnsContainer.innerHTML = allStaff.map(staff => 
            `<div class="staff-column">${staff.name}</div>`
        ).join('');
    }
}

// 予約データの読み込み
async function loadReservations() {
    try {
        const dateStr = formatDate(selectedDate);
        const reservations = await AdminAPI.get(`/admin/reservations?date=${dateStr}`);
        allReservations = reservations;
        
        if (currentView === 'calendar') {
            displayCalendarView();
        } else {
            displayListView();
        }
    } catch (error) {
        console.error('Error loading reservations:', error);
        // デモ予約データを表示
        loadDemoReservations();
    }
}

// デモ予約データ（テナント別）
function loadDemoReservations() {
    const tenantCode = getTenantCode();
    const today = formatDate(selectedDate);
    
    const demoReservations = {
        'beauty-salon-001': [
            {
                reservation_id: 1,
                customer_name: '山田花子',
                menu_name: 'カット',
                staff_name: '田中美香',
                reservation_date: `${today}T10:00:00`,
                price: 4000,
                status: 'confirmed'
            },
            {
                reservation_id: 2,
                customer_name: '田中太郎',
                menu_name: 'カット+カラー',
                staff_name: '佐藤雅子',
                reservation_date: `${today}T14:00:00`,
                price: 9000,
                status: 'confirmed'
            }
        ],
        'beauty-salon-002': [
            {
                reservation_id: 3,
                customer_name: '高橋一郎',
                menu_name: 'カット',
                staff_name: '鈴木一郎',
                reservation_date: `${today}T11:00:00`,
                price: 3500,
                status: 'confirmed'
            }
        ],
        'beauty-salon-003': [
            {
                reservation_id: 4,
                customer_name: '中村愛',
                menu_name: 'フェイシャル',
                staff_name: '斎藤由美',
                reservation_date: `${today}T13:00:00`,
                price: 8000,
                status: 'confirmed'
            }
        ]
    };
    
    allReservations = demoReservations[tenantCode] || demoReservations['beauty-salon-001'];
    
    if (currentView === 'calendar') {
        displayCalendarView();
    } else {
        displayListView();
    }
}

// カレンダービューの表示
function displayCalendarView() {
    const timeSlotsContainer = document.getElementById('time-slots');
    if (!timeSlotsContainer) return;
    
    const timeSlots = [];
    for (let hour = 10; hour < 19; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            timeSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
        }
    }
    
    let html = '';
    timeSlots.forEach(time => {
        html += `<div class="time-slot-row">`;
        html += `<div class="time-label">${time}</div>`;
        
        // 各スタッフの予約状況
        allStaff.forEach(staff => {
            const reservation = allReservations.find(r => {
                const resTime = new Date(r.reservation_date).toTimeString().slice(0, 5);
                return resTime === time && r.staff_name === staff.name;
            });
            
            if (reservation) {
                html += `
                    <div class="reservation-block" onclick="showReservationDetail(${reservation.reservation_id})">
                        <div class="reservation-customer">${reservation.customer_name}</div>
                        <div class="reservation-menu">${reservation.menu_name}</div>
                    </div>
                `;
            } else {
                html += `<div class="empty-slot" onclick="openNewReservationModalWithTime('${time}', ${staff.staff_id})">-</div>`;
            }
        });
        
        html += `</div>`;
    });
    
    timeSlotsContainer.innerHTML = html;
}

// リストビューの表示
function displayListView() {
    const tbody = document.getElementById('reservation-list');
    if (!tbody) return;
    
    // フィルタリング
    const statusFilter = document.getElementById('status-filter').value;
    const staffFilter = document.getElementById('staff-filter').value;
    
    let filteredReservations = allReservations;
    
    if (statusFilter !== 'all') {
        filteredReservations = filteredReservations.filter(r => r.status === statusFilter);
    }
    
    if (staffFilter !== 'all') {
        filteredReservations = filteredReservations.filter(r => {
            const staff = allStaff.find(s => s.name === r.staff_name);
            return staff && staff.staff_id == staffFilter;
        });
    }
    
    if (filteredReservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">予約データがありません</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredReservations.map(reservation => {
        const dateTime = new Date(reservation.reservation_date);
        const dateStr = dateTime.toLocaleDateString('ja-JP');
        const timeStr = dateTime.toTimeString().slice(0, 5);
        const statusClass = getStatusClass(reservation.status);
        const statusText = getStatusText(reservation.status);
        
        return `
            <tr>
                <td>#${reservation.reservation_id}</td>
                <td>${dateStr} ${timeStr}</td>
                <td>${reservation.customer_name || '-'}</td>
                <td>${reservation.menu_name}</td>
                <td>${reservation.staff_name}</td>
                <td>¥${reservation.price.toLocaleString()}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-action" onclick="showReservationDetail(${reservation.reservation_id})">
                        詳細
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ビュー切り替え
function switchView(view) {
    currentView = view;
    
    // ボタンのアクティブ状態を更新
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // ビューの表示切り替え
    document.getElementById('calendar-view').style.display = view === 'calendar' ? 'block' : 'none';
    document.getElementById('list-view').style.display = view === 'list' ? 'block' : 'none';
    
    // データを再表示
    if (view === 'calendar') {
        displayCalendarView();
    } else {
        displayListView();
    }
}

// 日付ナビゲーション
function previousDate() {
    selectedDate.setDate(selectedDate.getDate() - 1);
    document.getElementById('selected-date').value = formatDate(selectedDate);
    loadReservations();
}

function nextDate() {
    selectedDate.setDate(selectedDate.getDate() + 1);
    document.getElementById('selected-date').value = formatDate(selectedDate);
    loadReservations();
}

function goToToday() {
    selectedDate = new Date();
    setToday();
    loadReservations();
}

function setToday() {
    document.getElementById('selected-date').value = formatDate(selectedDate);
}

// フィルター処理
function filterReservations() {
    if (currentView === 'list') {
        displayListView();
    }
}

// 新規予約モーダル
function openNewReservationModal() {
    document.getElementById('new-reservation-modal').style.display = 'flex';
    
    // 時間選択肢を生成
    const timeSelect = document.getElementById('reservation-time');
    const times = [];
    for (let hour = 10; hour < 19; hour++) {
        times.push(`${hour.toString().padStart(2, '0')}:00`);
        times.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    timeSelect.innerHTML = '<option value="">選択してください</option>' +
        times.map(t => `<option value="${t}">${t}</option>`).join('');
    
    // 日付を今日に設定
    document.getElementById('reservation-date').value = formatDate(selectedDate);
}

function openNewReservationModalWithTime(time, staffId) {
    openNewReservationModal();
    document.getElementById('reservation-time').value = time;
    document.getElementById('staff-select').value = staffId;
}

function closeNewReservationModal() {
    document.getElementById('new-reservation-modal').style.display = 'none';
    document.getElementById('reservation-form').reset();
}

// 予約保存
async function saveReservation() {
    const customerId = document.getElementById('customer-select').value;
    const menuId = document.getElementById('menu-select').value;
    const staffId = document.getElementById('staff-select').value;
    const date = document.getElementById('reservation-date').value;
    const time = document.getElementById('reservation-time').value;
    
    if (!customerId || !menuId || !staffId || !date || !time) {
        showToast('必須項目を入力してください', 'error');
        return;
    }
    
    const reservationData = {
        customer_id: customerId,
        menu_id: parseInt(menuId),
        staff_id: parseInt(staffId),
        reservation_date: `${date}T${time}:00`
    };
    
    try {
        await AdminAPI.post('/reservations', reservationData);
        showToast('予約を登録しました', 'success');
        closeNewReservationModal();
        loadReservations();
    } catch (error) {
        console.error('Error saving reservation:', error);
        showToast('予約の登録に失敗しました', 'error');
    }
}

// 予約詳細表示
function showReservationDetail(reservationId) {
    const reservation = allReservations.find(r => r.reservation_id === reservationId);
    if (!reservation) return;
    
    currentReservationId = reservationId;
    
    const dateTime = new Date(reservation.reservation_date);
    
    document.getElementById('detail-id').textContent = `#${reservation.reservation_id}`;
    document.getElementById('detail-customer').textContent = reservation.customer_name || '-';
    document.getElementById('detail-phone').textContent = reservation.customer_phone || '-';
    document.getElementById('detail-menu').textContent = reservation.menu_name;
    document.getElementById('detail-staff').textContent = reservation.staff_name;
    document.getElementById('detail-datetime').textContent = 
        `${dateTime.toLocaleDateString('ja-JP')} ${dateTime.toTimeString().slice(0, 5)}`;
    document.getElementById('detail-price').textContent = `¥${reservation.price.toLocaleString()}`;
    document.getElementById('detail-status').textContent = getStatusText(reservation.status);
    document.getElementById('detail-notes').textContent = reservation.notes || '-';
    
    document.getElementById('reservation-detail-modal').style.display = 'flex';
}

function closeReservationDetail() {
    document.getElementById('reservation-detail-modal').style.display = 'none';
    currentReservationId = null;
}

// 予約キャンセル
async function cancelReservation() {
    if (!currentReservationId) return;
    
    if (!confirm('この予約をキャンセルしますか？')) return;
    
    try {
        await AdminAPI.delete(`/reservations/${currentReservationId}`);
        showToast('予約をキャンセルしました', 'success');
        closeReservationDetail();
        loadReservations();
    } catch (error) {
        console.error('Error canceling reservation:', error);
        showToast('キャンセルに失敗しました', 'error');
    }
}

// 予約完了
async function completeReservation() {
    if (!currentReservationId) return;
    
    try {
        await AdminAPI.put(`/reservations/${currentReservationId}`, { status: 'completed' });
        showToast('予約を完了にしました', 'success');
        closeReservationDetail();
        loadReservations();
    } catch (error) {
        console.error('Error completing reservation:', error);
        showToast('完了処理に失敗しました', 'error');
    }
}

// ヘルパー関数
function formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function updateCurrentDate() {
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        dateElement.textContent = new Date().toLocaleDateString('ja-JP', options);
    }
}

function getStatusClass(status) {
    const statusClasses = {
        'confirmed': 'status-confirmed',
        'cancelled': 'status-cancelled',
        'completed': 'status-completed'
    };
    return statusClasses[status] || 'status-default';
}

function getStatusText(status) {
    const statusTexts = {
        'confirmed': '確定',
        'cancelled': 'キャンセル',
        'completed': '完了'
    };
    return statusTexts[status] || status;
}

// モーダルの外側クリックで閉じる
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});