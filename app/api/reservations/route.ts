import { NextRequest, NextResponse } from 'next/server';
import { query, getTenantIdFromRequest, getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 予約作成
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'テナントが見つかりません' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      customer_id,
      email,
      phone_number,
      customer_name,
      menu_id,
      menu_ids,
      staff_id,
      reservation_date,
      status = 'confirmed'
    } = body;

    // menu_idsが配列の場合はそれを使用、そうでなければmenu_idを配列に変換
    const menuIds = menu_ids && Array.isArray(menu_ids) && menu_ids.length > 0
      ? menu_ids
      : menu_id
        ? [menu_id]
        : [];

    if (menuIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'メニューが選択されていません' },
        { status: 400 }
      );
    }

    // 顧客IDが指定されていない場合は、emailまたはphone_numberで顧客を検索
    let actualCustomerId = customer_id;
    
    if (!actualCustomerId) {
      if (email || phone_number) {
        const customerQuery = email
          ? 'SELECT customer_id FROM customers WHERE email = $1 AND tenant_id = $2'
          : 'SELECT customer_id FROM customers WHERE phone_number = $1 AND tenant_id = $2';
        const customerParams = email ? [email, tenantId] : [phone_number, tenantId];
        const customerResult = await query(customerQuery, customerParams);
        
        if (customerResult.rows.length > 0) {
          actualCustomerId = customerResult.rows[0].customer_id;
        } else if (customer_name) {
          // 顧客が存在しない場合は作成
          const insertCustomerQuery = `
            INSERT INTO customers (tenant_id, email, real_name, phone_number, registered_date) 
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING customer_id
          `;
          const newCustomerResult = await query(insertCustomerQuery, [
            tenantId, email || null, customer_name, phone_number || null
          ]);
          actualCustomerId = newCustomerResult.rows[0].customer_id;
        }
      }
    }

    if (!actualCustomerId) {
      return NextResponse.json(
        { success: false, error: '顧客情報が必要です' },
        { status: 400 }
      );
    }

    // メニュー情報を取得（複数メニュー対応）
    const menuResult = await query(
      `SELECT menu_id, price, duration FROM menus 
       WHERE menu_id = ANY($1::int[]) AND tenant_id = $2`,
      [menuIds, tenantId]
    );

    if (menuResult.rows.length !== menuIds.length) {
      return NextResponse.json(
        { success: false, error: '一部のメニューが見つかりません' },
        { status: 404 }
      );
    }

    // 合計金額と合計時間を計算
    const totalPrice = menuResult.rows.reduce((sum, row) => sum + row.price, 0);
    const totalDuration = menuResult.rows.reduce((sum, row) => sum + row.duration, 0);

    // 最大同時予約数を取得
    const tenantResult = await query(
      'SELECT max_concurrent_reservations FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );
    const maxConcurrent = tenantResult.rows[0]?.max_concurrent_reservations || 3;

    // 予約日時を計算
    const reservationDateTime = new Date(reservation_date);
    const reservationEndTime = new Date(reservationDateTime.getTime() + totalDuration * 60000);

    // 同じ時間帯の既存予約数をカウント（スタッフ未指定の予約も含む）
    const concurrentCheck = await query(
      `SELECT 
         r.reservation_date,
         COALESCE(m.duration, 60) as duration
       FROM reservations r
       LEFT JOIN menus m ON r.menu_id = m.menu_id
       WHERE r.tenant_id = $1
       AND r.status = 'confirmed'
       AND DATE(r.reservation_date) = DATE($2)`,
      [tenantId, reservation_date]
    );

    // JavaScriptで時間帯の重複をチェック
    let concurrentCount = 0;
    concurrentCheck.rows.forEach((row: any) => {
      const existingStart = new Date(row.reservation_date);
      const existingDuration = row.duration || 60;
      const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);
      
      // 時間帯が重複しているかチェック
      if (reservationDateTime < existingEnd && reservationEndTime > existingStart) {
        concurrentCount++;
      }
    });

    if (concurrentCount >= maxConcurrent) {
      return NextResponse.json(
        { success: false, error: `この時間帯は既に${maxConcurrent}件の予約が入っています。別の時間を選択してください。` },
        { status: 400 }
      );
    }

    // トランザクション開始
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 予約を作成（menu_idは最初のメニューを設定、後でreservation_menusに全メニューを保存）
      const insertQuery = `
        INSERT INTO reservations (tenant_id, customer_id, staff_id, menu_id, reservation_date, status, price, created_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING reservation_id
      `;
      const result = await client.query(insertQuery, [
        tenantId,
        actualCustomerId,
        staff_id || null,
        menuIds[0], // 最初のメニューIDを設定（後方互換性のため）
        reservation_date,
        status,
        totalPrice
      ]);

      const reservationId = result.rows[0].reservation_id;

      // reservation_menusテーブルに全メニューを保存
      try {
        for (const menuRow of menuResult.rows) {
          await client.query(
            `INSERT INTO reservation_menus (reservation_id, menu_id, tenant_id, price)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (reservation_id, menu_id) DO NOTHING`,
            [reservationId, menuRow.menu_id, tenantId, menuRow.price]
          );
        }
      } catch (menuError: any) {
        // reservation_menusテーブルが存在しない場合はスキップ（後方互換性）
        if (menuError.message && menuError.message.includes('reservation_menus')) {
          console.log('reservation_menusテーブルが存在しないため、メニュー関連の処理をスキップします');
        } else {
          throw menuError;
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: { reservation_id: reservationId },
        message: '予約が完了しました'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('予約作成エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: '予約の作成に失敗しました',
        details: error.message
      },
      { status: 500 }
    );
  }
}

