import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 予約更新（管理画面用）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;
    const reservationId = parseInt(params.id);
    const body = await request.json();
    const { 
      menu_id,
      staff_id,
      reservation_date,
      status,
      notes
    } = body;

    // バリデーション
    if (!menu_id || !staff_id || !reservation_date) {
      return NextResponse.json(
        { error: 'メニュー、スタッフ、予約日時は必須です' },
        { status: 400 }
      );
    }

    // メニューの価格を取得
    const menuResult = await query(
      'SELECT price FROM menus WHERE menu_id = $1 AND tenant_id = $2',
      [menu_id, tenantId]
    );

    if (menuResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'メニューが見つかりません' },
        { status: 404 }
      );
    }

    const price = menuResult.rows[0].price;

    const result = await query(
      `UPDATE reservations 
       SET 
         menu_id = $1,
         staff_id = $2,
         reservation_date = $3,
         status = $4,
         price = $5,
         notes = $6
       WHERE reservation_id = $7 AND tenant_id = $8
       RETURNING *`,
      [
        menu_id,
        staff_id,
        reservation_date,
        status || 'confirmed',
        price,
        notes || null,
        reservationId,
        tenantId
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 予約削除（管理画面用）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;
    const reservationId = parseInt(params.id);

    // 予約をキャンセル（削除ではなくステータスを変更）
    const result = await query(
      `UPDATE reservations 
       SET status = 'cancelled'
       WHERE reservation_id = $1 AND tenant_id = $2
       RETURNING *`,
      [reservationId, tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: '予約をキャンセルしました' });
  } catch (error: any) {
    console.error('Error cancelling reservation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

