import { NextRequest, NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';
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
      menu_ids,
      staff_id,
      reservation_date,
      status,
      notes
    } = body;

    // menu_idsが配列の場合はそれを使用、そうでなければmenu_idを配列に変換
    const menuIds = menu_ids && Array.isArray(menu_ids) && menu_ids.length > 0
      ? menu_ids
      : menu_id
        ? [menu_id]
        : [];

    // バリデーション
    if (menuIds.length === 0 || !reservation_date) {
      return NextResponse.json(
        { error: 'メニュー、予約日時は必須です' },
        { status: 400 }
      );
    }

    // メニュー情報を取得（複数メニュー対応）
    const menuResult = await query(
      `SELECT menu_id, price, duration FROM menus 
       WHERE menu_id = ANY($1::int[]) AND tenant_id = $2`,
      [menuIds, tenantId]
    );

    if (menuResult.rows.length !== menuIds.length) {
      return NextResponse.json(
        { error: '一部のメニューが見つかりません' },
        { status: 404 }
      );
    }

    // 合計金額と合計時間を計算
    const totalPrice = menuResult.rows.reduce((sum, row) => sum + row.price, 0);
    const totalDuration = menuResult.rows.reduce((sum, row) => sum + row.duration, 0);
    
    // 最初のメニューIDをmenu_idとして使用（後方互換性のため）
    const firstMenuId = menuIds[0];

    // 店舗情報を取得（最大同時予約数と営業時間）
    const tenantResult = await query(
      'SELECT max_concurrent_reservations, business_hours FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );
    const maxConcurrent = tenantResult.rows[0]?.max_concurrent_reservations || 3;
    
    // 営業時間を取得
    let businessHours: any = {};
    try {
      if (tenantResult.rows[0]?.business_hours) {
        businessHours = typeof tenantResult.rows[0].business_hours === 'string'
          ? JSON.parse(tenantResult.rows[0].business_hours)
          : tenantResult.rows[0].business_hours;
      }
    } catch (e) {
      console.error('business_hoursのパースエラー:', e);
    }

    // 予約日時を計算（合計時間を使用）
    const reservationDateTime = new Date(reservation_date);
    const reservationEndTime = new Date(reservationDateTime.getTime() + totalDuration * 60000);
    
    // 選択された日付の曜日を取得（0=日曜日、1=月曜日、...、6=土曜日）
    const dayOfWeek = reservationDateTime.getDay();
    
    // その曜日の営業時間を取得（デフォルト: 10:00-19:00）
    const dayBusinessHours = businessHours[dayOfWeek] || businessHours['default'] || { open: '10:00', close: '19:00' };
    const closeTime = dayBusinessHours.close || '19:00';
    
    // 閉店時間を分単位に変換
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);
    const closeTimeInMinutes = closeHour * 60 + closeMinute;
    
    // 予約終了時間を分単位に変換
    const reservationEndHour = reservationEndTime.getHours();
    const reservationEndMinute = reservationEndTime.getMinutes();
    const reservationEndTimeInMinutes = reservationEndHour * 60 + reservationEndMinute;
    
    // 閉店時間を超える場合はエラー
    if (reservationEndTimeInMinutes > closeTimeInMinutes) {
      return NextResponse.json(
        { error: `予約終了時間が閉店時間（${closeTime}）を超えています。作業時間を考慮して、${closeTime}より前に開始できる時間を選択してください。` },
        { status: 400 }
      );
    }

    // スタッフが指定されている場合、時間の重複チェック（自分自身を除く）
    if (staff_id) {

      // 同じスタッフの既存予約をチェック（更新対象の予約を除く、複数メニュー対応）
      let conflictCheck;
      try {
        conflictCheck = await query(
          `SELECT 
            r.reservation_id, 
            r.reservation_date,
            COALESCE(
              (SELECT SUM(rm_menu.duration) 
               FROM reservation_menus rm 
               JOIN menus rm_menu ON rm.menu_id = rm_menu.menu_id 
               WHERE rm.reservation_id = r.reservation_id),
              m.duration,
              60
            ) as duration
           FROM reservations r
           LEFT JOIN menus m ON r.menu_id = m.menu_id
           WHERE r.tenant_id = $1
           AND r.staff_id = $2
           AND r.status = 'confirmed'
           AND DATE(r.reservation_date) = DATE($3)
           AND r.reservation_id != $4`,
          [tenantId, staff_id, reservation_date, reservationId]
        );
      } catch (error: any) {
        // reservation_menusテーブルが存在しない場合はフォールバック
        if (error.message && error.message.includes('reservation_menus')) {
          conflictCheck = await query(
            `SELECT reservation_id, reservation_date, COALESCE(m.duration, 60) as duration
             FROM reservations r
             LEFT JOIN menus m ON r.menu_id = m.menu_id
             WHERE r.tenant_id = $1
             AND r.staff_id = $2
             AND r.status = 'confirmed'
             AND DATE(r.reservation_date) = DATE($3)
             AND r.reservation_id != $4`,
            [tenantId, staff_id, reservation_date, reservationId]
          );
        } else {
          throw error;
        }
      }

      for (const existingReservation of conflictCheck.rows) {
        const existingStart = new Date(existingReservation.reservation_date);
        const existingDuration = parseFloat(existingReservation.duration) || 60;
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
      // スタッフ未指定の場合：最大同時予約数をチェック（更新対象の予約を除く、複数メニュー対応）
      let concurrentCheck;
      try {
        concurrentCheck = await query(
          `SELECT 
            r.reservation_date,
            COALESCE(
              (SELECT SUM(rm_menu.duration) 
               FROM reservation_menus rm 
               JOIN menus rm_menu ON rm.menu_id = rm_menu.menu_id 
               WHERE rm.reservation_id = r.reservation_id),
              m.duration,
              60
            ) as duration
           FROM reservations r
           LEFT JOIN menus m ON r.menu_id = m.menu_id
           WHERE r.tenant_id = $1
           AND r.status = 'confirmed'
           AND DATE(r.reservation_date) = DATE($2)
           AND r.reservation_id != $3`,
          [tenantId, reservation_date, reservationId]
        );
      } catch (error: any) {
        // reservation_menusテーブルが存在しない場合はフォールバック
        if (error.message && error.message.includes('reservation_menus')) {
          concurrentCheck = await query(
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
        } else {
          throw error;
        }
      }

      // JavaScriptで時間帯の重複をチェック
      let concurrentCount = 0;
      concurrentCheck.rows.forEach((row: any) => {
        const existingStart = new Date(row.reservation_date);
        const existingDuration = parseFloat(row.duration) || 60;
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

    // トランザクションで予約とメニューを更新
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 予約を更新（最初のメニューIDをmenu_idとして使用）
      // statusが明示的に指定されている場合はそれを使用、そうでなければ既存のstatusを保持
      const updateStatus = status !== undefined ? status : 'confirmed';
      
      const result = await client.query(
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
          firstMenuId,
          staff_id || null,
          reservation_date,
          updateStatus,
          totalPrice,
          notes !== undefined ? notes : null,
          reservationId,
          tenantId
        ]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: '予約が見つかりません' },
          { status: 404 }
        );
      }

      // reservation_menusテーブルを更新
      if (menuIds.length > 0) {
        try {
          // 既存のメニューを削除
          await client.query(
            `DELETE FROM reservation_menus WHERE reservation_id = $1`,
            [reservationId]
          );
          
          // 新しいメニューを追加
          for (const menuId of menuIds) {
            const menu = menuResult.rows.find(m => m.menu_id === menuId);
            if (menu) {
              await client.query(
                `INSERT INTO reservation_menus (reservation_id, menu_id, tenant_id, price)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (reservation_id, menu_id) DO NOTHING`,
                [reservationId, menuId, tenantId, menu.price]
              );
            }
          }
        } catch (error: any) {
          // reservation_menusテーブルが存在しない場合はスキップ
          if (error.message && error.message.includes('reservation_menus')) {
            console.warn('reservation_menusテーブルが存在しません。単一メニューとして保存します。');
          } else {
            throw error;
          }
        }
      }
      
      await client.query('COMMIT');
      return NextResponse.json(result.rows[0]);
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

