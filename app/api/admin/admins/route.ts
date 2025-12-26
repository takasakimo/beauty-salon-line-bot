import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 管理者一覧取得
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
      `SELECT admin_id, username, email, full_name, role, is_active, created_at
       FROM tenant_admins
       WHERE tenant_id = $1
       ORDER BY admin_id`,
      [tenantId]
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('管理者一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 管理者追加
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
    const { username, password, fullName, email } = body;

    // バリデーション
    if (!username || !password) {
      return NextResponse.json(
        { error: 'ユーザー名とパスワードは必須です' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは6文字以上である必要があります' },
        { status: 400 }
      );
    }

    // ユーザー名の重複チェック
    const existing = await query(
      'SELECT admin_id FROM tenant_admins WHERE tenant_id = $1 AND username = $2',
      [tenantId, username.trim()]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'このユーザー名は既に使用されています' },
        { status: 400 }
      );
    }

    // パスワードハッシュの生成
    const passwordHash = hashPassword(password);

    // 管理者を追加
    const result = await query(
      `INSERT INTO tenant_admins (tenant_id, username, password_hash, full_name, email, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'admin', true)
       RETURNING admin_id, username, email, full_name, role, is_active, created_at`,
      [tenantId, username.trim(), passwordHash, fullName || username.trim(), email || null]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('管理者追加エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

