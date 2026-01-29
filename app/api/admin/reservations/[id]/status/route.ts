import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 予約ステータス変更（管理画面用・軽量版）
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

    const reservationId = parseInt(params.id);
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'ステータスは必須です' },
        { status: 400 }
      );
    }

    // ステータスのみを更新（軽量）
    const result = await query(
      `UPDATE reservations 
       SET status = $1
       WHERE reservation_id = $2 AND tenant_id = $3
       RETURNING reservation_id, status`,
      [status, reservationId, tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      reservation_id: result.rows[0].reservation_id,
      status: result.rows[0].status
    });
  } catch (error: any) {
    console.error('Error updating reservation status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
