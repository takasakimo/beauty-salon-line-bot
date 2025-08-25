// 売上分析画面のJavaScript

// グローバル変数
let salesTrendChart = null;
let menuSalesChart = null;
let staffSalesChart = null;
let hourlyBookingsChart = null;
let weekdaySalesChart = null;
let currentPeriod = 'month';
let currentView = 'daily';

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeCharts();
    loadAnalyticsData();
    setupEventListeners();
});

// 認証チェック
function checkAuth() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'login.html';
    }
}

// イベントリスナーの設定
function setupEventListeners() {
    // 期間選択
    document.getElementById('period-select').addEventListener('change', function(e) {
        if (e.target.value === 'custom') {
            document.getElementById('custom-period').style.display = 'flex';
        } else {
            document.getElementById('custom-period').style.display = 'none';
            currentPeriod = e.target.value;
            loadAnalyticsData();
        }
    });

    // グラフビュー切り替え
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentView = this.dataset.view;
            updateSalesTrendChart();
        });
    });

    // タブ切り替え
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            
            this.classList.add('active');
            document.getElementById(`${this.dataset.tab}-tab`).style.display = 'block';
        });
    });
}

// 分析データの読み込み
async function loadAnalyticsData() {
    try {
        // サマリーデータの取得
        const summaryData = await fetchSummaryData();
        updateSummaryCards(summaryData);

        // グラフデータの更新
        updateAllCharts();

        // 詳細テーブルの更新
        updateDetailTables();

        // インサイトの更新
        updateInsights();
    } catch (error) {
        console.error('データ読み込みエラー:', error);
    }
}

// サマリーデータの取得
async function fetchSummaryData() {
    try {
        const response = await fetch('/api/admin/statistics');
        const data = await response.json();
        
        // デモデータを追加（実際のAPIレスポンスを補完）
        return {
            totalSales: data.todaySales || 128500,
            averagePrice: 7200,
            totalBookings: data.todayReservations || 18,
            repeatRate: 68,
            salesChange: 15,
            priceChange: 8,
            bookingsChange: 12,
            repeatChange: -3
        };
    } catch (error) {
        console.error('サマリーデータ取得エラー:', error);
        // デモデータを返す
        return {
            totalSales: 128500,
            averagePrice: 7200,
            totalBookings: 18,
            repeatRate: 68,
            salesChange: 15,
            priceChange: 8,
            bookingsChange: 12,
            repeatChange: -3
        };
    }
}

// サマリーカードの更新
function updateSummaryCards(data) {
    document.getElementById('total-sales').textContent = `¥${data.totalSales.toLocaleString()}`;
    document.getElementById('average-price').textContent = `¥${data.averagePrice.toLocaleString()}`;
    document.getElementById('total-bookings').textContent = `${data.totalBookings}件`;
    document.getElementById('repeat-rate').textContent = `${data.repeatRate}%`;

    // 変化率の更新
    const cards = document.querySelectorAll('.summary-card');
    const changes = [data.salesChange, data.priceChange, data.bookingsChange, data.repeatChange];
    
    cards.forEach((card, index) => {
        const changeEl = card.querySelector('.card-change');
        const change = changes[index];
        changeEl.textContent = change >= 0 ? `+${change}%` : `${change}%`;
        changeEl.className = `card-change ${change >= 0 ? 'positive' : 'negative'}`;
    });
}

// グラフの初期化
function initializeCharts() {
    // Chart.jsのデフォルト設定
    Chart.defaults.font.family = "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
    Chart.defaults.color = '#666';

    initSalesTrendChart();
    initMenuSalesChart();
    initStaffSalesChart();
    initHourlyBookingsChart();
    initWeekdaySalesChart();
}

// 売上推移グラフの初期化
function initSalesTrendChart() {
    const ctx = document.getElementById('sales-trend-chart').getContext('2d');
    salesTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '売上',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
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
                            return `売上: ¥${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return `¥${(value / 1000).toFixed(0)}k`;
                        }
                    }
                }
            }
        }
    });
}

// メニュー別売上グラフの初期化
function initMenuSalesChart() {
    const ctx = document.getElementById('menu-sales-chart').getContext('2d');
    menuSalesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#FF6B6B',
                    '#4ECDC4',
                    '#45B7D1',
                    '#FFA07A',
                    '#98D8C8',
                    '#FDBB84',
                    '#B19CD9',
                    '#FFB6C1'
                ]
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
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ¥${context.parsed.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// スタッフ別売上グラフの初期化
function initStaffSalesChart() {
    const ctx = document.getElementById('staff-sales-chart').getContext('2d');
    staffSalesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '売上',
                data: [],
                backgroundColor: [
                    'rgba(255, 107, 107, 0.8)',
                    'rgba(78, 205, 196, 0.8)',
                    'rgba(69, 183, 209, 0.8)'
                ]
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
                            return `売上: ¥${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return `¥${(value / 1000).toFixed(0)}k`;
                        }
                    }
                }
            }
        }
    });
}

// 時間帯別予約数グラフの初期化
function initHourlyBookingsChart() {
    const ctx = document.getElementById('hourly-bookings-chart').getContext('2d');
    hourlyBookingsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '予約数',
                data: [],
                backgroundColor: 'rgba(102, 126, 234, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 曜日別売上グラフの初期化
function initWeekdaySalesChart() {
    const ctx = document.getElementById('weekday-sales-chart').getContext('2d');
    weekdaySalesChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['月', '火', '水', '木', '金', '土', '日'],
            datasets: [{
                label: '売上',
                data: [],
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: '#667eea',
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return `¥${(value / 1000).toFixed(0)}k`;
                        }
                    }
                }
            }
        }
    });
}

// すべてのグラフを更新
async function updateAllCharts() {
    updateSalesTrendChart();
    updateMenuSalesChart();
    updateStaffSalesChart();
    updateHourlyBookingsChart();
    updateWeekdaySalesChart();
}

// 売上推移グラフの更新
function updateSalesTrendChart() {
    const labels = generateDateLabels();
    const data = generateSalesTrendData(labels.length);
    
    salesTrendChart.data.labels = labels;
    salesTrendChart.data.datasets[0].data = data;
    salesTrendChart.update();
}

// 日付ラベルの生成
function generateDateLabels() {
    const labels = [];
    const today = new Date();
    
    if (currentView === 'daily') {
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
        }
    } else if (currentView === 'weekly') {
        for (let i = 11; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - (i * 7));
            labels.push(`第${Math.floor(date.getDate() / 7) + 1}週`);
        }
    } else {
        const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        for (let i = 11; i >= 0; i--) {
            const date = new Date(today);
            date.setMonth(date.getMonth() - i);
            labels.push(months[date.getMonth()]);
        }
    }
    
    return labels;
}

// 売上推移データの生成（デモ）
function generateSalesTrendData(length) {
    const data = [];
    for (let i = 0; i < length; i++) {
        data.push(Math.floor(Math.random() * 50000) + 80000);
    }
    return data;
}

// メニュー別売上グラフの更新
async function updateMenuSalesChart() {
    try {
        const response = await fetch('/api/menus');
        const menus = await response.json();
        
        const labels = menus.map(m => m.name);
        const data = menus.map(m => m.price * Math.floor(Math.random() * 20 + 5));
        
        menuSalesChart.data.labels = labels;
        menuSalesChart.data.datasets[0].data = data;
        menuSalesChart.update();
        
        // 凡例の更新
        updateChartLegend('menu-legend', labels, menuSalesChart.data.datasets[0].backgroundColor);
    } catch (error) {
        console.error('メニューデータ取得エラー:', error);
    }
}

// スタッフ別売上グラフの更新
async function updateStaffSalesChart() {
    try {
        const response = await fetch('/api/staff');
        const staff = await response.json();
        
        const labels = staff.map(s => s.name);
        const data = [85000, 72000, 45000]; // デモデータ
        
        staffSalesChart.data.labels = labels;
        staffSalesChart.data.datasets[0].data = data;
        staffSalesChart.update();
        
        // 凡例の更新
        updateChartLegend('staff-legend', labels, staffSalesChart.data.datasets[0].backgroundColor);
    } catch (error) {
        console.error('スタッフデータ取得エラー:', error);
    }
}

// 時間帯別予約数グラフの更新
function updateHourlyBookingsChart() {
    const labels = [];
    const data = [];
    
    for (let i = 9; i <= 20; i++) {
        labels.push(`${i}:00`);
        data.push(Math.floor(Math.random() * 8) + 1);
    }
    
    hourlyBookingsChart.data.labels = labels;
    hourlyBookingsChart.data.datasets[0].data = data;
    hourlyBookingsChart.update();
}

// 曜日別売上グラフの更新
function updateWeekdaySalesChart() {
    const data = [65000, 72000, 58000, 81000, 95000, 120000, 110000];
    
    weekdaySalesChart.data.datasets[0].data = data;
    weekdaySalesChart.update();
}

// グラフ凡例の更新
function updateChartLegend(elementId, labels, colors) {
    const legendEl = document.getElementById(elementId);
    legendEl.innerHTML = '';
    
    labels.forEach((label, index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const color = document.createElement('div');
        color.className = 'legend-color';
        color.style.backgroundColor = colors[index];
        
        const text = document.createElement('span');
        text.textContent = label;
        
        item.appendChild(color);
        item.appendChild(text);
        legendEl.appendChild(item);
    });
}

// 詳細テーブルの更新
async function updateDetailTables() {
    updateMenuDetailTable();
    updateStaffDetailTable();
    updateCustomerDetailTable();
}

// メニュー別詳細テーブルの更新
async function updateMenuDetailTable() {
    try {
        const response = await fetch('/api/menus');
        const menus = await response.json();
        
        const tbody = document.getElementById('menu-detail-tbody');
        tbody.innerHTML = '';
        
        let totalSales = 0;
        const menuData = menus.map(menu => {
            const count = Math.floor(Math.random() * 20 + 5);
            const sales = menu.price * count;
            totalSales += sales;
            return { ...menu, count, sales };
        });
        
        menuData.forEach(menu => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${menu.name}</td>
                <td>${menu.count}</td>
                <td>¥${menu.sales.toLocaleString()}</td>
                <td>${((menu.sales / totalSales) * 100).toFixed(1)}%</td>
                <td class="positive">+${Math.floor(Math.random() * 30)}%</td>
            `;
        });
    } catch (error) {
        console.error('メニュー詳細データ取得エラー:', error);
    }
}

// スタッフ別詳細テーブルの更新
async function updateStaffDetailTable() {
    try {
        const response = await fetch('/api/staff');
        const staff = await response.json();
        
        const tbody = document.getElementById('staff-detail-tbody');
        tbody.innerHTML = '';
        
        const staffData = [
            { name: '田中美香', count: 15, sales: 85000, avg: 5667 },
            { name: '佐藤雅子', count: 12, sales: 72000, avg: 6000 },
            { name: '山田花子', count: 8, sales: 45000, avg: 5625 }
        ];
        
        staffData.forEach(staff => {
            const row = tbody.insertRow();
            const change = Math.floor(Math.random() * 40) - 10;
            row.innerHTML = `
                <td>${staff.name}</td>
                <td>${staff.count}</td>
                <td>¥${staff.sales.toLocaleString()}</td>
                <td>¥${staff.avg.toLocaleString()}</td>
                <td class="${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '+' : ''}${change}%</td>
            `;
        });
    } catch (error) {
        console.error('スタッフ詳細データ取得エラー:', error);
    }
}

// 顧客別詳細テーブルの更新
async function updateCustomerDetailTable() {
    try {
        const response = await fetch('/api/admin/customers');
        const customers = await response.json();
        
        const tbody = document.getElementById('customer-detail-tbody');
        tbody.innerHTML = '';
        
        // 上位10名のみ表示
        customers.slice(0, 10).forEach(customer => {
            const visits = Math.floor(Math.random() * 20 + 1);
            const totalSales = visits * 7500;
            const avgPrice = Math.floor(totalSales / visits);
            const lastVisit = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${customer.real_name}</td>
                <td>${visits}</td>
                <td>¥${totalSales.toLocaleString()}</td>
                <td>¥${avgPrice.toLocaleString()}</td>
                <td>${lastVisit.toLocaleDateString('ja-JP')}</td>
            `;
        });
    } catch (error) {
        console.error('顧客詳細データ取得エラー:', error);
    }
}

// インサイトの更新
function updateInsights() {
    // デモデータでインサイトを更新
    document.getElementById('top-menu').textContent = 'カット+カラー';
    document.getElementById('peak-time').textContent = '14:00-16:00';
    document.getElementById('vip-count').textContent = '12名';
    document.getElementById('growth-rate').textContent = '+15%';
}

// カスタム期間の適用
function applyCustomPeriod() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        alert('開始日と終了日を選択してください');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert('開始日は終了日より前の日付を選択してください');
        return;
    }
    
    console.log(`カスタム期間: ${startDate} 〜 ${endDate}`);
    loadAnalyticsData();
}

// レポート出力モーダルを開く
function exportReport() {
    document.getElementById('export-modal').style.display = 'block';
}

// レポート出力モーダルを閉じる
function closeExportModal() {
    document.getElementById('export-modal').style.display = 'none';
}

// レポートのダウンロード
function downloadReport() {
    const format = document.getElementById('export-format').value;
    
    // 実際の実装では、サーバーサイドでレポートを生成
    alert(`${format.toUpperCase()}形式でレポートをダウンロードします（デモ）`);
    closeExportModal();
}

// ログアウト
function logout() {
    if (confirm('ログアウトしますか？')) {
        localStorage.removeItem('adminLoggedIn');
        window.location.href = 'login.html';
    }
}

// ウィンドウクリックでモーダルを閉じる
window.onclick = function(event) {
    const modal = document.getElementById('export-modal');
    if (event.target === modal) {
        closeExportModal();
    }
}