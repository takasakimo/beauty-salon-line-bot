// 売上分析画面のJavaScript（マルチテナント対応版）

// グローバル変数
let currentPeriod = 'month';
let revenueChart = null;
let menuChart = null;
let staffChart = null;
let customerTypeChart = null;
let frequencyChart = null;
let hourlyChart = null;
let analyticsData = null;

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
    
    // 分析データ読み込み
    await loadAnalyticsData();
    
    // グラフ初期化
    initializeCharts();
    
    // データ表示
    displayAnalytics();
});

// 分析データの読み込み
async function loadAnalyticsData() {
    try {
        // 実際のAPIコールをシミュレート
        const data = await AdminAPI.get('/admin/analytics?period=' + currentPeriod);
        analyticsData = data;
    } catch (error) {
        console.error('Error loading analytics:', error);
        // デモデータを使用
        loadDemoAnalyticsData();
    }
}

// デモ分析データ（テナント別）
function loadDemoAnalyticsData() {
    const tenantCode = getTenantCode();
    
    const demoData = {
        'beauty-salon-001': {
            totalRevenue: 1580000,
            revenueChange: 12.5,
            averageTicket: 7500,
            ticketChange: 5.2,
            totalCustomers: 210,
            customersChange: 8.3,
            repeatRate: 68,
            repeatChange: 3.5,
            dailyRevenue: [
                45000, 52000, 48000, 61000, 58000, 72000, 68000,
                51000, 47000, 53000, 59000, 62000, 75000, 71000,
                49000, 46000, 52000, 58000, 63000, 78000, 74000,
                50000, 48000, 54000, 60000, 65000, 80000, 76000
            ],
            menuRevenue: {
                'カット': 320000,
                'カラー': 480000,
                'パーマ': 280000,
                'トリートメント': 150000,
                'カット+カラー': 350000
            },
            staffRevenue: {
                '田中美香': 680000,
                '佐藤雅子': 520000,
                '山田花子': 380000
            },
            newCustomers: 65,
            repeatCustomers: 145,
            topCustomers: [
                { name: '山田花子', visits: 8, total: 64000 },
                { name: '田中太郎', visits: 6, total: 48000 },
                { name: '鈴木美香', visits: 5, total: 40000 }
            ]
        },
        'beauty-salon-002': {
            totalRevenue: 980000,
            revenueChange: 8.2,
            averageTicket: 5500,
            ticketChange: 3.1,
            totalCustomers: 178,
            customersChange: 5.2,
            repeatRate: 55,
            repeatChange: 2.1,
            dailyRevenue: [
                32000, 35000, 33000, 38000, 36000, 42000, 40000,
                34000, 31000, 35000, 37000, 39000, 44000, 41000,
                33000, 32000, 36000, 38000, 40000, 45000, 43000
            ],
            menuRevenue: {
                'カット': 380000,
                'カラー': 420000,
                'トリートメント': 180000
            },
            staffRevenue: {
                '鈴木一郎': 580000,
                '高橋美咲': 400000
            },
            newCustomers: 80,
            repeatCustomers: 98,
            topCustomers: [
                { name: '高橋一郎', visits: 5, total: 27500 },
                { name: '伊藤美咲', visits: 4, total: 22000 }
            ]
        },
        'beauty-salon-003': {
            totalRevenue: 2100000,
            revenueChange: 15.3,
            averageTicket: 10000,
            ticketChange: 6.5,
            totalCustomers: 210,
            customersChange: 10.2,
            repeatRate: 72,
            repeatChange: 4.8,
            dailyRevenue: [
                65000, 72000, 68000, 78000, 75000, 85000, 82000,
                70000, 67000, 73000, 79000, 81000, 88000, 86000,
                69000, 66000, 74000, 80000, 83000, 90000, 87000
            ],
            menuRevenue: {
                'フェイシャル': 680000,
                'ボディケア': 850000,
                'アロマトリートメント': 570000
            },
            staffRevenue: {
                '斎藤由美': 1100000,
                '中村愛': 1000000
            },
            newCustomers: 58,
            repeatCustomers: 152,
            topCustomers: [
                { name: '中村愛', visits: 10, total: 100000 },
                { name: '小林真理', visits: 8, total: 80000 }
            ]
        }
    };
    
    analyticsData = demoData[tenantCode] || demoData['beauty-salon-001'];
}

// KPI表示
function displayAnalytics() {
    // KPIカード更新
    document.getElementById('totalRevenue').textContent = `¥${analyticsData.totalRevenue.toLocaleString()}`;
    document.getElementById('revenueChange').textContent = `+${analyticsData.revenueChange}%`;
    document.getElementById('averageTicket').textContent = `¥${analyticsData.averageTicket.toLocaleString()}`;
    document.getElementById('ticketChange').textContent = `+${analyticsData.ticketChange}%`;
    document.getElementById('totalCustomers').textContent = analyticsData.totalCustomers;
    document.getElementById('customersChange').textContent = `+${analyticsData.customersChange}%`;
    document.getElementById('repeatRate').textContent = `${analyticsData.repeatRate}%`;
    document.getElementById('repeatChange').textContent = `+${analyticsData.repeatChange}%`;
    
    // グラフ更新
    updateCharts();
    
    // テーブル更新
    updateAnalyticsTable();
    
    // 顧客ランキング更新
    updateCustomerRanking();
}

// グラフ初期化
function initializeCharts() {
    // 売上推移グラフ
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '売上',
                data: [],
                borderColor: 'rgb(102, 126, 234)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
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
    
    // メニュー別売上グラフ
    const menuCtx = document.getElementById('menuChart').getContext('2d');
    menuChart = new Chart(menuCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(240, 147, 251, 0.8)',
                    'rgba(79, 172, 254, 0.8)',
                    'rgba(67, 233, 123, 0.8)',
                    'rgba(255, 182, 193, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
    
    // スタッフ別売上グラフ
    const staffCtx = document.getElementById('staffChart').getContext('2d');
    staffChart = new Chart(staffCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '売上',
                data: [],
                backgroundColor: 'rgba(102, 126, 234, 0.8)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
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
    
    // 顧客タイプグラフ
    const customerTypeCtx = document.getElementById('customerTypeChart').getContext('2d');
    customerTypeChart = new Chart(customerTypeCtx, {
        type: 'pie',
        data: {
            labels: ['新規', 'リピート'],
            datasets: [{
                data: [],
                backgroundColor: [
                    'rgba(79, 172, 254, 0.8)',
                    'rgba(67, 233, 123, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
    
    // 来店頻度グラフ
    const frequencyCtx = document.getElementById('frequencyChart').getContext('2d');
    frequencyChart = new Chart(frequencyCtx, {
        type: 'bar',
        data: {
            labels: ['1回', '2-3回', '4-5回', '6回以上'],
            datasets: [{
                label: '顧客数',
                data: [30, 45, 25, 15],
                backgroundColor: 'rgba(240, 147, 251, 0.8)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
    
    // 時間帯別グラフ
    const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
    hourlyChart = new Chart(hourlyCtx, {
        type: 'line',
        data: {
            labels: ['10時', '11時', '12時', '13時', '14時', '15時', '16時', '17時', '18時'],
            datasets: [{
                label: '予約数',
                data: [8, 12, 10, 7, 15, 18, 20, 16, 11],
                borderColor: 'rgb(67, 233, 123)',
                backgroundColor: 'rgba(67, 233, 123, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// グラフ更新
function updateCharts() {
    // 売上推移
    const days = Array.from({length: analyticsData.dailyRevenue.length}, (_, i) => `${i + 1}日`);
    revenueChart.data.labels = days;
    revenueChart.data.datasets[0].data = analyticsData.dailyRevenue;
    revenueChart.update();
    
    // メニュー別
    menuChart.data.labels = Object.keys(analyticsData.menuRevenue);
    menuChart.data.datasets[0].data = Object.values(analyticsData.menuRevenue);
    menuChart.update();
    
    // スタッフ別
    staffChart.data.labels = Object.keys(analyticsData.staffRevenue);
    staffChart.data.datasets[0].data = Object.values(analyticsData.staffRevenue);
    staffChart.update();
    
    // 顧客タイプ
    customerTypeChart.data.datasets[0].data = [
        analyticsData.newCustomers,
        analyticsData.repeatCustomers
    ];
    customerTypeChart.update();
}

// テーブル更新
function updateAnalyticsTable() {
    const tbody = document.getElementById('analyticsTableBody');
    
    // デモデータ生成
    const tableData = [
        {
            period: '第1週',
            revenue: 380000,
            reservations: 52,
            avgTicket: 7308,
            newCustomers: 15,
            repeatCustomers: 37,
            topMenu: 'カット+カラー',
            change: '+8.5%'
        },
        {
            period: '第2週',
            revenue: 420000,
            reservations: 58,
            avgTicket: 7241,
            newCustomers: 18,
            repeatCustomers: 40,
            topMenu: 'カラー',
            change: '+10.5%'
        },
        {
            period: '第3週',
            revenue: 395000,
            reservations: 55,
            avgTicket: 7182,
            newCustomers: 16,
            repeatCustomers: 39,
            topMenu: 'カット',
            change: '-5.9%'
        },
        {
            period: '第4週',
            revenue: 385000,
            reservations: 45,
            avgTicket: 8556,
            newCustomers: 16,
            repeatCustomers: 29,
            topMenu: 'パーマ',
            change: '-2.5%'
        }
    ];
    
    tbody.innerHTML = tableData.map(row => `
        <tr>
            <td>${row.period}</td>
            <td>¥${row.revenue.toLocaleString()}</td>
            <td>${row.reservations}</td>
            <td>¥${row.avgTicket.toLocaleString()}</td>
            <td>${row.newCustomers}</td>
            <td>${row.repeatCustomers}</td>
            <td>${row.topMenu}</td>
            <td class="${row.change.startsWith('+') ? 'positive' : 'negative'}">${row.change}</td>
        </tr>
    `).join('');
}

// 顧客ランキング更新
function updateCustomerRanking() {
    const rankingDiv = document.getElementById('customerRanking');
    
    rankingDiv.innerHTML = analyticsData.topCustomers.map((customer, index) => `
        <div class="ranking-item">
            <span class="rank">${index + 1}</span>
            <div class="customer-info">
                <div class="customer-name">${customer.name}</div>
                <div class="customer-stats">来店${customer.visits}回 / ¥${customer.total.toLocaleString()}</div>
            </div>
        </div>
    `).join('');
}

// 期間変更
function changePeriod() {
    const selector = document.getElementById('period-selector');
    currentPeriod = selector.value;
    
    if (currentPeriod === 'custom') {
        document.getElementById('customPeriodModal').style.display = 'flex';
    } else {
        loadAnalyticsData();
    }
}

// グラフタイプ変更
function changeChartType(type) {
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    revenueChart.config.type = type;
    revenueChart.update();
}

// テーブルフィルター
function filterTable() {
    const filter = document.getElementById('table-filter').value;
    // フィルター処理を実装
    updateAnalyticsTable();
}

// カスタム期間モーダル
function closeCustomPeriodModal() {
    document.getElementById('customPeriodModal').style.display = 'none';
}

function applyCustomPeriod() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showToast('期間を選択してください', 'error');
        return;
    }
    
    closeCustomPeriodModal();
    loadAnalyticsData();
}

// レポート出力
function exportReport() {
    showToast('レポートを生成中...', 'info');
    
    // CSVデータ生成（簡易版）
    const csvData = [
        ['期間', '売上', '予約数', '客単価'],
        ['今月', analyticsData.totalRevenue, analyticsData.totalCustomers, analyticsData.averageTicket]
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `売上レポート_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('レポートをダウンロードしました', 'success');
}

// モーダルの外側クリックで閉じる
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// スタイル追加（インライン）
const style = document.createElement('style');
style.textContent = `
    .charts-section {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
        margin: 20px 0;
    }
    
    .chart-container {
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .chart-container.half {
        display: inline-block;
        width: calc(50% - 10px);
        margin-right: 20px;
    }
    
    .chart-container.half:last-child {
        margin-right: 0;
    }
    
    .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    
    .chart-controls {
        display: flex;
        gap: 10px;
    }
    
    .chart-btn {
        padding: 5px 15px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .chart-btn.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-color: transparent;
    }
    
    .customer-analytics {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
    }
    
    .analysis-card {
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .analysis-card h3 {
        margin-bottom: 15px;
        font-size: 16px;
    }
    
    .ranking-list {
        max-height: 300px;
        overflow-y: auto;
    }
    
    .ranking-item {
        display: flex;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid #f0f0f0;
    }
    
    .ranking-item:last-child {
        border-bottom: none;
    }
    
    .rank {
        width: 30px;
        height: 30px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        margin-right: 15px;
    }
    
    .customer-info {
        flex: 1;
    }
    
    .customer-name {
        font-weight: 500;
        margin-bottom: 5px;
    }
    
    .customer-stats {
        font-size: 12px;
        color: #666;
    }
    
    .positive {
        color: #4CAF50;
    }
    
    .negative {
        color: #f44336;
    }
`;
document.head.appendChild(style);