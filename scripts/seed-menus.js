// デフォルトメニューデータ投入スクリプト
require('dotenv').config({ path: '.env.local' });
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}
const { Client } = require('pg');

// 美容院の一般的なメニューと価格
const defaultMenus = [
  // カット系
  { name: 'カット（男性）', price: 3000, duration: 30, description: '男性用カット' },
  { name: 'カット（女性）', price: 4000, duration: 45, description: '女性用カット' },
  { name: 'カット（子供）', price: 2000, duration: 20, description: '小学生以下' },
  
  // カラー系
  { name: 'カラー（全体）', price: 6000, duration: 90, description: '全体カラー' },
  { name: 'カラー（部分）', price: 4000, duration: 60, description: '部分カラー' },
  { name: 'ハイライト', price: 8000, duration: 120, description: 'ハイライトカラー' },
  { name: 'グラデーション', price: 7000, duration: 100, description: 'グラデーションカラー' },
  { name: 'ブリーチ', price: 10000, duration: 150, description: 'ブリーチカラー' },
  
  // パーマ系
  { name: 'パーマ（全体）', price: 7000, duration: 120, description: '全体パーマ' },
  { name: 'パーマ（部分）', price: 5000, duration: 90, description: '部分パーマ' },
  { name: 'デジタルパーマ', price: 8000, duration: 120, description: 'デジタルパーマ' },
  { name: 'ストレートパーマ', price: 9000, duration: 150, description: 'ストレートパーマ' },
  
  // トリートメント系
  { name: 'トリートメント', price: 3000, duration: 30, description: '基本トリートメント' },
  { name: 'ヘッドスパ', price: 4000, duration: 45, description: 'ヘッドスパ' },
  { name: 'ヘッドスパ（プレミアム）', price: 6000, duration: 60, description: 'プレミアムヘッドスパ' },
  { name: 'ダメージケア', price: 5000, duration: 40, description: 'ダメージケアトリートメント' },
  
  // セットメニュー
  { name: 'カット+カラー', price: 9000, duration: 120, description: 'カットとカラーのセット' },
  { name: 'カット+パーマ', price: 10000, duration: 150, description: 'カットとパーマのセット' },
  { name: 'カット+カラー+パーマ', price: 15000, duration: 180, description: 'カット・カラー・パーマのセット' },
  { name: 'カット+トリートメント', price: 6000, duration: 60, description: 'カットとトリートメントのセット' },
  { name: 'カット+ヘッドスパ', price: 7000, duration: 75, description: 'カットとヘッドスパのセット' },
  
  // その他
  { name: 'エクステンション', price: 15000, duration: 180, description: 'エクステンション（1束）' },
  { name: 'エクステンション（フル）', price: 50000, duration: 300, description: 'フルエクステンション' },
  { name: '縮毛矯正', price: 12000, duration: 180, description: '縮毛矯正' },
  { name: 'カラーリタッチ', price: 3000, duration: 60, description: '根元カラー' },
];

async function seedMenus() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL環境変数が設定されていません');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    // テナントを取得
    const tenantResult = await client.query(
      'SELECT tenant_id, tenant_code, salon_name FROM tenants WHERE tenant_code = $1',
      ['beauty-salon-001']
    );

    if (tenantResult.rows.length === 0) {
      console.error('❌ テナントが見つかりません');
      process.exit(1);
    }

    const tenant = tenantResult.rows[0];
    console.log(`テナント: ${tenant.salon_name} (${tenant.tenant_code})\n`);

    // 既存のメニューを確認
    const existingMenus = await client.query(
      'SELECT COUNT(*) as count FROM menus WHERE tenant_id = $1',
      [tenant.tenant_id]
    );

    const existingCount = parseInt(existingMenus.rows[0].count);
    console.log(`既存メニュー数: ${existingCount}\n`);

    if (existingCount > 0) {
      console.log('⚠️  既にメニューが登録されています。');
      console.log('   すべて削除してから再投入しますか？ (y/N)');
      // 自動実行の場合はスキップ
      console.log('   スキップします。');
      await client.end();
      return;
    }

    // メニューを投入
    console.log('メニューを投入中...\n');
    let insertedCount = 0;

    for (const menu of defaultMenus) {
      try {
        await client.query(
          `INSERT INTO menus (name, price, duration, description, tenant_id, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [menu.name, menu.price, menu.duration, menu.description, tenant.tenant_id]
        );
        insertedCount++;
        console.log(`  ✓ ${menu.name} (¥${menu.price.toLocaleString()}, ${menu.duration}分)`);
      } catch (error) {
        console.error(`  ✗ ${menu.name}: ${error.message}`);
      }
    }

    console.log(`\n✅ ${insertedCount}件のメニューを投入しました`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedMenus();

