import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// スタッフテーブルにimage_urlカラムを追加するマイグレーション
export async function POST(request: NextRequest) {
  try {
    // セキュリティ: 本番環境では認証を追加することを推奨
    // ここでは簡単な認証チェック（環境変数で制御可能）
    // 認証キーが設定されている場合のみ認証をチェック
    const migrationKey = request.headers.get('x-migration-key');
    const expectedKey = process.env.MIGRATION_KEY;
    
    // MIGRATION_KEYが設定されている場合のみ認証をチェック
    // 設定されていない場合は認証をスキップ（開発環境や一時的なマイグレーション用）
    if (expectedKey) {
      if (!migrationKey || migrationKey !== expectedKey) {
        return NextResponse.json(
          { error: '認証が必要です。x-migration-keyヘッダーを設定してください。' },
          { status: 401 }
        );
      }
    }

    // staffテーブルにimage_urlカラムを追加（Base64データURIを保存するためTEXT型）
    await query(`
      ALTER TABLE staff 
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);
    
    // 既存のVARCHAR(500)カラムをTEXT型に変更（存在する場合）
    try {
      await query(`
        ALTER TABLE staff 
        ALTER COLUMN image_url TYPE TEXT;
      `);
    } catch (error: any) {
      // カラムが存在しない、または既にTEXT型の場合は無視
      if (!error.message.includes('does not exist') && !error.message.includes('already')) {
        console.warn('image_urlカラムの型変更エラー（無視）:', error.message);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'staffテーブルにimage_urlカラムを追加しました'
    });
  } catch (error: any) {
    console.error('マイグレーションエラー:', error);
    
    // カラムが既に存在する場合は成功として扱う
    if (error.message && error.message.includes('already exists')) {
      return NextResponse.json({ 
        success: true,
        message: 'image_urlカラムは既に存在します'
      });
    }
    
    return NextResponse.json(
      { error: 'マイグレーションに失敗しました', details: error.message },
      { status: 500 }
    );
  }
}

