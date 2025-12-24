import { NextRequest, NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';
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
    const { name, email, phone_number, working_hours, menu_ids } = body;

    // バリデーション
    if (!name) {
      return NextResponse.json(
        { error: 'スタッフ名は必須です' },
        { status: 400 }
      );
    }

    // トランザクション開始
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // スタッフ情報を更新
      const result = await client.query(
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
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'スタッフが見つかりません' },
          { status: 404 }
        );
      }

      // 既存の対応可能メニューを削除（staff_menusテーブルが存在する場合のみ）
      try {
        await client.query(
          `DELETE FROM staff_menus WHERE staff_id = $1 AND tenant_id = $2`,
          [staffId, tenantId]
        );

        // 新しい対応可能メニューを追加
        if (menu_ids && Array.isArray(menu_ids) && menu_ids.length > 0) {
          for (const menuId of menu_ids) {
            await client.query(
              `INSERT INTO staff_menus (staff_id, menu_id, tenant_id)
               VALUES ($1, $2, $3)
               ON CONFLICT (staff_id, menu_id) DO NOTHING`,
              [staffId, menuId, tenantId]
            );
          }
        }
      } catch (menuError: any) {
        // staff_menusテーブルが存在しない場合はスキップ
        if (menuError.message && menuError.message.includes('staff_menus')) {
          console.log('staff_menusテーブルが存在しないため、メニュー関連の処理をスキップします');
        } else {
          throw menuError;
        }
      }

      await client.query('COMMIT');

      // スタッフ情報と対応可能メニューを取得
      let staffResult;
      try {
        staffResult = await query(
          `SELECT s.staff_id, s.name, s.email, s.phone_number, s.working_hours, s.created_date,
                  COALESCE(
                    json_agg(
                      json_build_object('menu_id', m.menu_id, 'name', m.name)
                    ) FILTER (WHERE m.menu_id IS NOT NULL),
                    '[]'::json
                  ) as available_menus
           FROM staff s
           LEFT JOIN staff_menus sm ON s.staff_id = sm.staff_id
           LEFT JOIN menus m ON sm.menu_id = m.menu_id AND m.is_active = true
           WHERE s.staff_id = $1
           GROUP BY s.staff_id, s.name, s.email, s.phone_number, s.working_hours, s.created_date`,
          [staffId]
        );
      } catch (joinError: any) {
        // staff_menusテーブルが存在しない場合は、シンプルなクエリを使用
        if (joinError.message && joinError.message.includes('staff_menus')) {
          console.log('staff_menusテーブルが存在しないため、シンプルなクエリを使用します');
          staffResult = await query(
            `SELECT staff_id, name, email, phone_number, working_hours, created_date,
                    '[]'::json as available_menus
             FROM staff
             WHERE staff_id = $1`,
            [staffId]
          );
        } else {
          throw joinError;
        }
      }

      return NextResponse.json(staffResult.rows[0]);
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

