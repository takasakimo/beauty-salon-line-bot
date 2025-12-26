import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 管理者更新
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

    const adminId = parseInt(params.id);
    if (isNaN(adminId)) {
      return NextResponse.json(
        { error: '無効な管理者IDです' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { username, password, fullName, email, isActive } = body;

    // バリデーション
    if (!username) {
      return NextResponse.json(
        { error: 'ユーザー名は必須です' },
        { status: 400 }
      );
    }

    // ユーザー名の重複チェック（自分以外）
    const existing = await query(
      'SELECT admin_id FROM tenant_admins WHERE tenant_id = $1 AND username = $2 AND admin_id != $3',
      [tenantId, username.trim(), adminId]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'このユーザー名は既に使用されています' },
        { status: 400 }
      );
    }

    // パスワードが提供されている場合は更新
    let updateQuery = `
      UPDATE tenant_admins 
      SET username = $1, full_name = $2, email = $3, is_active = $4
    `;
    const updateParams: any[] = [username.trim(), fullName || username.trim(), email || null, isActive !== undefined ? isActive : true];

    if (password && password.length > 0) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'パスワードは6文字以上である必要があります' },
          { status: 400 }
        );
      }
      const passwordHash = hashPassword(password);
      updateQuery = `
        UPDATE tenant_admins 
        SET username = $1, password_hash = $2, full_name = $3, email = $4, is_active = $5
      `;
      updateParams.splice(1, 0, passwordHash);
    }

    updateQuery += ` WHERE admin_id = $${updateParams.length + 1} AND tenant_id = $${updateParams.length + 2}
                     RETURNING admin_id, username, email, full_name, role, is_active, created_at`;
    updateParams.push(adminId, tenantId);

    const result = await query(updateQuery, updateParams);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '管理者が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('管理者更新エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 管理者削除
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

    const adminId = parseInt(params.id);
    if (isNaN(adminId)) {
      return NextResponse.json(
        { error: '無効な管理者IDです' },
        { status: 400 }
      );
    }

    // 管理者を削除
    const result = await query(
      'DELETE FROM tenant_admins WHERE admin_id = $1 AND tenant_id = $2 RETURNING admin_id',
      [adminId, tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '管理者が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('管理者削除エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

