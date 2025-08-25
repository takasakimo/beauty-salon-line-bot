// メニューデータを保持
let allMenus = [];
let currentCategory = 'all';

// LIFF初期化を待つ
function waitForLiff() {
    return new Promise((resolve) => {
        const checkLiff = setInterval(() => {
            if (typeof liff !== 'undefined' && liff.isLoggedIn && liff.isLoggedIn()) {
                clearInterval(checkLiff);
                resolve();
            }
        }, 100);
        
        // 10秒でタイムアウト
        setTimeout(() => {
            clearInterval(checkLiff);
            resolve();
        }, 10000);
    });
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // テナント情報を初期化（重要！）
        const tenantInfo = TenantManager.initialize();
        
        // テナント情報がない場合はエラー表示
        if (!tenantInfo) {
            console.error('テナント情報が見つかりません');
            document.getElementById('loading').innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h2 style="color: #ff6b6b;">アクセスエラー</h2>
                    <p>店舗情報が見つかりません</p>
                    <p style="font-size: 14px; color: #666; margin-top: 20px;">
                        お店から提供されたQRコードまたはリンクから<br>
                        もう一度アクセスしてください
                    </p>
                </div>
            `;
            return;
        }
        
        console.log('現在のテナント:', tenantInfo.code);
        
        // LIFF初期化を待つ
        await waitForLiff();
        
        // メニュー一覧を読み込み
        await loadMenus();
        
        // コンテンツを表示
        document.getElementById('loading').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        
    } catch (error) {
        console.error('初期化エラー:', error);
        alert('ページの初期化に失敗しました。\n' + error.message);
    }
});

// メニュー一覧を読み込み（テナント別）
async function loadMenus() {
    try {
        // テナントコードをヘッダーに追加
        const tenantHeaders = TenantManager.getHeaders();
        
        const response = await fetch('/api/menus', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...tenantHeaders  // テナント情報を追加
            }
        });
        
        if (!response.ok) {
            throw new Error('メニューの取得に失敗しました');
        }
        
        allMenus = await response.json();
        
        // メニューが空の場合
        if (!allMenus || allMenus.length === 0) {
            document.getElementById('menu-list').innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <p>現在、メニュー情報を準備中です。</p>
                    <p style="font-size: 14px; margin-top: 10px;">恐れ入りますが、しばらくお待ちください。</p>
                </div>
            `;
            return;
        }
        
        // カテゴリータブを生成
        generateCategoryTabs();
        
        // メニューを表示
        displayMenus();
        
    } catch (error) {
        console.error('メニュー読み込みエラー:', error);
        alert('メニューの読み込みに失敗しました。');
    }
}

// カテゴリータブを動的に生成
function generateCategoryTabs() {
    const categoryContainer = document.getElementById('category-tabs');
    if (!categoryContainer) return;
    
    // 存在するカテゴリーを抽出
    const existingCategories = new Set();
    allMenus.forEach(menu => {
        if (menu.category) {
            existingCategories.add(menu.category);
        }
    });
    
    // タブのHTML を生成
    let tabsHTML = '<button class="category-tab active" onclick="filterByCategory(\'all\')">すべて</button>';
    
    // カテゴリー名の日本語マッピング
    const categoryNames = {
        'cut': 'カット',
        'color': 'カラー',
        'perm': 'パーマ',
        'treatment': 'トリートメント',
        'spa': 'スパ',
        'set': 'セットメニュー',
        'special': '特別メニュー'
    };
    
    existingCategories.forEach(category => {
        const displayName = categoryNames[category] || category;
        tabsHTML += `<button class="category-tab" onclick="filterByCategory('${category}')">${displayName}</button>`;
    });
    
    categoryContainer.innerHTML = tabsHTML;
}

// メニューを表示（テナント別対応）
function displayMenus() {
    const menuList = document.getElementById('menu-list');
    menuList.innerHTML = '';
    
    allMenus.forEach((menu, index) => {
        const menuCard = createMenuCard(menu, index);
        menuList.appendChild(menuCard);
    });
}

// メニューカードを作成（テナント別対応）
function createMenuCard(menu, index) {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.dataset.category = menu.category || 'all';
    
    // メニューアイコンを設定（カテゴリーに基づく）
    const iconMap = {
        'cut': '✂️',
        'color': '🎨',
        'perm': '🌊',
        'treatment': '💆‍♀️',
        'spa': '🧖‍♀️',
        'set': '✨',
        'special': '👑'
    };
    
    const menuIcon = iconMap[menu.category] || '💇‍♀️';
    
    // 人気メニューフラグ（is_popularフィールドがある場合）
    const isPopular = menu.is_popular || false;
    
    // 価格表示（割引がある場合の対応）
    let priceDisplay = `¥${menu.price.toLocaleString()}`;
    if (menu.discount_price && menu.discount_price < menu.price) {
        priceDisplay = `
            <span style="text-decoration: line-through; color: #999; font-size: 0.9em;">
                ¥${menu.price.toLocaleString()}
            </span>
            <span style="color: #ff6b6b; font-weight: bold;">
                ¥${menu.discount_price.toLocaleString()}
            </span>
        `;
    }
    
    card.innerHTML = `
        <div class="menu-image">
            ${menuIcon}
            ${isPopular ? '<span class="menu-badge">人気</span>' : ''}
            ${menu.is_new ? '<span class="menu-badge new">NEW</span>' : ''}
        </div>
        <div class="menu-info">
            ${isPopular ? '<span class="popular-badge">🌟 人気メニュー</span>' : ''}
            <div class="menu-header">
                <h3 class="menu-name">${menu.name}</h3>
                <span class="menu-price">${priceDisplay}</span>
            </div>
            <p class="menu-description">
                ${menu.description || 'プロのスタイリストが丁寧に施術いたします。'}
            </p>
            <div class="menu-details">
                <div class="detail-item">
                    <span class="detail-icon">⏱</span>
                    <span>${menu.duration}分</span>
                </div>
                ${menu.staff_name ? `
                    <div class="detail-item">
                        <span class="detail-icon">👤</span>
                        <span>${menu.staff_name}</span>
                    </div>
                ` : `
                    <div class="detail-item">
                        <span class="detail-icon">📍</span>
                        <span>全スタッフ対応可</span>
                    </div>
                `}
            </div>
            ${menu.notes ? `
                <div class="menu-notes">
                    <small>※ ${menu.notes}</small>
                </div>
            ` : ''}
        </div>
    `;
    
    // クリックで予約画面へ
    card.onclick = () => {
        if (confirm(`「${menu.name}」を予約しますか？`)) {
            // 選択したメニュー情報をセッションストレージに保存
            sessionStorage.setItem('selectedMenu', JSON.stringify(menu));
            // テナント情報も保存
            sessionStorage.setItem('currentTenant', TenantManager.getTenantCode());
            window.location.href = './reservation.html';
        }
    };
    
    return card;
}

// カテゴリーでフィルタリング
function filterByCategory(category) {
    currentCategory = category;
    
    // タブのアクティブ状態を更新
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // メニューカードの表示/非表示を切り替え
    document.querySelectorAll('.menu-card').forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
            card.style.display = 'block';
            // アニメーション
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 10);
        } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.display = 'none';
            }, 300);
        }
    });
}

// アニメーション用のスタイル追加
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .menu-card {
            opacity: 1;
            transform: translateY(0);
            transition: opacity 0.3s ease, transform 0.3s ease;
        }
        
        .menu-badge {
            position: absolute;
            top: 5px;
            right: 5px;
            background: #ff6b6b;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        }
        
        .menu-badge.new {
            background: #4CAF50;
        }
        
        .menu-notes {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #eee;
            color: #666;
        }
        
        #category-tabs {
            display: flex;
            gap: 10px;
            overflow-x: auto;
            padding: 10px;
            margin-bottom: 20px;
        }
        
        .category-tab {
            padding: 8px 16px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 20px;
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .category-tab.active {
            background: #ff6b6b;
            color: white;
            border-color: #ff6b6b;
        }
    `;
    document.head.appendChild(style);
});

// デバッグ用：現在のテナント情報を確認
console.log('Menu Module Loaded - Current Tenant:', TenantManager.getTenantCode());