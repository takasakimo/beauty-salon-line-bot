// グローバル変数
let todayReservations = [];
let salesChart = null;

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // テナント情報を表示
        displayTenantInfo();
        
        // データを読み込み
        await loadDashboardData();
        
        // グラフを初期化
        initSalesChart();
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showToast('データの読み込みに失敗しました', 'error');
    }
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

// ダッシュボードデータを読み込み
async function loadDashboardData() {
    try {
        // 今日の予約を取得
        await loadTodayReservations();
        
        // 統計データを取得
        await loadStatistics();
        
        // 人気メニューを取得
        await loadPopularMenus();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// 今日の予約を読み込み（マルチテナント対応）
async function loadTodayReservations() {
    try {
        // AdminAPIクラスを使用（マルチテナント対応済み）
        const today = new Date().toISOString().split('T')[0];
        const data = await AdminAPI.get(`/admin/reservations?date=${today}`);
        
        if (data) {
            todayReservations = data;
            displayTodayReservations();
            
            // 今日の予約数を更新
            document.getElementById('today-reservations').textContent = todayReservations.length;
            
            // 今日の売上を計算
            const totalSales = todayReservations.reduce((sum, r) => sum + (r.price || 0), 0);
            document.getElementById('today-sales').textContent = formatCurrency(totalSales);
        }
    } catch (error) {
        console.error('Error loading today reservations:', error);
        
        // デモデータを表示
        displayDemoReservations();
    }
}

// 今日の予約を表示
function displayTodayReservations() {
    const tbody = document.getElementById('today-reservations-list');
    
    if (todayReservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">本日の予約はありません</td></tr>';
        return;
    }
    
    tbody.innerHTML = todayReservations.map(reservation => {
        const time = new Date(reservation.reservation_date);
        const timeString = `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`;
        
        return `
            <tr>
                <td>${timeString}</td>
                <td>${reservation.customer_name || reservation.real_name || '---'}</td>
                <td>${reservation.menu_name}</td>
                <td>${reservation.staff_name}</td>
                <td>
                    <span class="status-badge status-${reservation.status}">
                        ${getStatusLabel(reservation.status)}
                    </span>
                </td>
                <td>
                    <div class="quick-actions">
                        <button class="action-btn view" onclick="viewReservation(${reservation.reservation_id})">
                            詳細
                        </button>
                        <button class="action-btn edit" onclick="editReservation(${reservation.reservation_id})">
                            編集
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// デモ予約データを表示
function displayDemoReservations() {
    // テナントごとに異なるデモデータ
    const tenantCode = getTenantCode();
    let demoData = [];
    
    if (tenantCode === 'beauty-salon-001') {
        demoData = [
            { time: '10:00', customer: '山田花子', menu: 'カット+カラー', staff: '田中美香', status: 'confirmed' },
            { time: '11:30', customer: '佐藤太郎', menu: 'カット', staff: '佐藤雅子', status: 'confirmed' },
            { time: '14:00', customer: '鈴木一郎', menu: 'パーマ', staff: '山田花子', status: 'confirmed' },
            { time: '15:30', customer: '高橋美咲', menu: 'トリートメント', staff: '田中美香', status: 'confirmed' },
            { time: '17:00', customer: '田中次郎', menu: 'カット', staff: '佐藤雅子', status: 'confirmed' }
        ];
    } else if (tenantCode === 'beauty-salon-002') {
        demoData = [
            { time: '10:30', customer: '渡辺美穂', menu: 'カット', staff: 'スタッフA', status: 'confirmed' },
            { time: '13:00', customer: '伊藤健太', menu: 'カラー', staff: 'スタッフB', status: 'confirmed' },
            { time: '16:00', customer: '加藤由美', menu: 'パーマ', staff: 'スタッフA', status: 'confirmed' }
        ];
    } else {
        demoData = [
            { time: '11:00', customer: '中村涼子', menu: 'エステ', staff: 'セラピストA', status: 'confirmed' },
            { time: '14:30', customer: '小林真央', menu: 'フェイシャル', staff: 'セラピストB', status: 'confirmed' }
        ];
    }
    
    const tbody = document.getElementById('today-reservations-list');
    tbody.innerHTML = demoData.map((reservation, index) => `
        <tr>
            <td>${reservation.time}</td>
            <td>${reservation.customer}</td>
            <td>${reservation.menu}</td>
            <td>${reservation.staff}</td>
            <td>
                <span class="status-badge status-${reservation.status}">
                    ${getStatusLabel(reservation.status)}
                </span>
            </td>
            <td>
                <div class="quick-actions">
                    <button class="action-btn view" onclick="viewReservation(${index + 1})">
                        詳細
                    </button>
                    <button class="action-btn edit" onclick="editReservation(${index + 1})">
                        編集
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // デモの統計も更新
    document.getElementById('today-reservations').textContent = demoData.length;
    
    // テナントごとの売上
    const salesMap = {
        'beauty-salon-001': '¥35,000',
        'beauty-salon-002': '¥22,000',
        'beauty-salon-003': '¥18,000'
    };
    document.getElementById('today-sales').textContent = salesMap[tenantCode] || '¥25,000';
}

// 統計データを読み込み（マルチテナント対応）
async function loadStatistics() {
    try {
        // AdminAPIクラスを使用（マルチテナント対応済み）
        const stats = await AdminAPI.get('/admin/statistics');
        
        if (stats) {
            // 顧客数を更新
            document.getElementById('total-customers').textContent = stats.totalCustomers || 0;
            
            // テナント名が返ってきたら更新
            if (stats.tenantName) {
                const currentTenantElement = document.getElementById('current-tenant');
                if (currentTenantElement) {
                    currentTenantElement.textContent = stats.tenantName;
                }
            }
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        
        // テナントごとのデモデータ
        const tenantCode = getTenantCode();
        const customerMap = {
            'beauty-salon-001': '156',
            'beauty-salon-002': '89',
            'beauty-salon-003': '67'
        };
        document.getElementById('total-customers').textContent = customerMap[tenantCode] || '100';
    }
}

// 人気メニューを読み込み（マルチテナント用追加）
async function loadPopularMenus() {
    try {
        // 実際のデータを取得する場合はAPIを使用
        // const menus = await AdminAPI.get('/admin/popular-menus');
        
        // デモ用：テナントごとに異なるメニュー
        const tenantCode = getTenantCode();
        let popularMenus = [];
        
        if (tenantCode === 'beauty-salon-001') {
            popularMenus = [
                { name: 'カット+カラー', count: 45 },
                { name: 'カット', count: 38 },
                { name: 'パーマ', count: 25 },
                { name: 'トリートメント', count: 20 },
                { name: 'ヘッドスパ', count: 15 }
            ];
        } else if (tenantCode === 'beauty-salon-002') {
            popularMenus = [
                { name: 'カット', count: 52 },
                { name: 'カラー', count: 41 },
                { name: 'トリートメント', count: 28 },
                { name: '縮毛矯正', count: 18 },
                { name: 'パーマ', count: 12 }
            ];
        } else {
            popularMenus = [
                { name: 'フェイシャルエステ', count: 35 },
                { name: 'ボディマッサージ', count: 28 },
                { name: 'アロマトリートメント', count: 22 },
                { name: 'リンパマッサージ', count: 18 },
                { name: 'ヘッドスパ', count: 15 }
            ];
        }
        
        // 人気メニューを表示
        const container = document.getElementById('popular-menus');
        if (container) {
            container.innerHTML = popularMenus.map((menu, index) => `
                <div class="popular-item">
                    <span class="rank">${index + 1}</span>
                    <span class="name">${menu.name}</span>
                    <span class="count">${menu.count}件</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading popular menus:', error);
    }
}

// ステータスラベルを取得
function getStatusLabel(status) {
    const labels = {
        confirmed: '確定',
        cancelled: 'キャンセル',
        completed: '完了',
        pending: '保留中'
    };
    return labels[status] || status;
}

// 売上グラフを初期化（テナントごとに異なるデータ）
function initSalesChart() {
    const ctx = document.getElementById('sales-chart');
    if (!ctx) return;
    
    // テナントごとのデモデータ
    const tenantCode = getTenantCode();
    const labels = ['月', '火', '水', '木', '金', '土', '日'];
    let data = [];
    let borderColor = '#FF6B6B';
    
    if (tenantCode === 'beauty-salon-001') {
        data = [45000, 52000, 48000, 58000, 62000, 85000, 72000];
        borderColor = '#FF6B6B';
    } else if (tenantCode === 'beauty-salon-002') {
        data = [32000, 38000, 35000, 42000, 45000, 58000, 48000];
        borderColor = '#667eea';
    } else {
        data = [28000, 31000, 29000, 35000, 38000, 42000, 39000];
        borderColor = '#43e97b';
    }
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '売上',
                data: data,
                borderColor: borderColor,
                backgroundColor: borderColor + '20',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '売上: ¥' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// 予約詳細を表示
function viewReservation(id) {
    showToast(`予約ID ${id} の詳細を表示`, 'info');
    // 実装: モーダルで詳細を表示
}

// 予約を編集
function editReservation(id) {
    showToast(`予約ID ${id} を編集`, 'info');
    // 実装: 編集画面へ遷移またはモーダル表示
}

// 自動更新（5分ごと）
setInterval(() => {
    loadDashboardData();
}, 5 * 60 * 1000);