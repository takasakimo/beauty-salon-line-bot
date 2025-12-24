import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 顧客一覧取得（管理画面用）
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    let queryText = `
      SELECT 
        customer_id, 
        real_name, 
        email, 
        phone_number, 
        address,
        birthday,
        allergy_info,
        preferences,
        registered_date
      FROM customers 
      WHERE tenant_id = $1
    `;
    const params: any[] = [tenantId];

    // 検索条件
    if (search) {
      queryText += ` AND (
        real_name ILIKE $2 OR 
        email ILIKE $2 OR 
        phone_number ILIKE $2
      )`;
      params.push(`%${search}%`);
    }

    queryText += ' ORDER BY registered_date DESC';

    const result = await query(queryText, params);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 顧客追加（管理画面用）
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;
    const body = await request.json();
    const { 
      real_name, 
      email, 
      phone_number, 
      address, 
      birthday, 
      allergy_info, 
      preferences 
    } = body;

    // バリデーション
    if (!real_name) {
      return NextResponse.json(
        { error: '氏名は必須です' },
        { status: 400 }
      );
    }

    // メールアドレスの重複チェック
    if (email) {
      const emailCheck = await query(
        'SELECT customer_id FROM customers WHERE email = $1 AND tenant_id = $2',
        [email, tenantId]
      );
      if (emailCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 400 }
        );
      }
    }

    // 電話番号の重複チェック
    if (phone_number) {
      const phoneCheck = await query(
        'SELECT customer_id FROM customers WHERE phone_number = $1 AND tenant_id = $2',
        [phone_number, tenantId]
      );
      if (phoneCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'この電話番号は既に登録されています' },
          { status: 400 }
        );
      }
    }

    const result = await query(
      `INSERT INTO customers (
        tenant_id, 
        real_name, 
        email, 
        phone_number, 
        address, 
        birthday, 
        allergy_info, 
        preferences,
        registered_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        tenantId,
        real_name,
        email || null,
        phone_number || null,
        address || null,
        birthday || null,
        allergy_info || null,
        preferences || null
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

