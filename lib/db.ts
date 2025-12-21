import { Pool } from 'pg';
import { NextRequest } from 'next/server';

// PostgreSQL接続プール（本番環境用）
let pool: Pool | null = null;

// 接続プールの取得
function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
      // 本番環境用の接続プール設定
      max: process.env.NODE_ENV === 'production' ? 20 : 10, // 最大接続数
      idleTimeoutMillis: 30000, // アイドル接続のタイムアウト
      connectionTimeoutMillis: 2000, // 接続タイムアウト
    });

    // エラーハンドリング
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

// データベース接続の初期化
export async function connectDatabase(): Promise<void> {
  try {
    const dbPool = getPool();
    // 接続テスト
    const client = await dbPool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('PostgreSQL pool connected');
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    throw error;
  }
}

// データベース接続の終了
export async function disconnectDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// クエリ実行ヘルパー（接続プール使用）
export async function query(text: string, params?: any[]) {
  const dbPool = getPool();
  const start = Date.now();
  
  try {
    const result = await dbPool.query(text, params);
    const duration = Date.now() - start;
    
    // 本番環境ではログを出力（開発環境では詳細ログ）
    if (process.env.NODE_ENV === 'production' && duration > 1000) {
      console.warn(`Slow query detected: ${text.substring(0, 100)}... (${duration}ms)`);
    } else if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { text: text.substring(0, 100), duration });
    }
    
    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    console.error('Query error', { text: text.substring(0, 100), duration, error: error.message });
    throw error;
  }
}

// テナントID取得ヘルパー
export async function getTenantIdFromRequest(request: NextRequest): Promise<number | null> {
  // ヘッダー、クエリパラメータ、ボディからテナントコードを取得
  const tenantCode = request.headers.get('x-tenant-code') || 
                    request.nextUrl.searchParams.get('tenant') || 
                    'beauty-salon-001';
  
  try {
    const result = await query(
      'SELECT tenant_id, is_active FROM tenants WHERE tenant_code = $1',
      [tenantCode]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return null;
    }
    
    return result.rows[0].tenant_id;
  } catch (error) {
    console.error('テナントID取得エラー:', error);
    return null;
  }
}

