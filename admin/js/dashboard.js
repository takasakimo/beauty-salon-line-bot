// グローバル変数
let todayReservations = [];
let salesChart = null;

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // データを読み込み
        await loadDashboardData();
        
        // グラフを初期化
        initSalesChart();
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showToast('データの読み込みに失敗しました', 'error');
    }
});

// ダッシュボードデータを読み込み
async function loadDashboardData() {
    try {
        // 今日の予約を取得
        await loadTodayReservations();
        
        // 統計データを取得
        await loadStatistics();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// 今日の予約を読み込み
async function loadTodayReservations() {
    try {
        // APIから今日の予約を取得
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/admin/reservations?date=${today}`, {
            headers: {
                'Authorization': 'Bearer admin'
            }
        });
        
        if (response.ok) {
            todayReservations = await response.json();
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
                <td>${reservation.customer_name || '---'}</td>
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
    const demoData = [
        { time: '10:00', customer: '山田花子', menu: 'カット+カラー', staff: '田中美香', status: 'confirmed' },
        { time: '11:30', customer: '佐藤太郎', menu: 'カット', staff: '佐藤雅子', status: 'confirmed' },
        { time: '14:00', customer: '鈴木一郎', menu: 'パーマ', staff: '山田花子', status: 'confirmed' },
        { time: '15:30', customer: '高橋美咲', menu: 'トリートメント', staff: '田中美香', status: 'confirmed' },
        { time: '17:00', customer: '田中次郎', menu: 'カット', staff: '佐藤雅子', status: 'confirmed' }
    ];
    
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
    document.getElementById('today-reservations').textContent = '5';
    document.getElementById('today-sales').textContent = '¥35,000';
}

// 統計データを読み込み
async function loadStatistics() {
    try {
        // APIから統計データを取得
        const response = await fetch('/api/admin/statistics', {
            headers: {
                'Authorization': 'Bearer admin'
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            // 顧客数を更新
            document.getElementById('total-customers').textContent = stats.totalCustomers || 0;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        
        // デモデータを表示
        document.getElementById('total-customers').textContent = '156';
    }
}

// ステータスラベルを取得
function getStatusLabel(status) {
    const labels = {
        confirmed: '確定',
        cancelled: 'キャンセル',
        completed: '完了'
    };
    return labels[status] || status;
}

// 売上グラフを初期化
function initSalesChart() {
    const ctx = document.getElementById('sales-chart');
    if (!ctx) return;
    
    // デモデータ
    const labels = ['月', '火', '水', '木', '金', '土', '日'];
    const data = [45000, 52000, 48000, 58000, 62000, 85000, 72000];
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '売上',
                data: data,
                borderColor: '#FF6B6B',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#FF6B6B',
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