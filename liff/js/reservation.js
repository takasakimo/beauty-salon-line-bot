// 予約情報を保持するオブジェクト
let reservationData = {
    menu_id: null,
    menu_name: null,
    menu_price: null,
    menu_duration: null,
    staff_id: null,
    staff_name: null,
    reservation_date: null,
    reservation_time: null
};

// 現在のステップ
let currentStep = 1;

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('予約ページ初期化開始');
    
    try {
        // テナント情報の確認
        if (!window.currentTenant) {
            console.error('テナント情報が見つかりません');
            alert('店舗情報が見つかりません。\nホーム画面から再度アクセスしてください。');
            window.location.href = './index.html';
            return;
        }
        
        // サロン名を表示
        document.getElementById('salon-name').textContent = window.currentTenant.salon_name;
        
        // LIFF初期化を待つ
        if (typeof liff !== 'undefined' && liff.isLoggedIn && liff.isLoggedIn()) {
            console.log('LIFF初期化済み、メニュー読み込み開始');
            await loadMenus();
        } else {
            console.log('LIFF初期化待ち...');
            // LIFF初期化完了を待つ
            const maxWait = 50; // 5秒
            let waitCount = 0;
            
            const checkLiff = setInterval(async () => {
                waitCount++;
                if (typeof liff !== 'undefined' && liff.isLoggedIn && liff.isLoggedIn()) {
                    clearInterval(checkLiff);
                    console.log('LIFF初期化完了、メニュー読み込み開始');
                    await loadMenus();
                } else if (waitCount >= maxWait) {
                    clearInterval(checkLiff);
                    console.log('LIFF初期化タイムアウト、メニュー読み込み続行');
                    await loadMenus();
                }
            }, 100);
        }
        
        // イベントリスナーを設定
        setupEventListeners();
        
    } catch (error) {
        console.error('初期化エラー:', error);
        alert('ページの初期化に失敗しました。\n' + error.message);
    }
});

// イベントリスナーを設定
function setupEventListeners() {
    // ステップ遷移ボタン
    document.getElementById('next-to-step2').addEventListener('click', () => {
        goToStep(2);
        loadStaff();
    });
    
    document.getElementById('back-to-step1').addEventListener('click', () => {
        goToStep(1);
    });
    
    document.getElementById('next-to-step3').addEventListener('click', () => {
        goToStep(3);
        loadAvailableDates();
    });
    
    document.getElementById('back-to-step2').addEventListener('click', () => {
        goToStep(2);
    });
    
    document.getElementById('next-to-step4').addEventListener('click', () => {
        goToStep(4);
        showConfirmation();
    });
    
    document.getElementById('back-to-step3').addEventListener('click', () => {
        goToStep(3);
    });
    
    document.getElementById('confirm-reservation').addEventListener('click', confirmReservation);
}

// メニュー一覧を読み込み
async function loadMenus() {
    console.log('メニュー読み込み開始');
    const menuList = document.getElementById('menu-list');
    
    try {
        const response = await apiCall('/api/menus', 'GET');
        
        if (!response || !Array.isArray(response)) {
            throw new Error('メニューデータが無効です');
        }
        
        console.log('メニュー取得成功:', response);
        menuList.innerHTML = '';
        
        if (response.length === 0) {
            menuList.innerHTML = '<div class="no-data">メニューが登録されていません</div>';
            return;
        }
        
        response.forEach(menu => {
            const menuCard = document.createElement('div');
            menuCard.className = 'menu-card';
            menuCard.innerHTML = `
                <div class="menu-name">${menu.name}</div>
                <div class="menu-details">
                    <span class="menu-duration">${menu.duration}分</span>
                    <span class="menu-price">¥${menu.price.toLocaleString()}</span>
                </div>
                <div class="menu-description">${menu.description || ''}</div>
            `;
            menuCard.addEventListener('click', () => selectMenu(menu));
            menuList.appendChild(menuCard);
        });
    } catch (error) {
        console.error('メニュー読み込みエラー:', error);
        menuList.innerHTML = '<div class="error">メニューの読み込みに失敗しました</div>';
    }
}

// メニューを選択
function selectMenu(menu) {
    console.log('メニュー選択:', menu);
    
    // 選択状態をクリア
    document.querySelectorAll('.menu-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 選択したカードにクラスを追加
    event.currentTarget.classList.add('selected');
    
    // 予約データを更新
    reservationData.menu_id = menu.menu_id;
    reservationData.menu_name = menu.name;
    reservationData.menu_price = menu.price;
    reservationData.menu_duration = menu.duration;
    
    // 次へボタンを表示
    document.getElementById('next-to-step2').style.display = 'block';
}

// スタッフ一覧を読み込み
async function loadStaff() {
    console.log('スタッフ読み込み開始');
    const staffList = document.getElementById('staff-list');
    
    try {
        const response = await apiCall('/api/staff', 'GET');
        
        if (!response || !Array.isArray(response)) {
            throw new Error('スタッフデータが無効です');
        }
        
        console.log('スタッフ取得成功:', response);
        staffList.innerHTML = '';
        
        if (response.length === 0) {
            staffList.innerHTML = '<div class="no-data">スタッフが登録されていません</div>';
            return;
        }
        
        response.forEach(staff => {
            const staffCard = document.createElement('div');
            staffCard.className = 'staff-card';
            staffCard.innerHTML = `
                <div class="staff-avatar">${staff.name.charAt(0)}</div>
                <div class="staff-info">
                    <div class="staff-name">${staff.name}</div>
                    <div class="staff-role">${staff.position || 'スタッフ'}</div>
                </div>
            `;
            staffCard.addEventListener('click', () => selectStaff(staff));
            staffList.appendChild(staffCard);
        });
    } catch (error) {
        console.error('スタッフ読み込みエラー:', error);
        staffList.innerHTML = '<div class="error">スタッフ情報の読み込みに失敗しました</div>';
    }
}

// スタッフを選択
function selectStaff(staff) {
    console.log('スタッフ選択:', staff);
    
    // 選択状態をクリア
    document.querySelectorAll('.staff-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 選択したカードにクラスを追加
    event.currentTarget.classList.add('selected');
    
    // 予約データを更新
    reservationData.staff_id = staff.staff_id;
    reservationData.staff_name = staff.name;
    
    // 次へボタンを表示
    document.getElementById('next-to-step3').style.display = 'block';
}

// 利用可能な日付を読み込み
async function loadAvailableDates() {
    console.log('日付読み込み開始');
    const dateList = document.getElementById('date-list');
    
    try {
        // 今日から30日先まで生成
        const dates = [];
        const today = new Date();
        
        for (let i = 1; i <= 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            // 日曜日は除外（美容室の一般的な定休日）
            if (date.getDay() !== 0) {
                dates.push(date);
            }
        }
        
        dateList.innerHTML = '';
        
        dates.forEach(date => {
            const dateCard = document.createElement('div');
            dateCard.className = 'date-card';
            
            const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
            const month = date.getMonth() + 1;
            const day = date.getDate();
            
            dateCard.innerHTML = `
                <div class="date-month">${month}月</div>
                <div class="date-day">${day}</div>
                <div class="date-dayofweek">${dayOfWeek}</div>
            `;
            
            dateCard.addEventListener('click', () => selectDate(date));
            dateList.appendChild(dateCard);
        });
        
    } catch (error) {
        console.error('日付読み込みエラー:', error);
        dateList.innerHTML = '<div class="error">日付の読み込みに失敗しました</div>';
    }
}

// 日付を選択
function selectDate(date) {
    console.log('日付選択:', date);
    
    // 選択状態をクリア
    document.querySelectorAll('.date-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 選択したカードにクラスを追加
    event.currentTarget.classList.add('selected');
    
    // 予約データを更新
    reservationData.reservation_date = formatDate(date);
    
    // 時間選択を表示
    loadTimeSlots(date);
}

// 時間スロットを読み込み
async function loadTimeSlots(selectedDate) {
    console.log('時間スロット読み込み開始');
    const timeSelection = document.querySelector('.time-selection');
    const timeList = document.getElementById('time-list');
    
    try {
        // 営業時間（10:00-19:00）のスロットを生成
        const timeSlots = [];
        for (let hour = 10; hour < 19; hour++) {
            timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
            timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        
        timeList.innerHTML = '';
        
        timeSlots.forEach(time => {
            const timeCard = document.createElement('div');
            timeCard.className = 'time-card';
            timeCard.textContent = time;
            timeCard.addEventListener('click', () => selectTime(time));
            timeList.appendChild(timeCard);
        });
        
        // 時間選択エリアを表示
        timeSelection.style.display = 'block';
        
    } catch (error) {
        console.error('時間スロット読み込みエラー:', error);
        timeList.innerHTML = '<div class="error">時間の読み込みに失敗しました</div>';
    }
}

// 時間を選択
function selectTime(time) {
    console.log('時間選択:', time);
    
    // 選択状態をクリア
    document.querySelectorAll('.time-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 選択したカードにクラスを追加
    event.currentTarget.classList.add('selected');
    
    // 予約データを更新
    reservationData.reservation_time = time;
    
    // 次へボタンを表示
    document.getElementById('next-to-step4').style.display = 'block';
}

// 確認画面を表示
function showConfirmation() {
    console.log('確認画面表示');
    
    const date = new Date(reservationData.reservation_date);
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const dateString = `${date.getMonth() + 1}月${date.getDate()}日(${dayOfWeek})`;
    
    document.getElementById('summary-menu').textContent = reservationData.menu_name;
    document.getElementById('summary-staff').textContent = reservationData.staff_name;
    document.getElementById('summary-datetime').textContent = `${dateString} ${reservationData.reservation_time}`;
    document.getElementById('summary-price').textContent = `¥${reservationData.menu_price.toLocaleString()}`;
}

// 予約を確定
async function confirmReservation() {
    console.log('予約確定開始');
    const confirmButton = document.getElementById('confirm-reservation');
    confirmButton.disabled = true;
    confirmButton.textContent = '予約処理中...';
    
    try {
        // ユーザー情報を確認
        let userId = null;
        if (window.userProfile && window.userProfile.userId) {
            userId = window.userProfile.userId;
        } else if (typeof liff !== 'undefined' && liff.isLoggedIn && liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            userId = profile.userId;
        }
        
        if (!userId) {
            throw new Error('ユーザー情報が取得できません');
        }
        
        // 日時を結合
        const [hours, minutes] = reservationData.reservation_time.split(':');
        const reservationDateTime = new Date(reservationData.reservation_date);
        reservationDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
        
        // 予約を作成
        const reservationRequest = {
            customer_id: userId,
            staff_id: reservationData.staff_id,
            menu_id: reservationData.menu_id,
            reservation_date: reservationDateTime.toISOString(),
            notes: ''
        };
        
        console.log('予約リクエスト:', reservationRequest);
        
        const response = await apiCall('/api/reservations', 'POST', reservationRequest);
        
        if (response && response.success) {
            console.log('予約作成成功');
            showCompletion();
        } else {
            throw new Error(response.error || '予約の作成に失敗しました');
        }
        
    } catch (error) {
        console.error('予約確定エラー:', error);
        alert('予約の確定に失敗しました。\n' + error.message);
        confirmButton.disabled = false;
        confirmButton.textContent = '予約を確定する';
    }
}

// 完了画面を表示
function showCompletion() {
    console.log('完了画面表示');
    
    // すべてのステップを非表示
    document.querySelectorAll('.step-content').forEach(step => {
        step.classList.remove('active');
    });
    
    // 完了画面を表示
    document.getElementById('completion').classList.add('active');
    
    // ステップインジケーターを非表示
    document.querySelector('.step-indicator').style.display = 'none';
}

// ステップ遷移
function goToStep(stepNumber) {
    console.log('ステップ遷移:', stepNumber);
    
    // すべてのステップを非表示
    document.querySelectorAll('.step-content').forEach(step => {
        step.classList.remove('active');
    });
    
    // ステップインジケーターを更新
    document.querySelectorAll('.step').forEach((step, index) => {
        if (index < stepNumber) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    // 対象のステップを表示
    const stepIds = ['', 'step1', 'step2', 'step3', 'step4'];
    const targetStep = document.getElementById(stepIds[stepNumber]);
    if (targetStep) {
        targetStep.classList.add('active');
    }
    
    currentStep = stepNumber;
    
    // 次へボタンの状態をリセット
    const nextButtons = ['next-to-step2', 'next-to-step3', 'next-to-step4'];
    nextButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.style.display = 'none';
        }
    });
}

// 日付フォーマット（YYYY-MM-DD）
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}