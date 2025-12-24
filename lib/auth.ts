import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

export interface SessionData {
  adminId?: number;
  customerId?: number;
  tenantId: number;
  username?: string;
  email?: string;
  role?: string;
  createdAt: number;
}

// セッショントークンの生成
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// セッションの保存（データベース）
export async function setSession(token: string, data: SessionData): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7日後
  
  try {
    await query(
      `INSERT INTO sessions (
        session_token, 
        admin_id, 
        customer_id, 
        tenant_id, 
        username, 
        email, 
        role, 
        created_at, 
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)
      ON CONFLICT (session_token) 
      DO UPDATE SET 
        admin_id = EXCLUDED.admin_id,
        customer_id = EXCLUDED.customer_id,
        tenant_id = EXCLUDED.tenant_id,
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        expires_at = EXCLUDED.expires_at`,
      [
        token,
        data.adminId || null,
        data.customerId || null,
        data.tenantId,
        data.username || null,
        data.email || null,
        data.role || null,
        expiresAt
      ]
    );
  } catch (error) {
    console.error('セッション保存エラー:', error);
    throw error;
  }
}

// セッションの取得（データベース）
export async function getSession(token: string): Promise<SessionData | undefined> {
  try {
    const result = await query(
      `SELECT 
        admin_id, 
        customer_id, 
        tenant_id, 
        username, 
        email, 
        role, 
        EXTRACT(EPOCH FROM created_at) * 1000 as created_at
       FROM sessions 
       WHERE session_token = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      adminId: row.admin_id || undefined,
      customerId: row.customer_id || undefined,
      tenantId: row.tenant_id,
      username: row.username || undefined,
      email: row.email || undefined,
      role: row.role || undefined,
      createdAt: parseInt(row.created_at)
    };
  } catch (error) {
    console.error('セッション取得エラー:', error);
    return undefined;
  }
}

// セッションの削除（データベース）
export async function deleteSession(token: string): Promise<void> {
  try {
    await query(
      'DELETE FROM sessions WHERE session_token = $1',
      [token]
    );
  } catch (error) {
    console.error('セッション削除エラー:', error);
  }
}

// 期限切れセッションのクリーンアップ
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await query(
      'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP'
    );
  } catch (error) {
    console.error('セッションクリーンアップエラー:', error);
  }
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
    
    console.log('管理者認証開始:', { username, tenantCode: actualTenantCode });
    
    // テナント情報を取得
    const tenantResult = await query(
      'SELECT tenant_id, salon_name, is_active FROM tenants WHERE tenant_code = $1',
      [actualTenantCode]
    );

    if (tenantResult.rows.length === 0) {
      console.error('テナントが見つかりません:', actualTenantCode);
      return { success: false, error: 'ログイン失敗：テナントが見つかりません' };
    }

    const tenant = tenantResult.rows[0];
    console.log('テナント情報取得:', { tenantId: tenant.tenant_id, salonName: tenant.salon_name });
    
    if (!tenant.is_active) {
      return { success: false, error: 'このテナントは無効です' };
    }

    // パスワードハッシュの生成
    const passwordHash = hashPassword(password);
    console.log('パスワードハッシュ生成:', passwordHash.substring(0, 20) + '...');
    
    // 管理者認証（まずユーザー名とテナントIDで検索）
    const adminCheckResult = await query(
      `SELECT admin_id, full_name, role, password_hash, is_active
       FROM tenant_admins 
       WHERE tenant_id = $1 AND username = $2`,
      [tenant.tenant_id, username]
    );

    if (adminCheckResult.rows.length === 0) {
      console.error('管理者が見つかりません:', { tenantId: tenant.tenant_id, username });
      return { success: false, error: 'ログイン失敗：ユーザー名またはテナントが正しくありません' };
    }

    const admin = adminCheckResult.rows[0];
    console.log('管理者情報取得:', { adminId: admin.admin_id, username, isActive: admin.is_active });

    if (!admin.is_active) {
      return { success: false, error: 'ログイン失敗：このアカウントは無効です' };
    }

    // パスワードの検証
    const storedHash = admin.password_hash || '';
    const passwordMatch = storedHash === passwordHash;
    console.log('パスワード検証:', { 
      storedHash: storedHash.substring(0, 20) + '...', 
      providedHash: passwordHash.substring(0, 20) + '...',
      match: passwordMatch 
    });

    if (!passwordMatch) {
      return { success: false, error: 'ログイン失敗：パスワードが正しくありません' };
    }

    // セッショントークンの生成
    const sessionToken = generateSessionToken();
    
    // セッション情報を保存（データベース）
    await setSession(sessionToken, {
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
  } catch (error: any) {
    console.error('認証エラー:', error);
    const errorMessage = error?.message || String(error);
    return { success: false, error: `サーバーエラー: ${errorMessage}` };
  }
}

// 認証ミドルウェア（管理者用）
export async function getAuthFromRequest(request: NextRequest): Promise<SessionData | null> {
  const sessionToken = request.cookies.get('session_token')?.value || 
                      request.headers.get('x-session-token');
  
  console.log('セッション認証チェック:', {
    hasCookie: !!request.cookies.get('session_token'),
    hasHeader: !!request.headers.get('x-session-token'),
    sessionToken: sessionToken ? sessionToken.substring(0, 10) + '...' : null
  });
  
  if (!sessionToken) {
    console.log('セッショントークンが見つかりません');
    return null;
  }

  const session = await getSession(sessionToken);
  console.log('セッション取得結果:', {
    found: !!session,
    hasAdminId: !!session?.adminId,
    adminId: session?.adminId
  });
  
  // 管理者セッションかどうか確認（adminIdが存在する）
  if (session && session.adminId) {
    return session;
  }
  
  console.log('管理者セッションが見つかりません');
  return null;
}

// 顧客認証
export async function authenticateCustomer(
  email: string,
  password: string,
  tenantCode?: string
): Promise<{ success: boolean; sessionToken?: string; customer?: any; tenant?: any; error?: string }> {
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
    
    // 顧客認証
    const customerResult = await query(
      `SELECT customer_id, real_name, email, phone_number 
       FROM customers 
       WHERE tenant_id = $1 AND email = $2 AND password_hash = $3`,
      [tenant.tenant_id, email, passwordHash]
    );

    if (customerResult.rows.length === 0) {
      return { success: false, error: 'ログイン失敗：メールアドレスまたはパスワードが正しくありません' };
    }

    const customer = customerResult.rows[0];
    
    // セッショントークンの生成
    const sessionToken = generateSessionToken();
    
    // セッション情報を保存（データベース）
    await setSession(sessionToken, {
      customerId: customer.customer_id,
      tenantId: tenant.tenant_id,
      email: email,
      createdAt: Date.now()
    });

    return {
      success: true,
      sessionToken,
      customer: {
        customerId: customer.customer_id,
        realName: customer.real_name,
        email: customer.email,
        phoneNumber: customer.phone_number
      },
      tenant: {
        tenantId: tenant.tenant_id,
        salonName: tenant.salon_name
      }
    };
  } catch (error) {
    console.error('顧客認証エラー:', error);
    return { success: false, error: 'サーバーエラー' };
  }
}

// 顧客認証ミドルウェア
export async function getCustomerAuthFromRequest(request: NextRequest): Promise<SessionData | null> {
  const sessionToken = request.cookies.get('customer_session_token')?.value || 
                      request.headers.get('x-customer-session-token');
  
  if (!sessionToken) {
    return null;
  }

  const session = await getSession(sessionToken);
  // 顧客セッションかどうか確認（customerIdが存在する）
  if (session && session.customerId) {
    return session;
  }
  
  return null;
}


