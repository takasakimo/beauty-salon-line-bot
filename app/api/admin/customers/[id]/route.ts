import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 顧客更新（管理画面用）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = getTenantIdFromRequest(request, session);
    if (!tenantId) {
      return NextResponse.json(
        { error: '店舗IDが指定されていません' },
        { status: 400 }
      );
    }
    const customerId = parseInt(params.id);
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

    // メールアドレスの重複チェック（自分以外）
    if (email) {
      const emailCheck = await query(
        'SELECT customer_id FROM customers WHERE email = $1 AND tenant_id = $2 AND customer_id != $3',
        [email, tenantId, customerId]
      );
      if (emailCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 400 }
        );
      }
    }

    // 電話番号の重複チェック（自分以外）
    if (phone_number) {
      const phoneCheck = await query(
        'SELECT customer_id FROM customers WHERE phone_number = $1 AND tenant_id = $2 AND customer_id != $3',
        [phone_number, tenantId, customerId]
      );
      if (phoneCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'この電話番号は既に登録されています' },
          { status: 400 }
        );
      }
    }

    const result = await query(
      `UPDATE customers 
       SET 
         real_name = $1,
         email = $2,
         phone_number = $3,
         address = $4,
         birthday = $5,
         allergy_info = $6,
         preferences = $7
       WHERE customer_id = $8 AND tenant_id = $9
       RETURNING *`,
      [
        real_name,
        email || null,
        phone_number || null,
        address || null,
        birthday || null,
        allergy_info || null,
        preferences || null,
        customerId,
        tenantId
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '顧客が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 顧客削除（管理画面用）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = getTenantIdFromRequest(request, session);
    if (!tenantId) {
      return NextResponse.json(
        { error: '店舗IDが指定されていません' },
        { status: 400 }
      );
    }
    const customerId = parseInt(params.id);

    // 予約がある場合は削除できない
    const reservationCheck = await query(
      `SELECT COUNT(*) as count 
       FROM reservations 
       WHERE customer_id = $1 AND tenant_id = $2 AND status != 'cancelled'`,
      [customerId, tenantId]
    );

    if (parseInt(reservationCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: '予約がある顧客は削除できません' },
        { status: 400 }
      );
    }

    await query(
      `DELETE FROM customers WHERE customer_id = $1 AND tenant_id = $2`,
      [customerId, tenantId]
    );

    return NextResponse.json({ message: '顧客を削除しました' });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

