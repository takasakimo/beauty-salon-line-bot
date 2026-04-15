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
      const passwordMatch = hasPassword && row.password_hash === passwordHash;
      const shouldAddTenant = passwordMatch || !hasPassword;
      
      if (shouldAddTenant) {
        const tenantData = {
          tenant_id: row.tenant_id,
          tenant_code: row.tenant_code,
          salon_name: row.salon_name,
          customer_id: row.customer_id,
          real_name: row.real_name,
          email: row.email,
          phone_number: row.phone_number,
          has_customer: true, // メールアドレスがcustomersテーブルに存在
          has_admin: false,  // メールアドレスがtenant_adminsテーブルに存在するかは後で判定
          needs_password: !hasPassword // パスワードが設定されていない場合はtrue（パスワードが一致する場合はfalse）
        };
        tenants.push(tenantData);
        tenantMap.set(row.tenant_id, tenantData);
      }
    }

    // 管理者として登録されている店舗を追加（パスワード検証、重複チェック）
    for (const row of adminSearchResult.rows) {
      const hasPassword = !!row.password_hash;
      const passwordMatch = hasPassword && row.password_hash === passwordHash;
      
      // パスワードが一致するか、パスワードが設定されていない場合は店舗を追加
      const shouldAddTenant = passwordMatch || !hasPassword;
      
      if (shouldAddTenant) {
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
            has_customer: false, // メールアドレスがcustomersテーブルに存在しない
            has_admin: true,     // メールアドレスがtenant_adminsテーブルに存在
            needs_password: !hasPassword // パスワードが設定されていない場合はtrue（パスワードが一致する場合はfalse）
          };
          tenants.push(tenantData);
          tenantMap.set(row.tenant_id, tenantData);
        } else {
          // 既に顧客として存在する場合は、管理者情報も追加
          existing.admin_id = row.admin_id;
          existing.has_admin = true; // メールアドレスがtenant_adminsテーブルにも存在
          // パスワードが必要な場合は、既存のneeds_passwordを更新
          // 顧客側と管理者側の両方でパスワードが設定されていて一致する場合はfalse、それ以外はtrue
          // 顧客側のneeds_passwordは既に設定されている（!hasPassword for customer）
          // 管理者側でパスワードが設定されていない、または一致しない場合はtrue
          const customerNeedsPassword = existing.needs_password;
          const adminNeedsPassword = !hasPassword; // 管理者側でパスワードが設定されていない場合のみtrue
          // 両方でパスワードが設定されていて一致する場合はfalse、それ以外はtrue
          // ただし、顧客側でパスワードが一致している場合は、管理者側の状態に関係なくfalseにする
          if (!customerNeedsPassword && passwordMatch) {
            // 顧客側でパスワードが一致している場合は、管理者側の状態に関係なくfalse
            existing.needs_password = false;
          } else {
            // 顧客側でパスワードが必要な場合、または管理者側でパスワードが必要な場合はtrue
            existing.needs_password = customerNeedsPassword || adminNeedsPassword;
          }
        }
      }
    }

    // スーパー管理者をチェック
    const trimmedInput = email.trim().toLowerCase();
    const superAdminResult = await query(
      `SELECT super_admin_id, full_name, username, password_hash, is_active
       FROM super_admins 
       WHERE LOWER(TRIM(username)) = $1`,
      [trimmedInput]
    );

    if (superAdminResult.rows.length > 0) {
      const superAdmin = superAdminResult.rows[0];
      const hasPassword = !!superAdmin.password_hash;
      const passwordMatch = hasPassword && superAdmin.password_hash === passwordHash;

      if (superAdmin.is_active && (passwordMatch || !hasPassword)) {
        return NextResponse.json({
          success: true,
          isSuperAdmin: true,
          tenants: []
        });
      }
    }

    // 企業管理者をチェック
    const companyAdminResult = await query(
      `SELECT ca.company_admin_id, ca.company_id, ca.username, ca.email, ca.password_hash, ca.is_active
       FROM company_admins ca
       WHERE (LOWER(TRIM(ca.username)) = $1 OR LOWER(TRIM(ca.email)) = $1)
       AND ca.is_active = true`,
      [trimmedInput]
    );

    if (companyAdminResult.rows.length > 0) {
      const companyAdmin = companyAdminResult.rows[0];
      const hasPassword = !!companyAdmin.password_hash;
      const passwordMatch = hasPassword && companyAdmin.password_hash === passwordHash;

      if (passwordMatch || !hasPassword) {
        return NextResponse.json({
          success: true,
          isCompanyAdmin: true,
          tenants: []
        });
      }
    }

    if (tenants.length === 0) {
      console.log('店舗が見つかりませんでした');
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

