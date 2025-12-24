import { NextRequest, NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// スタッフ一覧取得（管理画面用）
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;

    // staff_menusテーブルが存在するかチェック
    let result;
    try {
      result = await query(
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
         WHERE s.tenant_id = $1 
         GROUP BY s.staff_id, s.name, s.email, s.phone_number, s.working_hours, s.created_date
         ORDER BY s.staff_id`,
        [tenantId]
      );
    } catch (joinError: any) {
      // staff_menusテーブルが存在しない場合は、シンプルなクエリを使用
      if (joinError.message && joinError.message.includes('staff_menus')) {
        console.log('staff_menusテーブルが存在しないため、シンプルなクエリを使用します');
        result = await query(
          `SELECT staff_id, name, email, phone_number, working_hours, created_date,
                  '[]'::json as available_menus
           FROM staff
           WHERE tenant_id = $1 
           ORDER BY staff_id`,
          [tenantId]
        );
      } else {
        throw joinError;
      }
    }

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// スタッフ追加（管理画面用）
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;
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

      // スタッフを追加
      const result = await client.query(
        `INSERT INTO staff (name, email, phone_number, working_hours, tenant_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, email || null, phone_number || null, working_hours || null, tenantId]
      );

      const staffId = result.rows[0].staff_id;

      // 対応可能メニューを追加
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

      await client.query('COMMIT');

      // スタッフ情報と対応可能メニューを取得
      const staffResult = await query(
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

      return NextResponse.json(staffResult.rows[0]);
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

