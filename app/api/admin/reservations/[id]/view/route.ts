import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequestAsync } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 予約を既読にする（管理画面用）
export async function POST(
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

    const tenantId = await getTenantIdFromRequestAsync(request, session);
    if (!tenantId) {
      return NextResponse.json(
        { error: '店舗IDが指定されていません' },
        { status: 400 }
      );
    }

    const reservationId = parseInt(params.id);

    // is_viewedカラムが存在するかチェック
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations' AND column_name = 'is_viewed'
    `);

    if (columnCheck.rows.length === 0) {
      // is_viewedカラムが存在しない場合は成功として返す（後方互換性）
      return NextResponse.json({ success: true, message: 'is_viewedカラムが存在しません' });
    }

    // 予約を既読にする
    const result = await query(
      `UPDATE reservations 
       SET is_viewed = true
       WHERE reservation_id = $1 AND tenant_id = $2
       RETURNING reservation_id`,
      [reservationId, tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: '予約を既読にしました' });
  } catch (error: any) {
    console.error('Error marking reservation as viewed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
