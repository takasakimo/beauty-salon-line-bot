import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const result = await query(
      'SELECT tenant_code, salon_name FROM tenants WHERE is_active = true ORDER BY salon_name'
    );
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('テナント一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    );
  }
}

