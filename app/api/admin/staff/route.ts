import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
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

    const result = await query(
      `SELECT staff_id, name, email, phone_number, working_hours, created_date
       FROM staff 
       WHERE tenant_id = $1 
       ORDER BY staff_id`,
      [tenantId]
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    const { name, email, phone_number, working_hours } = body;

    // バリデーション
    if (!name) {
      return NextResponse.json(
        { error: 'スタッフ名は必須です' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO staff (name, email, phone_number, working_hours, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, email || null, phone_number || null, working_hours || null, tenantId]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

