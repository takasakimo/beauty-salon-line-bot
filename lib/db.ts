import { Pool } from 'pg';
import { NextRequest } from 'next/server';

// PostgreSQL接続プール（本番環境用）
let pool: Pool | null = null;

// 接続プールの取得
function getPool(): Pool {
  if (!pool) {
    // すべての環境変数を確認
    const allEnvVars = {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'NOT SET',
      POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET'
    };
    console.log('環境変数確認:', allEnvVars);

    // 接続URLを取得（優先順位: POSTGRES_URL > POSTGRES_URL_NON_POOLING > DATABASE_URL）
    // POSTGRES_URLを優先する理由: Supabaseの新しい形式（pooler）を使用するため
    let databaseUrl = process.env.POSTGRES_URL || 
                      process.env.POSTGRES_URL_NON_POOLING ||
                      process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('データベース接続URLが見つかりません。環境変数を確認してください。');
      throw new Error('POSTGRES_URL, POSTGRES_URL_NON_POOLING, or DATABASE_URL environment variable is not set');
    }

    // 古い形式のホスト名（db.xxx.supabase.co）を検出した場合はエラー
    if (databaseUrl.includes('db.') && databaseUrl.includes('.supabase.co') && !databaseUrl.includes('pooler')) {
      console.error('エラー: 古い形式のデータベースURLが検出されました。Vercelの環境変数DATABASE_URLを削除するか、POSTGRES_URLと同じ値に更新してください。');
      throw new Error('Invalid database URL format. Please use POSTGRES_URL instead of old DATABASE_URL format.');
    }

    // postgres://をpostgresql://に変換（pgライブラリは両方対応）
    if (databaseUrl.startsWith('postgres://')) {
      databaseUrl = databaseUrl.replace('postgres://', 'postgresql://');
    }

    // 接続URLのSSL設定を確認・修正
    // 接続文字列からsslmodeパラメータを削除し、pgライブラリのSSL設定を使用
    const urlObj = new URL(databaseUrl);
    const sslMode = urlObj.searchParams.get('sslmode');
    
    // sslmodeパラメータを削除（pgライブラリのsslオプションで制御するため）
    urlObj.searchParams.delete('sslmode');
    urlObj.searchParams.delete('supa'); // Supabase固有のパラメータも削除
    const cleanDatabaseUrl = urlObj.toString();
    
    // 接続URLのホスト名を確認
    const urlMatch = cleanDatabaseUrl.match(/@([^:/]+)/);
    const hostname = urlMatch ? urlMatch[1] : 'unknown';
    console.log('データベース接続URL使用:', {
      hostname,
      urlPreview: cleanDatabaseUrl.replace(/:[^:@]+@/, ':****@').substring(0, 150),
      originalSslMode: sslMode,
      protocol: cleanDatabaseUrl.substring(0, 12)
    });

    // SSL設定（常にSSLを有効化し、自己署名証明書を許可）
    const sslConfig = {
      rejectUnauthorized: false
    };

    pool = new Pool({
      connectionString: cleanDatabaseUrl,
      // Supabaseは常にSSLが必要（自己署名証明書を許可）
      ssl: sslConfig,
      // 本番環境用の接続プール設定
      max: process.env.NODE_ENV === 'production' ? 20 : 10, // 最大接続数
      idleTimeoutMillis: 30000, // アイドル接続のタイムアウト
      connectionTimeoutMillis: 10000, // 接続タイムアウト（10秒に延長）
      query_timeout: 30000, // クエリタイムアウト（30秒）
      statement_timeout: 30000, // ステートメントタイムアウト（30秒）
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
export async function getTenantIdFromRequest(request: NextRequest, tenantCodeFromBody?: string): Promise<number | null> {
  // ボディ、ヘッダー、クエリパラメータ、デフォルト値の順でテナントコードを取得
  const tenantCode = tenantCodeFromBody ||
                    request.headers.get('x-tenant-code') || 
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

