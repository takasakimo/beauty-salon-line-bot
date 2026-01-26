import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import * as crypto from 'crypto';

export const dynamic = 'force-dynamic';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, newPassword } = body;

    if (!username || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'ユーザー名と新しいパスワードが必要です' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'パスワードは6文字以上である必要があります' },
        { status: 400 }
      );
    }

    // スーパー管理者を検索
    const adminResult = await query(
      'SELECT super_admin_id FROM super_admins WHERE username = $1',
      [username]
    );

    if (adminResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'スーパー管理者が見つかりません' },
        { status: 404 }
      );
    }

    // パスワードを更新
    const passwordHash = hashPassword(newPassword);
    await query(
      `UPDATE super_admins 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE username = $2`,
      [passwordHash, username]
    );

    return NextResponse.json({
      success: true,
      message: 'パスワードを更新しました'
    });
  } catch (error: any) {
    console.error('パスワード更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラー' },
      { status: 500 }
    );
  }
}
