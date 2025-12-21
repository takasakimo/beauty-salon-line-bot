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

    // 予約を作成
    const insertQuery = `
      INSERT INTO reservations (tenant_id, customer_id, staff_id, menu_id, reservation_date, status, created_date)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING reservation_id
    `;
    const result = await query(insertQuery, [
      tenantId,
      actualCustomerId,
      staff_id,
      menu_id,
      reservation_date,
      status
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

