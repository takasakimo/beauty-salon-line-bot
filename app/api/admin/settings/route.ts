import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 設定取得
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

    const result = await query(
      'SELECT max_concurrent_reservations FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'テナントが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      max_concurrent_reservations: result.rows[0].max_concurrent_reservations || 3
    });
  } catch (error: any) {
    console.error('設定取得エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 設定更新
export async function PUT(request: NextRequest) {
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
    const { max_concurrent_reservations } = body;

    if (!max_concurrent_reservations || max_concurrent_reservations < 1) {
      return NextResponse.json(
        { error: '最大同時予約数は1以上である必要があります' },
        { status: 400 }
      );
    }

    const result = await query(
      'UPDATE tenants SET max_concurrent_reservations = $1 WHERE tenant_id = $2 RETURNING max_concurrent_reservations',
      [max_concurrent_reservations, tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'テナントが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      max_concurrent_reservations: result.rows[0].max_concurrent_reservations
    });
  } catch (error: any) {
    console.error('設定更新エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

