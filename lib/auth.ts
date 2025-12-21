import { NextRequest, NextResponse } from 'next/server';
import { query } from './db';
import crypto from 'crypto';

// セッション管理用の簡易ストア（本番環境ではRedisなどを推奨）
const sessions = new Map<string, SessionData>();

export interface SessionData {
  adminId: number;
  tenantId: number;
  username: string;
  role: string;
  createdAt: number;
}

// セッショントークンの生成
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// セッションの保存
export function setSession(token: string, data: SessionData): void {
  sessions.set(token, data);
}

// セッションの取得
export function getSession(token: string): SessionData | undefined {
  return sessions.get(token);
}

// セッションの削除
export function deleteSession(token: string): void {
  sessions.delete(token);
}

// パスワードハッシュの生成
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 管理者認証
export async function authenticateAdmin(
  username: string,
  password: string,
  tenantCode?: string
): Promise<{ success: boolean; sessionToken?: string; admin?: any; tenant?: any; error?: string }> {
  try {
    const actualTenantCode = tenantCode || 'beauty-salon-001';
    
    // テナント情報を取得
    const tenantResult = await query(
      'SELECT tenant_id, salon_name, is_active FROM tenants WHERE tenant_code = $1',
      [actualTenantCode]
    );

    if (tenantResult.rows.length === 0) {
      return { success: false, error: 'ログイン失敗：テナントが見つかりません' };
    }

    const tenant = tenantResult.rows[0];
    
    if (!tenant.is_active) {
      return { success: false, error: 'このテナントは無効です' };
    }

    // パスワードハッシュの生成
    const passwordHash = hashPassword(password);
    
    // 管理者認証
    const adminResult = await query(
      `SELECT admin_id, full_name, role 
       FROM tenant_admins 
       WHERE tenant_id = $1 AND username = $2 AND password_hash = $3 AND is_active = true`,
      [tenant.tenant_id, username, passwordHash]
    );

    if (adminResult.rows.length === 0) {
      return { success: false, error: 'ログイン失敗：認証情報が正しくありません' };
    }

    const admin = adminResult.rows[0];
    
    // セッショントークンの生成
    const sessionToken = generateSessionToken();
    
    // セッション情報を保存
    setSession(sessionToken, {
      adminId: admin.admin_id,
      tenantId: tenant.tenant_id,
      username: username,
      role: admin.role,
      createdAt: Date.now()
    });

    // 最終ログイン時刻を更新
    await query(
      'UPDATE tenant_admins SET last_login = CURRENT_TIMESTAMP WHERE admin_id = $1',
      [admin.admin_id]
    );

    return {
      success: true,
      sessionToken,
      admin: {
        adminId: admin.admin_id,
        fullName: admin.full_name,
        role: admin.role
      },
      tenant: {
        tenantId: tenant.tenant_id,
        salonName: tenant.salon_name
      }
    };
  } catch (error) {
    console.error('認証エラー:', error);
    return { success: false, error: 'サーバーエラー' };
  }
}

// 認証ミドルウェア
export function getAuthFromRequest(request: NextRequest): SessionData | null {
  const sessionToken = request.cookies.get('session_token')?.value || 
                      request.headers.get('x-session-token');
  
  if (!sessionToken) {
    return null;
  }

  const session = getSession(sessionToken);
  return session || null;
}


