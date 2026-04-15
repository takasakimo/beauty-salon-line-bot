import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface SessionData {
  adminId?: number;
  superAdminId?: number;
  customerId?: number;
  tenantId?: number;
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
        data.tenantId || null, // スーパー管理者の場合はnull
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
    
    // スーパー管理者の場合はroleで判定（super_adminというroleを持つセッション）

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      adminId: row.admin_id || undefined,
      superAdminId: row.super_admin_id || undefined,
      customerId: row.customer_id || undefined,
      tenantId: row.tenant_id || undefined,
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

// パスワードハッシュの生成（bcryptjs使用）
const BCRYPT_SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

// レガシーSHA256ハッシュ（既存パスワードの検証用、新規作成には使用しない）
function legacyHashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// bcryptハッシュかどうかを判定
function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
}

// パスワード検証（bcryptとレガシーSHA256の両方に対応）
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (isBcryptHash(storedHash)) {
    return bcrypt.compare(password, storedHash);
  }
  // レガシーSHA256ハッシュとの比較
  return storedHash === legacyHashPassword(password);
}

// ログイン成功時にレガシーハッシュをbcryptに移行
async function migratePasswordIfNeeded(password: string, storedHash: string, tableName: string, idColumn: string, id: number): Promise<void> {
  if (!isBcryptHash(storedHash)) {
    const newHash = await hashPassword(password);
    await query(
      `UPDATE ${tableName} SET password_hash = $1 WHERE ${idColumn} = $2`,
      [newHash, id]
    );
  }
}

// メールアドレスまたはユーザー名で管理者を検索して認証（店舗コード不要）
export async function authenticateAdminByEmail(
  emailOrUsername: string,
  password: string
): Promise<{ success: boolean; sessionToken?: string; admin?: any; tenant?: any; error?: string }> {
  try {
    // パスワードハッシュの生成は不要（verifyPasswordで検証）
    
    // メールアドレスまたはユーザー名で管理者を検索（テナント情報も同時に取得）
    // 大文字小文字を区別せず、トリム処理も行う
    const trimmedEmailOrUsername = emailOrUsername.trim().toLowerCase();
    const adminResult = await query(
      `SELECT 
        ta.admin_id, 
        ta.username, 
        ta.email, 
        ta.full_name, 
        ta.role, 
        ta.password_hash, 
        ta.is_active,
        ta.tenant_id,
        t.tenant_id as tenant_tenant_id,
        t.salon_name,
        t.is_active as tenant_is_active,
        t.tenant_code
       FROM tenant_admins ta
       INNER JOIN tenants t ON ta.tenant_id = t.tenant_id
       WHERE (LOWER(TRIM(ta.username)) = $1 OR LOWER(TRIM(ta.email)) = $1)
       AND ta.is_active = true
       AND t.is_active = true
       ORDER BY ta.admin_id ASC
       LIMIT 1`,
      [trimmedEmailOrUsername]
    );

    if (adminResult.rows.length === 0) {
      // 管理者が見つからない
      return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
    }

    const row = adminResult.rows[0];
    const admin = {
      admin_id: row.admin_id,
      username: row.username,
      email: row.email,
      full_name: row.full_name,
      role: row.role,
      password_hash: row.password_hash,
      is_active: row.is_active,
      tenant_id: row.tenant_id
    };
    
    const tenant = {
      tenant_id: row.tenant_tenant_id,
      salon_name: row.salon_name,
      is_active: row.tenant_is_active,
      tenant_code: row.tenant_code
    };

    if (!admin.is_active) {
      return { success: false, error: 'ログイン失敗：このアカウントは無効です' };
    }

    if (!tenant.is_active) {
      return { success: false, error: 'ログイン失敗：この店舗は無効です' };
    }

    // パスワードの検証（bcryptとレガシーSHA256の両方に対応）
    const storedHash = admin.password_hash || '';
    const passwordMatch = await verifyPassword(password, storedHash);

    if (!passwordMatch) {
      return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
    }

    // レガシーハッシュの場合はbcryptに移行
    await migratePasswordIfNeeded(password, storedHash, 'tenant_admins', 'admin_id', admin.admin_id);

    // セッショントークンの生成
    const sessionToken = generateSessionToken();
    
    // セッション情報を保存（データベース）
    await setSession(sessionToken, {
      adminId: admin.admin_id,
      tenantId: tenant.tenant_id,
      username: admin.username,
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
    return { success: false, error: 'サーバーエラー' };
  }
}

// 管理者認証（店舗コード指定版 - 後方互換性のため残す）
export async function authenticateAdmin(
  username: string,
  password: string,
  tenantCode?: string
): Promise<{ success: boolean; sessionToken?: string; admin?: any; tenant?: any; error?: string }> {
  try {
    const actualTenantCode = tenantCode || 'beauty-salon-001';
    
    // 管理者認証（店舗コード指定版）
    
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

    // 管理者認証（まずユーザー名とテナントIDで検索）
    const adminCheckResult = await query(
      `SELECT admin_id, full_name, role, password_hash, is_active
       FROM tenant_admins
       WHERE tenant_id = $1 AND username = $2`,
      [tenant.tenant_id, username]
    );

    if (adminCheckResult.rows.length === 0) {
      return { success: false, error: 'ログイン失敗：ユーザー名またはテナントが正しくありません' };
    }

    const admin = adminCheckResult.rows[0];

    if (!admin.is_active) {
      return { success: false, error: 'ログイン失敗：このアカウントは無効です' };
    }

    // パスワードの検証（bcryptとレガシーSHA256の両方に対応）
    const storedHash = admin.password_hash || '';
    const passwordMatch = await verifyPassword(password, storedHash);

    if (!passwordMatch) {
      return { success: false, error: 'ログイン失敗：パスワードが正しくありません' };
    }

    // レガシーハッシュの場合はbcryptに移行
    await migratePasswordIfNeeded(password, storedHash, 'tenant_admins', 'admin_id', admin.admin_id);

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
    return { success: false, error: 'サーバーエラー' };
  }
}

// スーパー管理者認証
export async function authenticateSuperAdmin(
  username: string,
  password: string
): Promise<{ success: boolean; sessionToken?: string; superAdmin?: any; error?: string }> {
  try {
    // スーパー管理者認証
    const adminResult = await query(
      `SELECT super_admin_id, full_name, email, password_hash, is_active
       FROM super_admins
       WHERE username = $1`,
      [username]
    );

    if (adminResult.rows.length === 0) {
      return { success: false, error: 'ログイン失敗：ユーザー名またはパスワードが正しくありません' };
    }

    const admin = adminResult.rows[0];

    if (!admin.is_active) {
      return { success: false, error: 'ログイン失敗：このアカウントは無効です' };
    }

    // パスワードの検証（bcryptとレガシーSHA256の両方に対応）
    const storedHash = admin.password_hash || '';
    const passwordMatch = await verifyPassword(password, storedHash);

    if (!passwordMatch) {
      return { success: false, error: 'ログイン失敗：パスワードが正しくありません' };
    }

    // レガシーハッシュの場合はbcryptに移行
    await migratePasswordIfNeeded(password, storedHash, 'super_admins', 'super_admin_id', admin.super_admin_id);

    // セッショントークンの生成
    const sessionToken = generateSessionToken();
    
    // セッション情報を保存（データベース）
    // スーパー管理者の場合はtenantIdをnullにし、roleを'super_admin'に設定
    await setSession(sessionToken, {
      superAdminId: admin.super_admin_id,
      username: username,
      role: 'super_admin',
      createdAt: Date.now()
    } as SessionData);

    // 最終ログイン時刻を更新
    await query(
      'UPDATE super_admins SET last_login = CURRENT_TIMESTAMP WHERE super_admin_id = $1',
      [admin.super_admin_id]
    );

    return {
      success: true,
      sessionToken,
      superAdmin: {
        superAdminId: admin.super_admin_id,
        fullName: admin.full_name,
        email: admin.email
      }
    };
  } catch (error: any) {
    console.error('スーパー管理者認証エラー');
    return { success: false, error: 'サーバーエラー' };
  }
}

// 認証ミドルウェア（管理者用）
export async function getAuthFromRequest(request: NextRequest): Promise<SessionData | null> {
  const sessionToken = request.cookies.get('session_token')?.value ||
                      request.headers.get('x-session-token');

  if (!sessionToken) {
    return null;
  }

  const session = await getSession(sessionToken);

  // 管理者セッションかどうか確認（adminIdが存在する、またはroleが'super_admin'）
  if (session && (session.adminId || session.role === 'super_admin')) {
    return session;
  }

  return null;
}

// 認証ミドルウェア（スーパー管理者用）
export async function getSuperAdminAuthFromRequest(request: NextRequest): Promise<SessionData | null> {
  const sessionToken = request.cookies.get('session_token')?.value || 
                      request.headers.get('x-session-token');
  
  if (!sessionToken) {
    return null;
  }

  const session = await getSession(sessionToken);
  
  // スーパー管理者セッションかどうか確認（roleが'super_admin'）
  if (session && session.role === 'super_admin') {
    return session;
  }
  
  return null;
}

// スーパー管理者が店舗管理画面にアクセスする際のtenantIdを取得（同期版）
export function getTenantIdFromRequest(request: NextRequest, session: SessionData | null): number | null {
  // クエリパラメータからtenantIdを取得（セッションがない場合やデモ画面でも使用可能）
  const tenantIdParam = request.nextUrl.searchParams.get('tenantId');
  if (tenantIdParam) {
    const tenantId = parseInt(tenantIdParam);
    if (!isNaN(tenantId)) {
      return tenantId;
    }
  }

  // スーパー管理者の場合、クエリパラメータのtenantIdを優先（既にチェック済み）
  if (session && session.role === 'super_admin') {
    return null;
  }

  // 通常の管理者の場合はセッションのtenantIdを使用
  return session?.tenantId || null;
}

// テナントIDを取得（非同期版、デフォルトテナントコードからも取得可能）
export async function getTenantIdFromRequestAsync(request: NextRequest, session: SessionData | null): Promise<number | null> {
  // まず同期版を試す
  const tenantId = getTenantIdFromRequest(request, session);
  if (tenantId) {
    return tenantId;
  }
  
  // セッションがない場合、デフォルトのテナントコード（beauty-salon-001）から取得を試みる
  const tenantCode = request.nextUrl.searchParams.get('tenant') || 'beauty-salon-001';
  try {
    const { query } = await import('@/lib/db');
    const tenantResult = await query(
      'SELECT tenant_id FROM tenants WHERE tenant_code = $1 AND is_active = true',
      [tenantCode]
    );
    if (tenantResult.rows.length > 0) {
      return tenantResult.rows[0].tenant_id;
    }
  } catch (error) {
    console.error('テナントID取得エラー:', error);
  }
  
  return null;
}

// 顧客認証
export async function authenticateCustomer(
  email: string,
  password: string,
  tenantCode?: string
): Promise<{ success: boolean; sessionToken?: string; customer?: any; tenant?: any; error?: string; needsPassword?: boolean }> {
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

    // まず顧客テーブルで認証を試みる（メールアドレスで検索）
    const customerResult = await query(
      `SELECT customer_id, real_name, email, phone_number, password_hash
       FROM customers
       WHERE tenant_id = $1 AND email = $2`,
      [tenant.tenant_id, email]
    );

    let customer: any = null;
    let isAdmin = false;

    if (customerResult.rows.length > 0) {
      const row = customerResult.rows[0];
      // パスワードが設定されていない場合は、入力されたパスワードを設定してログインを許可
      if (!row.password_hash) {
        const newPasswordHash = await hashPassword(password);
        await query(
          'UPDATE customers SET password_hash = $1 WHERE customer_id = $2',
          [newPasswordHash, row.customer_id]
        );
        customer = {
          customer_id: row.customer_id,
          real_name: row.real_name,
          email: row.email,
          phone_number: row.phone_number
        };
      } else {
        // パスワードが一致する場合のみ顧客として認証
        const passwordMatch = await verifyPassword(password, row.password_hash);
        if (passwordMatch) {
          customer = {
            customer_id: row.customer_id,
            real_name: row.real_name,
            email: row.email,
            phone_number: row.phone_number
          };
          // レガシーハッシュの場合はbcryptに移行
          await migratePasswordIfNeeded(password, row.password_hash, 'customers', 'customer_id', row.customer_id);
        }
      }
    }

    if (!customer) {
      // 顧客として見つからない場合、管理者テーブルをチェック
      const adminResult = await query(
        `SELECT admin_id, full_name, username, email, password_hash, is_active
         FROM tenant_admins
         WHERE tenant_id = $1
         AND (email = $2 OR username = $2)`,
        [tenant.tenant_id, email]
      );

      if (adminResult.rows.length > 0) {
        const admin = adminResult.rows[0];

        if (!admin.is_active) {
          return { success: false, error: 'ログイン失敗：このアカウントは無効です' };
        }

        // パスワードが設定されていない場合は、入力されたパスワードを設定してログインを許可
        if (!admin.password_hash) {
          const newPasswordHash = await hashPassword(password);
          await query(
            'UPDATE tenant_admins SET password_hash = $1 WHERE admin_id = $2',
            [newPasswordHash, admin.admin_id]
          );
          isAdmin = true;
          customer = {
            customer_id: null,
            real_name: admin.full_name || admin.username,
            email: admin.email || admin.username,
            phone_number: null,
            admin_id: admin.admin_id
          };
        } else {
          // パスワードが一致する場合のみ管理者として認証
          const passwordMatch = await verifyPassword(password, admin.password_hash);
          if (passwordMatch) {
            isAdmin = true;
            customer = {
              customer_id: null,
              real_name: admin.full_name || admin.username,
              email: admin.email || admin.username,
              phone_number: null,
              admin_id: admin.admin_id
            };
            // レガシーハッシュの場合はbcryptに移行
            await migratePasswordIfNeeded(password, admin.password_hash, 'tenant_admins', 'admin_id', admin.admin_id);
          }
        }
      }
    }

    if (!customer) {
      return { success: false, error: 'ログイン失敗：メールアドレスまたはパスワードが正しくありません' };
    }
    
    // セッショントークンの生成
    const sessionToken = generateSessionToken();
    
    // セッション情報を保存（データベース）
    await setSession(sessionToken, {
      customerId: customer.customer_id,
      adminId: customer.admin_id, // 管理者の場合はadminIdも保存
      tenantId: tenant.tenant_id,
      email: customer.email,
      username: isAdmin ? customer.email : undefined,
      createdAt: Date.now()
    });

    return {
      success: true,
      sessionToken,
      customer: {
        customerId: customer.customer_id,
        adminId: customer.admin_id, // 管理者の場合はadminIdも返す
        realName: customer.real_name,
        email: customer.email,
        phoneNumber: customer.phone_number,
        isAdmin: isAdmin
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


