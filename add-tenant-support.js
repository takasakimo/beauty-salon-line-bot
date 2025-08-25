// マルチテナント対応のためのデータベース更新スクリプト

const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function addTenantSupport() {
    try {
        await client.connect();
        console.log('データベースに接続しました');

        // 1. テナント（美容室）テーブルの作成
        console.log('1. tenantsテーブルを作成中...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS tenants (
                tenant_id SERIAL PRIMARY KEY,
                tenant_code VARCHAR(50) UNIQUE NOT NULL,
                salon_name VARCHAR(255) NOT NULL,
                owner_name VARCHAR(100),
                email VARCHAR(255),
                phone_number VARCHAR(20),
                address VARCHAR(500),
                postal_code VARCHAR(10),
                business_hours TEXT,
                line_channel_id VARCHAR(255),
                line_channel_secret VARCHAR(255),
                line_access_token TEXT,
                liff_id VARCHAR(255),
                subscription_plan VARCHAR(50) DEFAULT 'basic',
                is_active BOOLEAN DEFAULT true,
                trial_ends_at DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ tenantsテーブルを作成しました');

        // 2. 管理者テーブルの作成（テナント別）
        console.log('2. tenant_adminsテーブルを作成中...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS tenant_admins (
                admin_id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
                username VARCHAR(100) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                email VARCHAR(255),
                role VARCHAR(50) DEFAULT 'admin',
                is_active BOOLEAN DEFAULT true,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, username)
            );
        `);
        console.log('✅ tenant_adminsテーブルを作成しました');

        // 3. 既存テーブルにtenant_idカラムを追加（存在しない場合のみ）
        console.log('3. 既存テーブルにtenant_idを追加中...');

        // customersテーブル
        try {
            await client.query(`
                ALTER TABLE customers 
                ADD COLUMN tenant_id INTEGER;
            `);
            console.log('  ✅ customersテーブルにtenant_idを追加');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('  ⏭️  customersテーブルのtenant_idは既に存在');
            } else {
                throw err;
            }
        }

        // staffテーブル
        try {
            await client.query(`
                ALTER TABLE staff 
                ADD COLUMN tenant_id INTEGER;
            `);
            console.log('  ✅ staffテーブルにtenant_idを追加');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('  ⏭️  staffテーブルのtenant_idは既に存在');
            } else {
                throw err;
            }
        }

        // menusテーブル
        try {
            await client.query(`
                ALTER TABLE menus 
                ADD COLUMN tenant_id INTEGER;
            `);
            console.log('  ✅ menusテーブルにtenant_idを追加');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('  ⏭️  menusテーブルのtenant_idは既に存在');
            } else {
                throw err;
            }
        }

        // reservationsテーブル
        try {
            await client.query(`
                ALTER TABLE reservations 
                ADD COLUMN tenant_id INTEGER;
            `);
            console.log('  ✅ reservationsテーブルにtenant_idを追加');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('  ⏭️  reservationsテーブルのtenant_idは既に存在');
            } else {
                throw err;
            }
        }

        // treatment_historyテーブル
        try {
            await client.query(`
                ALTER TABLE treatment_history 
                ADD COLUMN tenant_id INTEGER;
            `);
            console.log('  ✅ treatment_historyテーブルにtenant_idを追加');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('  ⏭️  treatment_historyテーブルのtenant_idは既に存在');
            } else {
                throw err;
            }
        }

        console.log('✅ 既存テーブルへのtenant_id追加完了');

        // 4. デフォルトテナントの作成または取得
        console.log('4. デフォルトテナントを作成中...');
        
        // 既存のデフォルトテナントをチェック
        const checkTenant = await client.query(
            "SELECT tenant_id FROM tenants WHERE tenant_code = 'beauty-salon-001'"
        );
        
        let defaultTenantId;
        
        if (checkTenant.rows.length > 0) {
            defaultTenantId = checkTenant.rows[0].tenant_id;
            console.log(`  ⏭️  デフォルトテナントは既に存在 (ID: ${defaultTenantId})`);
        } else {
            const tenantResult = await client.query(`
                INSERT INTO tenants (
                    tenant_code,
                    salon_name,
                    owner_name,
                    email,
                    phone_number,
                    address,
                    postal_code,
                    business_hours,
                    subscription_plan,
                    trial_ends_at
                ) VALUES (
                    'beauty-salon-001',
                    'ビューティーサロン名古屋',
                    '山田太郎',
                    'yamada@beauty-salon.com',
                    '052-123-4567',
                    '愛知県名古屋市中区栄1-1-1',
                    '460-0008',
                    '{"mon": "10:00-20:00", "tue": "10:00-20:00", "wed": "10:00-20:00", "thu": "10:00-20:00", "fri": "10:00-20:00", "sat": "09:00-19:00", "sun": "09:00-18:00"}',
                    'premium',
                    CURRENT_DATE + INTERVAL '30 days'
                ) RETURNING tenant_id;
            `);
            
            defaultTenantId = tenantResult.rows[0].tenant_id;
            console.log(`  ✅ デフォルトテナントを作成しました (ID: ${defaultTenantId})`);
        }

        // 5. デフォルト管理者アカウントの作成
        console.log('5. デフォルト管理者アカウントを作成中...');
        
        // 簡易的なパスワードハッシュ（本番環境ではbcryptを使用）
        const crypto = require('crypto');
        const passwordHash = crypto.createHash('sha256').update('admin123').digest('hex');
        
        // 既存の管理者をチェック
        const checkAdmin = await client.query(
            'SELECT admin_id FROM tenant_admins WHERE tenant_id = $1 AND username = $2',
            [defaultTenantId, 'admin']
        );
        
        if (checkAdmin.rows.length > 0) {
            console.log('  ⏭️  デフォルト管理者アカウントは既に存在');
        } else {
            await client.query(`
                INSERT INTO tenant_admins (
                    tenant_id,
                    username,
                    password_hash,
                    full_name,
                    email,
                    role
                ) VALUES (
                    $1,
                    'admin',
                    $2,
                    '管理者',
                    'admin@beauty-salon.com',
                    'super_admin'
                );
            `, [defaultTenantId, passwordHash]);
            
            console.log('  ✅ デフォルト管理者アカウントを作成しました');
        }
        
        console.log('');
        console.log('📝 ログイン情報:');
        console.log('   ユーザー名: admin');
        console.log('   パスワード: admin123');
        console.log('   テナントコード: beauty-salon-001');

        // 6. 既存データをデフォルトテナントに紐付け
        console.log('');
        console.log('6. 既存データをデフォルトテナントに紐付け中...');
        
        const updateResults = [];
        
        // customers
        const customerUpdate = await client.query(
            `UPDATE customers SET tenant_id = $1 WHERE tenant_id IS NULL`,
            [defaultTenantId]
        );
        updateResults.push(`  ✅ customers: ${customerUpdate.rowCount}件更新`);
        
        // staff
        const staffUpdate = await client.query(
            `UPDATE staff SET tenant_id = $1 WHERE tenant_id IS NULL`,
            [defaultTenantId]
        );
        updateResults.push(`  ✅ staff: ${staffUpdate.rowCount}件更新`);
        
        // menus
        const menuUpdate = await client.query(
            `UPDATE menus SET tenant_id = $1 WHERE tenant_id IS NULL`,
            [defaultTenantId]
        );
        updateResults.push(`  ✅ menus: ${menuUpdate.rowCount}件更新`);
        
        // reservations
        const reservationUpdate = await client.query(
            `UPDATE reservations SET tenant_id = $1 WHERE tenant_id IS NULL`,
            [defaultTenantId]
        );
        updateResults.push(`  ✅ reservations: ${reservationUpdate.rowCount}件更新`);
        
        // treatment_history
        const treatmentUpdate = await client.query(
            `UPDATE treatment_history SET tenant_id = $1 WHERE tenant_id IS NULL`,
            [defaultTenantId]
        );
        updateResults.push(`  ✅ treatment_history: ${treatmentUpdate.rowCount}件更新`);
        
        updateResults.forEach(result => console.log(result));
        console.log('✅ 既存データのデフォルトテナントへの紐付け完了');

        // 7. サンプルテナントの追加（デモ用）
        console.log('');
        console.log('7. サンプルテナントを追加中...');
        
        const sampleTenants = [
            {
                code: 'beauty-salon-002',
                name: 'ヘアサロン東京',
                owner: '鈴木花子',
                email: 'suzuki@hair-tokyo.com',
                phone: '03-9876-5432',
                address: '東京都渋谷区神宮前1-1-1'
            },
            {
                code: 'beauty-salon-003',
                name: 'エステ＆ビューティー大阪',
                owner: '田中次郎',
                email: 'tanaka@beauty-osaka.com',
                phone: '06-1111-2222',
                address: '大阪府大阪市北区梅田2-2-2'
            }
        ];

        for (const tenant of sampleTenants) {
            // 既存チェック
            const checkTenant = await client.query(
                'SELECT tenant_id FROM tenants WHERE tenant_code = $1',
                [tenant.code]
            );
            
            if (checkTenant.rows.length > 0) {
                console.log(`  ⏭️  ${tenant.name}は既に存在`);
                continue;
            }
            
            const result = await client.query(`
                INSERT INTO tenants (
                    tenant_code,
                    salon_name,
                    owner_name,
                    email,
                    phone_number,
                    address,
                    subscription_plan,
                    trial_ends_at
                ) VALUES ($1, $2, $3, $4, $5, $6, 'basic', CURRENT_DATE + INTERVAL '14 days')
                RETURNING tenant_id;
            `, [tenant.code, tenant.name, tenant.owner, tenant.email, tenant.phone, tenant.address]);

            const tenantId = result.rows[0].tenant_id;
            
            // 各テナント用の管理者を作成
            await client.query(`
                INSERT INTO tenant_admins (
                    tenant_id,
                    username,
                    password_hash,
                    full_name,
                    email,
                    role
                ) VALUES ($1, $2, $3, $4, $5, 'admin');
            `, [tenantId, 'admin', passwordHash, tenant.owner, tenant.email]);
            
            console.log(`  ✅ サンプルテナント「${tenant.name}」を追加しました`);
        }

        // 8. 結果の確認
        console.log('');
        console.log('========================================');
        console.log('📊 マルチテナント化の結果:');
        console.log('========================================');
        
        const tenantCount = await client.query('SELECT COUNT(*) FROM tenants');
        console.log(`✅ テナント数: ${tenantCount.rows[0].count}`);
        
        const adminCount = await client.query('SELECT COUNT(*) FROM tenant_admins');
        console.log(`✅ 管理者アカウント数: ${adminCount.rows[0].count}`);
        
        const tenantList = await client.query(`
            SELECT tenant_code, salon_name, subscription_plan 
            FROM tenants 
            ORDER BY tenant_id
        `);
        
        console.log('');
        console.log('📋 登録済みテナント一覧:');
        tenantList.rows.forEach(tenant => {
            console.log(`   - [${tenant.tenant_code}] ${tenant.salon_name} (${tenant.subscription_plan}プラン)`);
        });

        console.log('');
        console.log('========================================');
        console.log('✅ マルチテナント対応の準備が完了しました！');
        console.log('========================================');
        console.log('');
        console.log('🔐 各テナントのログイン情報:');
        console.log('   すべてのテナントで共通:');
        console.log('   - ユーザー名: admin');
        console.log('   - パスワード: admin123');
        console.log('');
        console.log('📝 次のステップ:');
        console.log('   1. 管理画面のログイン処理を修正');
        console.log('   2. テナント選択機能の実装');
        console.log('   3. 各画面でテナントIDを使用');

    } catch (err) {
        console.error('');
        console.error('❌ エラーが発生しました:', err.message);
        console.error('詳細:', err);
    } finally {
        await client.end();
        console.log('');
        console.log('データベース接続を終了しました');
    }
}

// スクリプトの実行
console.log('========================================');
console.log('🚀 マルチテナント対応スクリプトを開始');
console.log('========================================');
console.log('');

addTenantSupport();