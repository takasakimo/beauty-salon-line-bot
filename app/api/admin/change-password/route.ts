import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = getTenantIdFromRequest(request, session);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: '店舗IDが指定されていません' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // バリデーション
    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: '新しいパスワードと確認用パスワードを入力してください' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: '新しいパスワードと確認用パスワードが一致しません' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: '新しいパスワードは6文字以上である必要があります' },
        { status: 400 }
      );
    }

    // 管理者IDを決定
    // スーパー管理者の場合は、tenantIdから管理者IDを取得
    // 通常の管理者の場合は、session.adminIdを使用
    let adminId: number | null = null;
    
    if (session.role === 'super_admin') {
      // スーパー管理者の場合、tenantIdから管理者IDを取得（最初の管理者を使用）
      const adminListResult = await query(
        `SELECT admin_id 
         FROM tenant_admins 
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY admin_id ASC
         LIMIT 1`,
        [tenantId]
      );
      
      if (adminListResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'この店舗に管理者アカウントが見つかりません' },
          { status: 404 }
        );
      }
      
      adminId = adminListResult.rows[0].admin_id;
    } else if (session.adminId) {
      adminId = session.adminId;
    } else {
      return NextResponse.json(
        { success: false, error: '管理者情報が見つかりません' },
        { status: 401 }
      );
    }

    // 管理者情報を取得
    const adminResult = await query(
      `SELECT admin_id, password_hash 
       FROM tenant_admins 
       WHERE admin_id = $1 AND tenant_id = $2`,
      [adminId, tenantId]
    );

    if (adminResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '管理者情報が見つかりません' },
        { status: 404 }
      );
    }

    const admin = adminResult.rows[0];
    
    // パスワードが設定されている場合は、現在のパスワードを確認
    // パスワードが設定されていない場合は、現在のパスワード欄が空白でも変更可能
    if (admin.password_hash) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: '現在のパスワードを入力してください' },
          { status: 400 }
        );
      }
      const currentPasswordHash = hashPassword(currentPassword);
      if (admin.password_hash !== currentPasswordHash) {
        return NextResponse.json(
          { success: false, error: '現在のパスワードが正しくありません' },
          { status: 401 }
        );
      }
    }

    // 新しいパスワードを設定
    const newPasswordHash = hashPassword(newPassword);
    await query(
      `UPDATE tenant_admins 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE admin_id = $2 AND tenant_id = $3`,
      [newPasswordHash, adminId, tenantId]
    );

    return NextResponse.json({
      success: true,
      message: 'パスワードを変更しました'
    });
  } catch (error: any) {
    console.error('パスワード変更エラー:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラー' },
      { status: 500 }
    );
  }
}

