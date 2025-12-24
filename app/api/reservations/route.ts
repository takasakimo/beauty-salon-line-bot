import { NextRequest, NextResponse } from 'next/server';
import { query, getTenantIdFromRequest } from '@/lib/db';

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
      staff_id,
      reservation_date,
      status = 'confirmed'
    } = body;

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

    // メニューの価格を取得
    const menuResult = await query(
      'SELECT price FROM menus WHERE menu_id = $1 AND tenant_id = $2',
      [menu_id, tenantId]
    );

    if (menuResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'メニューが見つかりません' },
        { status: 404 }
      );
    }

    const price = menuResult.rows[0].price;

    // メニューの所要時間を取得
    const menuDurationResult = await query(
      'SELECT duration FROM menus WHERE menu_id = $1 AND tenant_id = $2',
      [menu_id, tenantId]
    );
    const duration = menuDurationResult.rows[0]?.duration || 60;

    // 最大同時予約数を取得
    const tenantResult = await query(
      'SELECT max_concurrent_reservations FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );
    const maxConcurrent = tenantResult.rows[0]?.max_concurrent_reservations || 3;

    // 予約日時を計算
    const reservationDateTime = new Date(reservation_date);
    const reservationEndTime = new Date(reservationDateTime.getTime() + duration * 60000);

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

    // 予約を作成
    const insertQuery = `
      INSERT INTO reservations (tenant_id, customer_id, staff_id, menu_id, reservation_date, status, price, created_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING reservation_id
    `;
    const result = await query(insertQuery, [
      tenantId,
      actualCustomerId,
      staff_id || null,
      menu_id,
      reservation_date,
      status,
      price
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '予約が完了しました'
    });
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

