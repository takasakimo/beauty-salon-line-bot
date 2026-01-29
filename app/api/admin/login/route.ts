import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, authenticateAdminByEmail, authenticateSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { username, password, tenantCode, email } = body;

    // 入力値のトリム処理
    username = username?.trim() || '';
    email = email?.trim() || '';
    password = password?.trim() || '';
    tenantCode = tenantCode?.trim() || '';

    // メールアドレスまたはユーザー名を取得（emailがあればemail、なければusername）
    const emailOrUsername = email || username;

    // バリデーション
    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスとパスワードを入力してください' },
        { status: 400 }
      );
    }

    // 店舗コードが指定されている場合は従来の方法で認証
    if (tenantCode) {
      const result = await authenticateAdmin(emailOrUsername, password, tenantCode);

      if (!result.success) {
        console.error('管理者認証失敗:', {
          emailOrUsername,
          tenantCode,
          error: result.error
        });
        return NextResponse.json(
          { success: false, error: result.error || 'ログインに失敗しました' },
          { status: 401 }
        );
      }

      // セッションクッキーを設定
      const response = NextResponse.json({
        success: true,
        isSuperAdmin: false,
        adminName: result.admin?.fullName,
        tenantName: result.tenant?.salonName,
        role: result.admin?.role
      });

      if (result.sessionToken) {
        response.cookies.set('session_token', result.sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7日間
          path: '/'
        });
      }

      return response;
    }

    // 店舗コードが空の場合は、まずスーパー管理者としてログインを試みる
    // 失敗した場合はメールアドレスで店舗管理者としてログインを試みる
    const superAdminResult = await authenticateSuperAdmin(emailOrUsername, password);
    
    if (superAdminResult.success) {
      // スーパー管理者としてログイン成功
      const response = NextResponse.json({
        success: true,
        isSuperAdmin: true,
        superAdminName: superAdminResult.superAdmin?.fullName
      });

      if (superAdminResult.sessionToken) {
        response.cookies.set('session_token', superAdminResult.sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7日間
          path: '/'
        });
      }

      return response;
    }

    // スーパー管理者としてログイン失敗した場合、メールアドレスで店舗管理者としてログインを試みる
    const adminResult = await authenticateAdminByEmail(emailOrUsername, password);

    if (!adminResult.success) {
      console.error('管理者認証失敗:', {
        emailOrUsername,
        error: adminResult.error
      });
      return NextResponse.json(
        { success: false, error: adminResult.error || 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // セッションクッキーを設定
    const response = NextResponse.json({
      success: true,
      isSuperAdmin: false,
      adminName: adminResult.admin?.fullName,
      tenantName: adminResult.tenant?.salonName,
      role: adminResult.admin?.role
    });

    if (adminResult.sessionToken) {
      response.cookies.set('session_token', adminResult.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7日間
        path: '/'
      });
      console.log('セッションクッキー設定:', {
        token: adminResult.sessionToken.substring(0, 10) + '...',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });
    }

    return response;
  } catch (error: any) {
    console.error('ログインエラー:', error);
    const errorMessage = error?.message || String(error);
    return NextResponse.json(
      { success: false, error: `サーバーエラー: ${errorMessage}` },
      { status: 500 }
    );
  }
}

