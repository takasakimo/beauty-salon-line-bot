import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// セキュリティのため、本番環境では無効化するか、認証を追加してください
export async function POST(request: NextRequest) {
  try {
    // 簡単な認証チェック（本番環境では削除または強化してください）
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.MIGRATION_SECRET || 'temporary-secret'}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // sessionsテーブルが存在するか確認
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'sessions'
    `);

    if (tableCheck.rows.length > 0) {
      return NextResponse.json({ 
        message: 'sessionsテーブルは既に存在します',
        exists: true 
      });
    }

    // sessionsテーブルを作成
    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_token VARCHAR(255) PRIMARY KEY,
        admin_id INTEGER,
        customer_id INTEGER,
        tenant_id INTEGER NOT NULL,
        username VARCHAR(100),
        email VARCHAR(255),
        role VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )
    `);

    // インデックスを作成
    await query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_admin_id ON sessions(admin_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_customer_id ON sessions(customer_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions(tenant_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)
    `);

    return NextResponse.json({ 
      message: 'sessionsテーブルを作成しました',
      success: true 
    });
  } catch (error: any) {
    console.error('マイグレーションエラー:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}



