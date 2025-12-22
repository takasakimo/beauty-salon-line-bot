import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// メニュー更新（管理画面用）
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
    const menuId = parseInt(params.id);
    const body = await request.json();
    const { name, price, duration, description, is_active } = body;

    // バリデーション
    if (!name || !price || !duration) {
      return NextResponse.json(
        { error: 'メニュー名、価格、所要時間は必須です' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE menus 
       SET name = $1, price = $2, duration = $3, description = $4, is_active = $5
       WHERE menu_id = $6 AND tenant_id = $7
       RETURNING *`,
      [
        name,
        parseInt(price),
        parseInt(duration),
        description || null,
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
  try {
    const session = getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;
    const menuId = parseInt(params.id);

    // 予約に使用されているメニューは削除できない（is_activeをfalseにする）
    const reservationCheck = await query(
      `SELECT COUNT(*) as count 
       FROM reservations 
       WHERE menu_id = $1 AND tenant_id = $2 AND status != 'cancelled'`,
      [menuId, tenantId]
    );

    if (parseInt(reservationCheck.rows[0].count) > 0) {
      // 予約がある場合は無効化のみ
      await query(
        `UPDATE menus SET is_active = false 
         WHERE menu_id = $1 AND tenant_id = $2`,
        [menuId, tenantId]
      );
      return NextResponse.json({ message: 'メニューを無効化しました' });
    } else {
      // 予約がない場合は削除
      await query(
        `DELETE FROM menus WHERE menu_id = $1 AND tenant_id = $2`,
        [menuId, tenantId]
      );
      return NextResponse.json({ message: 'メニューを削除しました' });
    }
  } catch (error: any) {
    console.error('Error deleting menu:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

