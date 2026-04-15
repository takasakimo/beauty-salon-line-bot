import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * メールアドレスとパスワードで、その顧客が登録している店舗一覧を取得
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスとパスワードを入力してください' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // まずemailで顧客を検索（パスワードは後で検証）
    const customerSearchResult = await query(
      `SELECT DISTINCT
        c.tenant_id,
        t.tenant_code,
        t.salon_name,
        c.customer_id,
        c.real_name,
        c.email,
        c.phone_number,
        c.password_hash
       FROM customers c
       INNER JOIN tenants t ON c.tenant_id = t.tenant_id
       WHERE LOWER(TRIM(c.email)) = $1 AND t.is_active = true
       ORDER BY t.salon_name`,
      [trimmedEmail]
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
        ta.password_hash,
        NULL as phone_number
       FROM tenant_admins ta
       INNER JOIN tenants t ON ta.tenant_id = t.tenant_id
       WHERE (LOWER(TRIM(ta.email)) = $1 OR LOWER(TRIM(ta.username)) = $1)
       AND ta.is_active = true
       AND t.is_active = true
       ORDER BY t.salon_name`,
      [trimmedEmail]
    );

    const tenants: any[] = [];
    const tenantMap = new Map<number, any>();

    // 顧客として登録されている店舗を追加（パスワード検証）
    for (const row of customerSearchResult.rows) {
      const hasPassword = !!row.password_hash;
      const passwordMatch = hasPassword && await verifyPassword(password, row.password_hash);

      // パスワードが一致するか、パスワードが設定されていない場合は店舗を追加
      if (passwordMatch || !hasPassword) {
        const tenantData = {
          tenant_id: row.tenant_id,
          tenant_code: row.tenant_code,
          salon_name: row.salon_name,
          customer_id: row.customer_id,
          real_name: row.real_name,
          email: row.email,
          phone_number: row.phone_number,
          has_customer: true,
          has_admin: false,
          needs_password: !hasPassword
        };
        tenants.push(tenantData);
        tenantMap.set(row.tenant_id, tenantData);
      }
    }

    // 管理者として登録されている店舗を追加（パスワード検証、重複チェック）
    for (const row of adminSearchResult.rows) {
      const hasPassword = !!row.password_hash;
      const passwordMatch = hasPassword && await verifyPassword(password, row.password_hash);

      if (passwordMatch || !hasPassword) {
        const existing = tenantMap.get(row.tenant_id);
        if (!existing) {
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
            has_admin: true,
            needs_password: !hasPassword
          };
          tenants.push(tenantData);
          tenantMap.set(row.tenant_id, tenantData);
        } else {
          existing.admin_id = row.admin_id;
          existing.has_admin = true;
          const customerNeedsPassword = existing.needs_password;
          const adminNeedsPassword = !hasPassword;
          if (!customerNeedsPassword && passwordMatch) {
            existing.needs_password = false;
          } else {
            existing.needs_password = customerNeedsPassword || adminNeedsPassword;
          }
        }
      }
    }

    // スーパー管理者もチェック
    const trimmedInput = email.trim();
    const superAdminResult = await query(
      `SELECT super_admin_id, full_name, username, password_hash, is_active
       FROM super_admins
       WHERE username = $1`,
      [trimmedInput]
    );

    if (superAdminResult.rows.length > 0) {
      const superAdmin = superAdminResult.rows[0];
      const hasPassword = !!superAdmin.password_hash;
      const passwordMatch = hasPassword && await verifyPassword(password, superAdmin.password_hash);

      if (superAdmin.is_active && (passwordMatch || !hasPassword)) {
        return NextResponse.json({
          success: true,
          isSuperAdmin: true,
          tenants: []
        });
      }
    }

    if (tenants.length === 0) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
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

