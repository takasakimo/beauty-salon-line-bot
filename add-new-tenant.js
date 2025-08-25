const { Client } = require('pg');

// 新規テナント情報
const NEW_TENANT = {
    tenant_code: 'beauty-salon-004',  // ユニークなコード
    salon_name: 'ヘアサロン福岡',      // サロン名
    admin_username: 'admin',           // 管理者ユーザー名
    admin_password: 'admin123',        // 管理者パスワード
    admin_fullname: '管理者'           // 管理者の表示名
};

async function addNewTenant() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('PostgreSQL connected');

        // 1. まず既存のテーブル構造を確認
        const checkColumns = await client.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_name = 'tenants'`
        );
        console.log('テナントテーブルのカラム:', checkColumns.rows.map(r => r.column_name));

        // 2. テナント追加（planカラムを除外）
        const tenantResult = await client.query(
            `INSERT INTO tenants (tenant_code, salon_name, is_active, created_at) 
             VALUES ($1, $2, true, CURRENT_TIMESTAMP) 
             RETURNING tenant_id`,
            [NEW_TENANT.tenant_code, NEW_TENANT.salon_name]
        );
        
        const tenantId = tenantResult.rows[0].tenant_id;
        console.log(`✅ テナント追加完了: ${NEW_TENANT.salon_name} (ID: ${tenantId})`);

        // 3. 管理者アカウント追加
        const crypto = require('crypto');
        const passwordHash = crypto.createHash('sha256').update(NEW_TENANT.admin_password).digest('hex');
        
        await client.query(
            `INSERT INTO tenant_admins (tenant_id, username, password_hash, full_name, role, is_active, created_at)
             VALUES ($1, $2, $3, $4, 'admin', true, CURRENT_TIMESTAMP)`,
            [tenantId, NEW_TENANT.admin_username, passwordHash, NEW_TENANT.admin_fullname]
        );
        
        console.log(`✅ 管理者アカウント追加完了: ${NEW_TENANT.admin_username}`);

        // 4. デフォルトメニュー追加（オプション）
        const defaultMenus = [
            { name: 'カット', price: 4000, duration: 60 },
            { name: 'カラー', price: 6000, duration: 90 },
            { name: 'パーマ', price: 8000, duration: 120 },
            { name: 'トリートメント', price: 3000, duration: 30 }
        ];

        for (const menu of defaultMenus) {
            await client.query(
                `INSERT INTO menus (name, price, duration, tenant_id)
                 VALUES ($1, $2, $3, $4)`,
                [menu.name, menu.price, menu.duration, tenantId]
            );
        }
        
        console.log(`✅ デフォルトメニュー追加完了`);

        // 5. デフォルトスタッフ追加（オプション）
        const defaultStaff = [
            { name: 'スタッフA', email: 'staff-a@salon.com', working_hours: '10:00-19:00' },
            { name: 'スタッフB', email: 'staff-b@salon.com', working_hours: '11:00-20:00' }
        ];

        for (const staff of defaultStaff) {
            await client.query(
                `INSERT INTO staff (name, email, working_hours, tenant_id)
                 VALUES ($1, $2, $3, $4)`,
                [staff.name, staff.email, staff.working_hours, tenantId]
            );
        }
        
        console.log(`✅ デフォルトスタッフ追加完了`);

        console.log('\n========================================');
        console.log('🎉 新規テナント登録完了！');
        console.log('========================================');
        console.log(`テナントコード: ${NEW_TENANT.tenant_code}`);
        console.log(`サロン名: ${NEW_TENANT.salon_name}`);
        console.log(`管理者ユーザー名: ${NEW_TENANT.admin_username}`);
        console.log(`管理者パスワード: ${NEW_TENANT.admin_password}`);
        console.log('========================================\n');

        // 6. 登録確認
        const verifyTenant = await client.query(
            'SELECT * FROM tenants WHERE tenant_code = $1',
            [NEW_TENANT.tenant_code]
        );
        console.log('登録されたテナント情報:', verifyTenant.rows[0]);

    } catch (error) {
        console.error('Error adding new tenant:', error);
    } finally {
        await client.end();
    }
}

// 実行
addNewTenant();