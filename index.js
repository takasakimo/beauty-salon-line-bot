const express = require('express');
const line = require('@line/bot-sdk');
const { Client } = require('pg');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// LINE設定
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const lineClient = new line.Client(config);

// PostgreSQL接続設定
const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pgClient.connect()
    .then(() => console.log('PostgreSQL connected'))
    .catch(err => console.error('PostgreSQL connection error:', err));

// セッション管理用の簡易ストア（マルチテナント用）
const sessions = new Map();

// 静的ファイルの提供（LIFF用） - 最初に設定
app.use('/liff', express.static(path.join(__dirname, 'liff')));
// ルートパスでもLIFFにアクセスできるように
app.use('/', express.static(path.join(__dirname, 'liff')));
// 管理画面用
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// CORSヘッダー設定（LIFF用）
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-Code, X-Session-Token');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// ===========================
// LINE Webhook（先に設定）
// ===========================
app.post('/webhook', line.middleware(config), async (req, res) => {
    try {
        const results = await Promise.all(req.body.events.map(handleEvent));
        res.json(results);
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).end();
    }
});

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return null;
    }

    const userId = event.source.userId;
    const messageText = event.message.text;

    // LIFFへ誘導するメッセージ
    const liffUrl = `https://liff.line.me/2007971454-kL9LXL2O`;
    
    return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: `LIFFアプリをご利用ください。\n${liffUrl}\n\nまたは、リッチメニューからアクセスしてください。`
    });
}

// ===========================
// ミドルウェア設定（Webhook後に設定）
// ===========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===========================
// テナントID取得ミドルウェア（LIFF対応版）
// ===========================
async function getTenantId(req, res, next) {
    try {
        // ヘッダー、クエリパラメータ、ボディからテナントコードを取得
        const tenantCode = req.headers['x-tenant-code'] || 
                          req.query.tenant || 
                          req.body.tenant_code || 
                          'beauty-salon-001';
        
        const result = await pgClient.query(
            'SELECT tenant_id, is_active FROM tenants WHERE tenant_code = $1',
            [tenantCode]
        );

        if (result.rows.length === 0) {
            // テナントが存在しない場合はエラー
            return res.status(400).json({ error: 'テナントが見つかりません' });
        }
        
        if (!result.rows[0].is_active) {
            return res.status(403).json({ error: 'このテナントは無効です' });
        }
        
        req.tenantId = result.rows[0].tenant_id;
        next();
    } catch (error) {
        console.error('テナントID取得エラー:', error);
        res.status(500).json({ error: 'サーバーエラー' });
    }
}

// 管理者認証ミドルウェア
async function authenticateAdmin(req, res, next) {
    try {
        const sessionToken = req.headers['x-session-token'];
        
        if (!sessionToken || !sessions.has(sessionToken)) {
            return res.status(401).json({ error: '認証が必要です' });
        }

        const session = sessions.get(sessionToken);
        req.adminId = session.adminId;
        req.tenantId = session.tenantId;
        req.role = session.role;
        
        next();
    } catch (error) {
        console.error('認証エラー:', error);
        res.status(500).json({ error: 'サーバーエラー' });
    }
}

// ===========================
// 認証API
// ===========================

// 管理者ログイン（マルチテナント対応）
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password, tenantCode } = req.body;
        
        // テナントコードが指定されていない場合はデフォルトを使用
        const actualTenantCode = tenantCode || 'beauty-salon-001';
        
        // テナント情報を取得
        const tenantResult = await pgClient.query(
            'SELECT tenant_id, salon_name, is_active FROM tenants WHERE tenant_code = $1',
            [actualTenantCode]
        );

        if (tenantResult.rows.length === 0) {
            return res.status(401).json({ error: 'ログイン失敗：テナントが見つかりません' });
        }

        const tenant = tenantResult.rows[0];
        
        if (!tenant.is_active) {
            return res.status(401).json({ error: 'このテナントは無効です' });
        }

        // パスワードハッシュの生成
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
        
        // 管理者認証
        const adminResult = await pgClient.query(
            `SELECT admin_id, full_name, role 
             FROM tenant_admins 
             WHERE tenant_id = $1 AND username = $2 AND password_hash = $3 AND is_active = true`,
            [tenant.tenant_id, username, passwordHash]
        );

        if (adminResult.rows.length === 0) {
            return res.status(401).json({ error: 'ログイン失敗：認証情報が正しくありません' });
        }

        const admin = adminResult.rows[0];
        
        // セッショントークンの生成
        const sessionToken = crypto.randomBytes(32).toString('hex');
        
        // セッション情報を保存
        sessions.set(sessionToken, {
            adminId: admin.admin_id,
            tenantId: tenant.tenant_id,
            username: username,
            role: admin.role,
            createdAt: Date.now()
        });

        // 最終ログイン時刻を更新
        await pgClient.query(
            'UPDATE tenant_admins SET last_login = CURRENT_TIMESTAMP WHERE admin_id = $1',
            [admin.admin_id]
        );

        res.json({
            success: true,
            sessionToken,
            adminName: admin.full_name,
            tenantName: tenant.salon_name,
            role: admin.role
        });
    } catch (error) {
        console.error('ログインエラー:', error);
        res.status(500).json({ error: 'サーバーエラー' });
    }
});

// テナント一覧取得（ログイン画面用）
app.get('/api/tenants/active', async (req, res) => {
    try {
        const result = await pgClient.query(
            'SELECT tenant_code, salon_name FROM tenants WHERE is_active = true ORDER BY salon_name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('テナント一覧取得エラー:', error);
        res.status(500).json({ error: 'サーバーエラー' });
    }
});

// ===========================
// 顧客API（LIFF対応）
// ===========================

// 顧客情報確認（LIFF用）
app.post('/api/customers/check', getTenantId, async (req, res) => {
    try {
        const { line_user_id } = req.body;
        
        const query = 'SELECT * FROM customers WHERE line_user_id = $1 AND tenant_id = $2';
        const result = await pgClient.query(query, [line_user_id, req.tenantId]);
        
        if (result.rows.length === 0) {
            return res.json({ exists: false });
        }
        
        res.json({ 
            exists: true,
            customer: result.rows[0]
        });
    } catch (error) {
        console.error('顧客確認エラー:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 顧客情報取得（LIFF用）
app.get('/api/customers/:lineUserId', getTenantId, async (req, res) => {
    try {
        const { lineUserId } = req.params;
        
        // テナント別に顧客を取得
        const query = 'SELECT * FROM customers WHERE line_user_id = $1 AND tenant_id = $2';
        const result = await pgClient.query(query, [lineUserId, req.tenantId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 顧客登録（LIFF用・マルチテナント対応）
app.post('/api/customers/register', getTenantId, async (req, res) => {
    try {
        const { line_user_id, display_name, picture_url, real_name, phone_number } = req.body;
        
        // 既存チェック（テナント別）
        const checkQuery = 'SELECT * FROM customers WHERE line_user_id = $1 AND tenant_id = $2';
        const checkResult = await pgClient.query(checkQuery, [line_user_id, req.tenantId]);
        
        if (checkResult.rows.length > 0) {
            // すでに登録済み - 情報を更新
            const updateQuery = `
                UPDATE customers 
                SET display_name = $2, picture_url = $3, real_name = $4, phone_number = $5
                WHERE line_user_id = $1 AND tenant_id = $6
                RETURNING *
            `;
            const updateResult = await pgClient.query(updateQuery, [
                line_user_id, display_name, picture_url, real_name, phone_number, req.tenantId
            ]);
            
            return res.json({ 
                success: true, 
                message: 'Customer information updated',
                data: updateResult.rows[0]
            });
        }
        
        // 新規登録
        const insertQuery = `
            INSERT INTO customers (tenant_id, line_user_id, display_name, picture_url, real_name, phone_number, registered_date)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *
        `;
        const result = await pgClient.query(insertQuery, [
            req.tenantId, line_user_id, display_name, picture_url, real_name, phone_number
        ]);
        
        res.json({ 
            success: true, 
            message: 'Registration successful',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error registering customer:', error);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

// 顧客情報更新
app.put('/api/customers/:lineUserId', getTenantId, async (req, res) => {
    try {
        const { lineUserId } = req.params;
        const { real_name, phone_number } = req.body;
        
        const updateQuery = `
            UPDATE customers 
            SET real_name = $2, phone_number = $3
            WHERE line_user_id = $1 AND tenant_id = $4
            RETURNING *
        `;
        const result = await pgClient.query(updateQuery, [lineUserId, real_name, phone_number, req.tenantId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

// ===========================
// 予約API（LIFF対応）
// ===========================

// ユーザーの予約一覧取得
app.get('/api/reservations/user/:userId', getTenantId, async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT r.*, m.name as menu_name, m.price, m.duration, s.name as staff_name
            FROM reservations r
            JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $2
            JOIN staff s ON r.staff_id = s.staff_id AND s.tenant_id = $2
            WHERE r.customer_id = $1 AND r.tenant_id = $2
            ORDER BY r.reservation_date DESC
        `;
        const result = await pgClient.query(query, [userId, req.tenantId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 現在の予約取得
app.get('/api/reservations/current/:userId', getTenantId, async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT r.*, m.name as menu_name, m.price, m.duration, s.name as staff_name
            FROM reservations r
            JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $2
            JOIN staff s ON r.staff_id = s.staff_id AND s.tenant_id = $2
            WHERE r.customer_id = $1 
            AND r.tenant_id = $2
            AND r.reservation_date > NOW()
            AND r.status = 'confirmed'
            ORDER BY r.reservation_date ASC
            LIMIT 1
        `;
        const result = await pgClient.query(query, [userId, req.tenantId]);
        
        if (result.rows.length === 0) {
            return res.json(null);
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching current reservation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 予約作成（DB構造に合わせた修正版）
app.post('/api/reservations', getTenantId, async (req, res) => {
    try {
        // リクエストボディから必要な情報を取得
        const { 
            line_user_id,
            customer_name,
            menu_id, 
            staff_id, 
            reservation_date, 
            status = 'confirmed'
        } = req.body;

        console.log('予約作成リクエスト:', req.body);
        console.log('テナントID:', req.tenantId);

        // 顧客情報を取得または作成
        let customerResult = await pgClient.query(
            'SELECT line_user_id FROM customers WHERE line_user_id = $1 AND tenant_id = $2',
            [line_user_id, req.tenantId]
        );

        if (customerResult.rows.length === 0) {
            // 顧客が存在しない場合は作成
            await pgClient.query(
                `INSERT INTO customers (tenant_id, line_user_id, display_name, real_name, registered_date) 
                 VALUES ($1, $2, $3, $3, NOW())`,
                [req.tenantId, line_user_id, customer_name]
            );
            console.log('新規顧客作成:', line_user_id);
        } else {
            console.log('既存顧客:', line_user_id);
        }
        
        // 予約を作成（customer_idフィールドにline_user_idを入れる）
        const insertQuery = `
            INSERT INTO reservations (tenant_id, customer_id, staff_id, menu_id, reservation_date, status, created_date)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING reservation_id
        `;
        const result = await pgClient.query(insertQuery, [
            req.tenantId, 
            line_user_id,  // customer_idカラムにline_user_idを保存
            staff_id, 
            menu_id, 
            reservation_date, 
            status
        ]);
        
        console.log('予約作成成功:', result.rows[0]);

        res.json({ 
            success: true, 
            data: result.rows[0],
            message: '予約が完了しました'
        });
    } catch (error) {
        console.error('予約作成エラー:', error);
        res.status(500).json({ 
            success: false, 
            error: '予約の作成に失敗しました',
            details: error.message 
        });
    }
});

// 予約キャンセル
app.delete('/api/reservations/:id', getTenantId, async (req, res) => {
    try {
        const { id } = req.params;
        
        const updateQuery = `
            UPDATE reservations 
            SET status = 'cancelled', cancelled_at = NOW()
            WHERE reservation_id = $1 AND tenant_id = $2
            RETURNING *
        `;
        const result = await pgClient.query(updateQuery, [id, req.tenantId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Reservation not found' });
        }
        
        res.json({ success: true, message: 'Reservation cancelled' });
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        res.status(500).json({ error: 'Cancellation failed' });
    }
});

// 空き時間取得
app.get('/api/reservations/available-slots', getTenantId, async (req, res) => {
    try {
        const { date, menu_id } = req.query;
        
        // 営業時間のスロットを生成（10:00-19:00）
        const slots = [];
        for (let hour = 10; hour < 19; hour++) {
            slots.push(`${hour}:00`);
            slots.push(`${hour}:30`);
        }
        
        // 予約済みスロットを取得
        const query = `
            SELECT TO_CHAR(reservation_date, 'HH24:MI') as time
            FROM reservations
            WHERE DATE(reservation_date) = $1
            AND status = 'confirmed'
            AND tenant_id = $2
        `;
        const result = await pgClient.query(query, [date, req.tenantId]);
        const bookedSlots = result.rows.map(row => row.time);
        
        // 空きスロットを返す
        const availableSlots = slots.filter(slot => !bookedSlots.includes(slot));
        res.json(availableSlots);
    } catch (error) {
        console.error('Error fetching available slots:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===========================
// メニューAPI（LIFF対応）
// ===========================

// メニュー一覧取得（テナント別）
app.get('/api/menus', getTenantId, async (req, res) => {
    try {
        const query = `
            SELECT menu_id, name, price, duration, 
                   CASE 
                       WHEN name LIKE '%カット%' AND name LIKE '%カラー%' THEN 'set'
                       WHEN name LIKE '%カット%' AND name LIKE '%パーマ%' THEN 'set'
                       WHEN name LIKE '%フルコース%' THEN 'special'
                       WHEN name LIKE '%カット%' THEN 'cut'
                       WHEN name LIKE '%カラー%' THEN 'color'
                       WHEN name LIKE '%パーマ%' THEN 'perm'
                       WHEN name LIKE '%トリートメント%' THEN 'treatment'
                       WHEN name LIKE '%ヘッドスパ%' THEN 'spa'
                       ELSE 'other'
                   END as category,
                   CASE 
                       WHEN menu_id IN (6, 8) THEN true
                       ELSE false
                   END as is_popular
            FROM menus 
            WHERE tenant_id = $1 
            ORDER BY menu_id`;
        const result = await pgClient.query(query, [req.tenantId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching menus:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// メニュー詳細取得
app.get('/api/menus/:id', getTenantId, async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM menus WHERE menu_id = $1 AND tenant_id = $2';
        const result = await pgClient.query(query, [id, req.tenantId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Menu not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===========================
// スタッフAPI（LIFF対応）
// ===========================

// スタッフ一覧取得（テナント別）
app.get('/api/staff', getTenantId, async (req, res) => {
    try {
        const query = 'SELECT * FROM staff WHERE tenant_id = $1 ORDER BY staff_id';
        const result = await pgClient.query(query, [req.tenantId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// スタッフ詳細取得
app.get('/api/staff/:id', getTenantId, async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM staff WHERE staff_id = $1 AND tenant_id = $2';
        const result = await pgClient.query(query, [id, req.tenantId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Staff not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===========================
// 管理画面用APIエンドポイント
// ===========================

// 管理画面用：全顧客取得
app.get('/api/admin/customers', authenticateAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                customer_id,
                line_user_id,
                display_name,
                real_name,
                phone_number,
                address,
                birthday,
                registered_date
            FROM customers
            WHERE tenant_id = $1
            ORDER BY registered_date DESC
        `;
        const result = await pgClient.query(query, [req.tenantId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching all customers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 管理画面用：全予約取得
app.get('/api/admin/reservations', authenticateAdmin, async (req, res) => {
    try {
        const { date } = req.query;
        let query = `
            SELECT r.*, c.real_name as customer_name, m.name as menu_name, m.price, m.duration, s.name as staff_name
            FROM reservations r
            LEFT JOIN customers c ON r.customer_id = c.customer_id AND c.tenant_id = $1
            JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
            JOIN staff s ON r.staff_id = s.staff_id AND s.tenant_id = $1
            WHERE r.tenant_id = $1
        `;
        
        const params = [req.tenantId];
        
        if (date) {
            query += ` AND DATE(r.reservation_date) = $2`;
            params.push(date);
        }
        
        query += ` ORDER BY r.reservation_date ASC`;
        const result = await pgClient.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching admin reservations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 管理画面用：統計データ取得
app.get('/api/admin/statistics', authenticateAdmin, async (req, res) => {
    try {
        // 総顧客数
        const totalCustomersQuery = 'SELECT COUNT(*) as total FROM customers WHERE tenant_id = $1';
        const totalCustomersResult = await pgClient.query(totalCustomersQuery, [req.tenantId]);
        
        // 今月の新規顧客数
        const newCustomersQuery = `
            SELECT COUNT(*) as total 
            FROM customers 
            WHERE tenant_id = $1
            AND DATE_TRUNC('month', registered_date) = DATE_TRUNC('month', CURRENT_DATE)
        `;
        const newCustomersResult = await pgClient.query(newCustomersQuery, [req.tenantId]);
        
        // 常連顧客数（5回以上来店）
        const regularCustomersQuery = `
            SELECT COUNT(DISTINCT c.customer_id) as total
            FROM customers c
            WHERE c.tenant_id = $1
            AND (
                SELECT COUNT(*) 
                FROM reservations r 
                WHERE r.customer_id = c.customer_id 
                AND r.tenant_id = $1
                AND r.status = 'completed'
            ) >= 5
        `;
        const regularCustomersResult = await pgClient.query(regularCustomersQuery, [req.tenantId]);
        
        // 平均客単価
        const avgSpendingQuery = `
            SELECT AVG(m.price) as average
            FROM reservations r
            JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
            WHERE r.status = 'completed'
            AND r.tenant_id = $1
        `;
        const avgSpendingResult = await pgClient.query(avgSpendingQuery, [req.tenantId]);
        
        // 今月の売上
        const monthlySalesQuery = `
            SELECT SUM(m.price) as total
            FROM reservations r
            JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
            WHERE r.status = 'completed'
            AND r.tenant_id = $1
            AND DATE_TRUNC('month', r.reservation_date) = DATE_TRUNC('month', CURRENT_DATE)
        `;
        const monthlySalesResult = await pgClient.query(monthlySalesQuery, [req.tenantId]);
        
        // 今日の予約数
        const todayReservationsQuery = `
            SELECT COUNT(*) as total
            FROM reservations
            WHERE DATE(reservation_date) = CURRENT_DATE
            AND status = 'confirmed'
            AND tenant_id = $1
        `;
        const todayReservationsResult = await pgClient.query(todayReservationsQuery, [req.tenantId]);
        
        // 今日の売上
        const todaySalesQuery = `
            SELECT SUM(m.price) as total
            FROM reservations r
            JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
            WHERE DATE(r.reservation_date) = CURRENT_DATE
            AND r.status = 'confirmed'
            AND r.tenant_id = $1
        `;
        const todaySalesResult = await pgClient.query(todaySalesQuery, [req.tenantId]);
        
        // テナント情報を追加
        const tenantQuery = 'SELECT salon_name FROM tenants WHERE tenant_id = $1';
        const tenantResult = await pgClient.query(tenantQuery, [req.tenantId]);
        
        res.json({
            totalCustomers: parseInt(totalCustomersResult.rows[0].total),
            newCustomersMonth: parseInt(newCustomersResult.rows[0].total),
            regularCustomers: parseInt(regularCustomersResult.rows[0].total),
            averageSpending: Math.round(avgSpendingResult.rows[0].average || 0),
            monthlySales: monthlySalesResult.rows[0].total || 0,
            todayReservations: parseInt(todayReservationsResult.rows[0].total),
            todaySales: todaySalesResult.rows[0].total || 0,
            tenantName: tenantResult.rows[0]?.salon_name || 'ビューティーサロン'
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// メニュー管理API
app.put('/api/menus/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, duration } = req.body;
        
        const updateQuery = `
            UPDATE menus 
            SET name = $2, price = $3, duration = $4
            WHERE menu_id = $1 AND tenant_id = $5
            RETURNING *
        `;
        const result = await pgClient.query(updateQuery, [id, name, price, duration, req.tenantId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Menu not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating menu:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

app.post('/api/menus', authenticateAdmin, async (req, res) => {
    try {
        const { name, price, duration } = req.body;
        
        const insertQuery = `
            INSERT INTO menus (name, price, duration, tenant_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pgClient.query(insertQuery, [name, price, duration, req.tenantId]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating menu:', error);
        res.status(500).json({ error: 'Creation failed' });
    }
});

app.delete('/api/menus/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const deleteQuery = 'DELETE FROM menus WHERE menu_id = $1 AND tenant_id = $2';
        await pgClient.query(deleteQuery, [id, req.tenantId]);
        
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting menu:', error);
        res.status(500).json({ error: 'Deletion failed' });
    }
});

// スタッフ管理API
app.post('/api/staff', authenticateAdmin, async (req, res) => {
    try {
        const { name, email, working_hours, role, phone, working_days, bio } = req.body;
        
        const insertQuery = `
            INSERT INTO staff (name, email, working_hours, tenant_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        
        const result = await pgClient.query(insertQuery, [
            name, 
            email || null, 
            role || working_hours || null,
            req.tenantId
        ]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating staff:', error);
        res.status(500).json({ error: 'Creation failed' });
    }
});

app.put('/api/staff/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, working_hours, role } = req.body;
        
        const updateQuery = `
            UPDATE staff 
            SET name = $2, email = $3, working_hours = $4
            WHERE staff_id = $1 AND tenant_id = $5
            RETURNING *
        `;
        
        const result = await pgClient.query(updateQuery, [
            id,
            name,
            email || null,
            role || working_hours || null,
            req.tenantId
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Staff not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

app.delete('/api/staff/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const checkQuery = `
            SELECT COUNT(*) as count 
            FROM reservations 
            WHERE staff_id = $1 AND status = 'confirmed' AND tenant_id = $2
        `;
        const checkResult = await pgClient.query(checkQuery, [id, req.tenantId]);
        
        if (parseInt(checkResult.rows[0].count) > 0) {
            return res.status(400).json({ 
                error: 'このスタッフには確定済みの予約があるため削除できません' 
            });
        }
        
        const deleteQuery = 'DELETE FROM staff WHERE staff_id = $1 AND tenant_id = $2';
        await pgClient.query(deleteQuery, [id, req.tenantId]);
        
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({ error: 'Deletion failed' });
    }
});

// テスト用エンドポイント
app.get('/test', (req, res) => {
    res.send('Beauty Salon LINE Bot with LIFF (マルチテナント対応版) is running!');
});

// サーバー起動
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log('マルチテナント機能が有効になりました');
    console.log('LIFF対応が完了しました');
});