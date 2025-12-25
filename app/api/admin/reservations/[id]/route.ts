import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 予約更新（管理画面用）
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
    const { 
      menu_id,
      staff_id,
      reservation_date,
      status,
      notes
    } = body;

    // バリデーション
    if (!menu_id || !reservation_date) {
      return NextResponse.json(
        { error: 'メニュー、予約日時は必須です' },
        { status: 400 }
      );
    }

    // メニュー情報を取得（価格と所要時間）
    const menuResult = await query(
      'SELECT price, duration FROM menus WHERE menu_id = $1 AND tenant_id = $2',
      [menu_id, tenantId]
    );

    if (menuResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'メニューが見つかりません' },
        { status: 404 }
      );
    }

    const price = menuResult.rows[0].price;
    const duration = menuResult.rows[0].duration;

    // 最大同時予約数を取得
    const tenantResult = await query(
      'SELECT max_concurrent_reservations FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );
    const maxConcurrent = tenantResult.rows[0]?.max_concurrent_reservations || 3;

    // 予約日時を計算
    const reservationDateTime = new Date(reservation_date);
    const reservationEndTime = new Date(reservationDateTime.getTime() + duration * 60000);

    // スタッフが指定されている場合、時間の重複チェック（自分自身を除く）
    if (staff_id) {

      // 同じスタッフの既存予約をチェック（更新対象の予約を除く）
      const conflictCheck = await query(
        `SELECT reservation_id, reservation_date, m.duration
         FROM reservations r
         LEFT JOIN menus m ON r.menu_id = m.menu_id
         WHERE r.tenant_id = $1
         AND r.staff_id = $2
         AND r.status = 'confirmed'
         AND DATE(r.reservation_date) = DATE($3)
         AND r.reservation_id != $4`,
        [tenantId, staff_id, reservation_date, reservationId]
      );

      for (const existingReservation of conflictCheck.rows) {
        const existingStart = new Date(existingReservation.reservation_date);
        const existingDuration = existingReservation.duration || 60;
        const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);

        // 時間帯が重複しているかチェック
        if (reservationDateTime < existingEnd && reservationEndTime > existingStart) {
          return NextResponse.json(
            { error: `この時間帯は既に予約が入っています。既存予約: ${existingStart.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}` },
            { status: 400 }
          );
        }
      }
    } else {
      // スタッフ未指定の場合：最大同時予約数をチェック（更新対象の予約を除く）
      const concurrentCheck = await query(
        `SELECT 
           r.reservation_date,
           COALESCE(m.duration, 60) as duration
         FROM reservations r
         LEFT JOIN menus m ON r.menu_id = m.menu_id
         WHERE r.tenant_id = $1
         AND r.status = 'confirmed'
         AND DATE(r.reservation_date) = DATE($2)
         AND r.reservation_id != $3`,
        [tenantId, reservation_date, reservationId]
      );

      // JavaScriptで時間帯の重複をチェック
      let concurrentCount = 0;
      concurrentCheck.rows.forEach((row: any) => {
        const existingStart = new Date(row.reservation_date);
        const existingDuration = row.duration || 60;
        const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);
        
        // 時間帯が重複しているかチェック
        if (reservationDateTime < existingEnd && reservationEndTime > existingStart) {
          concurrentCount++;
        }
      });

      if (concurrentCount >= maxConcurrent) {
        return NextResponse.json(
          { error: `この時間帯は既に${maxConcurrent}件の予約が入っています。別の時間を選択してください。` },
          { status: 400 }
        );
      }
    }

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

