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

    console.log('店舗一覧取得リクエスト:', { email: email?.trim(), hasPassword: !!password });

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスとパスワードを入力してください' },
        { status: 400 }
      );
    }

    // パスワードハッシュの生成
    const passwordHash = hashPassword(password);
    const trimmedEmail = email.trim().toLowerCase();

    console.log('パスワードハッシュ生成完了:', { email: trimmedEmail, hashPreview: passwordHash.substring(0, 20) + '...' });

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

    console.log('顧客検索結果（emailのみ）:', { count: customerSearchResult.rows.length });

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

    console.log('管理者検索結果（emailのみ）:', { count: adminSearchResult.rows.length });

    const tenants: any[] = [];
    const tenantMap = new Map<number, any>();

    // 顧客として登録されている店舗を追加（パスワード検証）
    for (const row of customerSearchResult.rows) {
      if (row.password_hash === passwordHash) {
        const tenantData = {
          tenant_id: row.tenant_id,
          tenant_code: row.tenant_code,
          salon_name: row.salon_name,
          customer_id: row.customer_id,
          real_name: row.real_name,
          email: row.email,
          phone_number: row.phone_number,
          has_customer: true, // メールアドレスがcustomersテーブルに存在
          has_admin: false    // メールアドレスがtenant_adminsテーブルに存在するかは後で判定
        };
        tenants.push(tenantData);
        tenantMap.set(row.tenant_id, tenantData);
      }
    }

    console.log('パスワード検証後の顧客店舗:', { count: tenants.length });

    // 管理者として登録されている店舗を追加（パスワード検証、重複チェック）
    for (const row of adminSearchResult.rows) {
      if (row.password_hash === passwordHash) {
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
            has_admin: true      // メールアドレスがtenant_adminsテーブルに存在
          };
          tenants.push(tenantData);
          tenantMap.set(row.tenant_id, tenantData);
        } else {
          // 既に顧客として存在する場合は、管理者情報も追加
          existing.admin_id = row.admin_id;
          existing.has_admin = true; // メールアドレスがtenant_adminsテーブルにも存在
        }
      }
    }

    console.log('パスワード検証後の管理者店舗:', { count: tenants.length });

    console.log('最終的な店舗リスト:', { count: tenants.length, tenants: tenants.map(t => ({ tenant_id: t.tenant_id, salon_name: t.salon_name, is_admin: t.is_admin })) });

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

