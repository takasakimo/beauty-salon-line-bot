import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCustomerAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getCustomerAuthFromRequest(request);
    if (!session || !session.customerId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const customerResult = await query(
      'SELECT customer_id, real_name, email, phone_number, registered_date FROM customers WHERE customer_id = $1',
      [session.customerId]
    );

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

