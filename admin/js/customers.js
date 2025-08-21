// 顧客管理画面のJavaScript

// グローバル変数
let allCustomers = [];
let filteredCustomers = [];
let currentFilter = 'all';
let currentCustomerId = null;

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', function() {
    // 認証チェック
    if (!localStorage.getItem('adminLoggedIn')) {
        window.location.href = 'login.html';
        return;
    }
    
    // 初期データ読み込み
    loadCustomers();
    loadStatistics();
});

// 顧客データの読み込み
async function loadCustomers() {
    try {
        const response = await fetch('/api/admin/customers');
        if (!response.ok) throw new Error('顧客データの取得に失敗しました');
        
        const customers = await response.json();
        allCustomers = customers;
        
        // 各顧客の予約情報も取得
        for (let customer of allCustomers) {
            const reservationsResponse = await fetch(`/api/reservations/user/${customer.line_user_id}`);
            if (reservationsResponse.ok) {
                const reservations = await reservationsResponse.json();
                customer.reservations = reservations;
                customer.visitCount = reservations.filter(r => r.status === 'completed').length;
                customer.totalSpent = calculateTotalSpent(reservations);
                customer.lastVisit = getLastVisitDate(reservations);
                customer.customerStatus = getCustomerStatus(customer);
            }
        }
        
        displayCustomers(allCustomers);
        updateCustomerCount(allCustomers.length);
    } catch (error) {
        console.error('Error loading customers:', error);
        showError('顧客データの読み込みに失敗しました');
    }
}

// 統計データの読み込み
async function loadStatistics() {
    try {
        const response = await fetch('/api/admin/statistics');
        if (!response.ok) throw new Error('統計データの取得に失敗しました');
        
        const stats = await response.json();
        
        // 統計カードの更新
        document.getElementById('totalCustomers').textContent = stats.totalCustomers || '0';
        document.getElementById('newCustomersMonth').textContent = stats.newCustomersMonth || '0';
        document.getElementById('regularCustomers').textContent = stats.regularCustomers || '0';
        document.getElementById('averageSpending').textContent = `¥${(stats.averageSpending || 0).toLocaleString()}`;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// 顧客リストの表示
function displayCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');
    
    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div class="empty-state-message">顧客データがありません</div>
                    <div class="empty-state-description">顧客が登録されると、ここに表示されます</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = customers.map(customer => {
        const registeredDate = new Date(customer.registered_date).toLocaleDateString('ja-JP');
        const lastVisit = customer.lastVisit || '-';
        const visitCount = customer.visitCount || 0;
        const totalSpent = customer.totalSpent || 0;
        const status = customer.customerStatus || 'new';
        
        return `
            <tr>
                <td>${escapeHtml(customer.real_name)}</td>
                <td>${escapeHtml(customer.phone_number)}</td>
                <td>${registeredDate}</td>
                <td>${visitCount}回</td>
                <td>${lastVisit}</td>
                <td>¥${totalSpent.toLocaleString()}</td>
                <td>
                    <span class="status-badge status-${status}">
                        ${getStatusLabel(status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-view" onclick="showCustomerDetail('${customer.line_user_id}')">
                            詳細
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 顧客詳細の表示
async function showCustomerDetail(customerId) {
    currentCustomerId = customerId;
    const customer = allCustomers.find(c => c.line_user_id === customerId);
    
    if (!customer) {
        showError('顧客情報が見つかりません');
        return;
    }
    
    // 基本情報
    document.getElementById('detailName').textContent = customer.real_name;
    document.getElementById('detailPhone').textContent = customer.phone_number;
    document.getElementById('detailAddress').textContent = customer.address || '-';
    document.getElementById('detailBirthday').textContent = customer.birthday ? 
        new Date(customer.birthday).toLocaleDateString('ja-JP') : '-';
    document.getElementById('detailRegistered').textContent = 
        new Date(customer.registered_date).toLocaleDateString('ja-JP');
    document.getElementById('detailLineId').textContent = customer.line_user_id;
    
    // 利用統計
    document.getElementById('detailVisitCount').textContent = `${customer.visitCount || 0}回`;
    document.getElementById('detailTotalSpent').textContent = `¥${(customer.totalSpent || 0).toLocaleString()}`;
    document.getElementById('detailAverageSpent').textContent = 
        customer.visitCount > 0 ? 
        `¥${Math.floor(customer.totalSpent / customer.visitCount).toLocaleString()}` : '¥0';
    document.getElementById('detailLastVisit').textContent = customer.lastVisit || '-';
    
    // よく利用するメニュー
    displayFavoriteMenus(customer.reservations);
    
    // 予約履歴
    displayReservationHistory(customer.reservations);
    
    // モーダル表示
    document.getElementById('customerDetailModal').style.display = 'block';
}

// お気に入りメニューの表示
function displayFavoriteMenus(reservations) {
    const menuCount = {};
    
    if (reservations && reservations.length > 0) {
        reservations.forEach(r => {
            if (r.menu_name) {
                menuCount[r.menu_name] = (menuCount[r.menu_name] || 0) + 1;
            }
        });
    }
    
    const sortedMenus = Object.entries(menuCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const container = document.getElementById('favoriteMenus');
    
    if (sortedMenus.length === 0) {
        container.innerHTML = '<p style="color: #999;">まだ利用履歴がありません</p>';
        return;
    }
    
    container.innerHTML = sortedMenus.map(([menu, count]) => `
        <div class="menu-tag">
            ${escapeHtml(menu)}
            <span class="menu-count">${count}</span>
        </div>
    `).join('');
}

// 予約履歴の表示
function displayReservationHistory(reservations) {
    const tbody = document.getElementById('historyTableBody');
    
    if (!reservations || reservations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #999;">
                    予約履歴がありません
                </td>
            </tr>
        `;
        return;
    }
    
    // 日付順にソート（新しい順）
    const sortedReservations = [...reservations].sort((a, b) => 
        new Date(b.reservation_date) - new Date(a.reservation_date)
    );
    
    tbody.innerHTML = sortedReservations.slice(0, 10).map(r => {
        const date = new Date(r.reservation_date);
        const dateStr = date.toLocaleDateString('ja-JP');
        const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        const statusClass = getStatusClass(r.status);
        const statusLabel = getReservationStatusLabel(r.status);
        
        return `
            <tr>
                <td>${dateStr} ${timeStr}</td>
                <td>${escapeHtml(r.menu_name || '-')}</td>
                <td>${escapeHtml(r.staff_name || '-')}</td>
                <td>¥${(r.price || 0).toLocaleString()}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusLabel}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// 顧客詳細モーダルを閉じる
function closeCustomerDetail() {
    document.getElementById('customerDetailModal').style.display = 'none';
    currentCustomerId = null;
}

// 顧客検索
function searchCustomers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        displayCustomers(allCustomers);
        return;
    }
    
    const filtered = allCustomers.filter(customer => {
        return customer.real_name.toLowerCase().includes(searchTerm) ||
               customer.phone_number.includes(searchTerm) ||
               (customer.address && customer.address.toLowerCase().includes(searchTerm));
    });
    
    displayCustomers(filtered);
    updateCustomerCount(filtered.length);
}

// 顧客フィルター
function filterCustomers(filterType) {
    currentFilter = filterType;
    
    // フィルターボタンのアクティブ状態を更新
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    let filtered = [...allCustomers];
    const now = new Date();
    
    switch(filterType) {
        case 'new':
            // 30日以内に登録
            filtered = allCustomers.filter(c => {
                const registeredDate = new Date(c.registered_date);
                const daysDiff = (now - registeredDate) / (1000 * 60 * 60 * 24);
                return daysDiff <= 30;
            });
            break;
            
        case 'regular':
            // 5回以上来店
            filtered = allCustomers.filter(c => (c.visitCount || 0) >= 5);
            break;
            
        case 'inactive':
            // 60日以上来店なし
            filtered = allCustomers.filter(c => {
                if (!c.lastVisit || c.lastVisit === '-') return true;
                const lastVisitDate = new Date(c.lastVisit);
                const daysDiff = (now - lastVisitDate) / (1000 * 60 * 60 * 24);
                return daysDiff >= 60;
            });
            break;
            
        default:
            // すべて
            filtered = allCustomers;
    }
    
    displayCustomers(filtered);
    updateCustomerCount(filtered.length);
}

// 顧客メモの保存
async function saveCustomerMemo() {
    if (!currentCustomerId) return;
    
    const memo = document.getElementById('customerMemo').value;
    
    // TODO: APIエンドポイントが実装されたら有効化
    alert('メモ機能は現在開発中です');
    
    /*
    try {
        const response = await fetch(`/api/admin/customers/${currentCustomerId}/memo`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ memo })
        });
        
        if (response.ok) {
            alert('メモを保存しました');
        } else {
            throw new Error('メモの保存に失敗しました');
        }
    } catch (error) {
        console.error('Error saving memo:', error);
        alert('メモの保存に失敗しました');
    }
    */
}

// 顧客データのエクスポート
function exportCustomerData() {
    // CSV形式でエクスポート
    const headers = ['顧客名', '電話番号', '登録日', '来店回数', '累計金額', 'ステータス'];
    const rows = allCustomers.map(c => [
        c.real_name,
        c.phone_number,
        new Date(c.registered_date).toLocaleDateString('ja-JP'),
        c.visitCount || 0,
        c.totalSpent || 0,
        getStatusLabel(c.customerStatus || 'new')
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    // BOMを追加（Excel対応）
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ヘルパー関数
function calculateTotalSpent(reservations) {
    if (!reservations || reservations.length === 0) return 0;
    return reservations
        .filter(r => r.status === 'completed')
        .reduce((total, r) => total + (r.price || 0), 0);
}

function getLastVisitDate(reservations) {
    if (!reservations || reservations.length === 0) return null;
    
    const completedReservations = reservations
        .filter(r => r.status === 'completed')
        .sort((a, b) => new Date(b.reservation_date) - new Date(a.reservation_date));
    
    if (completedReservations.length === 0) return null;
    
    return new Date(completedReservations[0].reservation_date).toLocaleDateString('ja-JP');
}

function getCustomerStatus(customer) {
    const visitCount = customer.visitCount || 0;
    const now = new Date();
    const registeredDate = new Date(customer.registered_date);
    const daysSinceRegistration = (now - registeredDate) / (1000 * 60 * 60 * 24);
    
    if (visitCount >= 10) return 'vip';
    if (visitCount >= 5) return 'regular';
    if (daysSinceRegistration <= 30) return 'new';
    
    // 最終来店日をチェック
    if (customer.lastVisit) {
        const lastVisitDate = new Date(customer.lastVisit.replace(/\//g, '-'));
        const daysSinceLastVisit = (now - lastVisitDate) / (1000 * 60 * 60 * 24);
        if (daysSinceLastVisit >= 60) return 'inactive';
    }
    
    return 'regular';
}

function getStatusLabel(status) {
    const labels = {
        'new': '新規',
        'regular': '常連',
        'vip': 'VIP',
        'inactive': '休眠'
    };
    return labels[status] || status;
}

function getReservationStatusLabel(status) {
    const labels = {
        'confirmed': '予約確定',
        'completed': '完了',
        'cancelled': 'キャンセル',
        'pending': '保留中'
    };
    return labels[status] || status;
}

function getStatusClass(status) {
    const classes = {
        'confirmed': 'status-new',
        'completed': 'status-regular',
        'cancelled': 'status-inactive',
        'pending': 'status-inactive'
    };
    return classes[status] || '';
}

function updateCustomerCount(count) {
    document.getElementById('customerCount').textContent = count;
}

function showError(message) {
    // エラーメッセージを表示
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="error-message">
                ${message}
            </td>
        </tr>
    `;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
}

// モーダルの外側クリックで閉じる
window.onclick = function(event) {
    const modal = document.getElementById('customerDetailModal');
    if (event.target === modal) {
        closeCustomerDetail();
    }
}