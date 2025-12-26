import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCustomerAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * ログイン中の顧客が登録されている店舗一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCustomerAuthFromRequest(request);
    if (!session || !session.customerId || !session.email) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const email = session.email.toLowerCase().trim();

    // 顧客として登録されている店舗を取得
    const customerSearchResult = await query(
      `SELECT DISTINCT
        c.tenant_id,
        t.tenant_code,
        t.salon_name,
        c.customer_id,
        c.real_name,
        c.email,
        c.phone_number
       FROM customers c
       INNER JOIN tenants t ON c.tenant_id = t.tenant_id
       WHERE LOWER(TRIM(c.email)) = $1 AND t.is_active = true
       ORDER BY t.salon_name`,
      [email]
    );

    // 管理者としても登録されている可能性があるので、管理者テーブルもチェック
    const adminSearchResult = await query(
      `SELECT DISTINCT
        ta.tenant_id,
        t.tenant_code,
        t.salon_name,
        ta.admin_id,
        ta.full_name as real_name,
        ta.email,
        NULL as phone_number
       FROM tenant_admins ta
       INNER JOIN tenants t ON ta.tenant_id = t.tenant_id
       WHERE (LOWER(TRIM(ta.email)) = $1 OR LOWER(TRIM(ta.username)) = $1)
       AND ta.is_active = true
       AND t.is_active = true
       ORDER BY t.salon_name`,
      [email]
    );

    const tenants: any[] = [];
    const tenantMap = new Map<number, any>();

    // 顧客として登録されている店舗を追加
    for (const row of customerSearchResult.rows) {
      const tenantData = {
        tenant_id: row.tenant_id,
        tenant_code: row.tenant_code,
        salon_name: row.salon_name,
        customer_id: row.customer_id,
        real_name: row.real_name,
        email: row.email,
        phone_number: row.phone_number,
        has_customer: true,
        has_admin: false
      };
      tenants.push(tenantData);
      tenantMap.set(row.tenant_id, tenantData);
    }

    // 管理者として登録されている店舗を追加（重複チェック）
    for (const row of adminSearchResult.rows) {
      const existing = tenantMap.get(row.tenant_id);
      if (!existing) {
        // 顧客として存在しない場合は新規追加
        const tenantData = {
          tenant_id: row.tenant_id,
          tenant_code: row.tenant_code,
          salon_name: row.salon_name,
          customer_id: null,
          admin_id: row.admin_id,
          real_name: row.real_name,
          email: row.email,
          phone_number: row.phone_number,
          has_customer: false,
          has_admin: true
        };
        tenants.push(tenantData);
        tenantMap.set(row.tenant_id, tenantData);
      } else {
        // 既に顧客として存在する場合は、管理者情報も追加
        existing.admin_id = row.admin_id;
        existing.has_admin = true;
      }
    }

    return NextResponse.json({
      success: true,
      tenants: tenants
    });
  } catch (error: any) {
    console.error('店舗一覧取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラー' },
      { status: 500 }
    );
  }
}

