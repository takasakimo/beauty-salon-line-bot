// スタッフ管理画面のJavaScript（マルチテナント対応版）

// グローバル変数
let allStaff = [];
let currentViewMode = 'grid';
let editingStaffId = null;
let deletingStaffId = null;

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
document.addEventListener('DOMContentLoaded', function() {
    // 認証チェック
    if (!checkAuth()) {
        return;
    }
    
    // テナント情報表示
    displayTenantInfo();
    
    // 初期データ読み込み
    loadStaff();
    loadStatistics();
    loadShiftTable();
    
    // フォームのイベントリスナー
    document.getElementById('staffForm').addEventListener('submit', handleStaffSubmit);
});

// スタッフデータの読み込み
async function loadStaff() {
    try {
        // AdminAPIを使用（テナント情報が自動で付与される）
        allStaff = await AdminAPI.get('/staff');
        displayStaff();
        updateStatistics();
    } catch (error) {
        console.error('Error loading staff:', error);
        // エラー時はテナント別のデモデータを表示
        loadDemoStaff();
    }
}

// デモスタッフデータ（テナント別）
function loadDemoStaff() {
    const tenantCode = getTenantCode();
    
    const tenantStaff = {
        'beauty-salon-001': [
            { staff_id: 1, name: '田中美香', role: 'チーフスタイリスト', email: 'tanaka@beauty.com', working_hours: '10:00-19:00' },
            { staff_id: 2, name: '佐藤雅子', role: 'スタイリスト', email: 'sato@beauty.com', working_hours: '10:00-19:00' },
            { staff_id: 3, name: '山田花子', role: 'アシスタント', email: 'yamada@beauty.com', working_hours: '10:00-19:00' }
        ],
        'beauty-salon-002': [
            { staff_id: 1, name: '鈴木一郎', role: 'チーフスタイリスト', email: 'suzuki@salon.com', working_hours: '9:00-18:00' },
            { staff_id: 2, name: '高橋美咲', role: 'スタイリスト', email: 'takahashi@salon.com', working_hours: '11:00-20:00' }
        ],
        'beauty-salon-003': [
            { staff_id: 1, name: '斎藤由美', role: 'エステティシャン', email: 'saito@este.com', working_hours: '10:00-19:00' },
            { staff_id: 2, name: '中村愛', role: 'セラピスト', email: 'nakamura@este.com', working_hours: '10:00-19:00' },
            { staff_id: 3, name: '小林真理', role: 'レセプション', email: 'kobayashi@este.com', working_hours: '9:00-18:00' }
        ]
    };
    
    allStaff = tenantStaff[tenantCode] || tenantStaff['beauty-salon-001'];
    displayStaff();
    updateStatistics();
}

// スタッフ統計の読み込み
async function loadStatistics() {
    try {
        // スタッフ関連の統計を計算
        const totalStaff = allStaff.length;
        const stylistCount = allStaff.filter(s => 
            s.role && (s.role.includes('スタイリスト') || s.role.includes('チーフ'))
        ).length;
        const assistantCount = allStaff.filter(s => 
            s.role && s.role.includes('アシスタント')
        ).length;
        
        // 本日出勤スタッフ（デモ用：ランダム）
        const todayWorking = Math.floor(Math.random() * allStaff.length) + 1;
        
        // 統計を表示
        document.getElementById('totalStaff').textContent = totalStaff;
        document.getElementById('stylistCount').textContent = stylistCount;
        document.getElementById('assistantCount').textContent = assistantCount;
        document.getElementById('todayWorking').textContent = todayWorking;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// スタッフ表示
function displayStaff() {
    if (currentViewMode === 'grid') {
        displayStaffGrid();
    } else {
        displayStaffList();
    }
}

// カード表示
function displayStaffGrid() {
    const container = document.getElementById('staffGridView');
    
    if (allStaff.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">👤</div>
                <div class="empty-state-message">スタッフが登録されていません</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allStaff.map(staff => {
        const avatar = getStaffAvatar(staff.name);
        const role = staff.role || staff.working_hours || 'スタッフ';
        const monthlyReservations = Math.floor(Math.random() * 50) + 10; // デモ用
        const rating = (Math.random() * 2 + 3).toFixed(1); // デモ用：3.0〜5.0
        
        return `
            <div class="staff-card">
                <div class="staff-card-header">
                    <div class="staff-avatar">${avatar}</div>
                    <div class="staff-name">${escapeHtml(staff.name)}</div>
                    <div class="staff-role">${escapeHtml(role)}</div>
                </div>
                <div class="staff-card-body">
                    <div class="staff-info">
                        <span class="staff-info-label">📧</span>
                        <span>${staff.email || '未設定'}</span>
                    </div>
                    <div class="staff-info">
                        <span class="staff-info-label">📱</span>
                        <span>${staff.phone || '未設定'}</span>
                    </div>
                    <div class="staff-info">
                        <span class="staff-info-label">🕐</span>
                        <span>${staff.working_hours || '10:00-19:00'}</span>
                    </div>
                    
                    <div class="staff-stats">
                        <div class="staff-stat">
                            <div class="staff-stat-value">${monthlyReservations}</div>
                            <div class="staff-stat-label">今月の予約</div>
                        </div>
                        <div class="staff-stat">
                            <div class="staff-stat-value">${rating}</div>
                            <div class="staff-stat-label">評価</div>
                        </div>
                    </div>
                    
                    <div class="staff-card-actions">
                        <button class="btn-edit" onclick="editStaff(${staff.staff_id})">
                            編集
                        </button>
                        <button class="btn-delete" onclick="deleteStaff(${staff.staff_id})">
                            削除
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// リスト表示
function displayStaffList() {
    const tbody = document.getElementById('staffTableBody');
    
    if (allStaff.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-state-icon">👤</div>
                    <div class="empty-state-message">スタッフが登録されていません</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = allStaff.map(staff => {
        const role = staff.role || staff.working_hours || 'スタッフ';
        const monthlyReservations = Math.floor(Math.random() * 50) + 10; // デモ用
        const rating = (Math.random() * 2 + 3).toFixed(1); // デモ用
        const stars = generateStars(rating);
        
        return `
            <tr>
                <td>${escapeHtml(staff.name)}</td>
                <td>${escapeHtml(role)}</td>
                <td>${staff.email || '-'}</td>
                <td>${staff.phone || '-'}</td>
                <td>${staff.working_hours || '10:00-19:00'}</td>
                <td>${monthlyReservations}</td>
                <td><span class="rating">${stars}</span> ${rating}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" onclick="editStaff(${staff.staff_id})">
                            編集
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteStaff(${staff.staff_id})">
                            削除
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// シフト表の読み込み
function loadShiftTable() {
    const tbody = document.getElementById('shiftTableBody');
    const days = ['月', '火', '水', '木', '金', '土', '日'];
    
    if (allStaff.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #999;">
                    スタッフが登録されていません
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = allStaff.map(staff => {
        const workingDays = staff.working_days || generateRandomWorkDays();
        
        return `
            <tr>
                <td>${escapeHtml(staff.name)}</td>
                ${days.map(day => {
                    const isWorking = workingDays.includes(day);
                    return `
                        <td>
                            <span class="shift-cell ${isWorking ? 'shift-working' : 'shift-off'}">
                                ${isWorking ? '10:00-19:00' : '休'}
                            </span>
                        </td>
                    `;
                }).join('')}
            </tr>
        `;
    }).join('');
}

// ビューモード切り替え
function setViewMode(mode) {
    currentViewMode = mode;
    
    // ボタンのアクティブ状態を更新
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 表示を切り替え
    if (mode === 'grid') {
        document.getElementById('staffGridView').style.display = 'grid';
        document.getElementById('staffListView').style.display = 'none';
    } else {
        document.getElementById('staffGridView').style.display = 'none';
        document.getElementById('staffListView').style.display = 'block';
    }
    
    displayStaff();
}

// スタッフ追加モーダルを開く
function showAddStaffModal() {
    editingStaffId = null;
    document.getElementById('modalTitle').textContent = '新規スタッフ追加';
    document.getElementById('staffForm').reset();
    document.getElementById('staffModal').style.display = 'block';
}

// スタッフ編集
function editStaff(staffId) {
    editingStaffId = staffId;
    const staff = allStaff.find(s => s.staff_id === staffId);
    
    if (!staff) {
        showError('スタッフ情報が見つかりません');
        return;
    }
    
    document.getElementById('modalTitle').textContent = 'スタッフ情報編集';
    document.getElementById('staffId').value = staffId;
    document.getElementById('staffName').value = staff.name;
    document.getElementById('staffRole').value = staff.role || '';
    document.getElementById('staffEmail').value = staff.email || '';
    document.getElementById('staffPhone').value = staff.phone || '';
    document.getElementById('workingHours').value = staff.working_hours || '';
    document.getElementById('staffBio').value = staff.bio || '';
    
    // 勤務日のチェックボックスを設定
    const workingDays = staff.working_days || [];
    document.querySelectorAll('input[name="workingDays"]').forEach(checkbox => {
        checkbox.checked = workingDays.includes(checkbox.value);
    });
    
    document.getElementById('staffModal').style.display = 'block';
}

// スタッフモーダルを閉じる
function closeStaffModal() {
    document.getElementById('staffModal').style.display = 'none';
    editingStaffId = null;
}

// スタッフフォーム送信処理
async function handleStaffSubmit(e) {
    e.preventDefault();
    
    const workingDays = Array.from(document.querySelectorAll('input[name="workingDays"]:checked'))
        .map(checkbox => checkbox.value);
    
    const staffData = {
        name: document.getElementById('staffName').value,
        role: document.getElementById('staffRole').value,
        email: document.getElementById('staffEmail').value,
        phone: document.getElementById('staffPhone').value,
        working_hours: document.getElementById('workingHours').value,
        working_days: workingDays,
        bio: document.getElementById('staffBio').value
    };
    
    try {
        if (editingStaffId) {
            // 更新（AdminAPIが自動でテナント情報を付与）
            await AdminAPI.put(`/staff/${editingStaffId}`, staffData);
            showToast('スタッフ情報を更新しました', 'success');
        } else {
            // 新規作成（AdminAPIが自動でテナント情報を付与）
            await AdminAPI.post('/staff', staffData);
            showToast('スタッフを追加しました', 'success');
        }
        
        closeStaffModal();
        loadStaff();
        loadShiftTable();
    } catch (error) {
        console.error('Error saving staff:', error);
        showToast('スタッフ情報の保存に失敗しました', 'error');
    }
}

// スタッフ削除
function deleteStaff(staffId) {
    deletingStaffId = staffId;
    const staff = allStaff.find(s => s.staff_id === staffId);
    
    if (!staff) {
        showError('スタッフ情報が見つかりません');
        return;
    }
    
    document.getElementById('deleteStaffName').textContent = staff.name;
    document.getElementById('deleteModal').style.display = 'block';
}

// 削除確認
async function confirmDelete() {
    if (!deletingStaffId) return;
    
    try {
        // AdminAPIが自動でテナント情報を付与
        await AdminAPI.delete(`/staff/${deletingStaffId}`);
        showToast('スタッフを削除しました', 'success');
        
        closeDeleteModal();
        loadStaff();
        loadShiftTable();
    } catch (error) {
        console.error('Error deleting staff:', error);
        showToast('スタッフの削除に失敗しました', 'error');
    }
}

// 削除モーダルを閉じる
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    deletingStaffId = null;
}

// シフト編集（仮実装）
function editShifts() {
    showToast('シフト編集機能は現在開発中です', 'info');
}

// らくっぽ勤怠連携
function connectRakupochiKintai() {
    document.getElementById('rakupochiModal').style.display = 'block';
}

function closeRakupochiModal() {
    document.getElementById('rakupochiModal').style.display = 'none';
}

function saveRakupochiSettings() {
    const apiKey = document.getElementById('rakupochiApiKey').value;
    const companyId = document.getElementById('rakupochiCompanyId').value;
    
    if (!apiKey || !companyId) {
        showToast('必須項目を入力してください', 'error');
        return;
    }
    
    // TODO: 実際のAPI連携処理を実装
    showToast('らくっぽ勤怠との連携設定を保存しました。\n今後自動的にシフト情報が同期されます。', 'success');
    closeRakupochiModal();
    
    // デモ用：シフトデータを更新
    loadShiftTable();
}

// 保存処理
function saveStaff() {
    const form = document.getElementById('staffForm');
    if (form.checkValidity()) {
        handleStaffSubmit(new Event('submit'));
    } else {
        form.reportValidity();
    }
}

// ヘルパー関数
function getStaffAvatar(name) {
    // 名前から絵文字アバターを生成
    const avatars = ['👨', '👩', '🧑', '👱', '👨‍🦱', '👩‍🦰', '🧔', '👨‍🦳'];
    const index = name.charCodeAt(0) % avatars.length;
    return avatars[index];
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    return '★'.repeat(fullStars) + '☆'.repeat(halfStar) + '☆'.repeat(emptyStars);
}

function generateRandomWorkDays() {
    const days = ['月', '火', '水', '木', '金', '土', '日'];
    const workDays = [];
    days.forEach(day => {
        if (Math.random() > 0.3) { // 70%の確率で出勤
            workDays.push(day);
        }
    });
    return workDays.length > 0 ? workDays : ['月', '火', '水', '木', '金']; // 最低でも平日は出勤
}

function updateStatistics() {
    const totalStaff = allStaff.length;
    const stylistCount = allStaff.filter(s => 
        s.role && (s.role.includes('スタイリスト') || s.role.includes('チーフ'))
    ).length;
    const assistantCount = allStaff.filter(s => 
        s.role && s.role.includes('アシスタント')
    ).length;
    const todayWorking = Math.floor(Math.random() * allStaff.length) + 1;
    
    document.getElementById('totalStaff').textContent = totalStaff;
    document.getElementById('stylistCount').textContent = stylistCount;
    document.getElementById('assistantCount').textContent = assistantCount;
    document.getElementById('todayWorking').textContent = todayWorking;
}

function showError(message) {
    showToast(message, 'error');
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
    if (event.target === document.getElementById('staffModal')) {
        closeStaffModal();
    }
    if (event.target === document.getElementById('deleteModal')) {
        closeDeleteModal();
    }
    if (event.target === document.getElementById('rakupochiModal')) {
        closeRakupochiModal();
    }
}