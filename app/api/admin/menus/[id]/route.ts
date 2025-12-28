import { NextRequest, NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// メニュー更新（管理画面用）
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
    const menuId = parseInt(params.id);
    const body = await request.json();
    const { name, price, duration, description, category, is_active } = body;

    // バリデーション
    if (!name || !price || !duration) {
      return NextResponse.json(
        { error: 'メニュー名、価格、所要時間は必須です' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE menus 
       SET name = $1, price = $2, duration = $3, description = $4, category = $5, is_active = $6
       WHERE menu_id = $7 AND tenant_id = $8
       RETURNING *`,
      [
        name,
        parseInt(price),
        parseInt(duration),
        description || null,
        category || null,
        is_active !== undefined ? is_active : true,
        menuId,
        tenantId
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'メニューが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating menu:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// メニュー削除（管理画面用）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  const client = await pool.connect();
  
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
    const menuId = parseInt(params.id);

    // トランザクション開始
    await client.query('BEGIN');

    // reservation_menusテーブルから該当メニューのレコードを削除（テーブルが存在する場合）
    try {
      const deleteReservationMenusResult = await client.query(
        `DELETE FROM reservation_menus 
         WHERE menu_id = $1 AND tenant_id = $2`,
        [menuId, tenantId]
      );
      console.log(`メニューID ${menuId} のreservation_menus ${deleteReservationMenusResult.rowCount} 件を削除しました`);
    } catch (error: any) {
      // reservation_menusテーブルが存在しない場合はスキップ
      if (error.message && error.message.includes('reservation_menus')) {
        console.log('reservation_menusテーブルが存在しないため、スキップします');
      } else {
        throw error;
      }
    }

    // reservationsテーブルのmenu_idをNULLに更新（該当メニューが設定されている場合）
    const updateReservationsResult = await client.query(
      `UPDATE reservations 
       SET menu_id = NULL
       WHERE menu_id = $1 AND tenant_id = $2`,
      [menuId, tenantId]
    );
    console.log(`メニューID ${menuId} の予約 ${updateReservationsResult.rowCount} 件のmenu_idをNULLに更新しました`);

    // メニューを削除
    const deleteResult = await client.query(
      `DELETE FROM menus WHERE menu_id = $1 AND tenant_id = $2`,
      [menuId, tenantId]
    );

    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'メニューが見つかりません' },
        { status: 404 }
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({ 
      message: 'メニューを削除しました',
      updatedReservations: updateReservationsResult.rowCount 
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error deleting menu:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

