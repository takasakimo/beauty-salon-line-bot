import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// メニュー一覧取得（管理画面用）
export async function GET(request: NextRequest) {
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

    const result = await query(
      `SELECT menu_id, name, price, duration, description, is_active
       FROM menus 
       WHERE tenant_id = $1 
       ORDER BY menu_id`,
      [tenantId]
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching menus:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// メニュー追加（管理画面用）
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { name, price, duration, description } = body;

    // バリデーション
    if (!name || !price || !duration) {
      return NextResponse.json(
        { error: 'メニュー名、価格、所要時間は必須です' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO menus (name, price, duration, description, tenant_id, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [name, parseInt(price), parseInt(duration), description || null, tenantId]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating menu:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

