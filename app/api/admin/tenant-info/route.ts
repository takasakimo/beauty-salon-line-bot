import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 店舗情報取得（店舗コードを含む）
export async function GET(request: NextRequest) {
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

    const result = await query(
      'SELECT tenant_code, salon_name FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'テナントが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tenantCode: result.rows[0].tenant_code,
      salonName: result.rows[0].salon_name
    });
  } catch (error: any) {
    console.error('Error fetching tenant info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

