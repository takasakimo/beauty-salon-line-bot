const express = require('express');
const line = require('@line/bot-sdk');
const { Client } = require('pg');
const path = require('path');

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

// 静的ファイルの提供（LIFF用） - 最初に設定
app.use('/liff', express.static(path.join(__dirname, 'liff')));
// ルートパスでもLIFFにアクセスできるように
app.use('/', express.static(path.join(__dirname, 'liff')));
// 管理画面用
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// CORSヘッダー設定（LIFF用）
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
// API エンドポイント
// ===========================

// 顧客API
app.get('/api/customers/:lineUserId', async (req, res) => {
    try {
        const { lineUserId } = req.params;
        const query = 'SELECT * FROM customers WHERE line_user_id = $1';
        const result = await pgClient.query(query, [lineUserId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/customers/register', async (req, res) => {
    try {
        const { line_user_id, real_name, phone_number } = req.body;
        
        // 既存チェック
        const checkQuery = 'SELECT * FROM customers WHERE line_user_id = $1';
        const checkResult = await pgClient.query(checkQuery, [line_user_id]);
        
        if (checkResult.rows.length > 0) {
            return res.json({ 
                success: true, 
                message: 'Already registered',
                data: checkResult.rows[0]
            });
        }
        
        // 新規登録
        const insertQuery = `
            INSERT INTO customers (line_user_id, real_name, phone_number, registered_date)
            VALUES ($1, $2, $3, NOW())
            RETURNING *
        `;
        const result = await pgClient.query(insertQuery, [line_user_id, real_name, phone_number]);
        
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

app.put('/api/customers/:lineUserId', async (req, res) => {
    try {
        const { lineUserId } = req.params;
        const { real_name, phone_number } = req.body;
        
        const updateQuery = `
            UPDATE customers 
            SET real_name = $2, phone_number = $3
            WHERE line_user_id = $1
            RETURNING *
        `;
        const result = await pgClient.query(updateQuery, [lineUserId, real_name, phone_number]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

// 予約API
app.get('/api/reservations/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT r.*, m.name as menu_name, m.price, m.duration, s.name as staff_name
            FROM reservations r
            JOIN menus m ON r.menu_id = m.menu_id
            JOIN staff s ON r.staff_id = s.staff_id
            WHERE r.customer_id = $1
            ORDER BY r.reservation_date DESC
        `;
        const result = await pgClient.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/reservations/current/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT r.*, m.name as menu_name, m.price, m.duration, s.name as staff_name
            FROM reservations r
            JOIN menus m ON r.menu_id = m.menu_id
            JOIN staff s ON r.staff_id = s.staff_id
            WHERE r.customer_id = $1 
            AND r.reservation_date > NOW()
            AND r.status = 'confirmed'
            ORDER BY r.reservation_date ASC
            LIMIT 1
        `;
        const result = await pgClient.query(query, [userId]);
        
        if (result.rows.length === 0) {
            return res.json(null);
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching current reservation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/reservations', async (req, res) => {
    try {
        const { customer_id, staff_id, menu_id, reservation_date } = req.body;
        
        const insertQuery = `
            INSERT INTO reservations (customer_id, staff_id, menu_id, reservation_date, status, created_at)
            VALUES ($1, $2, $3, $4, 'confirmed', NOW())
            RETURNING *
        `;
        const result = await pgClient.query(insertQuery, [customer_id, staff_id, menu_id, reservation_date]);
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({ success: false, error: 'Reservation failed' });
    }
});

app.delete('/api/reservations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const updateQuery = `
            UPDATE reservations 
            SET status = 'cancelled', cancelled_at = NOW()
            WHERE reservation_id = $1
            RETURNING *
        `;
        const result = await pgClient.query(updateQuery, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Reservation not found' });
        }
        
        res.json({ success: true, message: 'Reservation cancelled' });
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        res.status(500).json({ error: 'Cancellation failed' });
    }
});

app.get('/api/reservations/available-slots', async (req, res) => {
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
        `;
        const result = await pgClient.query(query, [date]);
        const bookedSlots = result.rows.map(row => row.time);
        
        // 空きスロットを返す
        const availableSlots = slots.filter(slot => !bookedSlots.includes(slot));
        res.json(availableSlots);
    } catch (error) {
        console.error('Error fetching available slots:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// メニューAPI
app.get('/api/menus', async (req, res) => {
    try {
        const query = 'SELECT * FROM menus ORDER BY menu_id';
        const result = await pgClient.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching menus:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/menus/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM menus WHERE menu_id = $1';
        const result = await pgClient.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Menu not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// スタッフAPI
app.get('/api/staff', async (req, res) => {
    try {
        const query = 'SELECT * FROM staff ORDER BY staff_id';
        const result = await pgClient.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/staff/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM staff WHERE staff_id = $1';
        const result = await pgClient.query(query, [id]);
        
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

// 管理画面用：全顧客取得（詳細版）
app.get('/api/admin/customers', async (req, res) => {
    try {
        const query = `
            SELECT 
                line_user_id,
                real_name,
                phone_number,
                address,
                birthday,
                registered_date
            FROM customers
            ORDER BY registered_date DESC
        `;
        const result = await pgClient.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching all customers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 管理画面用：全予約取得（日付フィルター付き）
app.get('/api/admin/reservations', async (req, res) => {
    try {
        const { date } = req.query;
        let query = `
            SELECT r.*, c.real_name as customer_name, m.name as menu_name, m.price, m.duration, s.name as staff_name
            FROM reservations r
            LEFT JOIN customers c ON r.customer_id = c.line_user_id
            JOIN menus m ON r.menu_id = m.menu_id
            JOIN staff s ON r.staff_id = s.staff_id
        `;
        
        if (date) {
            query += ` WHERE DATE(r.reservation_date) = $1`;
            query += ` ORDER BY r.reservation_date ASC`;
            const result = await pgClient.query(query, [date]);
            res.json(result.rows);
        } else {
            query += ` ORDER BY r.reservation_date DESC`;
            const result = await pgClient.query(query);
            res.json(result.rows);
        }
    } catch (error) {
        console.error('Error fetching admin reservations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 管理画面用：統計データ取得（拡張版）
app.get('/api/admin/statistics', async (req, res) => {
    try {
        // 総顧客数
        const totalCustomersQuery = 'SELECT COUNT(*) as total FROM customers';
        const totalCustomersResult = await pgClient.query(totalCustomersQuery);
        
        // 今月の新規顧客数
        const newCustomersQuery = `
            SELECT COUNT(*) as total 
            FROM customers 
            WHERE DATE_TRUNC('month', registered_date) = DATE_TRUNC('month', CURRENT_DATE)
        `;
        const newCustomersResult = await pgClient.query(newCustomersQuery);
        
        // 常連顧客数（5回以上来店）
        const regularCustomersQuery = `
            SELECT COUNT(DISTINCT c.line_user_id) as total
            FROM customers c
            WHERE (
                SELECT COUNT(*) 
                FROM reservations r 
                WHERE r.customer_id = c.line_user_id 
                AND r.status = 'completed'
            ) >= 5
        `;
        const regularCustomersResult = await pgClient.query(regularCustomersQuery);
        
        // 平均客単価
        const avgSpendingQuery = `
            SELECT AVG(m.price) as average
            FROM reservations r
            JOIN menus m ON r.menu_id = m.menu_id
            WHERE r.status = 'completed'
        `;
        const avgSpendingResult = await pgClient.query(avgSpendingQuery);
        
        // 今月の売上
        const monthlySalesQuery = `
            SELECT SUM(m.price) as total
            FROM reservations r
            JOIN menus m ON r.menu_id = m.menu_id
            WHERE r.status = 'completed'
            AND DATE_TRUNC('month', r.reservation_date) = DATE_TRUNC('month', CURRENT_DATE)
        `;
        const monthlySalesResult = await pgClient.query(monthlySalesQuery);
        
        // 今日の予約数
        const todayReservationsQuery = `
            SELECT COUNT(*) as total
            FROM reservations
            WHERE DATE(reservation_date) = CURRENT_DATE
            AND status = 'confirmed'
        `;
        const todayReservationsResult = await pgClient.query(todayReservationsQuery);
        
        // 今日の売上
        const todaySalesQuery = `
            SELECT SUM(m.price) as total
            FROM reservations r
            JOIN menus m ON r.menu_id = m.menu_id
            WHERE DATE(r.reservation_date) = CURRENT_DATE
            AND r.status = 'confirmed'
        `;
        const todaySalesResult = await pgClient.query(todaySalesQuery);
        
        res.json({
            totalCustomers: parseInt(totalCustomersResult.rows[0].total),
            newCustomersMonth: parseInt(newCustomersResult.rows[0].total),
            regularCustomers: parseInt(regularCustomersResult.rows[0].total),
            averageSpending: Math.round(avgSpendingResult.rows[0].average || 0),
            monthlySales: monthlySalesResult.rows[0].total || 0,
            todayReservations: parseInt(todayReservationsResult.rows[0].total),
            todaySales: todaySalesResult.rows[0].total || 0
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 管理画面用：メニュー更新
app.put('/api/menus/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, duration } = req.body;
        
        const updateQuery = `
            UPDATE menus 
            SET name = $2, price = $3, duration = $4
            WHERE menu_id = $1
            RETURNING *
        `;
        const result = await pgClient.query(updateQuery, [id, name, price, duration]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Menu not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating menu:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

// 管理画面用：メニュー追加
app.post('/api/menus', async (req, res) => {
    try {
        const { name, price, duration } = req.body;
        
        const insertQuery = `
            INSERT INTO menus (name, price, duration)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await pgClient.query(insertQuery, [name, price, duration]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating menu:', error);
        res.status(500).json({ error: 'Creation failed' });
    }
});

// 管理画面用：メニュー削除
app.delete('/api/menus/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const deleteQuery = 'DELETE FROM menus WHERE menu_id = $1';
        await pgClient.query(deleteQuery, [id]);
        
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting menu:', error);
        res.status(500).json({ error: 'Deletion failed' });
    }
});

// テスト用エンドポイント
app.get('/test', (req, res) => {
    res.send('Beauty Salon LINE Bot with LIFF is running!');
});

// サーバー起動
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});