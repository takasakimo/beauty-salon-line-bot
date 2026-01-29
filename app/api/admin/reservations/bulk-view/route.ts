import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequestAsync } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 予約を一括で既読にする（管理画面用）
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { reservationIds } = body; // 配列またはundefined（undefinedの場合はすべて）

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

    let result;
    if (reservationIds && Array.isArray(reservationIds) && reservationIds.length > 0) {
      // 指定された予約IDを既読にする
      const placeholders = reservationIds.map((_, index) => `$${index + 2}`).join(', ');
      result = await query(
        `UPDATE reservations 
         SET is_viewed = true
         WHERE reservation_id IN (${placeholders})
         AND tenant_id = $1
         AND (is_viewed = false OR is_viewed IS NULL)
         RETURNING reservation_id`,
        [tenantId, ...reservationIds]
      );
    } else {
      // すべての未読予約を既読にする
      result = await query(
        `UPDATE reservations 
         SET is_viewed = true
         WHERE tenant_id = $1
         AND (is_viewed = false OR is_viewed IS NULL)
         AND status != 'cancelled'
         RETURNING reservation_id`,
        [tenantId]
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `${result.rows.length}件の予約を既読にしました`,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error marking reservations as viewed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
