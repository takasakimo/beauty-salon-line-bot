// グローバル変数
let allMenus = [];
let currentFilter = 'all';
let editingMenuId = null;
let deleteTargetId = null;

// カテゴリーマッピング
const categoryMap = {
    1: 'cut',
    2: 'color',
    3: 'perm',
    4: 'treatment',
    5: 'treatment',
    6: 'color',
    7: 'perm',
    8: 'other'
};

const categoryNames = {
    'cut': 'カット',
    'color': 'カラー',
    'perm': 'パーマ',
    'treatment': 'トリートメント',
    'other': 'その他'
};

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadMenus();
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('データの読み込みに失敗しました', 'error');
    }
});

// メニュー一覧を読み込み
async function loadMenus() {
    try {
        const response = await fetch('/api/menus');
        
        if (response.ok) {
            allMenus = await response.json();
            displayMenus();
            updateCounts();
        } else {
            throw new Error('Failed to load menus');
        }
    } catch (error) {
        console.error('Error loading menus:', error);
        displayDemoMenus();
    }
}

// メニューを表示
function displayMenus() {
    const tbody = document.getElementById('menu-list');
    
    const filteredMenus = currentFilter === 'all' 
        ? allMenus 
        : allMenus.filter(menu => getCategoryFromId(menu.menu_id) === currentFilter);
    
    if (filteredMenus.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">メニューがありません</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredMenus.map(menu => {
        const category = getCategoryFromId(menu.menu_id);
        const categoryName = categoryNames[category] || 'その他';
        
        return `
            <tr>
                <td>${menu.menu_id}</td>
                <td><strong>${menu.name}</strong></td>
                <td>
                    <span class="category-badge category-${category}">
                        ${categoryName}
                    </span>
                </td>
                <td>¥${menu.price.toLocaleString()}</td>
                <td>${menu.duration}分</td>
                <td>
                    <span class="status-badge status-active">
                        有効
                    </span>
                </td>
                <td>
                    <div class="reservation-count">
                        <span class="count-badge ${menu.menu_id === 6 ? 'popular' : ''}">
                            ${getReservationCount(menu.menu_id)}件
                        </span>
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="editMenu(${menu.menu_id})">
                            編集
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteMenu(${menu.menu_id})">
                            削除
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// デモメニューを表示
function displayDemoMenus() {
    allMenus = [
        { menu_id: 1, name: 'カット', price: 4000, duration: 60 },
        { menu_id: 2, name: 'カラー', price: 6000, duration: 90 },
        { menu_id: 3, name: 'パーマ', price: 8000, duration: 120 },
        { menu_id: 4, name: 'トリートメント', price: 3000, duration: 30 },
        { menu_id: 5, name: 'ヘッドスパ', price: 4500, duration: 45 },
        { menu_id: 6, name: 'カット+カラー', price: 9000, duration: 120 },
        { menu_id: 7, name: 'カット+パーマ', price: 11000, duration: 150 },
        { menu_id: 8, name: 'フルコース', price: 13000, duration: 180 }
    ];
    
    displayMenus();
    updateCounts();
}

// カテゴリーを取得
function getCategoryFromId(menuId) {
    return categoryMap[menuId] || 'other';
}

// 予約数を取得（デモ用）
function getReservationCount(menuId) {
    const counts = { 1: 45, 2: 38, 3: 25, 4: 20, 5: 15, 6: 52, 7: 18, 8: 12 };
    return counts[menuId] || 0;
}

// カウントを更新
function updateCounts() {
    const counts = {
        all: allMenus.length,
        cut: 0,
        color: 0,
        perm: 0,
        treatment: 0
    };
    
    allMenus.forEach(menu => {
        const category = getCategoryFromId(menu.menu_id);
        if (counts[category] !== undefined) {
            counts[category]++;
        }
    });
    
    Object.keys(counts).forEach(key => {
        const element = document.getElementById(`count-${key}`);
        if (element) {
            element.textContent = counts[key];
        }
    });
}

// フィルター
function filterMenus(category) {
    currentFilter = category;
    
    // タブのアクティブ状態を更新
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    displayMenus();
}

// メニュー追加モーダルを開く
function openAddMenuModal() {
    editingMenuId = null;
    document.getElementById('modal-title').textContent = '新規メニュー追加';
    document.getElementById('menu-form').reset();
    document.getElementById('menu-modal').style.display = 'flex';
}

// メニュー編集
function editMenu(menuId) {
    editingMenuId = menuId;
    const menu = allMenus.find(m => m.menu_id === menuId);
    
    if (!menu) return;
    
    document.getElementById('modal-title').textContent = 'メニュー編集';
    document.getElementById('menu-id').value = menu.menu_id;
    document.getElementById('menu-name').value = menu.name;
    document.getElementById('menu-category').value = getCategoryFromId(menu.menu_id);
    document.getElementById('menu-price').value = menu.price;
    document.getElementById('menu-duration').value = menu.duration;
    document.getElementById('menu-status').value = 'active';
    
    document.getElementById('menu-modal').style.display = 'flex';
}

// メニューモーダルを閉じる
function closeMenuModal() {
    document.getElementById('menu-modal').style.display = 'none';
    editingMenuId = null;
}

// メニューを保存
async function saveMenu() {
    const form = document.getElementById('menu-form');
    const formData = new FormData(form);
    
    const menuData = {
        name: formData.get('name'),
        category: formData.get('category'),
        price: parseInt(formData.get('price')),
        duration: parseInt(formData.get('duration')),
        description: formData.get('description'),
        notes: formData.get('notes'),
        status: formData.get('status')
    };
    
    // バリデーション
    if (!menuData.name || !menuData.category || !menuData.price || !menuData.duration) {
        showToast('必須項目を入力してください', 'error');
        return;
    }
    
    try {
        if (editingMenuId) {
            // 更新
            const response = await AdminAPI.put(`/menus/${editingMenuId}`, menuData);
            showToast('メニューを更新しました', 'success');
        } else {
            // 新規作成
            const response = await AdminAPI.post('/menus', menuData);
            showToast('メニューを追加しました', 'success');
        }
        
        closeMenuModal();
        await loadMenus();
        
    } catch (error) {
        console.error('Save error:', error);
        showToast('保存に失敗しました', 'error');
    }
}

// メニュー削除
function deleteMenu(menuId) {
    deleteTargetId = menuId;
    const menu = allMenus.find(m => m.menu_id === menuId);
    
    if (!menu) return;
    
    document.getElementById('delete-menu-info').innerHTML = `
        <p><strong>メニュー名:</strong> ${menu.name}</p>
        <p><strong>価格:</strong> ¥${menu.price.toLocaleString()}</p>
        <p><strong>予約数:</strong> ${getReservationCount(menuId)}件</p>
    `;
    
    document.getElementById('delete-modal').style.display = 'flex';
}

// 削除モーダルを閉じる
function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
    deleteTargetId = null;
}

// 削除を確定
async function confirmDelete() {
    if (!deleteTargetId) return;
    
    try {
        await AdminAPI.delete(`/menus/${deleteTargetId}`);
        showToast('メニューを削除しました', 'success');
        
        closeDeleteModal();
        await loadMenus();
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast('削除に失敗しました', 'error');
    }
}

// モーダルの外側クリックで閉じる
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});