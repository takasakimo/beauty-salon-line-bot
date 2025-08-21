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

// ルートパス
app.get('/', (req, res) => {
    res.send('Beauty Salon LINE Bot with LIFF is running!');
});

// サーバー起動
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});