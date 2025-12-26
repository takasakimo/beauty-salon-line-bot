import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

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

    // パスワードハッシュの生成
    const passwordHash = hashPassword(password);

    // 顧客が登録している店舗一覧を取得
    const customerTenantsResult = await query(
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
       WHERE c.email = $1 AND c.password_hash = $2 AND t.is_active = true
       ORDER BY t.salon_name`,
      [email.trim(), passwordHash]
    );

    // 管理者としても登録されている可能性があるので、管理者テーブルもチェック
    const adminTenantsResult = await query(
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
       WHERE (ta.email = $1 OR ta.username = $1) 
       AND ta.password_hash = $2 
       AND ta.is_active = true
       AND t.is_active = true
       ORDER BY t.salon_name`,
      [email.trim(), passwordHash]
    );

    const tenants: any[] = [];

    // 顧客として登録されている店舗を追加
    for (const row of customerTenantsResult.rows) {
      tenants.push({
        tenant_id: row.tenant_id,
        tenant_code: row.tenant_code,
        salon_name: row.salon_name,
        customer_id: row.customer_id,
        real_name: row.real_name,
        email: row.email,
        phone_number: row.phone_number,
        is_admin: false
      });
    }

    // 管理者として登録されている店舗を追加（重複チェック）
    for (const row of adminTenantsResult.rows) {
      // 既に顧客として追加されている場合はスキップ
      if (!tenants.find(t => t.tenant_id === row.tenant_id)) {
        tenants.push({
          tenant_id: row.tenant_id,
          tenant_code: row.tenant_code,
          salon_name: row.salon_name,
          customer_id: null,
          admin_id: row.admin_id,
          real_name: row.real_name,
          email: row.email,
          phone_number: row.phone_number,
          is_admin: true
        });
      } else {
        // 既に顧客として存在する場合は、管理者情報も追加
        const existing = tenants.find(t => t.tenant_id === row.tenant_id);
        if (existing) {
          existing.admin_id = row.admin_id;
          existing.is_admin = true;
        }
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

