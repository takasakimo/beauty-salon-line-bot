// 顧客管理画面のJavaScript（マルチテナント対応版）

// グローバル変数
let allCustomers = [];
let filteredCustomers = [];
let currentFilter = 'all';
let currentCustomerId = null;

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', function() {
    // 認証チェック（admin-common.jsのcheckAuth()を使用）
    if (!checkAuth()) {
        return;
    }
    
    // テナント情報を表示
    displayTenantInfo();
    
    // 初期データ読み込み
    loadCustomers();
    loadStatistics();
});

// テナント情報を表示（マルチテナント用追加）
function displayTenantInfo() {
    const tenantName = localStorage.getItem('tenantName') || sessionStorage.getItem('tenantName');
    const tenantCode = getTenantCode();
    
    if (tenantName) {
        // テナント情報バーを表示
        const tenantAlert = document.getElementById('tenant-alert');
        if (tenantAlert) {
            tenantAlert.style.display = 'block';
            document.getElementById('tenant-name-display').textContent = tenantName;
            
            // プランを表示（デモ用）
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

// 顧客データの読み込み（マルチテナント対応）
async function loadCustomers() {
    try {
        // AdminAPIクラスを使用（マルチテナント対応済み）
        const customers = await AdminAPI.get('/admin/customers');
        
        if (customers) {
            allCustomers = customers;
            
            // 各顧客の予約情報も取得
            for (let customer of allCustomers) {
                try {
                    // 予約情報の取得もマルチテナント対応
                    const reservations = await AdminAPI.get(`/reservations/user/${customer.line_user_id}`);
                    if (reservations) {
                        customer.reservations = reservations;
                        customer.visitCount = reservations.filter(r => r.status === 'completed').length;
                        customer.totalSpent = calculateTotalSpent(reservations);
                        customer.lastVisit = getLastVisitDate(reservations);
                        customer.customerStatus = getCustomerStatus(customer);
                    }
                } catch (err) {
                    console.log(`予約情報取得エラー（顧客: ${customer.line_user_id}）:`, err);
                    customer.reservations = [];
                    customer.visitCount = 0;
                    customer.totalSpent = 0;
                    customer.lastVisit = null;
                    customer.customerStatus = 'new';
                }
            }
            
            displayCustomers(allCustomers);
            updateCustomerCount(allCustomers.length);
        }
    } catch (error) {
        console.error('Error loading customers:', error);
        showError('顧客データの読み込みに失敗しました');
        
        // デモデータを表示
        displayDemoCustomers();
    }
}

// デモ顧客データを表示（マルチテナント対応）
function displayDemoCustomers() {
    const tenantCode = getTenantCode();
    let demoCustomers = [];
    
    if (tenantCode === 'beauty-salon-001') {
        demoCustomers = [
            {
                line_user_id: 'U001',
                real_name: '山田花子',
                phone_number: '090-1234-5678',
                registered_date: '2024-01-15',
                visitCount: 12,
                lastVisit: '2025-01-20',
                totalSpent: 84000,
                customerStatus: 'vip'
            },
            {
                line_user_id: 'U002',
                real_name: '佐藤太郎',
                phone_number: '080-2345-6789',
                registered_date: '2024-03-20',
                visitCount: 8,
                lastVisit: '2025-01-18',
                totalSpent: 56000,
                customerStatus: 'regular'
            },
            {
                line_user_id: 'U003',
                real_name: '鈴木美咲',
                phone_number: '070-3456-7890',
                registered_date: '2025-01-05',
                visitCount: 2,
                lastVisit: '2025-01-22',
                totalSpent: 14000,
                customerStatus: 'new'
            }
        ];
    } else if (tenantCode === 'beauty-salon-002') {
        demoCustomers = [
            {
                line_user_id: 'U101',
                real_name: '渡辺美穂',
                phone_number: '090-9876-5432',
                registered_date: '2024-06-10',
                visitCount: 6,
                lastVisit: '2025-01-15',
                totalSpent: 42000,
                customerStatus: 'regular'
            },
            {
                line_user_id: 'U102',
                real_name: '伊藤健太',
                phone_number: '080-8765-4321',
                registered_date: '2024-11-20',
                visitCount: 3,
                lastVisit: '2024-12-28',
                totalSpent: 21000,
                customerStatus: 'inactive'
            }
        ];
    } else {
        demoCustomers = [
            {
                line_user_id: 'U201',
                real_name: '中村涼子',
                phone_number: '090-5555-6666',
                registered_date: '2024-08-15',
                visitCount: 10,
                lastVisit: '2025-01-19',
                totalSpent: 95000,
                customerStatus: 'vip'
            }
        ];
    }
    
    allCustomers = demoCustomers;
    displayCustomers(allCustomers);
    updateCustomerCount(allCustomers.length);
}

// 統計データの読み込み（マルチテナント対応）
async function loadStatistics() {
    try {
        // AdminAPIクラスを使用（マルチテナント対応済み）
        const stats = await AdminAPI.get('/admin/statistics');
        
        if (stats) {
            // 統計カードの更新
            document.getElementById('totalCustomers').textContent = stats.totalCustomers || '0';
            document.getElementById('newCustomersMonth').textContent = stats.newCustomersMonth || '0';
            document.getElementById('regularCustomers').textContent = stats.regularCustomers || '0';
            document.getElementById('averageSpending').textContent = `¥${(stats.averageSpending || 0).toLocaleString()}`;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        
        // テナントごとのデモ統計
        const tenantCode = getTenantCode();
        const statsMap = {
            'beauty-salon-001': { total: 156, newMonth: 12, regular: 45, avgSpending: 7200 },
            'beauty-salon-002': { total: 89, newMonth: 8, regular: 28, avgSpending: 6800 },
            'beauty-salon-003': { total: 67, newMonth: 5, regular: 22, avgSpending: 8500 }
        };
        
        const demoStats = statsMap[tenantCode] || { total: 100, newMonth: 10, regular: 30, avgSpending: 7000 };
        
        document.getElementById('totalCustomers').textContent = demoStats.total;
        document.getElementById('newCustomersMonth').textContent = demoStats.newMonth;
        document.getElementById('regularCustomers').textContent = demoStats.regular;
        document.getElementById('averageSpending').textContent = `¥${demoStats.avgSpending.toLocaleString()}`;
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

// 顧客メモの保存（マルチテナント対応）
async function saveCustomerMemo() {
    if (!currentCustomerId) return;
    
    const memo = document.getElementById('customerMemo').value;
    
    // TODO: APIエンドポイントが実装されたら有効化
    showToast('メモ機能は現在開発中です', 'info');
    
    /*
    try {
        // AdminAPIクラスを使用（マルチテナント対応）
        const response = await AdminAPI.put(`/admin/customers/${currentCustomerId}/memo`, { memo });
        
        if (response) {
            showToast('メモを保存しました', 'success');
        }
    } catch (error) {
        console.error('Error saving memo:', error);
        showToast('メモの保存に失敗しました', 'error');
    }
    */
}

// 顧客データのエクスポート
function exportCustomerData() {
    const tenantName = localStorage.getItem('tenantName') || sessionStorage.getItem('tenantName') || 'ビューティーサロン';
    
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
    
    let csv = `${tenantName} - 顧客データ\n\n`;
    csv += headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    // BOMを追加（Excel対応）
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const tenantCode = getTenantCode();
    const filename = `customers_${tenantCode}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('顧客データをエクスポートしました', 'success');
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