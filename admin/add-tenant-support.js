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

        // 3. 既存テーブルにtenant_idカラムを追加
        console.log('3. 既存テーブルにtenant_idを追加中...');

        // customersテーブル
        await client.query(`
            ALTER TABLE customers 
            ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
        `);

        // staffテーブル
        await client.query(`
            ALTER TABLE staff 
            ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
        `);

        // menusテーブル
        await client.query(`
            ALTER TABLE menus 
            ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
        `);

        // reservationsテーブル
        await client.query(`
            ALTER TABLE reservations 
            ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
        `);

        // treatment_historyテーブル
        await client.query(`
            ALTER TABLE treatment_history 
            ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
        `);

        console.log('✅ 既存テーブルにtenant_idを追加しました');

        // 4. デフォルトテナントの作成
        console.log('4. デフォルトテナントを作成中...');
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
            ) ON CONFLICT (tenant_code) DO UPDATE 
            SET updated_at = CURRENT_TIMESTAMP
            RETURNING tenant_id;
        `);
        
        const defaultTenantId = tenantResult.rows[0].tenant_id;
        console.log(`✅ デフォルトテナントを作成しました (ID: ${defaultTenantId})`);

        // 5. デフォルト管理者アカウントの作成
        console.log('5. デフォルト管理者アカウントを作成中...');
        
        // 簡易的なパスワードハッシュ（本番環境ではbcryptを使用）
        const crypto = require('crypto');
        const passwordHash = crypto.createHash('sha256').update('admin123').digest('hex');
        
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
            ) ON CONFLICT (tenant_id, username) DO UPDATE 
            SET password_hash = $2;
        `, [defaultTenantId, passwordHash]);
        
        console.log('✅ デフォルト管理者アカウントを作成しました');
        console.log('   ユーザー名: admin');
        console.log('   パスワード: admin123');

        // 6. 既存データをデフォルトテナントに紐付け
        console.log('6. 既存データをデフォルトテナントに紐付け中...');
        
        await client.query(`UPDATE customers SET tenant_id = $1 WHERE tenant_id IS NULL`, [defaultTenantId]);
        await client.query(`UPDATE staff SET tenant_id = $1 WHERE tenant_id IS NULL`, [defaultTenantId]);
        await client.query(`UPDATE menus SET tenant_id = $1 WHERE tenant_id IS NULL`, [defaultTenantId]);
        await client.query(`UPDATE reservations SET tenant_id = $1 WHERE tenant_id IS NULL`, [defaultTenantId]);
        await client.query(`UPDATE treatment_history SET tenant_id = $1 WHERE tenant_id IS NULL`, [defaultTenantId]);
        
        console.log('✅ 既存データをデフォルトテナントに紐付けました');

        // 7. 外部キー制約の追加
        console.log('7. 外部キー制約を追加中...');
        
        // 外部キー制約を追加（エラーを無視）
        const addForeignKeys = [
            `ALTER TABLE customers ADD CONSTRAINT fk_customers_tenant 
             FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE`,
            
            `ALTER TABLE staff ADD CONSTRAINT fk_staff_tenant 
             FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE`,
            
            `ALTER TABLE menus ADD CONSTRAINT fk_menus_tenant 
             FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE`,
            
            `ALTER TABLE reservations ADD CONSTRAINT fk_reservations_tenant 
             FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE`,
            
            `ALTER TABLE treatment_history ADD CONSTRAINT fk_treatment_history_tenant 
             FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE`
        ];

        for (const query of addForeignKeys) {
            try {
                await client.query(query);
            } catch (err) {
                // 制約が既に存在する場合はスキップ
                if (!err.message.includes('already exists')) {
                    console.log(`警告: ${err.message}`);
                }
            }
        }
        
        console.log('✅ 外部キー制約を追加しました');

        // 8. インデックスの作成
        console.log('8. パフォーマンス向上のためのインデックスを作成中...');
        
        const createIndexes = [
            `CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id)`,
            `CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id)`,
            `CREATE INDEX IF NOT EXISTS idx_menus_tenant ON menus(tenant_id)`,
            `CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON reservations(tenant_id)`,
            `CREATE INDEX IF NOT EXISTS idx_treatment_history_tenant ON treatment_history(tenant_id)`,
            `CREATE INDEX IF NOT EXISTS idx_tenant_admins_tenant ON tenant_admins(tenant_id)`,
            `CREATE INDEX IF NOT EXISTS idx_tenants_code ON tenants(tenant_code)`,
            `CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active)`
        ];

        for (const query of createIndexes) {
            await client.query(query);
        }
        
        console.log('✅ インデックスを作成しました');

        // 9. サンプルテナントの追加（デモ用）
        console.log('9. サンプルテナントを追加中...');
        
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
                ON CONFLICT (tenant_code) DO NOTHING
                RETURNING tenant_id;
            `, [tenant.code, tenant.name, tenant.owner, tenant.email, tenant.phone, tenant.address]);

            if (result.rows.length > 0) {
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
                    ) VALUES ($1, $2, $3, $4, $5, 'admin')
                    ON CONFLICT (tenant_id, username) DO NOTHING;
                `, [tenantId, 'admin', passwordHash, tenant.owner, tenant.email]);
                
                console.log(`✅ サンプルテナント「${tenant.name}」を追加しました`);
            }
        }

        // 10. 結果の確認
        console.log('\n========================================');
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
        
        console.log('\n📋 登録済みテナント一覧:');
        tenantList.rows.forEach(tenant => {
            console.log(`   - [${tenant.tenant_code}] ${tenant.salon_name} (${tenant.subscription_plan}プラン)`);
        });

        console.log('\n========================================');
        console.log('✅ マルチテナント対応の準備が完了しました！');
        console.log('========================================');
        console.log('\n次のステップ:');
        console.log('1. index.jsのAPI修正');
        console.log('2. 管理画面のログイン処理修正');
        console.log('3. テナント切り替え機能の実装');

    } catch (err) {
        console.error('エラーが発生しました:', err);
    } finally {
        await client.end();
        console.log('\nデータベース接続を終了しました');
    }
}

// スクリプトの実行
addTenantSupport();