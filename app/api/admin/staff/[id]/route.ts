import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// スタッフ更新（管理画面用）
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

    const tenantId = session.tenantId;
    const staffId = parseInt(params.id);
    const body = await request.json();
    const { name, email, phone_number, working_hours } = body;

    // バリデーション
    if (!name) {
      return NextResponse.json(
        { error: 'スタッフ名は必須です' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE staff 
       SET name = $1, email = $2, phone_number = $3, working_hours = $4
       WHERE staff_id = $5 AND tenant_id = $6
       RETURNING *`,
      [
        name,
        email || null,
        phone_number || null,
        working_hours || null,
        staffId,
        tenantId
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'スタッフが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// スタッフ削除（管理画面用）
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

    const tenantId = session.tenantId;
    const staffId = parseInt(params.id);

    // 予約に使用されているスタッフは削除できない
    const reservationCheck = await query(
      `SELECT COUNT(*) as count 
       FROM reservations 
       WHERE staff_id = $1 AND tenant_id = $2 AND status != 'cancelled'`,
      [staffId, tenantId]
    );

    if (parseInt(reservationCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'このスタッフに関連する予約があるため削除できません' },
        { status: 400 }
      );
    }

    await query(
      `DELETE FROM staff WHERE staff_id = $1 AND tenant_id = $2`,
      [staffId, tenantId]
    );

    return NextResponse.json({ message: 'スタッフを削除しました' });
  } catch (error: any) {
    console.error('Error deleting staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

