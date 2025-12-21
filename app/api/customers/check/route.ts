import { NextRequest, NextResponse } from 'next/server';
import { query, getTenantIdFromRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { exists: false, error: 'テナントが見つかりません' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, phone_number } = body;

    if (!email && !phone_number) {
      return NextResponse.json(
        { exists: false, error: 'emailまたはphone_numberが必要です' },
        { status: 400 }
      );
    }

    const checkQuery = email
      ? 'SELECT * FROM customers WHERE email = $1 AND tenant_id = $2'
      : 'SELECT * FROM customers WHERE phone_number = $1 AND tenant_id = $2';
    const checkParams = email ? [email, tenantId] : [phone_number, tenantId];
    
    const result = await query(checkQuery, checkParams);

    if (result.rows.length === 0) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      customer: result.rows[0]
    });
  } catch (error: any) {
    console.error('顧客確認エラー:', error);
    return NextResponse.json(
      { exists: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

