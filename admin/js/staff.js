<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>スタッフ管理 - らくポチビューティー管理画面</title>
    
    <!-- スタイルシート -->
    <link rel="stylesheet" href="./css/admin-common.css">
    <link rel="stylesheet" href="./css/staff.css">
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body>
    <!-- サイドバー -->
    <aside class="sidebar">
        <div class="sidebar-header">
            <h2>らくポチビューティー</h2>
            <p>管理画面</p>
        </div>
        
        <nav class="sidebar-nav">
            <a href="./dashboard.html" class="nav-item">
                <span class="nav-icon">📊</span>
                <span>ダッシュボード</span>
            </a>
            <a href="./reservations.html" class="nav-item">
                <span class="nav-icon">📅</span>
                <span>予約管理</span>
            </a>
            <a href="./customers.html" class="nav-item">
                <span class="nav-icon">👥</span>
                <span>顧客管理</span>
            </a>
            <a href="./menus.html" class="nav-item">
                <span class="nav-icon">💇‍♀️</span>
                <span>メニュー管理</span>
            </a>
            <a href="./staff.html" class="nav-item active">
                <span class="nav-icon">👨‍💼</span>
                <span>スタッフ管理</span>
            </a>
            <a href="./analytics.html" class="nav-item">
                <span class="nav-icon">📈</span>
                <span>売上分析</span>
            </a>
        </nav>
        
        <div class="sidebar-footer">
            <button onclick="logout()" class="btn btn-logout">
                ログアウト
            </button>
        </div>
    </aside>
    
    <!-- メインコンテンツ -->
    <main class="main-content">
        <!-- ヘッダー -->
        <header class="content-header">
            <h1>スタッフ管理</h1>
            <div class="header-actions">
                <span id="current-date"></span>
                <button class="btn btn-primary" onclick="showAddStaffModal()">
                    + 新規スタッフ追加
                </button>
            </div>
        </header>
        
        <!-- スタッフ管理コンテンツ -->
        <div class="staff-management">
            <!-- スタッフ統計 -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        👥
                    </div>
                    <div class="stat-info">
                        <h3>総スタッフ数</h3>
                        <p class="stat-value" id="totalStaff">0</p>
                        <span class="stat-change">全スタッフ</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        ⭐
                    </div>
                    <div class="stat-info">
                        <h3>スタイリスト</h3>
                        <p class="stat-value" id="stylistCount">0</p>
                        <span class="stat-change">チーフ含む</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                        🎯
                    </div>
                    <div class="stat-info">
                        <h3>アシスタント</h3>
                        <p class="stat-value" id="assistantCount">0</p>
                        <span class="stat-change">研修中含む</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                        📅
                    </div>
                    <div class="stat-info">
                        <h3>本日出勤</h3>
                        <p class="stat-value" id="todayWorking">0</p>
                        <span class="stat-change">現在稼働中</span>
                    </div>
                </div>
            </div>

            <!-- スタッフ一覧 -->
            <div class="dashboard-section">
                <div class="section-header">
                    <h2>スタッフ一覧</h2>
                    <div class="view-toggle">
                        <button class="view-btn active" onclick="setViewMode('grid')">
                            📱 カード表示
                        </button>
                        <button class="view-btn" onclick="setViewMode('list')">
                            📋 リスト表示
                        </button>
                    </div>
                </div>

                <!-- カード表示 -->
                <div id="staffGridView" class="staff-grid">
                    <!-- JavaScriptで動的に生成 -->
                </div>

                <!-- リスト表示 -->
                <div id="staffListView" class="view-container" style="display: none;">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>スタッフ名</th>
                                    <th>役職</th>
                                    <th>メールアドレス</th>
                                    <th>電話番号</th>
                                    <th>勤務時間</th>
                                    <th>今月の予約数</th>
                                    <th>評価</th>
                                    <th>アクション</th>
                                </tr>
                            </thead>
                            <tbody id="staffTableBody">
                                <!-- JavaScriptで動的に生成 -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- シフト表セクション -->
            <div class="dashboard-section">
                <div class="section-header">
                    <h2>今週のシフト</h2>
                    <div class="header-actions">
                        <button class="btn btn-secondary" onclick="connectRakupochiKintai()">
                            🔄 らくポチ勤怠と連携
                        </button>
                        <button class="btn btn-secondary" onclick="editShifts()">
                            ✏️ 手動編集
                        </button>
                    </div>
                </div>
                <div class="shift-notice">
                    ℹ️ シフト情報は「らくポチ勤怠」と自動連携予定です
                </div>
                <div class="table-container">
                    <table class="shift-table">
                        <thead>
                            <tr>
                                <th>スタッフ</th>
                                <th>月</th>
                                <th>火</th>
                                <th>水</th>
                                <th>木</th>
                                <th>金</th>
                                <th>土</th>
                                <th>日</th>
                            </tr>
                        </thead>
                        <tbody id="shiftTableBody">
                            <!-- JavaScriptで動的に生成 -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </main>

    <!-- スタッフ追加/編集モーダル -->
    <div id="staffModal" class="modal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">新規スタッフ追加</h2>
                <button class="modal-close" onclick="closeStaffModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="staffForm">
                    <input type="hidden" id="staffId">
                    
                    <div class="form-group">
                        <label for="staffName">スタッフ名 <span class="required">*</span></label>
                        <input type="text" id="staffName" required placeholder="例: 山田 花子">
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="staffRole">役職 <span class="required">*</span></label>
                            <select id="staffRole" required>
                                <option value="">選択してください</option>
                                <option value="チーフスタイリスト">チーフスタイリスト</option>
                                <option value="スタイリスト">スタイリスト</option>
                                <option value="アシスタント">アシスタント</option>
                                <option value="レセプション">レセプション</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="staffStatus">ステータス</label>
                            <select id="staffStatus">
                                <option value="active">在籍</option>
                                <option value="training">研修中</option>
                                <option value="leave">休職中</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="staffEmail">メールアドレス</label>
                            <input type="email" id="staffEmail" placeholder="例: yamada@example.com">
                        </div>

                        <div class="form-group">
                            <label for="staffPhone">電話番号</label>
                            <input type="tel" id="staffPhone" placeholder="例: 090-1234-5678">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="workingHours">勤務時間</label>
                            <input type="text" id="workingHours" placeholder="例: 10:00-19:00">
                        </div>

                        <div class="form-group">
                            <label for="rakupochiId">らくポチ勤怠ID</label>
                            <input type="text" id="rakupochiId" placeholder="連携用ID（自動連携時に使用）">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>勤務日</label>
                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="workingDays" value="月"> 月
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" name="workingDays" value="火"> 火
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" name="workingDays" value="水"> 水
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" name="workingDays" value="木"> 木
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" name="workingDays" value="金"> 金
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" name="workingDays" value="土"> 土
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" name="workingDays" value="日"> 日
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="staffBio">プロフィール・特技</label>
                        <textarea id="staffBio" rows="3" placeholder="スタッフの紹介文や特技など"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeStaffModal()">キャンセル</button>
                <button class="btn btn-primary" onclick="saveStaff()">保存</button>
            </div>
        </div>
    </div>

    <!-- 削除確認モーダル -->
    <div id="deleteModal" class="modal" style="display: none;">
        <div class="modal-content modal-small">
            <div class="modal-header">
                <h2>スタッフの削除</h2>
                <button class="modal-close" onclick="closeDeleteModal()">×</button>
            </div>
            <div class="modal-body">
                <p class="delete-message">
                    「<span id="deleteStaffName"></span>」を削除してもよろしいですか？
                </p>
                <p class="warning-text">
                    ⚠️ この操作は取り消せません。関連する予約データは保持されます。
                </p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeDeleteModal()">キャンセル</button>
                <button class="btn btn-danger" onclick="confirmDelete()">削除する</button>
            </div>
        </div>
    </div>

    <script src="./js/admin-common.js"></script>
    <script src="./js/staff.js"></script>
    <script>
        // らくポチ勤怠連携用の関数
        function connectRakupochiKintai() {
            alert('らくポチ勤怠との連携機能は現在開発中です。\n\n今後の実装予定:\n- らくポチ勤怠のシフトデータを自動取得\n- リアルタイムでシフト情報を同期\n- 勤怠打刻データとの連携');
        }

        // シフト手動編集
        function editShifts() {
            alert('シフト編集機能は現在開発中です。\n\nらくポチ勤怠と連携後は、シフト情報が自動的に反映されます。');
        }

        // 保存処理を上書き
        function saveStaff() {
            const form = document.getElementById('staffForm');
            if (form.checkValidity()) {
                // らくポチ勤怠IDも含めて保存
                const rakupochiId = document.getElementById('rakupochiId').value;
                if (rakupochiId) {
                    console.log('らくポチ勤怠ID:', rakupochiId);
                }
                // 元の保存処理を呼び出し
                handleStaffSubmit(new Event('submit'));
            } else {
                form.reportValidity();
            }
        }
    </script>
</body>
</html>