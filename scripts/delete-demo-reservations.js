// デモ予約データを削除するスクリプト
require('dotenv').config({ path: '.env.local' });
if (require('fs').existsSync('.env.vercel')) {
  require('dotenv').config({ path: '.env.vercel' });
}
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}

const { Client } = require('pg');

async function deleteDemoReservations() {
  const databaseUrl = process.env.POSTGRES_URL || 
                      process.env.POSTGRES_URL_NON_POOLING ||
                      process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ データベース接続URLが見つかりません');
    process.exit(1);
  }

  // postgres://をpostgresql://に変換
  let cleanUrl = databaseUrl;
  if (cleanUrl.startsWith('postgres://')) {
    cleanUrl = cleanUrl.replace('postgres://', 'postgresql://');
  }

  // SSL設定
  const sslConfig = {
    rejectUnauthorized: false
  };

  const client = new Client({
    connectionString: cleanUrl,
    ssl: sslConfig
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    // すべてのテナントを取得
    const tenantsResult = await client.query(
      `SELECT tenant_id, tenant_code, salon_name 
       FROM tenants 
       WHERE is_active = true
       ORDER BY tenant_id`
    );

    console.log('テナント一覧:');
    tenantsResult.rows.forEach((tenant, index) => {
      console.log(`  ${index + 1}. ${tenant.salon_name} (${tenant.tenant_code}) - ID: ${tenant.tenant_id}`);
    });

    // デモテナント（beauty-salon-001）の予約を確認
    const demoTenant = tenantsResult.rows.find(t => t.tenant_code === 'beauty-salon-001');
    
    if (demoTenant) {
      console.log(`\n📋 デモテナント「${demoTenant.salon_name}」の予約を確認中...`);
      
      const demoReservationsResult = await client.query(
        `SELECT COUNT(*) as count
         FROM reservations
         WHERE tenant_id = $1`,
        [demoTenant.tenant_id]
      );
      
      const demoCount = parseInt(demoReservationsResult.rows[0].count);
      console.log(`   予約数: ${demoCount}件`);
      
      if (demoCount > 0) {
        // 予約の詳細を表示
        const reservationsDetail = await client.query(
          `SELECT r.reservation_id, r.reservation_date, r.status, c.real_name as customer_name, m.name as menu_name
           FROM reservations r
           LEFT JOIN customers c ON r.customer_id = c.customer_id
           LEFT JOIN menus m ON r.menu_id = m.menu_id
           WHERE r.tenant_id = $1
           ORDER BY r.reservation_date DESC
           LIMIT 10`,
          [demoTenant.tenant_id]
        );
        
        console.log('\n   最新10件の予約:');
        reservationsDetail.rows.forEach((res, index) => {
          const date = new Date(res.reservation_date);
          console.log(`   ${index + 1}. ${date.toLocaleString('ja-JP')} - ${res.customer_name || '顧客不明'} - ${res.menu_name || 'メニュー不明'} (${res.status})`);
        });
      }
    }

    // 実際の店舗のテナントを確認
    console.log('\n📋 実際の店舗の予約を確認中...');
    const actualTenants = tenantsResult.rows.filter(t => t.tenant_code !== 'beauty-salon-001');
    
    for (const tenant of actualTenants) {
      const reservationsResult = await client.query(
        `SELECT COUNT(*) as count
         FROM reservations
         WHERE tenant_id = $1`,
        [tenant.tenant_id]
      );
      
      const count = parseInt(reservationsResult.rows[0].count);
      console.log(`   ${tenant.salon_name} (${tenant.tenant_code}): ${count}件の予約`);
      
      if (count > 0) {
        // 予約の詳細を表示（最新5件）
        const reservationsDetail = await client.query(
          `SELECT r.reservation_id, r.reservation_date, r.status, r.created_date, c.real_name as customer_name, m.name as menu_name
           FROM reservations r
           LEFT JOIN customers c ON r.customer_id = c.customer_id
           LEFT JOIN menus m ON r.menu_id = m.menu_id
           WHERE r.tenant_id = $1
           ORDER BY r.created_date DESC
           LIMIT 5`,
          [tenant.tenant_id]
        );
        
        console.log(`   最新5件:`);
        reservationsDetail.rows.forEach((res, index) => {
          const date = new Date(res.reservation_date);
          const createdDate = new Date(res.created_date);
          console.log(`     ${index + 1}. ${date.toLocaleString('ja-JP')} - ${res.customer_name || '顧客不明'} - ${res.menu_name || 'メニュー不明'} (作成: ${createdDate.toLocaleString('ja-JP')})`);
        });
      }
    }

    // 削除オプション
    console.log('\n⚠️  デモ予約を削除しますか？');
    console.log('   デモテナント（beauty-salon-001）の予約をすべて削除します。');
    
    // 実際の店舗のテナントIDを指定して削除する場合
    if (actualTenants.length > 0) {
      console.log('\n   実際の店舗の予約からデモ予約を削除する場合は、');
      console.log('   スクリプト内のテナントIDを指定してください。');
    }

    // デモテナントの予約を削除
    if (demoTenant && demoCount > 0) {
      console.log(`\n🗑️  デモテナント「${demoTenant.salon_name}」の予約を削除します...`);
      
      // reservation_menusテーブルからも削除（存在する場合）
      try {
        const deleteMenusResult = await client.query(
          `DELETE FROM reservation_menus 
           WHERE reservation_id IN (
             SELECT reservation_id FROM reservations WHERE tenant_id = $1
           )`,
          [demoTenant.tenant_id]
        );
        console.log(`   reservation_menusから ${deleteMenusResult.rowCount}件削除`);
      } catch (error) {
        // reservation_menusテーブルが存在しない場合はスキップ
        if (!error.message.includes('reservation_menus')) {
          throw error;
        }
      }
      
      // 予約を削除
      const deleteResult = await client.query(
        `DELETE FROM reservations WHERE tenant_id = $1`,
        [demoTenant.tenant_id]
      );
      
      console.log(`✅ ${deleteResult.rowCount}件の予約を削除しました`);
    }

    // 実際の店舗のテナントIDを指定して削除する場合の処理
    // コマンドライン引数からテナントIDを取得
    const args = process.argv.slice(2);
    const actualTenantIdArg = args.find(arg => arg.startsWith('--tenant-id='));
    const actualTenantId = actualTenantIdArg ? parseInt(actualTenantIdArg.split('=')[1]) : null;
    
    if (actualTenantId) {
      const actualTenant = tenantsResult.rows.find(t => t.tenant_id === actualTenantId);
      if (!actualTenant) {
        console.log(`\n⚠️  テナントID ${actualTenantId} が見つかりません`);
      } else {
        console.log(`\n📋 テナント「${actualTenant.salon_name}」の予約を確認中...`);
        
        const actualReservationsResult = await client.query(
          `SELECT r.reservation_id, r.reservation_date, r.status, r.created_date, c.real_name as customer_name, m.name as menu_name
           FROM reservations r
           LEFT JOIN customers c ON r.customer_id = c.customer_id
           LEFT JOIN menus m ON r.menu_id = m.menu_id
           WHERE r.tenant_id = $1
           ORDER BY r.created_date DESC`,
          [actualTenantId]
        );
        
        console.log(`   予約数: ${actualReservationsResult.rows.length}件`);
        
        if (actualReservationsResult.rows.length > 0) {
          console.log('\n   すべての予約:');
          actualReservationsResult.rows.forEach((res, index) => {
            const date = new Date(res.reservation_date);
            const createdDate = new Date(res.created_date);
            console.log(`   ${index + 1}. ID:${res.reservation_id} - ${date.toLocaleString('ja-JP')} - ${res.customer_name || '顧客不明'} - ${res.menu_name || 'メニュー不明'} (作成: ${createdDate.toLocaleString('ja-JP')})`);
          });
          
          console.log('\n⚠️  このテナントの予約をすべて削除しますか？');
          console.log('   削除する場合は、スクリプトを実行する際に --delete オプションを追加してください。');
          
          // --deleteオプションがある場合のみ削除
          if (args.includes('--delete')) {
            console.log('\n🗑️  予約を削除します...');
            
            // reservation_menusテーブルからも削除
            try {
              const deleteMenusResult = await client.query(
                `DELETE FROM reservation_menus 
                 WHERE reservation_id IN (
                   SELECT reservation_id FROM reservations WHERE tenant_id = $1
                 )`,
                [actualTenantId]
              );
              console.log(`   reservation_menusから ${deleteMenusResult.rowCount}件削除`);
            } catch (error) {
              if (!error.message.includes('reservation_menus')) {
                throw error;
              }
            }
            
            // 予約を削除
            const deleteResult = await client.query(
              `DELETE FROM reservations WHERE tenant_id = $1`,
              [actualTenantId]
            );
            
            console.log(`✅ ${deleteResult.rowCount}件の予約を削除しました`);
          }
        }
      }
    } else {
      console.log('\n💡 実際の店舗の予約を削除する場合:');
      console.log('   node scripts/delete-demo-reservations.js --tenant-id=<テナントID> --delete');
      console.log('   例: node scripts/delete-demo-reservations.js --tenant-id=2 --delete');
    }
    
    console.log('\n✅ 処理が完了しました');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

deleteDemoReservations();
