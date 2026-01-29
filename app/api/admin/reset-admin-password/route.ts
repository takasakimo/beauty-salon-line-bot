import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 管理者のパスワードをリセットするAPI（認証不要、セキュリティ用のシークレットキーで保護）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tenantCode, 
      username, 
      password, 
      email,
      secretKey 
    } = body;

    // シークレットキーの検証（環境変数から取得）
    const expectedSecretKey = process.env.ADMIN_RESET_SECRET_KEY || 'CHANGE_THIS_SECRET_KEY_IN_PRODUCTION';
    
    if (secretKey !== expectedSecretKey) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid secret key' },
        { status: 401 }
      );
    }

    // バリデーション
    if (!tenantCode || !username || !password) {
      return NextResponse.json(
        { error: 'tenantCode, username, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // テナントを取得
    const tenantResult = await query(
      'SELECT tenant_id FROM tenants WHERE tenant_code = $1',
      [tenantCode]
    );

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: `Tenant "${tenantCode}" not found` },
        { status: 404 }
      );
    }

    const tenantId = tenantResult.rows[0].tenant_id;

    // 既存の管理者を確認
    const existingAdmin = await query(
      `SELECT admin_id, username, email FROM tenant_admins 
       WHERE tenant_id = $1 
       ORDER BY admin_id ASC
       LIMIT 1`,
      [tenantId]
    );

    const passwordHash = hashPassword(password);
    const fullName = username.split('@')[0] || '管理者';

    if (existingAdmin.rows.length > 0) {
      // 既存の管理者を更新
      const admin = existingAdmin.rows[0];
      await query(
        `UPDATE tenant_admins 
         SET username = $1, password_hash = $2, email = $3, full_name = $4, is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE admin_id = $5 AND tenant_id = $6`,
        [username, passwordHash, email || username, fullName, admin.admin_id, tenantId]
      );

      return NextResponse.json({
        success: true,
        message: 'Admin account updated successfully',
        admin_id: admin.admin_id,
        username,
        email: email || username
      });
    } else {
      // 新しい管理者を作成
      const result = await query(
        `INSERT INTO tenant_admins (tenant_id, username, password_hash, full_name, email, role, is_active)
         VALUES ($1, $2, $3, $4, $5, 'admin', true)
         RETURNING admin_id`,
        [tenantId, username, passwordHash, fullName, email || username]
      );

      return NextResponse.json({
        success: true,
        message: 'Admin account created successfully',
        admin_id: result.rows[0].admin_id,
        username,
        email: email || username
      });
    }
  } catch (error: any) {
    console.error('Admin password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
