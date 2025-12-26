import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCustomerAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getCustomerAuthFromRequest(request);
    if (!session || !session.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // tenantCodeが指定されている場合は、その店舗の顧客情報を取得
    const tenantCode = request.nextUrl.searchParams.get('tenant');
    let customerResult;

    if (tenantCode) {
      // 指定された店舗のtenantIdを取得
      const tenantResult = await query(
        'SELECT tenant_id FROM tenants WHERE tenant_code = $1 AND is_active = true',
        [tenantCode]
      );

      if (tenantResult.rows.length === 0) {
        return NextResponse.json(
          { error: '店舗が見つかりません' },
          { status: 404 }
        );
      }

      const tenantId = tenantResult.rows[0].tenant_id;
      const email = session.email.toLowerCase().trim();

      // その店舗の顧客情報を取得（顧客または管理者）
      customerResult = await query(
        `SELECT customer_id, real_name, email, phone_number, registered_date 
         FROM customers 
         WHERE LOWER(TRIM(email)) = $1 AND tenant_id = $2`,
        [email, tenantId]
      );

      // 顧客として見つからない場合は、管理者として検索
      if (customerResult.rows.length === 0) {
        const adminResult = await query(
          `SELECT NULL as customer_id, full_name as real_name, email, NULL as phone_number, created_at as registered_date
           FROM tenant_admins
           WHERE (LOWER(TRIM(email)) = $1 OR LOWER(TRIM(username)) = $1) AND tenant_id = $2 AND is_active = true`,
          [email, tenantId]
        );

        if (adminResult.rows.length > 0) {
          customerResult = adminResult;
        }
      }
    } else {
      // tenantCodeが指定されていない場合は、セッションのcustomerIdを使用（後方互換性のため）
      if (!session.customerId) {
        return NextResponse.json(
          { error: '顧客情報が見つかりません' },
          { status: 404 }
        );
      }

      customerResult = await query(
        'SELECT customer_id, real_name, email, phone_number, registered_date FROM customers WHERE customer_id = $1',
        [session.customerId]
      );
    }

    if (customerResult.rows.length === 0) {
      return NextResponse.json(
        { error: '顧客情報が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(customerResult.rows[0]);
  } catch (error: any) {
    console.error('顧客情報取得エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

